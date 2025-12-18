"""
Routes API pour la gestion MQTT
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models import MQTTConfig, MQTTPublish, MQTTSubscribe
from dependencies import get_current_user, get_current_admin_user
from mqtt_manager import mqtt_manager
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mqtt", tags=["mqtt"])

# Variables globales (seront injectées depuis server.py)
db = None

def init_mqtt_routes(database):
    """Initialize MQTT routes with database"""
    global db
    db = database

# =======================
# Configuration MQTT
# =======================

@router.get("/config")
async def get_mqtt_config(
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer la configuration MQTT (admin seulement)"""
    try:
        config = await db.mqtt_config.find_one({"id": "default"}, {"_id": 0})
        
        if not config:
            # Configuration par défaut
            return {
                "host": "",
                "port": 1883,
                "username": "",
                "use_ssl": False,
                "client_id": "gmao_iris"
            }
        
        # Ne pas renvoyer le mot de passe
        config_response = {
            "host": config.get("host", ""),
            "port": config.get("port", 1883),
            "username": config.get("username", ""),
            "use_ssl": config.get("use_ssl", False),
            "client_id": config.get("client_id", "gmao_iris"),
            "has_password": bool(config.get("password"))
        }
        
        return config_response
        
    except Exception as e:
        logger.error(f"Erreur récupération config MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération configuration MQTT")


@router.post("/config")
async def save_mqtt_config(
    config: MQTTConfig,
    current_user: dict = Depends(get_current_admin_user)
):
    """Enregistrer la configuration MQTT (admin seulement)"""
    try:
        # Sauvegarder dans la base de données
        config_dict = {
            "id": "default",
            "host": config.host,
            "port": config.port,
            "username": config.username,
            "password": config.password,
            "use_ssl": config.use_ssl,
            "client_id": config.client_id,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("id")
        }
        
        await db.mqtt_config.update_one(
            {"id": "default"},
            {"$set": config_dict},
            upsert=True
        )
        
        # Configurer le gestionnaire MQTT
        mqtt_manager.configure(
            host=config.host,
            port=config.port,
            username=config.username,
            password=config.password,
            use_ssl=config.use_ssl,
            client_id=config.client_id
        )
        
        logger.info(f"Configuration MQTT mise à jour par {current_user.get('email')}")
        
        return {"success": True, "message": "Configuration MQTT enregistrée"}
        
    except Exception as e:
        logger.error(f"Erreur sauvegarde config MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur sauvegarde configuration MQTT")


@router.post("/connect")
async def connect_mqtt(
    current_user: dict = Depends(get_current_admin_user)
):
    """Se connecter au broker MQTT (admin seulement)"""
    try:
        # Charger la configuration depuis la base
        config = await db.mqtt_config.find_one({"id": "default"})
        
        if not config or not config.get("host"):
            raise HTTPException(status_code=400, detail="Configuration MQTT manquante")
        
        # Configurer le manager
        mqtt_manager.configure(
            host=config["host"],
            port=config.get("port", 1883),
            username=config.get("username"),
            password=config.get("password"),
            use_ssl=config.get("use_ssl", False),
            client_id=config.get("client_id", "gmao_iris")
        )
        
        # Se connecter
        success = mqtt_manager.connect()
        
        if success:
            return {"success": True, "message": "Connexion au broker MQTT réussie"}
        else:
            raise HTTPException(status_code=500, detail="Échec de connexion au broker MQTT")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erreur connexion MQTT: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur connexion MQTT: {str(e)}")


@router.post("/disconnect")
async def disconnect_mqtt(
    current_user: dict = Depends(get_current_admin_user)
):
    """Se déconnecter du broker MQTT (admin seulement)"""
    try:
        mqtt_manager.disconnect()
        return {"success": True, "message": "Déconnecté du broker MQTT"}
    except Exception as e:
        logger.error(f"Erreur déconnexion MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur déconnexion MQTT")


@router.get("/status")
async def get_mqtt_status(
    current_user: dict = Depends(get_current_admin_user)
):
    """Obtenir le statut de la connexion MQTT (admin seulement)"""
    try:
        status = mqtt_manager.get_status()
        return status
    except Exception as e:
        logger.error(f"Erreur récupération statut MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération statut MQTT")


# =======================
# Publication MQTT
# =======================

