"""
Routes API pour les Demandes d'Arrêt pour Maintenance
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import logging
import uuid
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
        
        # Créer l'entrée dans l'historique des reports
        report_entry = {
            "id": str(uuid.uuid4()),
            "demande_id": demande_id,
            "demandeur_report_id": current_user.get("id"),
            "demandeur_report_nom": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            "raison": raison,
            "date_debut_originale": demande.get("date_debut"),
            "date_fin_originale": demande.get("date_fin"),
            "nouvelle_date_debut": nouvelle_date_debut,
            "nouvelle_date_fin": nouvelle_date_fin,
            "statut": "EN_ATTENTE",  # EN_ATTENTE, ACCEPTE, REFUSE
            "created_at": now.isoformat(),
            "equipement_noms": demande.get("equipement_noms", []),
            "destinataire_nom": demande.get("destinataire_nom", ""),
            "destinataire_email": demande.get("destinataire_email", "")
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
                    "demande_le": now.isoformat()
                },
                "updated_at": now.isoformat()
            }}
        )
        
        # Envoyer email de notification au destinataire
        await send_report_request_email(demande, report_entry, current_user)
        
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


@router.get("/reports/history")
async def get_reports_history(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer l'historique des reports avec statistiques"""
    try:
        # Récupérer tous les reports
        reports = await db.reports_historique.find().sort("created_at", -1).to_list(1000)
        reports = [serialize_doc(r) for r in reports]
        
        # Récupérer le total des demandes
        total_demandes = await db.demandes_arret.count_documents({})
        
        # Calculer les statistiques
        total_reports = len(reports)
        reports_acceptes = len([r for r in reports if r.get("statut") == "ACCEPTE"])
        reports_en_attente = len([r for r in reports if r.get("statut") == "EN_ATTENTE"])
        reports_refuses = len([r for r in reports if r.get("statut") == "REFUSE"])
        
        # Calculer la durée moyenne de report en jours
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
        
        # Équipements les plus reportés
        equipements_count = {}
        for report in reports:
            for eq_nom in report.get("equipement_noms", []):
                equipements_count[eq_nom] = equipements_count.get(eq_nom, 0) + 1
        
        top_equipements = sorted(equipements_count.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Taux d'acceptation
        taux_acceptation = round((reports_acceptes / total_reports * 100), 1) if total_reports > 0 else 0
        
        # Délai moyen de réponse (pour les reports acceptés)
        delais_reponse = []
        for report in reports:
            if report.get("statut") == "ACCEPTE" and report.get("date_acceptation"):
                try:
                    date_demande = datetime.fromisoformat(report.get("created_at", "").replace("Z", "+00:00"))
                    date_acceptation = datetime.fromisoformat(report.get("date_acceptation", "").replace("Z", "+00:00"))
                    delai = (date_acceptation - date_demande).total_seconds() / 3600  # en heures
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

async def send_report_request_email(demande: dict, report: dict, requested_by: dict):
    """Envoyer email de demande de report au destinataire"""
    try:
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        requested_by_name = f"{requested_by.get('prenom', '')} {requested_by.get('nom', '')}"
        
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Demande de Report</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>Une demande de <span class="highlight">report de maintenance</span> a été soumise.</p>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande initiale</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates prévues:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
            </div>
            
            <div class="dates-box">
                <h3>📆 Nouvelles dates demandées</h3>
                <p><strong>Du:</strong> {report.get('nouvelle_date_debut', '')}</p>
                <p><strong>Au:</strong> {report.get('nouvelle_date_fin', '')}</p>
            </div>
            
            <div class="raison-box">
                <h3>📝 Raison du report</h3>
                <p><strong>Demandé par:</strong> {requested_by_name}</p>
                <p>{report.get('raison', '')}</p>
            </div>
            
            <p>Veuillez vous connecter à l'application GMAO pour accepter ou refuser cette demande de report.</p>
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
- Demandé par: {requested_by_name}
- {report.get('raison', '')}

Veuillez vous connecter à l'application GMAO pour accepter ou refuser cette demande.

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
