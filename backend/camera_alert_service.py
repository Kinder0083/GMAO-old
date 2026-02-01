"""
Service d'alertes pour les caméras
Vérifie périodiquement l'état des caméras et envoie des alertes par email
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from bson import ObjectId
import email_service

logger = logging.getLogger(__name__)

# Variable globale pour la base de données
db = None

def set_database(database):
    """Injecte la connexion à la base de données"""
    global db
    db = database


async def check_camera_and_send_alerts():
    """
    Vérifie l'état de toutes les caméras avec alertes activées
    et envoie des emails si une caméra est hors ligne depuis trop longtemps
    """
    if not db:
        logger.warning("Base de données non initialisée pour les alertes caméras")
        return
    
    try:
        # Récupérer toutes les caméras avec alertes activées
        async for camera in db.cameras.find({"alert_enabled": True}):
            camera_id = str(camera["_id"])
            camera_name = camera.get("name", "Caméra inconnue")
            alert_email = camera.get("alert_email")
            alert_delay = camera.get("alert_delay_minutes", 5)
            is_online = camera.get("is_online", False)
            offline_since = camera.get("offline_since")
            last_alert_sent = camera.get("last_alert_sent")
            
            if not alert_email:
                continue
            
            now = datetime.now(timezone.utc)
            
            if not is_online:
                # La caméra est hors ligne
                if not offline_since:
                    # Marquer le début de l'indisponibilité
                    await db.cameras.update_one(
                        {"_id": ObjectId(camera_id)},
                        {"$set": {"offline_since": now.isoformat()}}
                    )
                    logger.info(f"Caméra {camera_name} détectée hors ligne")
                else:
                    # Calculer depuis combien de temps la caméra est hors ligne
                    offline_start = datetime.fromisoformat(offline_since.replace('Z', '+00:00'))
                    offline_duration = (now - offline_start).total_seconds() / 60  # en minutes
                    
                    # Vérifier si on doit envoyer une alerte
                    should_send_alert = offline_duration >= alert_delay
                    
                    # Ne pas renvoyer d'alerte si déjà envoyée dans les dernières 30 minutes
                    if last_alert_sent:
                        last_alert_time = datetime.fromisoformat(last_alert_sent.replace('Z', '+00:00'))
                        time_since_last_alert = (now - last_alert_time).total_seconds() / 60
                        if time_since_last_alert < 30:
                            should_send_alert = False
                    
                    if should_send_alert:
                        # Envoyer l'alerte
                        success = await send_camera_offline_alert(
                            camera_id=camera_id,
                            camera_name=camera_name,
                            location=camera.get("location", "Non spécifié"),
                            recipient_email=alert_email,
                            offline_duration_minutes=int(offline_duration)
                        )
                        
                        if success:
                            # Mettre à jour la date de dernière alerte
                            await db.cameras.update_one(
                                {"_id": ObjectId(camera_id)},
                                {"$set": {"last_alert_sent": now.isoformat()}}
                            )
                            
                            # Créer une entrée dans l'historique des alertes
                            await db.camera_alerts.insert_one({
                                "camera_id": ObjectId(camera_id),
                                "camera_name": camera_name,
                                "alert_type": "offline",
                                "message": f"Caméra hors ligne depuis {int(offline_duration)} minutes",
                                "email_sent_to": alert_email,
                                "offline_duration_minutes": int(offline_duration),
                                "created_at": now.isoformat(),
                                "is_resolved": False
                            })
                            
                            logger.info(f"Alerte envoyée pour caméra {camera_name} à {alert_email}")
            else:
                # La caméra est en ligne
                if offline_since:
                    # La caméra était hors ligne et est revenue
                    offline_start = datetime.fromisoformat(offline_since.replace('Z', '+00:00'))
                    offline_duration = (now - offline_start).total_seconds() / 60
                    
                    # Résoudre les alertes actives pour cette caméra
                    await db.camera_alerts.update_many(
                        {"camera_id": ObjectId(camera_id), "is_resolved": False},
                        {"$set": {
                            "is_resolved": True,
                            "resolved_at": now.isoformat()
                        }}
                    )
                    
                    # Réinitialiser offline_since
                    await db.cameras.update_one(
                        {"_id": ObjectId(camera_id)},
                        {"$set": {"offline_since": None}}
                    )
                    
                    # Envoyer une notification de retour en ligne si était hors ligne > delay
                    if offline_duration >= alert_delay and alert_email:
                        await send_camera_back_online_alert(
                            camera_name=camera_name,
                            location=camera.get("location", "Non spécifié"),
                            recipient_email=alert_email,
                            offline_duration_minutes=int(offline_duration)
                        )
                    
                    logger.info(f"Caméra {camera_name} de retour en ligne après {int(offline_duration)} min")
                    
    except Exception as e:
        logger.error(f"Erreur vérification alertes caméras: {e}")


async def send_camera_offline_alert(
    camera_id: str,
    camera_name: str,
    location: str,
    recipient_email: str,
    offline_duration_minutes: int
) -> bool:
    """Envoie un email d'alerte pour une caméra hors ligne"""
    try:
        subject = f"🔴 ALERTE CAMÉRA - {camera_name} hors ligne"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">⚠️ Alerte Caméra</h1>
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #dc2626; margin-top: 0;">Caméra hors ligne détectée</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Caméra :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{camera_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Emplacement :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{location}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Durée hors ligne :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #dc2626; font-weight: bold;">{offline_duration_minutes} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date/Heure :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</td>
                        </tr>
                    </table>
                    
                    <p style="color: #666; margin-top: 20px;">
                        Cette alerte a été générée automatiquement par le système de surveillance GMAO Iris.
                        Veuillez vérifier l'état de la caméra et sa connexion réseau.
                    </p>
                </div>
                <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    GMAO Iris - Système de Gestion de Maintenance
                </div>
            </div>
        </body>
        </html>
        """
        
        success = email_service.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content
        )
        
        return success
        
    except Exception as e:
        logger.error(f"Erreur envoi alerte caméra offline: {e}")
        return False


async def send_camera_back_online_alert(
    camera_name: str,
    location: str,
    recipient_email: str,
    offline_duration_minutes: int
) -> bool:
    """Envoie un email de notification quand une caméra revient en ligne"""
    try:
        subject = f"🟢 CAMÉRA RÉTABLIE - {camera_name} de retour en ligne"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background-color: #16a34a; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">✅ Caméra Rétablie</h1>
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #16a34a; margin-top: 0;">Connexion rétablie</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Caméra :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{camera_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Emplacement :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{location}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Durée d'indisponibilité :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">{offline_duration_minutes} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Retour en ligne :</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #16a34a; font-weight: bold;">{datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</td>
                        </tr>
                    </table>
                    
                    <p style="color: #666; margin-top: 20px;">
                        La caméra fonctionne à nouveau normalement.
                    </p>
                </div>
                <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    GMAO Iris - Système de Gestion de Maintenance
                </div>
            </div>
        </body>
        </html>
        """
        
        success = email_service.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content
        )
        
        return success
        
    except Exception as e:
        logger.error(f"Erreur envoi notification caméra online: {e}")
        return False


async def start_camera_alert_scheduler(interval_seconds: int = 60):
    """
    Démarre le scheduler qui vérifie périodiquement l'état des caméras
    """
    logger.info(f"Démarrage du scheduler d'alertes caméras (intervalle: {interval_seconds}s)")
    
    while True:
        try:
            await check_camera_and_send_alerts()
        except Exception as e:
            logger.error(f"Erreur dans le scheduler d'alertes caméras: {e}")
        
        await asyncio.sleep(interval_seconds)