@router.post("/publish")
async def publish_mqtt(
    data: MQTTPublish,
    current_user: dict = Depends(get_current_admin_user)
):
    """Publier un message sur un topic MQTT (admin seulement)"""
    try:
        success = mqtt_manager.publish(
            topic=data.topic,
            payload=data.payload,
            qos=data.qos,
            retain=data.retain
        )
        
        if success:
            # Enregistrer dans l'historique
            await db.mqtt_publish_history.insert_one({
                "topic": data.topic,
                "payload": data.payload,
                "qos": data.qos,
                "retain": data.retain,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "published_by": current_user.get("id"),
                "user_email": current_user.get("email")
            })
            
            return {"success": True, "message": "Message publié avec succès"}
        else:
            raise HTTPException(status_code=500, detail="Échec de publication du message")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erreur publication MQTT: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur publication MQTT: {str(e)}")


# =======================
# Abonnement MQTT
# =======================

async def mqtt_message_callback(topic: str, payload: str, qos: int):
    """Callback appelé lors de la réception d'un message MQTT"""
    try:
        # Enregistrer le message dans la base de données
        await db.mqtt_messages.insert_one({
            "topic": topic,
            "payload": payload,
            "qos": qos,
            "received_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Message MQTT enregistré: {topic}")
        
    except Exception as e:
        logger.error(f"Erreur sauvegarde message MQTT: {e}")


@router.post("/subscribe")
async def subscribe_mqtt(
    data: MQTTSubscribe,
    current_user: dict = Depends(get_current_admin_user)
):
    """S'abonner à un topic MQTT (admin seulement)"""
    try:
        success = mqtt_manager.subscribe(
            topic=data.topic,
            qos=data.qos,
            callback=mqtt_message_callback
        )
        
        if success:
            # Enregistrer l'abonnement
            await db.mqtt_subscriptions.update_one(
                {"topic": data.topic},
                {
                    "$set": {
                        "topic": data.topic,
                        "qos": data.qos,
                        "subscribed_at": datetime.now(timezone.utc).isoformat(),
                        "subscribed_by": current_user.get("id"),
                        "user_email": current_user.get("email"),
                        "active": True
                    }
                },
                upsert=True
            )
            
            return {"success": True, "message": f"Abonné au topic: {data.topic}"}
        else:
            raise HTTPException(status_code=500, detail="Échec d'abonnement au topic")
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erreur abonnement MQTT: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur abonnement MQTT: {str(e)}")


@router.delete("/subscribe/{topic_encoded}")
async def unsubscribe_mqtt(
    topic_encoded: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Se désabonner d'un topic MQTT (admin seulement)"""
    try:
        # Décoder complètement le topic (URL decode)
        from urllib.parse import unquote
        topic = unquote(topic_encoded)
        
        logger.info(f"Désabonnement du topic: {topic}")
        
        mqtt_manager.unsubscribe(topic)
        
        # Marquer l'abonnement comme inactif
        await db.mqtt_subscriptions.update_one(
            {"topic": topic},
            {"$set": {"active": False}}
        )
        
        return {"success": True, "message": f"Désabonné du topic: {topic}"}
        
    except Exception as e:
        logger.error(f"Erreur désabonnement MQTT: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur désabonnement MQTT: {str(e)}")


@router.get("/subscriptions")
async def get_mqtt_subscriptions(
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer la liste des abonnements MQTT actifs (admin seulement)"""
    try:
        subscriptions = await db.mqtt_subscriptions.find(
            {"active": True},
            {"_id": 0}
        ).to_list(length=None)
        
        return {"subscriptions": subscriptions}
        
    except Exception as e:
        logger.error(f"Erreur récupération abonnements MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération abonnements MQTT")


# =======================
# Messages MQTT reçus
# =======================

@router.get("/messages")
async def get_mqtt_messages(
    topic: str = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer les messages MQTT reçus (admin seulement)"""
    try:
        query = {}
        if topic:
            query["topic"] = topic
        
        messages = await db.mqtt_messages.find(
            query,
            {"_id": 0}
        ).sort("received_at", -1).limit(limit).to_list(length=limit)
        
        return {"messages": messages, "count": len(messages)}
        
    except Exception as e:
        logger.error(f"Erreur récupération messages MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération messages MQTT")


@router.delete("/messages")
async def clear_mqtt_messages(
    current_user: dict = Depends(get_current_admin_user)
):
    """Effacer tous les messages MQTT reçus (admin seulement)"""
    try:
        result = await db.mqtt_messages.delete_many({})
        
        return {
            "success": True,
            "message": f"{result.deleted_count} messages supprimés"
        }
        
    except Exception as e:
        logger.error(f"Erreur suppression messages MQTT: {e}")
        raise HTTPException(status_code=500, detail="Erreur suppression messages MQTT")
