#!/usr/bin/env python3
"""
Script de nettoyage automatique des messages de chat de plus de 60 jours
À exécuter via cron job quotidien
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Connexion MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DATABASE_NAME = 'gmao_iris'
CHAT_UPLOADS_DIR = "/opt/gmao-iris/backend/uploads/chat/"

async def cleanup_old_messages():
    """Supprimer les messages et fichiers de plus de 60 jours"""
    try:
        # Connexion à MongoDB
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DATABASE_NAME]
        
        # Calculer la date limite (60 jours en arrière)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        
        logger.info(f"🧹 Début du nettoyage des messages avant {cutoff_date}")
        
        # Récupérer les messages à supprimer
        old_messages = await db.chat_messages.find({"timestamp": {"$lt": cutoff_date}}).to_list(length=None)
        
        deleted_messages_count = 0
        deleted_files_count = 0
        
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
            
            # Supprimer le message
            await db.chat_messages.delete_one({"id": message.get("id")})
            deleted_messages_count += 1
        
        logger.info(f"✅ Nettoyage terminé:")
        logger.info(f"   - {deleted_messages_count} messages supprimés")
        logger.info(f"   - {deleted_files_count} fichiers supprimés")
        
        # Fermer la connexion
        client.close()
        
        return {
            "success": True,
            "deleted_messages": deleted_messages_count,
            "deleted_files": deleted_files_count
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du nettoyage: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = asyncio.run(cleanup_old_messages())
    
    if result["success"]:
        sys.exit(0)
    else:
        sys.exit(1)
