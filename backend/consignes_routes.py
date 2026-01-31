"""
Routes pour la gestion des consignes avec notification MQTT
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from bson import ObjectId
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consignes", tags=["Consignes"])

# Variables globales initialisées par init_consignes_routes
db = None
get_current_user = None
mqtt_manager = None
audit_service = None

# WebSocket connections pour les consignes
consigne_connections = {}  # user_id -> WebSocket


class ConsigneCreate(BaseModel):
    recipient_id: str
    message: str


class ConsigneResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    recipient_id: str
    recipient_name: str
    message: str
    created_at: str
    acknowledged: bool
    acknowledged_at: Optional[str] = None


def init_consignes_routes(database, current_user_dep, mqtt_mgr, audit_svc):
    """Initialise les routes avec les dépendances"""
    global db, get_current_user, mqtt_manager, audit_service
    db = database
    get_current_user = current_user_dep
    mqtt_manager = mqtt_mgr
    audit_service = audit_svc
    return router


@router.post("/send")
async def send_consigne(
    data: ConsigneCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """
    Envoyer une consigne à un utilisateur
    - Stocke la consigne en base
    - Notifie via WebSocket si l'utilisateur est connecté
    - Envoie un message MQTT sur le topic de l'utilisateur
    """
    try:
        # Récupérer les infos du destinataire
        recipient = await db.users.find_one({"_id": ObjectId(data.recipient_id)})
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        
        recipient_name = f"{recipient.get('prenom', '')} {recipient.get('nom', '')}".strip()
        sender_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        
        # Créer la consigne
        consigne = {
            "sender_id": current_user.get("id"),
            "sender_name": sender_name,
            "sender_email": current_user.get("email"),
            "recipient_id": data.recipient_id,
            "recipient_name": recipient_name,
            "recipient_email": recipient.get("email"),
            "message": data.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "acknowledged": False,
            "acknowledged_at": None
        }
        
        # Insérer en base
        result = await db.consignes.insert_one(consigne)
        consigne_id = str(result.inserted_id)
        consigne["id"] = consigne_id
        
        # Vérifier si l'utilisateur est en ligne (WebSocket connecté)
        recipient_online = data.recipient_id in consigne_connections
        
        # Notifier via WebSocket si connecté
        if recipient_online:
            try:
                ws = consigne_connections[data.recipient_id]
                await ws.send_json({
                    "type": "new_consigne",
                    "consigne": {
                        "id": consigne_id,
                        "sender_name": sender_name,
                        "message": data.message,
                        "created_at": consigne["created_at"]
                    }
                })
                logger.info(f"✅ Consigne envoyée via WebSocket à {recipient_name}")
            except Exception as e:
                logger.error(f"❌ Erreur envoi WebSocket consigne: {e}")
                recipient_online = False
        
        # Envoyer le message MQTT (même si utilisateur hors ligne)
        mqtt_sent = False
        mqtt_topic = recipient.get("mqtt_topic")
        mqtt_action_reception = recipient.get("mqtt_action_reception", "")
        
        if mqtt_topic and mqtt_manager:
            try:
                full_topic = f"{mqtt_topic}{mqtt_action_reception}"
                payload = json.dumps({
                    "type": "consigne_received",
                    "sender": sender_name,
                    "message": data.message,
                    "timestamp": consigne["created_at"],
                    "consigne_id": consigne_id
                })
                
                mqtt_sent = mqtt_manager.publish(
                    topic=full_topic,
                    payload=payload,
                    qos=1,
                    retain=False
                )
                
                if mqtt_sent:
                    logger.info(f"✅ Message MQTT envoyé sur {full_topic}")
                    
                    # Enregistrer dans l'historique MQTT
                    await db.mqtt_publish_history.insert_one({
                        "topic": full_topic,
                        "payload": payload,
                        "qos": 1,
                        "retain": False,
                        "published_at": datetime.now(timezone.utc).isoformat(),
                        "published_by": current_user.get("id"),
                        "user_email": current_user.get("email"),
                        "context": "consigne_reception"
                    })
            except Exception as e:
                logger.error(f"❌ Erreur envoi MQTT consigne: {e}")
        
        # Log dans le journal d'audit
        if audit_service:
            try:
                await audit_service.log_action(
                    user_id=current_user.get("id"),
                    user_name=sender_name,
                    user_email=current_user.get("email"),
                    action="CREATE",
                    entity_type="CONSIGNE",
                    entity_id=consigne_id,
                    entity_name=f"Consigne à {recipient_name}",
                    details={
                        "recipient_id": data.recipient_id,
                        "recipient_name": recipient_name,
                        "message_preview": data.message[:100] if len(data.message) > 100 else data.message
                    }
                )
            except Exception as e:
                logger.warning(f"⚠️ Erreur audit consigne: {e}")
        
        return {
            "success": True,
            "consigne_id": consigne_id,
            "recipient_online": recipient_online,
            "mqtt_sent": mqtt_sent,
            "message": f"Consigne envoyée à {recipient_name}" + 
                      (" (hors ligne - stockée)" if not recipient_online else " (en ligne)")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur envoi consigne: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur envoi consigne: {str(e)}")


@router.get("/pending")
async def get_pending_consignes(
    current_user: dict = Depends(lambda: get_current_user)
):
    """Récupérer les consignes non acquittées pour l'utilisateur connecté"""
    try:
        user_id = current_user.get("id")
        
        consignes = await db.consignes.find({
            "recipient_id": user_id,
            "acknowledged": False
        }).sort("created_at", 1).to_list(100)
        
        result = []
        for c in consignes:
            result.append({
                "id": str(c["_id"]),
                "sender_id": c.get("sender_id"),
                "sender_name": c.get("sender_name"),
                "message": c.get("message"),
                "created_at": c.get("created_at")
            })
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération consignes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{consigne_id}/acknowledge")
async def acknowledge_consigne(
    consigne_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """
    Acquitter une consigne (clic sur OK)
    - Met à jour le statut en base
    - Envoie le message MQTT "Action OK"
    - Envoie un message dans le Chat Live
    """
    try:
        user_id = current_user.get("id")
        user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        
        # Récupérer la consigne
        consigne = await db.consignes.find_one({
            "_id": ObjectId(consigne_id),
            "recipient_id": user_id
        })
        
        if not consigne:
            raise HTTPException(status_code=404, detail="Consigne non trouvée")
        
        if consigne.get("acknowledged"):
            return {"success": True, "message": "Consigne déjà acquittée"}
        
        ack_time = datetime.now(timezone.utc)
        
        # Mettre à jour la consigne
        await db.consignes.update_one(
            {"_id": ObjectId(consigne_id)},
            {"$set": {
                "acknowledged": True,
                "acknowledged_at": ack_time.isoformat()
            }}
        )
        
        # Récupérer les infos utilisateur pour MQTT
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        mqtt_sent = False
        
        if user and mqtt_manager:
            mqtt_topic = user.get("mqtt_topic")
            mqtt_action_ok = user.get("mqtt_action_ok", "")
            
            if mqtt_topic:
                try:
                    full_topic = f"{mqtt_topic}{mqtt_action_ok}"
                    payload = json.dumps({
                        "type": "consigne_acknowledged",
                        "consigne_id": consigne_id,
                        "acknowledged_by": user_name,
                        "timestamp": ack_time.isoformat(),
                        "original_sender": consigne.get("sender_name")
                    })
                    
                    mqtt_sent = mqtt_manager.publish(
                        topic=full_topic,
                        payload=payload,
                        qos=1,
                        retain=False
                    )
                    
                    if mqtt_sent:
                        logger.info(f"✅ Message MQTT ACK envoyé sur {full_topic}")
                        
                        # Enregistrer dans l'historique MQTT
                        await db.mqtt_publish_history.insert_one({
                            "topic": full_topic,
                            "payload": payload,
                            "qos": 1,
                            "retain": False,
                            "published_at": ack_time.isoformat(),
                            "published_by": user_id,
                            "user_email": user.get("email"),
                            "context": "consigne_ack"
                        })
                except Exception as e:
                    logger.error(f"❌ Erreur envoi MQTT ACK: {e}")
        
        # Envoyer un message dans le Chat Live
        sender_name = consigne.get("sender_name", "Expéditeur")
        ack_message = f"📋 {user_name} a lu la consigne de {sender_name} à {ack_time.strftime('%d/%m/%Y %H:%M')}"
        
        try:
            # Créer le message chat
            chat_message = {
                "user_id": user_id,
                "user_name": "Système",
                "user_email": "system@gmao.local",
                "message": ack_message,
                "timestamp": ack_time.isoformat(),
                "is_private": False,
                "recipients": [],
                "is_system": True,
                "attachments": []
            }
            
            await db.chat_messages.insert_one(chat_message)
            logger.info(f"✅ Message Chat Live envoyé: {ack_message}")
        except Exception as e:
            logger.warning(f"⚠️ Erreur envoi message Chat: {e}")
        
        # Log dans le journal d'audit
        if audit_service:
            try:
                await audit_service.log_action(
                    user_id=user_id,
                    user_name=user_name,
                    user_email=current_user.get("email"),
                    action="UPDATE",
                    entity_type="CONSIGNE",
                    entity_id=consigne_id,
                    entity_name=f"Acquittement consigne de {sender_name}",
                    details={
                        "acknowledged_at": ack_time.isoformat(),
                        "sender_name": sender_name
                    }
                )
            except Exception as e:
                logger.warning(f"⚠️ Erreur audit acquittement: {e}")
        
        return {
            "success": True,
            "message": "Consigne acquittée",
            "mqtt_sent": mqtt_sent,
            "acknowledged_at": ack_time.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur acquittement consigne: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_consignes_history(
    limit: int = 50,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Récupérer l'historique des consignes (envoyées et reçues)"""
    try:
        user_id = current_user.get("id")
        
        # Consignes envoyées
        sent = await db.consignes.find({
            "sender_id": user_id
        }).sort("created_at", -1).to_list(limit)
        
        # Consignes reçues
        received = await db.consignes.find({
            "recipient_id": user_id
        }).sort("created_at", -1).to_list(limit)
        
        def format_consigne(c, direction):
            return {
                "id": str(c["_id"]),
                "direction": direction,
                "sender_name": c.get("sender_name"),
                "recipient_name": c.get("recipient_name"),
                "message": c.get("message"),
                "created_at": c.get("created_at"),
                "acknowledged": c.get("acknowledged", False),
                "acknowledged_at": c.get("acknowledged_at")
            }
        
        result = {
            "sent": [format_consigne(c, "sent") for c in sent],
            "received": [format_consigne(c, "received") for c in received]
        }
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur historique consignes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket pour les notifications de consignes en temps réel
async def consignes_websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket pour recevoir les consignes en temps réel"""
    import jwt
    import os
    
    try:
        # Vérifier le token
        secret = os.environ.get("JWT_SECRET", "your-secret-key")
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("id")
        
        if not user_id:
            await websocket.close(code=4001)
            return
        
        await websocket.accept()
        logger.info(f"🔔 WebSocket consignes connecté: user {user_id}")
        
        # Enregistrer la connexion
        consigne_connections[user_id] = websocket
        
        try:
            while True:
                # Maintenir la connexion avec des heartbeats
                data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
                
                if data.get("type") == "heartbeat":
                    await websocket.send_json({"type": "heartbeat_ack"})
                    
        except asyncio.TimeoutError:
            # Envoyer un ping
            await websocket.send_json({"type": "ping"})
            
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket consignes déconnecté: user {user_id if 'user_id' in dir() else 'unknown'}")
    except Exception as e:
        logger.error(f"❌ Erreur WebSocket consignes: {e}")
    finally:
        # Nettoyer la connexion
        if 'user_id' in dir() and user_id in consigne_connections:
            del consigne_connections[user_id]
