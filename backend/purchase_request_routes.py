"""
Routes API pour les demandes d'achat
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import logging
import os
from pathlib import Path

from models import (
    PurchaseRequest, PurchaseRequestCreate, PurchaseRequestUpdate,
    PurchaseRequestStatusUpdate, PurchaseRequestStatus, PurchaseRequestHistoryEntry
)
from dependencies import get_current_user, get_database
from purchase_request_service import PurchaseRequestService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/purchase-requests", tags=["purchase-requests"])


@router.post("", response_model=dict)
async def create_purchase_request(
    request: PurchaseRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Créer une nouvelle demande d'achat"""
    try:
        service = PurchaseRequestService(db)
        
        # Récupérer les infos du demandeur
        demandeur_nom = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"
        demandeur_email = current_user.get('email', '')
        
        # Récupérer le N+1 si existe
        responsable_n1_id = current_user.get('responsable_hierarchique_id')
        responsable_n1_nom = None
        
        if responsable_n1_id:
            n1_user = await db.users.find_one({"id": responsable_n1_id}, {"_id": 0})
            if n1_user:
                responsable_n1_nom = f"{n1_user.get('prenom', '')} {n1_user.get('nom', '')}"
        
        # Générer le numéro de demande
        year = datetime.now().year
        count = await db.purchase_requests.count_documents({"numero": {"$regex": f"^DA-{year}-"}})
        numero = f"DA-{year}-{(count + 1):05d}"
        
        # Créer la demande
        purchase_request = PurchaseRequest(
            **request.model_dump(),
            numero=numero,
            demandeur_id=current_user['id'],
            demandeur_nom=demandeur_nom,
            demandeur_email=demandeur_email,
            responsable_n1_id=responsable_n1_id,
            responsable_n1_nom=responsable_n1_nom,
            status=PurchaseRequestStatus.SOUMISE,
            history=[
                PurchaseRequestHistoryEntry(
                    user_id=current_user['id'],
                    user_name=demandeur_nom,
                    action="Création de la demande",
                    new_status=PurchaseRequestStatus.SOUMISE.value
                )
            ]
        )
        
        # Sauvegarder dans la DB
        await db.purchase_requests.insert_one(purchase_request.model_dump())
        
        # Envoyer l'email au N+1 si existe
        if responsable_n1_id and n1_user:
            await service.send_email_to_n1(purchase_request, n1_user)
        
        logger.info(f"✅ Demande d'achat {numero} créée par {demandeur_nom}")
        
        return {
            "message": "Demande d'achat créée avec succès",
            "id": purchase_request.id,
            "numero": purchase_request.numero
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur création demande d'achat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[dict])
async def get_purchase_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Récupérer les demandes d'achat"""
    try:
        query = {}
        
        # Si pas admin, ne voir que ses propres demandes ou celles dont on est N+1
        if current_user.get('role') != 'ADMIN':
            query = {
                "$or": [
                    {"demandeur_id": current_user['id']},
                    {"responsable_n1_id": current_user['id']}
                ]
            }
        
        # Filtrer par statut si demandé
        if status:
            query["status"] = status
        
        requests = await db.purchase_requests.find(query, {"_id": 0}).sort("date_creation", -1).to_list(1000)
        
        return requests
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération demandes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{request_id}", response_model=dict)
async def get_purchase_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Récupérer une demande d'achat par ID"""
    try:
        request = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        
        # Vérifier les permissions
        if current_user.get('role') != 'ADMIN':
            if request['demandeur_id'] != current_user['id'] and request.get('responsable_n1_id') != current_user['id']:
                raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        return request
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur récupération demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{request_id}/status", response_model=dict)
async def update_purchase_request_status(
    request_id: str,
    status_update: PurchaseRequestStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mettre à jour le statut d'une demande d'achat"""
    try:
        service = PurchaseRequestService(db)
        
        # Récupérer la demande
        request = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        
        # Vérifier les permissions selon le statut
        old_status = request['status']
        new_status = status_update.status.value
        
        # Logique de validation selon le rôle
        if new_status in [PurchaseRequestStatus.VALIDEE_N1.value, PurchaseRequestStatus.REFUSEE_N1.value]:
            # Seul le N+1 peut valider/refuser
            if request.get('responsable_n1_id') != current_user['id'] and current_user.get('role') != 'ADMIN':
                raise HTTPException(status_code=403, detail="Seul le N+1 peut effectuer cette action")
        
        elif new_status in [PurchaseRequestStatus.APPROUVEE_ACHAT.value, PurchaseRequestStatus.REFUSEE_ACHAT.value]:
            # Seul l'admin (service achat) peut approuver/refuser l'achat
            if current_user.get('role') != 'ADMIN':
                raise HTTPException(status_code=403, detail="Seul le service achat peut effectuer cette action")
        
        # Créer l'entrée d'historique
        user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"
        history_entry = PurchaseRequestHistoryEntry(
            user_id=current_user['id'],
            user_name=user_name,
            action=f"Changement de statut: {old_status} → {new_status}",
            old_status=old_status,
            new_status=new_status,
            comment=status_update.comment
        )
        
        # Préparer les mises à jour
        update_data = {
            "status": new_status,
            "date_derniere_modification": datetime.now(timezone.utc).isoformat()
        }
        
        # Ajouter les dates selon le statut
        if new_status == PurchaseRequestStatus.VALIDEE_N1.value:
            update_data["date_validation_n1"] = datetime.now(timezone.utc).isoformat()
        elif new_status == PurchaseRequestStatus.APPROUVEE_ACHAT.value:
            update_data["date_approbation_achat"] = datetime.now(timezone.utc).isoformat()
        elif new_status == PurchaseRequestStatus.ACHAT_EFFECTUE.value:
            update_data["date_achat_effectue"] = datetime.now(timezone.utc).isoformat()
        elif new_status == PurchaseRequestStatus.RECEPTIONNEE.value:
            update_data["date_reception"] = datetime.now(timezone.utc).isoformat()
        elif new_status == PurchaseRequestStatus.DISTRIBUEE.value:
            update_data["date_distribution"] = datetime.now(timezone.utc).isoformat()
        
        # Mettre à jour dans la DB
        await db.purchase_requests.update_one(
            {"id": request_id},
            {
                "$set": update_data,
                "$push": {"history": history_entry.model_dump()}
            }
        )
        
        # Envoyer les emails selon le changement de statut
        await service.send_status_change_emails(request_id, old_status, new_status, current_user)
        
        logger.info(f"✅ Statut de la demande {request['numero']} changé: {old_status} → {new_status}")
        
        return {"message": "Statut mis à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour statut: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{request_id}", response_model=dict)
async def update_purchase_request(
    request_id: str,
    update: PurchaseRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mettre à jour une demande d'achat (seulement par l'admin)"""
    try:
        if current_user.get('role') != 'ADMIN':
            raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent modifier les demandes")
        
        request = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        
        # Préparer les données de mise à jour
        update_data = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}
        update_data["date_derniere_modification"] = datetime.now(timezone.utc).isoformat()
        
        # Ajouter à l'historique
        user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}"
        history_entry = PurchaseRequestHistoryEntry(
            user_id=current_user['id'],
            user_name=user_name,
            action="Modification de la demande",
            new_status=request['status']
        )
        
        await db.purchase_requests.update_one(
            {"id": request_id},
            {
                "$set": update_data,
                "$push": {"history": history_entry.model_dump()}
            }
        )
        
        logger.info(f"✅ Demande {request['numero']} modifiée par {user_name}")
        
        return {"message": "Demande mise à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{request_id}", response_model=dict)
async def delete_purchase_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Supprimer une demande d'achat (seulement par l'admin)"""
    try:
        if current_user.get('role') != 'ADMIN':
            raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent supprimer les demandes")
        
        request = await db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        
        await db.purchase_requests.delete_one({"id": request_id})
        
        logger.info(f"✅ Demande {request['numero']} supprimée")
        
        return {"message": "Demande supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur suppression demande: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
