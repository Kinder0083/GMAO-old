"""
Routes pour la gestion des modèles d'ordres de travail (Ordres Type)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from dependencies import get_current_user, db
from models import MessageResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/work-order-templates", tags=["work-order-templates"])


# ============ MODÈLES PYDANTIC ============

class WorkOrderTemplateBase(BaseModel):
    """Modèle de base pour un ordre de travail type"""
    nom: str = Field(..., min_length=1, max_length=200, description="Nom du modèle")
    description: Optional[str] = Field(None, description="Description détaillée")
    categorie: str = Field(..., description="Catégorie de l'ordre (TRAVAUX_CURATIF, etc.)")
    priorite: str = Field(default="AUCUNE", description="Priorité par défaut")
    statut_defaut: str = Field(default="OUVERT", description="Statut par défaut")
    equipement_id: Optional[str] = Field(None, description="ID de l'équipement par défaut")
    equipement_nom: Optional[str] = Field(None, description="Nom de l'équipement (pour affichage)")
    temps_estime: Optional[str] = Field(None, description="Temps estimé par défaut")


class WorkOrderTemplateCreate(WorkOrderTemplateBase):
    """Modèle pour créer un nouvel ordre type"""
    pass


class WorkOrderTemplateUpdate(BaseModel):
    """Modèle pour mettre à jour un ordre type"""
    nom: Optional[str] = None
    description: Optional[str] = None
    categorie: Optional[str] = None
    priorite: Optional[str] = None
    statut_defaut: Optional[str] = None
    equipement_id: Optional[str] = None
    equipement_nom: Optional[str] = None
    temps_estime: Optional[str] = None


class WorkOrderTemplate(WorkOrderTemplateBase):
    """Modèle complet d'un ordre type"""
    id: str
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None


# ============ HELPERS ============

async def check_template_access(current_user: dict) -> bool:
    """
    Vérifie si l'utilisateur a accès aux ordres type.
    Accès autorisé pour : ADMIN ou Responsable de service
    """
    # Admin a toujours accès
    if current_user.get("role") == "ADMIN":
        return True
    
    # Vérifier si l'utilisateur est responsable de service
    user_id = current_user.get("id")
    responsable = await db.service_responsables.find_one({"user_id": user_id})
    
    return responsable is not None


def serialize_template(doc: dict) -> dict:
    """Sérialise un document MongoDB en dictionnaire"""
    if doc is None:
        return None
    
    result = {k: v for k, v in doc.items() if k != "_id"}
    return result


# ============ ROUTES ============

@router.get("", response_model=List[WorkOrderTemplate])
async def get_all_templates(current_user: dict = Depends(get_current_user)):
    """
    Récupérer tous les ordres type
    """
    try:
        templates = await db.work_order_templates.find({}).sort("categorie", 1).to_list(length=None)
        return [serialize_template(t) for t in templates]
    except Exception as e:
        logger.error(f"Erreur récupération ordres type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-category/{category}", response_model=List[WorkOrderTemplate])
async def get_templates_by_category(category: str, current_user: dict = Depends(get_current_user)):
    """
    Récupérer les ordres type par catégorie
    """
    try:
        templates = await db.work_order_templates.find({"categorie": category}).to_list(length=None)
        return [serialize_template(t) for t in templates]
    except Exception as e:
        logger.error(f"Erreur récupération ordres type par catégorie: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{template_id}", response_model=WorkOrderTemplate)
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """
    Récupérer un ordre type par son ID
    """
    try:
        template = await db.work_order_templates.find_one({"id": template_id})
        if not template:
            raise HTTPException(status_code=404, detail="Ordre type non trouvé")
        return serialize_template(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération ordre type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=WorkOrderTemplate)
