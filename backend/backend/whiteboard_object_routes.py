"""
Routes API pour la gestion granulaire des objets du Tableau d'affichage
Architecture centralisée avec base de données comme source unique de vérité
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import logging

from dependencies import get_database, get_current_user
from whiteboard_manager import whiteboard_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whiteboard", tags=["Whiteboard Objects"])

# Modèles Pydantic
class WhiteboardObjectCreate(BaseModel):
    board_id: str  # "board_1" ou "board_2"
    object_data: dict  # Données Fabric.js en POURCENTAGES (normalisées)

class WhiteboardObjectUpdate(BaseModel):
    object_data: dict  # Données Fabric.js en POURCENTAGES (normalisées)

# ==================== CRUD Objets Individuels ====================

@router.post("/objects")
async def create_object(data: WhiteboardObjectCreate, user: dict = Depends(get_current_user), db=Depends(get_database)):
    """
    Crée un nouvel objet sur le tableau
    Les coordonnées doivent être en POURCENTAGES (0-1)
    """
    if data.board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    object_id = f"obj_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Créer le document objet
    obj_doc = {
        "id": object_id,
        "board_id": data.board_id,
        "object_data": data.object_data,  # Stocké en pourcentages
        "created_by": user["id"],
        "created_by_name": f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email", "Inconnu"),
        "created_at": now,
        "modified_at": now,
        "is_deleted": False
    }
    
    # Insérer dans la base de données
    await db.whiteboard_objects.insert_one(obj_doc)
    
    logger.info(f"[OBJET CRÉÉ] {object_id} sur {data.board_id} par {obj_doc['created_by_name']}")
    
    # Diffuser via WebSocket aux autres utilisateurs
    await whiteboard_manager.broadcast_to_board(data.board_id, {
        "type": "object_added",
        "object_id": object_id,
        "object_data": data.object_data,
        "user_id": user["id"],
        "user_name": obj_doc['created_by_name'],
        "timestamp": now
    }, exclude_user=user["id"])
    
    return {
        "success": True,
        "object_id": object_id,
        "board_id": data.board_id
    }

@router.get("/objects/{board_id}")
async def get_board_objects(board_id: str, db=Depends(get_database)):
    """
    Récupère tous les objets d'un tableau
    Retourne les coordonnées en POURCENTAGES (0-1)
    """
    if board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    objects = await db.whiteboard_objects.find(
        {"board_id": board_id, "is_deleted": False},
        {"_id": 0}
    ).to_list(10000)
    
    logger.info(f"[OBJETS RÉCUPÉRÉS] {len(objects)} objets pour {board_id}")
    
    return {
        "board_id": board_id,
        "objects": objects,
        "count": len(objects)
    }

@router.put("/objects/{object_id}")
async def update_object(object_id: str, data: WhiteboardObjectUpdate, user: dict = Depends(get_current_user), db=Depends(get_database)):
    """
    Modifie un objet existant
    Les coordonnées doivent être en POURCENTAGES (0-1)
    """
    # Vérifier que l'objet existe
    existing = await db.whiteboard_objects.find_one({"id": object_id, "is_deleted": False})
    if not existing:
        raise HTTPException(status_code=404, detail="Objet non trouvé")
    
    board_id = existing["board_id"]
    now = datetime.now(timezone.utc).isoformat()
    user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email", "Inconnu")
    
    # Mettre à jour l'objet
    await db.whiteboard_objects.update_one(
        {"id": object_id},
        {"$set": {
            "object_data": data.object_data,
            "modified_by": user["id"],
            "modified_by_name": user_name,
            "modified_at": now
        }}
    )
    
    logger.info(f"[OBJET MODIFIÉ] {object_id} sur {board_id} par {user_name}")
    
    # Diffuser via WebSocket
    await whiteboard_manager.broadcast_to_board(board_id, {
        "type": "object_modified",
        "object_id": object_id,
        "object_data": data.object_data,
        "user_id": user["id"],
        "user_name": user_name,
        "timestamp": now
    }, exclude_user=user["id"])
    
    return {
        "success": True,
        "object_id": object_id,
        "board_id": board_id
    }

@router.delete("/objects/{object_id}")
async def delete_object(object_id: str, user: dict = Depends(get_current_user), db=Depends(get_database)):
    """
    Supprime un objet (soft delete)
    """
    # Vérifier que l'objet existe
    existing = await db.whiteboard_objects.find_one({"id": object_id, "is_deleted": False})
    if not existing:
        raise HTTPException(status_code=404, detail="Objet non trouvé")
    
    board_id = existing["board_id"]
    now = datetime.now(timezone.utc).isoformat()
    user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email", "Inconnu")
    
    # Soft delete
    await db.whiteboard_objects.update_one(
        {"id": object_id},
        {"$set": {
            "is_deleted": True,
            "deleted_by": user["id"],
            "deleted_by_name": user_name,
            "deleted_at": now
        }}
    )
    
    logger.info(f"[OBJET SUPPRIMÉ] {object_id} sur {board_id} par {user_name}")
    
    # Diffuser via WebSocket
    await whiteboard_manager.broadcast_to_board(board_id, {
        "type": "object_removed",
        "object_id": object_id,
        "user_id": user["id"],
        "user_name": user_name,
        "timestamp": now
    }, exclude_user=user["id"])
    
    return {
        "success": True,
        "object_id": object_id,
        "board_id": board_id,
        "deleted": True
    }

@router.delete("/boards/{board_id}/clear")
async def clear_board(board_id: str, user: dict = Depends(get_current_user), db=Depends(get_database)):
    """
    Efface tous les objets d'un tableau
    """
    if board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    now = datetime.now(timezone.utc).isoformat()
    user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email", "Inconnu")
    
    # Soft delete de tous les objets
    result = await db.whiteboard_objects.update_many(
        {"board_id": board_id, "is_deleted": False},
        {"$set": {
            "is_deleted": True,
            "deleted_by": user["id"],
            "deleted_by_name": user_name,
            "deleted_at": now
        }}
    )
    
    logger.info(f"[TABLEAU EFFACÉ] {board_id} - {result.modified_count} objets supprimés par {user_name}")
    
    # Diffuser via WebSocket
    await whiteboard_manager.broadcast_to_board(board_id, {
        "type": "board_cleared",
        "user_id": user["id"],
        "user_name": user_name,
        "timestamp": now
    }, exclude_user=user["id"])
    
    return {
        "success": True,
        "board_id": board_id,
        "deleted_count": result.modified_count
    }
