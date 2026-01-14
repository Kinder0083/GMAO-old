"""
Routes API pour les Demandes d'Arrêt pour Maintenance
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import logging
import uuid
import mimetypes
import aiofiles
from pathlib import Path
from bson import ObjectId

from dependencies import get_current_user
from models import (
    DemandeArretMaintenance, DemandeArretMaintenanceCreate, DemandeArretMaintenanceUpdate,
    DemandeArretStatus, PlanningEquipementEntry, EquipmentStatus, UserRole,
    ActionType, EntityType
)
import email_service
import audit_service as audit_module
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration upload pièces jointes
UPLOAD_DIR = Path("/app/backend/uploads/demandes-arret")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max

# MongoDB connection - utilise les mêmes variables d'environnement que server.py
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'gmao_iris')]

logger = logging.getLogger(__name__)

# Service d'audit pour journalisation
audit_service = audit_module.AuditService(db)

router = APIRouter(prefix="/demandes-arret", tags=["demandes-arret"])

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    
    # Convertir le _id principal seulement si pas d'id existant
    if "_id" in doc:
        if "id" not in doc:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    
    # Convertir récursivement tous les ObjectId
    for key, value in list(doc.items()):
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, list):
            doc[key] = [
                str(item) if isinstance(item, ObjectId) 
                else serialize_doc(item) if isinstance(item, dict) 
                else item 
                for item in value
            ]
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
    
    return doc

# ==================== CRUD DEMANDES ====================

@router.post("/")
async def create_demande_arret(
    demande: DemandeArretMaintenanceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer une nouvelle demande d'arrêt pour maintenance"""
    try:
        # Récupérer le destinataire
        logger.info(f"🔍 Recherche destinataire avec ID: {demande.destinataire_id}")
        destinataire = await db.users.find_one({"_id": ObjectId(demande.destinataire_id)})
        logger.info(f"🔍 Destinataire trouvé: {destinataire is not None}")
        if not destinataire:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        
        # Récupérer les informations des équipements
        equipement_noms = []
        for eq_id in demande.equipement_ids:
            logger.info(f"🔍 Recherche équipement avec ID: {eq_id}")
            equipement = await db.equipments.find_one({"_id": ObjectId(eq_id)})
            logger.info(f"🔍 Équipement trouvé: {equipement is not None}")
            if equipement:
                equipement_noms.append(equipement.get("nom", ""))
                logger.info(f"🔍 Nom équipement: {equipement.get('nom', '')}")
        
        # Calculer la date d'expiration (7 jours)
        date_creation = datetime.now(timezone.utc)
        date_expiration = date_creation + timedelta(days=7)
        
        # Créer la demande
        data = demande.model_dump()
        data["id"] = str(uuid.uuid4())
        data["demandeur_id"] = current_user.get("id")
        data["demandeur_nom"] = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"
        data["destinataire_nom"] = f"{destinataire.get('prenom', '')} {destinataire.get('nom', '')}"
        data["destinataire_email"] = destinataire.get("email")
        data["equipement_noms"] = equipement_noms
        data["statut"] = DemandeArretStatus.EN_ATTENTE
        data["date_creation"] = date_creation.isoformat()
        data["date_expiration"] = date_expiration.isoformat()
        data["validation_token"] = str(uuid.uuid4())
        data["created_at"] = date_creation.isoformat()
        data["updated_at"] = date_creation.isoformat()
        
        # Ajouter _id pour MongoDB
        data["_id"] = ObjectId()
        
        await db.demandes_arret.insert_one(data)
        
        # Envoyer l'email de demande
        await send_demande_email(data)
        
        # Enregistrer dans le journal d'audit
        await audit_service.log_action(
            user_id=current_user.get("id"),
            user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            user_email=current_user.get("email"),
            action=ActionType.CREATE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=data['id'],
            entity_name=f"Demande d'arrêt du {demande.date_debut} au {demande.date_fin}",
            details=f"Demande d'arrêt pour {len(equipement_noms)} équipement(s): {', '.join(equipement_noms)}. Destinataire: {data['destinataire_nom']}"
        )
        
        logger.info(f"Demande d'arrêt créée: {data['id']}")
        return serialize_doc(data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_demandes_arret(
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer toutes les demandes d'arrêt (avec filtre optionnel)"""
    try:
        filter_query = {}
        if statut:
            filter_query["statut"] = statut
        
        demandes = await db.demandes_arret.find(filter_query).sort("date_creation", -1).to_list(length=None)
        
        # Sérialiser les documents
        serialized_demandes = [serialize_doc(demande) for demande in demandes]
        
        return serialized_demandes
    except Exception as e:
        logger.error(f"Erreur récupération demandes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ROUTES SANS PARAMÈTRE ID (à placer AVANT /{demande_id}) ====================

@router.get("/trigger-reminders")
async def trigger_reminders(current_user: dict = Depends(get_current_user)):
    """
    Point d'entrée pour déclencher les vérifications de rappels.
    Appelé automatiquement lors de la visite du dashboard.
    Retourne silencieusement pour ne pas bloquer l'utilisateur.
    """
    try:
        result = await check_pending_reminders_internal()
        return {"status": "ok", "reminders_triggered": result.get("reminders_sent", 0)}
    except Exception as e:
        logger.error(f"Erreur trigger rappels: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.post("/check-pending-reminders")
async def check_pending_reminders_endpoint():
    """
    Vérifier et envoyer des rappels pour les demandes en attente depuis longtemps.
    Cette fonction peut être appelée à chaque visite du dashboard ou via l'endpoint.
    Envoie un rappel si la demande est en attente depuis plus de 3 jours.
    """
    return await check_pending_reminders_internal()


async def check_pending_reminders_internal():
    """Logique interne pour vérifier les rappels"""
    try:
        now = datetime.now(timezone.utc)
        three_days_ago = now - timedelta(days=3)
        
        # Trouver les demandes en attente créées il y a plus de 3 jours
        demandes_pending = await db.demandes_arret.find({
            "statut": DemandeArretStatus.EN_ATTENTE,
            "date_creation": {"$lt": three_days_ago.isoformat()},
            "reminder_sent": {"$ne": True}
        }).to_list(length=None)
        
        count = 0
        for demande in demandes_pending:
            date_expiration = datetime.fromisoformat(demande["date_expiration"].replace("Z", "+00:00"))
            days_remaining = (date_expiration - now).days
            
            if days_remaining <= 4 and days_remaining > 0:
                await send_reminder_email(demande, days_remaining)
                
                await db.demandes_arret.update_one(
                    {"id": demande["id"]},
                    {"$set": {
                        "reminder_sent": True,
                        "reminder_sent_at": now.isoformat()
                    }}
                )
                
                logger.info(f"Rappel envoyé pour demande {demande['id']} - {days_remaining} jours restants")
                count += 1
        
        return {
            "reminders_sent": count,
            "message": f"{count} rappel(s) envoyé(s)"
        }
    except Exception as e:
        logger.error(f"Erreur vérification rappels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/history")
async def get_reports_history(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer l'historique des reports avec statistiques"""
    try:
        reports = await db.reports_historique.find().sort("created_at", -1).to_list(1000)
        reports = [serialize_doc(r) for r in reports]
        
        total_demandes = await db.demandes_arret.count_documents({})
        
        total_reports = len(reports)
        reports_acceptes = len([r for r in reports if r.get("statut") == "ACCEPTE"])
        reports_en_attente = len([r for r in reports if r.get("statut") == "EN_ATTENTE"])
        reports_refuses = len([r for r in reports if r.get("statut") == "REFUSE"])
        
        durees_reports = []
        for report in reports:
            if report.get("statut") == "ACCEPTE":
                try:
                    date_orig = datetime.fromisoformat(report.get("date_debut_originale", "").replace("Z", "+00:00"))
                    date_new = datetime.fromisoformat(report.get("nouvelle_date_debut", "").replace("Z", "+00:00"))
                    duree = (date_new - date_orig).days
                    if duree > 0:
                        durees_reports.append(duree)
                except:
                    pass
        
        duree_moyenne = round(sum(durees_reports) / len(durees_reports), 1) if durees_reports else 0
        
        equipements_count = {}
        for report in reports:
            for eq_nom in report.get("equipement_noms", []):
                equipements_count[eq_nom] = equipements_count.get(eq_nom, 0) + 1
        
        top_equipements = sorted(equipements_count.items(), key=lambda x: x[1], reverse=True)[:5]
        
        taux_acceptation = round((reports_acceptes / total_reports * 100), 1) if total_reports > 0 else 0
        
        delais_reponse = []
        for report in reports:
            if report.get("statut") == "ACCEPTE" and report.get("date_acceptation"):
                try:
                    date_demande = datetime.fromisoformat(report.get("created_at", "").replace("Z", "+00:00"))
                    date_acceptation = datetime.fromisoformat(report.get("date_acceptation", "").replace("Z", "+00:00"))
                    delai = (date_acceptation - date_demande).total_seconds() / 3600
                    delais_reponse.append(delai)
                except:
                    pass
        
        delai_moyen_heures = round(sum(delais_reponse) / len(delais_reponse), 1) if delais_reponse else 0
        
        return {
            "reports": reports,
            "statistiques": {
                "total_demandes": total_demandes,
                "total_reports": total_reports,
                "reports_vs_total": f"{total_reports}/{total_demandes}",
                "pourcentage_reports": round((total_reports / total_demandes * 100), 1) if total_demandes > 0 else 0,
                "reports_acceptes": reports_acceptes,
                "reports_en_attente": reports_en_attente,
                "reports_refuses": reports_refuses,
                "taux_acceptation": taux_acceptation,
                "duree_moyenne_report_jours": duree_moyenne,
                "delai_moyen_reponse_heures": delai_moyen_heures,
                "top_equipements_reportes": top_equipements
            }
        }
    except Exception as e:
        logger.error(f"Erreur récupération historique reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VALIDATION REPORT PAR TOKEN (SANS AUTH - ROUTE PUBLIQUE) ====================
# Ces routes doivent être AVANT /{demande_id} pour ne pas être capturées

@router.get("/validate-report")
async def validate_report_public(
    token: str,
    action: str
):
    """Valider ou refuser un report via token email (sans authentification requise)"""
    try:
        report = await db.reports_historique.find_one({"validation_token": token})
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide ou report non trouvé")
        
        if report.get("statut") != "EN_ATTENTE":
            return {
                "status": "already_processed",
                "message": f"Ce report a déjà été traité (statut: {report.get('statut')})",
                "report_id": report.get("id")
            }
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande associée non trouvée")
        
        if action == "approve":
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {"statut": "ACCEPTE", "date_acceptation": now.isoformat()}}
            )
            
            dates_originales = demande.get("dates_originales") or {
                "date_debut": demande.get("date_debut"),
                "date_fin": demande.get("date_fin")
            }
            nb_reports = (demande.get("nb_reports") or 0) + 1
            
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "date_debut": report["nouvelle_date_debut"],
                    "date_fin": report["nouvelle_date_fin"],
                    "dates_originales": dates_originales,
                    "dernier_report_accepte_le": now.isoformat(),
                    "nb_reports": nb_reports,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            await send_report_decision_email(demande, report, "ACCEPTE")
            
            return {
                "status": "approved",
                "message": "Report accepté avec succès",
                "demande_id": demande_id,
                "nouvelles_dates": {"debut": report["nouvelle_date_debut"], "fin": report["nouvelle_date_fin"]}
            }
        
        elif action == "refuse":
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {"statut": "REFUSE", "date_refus": now.isoformat()}}
            )
            
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            await send_report_decision_email(demande, report, "REFUSE")
            
            return {"status": "refused", "message": "Report refusé", "demande_id": demande_id}
        
        elif action == "counter_propose":
            return {
                "status": "need_counter_proposal",
                "message": "Veuillez proposer de nouvelles dates",
                "report_id": report["id"],
                "demande_id": demande_id,
                "current_proposal": {
                    "date_debut": report["nouvelle_date_debut"],
                    "date_fin": report["nouvelle_date_fin"]
                },
                "original_dates": {
                    "date_debut": report["date_debut_originale"],
                    "date_fin": report["date_fin_originale"]
                },
                "demandeur_report": report.get("demandeur_report_nom")
            }
        
        else:
            raise HTTPException(status_code=400, detail="Action invalide")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-counter-proposal")
async def submit_counter_proposal_public(
    token: str,
    nouvelle_date_debut: str,
    nouvelle_date_fin: str,
    commentaire: str = ""
):
    """Soumettre une contre-proposition de dates pour un report"""
    try:
        report = await db.reports_historique.find_one({"validation_token": token})
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide")
        
        if report.get("statut") != "EN_ATTENTE":
            raise HTTPException(status_code=400, detail="Ce report a déjà été traité")
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        counter_token = str(uuid.uuid4())
        
        await db.reports_historique.update_one(
            {"id": report["id"]},
            {"$set": {
                "statut": "CONTRE_PROPOSITION",
                "contre_proposition": {
                    "date_debut": nouvelle_date_debut,
                    "date_fin": nouvelle_date_fin,
                    "commentaire": commentaire,
                    "proposee_le": now.isoformat(),
                    "validation_token": counter_token
                }
            }}
        )
        
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {
                "report_en_cours.contre_proposition": {
                    "date_debut": nouvelle_date_debut,
                    "date_fin": nouvelle_date_fin,
                    "commentaire": commentaire,
                    "validation_token": counter_token
                },
                "updated_at": now.isoformat()
            }}
        )
        
        await send_counter_proposal_email(demande, report, {
            "date_debut": nouvelle_date_debut,
            "date_fin": nouvelle_date_fin,
            "commentaire": commentaire,
            "validation_token": counter_token
        })
        
        return {
            "status": "counter_proposal_sent",
            "message": "Contre-proposition envoyée",
            "report_id": report["id"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur contre-proposition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate-counter-proposal")
async def validate_counter_proposal_public(
    token: str,
    action: str
):
    """Valider ou refuser une contre-proposition"""
    try:
        report = await db.reports_historique.find_one({"contre_proposition.validation_token": token})
        
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide")
        
        if report.get("statut") != "CONTRE_PROPOSITION":
            return {
                "status": "already_processed",
                "message": f"Cette contre-proposition a déjà été traitée"
            }
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        counter = report.get("contre_proposition", {})
        
        if action == "accept":
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "ACCEPTE",
                    "nouvelle_date_debut": counter["date_debut"],
                    "nouvelle_date_fin": counter["date_fin"],
                    "date_acceptation": now.isoformat(),
                    "accepte_via_contre_proposition": True
                }}
            )
            
            dates_originales = demande.get("dates_originales") or {
                "date_debut": demande.get("date_debut"),
                "date_fin": demande.get("date_fin")
            }
            nb_reports = (demande.get("nb_reports") or 0) + 1
            
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "date_debut": counter["date_debut"],
                    "date_fin": counter["date_fin"],
                    "dates_originales": dates_originales,
                    "dernier_report_accepte_le": now.isoformat(),
                    "nb_reports": nb_reports,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            await send_counter_proposal_decision_email(demande, report, counter, "ACCEPTE")
            
            return {
                "status": "accepted",
                "message": "Contre-proposition acceptée",
                "demande_id": demande_id,
                "dates_finales": {"debut": counter["date_debut"], "fin": counter["date_fin"]}
            }
        
        elif action == "refuse":
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "REFUSE",
                    "date_refus": now.isoformat(),
                    "refuse_via_contre_proposition": True
                }}
            )
            
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            await send_counter_proposal_decision_email(demande, report, counter, "REFUSE")
            
            return {
                "status": "refused",
                "message": "Contre-proposition refusée",
                "demande_id": demande_id
            }
        
        else:
            raise HTTPException(status_code=400, detail="Action invalide")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation contre-proposition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ROUTES AVEC PARAMÈTRE /{demande_id} ====================

