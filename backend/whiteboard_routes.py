"""
Routes API pour le Tableau d'affichage (Whiteboard)
Gestion des deux tableaux collaboratifs en temps réel
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone
from uuid import uuid4
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whiteboard", tags=["Whiteboard"])

# Modèles Pydantic
class WhiteboardObject(BaseModel):
    id: str
    type: str  # path, text, rect, circle, image, sticky-note
    data: dict  # Données Fabric.js de l'objet
    created_by: str
    created_at: str
    modified_by: Optional[str] = None
    modified_at: Optional[str] = None

class WhiteboardState(BaseModel):
    board_id: str  # "board_1" ou "board_2"
    objects: List[dict]
    version: int
    last_modified: str
    last_modified_by: Optional[str] = None

class WhiteboardUpdate(BaseModel):
    board_id: str
    action: str  # "add", "modify", "remove", "clear"
    object_id: Optional[str] = None
    object_data: Optional[dict] = None
    user_id: str
    user_name: str

# Initialiser les tableaux
async def init_whiteboards(db):
    """Initialise les deux tableaux s'ils n'existent pas"""
    for board_id in ["board_1", "board_2"]:
        existing = await db.whiteboards.find_one({"board_id": board_id})
        if not existing:
            await db.whiteboards.insert_one({
                "board_id": board_id,
                "objects": [],
                "version": 0,
                "last_modified": datetime.now(timezone.utc).isoformat(),
                "last_modified_by": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Tableau {board_id} initialisé")

# Routes API
@router.get("/boards")
async def get_all_boards(db=Depends(lambda: None)):
    """Récupère l'état des deux tableaux"""
    from server import get_database
    db = get_database()
    
    await init_whiteboards(db)
    
    boards = await db.whiteboards.find({}, {"_id": 0}).to_list(2)
    return {"boards": boards}

@router.get("/board/{board_id}")
async def get_board(board_id: str):
    """Récupère l'état d'un tableau spécifique"""
    from server import get_database
    db = get_database()
    
    if board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    await init_whiteboards(db)
    
    board = await db.whiteboards.find_one({"board_id": board_id}, {"_id": 0})
    if not board:
        raise HTTPException(status_code=404, detail="Tableau non trouvé")
    
    return board

@router.post("/board/{board_id}/update")
async def update_board(board_id: str, update: WhiteboardUpdate):
    """Met à jour un tableau (ajout, modification, suppression d'objet)"""
    from server import get_database
    db = get_database()
    
    if board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    board = await db.whiteboards.find_one({"board_id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Tableau non trouvé")
    
    objects = board.get("objects", [])
    version = board.get("version", 0) + 1
    now = datetime.now(timezone.utc).isoformat()
    
    # Traiter l'action
    if update.action == "add" and update.object_data:
        # Ajouter un nouvel objet
        new_object = {
            "id": update.object_id or str(uuid4()),
            **update.object_data,
            "created_by": update.user_id,
            "created_by_name": update.user_name,
            "created_at": now
        }
        objects.append(new_object)
        
        # Journaliser
        await log_whiteboard_action(db, board_id, "add", new_object["id"], update.user_id, update.user_name)
        
    elif update.action == "modify" and update.object_id and update.object_data:
        # Modifier un objet existant
        for i, obj in enumerate(objects):
            if obj.get("id") == update.object_id:
                objects[i] = {
                    **obj,
                    **update.object_data,
                    "id": update.object_id,
                    "modified_by": update.user_id,
                    "modified_by_name": update.user_name,
                    "modified_at": now
                }
                break
        
        await log_whiteboard_action(db, board_id, "modify", update.object_id, update.user_id, update.user_name)
        
    elif update.action == "remove" and update.object_id:
        # Supprimer un objet
        objects = [obj for obj in objects if obj.get("id") != update.object_id]
        
        await log_whiteboard_action(db, board_id, "remove", update.object_id, update.user_id, update.user_name)
    
    # Mettre à jour le tableau
    await db.whiteboards.update_one(
        {"board_id": board_id},
        {"$set": {
            "objects": objects,
            "version": version,
            "last_modified": now,
            "last_modified_by": update.user_id,
            "last_modified_by_name": update.user_name
        }}
    )
    
    return {
        "success": True,
        "version": version,
        "board_id": board_id
    }

@router.post("/board/{board_id}/sync")
async def sync_board(board_id: str, data: dict):
    """Synchronise l'état complet d'un tableau (pour sauvegarde complète)"""
    from server import get_database
    db = get_database()
    
    if board_id not in ["board_1", "board_2"]:
        raise HTTPException(status_code=400, detail="ID de tableau invalide")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.whiteboards.update_one(
        {"board_id": board_id},
        {"$set": {
            "objects": data.get("objects", []),
            "version": data.get("version", 0) + 1,
            "last_modified": now,
            "last_modified_by": data.get("user_id"),
            "last_modified_by_name": data.get("user_name")
        }},
        upsert=True
    )
    
    return {"success": True, "synced_at": now}

@router.get("/history")
async def get_whiteboard_history(limit: int = 50):
    """Récupère l'historique des modifications des tableaux"""
    from server import get_database
    db = get_database()
    
    history = await db.whiteboard_history.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"history": history}

async def log_whiteboard_action(db, board_id: str, action: str, object_id: str, user_id: str, user_name: str):
    """Enregistre une action dans le journal du tableau"""
    await db.whiteboard_history.insert_one({
        "id": str(uuid4()),
        "board_id": board_id,
        "action": action,
        "object_id": object_id,
        "user_id": user_id,
        "user_name": user_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
