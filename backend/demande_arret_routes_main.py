"""
Routes API pour les Demandes d'Arrêt pour Maintenance
Version refactorisée - fichier principal

Les routes sont maintenant divisées en modules :
- demande_arret_routes.py (ce fichier) : CRUD principal, validation, annulation
- demande_arret_reports_routes.py : Routes pour les reports et contre-propositions  
- demande_arret_attachments_routes.py : Routes pour les pièces jointes
- demande_arret_emails.py : Fonctions d'envoi d'emails
- demande_arret_utils.py : Utilitaires partagés (serialize_doc, db, etc.)
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
import audit_service as audit_module

# Import des modules refactorisés
from demande_arret_utils import db, serialize_doc, UPLOAD_DIR, MAX_FILE_SIZE
from demande_arret_emails import (
    send_demande_email,
    send_cancellation_email,
    send_reminder_email
)

logger = logging.getLogger(__name__)

# Service d'audit pour journalisation
audit_service = audit_module.AuditService(db)

router = APIRouter(prefix="/demandes-arret", tags=["demandes-arret"])


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


# ==================== RAPPELS ====================

@router.get("/trigger-reminders")
async def trigger_reminders(current_user: dict = Depends(get_current_user)):
    """
    Point d'entrée pour déclencher les vérifications de rappels.
    Appelé automatiquement lors de la visite du dashboard.
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
    approved: bool = True,
    commentaire: Optional[str] = None,
    date_proposee: Optional[str] = None
):
    """Valider ou refuser une demande via token (depuis l'email)"""
    try:
        demande = await db.demandes_arret.find_one({"validation_token": token})
        if not demande:
            raise HTTPException(status_code=404, detail="Token invalide ou demande non trouvée")
        
        if demande["statut"] != DemandeArretStatus.EN_ATTENTE:
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        now = datetime.now(timezone.utc)
        
        if approved:
            # Approuver la demande
            new_status = DemandeArretStatus.APPROUVEE
            
            # Créer les entrées dans le planning
            for eq_id in demande.get("equipement_ids", []):
                planning_entry = {
                    "id": str(uuid.uuid4()),
                    "equipement_id": eq_id,
                    "demande_arret_id": demande["id"],
                    "date_debut": demande["date_debut"],
                    "date_fin": demande["date_fin"],
                    "statut": EquipmentStatus.EN_ARRET,
                    "created_at": now.isoformat()
                }
                await db.planning_equipement.insert_one(planning_entry)
            
            message = "Demande approuvée avec succès"
        else:
            # Refuser la demande
            new_status = DemandeArretStatus.REFUSEE
            message = "Demande refusée"
        
        # Mettre à jour la demande
        update_data = {
            "statut": new_status,
            "date_validation": now.isoformat(),
            "updated_at": now.isoformat()
        }
        if commentaire:
            update_data["commentaire_validation"] = commentaire
        if date_proposee:
            update_data["date_proposee"] = date_proposee
        
        await db.demandes_arret.update_one(
            {"validation_token": token},
            {"$set": update_data}
        )
        
        logger.info(f"Demande {demande['id']} {'approuvée' if approved else 'refusée'}")
        return {"message": message, "demande_id": demande["id"]}
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
    """Refuser une demande via token (depuis l'email)"""
    try:
        demande = await db.demandes_arret.find_one({"validation_token": token})
        if not demande:
            raise HTTPException(status_code=404, detail="Token invalide ou demande non trouvée")
        
        if demande["statut"] != DemandeArretStatus.EN_ATTENTE:
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        now = datetime.now(timezone.utc)
        
        update_data = {
            "statut": DemandeArretStatus.REFUSEE,
            "date_refus": now.isoformat(),
            "updated_at": now.isoformat()
        }
        if commentaire:
            update_data["commentaire_refus"] = commentaire
        if date_proposee:
            update_data["date_proposee"] = date_proposee
        
        await db.demandes_arret.update_one(
            {"validation_token": token},
            {"$set": update_data}
        )
        
        logger.info(f"Demande {demande['id']} refusée")
        return {"message": "Demande refusée avec succès", "demande_id": demande["id"]}
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
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le planning des équipements"""
    try:
        filter_query = {}
        if date_debut:
            filter_query["date_debut"] = {"$gte": date_debut}
        if date_fin:
            filter_query["date_fin"] = {"$lte": date_fin}
        
        entries = await db.planning_equipement.find(filter_query).to_list(length=None)
        return [serialize_doc(e) for e in entries]
    except Exception as e:
        logger.error(f"Erreur récupération planning: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VÉRIFICATION EXPIRATION ====================

@router.post("/check-expired")
async def check_expired_demandes():
    """Vérifier et expirer les demandes dépassées"""
    try:
        now = datetime.now(timezone.utc)
        
        # Trouver les demandes en attente expirées
        expired = await db.demandes_arret.find({
            "statut": DemandeArretStatus.EN_ATTENTE,
            "date_expiration": {"$lt": now.isoformat()}
        }).to_list(length=None)
        
        count = 0
        for demande in expired:
            await db.demandes_arret.update_one(
                {"id": demande["id"]},
                {"$set": {
                    "statut": DemandeArretStatus.EXPIREE,
                    "updated_at": now.isoformat()
                }}
            )
            count += 1
        
        return {"expired_count": count, "message": f"{count} demande(s) expirée(s)"}
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
    """Annuler une demande d'arrêt"""
    try:
        demande = await db.demandes_arret.find_one({"id": demande_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if demande["statut"] in [DemandeArretStatus.ANNULEE, DemandeArretStatus.EXPIREE]:
            raise HTTPException(status_code=400, detail="Cette demande ne peut pas être annulée")
        
        now = datetime.now(timezone.utc)
        ancien_statut = demande["statut"]
        
        # Si la demande était approuvée, supprimer du planning
        if ancien_statut == DemandeArretStatus.APPROUVEE:
            await db.planning_equipement.delete_many({"demande_arret_id": demande_id})
        
        # Mettre à jour le statut
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
        
        # Envoyer email d'annulation
        await send_cancellation_email(demande, motif, current_user)
        
        # Enregistrer dans le journal d'audit
        await audit_service.log_action(
            user_id=current_user.get("id"),
            user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            user_email=current_user.get("email"),
            action=ActionType.DELETE,
            entity_type=EntityType.DEMANDE_ARRET,
            entity_id=demande_id,
            entity_name=f"Demande d'arrêt annulée",
            details=f"Motif: {motif}",
            changes={"statut": f"{ancien_statut} → ANNULEE"}
        )
        
        logger.info(f"Demande annulée: {demande_id}")
        return {"message": "Demande annulée avec succès", "demande_id": demande_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur annulation demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FONCTION CRON ====================

async def check_expired_demandes_cron():
    """Fonction appelée par le scheduler pour vérifier les demandes expirées"""
    try:
        now = datetime.now(timezone.utc)
        expired = await db.demandes_arret.find({
            "statut": DemandeArretStatus.EN_ATTENTE,
            "date_expiration": {"$lt": now.isoformat()}
        }).to_list(length=None)
        
        for demande in expired:
            await db.demandes_arret.update_one(
                {"id": demande["id"]},
                {"$set": {"statut": DemandeArretStatus.EXPIREE, "updated_at": now.isoformat()}}
            )
        
        logger.info(f"Vérification expiration: {len(expired)} demande(s) expirée(s)")
    except Exception as e:
        logger.error(f"Erreur cron expiration: {str(e)}")
