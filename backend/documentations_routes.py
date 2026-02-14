"""
Routes API pour le module Documentations - Pôles de Service et Documents
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import logging
import mimetypes
from io import BytesIO

from models import (
    PoleDeService,
    PoleDeServiceCreate,
    PoleDeServiceUpdate,
    Document,
    DocumentCreate,
    DocumentUpdate,
    BonDeTravail,
    BonDeTravailCreate,
    DocumentType,
    ServicePole,
    ActionType,
    EntityType,
    SuccessResponse
)
from dependencies import get_current_user, get_current_admin_user, get_current_user_optional
from audit_service import AuditService
from auth import decode_access_token
from bon_travail_template_final import generate_bon_travail_html
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documentations", tags=["documentations"])

# Variables globales (injectées depuis server.py)
db = None
audit_service = None
realtime_manager = None

def init_documentations_routes(database, audit_svc, realtime_mgr=None):
    """Initialise les routes avec la connexion DB, audit service et realtime manager"""
    global db, audit_service, realtime_manager
    db = database
    audit_service = audit_svc
    realtime_manager = realtime_mgr


# ==================== PÔLES DE SERVICE ====================

@router.get("/poles", response_model=List[dict])
async def get_poles(current_user: dict = Depends(get_current_user)):
    """Récupérer tous les pôles de service avec leurs documents et bons de travail"""
    try:
        poles = await db.poles_service.find().to_list(length=None)
        
        # Pour chaque pôle, récupérer les documents et bons associés
        for pole in poles:
            if "_id" in pole:
                del pole["_id"]
            
            # Récupérer les documents associés
            documents = await db.documents.find({"pole_id": pole["id"]}).to_list(length=None)
            for doc in documents:
                if "_id" in doc:
                    del doc["_id"]
            
            # Récupérer les bons de travail associés
            bons_travail = await db.bons_travail.find({"pole_id": pole["id"]}).to_list(length=None)
            for bon in bons_travail:
                if "_id" in bon:
                    del bon["_id"]
            
            # Ajouter les documents et bons au pôle
            pole["documents"] = documents
            pole["bons_travail"] = bons_travail
        
        return poles
    except Exception as e:
        logger.error(f"Erreur récupération pôles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/poles/{pole_id}")
async def get_pole(pole_id: str, current_user: dict = Depends(get_current_user)):
    """Récupérer un pôle spécifique avec ses documents et bons de travail"""
    try:
        pole = await db.poles_service.find_one({"id": pole_id})
        if not pole:
            raise HTTPException(status_code=404, detail="Pôle non trouvé")
        if "_id" in pole:
            del pole["_id"]
        
        # Récupérer les documents associés au pôle
        documents = await db.documents.find({"pole_id": pole_id}).to_list(length=None)
        for doc in documents:
            if "_id" in doc:
                del doc["_id"]
        
        # Récupérer les bons de travail associés au pôle
        bons_travail = await db.bons_travail.find({"pole_id": pole_id}).to_list(length=None)
        for bon in bons_travail:
            if "_id" in bon:
                del bon["_id"]
        
        # Ajouter les documents et bons au pôle
        pole["documents"] = documents
        pole["bons_travail"] = bons_travail
        
        return pole
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération pôle {pole_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/poles")
async def create_pole(
    pole_data: PoleDeServiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau pôle de service"""
    try:
        pole = PoleDeService(
            **pole_data.model_dump(),
            created_by=current_user.get("id")
        )
        
        pole_dict = pole.model_dump()
        await db.poles_service.insert_one(pole_dict)
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.SETTINGS,
            entity_id=pole.id,
            entity_name=f"Pôle: {pole.nom}"
        )
        
        if "_id" in pole_dict:
            del pole_dict["_id"]
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "documentations",
                "created",
                pole_dict,
                user_id=current_user["id"]
            )
        
        return pole_dict
    except Exception as e:
        logger.error(f"Erreur création pôle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/poles/{pole_id}")
