# notifications.py - Push Notifications Service for FSAO Mobile (Expo Push)

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import httpx
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import get_current_user, get_database

logger = logging.getLogger(__name__)

# ============================================
# MODELS
# ============================================

class DeviceTokenCreate(BaseModel):
    push_token: str
    platform: str = "android"
    device_name: Optional[str] = None

class NotificationPayload(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None

# ============================================
# EXPO PUSH NOTIFICATION SERVICE
# ============================================

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_expo_push_notification(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None
) -> dict:
    """Send push notification via Expo Push Notification Service."""
    messages = []
    for token in push_tokens:
        if not token.startswith("ExponentPushToken"):
            continue
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "priority": "high",
        }
        if data:
            message["data"] = data
        messages.append(message)

    if not messages:
        return {"success": False, "error": "No valid tokens"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                timeout=30.0
            )
            result = response.json()
            logger.info(f"Push notification sent: {len(messages)} message(s)")
            return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return {"success": False, "error": str(e)}

# ============================================
# NOTIFICATION FUNCTIONS BY TYPE
# ============================================

async def notify_work_order_assigned(
    db,
    work_order_id: str,
    work_order_title: str,
    work_order_numero: str,
    assigned_user_id: str
):
    """Send notification when a work order is assigned to a user."""
    try:
        logger.info(f"[PUSH NOTIFY] notify_work_order_assigned called for user {assigned_user_id}")
        tokens_cursor = db.device_tokens.find({
            "user_id": assigned_user_id,
            "is_active": True
        })
        tokens = [doc["push_token"] async for doc in tokens_cursor]
        logger.info(f"[PUSH NOTIFY] Found {len(tokens)} active tokens for user {assigned_user_id}")

        if tokens:
            result = await send_expo_push_notification(
                push_tokens=tokens,
                title="Nouveau bon de travail assigne",
                body=f"#{work_order_numero}: {work_order_title}",
                data={
                    "type": "work_order_assigned",
                    "work_order_id": work_order_id,
                    "work_order_numero": work_order_numero
                }
            )
            logger.info(f"[PUSH NOTIFY] Send result: {result}")
        else:
            logger.info(f"[PUSH NOTIFY] No tokens found, skipping notification")
    except Exception as e:
        logger.error(f"[PUSH NOTIFY] ERROR in notify_work_order_assigned: {e}")

async def notify_work_order_status_changed(
    db,
    work_order_id: str,
    work_order_title: str,
    work_order_numero: str,
    old_status: str,
    new_status: str,
    notify_user_ids: List[str]
):
    """Send notification when a work order status changes."""
    try:
        status_labels = {
            "OUVERT": "Ouvert",
            "EN_COURS": "En cours",
            "EN_ATTENTE": "En attente",
            "TERMINE": "Termine",
            "ANNULE": "Annule",
            "CLOTURE": "Cloture"
        }
        new_status_label = status_labels.get(new_status, new_status)

        tokens_cursor = db.device_tokens.find({
            "user_id": {"$in": notify_user_ids},
            "is_active": True
        })
        tokens = [doc["push_token"] async for doc in tokens_cursor]

        if tokens:
            await send_expo_push_notification(
                push_tokens=tokens,
                title="Statut BT modifie",
                body=f"#{work_order_numero} -> {new_status_label}",
                data={
                    "type": "work_order_status_changed",
                    "work_order_id": work_order_id,
                    "work_order_numero": work_order_numero,
                    "old_status": old_status,
                    "new_status": new_status
                }
            )
    except Exception as e:
        logger.error(f"Error in notify_work_order_status_changed: {e}")