async def create_template(
    template: WorkOrderTemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Créer un nouvel ordre type (Admin ou Responsable de service uniquement)
    """
    # Vérifier les permissions
    if not await check_template_access(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Seuls les administrateurs et responsables de service peuvent créer des ordres type."
        )
    
    try:
        now = datetime.now(timezone.utc)
        
        template_dict = {
            "id": str(uuid.uuid4()),
            "nom": template.nom,
            "description": template.description,
            "categorie": template.categorie,
            "priorite": template.priorite,
            "statut_defaut": template.statut_defaut,
            "equipement_id": template.equipement_id,
            "equipement_nom": template.equipement_nom,
            "temps_estime": template.temps_estime,
            "usage_count": 0,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("id"),
            "created_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        }
        
        await db.work_order_templates.insert_one(template_dict)
        
        logger.info(f"Ordre type créé: {template.nom} par {current_user.get('email')}")
        
        return serialize_template(template_dict)
    except Exception as e:
        logger.error(f"Erreur création ordre type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{template_id}", response_model=WorkOrderTemplate)
async def update_template(
    template_id: str,
    template: WorkOrderTemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Mettre à jour un ordre type (Admin ou Responsable de service uniquement)
    """
    # Vérifier les permissions
    if not await check_template_access(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Seuls les administrateurs et responsables de service peuvent modifier des ordres type."
        )
    
    try:
        existing = await db.work_order_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Ordre type non trouvé")
        
        # Construire les mises à jour
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        for field, value in template.model_dump(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        await db.work_order_templates.update_one(
            {"id": template_id},
            {"$set": update_data}
        )
        
        updated = await db.work_order_templates.find_one({"id": template_id})
        
        logger.info(f"Ordre type mis à jour: {template_id} par {current_user.get('email')}")
        
        return serialize_template(updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour ordre type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}", response_model=MessageResponse)
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """
    Supprimer un ordre type (Admin ou Responsable de service uniquement)
    """
    # Vérifier les permissions
    if not await check_template_access(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Seuls les administrateurs et responsables de service peuvent supprimer des ordres type."
        )
    
    try:
        result = await db.work_order_templates.delete_one({"id": template_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Ordre type non trouvé")
        
        logger.info(f"Ordre type supprimé: {template_id} par {current_user.get('email')}")
        
        return {"message": "Ordre type supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression ordre type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/duplicate", response_model=WorkOrderTemplate)
async def duplicate_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """
    Dupliquer un ordre type (Admin ou Responsable de service uniquement)
    """
    # Vérifier les permissions
    if not await check_template_access(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Seuls les administrateurs et responsables de service peuvent dupliquer des ordres type."
        )
    
    try:
        original = await db.work_order_templates.find_one({"id": template_id})
        if not original:
            raise HTTPException(status_code=404, detail="Ordre type non trouvé")
        
        now = datetime.now(timezone.utc)
        
        # Créer la copie
        new_template = {
            "id": str(uuid.uuid4()),
            "nom": f"{original['nom']} (copie)",
            "description": original.get("description"),
            "categorie": original.get("categorie"),
            "priorite": original.get("priorite", "AUCUNE"),
            "statut_defaut": original.get("statut_defaut", "OUVERT"),
            "equipement_id": original.get("equipement_id"),
            "equipement_nom": original.get("equipement_nom"),
            "temps_estime": original.get("temps_estime"),
            "usage_count": 0,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("id"),
            "created_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        }
        
        await db.work_order_templates.insert_one(new_template)
        
        logger.info(f"Ordre type dupliqué: {template_id} -> {new_template['id']} par {current_user.get('email')}")
        
        return serialize_template(new_template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur duplication ordre type: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/increment-usage")
async def increment_usage_count(template_id: str, current_user: dict = Depends(get_current_user)):
    """
    Incrémenter le compteur d'utilisation d'un ordre type
    Appelé automatiquement quand un utilisateur crée un OT à partir d'un modèle
    """
    try:
        result = await db.work_order_templates.update_one(
            {"id": template_id},
            {"$inc": {"usage_count": 1}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Ordre type non trouvé")
        
        return {"message": "Compteur incrémenté"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur incrémentation compteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-access/me")
async def check_my_access(current_user: dict = Depends(get_current_user)):
    """
    Vérifie si l'utilisateur actuel a accès à la gestion des ordres type
    """
    has_access = await check_template_access(current_user)
    return {"has_access": has_access}
