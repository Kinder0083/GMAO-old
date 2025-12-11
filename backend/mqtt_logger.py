"""
Service de logging des messages MQTT pour débogage et monitoring
"""
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class MQTTLogger:
    def __init__(self, database):
        self.db = database
        self.max_logs = 10000  # Limite de logs conservés
        
    async def log_message(
        self,
        topic: str,
        payload: str,
        sensor_id: Optional[str] = None,
        sensor_name: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Enregistrer un message MQTT reçu"""
        try:
            log_entry = {
                "timestamp": datetime.now(timezone.utc),
                "topic": topic,
                "payload": payload,
                "sensor_id": sensor_id,
                "sensor_name": sensor_name,
                "success": success,
                "error_message": error_message
            }
            
            await self.db.mqtt_logs.insert_one(log_entry)
            
            # Nettoyer les vieux logs si limite atteinte
            count = await self.db.mqtt_logs.count_documents({})
            if count > self.max_logs:
                # Supprimer les plus anciens
                to_delete = count - self.max_logs
                oldest_logs = await self.db.mqtt_logs.find().sort("timestamp", 1).limit(to_delete).to_list(length=to_delete)
                
                for log in oldest_logs:
                    await self.db.mqtt_logs.delete_one({"_id": log["_id"]})
                    
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement du log MQTT: {e}")
    
    async def get_logs(
        self,
        topic: Optional[str] = None,
        sensor_id: Optional[str] = None,
        success_only: Optional[bool] = None,
        limit: int = 100,
        hours: int = 24
    ):
        """Récupérer les logs MQTT avec filtres"""
        try:
            # Construire la requête
            query = {}
            
            # Filtre par période
            start_time = datetime.now(timezone.utc).timestamp() - (hours * 3600)
            query["timestamp"] = {"$gte": datetime.fromtimestamp(start_time, tz=timezone.utc)}
            
            # Filtre par topic
            if topic:
                query["topic"] = {"$regex": topic, "$options": "i"}
            
            # Filtre par sensor_id
            if sensor_id:
                query["sensor_id"] = sensor_id
            
            # Filtre par succès
            if success_only is not None:
                query["success"] = success_only
            
            # Récupérer les logs
            logs = await self.db.mqtt_logs.find(
                query,
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            return logs
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des logs MQTT: {e}")
            return []
    
    async def get_stats(self, hours: int = 24):
        """Obtenir des statistiques sur les logs MQTT"""
        try:
            start_time = datetime.now(timezone.utc).timestamp() - (hours * 3600)
            start_date = datetime.fromtimestamp(start_time, tz=timezone.utc)
            
            # Total de messages
            total = await self.db.mqtt_logs.count_documents({
                "timestamp": {"$gte": start_date}
            })
            
            # Messages réussis
            success_count = await self.db.mqtt_logs.count_documents({
                "timestamp": {"$gte": start_date},
                "success": True
            })
            
            # Messages en erreur
            error_count = await self.db.mqtt_logs.count_documents({
                "timestamp": {"$gte": start_date},
                "success": False
            })
            
            # Topics uniques
            topics_pipeline = [
                {"$match": {"timestamp": {"$gte": start_date}}},
                {"$group": {"_id": "$topic"}},
                {"$count": "total"}
            ]
            topics_result = await self.db.mqtt_logs.aggregate(topics_pipeline).to_list(length=1)
            unique_topics = topics_result[0]["total"] if topics_result else 0
            
            # Capteurs actifs
            sensors_pipeline = [
                {"$match": {
                    "timestamp": {"$gte": start_date},
                    "sensor_id": {"$ne": None}
                }},
                {"$group": {"_id": "$sensor_id"}},
                {"$count": "total"}
            ]
            sensors_result = await self.db.mqtt_logs.aggregate(sensors_pipeline).to_list(length=1)
            active_sensors = sensors_result[0]["total"] if sensors_result else 0
            
            return {
                "total_messages": total,
                "success_count": success_count,
                "error_count": error_count,
                "success_rate": round((success_count / total * 100) if total > 0 else 0, 2),
                "unique_topics": unique_topics,
                "active_sensors": active_sensors,
                "period_hours": hours
            }
            
        except Exception as e:
            logger.error(f"Erreur lors du calcul des stats MQTT: {e}")
            return {
                "total_messages": 0,
                "success_count": 0,
                "error_count": 0,
                "success_rate": 0,
                "unique_topics": 0,
                "active_sensors": 0,
                "period_hours": hours
            }
    
    async def clear_logs(self, hours: Optional[int] = None):
        """Supprimer les logs (tous ou par période)"""
        try:
            if hours:
                start_time = datetime.now(timezone.utc).timestamp() - (hours * 3600)
                start_date = datetime.fromtimestamp(start_time, tz=timezone.utc)
                result = await self.db.mqtt_logs.delete_many({
                    "timestamp": {"$lt": start_date}
                })
            else:
                result = await self.db.mqtt_logs.delete_many({})
            
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression des logs MQTT: {e}")
            return 0


# Instance globale (sera initialisée depuis server.py)
mqtt_logger = None

def init_mqtt_logger(database):
    """Initialiser le logger MQTT"""
    global mqtt_logger
    mqtt_logger = MQTTLogger(database)
    return mqtt_logger