async def notify_equipment_alert(
    db,
    equipment_id: str,
    equipment_name: str,
    alert_type: str,
    alert_message: str,
    notify_user_ids: Optional[List[str]] = None
):
    """Send notification for equipment alerts. If notify_user_ids is None, notify all technicians and admins."""
    try:
        if notify_user_ids is None:
            users_cursor = db.users.find({
                "role": {"$in": ["ADMIN", "TECHNICIEN"]},
                "actif": True
            })
            notify_user_ids = [str(doc["_id"]) async for doc in users_cursor]

        tokens_cursor = db.device_tokens.find({
            "user_id": {"$in": notify_user_ids},
            "is_active": True
        })
        tokens = [doc["push_token"] async for doc in tokens_cursor]

        alert_icons = {
            "PANNE": "PANNE",
            "MAINTENANCE": "MAINTENANCE",
            "ALERTE": "ALERTE",
            "INFO": "INFO"
        }
        icon = alert_icons.get(alert_type, "ALERTE")

        if tokens:
            await send_expo_push_notification(
                push_tokens=tokens,
                title=f"[{icon}] Alerte equipement",
                body=f"{equipment_name}: {alert_message}",
                data={
                    "type": "equipment_alert",
                    "equipment_id": equipment_id,
                    "alert_type": alert_type
                }
            )
    except Exception as e:
        logger.error(f"Error in notify_equipment_alert: {e}")

async def notify_chat_message(
    db,
    sender_name: str,
    message_preview: str,
    recipient_user_ids: List[str]
):
    """Send notification for new chat messages."""
    try:
        tokens_cursor = db.device_tokens.find({
            "user_id": {"$in": recipient_user_ids},
            "is_active": True
        })
        tokens = [doc["push_token"] async for doc in tokens_cursor]

        if len(message_preview) > 50:
            message_preview = message_preview[:47] + "..."

        if tokens:
            await send_expo_push_notification(
                push_tokens=tokens,
                title=f"{sender_name}",
                body=message_preview,
                data={
                    "type": "chat_message"
                }
            )
    except Exception as e:
        logger.error(f"Error in notify_chat_message: {e}")

# ============================================
# API ROUTER
# ============================================

router = APIRouter(prefix="/push-notifications", tags=["Push Notifications"])

@router.post("/register")
async def register_device_token(
    token_data: DeviceTokenCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Register a device push token for the current user."""
    try:
        user_id = str(current_user["id"])
        now = datetime.now(timezone.utc)

        # Upsert: si le push_token existe deja, on met a jour
        result = await db.device_tokens.update_one(
            {"push_token": token_data.push_token},
            {"$set": {
                "user_id": user_id,
                "platform": token_data.platform,
                "device_name": token_data.device_name,
                "updated_at": now,
                "is_active": True
            },
            "$setOnInsert": {
                "created_at": now
            }},
            upsert=True
        )

        if result.upserted_id:
            return {"message": "Token registered", "token_id": str(result.upserted_id)}
        return {"message": "Token updated"}
    except Exception as e:
        logger.error(f"[PUSH REGISTER] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/unregister")
async def unregister_device_token(
    push_token: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Unregister a device push token."""
    user_id = str(current_user["id"])

    result = await db.device_tokens.update_one(
        {"user_id": user_id, "push_token": push_token},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Token not found")

    return {"message": "Token unregistered"}

@router.post("/test")
async def test_notification(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Send a test notification to the current user."""
    user_id = str(current_user["id"])

    tokens_cursor = db.device_tokens.find({
        "user_id": user_id,
        "is_active": True
    })
    tokens = [doc["push_token"] async for doc in tokens_cursor]

    if not tokens:
        raise HTTPException(status_code=404, detail="No registered devices")

    result = await send_expo_push_notification(
        push_tokens=tokens,
        title="Test de notification",
        body="Les notifications fonctionnent correctement !",
        data={"type": "test"}
    )

    return result


@router.post("/test/{user_id}")
async def test_notification_for_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Send a test notification to a specific user (admin only)."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")

    tokens_cursor = db.device_tokens.find({
        "user_id": user_id,
        "is_active": True
    })
    tokens = [doc["push_token"] async for doc in tokens_cursor]

    if not tokens:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun appareil mobile enregistre pour cet utilisateur. L'utilisateur doit d'abord installer l'application mobile et s'y connecter."
        )

    result = await send_expo_push_notification(
        push_tokens=tokens,
        title="Test de notification",
        body="Les notifications fonctionnent correctement !",
        data={"type": "test"}
    )

    return result
