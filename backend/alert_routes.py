"""
Routes API pour les alertes et notifications
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import Alert, AlertCreate, AlertActionConfig
from dependencies import get_current_user, get_current_admin_user
from datetime import datetime, timezone
import logging
from uuid import uuid4

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Variables globales
db = None

def init_alert_routes(database):
    """Initialize alert routes with database"""
    global db
    db = database

# =======================
# Alerts CRUD
# =======================

@router.get("", response_model=List[Alert])
async def get_alerts(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les alertes"""
    try:
        query = {"archived": False}
        if unread_only:
            query["read"] = False
        
        alerts = []
        async for alert in db.alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit):
            alerts.append(Alert(**alert))
        
        return alerts
        
    except Exception as e:
        logger.error(f"Erreur récupération alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Obtenir le nombre d'alertes non lues"""
    try:
        count = await db.alerts.count_documents({"read": False, "archived": False})
        return {"count": count}
        
    except Exception as e:
        logger.error(f"Erreur comptage alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marquer une alerte comme lue"""
    try:
        await db.alerts.update_one(
            {"id": alert_id},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc),
                    "read_by": current_user["id"]
                }
            }
        )
        
        return {"message": "Alerte marquée comme lue"}
        
    except Exception as e:
        logger.error(f"Erreur marquage alerte: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_user)
):
    """Marquer toutes les alertes comme lues"""
    try:
        result = await db.alerts.update_many(
            {"read": False, "archived": False},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.now(timezone.utc),
                    "read_by": current_user["id"]
                }
            }
        )
        
        return {"message": f"{result.modified_count} alertes marquées comme lues"}
        
    except Exception as e:
        logger.error(f"Erreur marquage toutes alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Archiver une alerte (admin seulement)"""
    try:
        await db.alerts.update_one(
            {"id": alert_id},
            {"$set": {"archived": True}}
        )
        
        return {"message": "Alerte archivée"}
        
    except Exception as e:
        logger.error(f"Erreur archivage alerte: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def clear_all_alerts(
    current_user: dict = Depends(get_current_admin_user)
):
    """Archiver toutes les alertes (admin seulement)"""
    try:
        result = await db.alerts.update_many(
            {"archived": False},
            {"$set": {"archived": True}}
        )
        
        return {"message": f"{result.modified_count} alertes archivées"}
        
    except Exception as e:
        logger.error(f"Erreur archivage toutes alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =======================
# Alert Action Configuration
# =======================

@router.get("/config/{source_type}/{source_id}")
async def get_alert_config(
    source_type: str,
    source_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer la configuration des actions pour un capteur/compteur"""
    try:
        config = await db.alert_action_configs.find_one(
            {"source_type": source_type, "source_id": source_id},
            {"_id": 0}
        )
        
        if not config:
            # Configuration par défaut
            return {
                "source_type": source_type,
                "source_id": source_id,
                "enabled": False,
                "actions": [],
                "email_recipients": [],
                "workorder_template": None
            }
        
        return config
        
    except Exception as e:
        logger.error(f"Erreur récupération config alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config")
async def save_alert_config(
    config: AlertActionConfig,
    current_user: dict = Depends(get_current_admin_user)
):
    """Sauvegarder la configuration des actions automatiques"""
    try:
        config_dict = config.model_dump()
        
        await db.alert_action_configs.update_one(
            {"source_type": config.source_type, "source_id": config.source_id},
            {"$set": config_dict},
            upsert=True
        )
        
        return {"message": "Configuration sauvegardée"}
        
    except Exception as e:
        logger.error(f"Erreur sauvegarde config alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
