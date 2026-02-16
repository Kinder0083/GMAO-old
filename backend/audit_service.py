"""Service pour gérer les logs d'audit (Journal)"""
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import AuditLogCreate, ActionType, EntityType
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class AuditService:
    """Service centralisé pour enregistrer toutes les actions dans le système"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def log_action(
        self,
        user_id: str,
        user_name: str,
        user_email: str,
        action: ActionType,
        entity_type: EntityType,
        entity_id: Optional[str] = None,
        entity_name: Optional[str] = None,
        details: Optional[str] = None,
        changes: Optional[Dict] = None
    ):
        """
        Enregistre une action dans le journal d'audit
        
        Args:
            user_id: ID de l'utilisateur effectuant l'action
            user_name: Nom complet de l'utilisateur
            user_email: Email de l'utilisateur
            action: Type d'action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
            entity_type: Type d'entité concernée
            entity_id: ID de l'entité (optionnel)
            entity_name: Nom/titre de l'entité (optionnel)
            details: Détails supplémentaires (optionnel)
            changes: Dictionnaire des changements pour les UPDATE (optionnel)
        """
        try:
            audit_log = {
                "id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc),
                "user_id": user_id,
                "user_name": user_name,
                "user_email": user_email,
                "action": action.value,
                "entity_type": entity_type.value,
                "entity_id": entity_id,
                "entity_name": entity_name,
                "details": details,
                "changes": changes
            }
            
            await self.db.audit_logs.insert_one(audit_log)
            logger.info(f"Audit log créé: {action.value} {entity_type.value} par {user_email}")
            
        except Exception as e:
            logger.error(f"Erreur lors de la création du log d'audit: {e}")
            # On ne lève pas d'exception pour ne pas bloquer l'action principale
    
    async def get_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[str] = None,
        action: Optional[ActionType] = None,
        entity_type: Optional[EntityType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ):
        """
        Récupère les logs d'audit avec filtres optionnels
        """
        try:
            query = {}
            
            if user_id:
                query["user_id"] = user_id
            if action:
                query["action"] = action.value
            if entity_type:
                query["entity_type"] = entity_type.value
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            cursor = self.db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
            logs = await cursor.to_list(length=limit)
            
            # Convertir les timestamps pour la sérialisation JSON
            for log in logs:
                self._normalize_timestamp(log)
            
            # Compter le total
            total = await self.db.audit_logs.count_documents(query)
            
            return logs, total
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des logs d'audit: {e}")
            return [], 0
    
    def _normalize_timestamp(self, log: dict):
        """Normalise le champ timestamp d'un log pour la sérialisation JSON"""
        if "timestamp" in log and log["timestamp"]:
            ts = log["timestamp"]
            if hasattr(ts, 'isoformat'):
                iso_str = ts.isoformat()
                if '+' not in iso_str and 'Z' not in iso_str:
                    log["timestamp"] = iso_str + 'Z'
                else:
                    log["timestamp"] = iso_str
            elif isinstance(ts, str):
                if '+' not in ts and not ts.endswith('Z'):
                    log["timestamp"] = ts + 'Z'

    async def get_entity_history(self, entity_type: EntityType, entity_id: str):
        """
        Récupère l'historique complet d'une entité spécifique
        """
        try:
            query = {
                "entity_type": entity_type.value,
                "entity_id": entity_id
            }
            
            cursor = self.db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1)
            logs = await cursor.to_list(length=None)
            
            for log in logs:
                self._normalize_timestamp(log)
            
            return logs
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'historique d'entité: {e}")
            return []