@router.get("/{demande_id}")
async def get_demande_by_id(
    demande_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer une demande par ID"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return serialize_doc(demande)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VALIDATION / REFUS ====================

@router.post("/validate/{token}")
async def validate_demande_by_token(
    token: str,
    commentaire: Optional[str] = None
):
    """Valider une demande via le token d'email (pas besoin d'auth)"""
    try:
        demande = await db.demandes_arret.find_one({"validation_token": token})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée ou token invalide")
        
        # Vérifier que la demande n'est pas déjà traitée
        if demande["statut"] != DemandeArretStatus.EN_ATTENTE:
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        # Vérifier que la demande n'a pas expiré
        date_expiration = datetime.fromisoformat(demande["date_expiration"])
        if datetime.now(timezone.utc) > date_expiration:
            # Auto-refuser
            await db.demandes_arret.update_one(
                {"id": demande["id"]},
                {"$set": {
                    "statut": DemandeArretStatus.EXPIREE,
                    "date_reponse": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            raise HTTPException(status_code=400, detail="Cette demande a expiré (délai de 7 jours dépassé)")
        
        # Approuver la demande
        await db.demandes_arret.update_one(
            {"id": demande["id"]},
            {"$set": {
                "statut": DemandeArretStatus.APPROUVEE,
                "date_reponse": datetime.now(timezone.utc).isoformat(),
                "commentaire_reponse": commentaire or "",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Créer les entrées dans le planning équipement
        for equipement_id in demande["equipement_ids"]:
            entry = {
                "id": str(uuid.uuid4()),
                "equipement_id": equipement_id,
                "date_debut": demande["date_debut"],
                "date_fin": demande["date_fin"],
                "periode_debut": demande["periode_debut"],
                "periode_fin": demande["periode_fin"],
                "statut": EquipmentStatus.EN_MAINTENANCE,
                "demande_arret_id": demande["id"],
                "work_order_id": demande.get("work_order_id"),
                "maintenance_preventive_id": demande.get("maintenance_preventive_id"),
                "commentaire": demande.get("commentaire", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.planning_equipement.insert_one(entry)
        
        logger.info(f"Demande approuvée: {demande['id']}")
        
        # Envoyer email de confirmation au demandeur
        await send_confirmation_email(demande, approved=True, commentaire=commentaire)
        
        # Enregistrer dans le journal d'audit
        await audit_service.log_action(
            user_id=demande["destinataire_id"],
            user_name=demande["destinataire_nom"],
            user_email=demande["destinataire_email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=demande["id"],
            entity_name=f"Demande d'arrêt du {demande['date_debut']} au {demande['date_fin']}",
            details=f"Demande d'arrêt APPROUVÉE pour {len(demande['equipement_ids'])} équipement(s). Commentaire: {commentaire or 'Aucun'}",
            changes={"statut": "EN_ATTENTE → APPROUVEE"}
        )
        
        return {"message": "Demande approuvée avec succès", "demande_id": demande["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refuse/{token}")
async def refuse_demande_by_token(
    token: str,
    commentaire: Optional[str] = None,
    date_proposee: Optional[str] = None
):
    """Refuser une demande via le token d'email"""
    try:
        demande = await db.demandes_arret.find_one({"validation_token": token})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée ou token invalide")
        
        if demande["statut"] != DemandeArretStatus.EN_ATTENTE:
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        # Refuser la demande
        update_data = {
            "statut": DemandeArretStatus.REFUSEE,
            "date_reponse": datetime.now(timezone.utc).isoformat(),
            "commentaire_reponse": commentaire or "",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if date_proposee:
            update_data["date_proposee"] = date_proposee
        
        await db.demandes_arret.update_one(
            {"id": demande["id"]},
            {"$set": update_data}
        )
        
        logger.info(f"Demande refusée: {demande['id']}")
        
        # Envoyer email de refus au demandeur
        await send_confirmation_email(demande, approved=False, commentaire=commentaire, date_proposee=date_proposee)
        
        # Enregistrer dans le journal d'audit
        date_prop_text = f" Date proposée: {date_proposee}." if date_proposee else ""
        await audit_service.log_action(
            user_id=demande["destinataire_id"],
            user_name=demande["destinataire_nom"],
            user_email=demande["destinataire_email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=demande["id"],
            entity_name=f"Demande d'arrêt du {demande['date_debut']} au {demande['date_fin']}",
            details=f"Demande d'arrêt REFUSÉE pour {len(demande['equipement_ids'])} équipement(s). Commentaire: {commentaire or 'Aucun'}.{date_prop_text}",
            changes={"statut": "EN_ATTENTE → REFUSEE"}
        )
        
        return {"message": "Demande refusée", "demande_id": demande["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur refus demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PLANNING EQUIPEMENT ====================

@router.get("/planning/equipements")
async def get_planning_equipements(
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    equipement_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le planning des équipements"""
    try:
        filter_query = {}
        
        if equipement_id:
            filter_query["equipement_id"] = equipement_id
        
        if date_debut and date_fin:
            filter_query["$or"] = [
                {"date_debut": {"$lte": date_fin}, "date_fin": {"$gte": date_debut}},
            ]
        
        entries = await db.planning_equipement.find(filter_query).to_list(length=None)
        
        for entry in entries:
            if "_id" in entry:
                del entry["_id"]
        
        return entries
    except Exception as e:
        logger.error(f"Erreur récupération planning: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VÉRIFICATION EXPIRATION ====================

@router.post("/check-expired")
async def check_expired_demandes():
    """Vérifier et marquer comme expirées les demandes > 7 jours (appelé par cron)"""
    try:
        now = datetime.now(timezone.utc)
        
        # Trouver les demandes expirées
        demandes_expirees = await db.demandes_arret.find({
            "statut": DemandeArretStatus.EN_ATTENTE,
            "date_expiration": {"$lt": now.isoformat()}
        }).to_list(length=None)
        
        count = 0
        for demande in demandes_expirees:
            await db.demandes_arret.update_one(
                {"id": demande["id"]},
                {"$set": {
                    "statut": DemandeArretStatus.EXPIREE,
                    "date_reponse": now.isoformat(),
                    "commentaire_reponse": "Demande expirée automatiquement après 7 jours sans réponse",
                    "updated_at": now.isoformat()
                }}
            )
            
            # Envoyer email d'expiration
            await send_expiration_email(demande)
            
            # Enregistrer dans le journal d'audit
            await audit_service.log_action(
                user_id="SYSTEM",
                user_name="Système Automatique",
                user_email="system@gmao-iris.local",
                action=ActionType.UPDATE,
                entity_type=EntityType.DEMANDE_ARRET,
                entity_id=demande["id"],
                entity_name=f"Demande d'arrêt du {demande['date_debut']} au {demande['date_fin']}",
                details=f"Demande d'arrêt EXPIRÉE automatiquement après 7 jours sans réponse du destinataire {demande['destinataire_nom']}",
                changes={"statut": "EN_ATTENTE → EXPIREE"}
            )
            
            count += 1
        
        logger.info(f"{count} demandes expirées marquées")
        return {"expired_count": count}
    except Exception as e:
        logger.error(f"Erreur vérification expiration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ANNULATION ====================

@router.post("/{demande_id}/cancel")
async def cancel_demande(
    demande_id: str,
    motif: str,
    current_user: dict = Depends(get_current_user)
):
    """Annuler une demande d'arrêt pour maintenance"""
    try:
        # Récupérer la demande
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Vérifier que la demande peut être annulée (pas déjà refusée ou terminée)
        if demande["statut"] in [DemandeArretStatus.REFUSEE, DemandeArretStatus.TERMINEE]:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible d'annuler une demande avec le statut '{demande['statut']}'"
            )
        
        # Mettre à jour le statut de la demande
        now = datetime.now(timezone.utc)
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {
                "statut": DemandeArretStatus.ANNULEE,
                "motif_annulation": motif,
                "annule_par_id": current_user.get("id"),
                "annule_par_nom": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
                "date_annulation": now.isoformat(),
                "updated_at": now.isoformat()
            }}
        )
        
        # Supprimer les entrées du planning liées à cette demande
        delete_result = await db.planning_equipement.delete_many({"demande_arret_id": demande_id})
        logger.info(f"Suppression planning: {delete_result.deleted_count} entrée(s)")
        
        # Envoyer email d'annulation au destinataire
        await send_cancellation_email(demande, motif, current_user)
        
        # Enregistrer dans le journal d'audit
        await audit_service.log_action(
            user_id=current_user.get("id"),
            user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            user_email=current_user.get("email"),
            action=ActionType.UPDATE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=demande_id,
            entity_name=f"Demande d'arrêt du {demande['date_debut']} au {demande['date_fin']}",
            details=f"Demande d'arrêt ANNULÉE. Motif: {motif}. {delete_result.deleted_count} entrée(s) de planning supprimée(s).",
            changes={"statut": f"{demande['statut']} → ANNULEE"}
        )
        
        logger.info(f"Demande annulée: {demande_id}")
        return {
            "message": "Demande annulée avec succès",
            "demande_id": demande_id,
            "planning_entries_deleted": delete_result.deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur annulation demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== REPORT (DEMANDE DE REPORT) ====================

@router.post("/{demande_id}/request-report")
async def request_report(
    demande_id: str,
    raison: str,
    nouvelle_date_debut: str,
    nouvelle_date_fin: str,
    current_user: dict = Depends(get_current_user)
):
    """Demander un report de la maintenance à de nouvelles dates"""
    try:
        # Récupérer la demande
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Vérifier que la demande peut être reportée (EN_ATTENTE ou APPROUVEE)
        if demande["statut"] not in [DemandeArretStatus.EN_ATTENTE, DemandeArretStatus.APPROUVEE]:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de reporter une demande avec le statut '{demande['statut']}'"
            )
        
        now = datetime.now(timezone.utc)
        ancien_statut = demande["statut"]
        
        # Générer un token unique pour la validation du report
        report_token = str(uuid.uuid4())
        
        # Créer l'entrée dans l'historique des reports
        report_entry = {
            "id": str(uuid.uuid4()),
            "demande_id": demande_id,
            "demandeur_report_id": current_user.get("id"),
            "demandeur_report_nom": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            "demandeur_report_email": current_user.get("email"),
            "raison": raison,
            "date_debut_originale": demande.get("date_debut"),
            "date_fin_originale": demande.get("date_fin"),
            "nouvelle_date_debut": nouvelle_date_debut,
            "nouvelle_date_fin": nouvelle_date_fin,
            "statut": "EN_ATTENTE",  # EN_ATTENTE, ACCEPTE, REFUSE, CONTRE_PROPOSITION
            "validation_token": report_token,
            "created_at": now.isoformat(),
            "equipement_noms": demande.get("equipement_noms", []),
            "destinataire_id": demande.get("destinataire_id"),
            "destinataire_nom": demande.get("destinataire_nom", ""),
            "destinataire_email": demande.get("destinataire_email", ""),
            "contre_proposition": None  # Sera rempli si contre-proposition
        }
        
        await db.reports_historique.insert_one(report_entry)
        
        # Si la demande était approuvée, supprimer du planning
        planning_deleted = 0
        if ancien_statut == DemandeArretStatus.APPROUVEE:
            delete_result = await db.planning_equipement.delete_many({"demande_arret_id": demande_id})
            planning_deleted = delete_result.deleted_count
            logger.info(f"Suppression planning pour report: {planning_deleted} entrée(s)")
        
        # Mettre à jour le statut de la demande
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {
                "statut": DemandeArretStatus.EN_ATTENTE_REPORT,
                "report_en_cours": {
                    "report_id": report_entry["id"],
                    "raison": raison,
                    "nouvelle_date_debut": nouvelle_date_debut,
                    "nouvelle_date_fin": nouvelle_date_fin,
                    "demande_par": report_entry["demandeur_report_nom"],
                    "demande_le": now.isoformat(),
                    "validation_token": report_token
                },
                "updated_at": now.isoformat()
            }}
        )
        
        # Envoyer email de notification au destinataire avec boutons d'action
        await send_report_request_email(demande, report_entry)
        
        # Enregistrer dans le journal d'audit
        await audit_service.log_action(
            user_id=current_user.get("id"),
            user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            user_email=current_user.get("email"),
            action=ActionType.UPDATE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=demande_id,
            entity_name=f"Demande d'arrêt - Report demandé",
            details=f"Demande de report. Raison: {raison}. Nouvelles dates: {nouvelle_date_debut} - {nouvelle_date_fin}",
            changes={"statut": f"{ancien_statut} → EN_ATTENTE_REPORT"}
        )
        
        logger.info(f"Report demandé pour demande: {demande_id}")
        return {
            "message": "Demande de report envoyée avec succès",
            "demande_id": demande_id,
            "report_id": report_entry["id"],
            "planning_entries_deleted": planning_deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur demande de report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{demande_id}/accept-report")
async def accept_report(
    demande_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accepter le report et mettre à jour les dates"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if demande["statut"] != DemandeArretStatus.EN_ATTENTE_REPORT:
            raise HTTPException(status_code=400, detail="Cette demande n'a pas de report en attente")
        
        report_info = demande.get("report_en_cours")
        if not report_info:
            raise HTTPException(status_code=400, detail="Informations de report non trouvées")
        
        now = datetime.now(timezone.utc)
        
        # Sauvegarder les dates originales si pas déjà fait
        dates_originales = demande.get("dates_originales") or {
            "date_debut": demande.get("date_debut"),
            "date_fin": demande.get("date_fin")
        }
        
        # Mettre à jour l'historique du report
        await db.reports_historique.update_one(
            {"id": report_info["report_id"]},
            {"$set": {
                "statut": "ACCEPTE",
                "accepte_par_id": current_user.get("id"),
                "accepte_par_nom": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
                "date_acceptation": now.isoformat()
            }}
        )
        
        # Calculer le nombre de reports
        nb_reports = (demande.get("nb_reports") or 0) + 1
        
        # Mettre à jour la demande avec les nouvelles dates
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {
                "statut": DemandeArretStatus.APPROUVEE,
                "date_debut": report_info["nouvelle_date_debut"],
                "date_fin": report_info["nouvelle_date_fin"],
                "dates_originales": dates_originales,
                "dernier_report_accepte_le": now.isoformat(),
                "nb_reports": nb_reports,
                "report_en_cours": None,
                "updated_at": now.isoformat()
            }}
        )
        
        # Recréer les entrées de planning avec les nouvelles dates
        # (logique similaire à l'approbation initiale)
        
        logger.info(f"Report accepté pour demande: {demande_id}")
        return {
            "message": "Report accepté avec succès",
            "demande_id": demande_id,
            "nouvelles_dates": {
                "debut": report_info["nouvelle_date_debut"],
                "fin": report_info["nouvelle_date_fin"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur acceptation report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VALIDATION REPORT PAR TOKEN (SANS AUTH) ====================

@router.get("/validate-report")
async def validate_report_by_token(
    token: str,
    action: str  # approve, refuse, counter_propose
):
    """Valider ou refuser un report via token email (sans authentification requise)"""
    try:
        # Chercher le report par son token
        report = await db.reports_historique.find_one({"validation_token": token})
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide ou report non trouvé")
        
        if report.get("statut") != "EN_ATTENTE":
            return {
                "status": "already_processed",
                "message": f"Ce report a déjà été traité (statut: {report.get('statut')})",
                "report_id": report.get("id")
            }
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande associée non trouvée")
        
        if action == "approve":
            # Accepter le report
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "ACCEPTE",
                    "date_acceptation": now.isoformat()
                }}
            )
            
            # Sauvegarder les dates originales si pas déjà fait
            dates_originales = demande.get("dates_originales") or {
                "date_debut": demande.get("date_debut"),
                "date_fin": demande.get("date_fin")
            }
            
            nb_reports = (demande.get("nb_reports") or 0) + 1
            
            # Mettre à jour la demande
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "date_debut": report["nouvelle_date_debut"],
                    "date_fin": report["nouvelle_date_fin"],
                    "dates_originales": dates_originales,
                    "dernier_report_accepte_le": now.isoformat(),
                    "nb_reports": nb_reports,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Notifier le demandeur du report que sa demande est acceptée
            await send_report_decision_email(demande, report, "ACCEPTE")
            
            logger.info(f"Report accepté via token pour demande: {demande_id}")
            return {
                "status": "approved",
                "message": "Report accepté avec succès",
                "demande_id": demande_id,
                "nouvelles_dates": {
                    "debut": report["nouvelle_date_debut"],
                    "fin": report["nouvelle_date_fin"]
                }
            }
        
        elif action == "refuse":
            # Refuser le report
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "REFUSE",
                    "date_refus": now.isoformat()
                }}
            )
            
            # Remettre la demande au statut précédent (APPROUVEE ou EN_ATTENTE selon le cas)
            # On remet en APPROUVEE car un report est généralement demandé sur une demande déjà approuvée
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Notifier le demandeur du report
            await send_report_decision_email(demande, report, "REFUSE")
            
            logger.info(f"Report refusé via token pour demande: {demande_id}")
            return {
                "status": "refused",
                "message": "Report refusé",
                "demande_id": demande_id
            }
        
        elif action == "counter_propose":
            # Renvoyer les infos pour afficher le formulaire de contre-proposition
            return {
                "status": "need_counter_proposal",
                "message": "Veuillez proposer de nouvelles dates",
                "report_id": report["id"],
                "demande_id": demande_id,
                "current_proposal": {
                    "date_debut": report["nouvelle_date_debut"],
                    "date_fin": report["nouvelle_date_fin"]
                },
                "original_dates": {
                    "date_debut": report["date_debut_originale"],
                    "date_fin": report["date_fin_originale"]
                },
                "demandeur_report": report.get("demandeur_report_nom")
            }
        
        else:
            raise HTTPException(status_code=400, detail="Action invalide. Utilisez: approve, refuse, counter_propose")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation report par token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-counter-proposal")
async def submit_counter_proposal(
    token: str,
    nouvelle_date_debut: str,
    nouvelle_date_fin: str,
    commentaire: str = ""
):
    """Soumettre une contre-proposition de dates pour un report"""
    try:
        # Chercher le report par son token
        report = await db.reports_historique.find_one({"validation_token": token})
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide ou report non trouvé")
        
        if report.get("statut") != "EN_ATTENTE":
            raise HTTPException(status_code=400, detail="Ce report a déjà été traité")
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande associée non trouvée")
        
        # Générer un nouveau token pour que le demandeur puisse répondre
        counter_token = str(uuid.uuid4())
        
        # Mettre à jour le report avec la contre-proposition
        await db.reports_historique.update_one(
            {"id": report["id"]},
            {"$set": {
                "statut": "CONTRE_PROPOSITION",
                "contre_proposition": {
                    "date_debut": nouvelle_date_debut,
                    "date_fin": nouvelle_date_fin,
                    "commentaire": commentaire,
                    "proposee_le": now.isoformat(),
                    "validation_token": counter_token
                }
            }}
        )
        
        # Mettre à jour la demande
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {
                "report_en_cours.contre_proposition": {
                    "date_debut": nouvelle_date_debut,
                    "date_fin": nouvelle_date_fin,
                    "commentaire": commentaire,
                    "validation_token": counter_token
                },
                "updated_at": now.isoformat()
            }}
        )
        
        # Envoyer email au demandeur initial du report avec la contre-proposition
        await send_counter_proposal_email(demande, report, {
            "date_debut": nouvelle_date_debut,
            "date_fin": nouvelle_date_fin,
            "commentaire": commentaire,
            "validation_token": counter_token
        })
        
        logger.info(f"Contre-proposition soumise pour report: {report['id']}")
        return {
            "status": "counter_proposal_sent",
            "message": "Contre-proposition envoyée au demandeur",
            "report_id": report["id"],
            "nouvelles_dates_proposees": {
                "debut": nouvelle_date_debut,
                "fin": nouvelle_date_fin
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur soumission contre-proposition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate-counter-proposal")
async def validate_counter_proposal(
    token: str,
    action: str  # accept, refuse
):
    """Valider ou refuser une contre-proposition par le demandeur du report"""
    try:
        # Chercher le report par le token de contre-proposition
        report = await db.reports_historique.find_one({
            "contre_proposition.validation_token": token
        })
        
        if not report:
            raise HTTPException(status_code=404, detail="Token invalide ou contre-proposition non trouvée")
        
        if report.get("statut") != "CONTRE_PROPOSITION":
            return {
                "status": "already_processed",
                "message": f"Cette contre-proposition a déjà été traitée (statut: {report.get('statut')})"
            }
        
        now = datetime.now(timezone.utc)
        demande_id = report.get("demande_id")
        demande = await db.demandes_arret.find_one({"id": demande_id})
        
        if not demande:
            raise HTTPException(status_code=404, detail="Demande associée non trouvée")
        
        counter = report.get("contre_proposition", {})
        
        if action == "accept":
            # Accepter la contre-proposition = appliquer les nouvelles dates
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "ACCEPTE",
                    "nouvelle_date_debut": counter["date_debut"],
                    "nouvelle_date_fin": counter["date_fin"],
                    "date_acceptation": now.isoformat(),
                    "accepte_via_contre_proposition": True
                }}
            )
            
            # Sauvegarder les dates originales
            dates_originales = demande.get("dates_originales") or {
                "date_debut": demande.get("date_debut"),
                "date_fin": demande.get("date_fin")
            }
            
            nb_reports = (demande.get("nb_reports") or 0) + 1
            
            # Mettre à jour la demande avec les dates de la contre-proposition
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "date_debut": counter["date_debut"],
                    "date_fin": counter["date_fin"],
                    "dates_originales": dates_originales,
                    "dernier_report_accepte_le": now.isoformat(),
                    "nb_reports": nb_reports,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Notifier le responsable que la contre-proposition est acceptée
            await send_counter_proposal_decision_email(demande, report, counter, "ACCEPTE")
            
            logger.info(f"Contre-proposition acceptée pour demande: {demande_id}")
            return {
                "status": "accepted",
                "message": "Contre-proposition acceptée, les nouvelles dates sont appliquées",
                "demande_id": demande_id,
                "dates_finales": {
                    "debut": counter["date_debut"],
                    "fin": counter["date_fin"]
                }
            }
        
        elif action == "refuse":
            # Refuser la contre-proposition = le report est annulé
            await db.reports_historique.update_one(
                {"id": report["id"]},
                {"$set": {
                    "statut": "REFUSE",
                    "date_refus": now.isoformat(),
                    "refuse_via_contre_proposition": True
                }}
            )
            
            # Remettre la demande au statut précédent
            await db.demandes_arret.update_one(
                {"id": demande_id},
                {"$set": {
                    "statut": DemandeArretStatus.APPROUVEE,
                    "report_en_cours": None,
                    "updated_at": now.isoformat()
                }}
            )
            
            # Notifier le responsable
            await send_counter_proposal_decision_email(demande, report, counter, "REFUSE")
            
            logger.info(f"Contre-proposition refusée pour demande: {demande_id}")
            return {
                "status": "refused",
                "message": "Contre-proposition refusée, la demande garde ses dates actuelles",
                "demande_id": demande_id
            }
        
        else:
            raise HTTPException(status_code=400, detail="Action invalide. Utilisez: accept, refuse")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur validation contre-proposition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FONCTIONS EMAIL ====================

async def send_demande_email(demande: dict):
    """Envoyer l'email de demande d'arrêt au destinataire"""
    try:
        import os
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        approve_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=approve"
        refuse_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=refuse"
        
        equipements_str = ", ".join(demande["equipement_noms"])
        
        subject = f"Demande d'Arrêt pour Maintenance - {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .button {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Demande d'Arrêt pour Maintenance</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande['destinataire_nom']}</strong>,</p>
            <p>Vous avez reçu une nouvelle demande d'arrêt d'équipement pour maintenance.</p>
            
            <div class="info-box">
                <h3>📋 Détails de la demande</h3>
                <p><strong>Demandeur:</strong> {demande['demandeur_nom']}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Période:</strong> Du {demande['date_debut']} ({demande['periode_debut']}) au {demande['date_fin']} ({demande['periode_fin']})</p>
                {f"<p><strong>Commentaire:</strong> {demande['commentaire']}</p>" if demande.get('commentaire') else ""}
                <p><strong>Date limite de réponse:</strong> {demande['date_expiration'][:10]} (7 jours)</p>
            </div>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{approve_link}" class="button btn-approve">✓ Approuver</a>
                <a href="{refuse_link}" class="button btn-refuse">✗ Refuser</a>
            </p>
            
            <p style="color: #dc2626; font-weight: bold;">⚠️ Cette demande sera automatiquement refusée si aucune réponse n'est donnée dans les 7 jours.</p>
        </div>
        <div class="footer">
            <p>GMAO Iris - Système de Gestion de Maintenance</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande d'Arrêt pour Maintenance

Demandeur: {demande['demandeur_nom']}
Équipements: {equipements_str}
Période: Du {demande['date_debut']} au {demande['date_fin']}

Approuver: {approve_link}
Refuser: {refuse_link}

Cette demande expire le {demande['date_expiration'][:10]}
        """
        
        success = email_service.send_email(
            to_email=demande['destinataire_email'],
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email demande: {demande['id']}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email demande: {str(e)}")
        return False

async def send_confirmation_email(demande: dict, approved: bool, commentaire: Optional[str] = None, date_proposee: Optional[str] = None):
    """Envoyer email de confirmation au demandeur"""
    # À implémenter
    pass

async def send_expiration_email(demande: dict):
    """Envoyer email d'expiration"""
    # À implémenter
    pass

async def send_report_request_email(demande: dict, report: dict):
    """Envoyer email de demande de report au destinataire avec boutons d'action"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        token = report.get("validation_token")
        
        # URLs d'action
        approve_url = f"{FRONTEND_URL}/validate-report?token={token}&action=approve"
        refuse_url = f"{FRONTEND_URL}/validate-report?token={token}&action=refuse"
        counter_url = f"{FRONTEND_URL}/validate-report?token={token}&action=counter_propose"
        
        subject = f"📅 Demande de Report - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .dates-box {{ background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }}
        .raison-box {{ background: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6b7280; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        .highlight {{ font-weight: bold; color: #f59e0b; }}
        .button {{ display: inline-block; padding: 12px 25px; margin: 8px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .btn-counter {{ background-color: #3b82f6; color: white; }}
        .actions {{ text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Demande de Report</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>Une demande de <span class="highlight">report de maintenance</span> a été soumise et nécessite votre réponse.</p>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande initiale</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates prévues actuellement:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
            </div>
            
            <div class="dates-box">
                <h3>📆 Nouvelles dates demandées</h3>
                <p><strong>Du:</strong> {report.get('nouvelle_date_debut', '')}</p>
                <p><strong>Au:</strong> {report.get('nouvelle_date_fin', '')}</p>
            </div>
            
            <div class="raison-box">
                <h3>📝 Raison du report</h3>
                <p><strong>Demandé par:</strong> {report.get('demandeur_report_nom', '')}</p>
                <p>{report.get('raison', '')}</p>
            </div>
            
            <div class="actions">
                <p><strong>Quelle est votre décision ?</strong></p>
                <a href="{approve_url}" class="button btn-approve">✓ Approuver le report</a>
                <a href="{refuse_url}" class="button btn-refuse">✗ Refuser</a>
                <br><br>
                <a href="{counter_url}" class="button btn-counter">📅 Proposer d'autres dates</a>
            </div>
        </div>
        <div class="footer">
            <p>GMAO Iris - Système de Gestion de Maintenance</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande de Report de Maintenance

Rappel de la demande initiale:
- Demandeur: {demande.get('demandeur_nom', '')}
- Équipements: {equipements_str}
- Dates prévues: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}

Nouvelles dates demandées:
- Du: {report.get('nouvelle_date_debut', '')}
- Au: {report.get('nouvelle_date_fin', '')}

Raison du report:
- Demandé par: {report.get('demandeur_report_nom', '')}
- {report.get('raison', '')}

Pour répondre à cette demande:
- Approuver: {approve_url}
- Refuser: {refuse_url}
- Proposer d'autres dates: {counter_url}

---
GMAO Iris - Système de Gestion de Maintenance
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email demande report: {report.get('id', '')}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email demande report: {str(e)}")
        return False


async def send_report_decision_email(demande: dict, report: dict, decision: str):
    """Envoyer email au demandeur du report pour l'informer de la décision"""
    try:
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        demandeur_email = report.get("demandeur_report_email", "")
        
        if not demandeur_email:
            logger.warning("Email du demandeur de report non trouvé")
            return False
        
        if decision == "ACCEPTE":
            subject = f"✅ Report ACCEPTÉ - Maintenance {equipements_str}"
            status_color = "#10b981"
            status_text = "ACCEPTÉ"
            message = f"Votre demande de report a été <strong style='color: {status_color};'>acceptée</strong>. Les nouvelles dates sont maintenant effectives."
        else:
            subject = f"❌ Report REFUSÉ - Maintenance {equipements_str}"
            status_color = "#ef4444"
            status_text = "REFUSÉ"
            message = f"Votre demande de report a été <strong style='color: {status_color};'>refusée</strong>. Les dates initiales sont maintenues."
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {status_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid {status_color}; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Report {status_text}</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{report.get('demandeur_report_nom', '')}</strong>,</p>
            <p>{message}</p>
            
            <div class="info-box">
                <h3>📋 Détails</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates demandées:</strong> Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}</p>
                <p><strong>Décision par:</strong> {demande.get('destinataire_nom', '')}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Report {status_text}

{message.replace('<strong>', '').replace('</strong>', '').replace(f"<strong style='color: {status_color};'>", '').replace("</strong>", '')}

Équipements: {equipements_str}
Dates demandées: Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}
        """
        
        success = email_service.send_email(
            to_email=demandeur_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email décision report: {str(e)}")
        return False


async def send_counter_proposal_email(demande: dict, report: dict, counter: dict):
    """Envoyer email au demandeur du report avec la contre-proposition"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        demandeur_email = report.get("demandeur_report_email", "")
        token = counter.get("validation_token")
        
        if not demandeur_email:
            logger.warning("Email du demandeur de report non trouvé pour contre-proposition")
            return False
        
        accept_url = f"{FRONTEND_URL}/validate-counter-proposal?token={token}&action=accept"
        refuse_url = f"{FRONTEND_URL}/validate-counter-proposal?token={token}&action=refuse"
        
        subject = f"📅 Contre-proposition de dates - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6b7280; }}
        .dates-box {{ background: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }}
        .button {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-accept {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .actions {{ text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Contre-proposition de Dates</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{report.get('demandeur_report_nom', '')}</strong>,</p>
            <p>Suite à votre demande de report, <strong>{demande.get('destinataire_nom', '')}</strong> vous propose des dates alternatives.</p>
            
            <div class="info-box">
                <h3>📋 Votre demande initiale</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates demandées:</strong> Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}</p>
            </div>
            
            <div class="dates-box">
                <h3>📆 Dates proposées par {demande.get('destinataire_nom', '')}</h3>
                <p><strong>Du:</strong> {counter.get('date_debut', '')}</p>
                <p><strong>Au:</strong> {counter.get('date_fin', '')}</p>
                {f"<p><strong>Commentaire:</strong> {counter.get('commentaire', '')}</p>" if counter.get('commentaire') else ""}
            </div>
            
            <div class="actions">
                <p><strong>Acceptez-vous ces nouvelles dates ?</strong></p>
                <a href="{accept_url}" class="button btn-accept">✓ Accepter ces dates</a>
                <a href="{refuse_url}" class="button btn-refuse">✗ Refuser</a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
                Si vous refusez, les dates initiales de la maintenance seront maintenues.
            </p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Contre-proposition de Dates

Suite à votre demande de report, {demande.get('destinataire_nom', '')} vous propose des dates alternatives.

Votre demande initiale:
- Équipements: {equipements_str}
- Dates demandées: Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}

Dates proposées:
- Du: {counter.get('date_debut', '')}
- Au: {counter.get('date_fin', '')}
{f"- Commentaire: {counter.get('commentaire', '')}" if counter.get('commentaire') else ""}

Pour répondre:
- Accepter: {accept_url}
- Refuser: {refuse_url}
        """
        
        success = email_service.send_email(
            to_email=demandeur_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email contre-proposition: {str(e)}")
        return False


async def send_counter_proposal_decision_email(demande: dict, report: dict, counter: dict, decision: str):
    """Envoyer email au responsable pour l'informer de la décision sur sa contre-proposition"""
    try:
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        destinataire_email = demande.get("destinataire_email", "")
        
        if decision == "ACCEPTE":
            subject = f"✅ Contre-proposition ACCEPTÉE - {equipements_str}"
            status_color = "#10b981"
            status_text = "ACCEPTÉE"
            message = "Votre contre-proposition a été acceptée. Les nouvelles dates sont maintenant effectives."
        else:
            subject = f"❌ Contre-proposition REFUSÉE - {equipements_str}"
            status_color = "#ef4444"
            status_text = "REFUSÉE"
            message = "Votre contre-proposition a été refusée. Les dates initiales de la maintenance sont maintenues."
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {status_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid {status_color}; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Contre-proposition {status_text}</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>{message}</p>
            
            <div class="info-box">
                <h3>📋 Détails</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates que vous aviez proposées:</strong> Du {counter.get('date_debut', '')} au {counter.get('date_fin', '')}</p>
                <p><strong>Réponse de:</strong> {report.get('demandeur_report_nom', '')}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        success = email_service.send_email(
            to_email=destinataire_email,
            subject=subject,
            html_content=html_content,
            text_content=message
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email décision contre-proposition: {str(e)}")
        return False
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email report: {demande.get('id', '')}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email report: {str(e)}")
        return False

async def send_cancellation_email(demande: dict, motif: str, cancelled_by: dict):
    """Envoyer email d'annulation au destinataire"""
    try:
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        cancelled_by_name = f"{cancelled_by.get('prenom', '')} {cancelled_by.get('nom', '')}"
        
        subject = f"❌ Annulation - Demande d'Arrêt pour Maintenance - {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .motif-box {{ background: #fef2f2; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #dc2626; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Demande d'Arrêt Annulée</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>Une demande d'arrêt pour maintenance a été <strong>annulée</strong>.</p>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Période prévue:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
                <p><strong>Priorité:</strong> {demande.get('priorite', 'NORMALE')}</p>
                {f"<p><strong>Commentaire initial:</strong> {demande.get('commentaire', '')}</p>" if demande.get('commentaire') else ""}
            </div>
            
            <div class="motif-box">
                <h3>📝 Motif de l'annulation</h3>
                <p><strong>Annulée par:</strong> {cancelled_by_name}</p>
                <p><strong>Motif:</strong> {motif}</p>
            </div>
            
            <p>Si la planification avait été créée dans le Planning M.Prev., elle a été automatiquement supprimée.</p>
        </div>
        <div class="footer">
            <p>GMAO Iris - Système de Gestion de Maintenance</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande d'Arrêt Annulée

Rappel de la demande:
- Demandeur: {demande.get('demandeur_nom', '')}
- Équipements: {equipements_str}
- Période: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}

Motif de l'annulation:
- Annulée par: {cancelled_by_name}
- Motif: {motif}

---
GMAO Iris - Système de Gestion de Maintenance
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email annulation: {demande.get('id', '')}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email annulation: {str(e)}")
        return False

# ==================== FONCTION CRON ====================

async def check_expired_demandes_cron():
    """Fonction appelée par le cron pour vérifier les demandes expirées"""
    try:
        logger.info("🕐 Début vérification demandes expirées...")
        result = await check_expired_demandes()
        logger.info(f"✅ Vérification terminée: {result['expired_count']} demande(s) expirée(s)")
    except Exception as e:
        logger.error(f"❌ Erreur vérification cron: {str(e)}")

# ==================== PIÈCES JOINTES ====================

@router.post("/{demande_id}/attachments")
async def upload_attachment(
    demande_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Uploader une pièce jointe à une demande d'arrêt (max 10MB)"""
    try:
        # Vérifier que la demande existe
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Vérifier la taille du fichier
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
        
        # Générer un nom de fichier unique
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Sauvegarder le fichier
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Créer l'entrée attachment
        attachment = {
            "id": str(uuid.uuid4()),
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(content),
            "mime_type": file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by_id": current_user.get("id"),
            "uploaded_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"
        }
        
        # Ajouter à la base de données
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$push": {"attachments": attachment}}
        )
        
        attachment["url"] = f"/api/demandes-arret/{demande_id}/attachments/{attachment['id']}"
        
        logger.info(f"Pièce jointe uploadée: {attachment['original_filename']} pour demande {demande_id}")
        return attachment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur upload pièce jointe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{demande_id}/attachments")
async def get_attachments(
    demande_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lister les pièces jointes d'une demande d'arrêt"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        attachments = demande.get("attachments", [])
        
        # Ajouter les URLs de téléchargement
        for att in attachments:
            att["url"] = f"/api/demandes-arret/{demande_id}/attachments/{att['id']}"
        
        return attachments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération pièces jointes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{demande_id}/attachments/{attachment_id}")
async def download_attachment(
    demande_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Télécharger une pièce jointe"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Trouver l'attachment
        attachment = None
        for att in demande.get("attachments", []):
            if att.get("id") == attachment_id:
                attachment = att
                break
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Pièce jointe non trouvée")
        
        file_path = UPLOAD_DIR / attachment["filename"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Fichier non trouvé sur le serveur")
        
        return FileResponse(
            path=file_path,
            filename=attachment["original_filename"],
            media_type=attachment["mime_type"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur téléchargement pièce jointe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{demande_id}/attachments/{attachment_id}")
async def delete_attachment(
    demande_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer une pièce jointe"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        # Vérifier que l'utilisateur est le créateur ou un admin
        user_role = current_user.get("role")
        if user_role != "ADMIN" and demande.get("demandeur_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de supprimer cette pièce jointe")
        
        # Trouver l'attachment
        attachment = None
        for att in demande.get("attachments", []):
            if att.get("id") == attachment_id:
                attachment = att
                break
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Pièce jointe non trouvée")
        
        # Supprimer le fichier physique
        file_path = UPLOAD_DIR / attachment["filename"]
        if file_path.exists():
            file_path.unlink()
        
        # Retirer de la base de données
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$pull": {"attachments": {"id": attachment_id}}}
        )
        
        logger.info(f"Pièce jointe supprimée: {attachment['original_filename']} de demande {demande_id}")
        return {"message": "Pièce jointe supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression pièce jointe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== FONCTION EMAIL RAPPEL ====================

async def send_reminder_email(demande: dict, days_remaining: int):
    """Envoyer un email de rappel pour une demande en attente"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        approve_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=approve"
        refuse_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=refuse"
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        
        subject = f"⏰ RAPPEL - Demande d'Arrêt en attente ({days_remaining} jour(s) restant(s))"
        
        urgency_color = "#dc2626" if days_remaining <= 2 else "#f59e0b"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {urgency_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .urgency-box {{ background: #fef2f2; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid {urgency_color}; text-align: center; }}
        .button {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .countdown {{ font-size: 48px; font-weight: bold; color: {urgency_color}; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ RAPPEL - Demande en Attente</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>Ceci est un <strong>rappel</strong> concernant une demande d'arrêt pour maintenance qui attend votre réponse.</p>
            
            <div class="urgency-box">
                <p class="countdown">{days_remaining}</p>
                <p style="font-weight: bold; font-size: 18px;">jour(s) restant(s) avant expiration automatique</p>
            </div>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Période demandée:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
                <p><strong>Priorité:</strong> {demande.get('priorite', 'NORMALE')}</p>
            </div>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{approve_link}" class="button btn-approve">✓ Approuver</a>
                <a href="{refuse_link}" class="button btn-refuse">✗ Refuser</a>
            </p>
            
            <p style="color: {urgency_color}; font-weight: bold; text-align: center;">
                ⚠️ Sans réponse de votre part, cette demande sera automatiquement refusée le {demande.get('date_expiration', '')[:10]}.
            </p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
RAPPEL - Demande d'Arrêt en Attente

{days_remaining} jour(s) restant(s) avant expiration automatique

Rappel de la demande:
- Demandeur: {demande.get('demandeur_nom', '')}
- Équipements: {equipements_str}
- Période: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}

Approuver: {approve_link}
Refuser: {refuse_link}

Sans réponse, cette demande sera automatiquement refusée le {demande.get('date_expiration', '')[:10]}.
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email rappel: {demande.get('id', '')}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email rappel: {str(e)}")
        return False