async def update_pole(
    pole_id: str,
    pole_update: PoleDeServiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un pôle de service"""
    try:
        existing = await db.poles_service.find_one({"id": pole_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Pôle non trouvé")
        
        update_data = {
            k: v for k, v in pole_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.poles_service.update_one(
            {"id": pole_id},
            {"$set": update_data}
        )
        
        updated_pole = await db.poles_service.find_one({"id": pole_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.SETTINGS,
            entity_id=pole_id,
            entity_name=f"Pôle: {existing.get('nom')}"
        )
        
        if "_id" in updated_pole:
            del updated_pole["_id"]
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "documentations",
                "updated",
                updated_pole,
                user_id=current_user["id"]
            )
        
        return updated_pole
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour pôle {pole_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/poles/{pole_id}", response_model=SuccessResponse)
async def delete_pole(
    pole_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un pôle de service (Admin uniquement)"""
    try:
        pole = await db.poles_service.find_one({"id": pole_id})
        if not pole:
            raise HTTPException(status_code=404, detail="Pôle non trouvé")
        
        # Vérifier s'il y a des documents liés
        docs_count = await db.documents.count_documents({"pole_id": pole_id})
        if docs_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de supprimer: {docs_count} document(s) lié(s) à ce pôle"
            )
        
        await db.poles_service.delete_one({"id": pole_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.DELETE,
            entity_type=EntityType.SETTINGS,
            entity_id=pole_id,
            entity_name=f"Pôle: {pole.get('nom')}"
        )
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "documentations",
                "deleted",
                {"id": pole_id, "nom": pole.get('nom')},
                user_id=current_user["id"]
            )
        
        return {"success": True, "message": "Pôle supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression pôle {pole_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DOCUMENTS ====================

@router.get("/documents", response_model=List[dict])
async def get_documents(
    pole_id: Optional[str] = None,
    type_document: Optional[str] = None,
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les documents avec filtres"""
    try:
        query = {}
        if pole_id:
            query["pole_id"] = pole_id
        if type_document:
            query["type_document"] = type_document
        if statut:
            query["statut"] = statut
        
        documents = await db.documents.find(query).to_list(length=None)
        for doc in documents:
            if "_id" in doc:
                del doc["_id"]
        return documents
    except Exception as e:
        logger.error(f"Erreur récupération documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un document spécifique"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        if "_id" in doc:
            del doc["_id"]
        return doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents")
async def create_document(
    doc_data: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau document"""
    try:
        # Vérifier que le pôle existe
        pole = await db.poles_service.find_one({"id": doc_data.pole_id})
        if not pole:
            raise HTTPException(status_code=404, detail="Pôle non trouvé")
        
        doc = Document(
            **doc_data.model_dump(),
            created_by=current_user.get("id"),
            updated_by=current_user.get("id")
        )
        
        doc_dict = doc.model_dump()
        await db.documents.insert_one(doc_dict)
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.SETTINGS,
            entity_id=doc.id,
            entity_name=f"Document: {doc.titre}"
        )
        
        if "_id" in doc_dict:
            del doc_dict["_id"]
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "documentations",
                "created",
                doc_dict,
                user_id=current_user["id"]
            )
        
        return doc_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/documents/{document_id}")
