"""
Routes API pour les logs MQTT
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user, get_current_admin_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mqtt/logs", tags=["mqtt-logs"])

# Variables globales
db = None
mqtt_logger = None

def init_mqtt_logs_routes(database, logger_instance):
    """Initialize MQTT logs routes"""
    global db, mqtt_logger
    db = database
    mqtt_logger = logger_instance


@router.get("/")
async def get_mqtt_logs(
    topic: Optional[str] = None,
    sensor_id: Optional[str] = None,
    success_only: Optional[bool] = None,
    limit: int = 100,
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer les logs MQTT avec filtres optionnels
    """
    if not mqtt_logger:
        raise HTTPException(status_code=500, detail="Logger MQTT non initialisé")
    
    try:
        logs = await mqtt_logger.get_logs(
            topic=topic,
            sensor_id=sensor_id,
            success_only=success_only,
            limit=limit,
            hours=hours
        )
        
        # Convertir les timestamps en ISO format
        for log in logs:
            if log.get("timestamp"):
                log["timestamp"] = log["timestamp"].isoformat()
        
        return {
            "logs": logs,
            "count": len(logs),
            "filters": {
                "topic": topic,
                "sensor_id": sensor_id,
                "success_only": success_only,
                "limit": limit,
                "hours": hours
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération logs MQTT: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_mqtt_stats(
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtenir des statistiques sur les logs MQTT
    """
    if not mqtt_logger:
        raise HTTPException(status_code=500, detail="Logger MQTT non initialisé")
    
    try:
        stats = await mqtt_logger.get_stats(hours=hours)
        return stats
        
    except Exception as e:
        logger.error(f"Erreur récupération stats MQTT: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear")
async def clear_mqtt_logs(
    hours: Optional[int] = None,
    current_user: dict = Depends(get_current_admin_user)
):
    """
    Supprimer les logs MQTT (admin uniquement)
    hours: Si fourni, supprime seulement les logs plus anciens que X heures
           Si None, supprime tous les logs
    """
    if not mqtt_logger:
        raise HTTPException(status_code=500, detail="Logger MQTT non initialisé")
    
    try:
        deleted_count = await mqtt_logger.clear_logs(hours=hours)
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"{deleted_count} log(s) supprimé(s)"
        }
        
    except Exception as e:
        logger.error(f"Erreur suppression logs MQTT: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/topics")
async def get_mqtt_topics(
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtenir la liste des topics MQTT uniques
    """
    if not mqtt_logger:
        raise HTTPException(status_code=500, detail="Logger MQTT non initialisé")
    
    try:
        from datetime import datetime, timezone, timedelta
        
        start_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Agréger les topics uniques
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_time}}},
            {"$group": {
                "_id": "$topic",
                "count": {"$sum": 1},
                "last_message": {"$max": "$timestamp"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 100}
        ]
        
        results = await db.mqtt_logs.aggregate(pipeline).to_list(length=100)
        
        topics = [
            {
                "topic": r["_id"],
                "count": r["count"],
                "last_message": r["last_message"].isoformat() if r.get("last_message") else None
            }
            for r in results
        ]
        
        return {
            "topics": topics,
            "total": len(topics),
            "period_hours": hours
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération topics MQTT: {e}")
        raise HTTPException(status_code=500, detail=str(e))
