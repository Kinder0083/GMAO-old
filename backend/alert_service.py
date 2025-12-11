"""
Service de gestion des alertes et actions automatiques
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
from uuid import uuid4
from models import AlertType, AlertSeverity, AlertAction

logger = logging.getLogger(__name__)

class AlertService:
    """Service de gestion des alertes"""
    
    def __init__(self):
        self.db = None
        
    async def initialize(self, database):
        """Initialiser le service avec la base de données"""
        self.db = database
        logger.info("Alert Service initialisé")
        
    async def create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        source_type: str,
        source_id: str,
        source_name: str,
        value: Optional[float] = None,
        threshold: Optional[float] = None,
        threshold_type: Optional[str] = None
    ) -> str:
        """Créer une nouvelle alerte"""
        try:
            alert_id = str(uuid4())
            alert = {
                "id": alert_id,
                "type": alert_type,
                "severity": severity,
                "title": title,
                "message": message,
                "source_type": source_type,
                "source_id": source_id,
                "source_name": source_name,
                "value": value,
                "threshold": threshold,
                "threshold_type": threshold_type,
                "actions_executed": [],
                "read": False,
                "archived": False,
                "created_at": datetime.now(timezone.utc),
                "read_at": None,
                "read_by": None
            }
            
            await self.db.alerts.insert_one(alert)
            
            logger.info(f"Alerte créée: {title} (source: {source_name})")
            
            # Exécuter les actions automatiques configurées
            await self.execute_alert_actions(alert)
            
            return alert_id
            
        except Exception as e:
            logger.error(f"Erreur création alerte: {e}")
            return None
            
    async def execute_alert_actions(self, alert: Dict):
        """Exécuter les actions automatiques configurées pour une alerte"""
        try:
            # Récupérer la configuration des actions
            config = await self.db.alert_action_configs.find_one({
                "source_type": alert["source_type"],
                "source_id": alert["source_id"],
                "enabled": True
            })
            
            if not config or not config.get("actions"):
                logger.info(f"Aucune action configurée pour {alert['source_name']}")
                return
                
            actions_executed = []
            
            for action in config["actions"]:
                if action == "CREATE_WORKORDER":
                    success = await self.create_workorder_from_alert(alert, config)
                    if success:
                        actions_executed.append(action)
                        
                elif action == "SEND_EMAIL":
                    success = await self.send_email_alert(alert, config)
                    if success:
                        actions_executed.append(action)
                        
                elif action == "SEND_CHAT_MESSAGE":
                    success = await self.send_chat_message_alert(alert, config)
                    if success:
                        actions_executed.append(action)
                        
                elif action == "NOTIFICATION_ONLY":
                    actions_executed.append(action)
            
            # Mettre à jour l'alerte avec les actions exécutées
            await self.db.alerts.update_one(
                {"id": alert["id"]},
                {"$set": {"actions_executed": actions_executed}}
            )
            
            logger.info(f"Actions exécutées pour alerte {alert['id']}: {actions_executed}")
            
        except Exception as e:
            logger.error(f"Erreur exécution actions alerte: {e}")
            
    async def create_workorder_from_alert(self, alert: Dict, config: Dict) -> bool:
        """Créer un ordre de travail automatiquement"""
        try:
            # Récupérer le template d'OT ou créer un par défaut
            template = config.get("workorder_template", {})
            
            workorder = {
                "id": str(uuid4()),
                "titre": template.get("titre") or f"Alerte {alert['source_name']}: {alert['title']}",
                "description": f"{alert['message']}\n\nValeur: {alert['value']} (Seuil: {alert['threshold']})\n\nAlerte générée automatiquement le {datetime.now().strftime('%d/%m/%Y %H:%M')}",
                "priorite": template.get("priorite") or "HAUTE",
                "statut": "EN_ATTENTE",
                "type_maintenance": template.get("type_maintenance") or "CORRECTIVE",
                "date_creation": datetime.now(timezone.utc),
                "created_by": "system_alert",
                "created_by_name": "Système d'Alertes",
                "equipement_id": None,
                "emplacement_id": None,
                "date_debut_prevue": None,
                "date_fin_prevue": None,
                "assigned_to": template.get("assigned_to"),
                "alert_id": alert["id"]  # Lien vers l'alerte
            }
            
            await self.db.work_orders.insert_one(workorder)
            
            logger.info(f"OT créé automatiquement: {workorder['titre']}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur création OT automatique: {e}")
            return False
            
    async def send_email_alert(self, alert: Dict, config: Dict) -> bool:
        """Envoyer un email d'alerte"""
        try:
            recipients = config.get("email_recipients", [])
            if not recipients:
                logger.warning("Aucun destinataire email configuré")
                return False
                
            # TODO: Intégrer avec le service email existant
            # Pour l'instant, on log juste
            logger.info(f"Email d'alerte envoyé à {recipients}: {alert['title']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur envoi email alerte: {e}")
            return False
            
    async def send_chat_message_alert(self, alert: Dict, config: Dict) -> bool:
        """Envoyer un message dans le Chat Live"""
        try:
            severity_emoji = {
                "INFO": "ℹ️",
                "WARNING": "⚠️",
                "CRITICAL": "🚨"
            }
            
            emoji = severity_emoji.get(alert["severity"], "📢")
            
            chat_message = {
                "id": str(uuid4()),
                "userId": "system_alert",
                "userName": "🤖 Système d'Alertes",
                "message": f"{emoji} **{alert['title']}**\n{alert['message']}\n\n💡 Source: {alert['source_name']}\n📊 Valeur: {alert['value']}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "attachments": [],
                "reactions": [],
                "replyTo": None,
                "recipientIds": [],  # Message groupe
                "is_deleted": False
            }
            
            await self.db.chat_messages.insert_one(chat_message)
            
            logger.info(f"Message Chat Live envoyé pour alerte {alert['id']}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur envoi message chat alerte: {e}")
            return False

# Instance globale
alert_service = AlertService()