async def update_document(
    document_id: str,
    doc_update: DocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un document"""
    try:
        existing = await db.documents.find_one({"id": document_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        update_data = {
            k: v for k, v in doc_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        await db.documents.update_one(
            {"id": document_id},
            {"$set": update_data}
        )
        
        updated_doc = await db.documents.find_one({"id": document_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.SETTINGS,
            entity_id=document_id,
            entity_name=f"Document: {existing.get('titre')}"
        )
        
        if "_id" in updated_doc:
            del updated_doc["_id"]
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "documentations",
                "updated",
                updated_doc,
                user_id=current_user["id"]
            )
        
        return updated_doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{document_id}", response_model=SuccessResponse)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un document"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Supprimer le fichier physique si c'est une pièce jointe
        if doc.get("fichier_url"):
            try:
                file_path = Path(f"/app{doc['fichier_url']}")
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                logger.warning(f"Impossible de supprimer le fichier: {e}")
        
        await db.documents.delete_one({"id": document_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.DELETE,
            entity_type=EntityType.SETTINGS,
            entity_id=document_id,
            entity_name=f"Document: {doc.get('titre')}"
        )
        
        return {"success": True, "message": "Document supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== UPLOAD FICHIERS ====================

@router.post("/documents/{document_id}/upload")
async def upload_document_file(
    document_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload un fichier pour un document"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Créer le répertoire uploads/documents si nécessaire
        upload_dir = Path("uploads/documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Générer un nom de fichier unique
        file_ext = Path(file.filename).suffix
        unique_filename = f"{document_id}_{uuid.uuid4()}{file_ext}"
        file_path = upload_dir / unique_filename
        
        # Sauvegarder le fichier
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Déterminer le type MIME
        mime_type, _ = mimetypes.guess_type(file.filename)
        
        # Mettre à jour le document avec les infos du fichier
        file_url = f"/uploads/documents/{unique_filename}"
        await db.documents.update_one(
            {"id": document_id},
            {
                "$set": {
                    "fichier_url": file_url,
                    "fichier_nom": file.filename,
                    "fichier_type": mime_type or "application/octet-stream",
                    "fichier_taille": len(content),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }
            }
        )
        
        return {
            "success": True,
            "file_url": file_url,
            "file_name": file.filename,
            "file_size": len(content),
            "file_type": mime_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur upload fichier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}/view")
async def view_document_file(
    document_id: str,
    token: str = None,
    current_user: dict = Depends(get_current_user_optional)
):
    """Visualiser le fichier d'un document dans le navigateur (inline)"""
    try:
        # Si pas d'utilisateur via Bearer token, vérifier le token en query param
        if not current_user and token:
            # Vérifier le token passé en paramètre
            payload = decode_access_token(token)
            if payload is None:
                raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        elif not current_user and not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        if not doc.get("fichier_url"):
            raise HTTPException(status_code=404, detail="Aucun fichier associé")
        
        # Le fichier_url commence par /uploads/documents/
        # Le fichier réel est dans /app/backend/uploads/documents/
        file_path = Path(f"/app/backend{doc['fichier_url']}")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Fichier non trouvé sur le serveur")
        
        # Lire le fichier
        with open(file_path, "rb") as f:
            content = f.read()
        
        # Utiliser inline pour permettre la visualisation dans le navigateur
        return StreamingResponse(
            BytesIO(content),
            media_type=doc.get("fichier_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f"inline; filename={doc.get('fichier_nom', 'document')}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur visualisation fichier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/download")
async def download_document_file(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Télécharger le fichier d'un document (force le téléchargement)"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        if not doc.get("fichier_url"):
            raise HTTPException(status_code=404, detail="Aucun fichier associé")
        
        # Le fichier_url commence par /uploads/documents/
        # Le fichier réel est dans /app/backend/uploads/documents/
        file_path = Path(f"/app/backend{doc['fichier_url']}")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Fichier non trouvé sur le serveur")
        
        # Lire le fichier
        with open(file_path, "rb") as f:
            content = f.read()
        
        return StreamingResponse(
            BytesIO(content),
            media_type=doc.get("fichier_type", "application/octet-stream"),
            headers={
                "Content-Disposition": f"attachment; filename={doc.get('fichier_nom', 'document')}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur téléchargement fichier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BON DE TRAVAIL ====================

@router.get("/bons-travail", response_model=List[dict])
async def get_bons_travail(
    pole_id: Optional[str] = None,
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les bons de travail"""
    try:
        query = {}
        if pole_id:
            query["pole_id"] = pole_id
        if statut:
            query["statut"] = statut
        
        bons = await db.bons_travail.find(query).to_list(length=None)
        for bon in bons:
            if "_id" in bon:
                del bon["_id"]
        return bons
    except Exception as e:
        logger.error(f"Erreur récupération bons de travail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bons-travail/{bon_id}")
async def get_bon_travail(
    bon_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un bon de travail spécifique"""
    try:
        bon = await db.bons_travail.find_one({"id": bon_id})
        if not bon:
            raise HTTPException(status_code=404, detail="Bon de travail non trouvé")
        if "_id" in bon:
            del bon["_id"]
        return bon
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération bon {bon_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bons-travail")
async def create_bon_travail(
    bon_data: BonDeTravailCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau bon de travail"""
    try:
        bon = BonDeTravail(
            **bon_data.model_dump(),
            created_by=current_user.get("id")
        )
        
        bon_dict = bon.model_dump()
        await db.bons_travail.insert_one(bon_dict)
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.SETTINGS,
            entity_id=bon.id,
            entity_name=f"Bon de travail: {bon.localisation_ligne}"
        )
        
        if "_id" in bon_dict:
            del bon_dict["_id"]
        
        return bon_dict
    except Exception as e:
        logger.error(f"Erreur création bon de travail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bons-travail/{bon_id}")
async def update_bon_travail(
    bon_id: str,
    bon_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un bon de travail - Permissions : admin ou créateur uniquement"""
    try:
        existing = await db.bons_travail.find_one({"id": bon_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Bon de travail non trouvé")
        
        # Vérifier les permissions : admin ou créateur
        if current_user.get("role") != "ADMIN" and existing.get("created_by") != current_user.get("id"):
            raise HTTPException(
                status_code=403, 
                detail="Vous n'avez pas la permission de modifier ce bon de travail"
            )
        
        bon_update["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.bons_travail.update_one(
            {"id": bon_id},
            {"$set": bon_update}
        )
        
        updated_bon = await db.bons_travail.find_one({"id": bon_id})
        
        if "_id" in updated_bon:
            del updated_bon["_id"]
        
        return updated_bon
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour bon {bon_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bons-travail/{bon_id}", response_model=SuccessResponse)
async def delete_bon_travail(
    bon_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un bon de travail"""
    try:
        bon = await db.bons_travail.find_one({"id": bon_id})
        if not bon:
            raise HTTPException(status_code=404, detail="Bon de travail non trouvé")
        
        await db.bons_travail.delete_one({"id": bon_id})
        
        return {"success": True, "message": "Bon de travail supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression bon {bon_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GÉNÉRATION PDF & EMAIL ====================

@router.get("/bons-travail/{bon_id}/pdf")
async def generate_bon_pdf(
    bon_id: str,
    token: str = None,
    current_user: dict = Depends(get_current_user_optional)
):
    """Générer un PDF (HTML) pour un bon de travail - Format MAINT_FE_004_V02"""
    try:
        # Vérifier l'authentification via token si nécessaire
        if not current_user and token:
            payload = decode_access_token(token)
            if payload is None:
                raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        elif not current_user and not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        bon = await db.bons_travail.find_one({"id": bon_id})
        if not bon:
            raise HTTPException(status_code=404, detail="Bon de travail non trouvé")
        
        # Générer le HTML avec le template MAINT_FE_004_V02
        html_content = generate_bon_travail_html(bon)
        return HTMLResponse(content=html_content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur génération PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bons-travail/{bon_id}/email")
async def send_bon_email(
    bon_id: str,
    email_to: str,
    current_user: dict = Depends(get_current_user)
):
    """Envoyer un bon de travail par email"""
    try:
        bon = await db.bons_travail.find_one({"id": bon_id})
        if not bon:
            raise HTTPException(status_code=404, detail="Bon de travail non trouvé")
        
        # TODO: Implémenter l'envoi email avec SMTP
        # Pour l'instant, retourner un message
        
        return {
            "success": True,
            "message": "Envoi email en cours de développement",
            "bon_id": bon_id,
            "email_to": email_to
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur envoi email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FORM TEMPLATES ====================

@router.get("/form-templates")
async def get_form_templates(current_user: dict = Depends(get_current_user)):
    """Récupérer tous les modèles de formulaires"""
    try:
        templates = await db.form_templates.find({}, {"_id": 0}).to_list(length=None)
        
        # Si aucun template, retourner les templates système par défaut
        if not templates:
            default_templates = [
                {
                    "id": "default-bon-travail",
                    "nom": "Bon de travail",
                    "type": "BON_TRAVAIL",
                    "description": "Formulaire standard pour les bons de travail de maintenance",
                    "actif": True,
                    "is_system": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                },
                {
                    "id": "default-autorisation",
                    "nom": "Autorisation particulière",
                    "type": "AUTORISATION",
                    "description": "Formulaire standard pour les autorisations de travail spéciales",
                    "actif": True,
                    "is_system": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            ]
            # Insérer les templates par défaut
            for tpl in default_templates:
                await db.form_templates.insert_one(tpl)
            return default_templates
        
        return templates
    except Exception as e:
        logger.error(f"Erreur récupération templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/form-templates/{template_id}")
async def get_form_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Récupérer un modèle de formulaire par ID"""
    try:
        template = await db.form_templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Modèle non trouvé")
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/form-templates")
async def create_form_template(
    template_data: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """Créer un nouveau modèle de formulaire (admin uniquement)"""
    try:
        template = {
            "id": str(uuid.uuid4()),
            "nom": template_data.get("nom"),
            "type": template_data.get("type", "CUSTOM"),
            "description": template_data.get("description", ""),
            "fields": template_data.get("fields", []),
            "actif": template_data.get("actif", True),
            "is_system": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id")
        }
        
        await db.form_templates.insert_one(template)
        template.pop("_id", None)
        
        return template
    except Exception as e:
        logger.error(f"Erreur création template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/form-templates/{template_id}")
async def update_form_template(
    template_id: str,
    template_data: dict,
    current_user: dict = Depends(get_current_admin_user)
):
    """Mettre à jour un modèle de formulaire (admin uniquement)"""
    try:
        existing = await db.form_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Modèle non trouvé")
        
        if existing.get("is_system"):
            raise HTTPException(status_code=400, detail="Les modèles système ne peuvent pas être modifiés")
        
        update_data = {
            "nom": template_data.get("nom", existing.get("nom")),
            "type": template_data.get("type", existing.get("type")),
            "description": template_data.get("description", existing.get("description")),
            "fields": template_data.get("fields", existing.get("fields", [])),
            "actif": template_data.get("actif", existing.get("actif")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("id")
        }
        
        await db.form_templates.update_one({"id": template_id}, {"$set": update_data})
        
        updated = await db.form_templates.find_one({"id": template_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/form-templates/{template_id}", response_model=SuccessResponse)
async def delete_form_template(
    template_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un modèle de formulaire (admin uniquement, non-système)"""
    try:
        existing = await db.form_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Modèle non trouvé")
        
        if existing.get("is_system"):
            raise HTTPException(status_code=400, detail="Les modèles système ne peuvent pas être supprimés")
        
        await db.form_templates.delete_one({"id": template_id})
        
        return {"success": True, "message": "Modèle supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CUSTOM FORM INSTANCES (Filled Forms) ====================

@router.get("/custom-forms")
async def get_custom_forms(
    pole_id: Optional[str] = None,
    template_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les formulaires personnalisés remplis"""
    try:
        query = {}
        if pole_id:
            query["pole_id"] = pole_id
        if template_id:
            query["template_id"] = template_id
        
        forms = await db.custom_forms.find(query, {"_id": 0}).to_list(length=None)
        return forms
    except Exception as e:
        logger.error(f"Erreur récupération custom forms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-forms/{form_id}")
async def get_custom_form(form_id: str, current_user: dict = Depends(get_current_user)):
    """Récupérer un formulaire personnalisé par ID"""
    try:
        form = await db.custom_forms.find_one({"id": form_id}, {"_id": 0})
        if not form:
            raise HTTPException(status_code=404, detail="Formulaire non trouvé")
        return form
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération custom form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-forms")
async def create_custom_form(
    form_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau formulaire personnalisé rempli"""
    try:
        # Vérifier que le template existe
        template = await db.form_templates.find_one({"id": form_data.get("template_id")})
        if not template:
            raise HTTPException(status_code=404, detail="Modèle de formulaire non trouvé")
        
        custom_form = {
            "id": str(uuid.uuid4()),
            "template_id": form_data.get("template_id"),
            "template_name": template.get("nom"),
            "pole_id": form_data.get("pole_id"),
            "titre": form_data.get("titre", template.get("nom")),
            "field_values": form_data.get("field_values", {}),
            "attachments": form_data.get("attachments", []),
            "signature_data": form_data.get("signature_data"),
            "logo_url": form_data.get("logo_url"),
            "status": form_data.get("status", "BROUILLON"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id"),
            "created_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        }
        
        await db.custom_forms.insert_one(custom_form)
        custom_form.pop("_id", None)
        
        return custom_form
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création custom form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/custom-forms/{form_id}")
async def update_custom_form(
    form_id: str,
    form_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un formulaire personnalisé"""
    try:
        existing = await db.custom_forms.find_one({"id": form_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Formulaire non trouvé")
        
        # Vérifier les permissions
        is_admin = current_user.get("role") == "ADMIN"
        is_creator = existing.get("created_by") == current_user.get("id")
        
        if not is_admin and not is_creator:
            raise HTTPException(status_code=403, detail="Non autorisé à modifier ce formulaire")
        
        update_data = {
            "titre": form_data.get("titre", existing.get("titre")),
            "field_values": form_data.get("field_values", existing.get("field_values")),
            "attachments": form_data.get("attachments", existing.get("attachments")),
            "signature_data": form_data.get("signature_data", existing.get("signature_data")),
            "logo_url": form_data.get("logo_url", existing.get("logo_url")),
            "status": form_data.get("status", existing.get("status")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("id")
        }
        
        await db.custom_forms.update_one({"id": form_id}, {"$set": update_data})
        
        updated = await db.custom_forms.find_one({"id": form_id}, {"_id": 0})
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour custom form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/custom-forms/{form_id}", response_model=SuccessResponse)
async def delete_custom_form(
    form_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer un formulaire personnalisé"""
    try:
        existing = await db.custom_forms.find_one({"id": form_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Formulaire non trouvé")
        
        # Vérifier les permissions
        is_admin = current_user.get("role") == "ADMIN"
        is_creator = existing.get("created_by") == current_user.get("id")
        
        if not is_admin and not is_creator:
            raise HTTPException(status_code=403, detail="Non autorisé à supprimer ce formulaire")
        
        await db.custom_forms.delete_one({"id": form_id})
        
        return {"success": True, "message": "Formulaire supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression custom form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-forms/{form_id}/pdf")
async def generate_custom_form_pdf(
    form_id: str,
    token: Optional[str] = None,
    current_user: dict = Depends(get_current_user_optional)
):
    """Générer un PDF pour un formulaire personnalisé"""
    try:
        # Vérifier l'authentification
        if not current_user and token:
            payload = decode_access_token(token)
            if payload is None:
                raise HTTPException(status_code=401, detail="Token invalide")
        elif not current_user and not token:
            raise HTTPException(status_code=401, detail="Non authentifié")
        
        # Récupérer le formulaire
        form = await db.custom_forms.find_one({"id": form_id}, {"_id": 0})
        if not form:
            raise HTTPException(status_code=404, detail="Formulaire non trouvé")
        
        # Récupérer le template
        template = await db.form_templates.find_one({"id": form.get("template_id")}, {"_id": 0})
        
        # Générer le HTML
        html_content = generate_custom_form_html(form, template)
        
        return HTMLResponse(content=html_content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur génération PDF custom form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_custom_form_html(form: dict, template: dict) -> str:
    """Génère le HTML pour un formulaire personnalisé"""
    fields = template.get("fields", []) if template else []
    field_values = form.get("field_values", {})
    
    # Générer les lignes de champs
    fields_html = ""
    for field in fields:
        field_id = field.get("id")
        field_label = field.get("label", "")
        field_type = field.get("type", "text")
        value = field_values.get(field_id, "")
        
        # Formatage selon le type
        if field_type == "checkbox":
            value = "✓ Oui" if value else "✗ Non"
        elif field_type == "switch":
            value = "✓ Oui" if value else "✗ Non"
        elif field_type == "select":
            # La valeur est déjà le label sélectionné
            pass
        elif field_type == "date" and value:
            try:
                from datetime import datetime as dt
                value = dt.fromisoformat(value.replace('Z', '+00:00')).strftime("%d/%m/%Y")
            except:
                pass
        elif field_type == "textarea":
            value = value.replace('\n', '<br>') if value else ""
        
        fields_html += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: 500; width: 30%;">{field_label}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{value or '-'}</td>
        </tr>
        """
    
    # Signature
    signature_html = ""
    if form.get("signature_data"):
        signature_html = f"""
        <div style="margin-top: 30px; page-break-inside: avoid;">
            <h3 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 5px;">Signature</h3>
            <img src="{form.get('signature_data')}" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;" />
        </div>
        """
    
    # Logo
    logo_html = ""
    if form.get("logo_url"):
        logo_html = f'<img src="{form.get("logo_url")}" style="max-height: 60px;" />'
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{form.get('titre', 'Formulaire')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }}
            .title {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
            .meta {{ color: #666; font-size: 12px; margin-top: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            @media print {{
                body {{ margin: 10mm; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="title">{form.get('titre', 'Formulaire personnalisé')}</div>
                <div class="meta">
                    Créé le {form.get('created_at', '')[:10]} par {form.get('created_by_name', 'Inconnu')}
                </div>
            </div>
            {logo_html}
        </div>
        
        <table>
            {fields_html}
        </table>
        
        {signature_html}
        
        <div style="margin-top: 50px; text-align: center; color: #999; font-size: 10px;">
            Document généré le {datetime.now(timezone.utc).strftime('%d/%m/%Y à %H:%M')}
        </div>
    </body>
    </html>
    """
    
    return html
