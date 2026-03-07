"""
Service de nettoyage automatique des messages de chat
S'exécute en arrière-plan et nettoie les messages selon la rétention configurée
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

class ChatCleanupService:
    def __init__(self, database):
        self.db = database
        self.is_running = False
        self.cleanup_task = None
        # Configuration avec valeurs par défaut
        self.retention_days = int(os.getenv('CHAT_RETENTION_DAYS', '60'))
        logger.info(f"📅 Configuration: Rétention des messages = {self.retention_days} jours")
        
    async def cleanup_old_messages(self):
        """Supprimer les messages et fichiers selon la rétention configurée"""
        start_time = datetime.now(timezone.utc)
        
        try:
            # Calculer la date limite
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)
            
            logger.info(f"🧹 Début du nettoyage des messages avant {cutoff_date.isoformat()}")
            logger.info(f"   Rétention configurée: {self.retention_days} jours")
            
            # Récupérer les messages à supprimer
            old_messages = await self.db.chat_messages.find(
                {"timestamp": {"$lt": cutoff_date.isoformat()}},
                {"_id": 0}
            ).to_list(length=None)
            
            deleted_messages_count = 0
            deleted_files_count = 0
            failed_files = []
            
            for message in old_messages:
                # Supprimer les fichiers attachés
                for attachment in message.get("attachments", []):
                    file_path = attachment.get("file_path")
                    if file_path and os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            deleted_files_count += 1
                            logger.info(f"  📎 Fichier supprimé: {os.path.basename(file_path)}")
                        except Exception as e:
                            logger.error(f"  ❌ Erreur suppression fichier {file_path}: {e}")
                            failed_files.append(file_path)
                
                # Supprimer le message
                await self.db.chat_messages.delete_one({"id": message.get("id")})
                deleted_messages_count += 1
            
            # Calculer la durée
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            if deleted_messages_count > 0:
                logger.info(f"✅ Nettoyage terminé en {duration:.2f}s:")
                logger.info(f"   - {deleted_messages_count} messages supprimés")
                logger.info(f"   - {deleted_files_count} fichiers supprimés")
                if failed_files:
                    logger.warning(f"   - {len(failed_files)} fichiers ont échoué")
            else:
                logger.info("✅ Aucun message à nettoyer")
            
            # Sauvegarder l'historique du nettoyage
            cleanup_record = {
                "date": start_time.isoformat(),
                "type": "chat_messages",
                "retention_days": self.retention_days,
                "cutoff_date": cutoff_date.isoformat(),
                "deleted_messages": deleted_messages_count,
                "deleted_files": deleted_files_count,
                "failed_files": len(failed_files),
                "duration_seconds": duration,
                "success": True
            }
            
            await self.db.cleanup_history.insert_one(cleanup_record)
            
            return {
                "success": True,
                "deleted_messages": deleted_messages_count,
                "deleted_files": deleted_files_count,
                "failed_files": len(failed_files),
                "duration": duration
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")
            
            # Sauvegarder l'échec dans l'historique
            await self.db.cleanup_history.insert_one({
                "date": start_time.isoformat(),
                "type": "chat_messages",
                "retention_days": self.retention_days,
                "success": False,
                "error": str(e)
            })
            
            return {
                "success": False,
                "error": str(e)
            }
    
    async def run_periodic_cleanup(self):
        """Exécuter le nettoyage périodiquement (tous les jours à 2h00)"""
        logger.info("🚀 Service de nettoyage automatique du chat démarré")
        
        while self.is_running:
            try:
                # Calculer le temps jusqu'à la prochaine exécution (2h00 du matin)
                now = datetime.now(timezone.utc)
                next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
                
                # Si on a dépassé 2h00 aujourd'hui, planifier pour demain
                if now >= next_run:
                    next_run += timedelta(days=1)
                
                wait_seconds = (next_run - now).total_seconds()
                
                logger.info(f"⏰ Prochain nettoyage prévu à {next_run.isoformat()} (dans {wait_seconds/3600:.1f}h)")
                
                # Attendre jusqu'à la prochaine exécution
                await asyncio.sleep(wait_seconds)
                
                # Exécuter le nettoyage
                if self.is_running:
                    await self.cleanup_old_messages()
                
            except asyncio.CancelledError:
                logger.info("🛑 Service de nettoyage arrêté")
                break
            except Exception as e:
                logger.error(f"❌ Erreur dans le service de nettoyage: {e}")
                # Attendre 1 heure avant de réessayer en cas d'erreur
                await asyncio.sleep(3600)
    
    async def start(self):
        """Démarrer le service de nettoyage en arrière-plan"""
        if not self.is_running:
            self.is_running = True
            self.cleanup_task = asyncio.create_task(self.run_periodic_cleanup())
            logger.info("✅ Service de nettoyage du chat activé")
    
    async def stop(self):
        """Arrêter le service de nettoyage"""
        self.is_running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        logger.info("🛑 Service de nettoyage du chat désactivé")
    
    async def cleanup_now(self):
        """Déclencher un nettoyage immédiat (pour les tests)"""
        logger.info("🧪 Nettoyage manuel déclenché")
        return await self.cleanup_old_messages()


# Instance globale (sera initialisée depuis server.py)
chat_cleanup_service = None

def init_chat_cleanup_service(database):
    """Initialiser le service de nettoyage avec la base de données"""
    global chat_cleanup_service
    chat_cleanup_service = ChatCleanupService(database)
    return chat_cleanup_service
