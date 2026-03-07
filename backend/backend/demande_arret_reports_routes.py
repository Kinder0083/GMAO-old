"""
Routes API pour les Reports des Demandes d'Arrêt pour Maintenance
Inclut: demandes de report, validation par token, contre-propositions
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import logging
import uuid

from dependencies import get_current_user
from models import DemandeArretStatus, EquipmentStatus, ActionType, EntityType
from demande_arret_utils import db, serialize_doc
from demande_arret_emails import (
    send_report_request_email,
    send_report_decision_email,
    send_counter_proposal_email,
    send_counter_proposal_decision_email
)
import audit_service as audit_module

# Import du manager WebSocket pour les notifications temps réel
try:
    from realtime_manager import realtime_manager
    HAS_REALTIME = True
except ImportError:
    HAS_REALTIME = False
    realtime_manager = None

logger = logging.getLogger(__name__)

# Service d'audit
audit_service = audit_module.AuditService(db)

router = APIRouter(prefix="/demandes-arret", tags=["demandes-arret-reports"])


async def broadcast_demande_update(event_type: str, data: dict):
    """Broadcast une mise à jour de demande d'arrêt via WebSocket"""
    if HAS_REALTIME and realtime_manager:
        try:
            await realtime_manager.broadcast("demandes_arret", {
                "type": event_type,
                "entity_type": "demandes_arret",
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"[Realtime] Event {event_type} émis pour demandes_arret")
        except Exception as e:
            logger.warning(f"[Realtime] Erreur broadcast demandes_arret: {e}")

router = APIRouter(prefix="/demandes-arret", tags=["demandes-arret-reports"])


# ==================== FONCTION UTILITAIRE POUR MISE À JOUR DU PLANNING ====================

async def update_planning_for_report(demande_id: str, nouvelle_date_debut: str, nouvelle_date_fin: str, demande: dict):
    """
    Met à jour les entrées du planning après l'acceptation d'un report.
    - Supprime les anciennes entrées (non terminées de manière anticipée)
    - Crée de nouvelles entrées avec les nouvelles dates
    """
    try:
        # Récupérer les anciennes entrées du planning pour cette demande
        old_entries = await db.planning_equipement.find({
            "demande_arret_id": demande_id,
            "fin_anticipee": {"$ne": True}  # Ne pas toucher aux maintenances déjà terminées
        }).to_list(length=None)
        
        # Supprimer les anciennes entrées
        if old_entries:
            delete_result = await db.planning_equipement.delete_many({
                "demande_arret_id": demande_id,
                "fin_anticipee": {"$ne": True}
            })
            logger.info(f"Report: {delete_result.deleted_count} entrée(s) planning supprimée(s) pour demande {demande_id}")
        
        # Générer un nouveau token pour la fin de maintenance
        end_maintenance_token = str(uuid.uuid4())
        
        # Créer de nouvelles entrées pour chaque équipement
        equipement_ids = demande.get("equipement_ids", [])
        for eq_id in equipement_ids:
            planning_entry = {
                "id": str(uuid.uuid4()),
                "equipement_id": eq_id,
                "demande_arret_id": demande_id,
                "date_debut": nouvelle_date_debut,
                "date_fin": nouvelle_date_fin,
                "periode_debut": demande.get("periode_debut"),
                "periode_fin": demande.get("periode_fin"),
                "heure_debut": demande.get("heure_debut"),
                "heure_fin": demande.get("heure_fin"),
                "motif": demande.get("motif"),
                "statut": EquipmentStatus.EN_MAINTENANCE,
                "end_maintenance_token": end_maintenance_token,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "report_applied": True  # Marquer comme créé suite à un report
            }
            await db.planning_equipement.insert_one(planning_entry)
        
        logger.info(f"Report: {len(equipement_ids)} nouvelle(s) entrée(s) planning créée(s) pour demande {demande_id}")
        
        # Mettre à jour le token de fin de maintenance dans la demande aussi
        await db.demandes_arret.update_one(
            {"id": demande_id},
            {"$set": {"end_maintenance_token": end_maintenance_token}}
        )
        
        return True
    except Exception as e:
        logger.error(f"Erreur mise à jour planning pour report: {str(e)}")
        return False


# ==================== HISTORIQUE DES REPORTS ====================

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
            
            # Mettre à jour le planning avec les nouvelles dates
            await update_planning_for_report(
                demande_id=demande_id,
                nouvelle_date_debut=report["nouvelle_date_debut"],
                nouvelle_date_fin=report["nouvelle_date_fin"],
                demande=demande
            )
            
            await send_report_decision_email(demande, report, "ACCEPTE")
            
            # Broadcast WebSocket pour mise à jour temps réel
            await broadcast_demande_update("report_accepted", {
                "id": demande_id,
                "equipement_ids": demande.get("equipement_ids", []),
                "date_debut": report["nouvelle_date_debut"],
                "date_fin": report["nouvelle_date_fin"],
                "statut": "APPROUVEE"
            })
            
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
            
            # Mettre à jour le planning avec les nouvelles dates de la contre-proposition
            await update_planning_for_report(
                demande_id=demande_id,
                nouvelle_date_debut=counter["date_debut"],
                nouvelle_date_fin=counter["date_fin"],
                demande=demande
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


# ==================== DEMANDE DE REPORT (AUTHENTIFIÉ) ====================

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
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if demande["statut"] not in [DemandeArretStatus.EN_ATTENTE, DemandeArretStatus.APPROUVEE]:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de reporter une demande avec le statut '{demande['statut']}'"
            )
        
        now = datetime.now(timezone.utc)
        ancien_statut = demande["statut"]
        
        report_token = str(uuid.uuid4())
        
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
            "statut": "EN_ATTENTE",
            "validation_token": report_token,
            "created_at": now.isoformat(),
            "equipement_noms": demande.get("equipement_noms", []),
            "destinataire_id": demande.get("destinataire_id"),
            "destinataire_nom": demande.get("destinataire_nom", ""),
            "destinataire_email": demande.get("destinataire_email", ""),
            "contre_proposition": None
        }
        
        await db.reports_historique.insert_one(report_entry)
        
        planning_deleted = 0
        if ancien_statut == DemandeArretStatus.APPROUVEE:
            delete_result = await db.planning_equipement.delete_many({"demande_arret_id": demande_id})
            planning_deleted = delete_result.deleted_count
            logger.info(f"Suppression planning pour report: {planning_deleted} entrée(s)")
        
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
        
        await send_report_request_email(demande, report_entry)
        
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
    """Accepter le report et mettre à jour les dates (via l'interface authentifiée)"""
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
        
        dates_originales = demande.get("dates_originales") or {
            "date_debut": demande.get("date_debut"),
            "date_fin": demande.get("date_fin")
        }
        
        await db.reports_historique.update_one(
            {"id": report_info["report_id"]},
            {"$set": {
                "statut": "ACCEPTE",
                "accepte_par_id": current_user.get("id"),
                "accepte_par_nom": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
                "date_acceptation": now.isoformat()
            }}
        )
        
        nb_reports = (demande.get("nb_reports") or 0) + 1
        
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
        
        # Mettre à jour le planning avec les nouvelles dates
        await update_planning_for_report(
            demande_id=demande_id,
            nouvelle_date_debut=report_info["nouvelle_date_debut"],
            nouvelle_date_fin=report_info["nouvelle_date_fin"],
            demande=demande
        )
        
        # Broadcast WebSocket pour mise à jour temps réel
        await broadcast_demande_update("report_accepted", {
            "id": demande_id,
            "equipement_ids": demande.get("equipement_ids", []),
            "date_debut": report_info["nouvelle_date_debut"],
            "date_fin": report_info["nouvelle_date_fin"],
            "statut": "APPROUVEE"
        })
        
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
