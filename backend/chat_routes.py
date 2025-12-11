"""
Routes API pour le Chat Live
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models import (
    ChatMessage, ChatMessageCreate, ChatReactionAdd, ChatFileTransfer,
    ChatEmailTransfer, ChatAttachment, ChatReaction, UserChatActivity
)
from dependencies import get_current_user, require_permission
from websocket_manager import manager
import logging
import os
import uuid
import shutil
from email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Variables globales (seront injectées depuis server.py)
db = None

def init_chat_routes(database):
    """Initialize chat routes with database"""
    global db
    db = database

# Dossier de stockage des fichiers
CHAT_UPLOADS_DIR = "/app/backend/uploads/chat/"
os.makedirs(CHAT_UPLOADS_DIR, exist_ok=True)

# =====================================
# WEBSOCKET ENDPOINT
# =====================================

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Connexion WebSocket pour le chat en temps réel
    Le token JWT est passé dans l'URL
    """
    user_id = None
    user_name = "Unknown"
    
    try:
        # Valider le token JWT
        from auth import decode_access_token
        payload = decode_access_token(token)
        
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token - no user_id")
            return
        
        # Récupérer les infos utilisateur
        from bson import ObjectId
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_data:
            await websocket.close(code=1008, reason="User not found")
            return
        
        user_name = f"{user_data.get('prenom', '')} {user_data.get('nom', '')}".strip()
        
        # Connecter l'utilisateur
        await manager.connect(websocket, user_id, user_name)
        
        # Marquer l'utilisateur comme en ligne
        await db.user_chat_activity.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "is_online": True,
                    "last_activity": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        try:
            while True:
                # Recevoir les messages du client
                data = await websocket.receive_json()
                
                # Traiter selon le type de message
                message_type = data.get("type")
                
                if message_type == "heartbeat":
                    # Mise à jour de l'activité
                    await db.user_chat_activity.update_one(
                        {"user_id": user_id},
                        {
                            "$set": {
                                "last_activity": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    # Répondre au heartbeat
                    await websocket.send_json({"type": "heartbeat_ack"})
                
                elif message_type == "message":
                    # Nouveau message chat
                    message_content = data.get("message", "")
                    recipient_ids = data.get("recipient_ids", [])
                    reply_to_id = data.get("reply_to_id")
                    
                    # Créer le message
                    chat_message = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "user_name": user_name,
                        "user_role": user_data.get("role", ""),
                        "message": message_content,
                        "recipient_ids": recipient_ids,
                        "recipient_names": [],
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "is_deleted": False,
                        "deleted_at": None,
                        "reply_to_id": reply_to_id,
                        "reply_to_preview": None,
                        "reactions": [],
                        "attachments": [],
                        "deletable_until": (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat(),
                        "is_private": len(recipient_ids) > 0
                    }
                    
                    # Si c'est une réponse, récupérer l'aperçu du message original
                    if reply_to_id:
                        original_msg = await db.chat_messages.find_one({"id": reply_to_id})
                        if original_msg:
                            preview = original_msg.get("message", "")[:100]
                            chat_message["reply_to_preview"] = preview
                    
                    # Si message privé, récupérer les noms des destinataires
                    if recipient_ids:
                        from bson import ObjectId
                        # Convertir les IDs string en ObjectId pour la recherche MongoDB
                        recipient_object_ids = [ObjectId(rid) for rid in recipient_ids if ObjectId.is_valid(rid)]
                        recipients = await db.users.find({"_id": {"$in": recipient_object_ids}}).to_list(length=None)
                        chat_message["recipient_names"] = [
                            f"{r.get('prenom', '')} {r.get('nom', '')}".strip()
                            for r in recipients
                        ]
                    
                    # Sauvegarder dans MongoDB
                    await db.chat_messages.insert_one(chat_message)
                    
                    # Créer une copie propre du message pour broadcast (sans _id MongoDB)
                    clean_message = {
                        "id": chat_message["id"],
                        "user_id": chat_message["user_id"],
                        "user_name": chat_message["user_name"],
                        "user_role": chat_message["user_role"],
                        "message": chat_message["message"],
                        "recipient_ids": chat_message["recipient_ids"],
                        "recipient_names": chat_message["recipient_names"],
                        "timestamp": chat_message["timestamp"],
                        "is_deleted": chat_message["is_deleted"],
                        "deleted_at": chat_message["deleted_at"],
                        "reply_to_id": chat_message["reply_to_id"],
                        "reply_to_preview": chat_message["reply_to_preview"],
                        "reactions": chat_message["reactions"],
                        "attachments": chat_message["attachments"],
                        "deletable_until": chat_message["deletable_until"],
                        "is_private": chat_message["is_private"]
                    }
                    
                    # Diffuser le message
                    broadcast_data = {
                        "type": "new_message",
                        "message": clean_message
                    }
                    
                    if recipient_ids:
                        # Message privé : envoyer à l'auteur et aux destinataires uniquement
                        all_recipients = recipient_ids + [user_id]
                        await manager.send_to_users(broadcast_data, all_recipients)
                    else:
                        # Message de groupe : broadcast à tous
                        await manager.broadcast(broadcast_data)
                
                elif message_type == "typing":
                    # Notification "utilisateur est en train d'écrire"
                    typing_data = {
                        "type": "user_typing",
                        "user_id": user_id,
                        "user_name": user_name
                    }
                    await manager.broadcast(typing_data, exclude_user_id=user_id)
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket déconnecté: {user_name}")
        
    except Exception as e:
        logger.error(f"Erreur WebSocket: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    finally:
        # Déconnecter l'utilisateur seulement s'il était connecté
        if user_id:
            manager.disconnect(user_id, user_name)
            
            # Marquer comme hors ligne
            await db.user_chat_activity.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "is_online": False,
                        "last_activity": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Notifier les autres
            await manager.broadcast_user_status(user_id, user_name, "offline")


# =====================================
# REST ENDPOINTS
# =====================================

@router.get("/messages")
async def get_messages(
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "view"))
):
    """
    Récupérer les messages du chat (avec pagination)
    Retourne seulement les messages publics + les messages privés destinés à l'utilisateur
    """
    user_id = current_user.get("id")
    
    # Query pour messages publics OU messages privés pour cet utilisateur
    query = {
        "is_deleted": False,
        "$or": [
            {"recipient_ids": []},  # Messages de groupe
            {"recipient_ids": user_id},  # Messages privés pour cet utilisateur
            {"user_id": user_id}  # Messages envoyés par cet utilisateur
        ]
    }
    
    # Récupérer les messages triés par date (plus récents en premier)
    messages_raw = await db.chat_messages.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Inverser pour avoir les plus anciens en premier (ordre chronologique)
    messages_raw.reverse()
    
    # Nettoyer les messages pour éviter les problèmes de sérialisation ObjectId
    messages = []
    for msg in messages_raw:
        clean_msg = {
            "id": msg.get("id"),
            "user_id": msg.get("user_id"),
            "user_name": msg.get("user_name"),
            "user_role": msg.get("user_role"),
            "message": msg.get("message"),
            "recipient_ids": msg.get("recipient_ids", []),
            "recipient_names": msg.get("recipient_names", []),
            "timestamp": msg.get("timestamp"),
            "is_deleted": msg.get("is_deleted", False),
            "deleted_at": msg.get("deleted_at"),
            "reply_to_id": msg.get("reply_to_id"),
            "reply_to_preview": msg.get("reply_to_preview"),
            "reactions": msg.get("reactions", []),
            "attachments": msg.get("attachments", []),
            "deletable_until": msg.get("deletable_until"),
            "is_private": msg.get("is_private", False)
        }
        messages.append(clean_msg)
    
    return {"messages": messages, "total": await db.chat_messages.count_documents(query)}


@router.post("/messages")
async def create_message(
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "edit"))
):
    """
    Créer un nouveau message (alternatif au WebSocket)
    """
    user_id = current_user.get("id")
    user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
    user_role = current_user.get("role", "")
    
    chat_message = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "message": message_data.message,
        "recipient_ids": message_data.recipient_ids,
        "recipient_names": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
        "deleted_at": None,
        "reply_to_id": message_data.reply_to_id,
        "reply_to_preview": None,
        "reactions": [],
        "attachments": [],
        "deletable_until": (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat(),
        "is_private": len(message_data.recipient_ids) > 0
    }
    
    # Si c'est une réponse, récupérer l'aperçu
    if message_data.reply_to_id:
        original_msg = await db.chat_messages.find_one({"id": message_data.reply_to_id})
        if original_msg:
            preview = original_msg.get("message", "")[:100]
            chat_message["reply_to_preview"] = preview
    
    # Si message privé, récupérer les noms des destinataires
    if message_data.recipient_ids:
        recipients = await db.users.find({"id": {"$in": message_data.recipient_ids}}).to_list(length=None)
        chat_message["recipient_names"] = [
            f"{r.get('prenom', '')} {r.get('nom', '')}".strip()
            for r in recipients
        ]
    
    # Sauvegarder
    await db.chat_messages.insert_one(chat_message)
    
    # Créer une copie propre pour la réponse (sans _id MongoDB)
    response_message = {
        "id": chat_message["id"],
        "user_id": chat_message["user_id"],
        "user_name": chat_message["user_name"],
        "user_role": chat_message["user_role"],
        "message": chat_message["message"],
        "recipient_ids": chat_message["recipient_ids"],
        "recipient_names": chat_message["recipient_names"],
        "timestamp": chat_message["timestamp"],
        "is_deleted": chat_message["is_deleted"],
        "deleted_at": chat_message["deleted_at"],
        "reply_to_id": chat_message["reply_to_id"],
        "reply_to_preview": chat_message["reply_to_preview"],
        "reactions": chat_message["reactions"],
        "attachments": chat_message["attachments"],
        "deletable_until": chat_message["deletable_until"],
        "is_private": chat_message["is_private"]
    }
    
    # Diffuser via WebSocket
    broadcast_data = {
        "type": "new_message",
        "message": response_message
    }
    
    if message_data.recipient_ids:
        all_recipients = message_data.recipient_ids + [user_id]
        await manager.send_to_users(broadcast_data, all_recipients)
    else:
        await manager.broadcast(broadcast_data)
    
    return {"success": True, "message": response_message}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "view"))
):
    """
    Supprimer un message
    - Utilisateur peut supprimer son propre message dans les 10 premières secondes
    - Admin peut supprimer n'importe quel message à tout moment
    """
    user_id = current_user.get("id")
    is_admin = current_user.get("role") == "ADMIN"
    
    # Récupérer le message
    message = await db.chat_messages.find_one({"id": message_id})
    
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Vérifier les permissions
    is_author = message.get("user_id") == user_id
    deletable_until_str = message.get("deletable_until")
    
    # Parser le timestamp de suppression
    try:
        if deletable_until_str.endswith('Z'):
            deletable_until_str = deletable_until_str[:-1] + '+00:00'
        deletable_until = datetime.fromisoformat(deletable_until_str)
        if deletable_until.tzinfo is None:
            deletable_until = deletable_until.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        # Si erreur de parsing, considérer que le délai est expiré
        deletable_until = datetime.now(timezone.utc) - timedelta(seconds=1)
    
    can_delete_time = datetime.now(timezone.utc) <= deletable_until
    
    if is_admin:
        # Admin peut toujours supprimer
        can_delete = True
    elif is_author and can_delete_time:
        # Auteur peut supprimer dans les 10 secondes
        can_delete = True
    else:
        raise HTTPException(status_code=403, detail="Vous ne pouvez plus supprimer ce message")
    
    # Marquer comme supprimé
    await db.chat_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "message": "Ce message a été supprimé"
            }
        }
    )
    
    # Notifier via WebSocket
    broadcast_data = {
        "type": "message_deleted",
        "message_id": message_id
    }
    await manager.broadcast(broadcast_data)
    
    return {"success": True, "message": "Message supprimé"}


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "view"))
):
    """
    Compter le nombre de messages non lus pour l'utilisateur
    """
    user_id = current_user.get("id")
    
    # Récupérer le dernier timestamp de visite
    activity = await db.user_chat_activity.find_one({"user_id": user_id})
    
    if not activity:
        # Première visite, compter tous les messages
        last_seen = datetime(2000, 1, 1, tzinfo=timezone.utc).isoformat()
    else:
        last_seen = activity.get("last_seen_timestamp", datetime(2000, 1, 1, tzinfo=timezone.utc).isoformat())
    
    # Compter les messages postérieurs
    query = {
        "is_deleted": False,
        "timestamp": {"$gt": last_seen},
        "user_id": {"$ne": user_id},  # Ne pas compter ses propres messages
        "$or": [
            {"recipient_ids": []},  # Messages de groupe
            {"recipient_ids": user_id}  # Messages privés pour cet utilisateur
        ]
    }
    
    unread_count = await db.chat_messages.count_documents(query)
    
    return {"unread_count": unread_count}


@router.post("/mark-as-read")
async def mark_as_read(
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "view"))
):
    """
    Marquer tous les messages comme lus
    Met à jour le timestamp de dernière visite
    """
    user_id = current_user.get("id")
    
    await db.user_chat_activity.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "last_seen_timestamp": datetime.now(timezone.utc).isoformat(),
                "last_activity": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True}


@router.get("/online-users")
async def get_online_users(
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("chatLive", "view"))
):
    """
    Récupérer la liste des utilisateurs en ligne
    """
    # IDs des utilisateurs connectés via WebSocket
    online_user_ids = manager.get_online_users()
    
    # Récupérer les infos complètes
    from bson import ObjectId
    online_object_ids = [ObjectId(uid) for uid in online_user_ids if ObjectId.is_valid(uid)]
    users = await db.users.find({"_id": {"$in": online_object_ids}}).to_list(length=None)
    
    online_users = [
        {
            "id": str(u.get("_id")),
            "name": f"{u.get('prenom', '')} {u.get('nom', '')}".strip(),
            "role": u.get("role", ""),
            "is_online": True
        }
        for u in users
    ]
    
    return {"online_users": online_users}


@router.post("/reactions/{message_id}")
async def add_reaction(
    message_id: str,
    reaction_data: ChatReactionAdd,
    current_user: dict = Depends(get_current_user)
):
    """
    Ajouter une réaction emoji à un message
    """
    user_id = current_user.get("id")
    user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
    
    # Vérifier que le message existe
    message = await db.chat_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Créer la réaction
    reaction = {
        "user_id": user_id,
        "user_name": user_name,
        "emoji": reaction_data.emoji,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Vérifier si l'utilisateur a déjà réagi avec cet emoji
    existing_reactions = message.get("reactions", [])
    already_reacted = any(
        r.get("user_id") == user_id and r.get("emoji") == reaction_data.emoji
        for r in existing_reactions
    )
    
    if already_reacted:
        # Retirer la réaction
        await db.chat_messages.update_one(
            {"id": message_id},
            {
                "$pull": {
                    "reactions": {
                        "user_id": user_id,
                        "emoji": reaction_data.emoji
                    }
                }
            }
        )
        action = "removed"
    else:
        # Ajouter la réaction
        await db.chat_messages.update_one(
            {"id": message_id},
            {"$push": {"reactions": reaction}}
        )
        action = "added"
    
    # Notifier via WebSocket
    broadcast_data = {
        "type": "reaction_update",
        "message_id": message_id,
        "reaction": reaction,
        "action": action
    }
    await manager.broadcast(broadcast_data)
    
    return {"success": True, "action": action}


# =====================================
# UPLOAD DE FICHIERS
# =====================================

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    message_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload un fichier et l'attacher à un message
    Max 15 MB
    """
    # Vérifier la taille
    MAX_SIZE = 15 * 1024 * 1024  # 15 MB
    
    # Lire le fichier
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 15 MB)")
    
    # Générer un nom unique
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{file_id}{file_extension}"
    file_path = os.path.join(CHAT_UPLOADS_DIR, unique_filename)
    
    # Sauvegarder le fichier
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Créer l'objet attachment
    attachment = {
        "id": file_id,
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_path": file_path,
        "file_size": file_size,
        "mime_type": file.content_type or "application/octet-stream",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Si message_id fourni, attacher au message
    if message_id:
        await db.chat_messages.update_one(
            {"id": message_id},
            {"$push": {"attachments": attachment}}
        )
        
        # Notifier via WebSocket
        broadcast_data = {
            "type": "attachment_added",
            "message_id": message_id,
            "attachment": attachment
        }
        await manager.broadcast(broadcast_data)
    
    return {"success": True, "attachment": attachment}


@router.get("/download/{attachment_id}")
async def download_file(
    attachment_id: str,
    current_user: dict = Depends(get_current_user),

):
    """
    Télécharger un fichier joint
    """
    # Trouver le message contenant ce fichier
    message = await db.chat_messages.find_one({
        "attachments.id": attachment_id
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Trouver l'attachment spécifique
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_path = attachment.get("file_path")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier physique non trouvé")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=attachment.get("original_filename"),
        media_type=attachment.get("mime_type")
    )


@router.post("/messages-with-files")
async def create_message_with_files(
    message: str = Form(...),
    recipient_ids: str = Form("[]"),
    files: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_user),

):
    """
    Créer un message avec fichiers joints
    """
    import json
    
    user_id = current_user.get("user_id")
    user_name = current_user.get("user_name", "Utilisateur")
    user_role = current_user.get("role", "")
    
    # Parser recipient_ids JSON
    try:
        recipient_ids_list = json.loads(recipient_ids) if recipient_ids else []
    except:
        recipient_ids_list = []
    
    # Uploader tous les fichiers
    attachments = []
    MAX_SIZE = 15 * 1024 * 1024
    
    for file in files:
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_SIZE:
            raise HTTPException(status_code=413, detail=f"Fichier {file.filename} trop volumineux (max 15 MB)")
        
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(CHAT_UPLOADS_DIR, unique_filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        attachment = {
            "id": file_id,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": file_path,
            "file_size": file_size,
            "mime_type": file.content_type or "application/octet-stream",
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        attachments.append(attachment)
    
    # Créer le message
    chat_message = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "message": message,
        "recipient_ids": recipient_ids_list,
        "recipient_names": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
        "deleted_at": None,
        "reply_to_id": None,
        "reply_to_preview": None,
        "reactions": [],
        "attachments": attachments,
        "deletable_until": (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat(),
        "is_private": len(recipient_ids_list) > 0
    }
    
    # Si message privé, récupérer les noms
    if recipient_ids_list:
        from bson import ObjectId
        recipient_object_ids = [ObjectId(rid) for rid in recipient_ids_list if ObjectId.is_valid(rid)]
        recipients = await db.users.find({"_id": {"$in": recipient_object_ids}}).to_list(length=None)
        chat_message["recipient_names"] = [
            f"{r.get('prenom', '')} {r.get('nom', '')}".strip()
            for r in recipients
        ]
    
    # Sauvegarder
    await db.chat_messages.insert_one(chat_message)
    
    # Créer copie propre pour broadcast
    clean_message = {k: v for k, v in chat_message.items() if k != "_id"}
    
    # Broadcast
    broadcast_data = {
        "type": "new_message",
        "message": clean_message
    }
    
    if recipient_ids_list:
        all_recipients = recipient_ids_list + [user_id]
        await manager.send_to_users(broadcast_data, all_recipients)
    else:
        await manager.broadcast(broadcast_data)
    
    return {"success": True, "message": clean_message}


# =====================================
# TRANSFERT DE FICHIERS
# =====================================

@router.post("/transfer-to-workorder")
async def transfer_to_workorder(
    attachment_id: str = Form(...),
    workorder_id: str = Form(...),
    current_user: dict = Depends(get_current_user),

):
    """
    Transférer un fichier vers un ordre de travail
    """
    # Vérifier permissions
    permissions = current_user.get("permissions", {})
    if not permissions.get("workOrders", {}).get("edit", False):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Trouver le fichier
    message = await db.chat_messages.find_one({"attachments.id": attachment_id})
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Copier le fichier vers le dossier des pièces jointes OT
    import shutil
    work_order_attachments_dir = "/app/backend/uploads/work-orders/"
    os.makedirs(work_order_attachments_dir, exist_ok=True)
    
    new_file_path = os.path.join(work_order_attachments_dir, attachment.get("filename"))
    shutil.copy2(attachment.get("file_path"), new_file_path)
    
    # Ajouter à l'OT
    from bson import ObjectId
    await db.work_orders.update_one(
        {"_id": ObjectId(workorder_id)},
        {
            "$push": {
                "attachments": {
                    "filename": attachment.get("original_filename"),
                    "path": new_file_path,
                    "type": attachment.get("mime_type"),
                    "size": attachment.get("file_size"),
                    "uploadedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"success": True, "message": "Fichier transféré vers l'ordre de travail"}


@router.post("/transfer-to-improvement")
async def transfer_to_improvement(
    attachment_id: str = Form(...),
    improvement_id: str = Form(...),
    current_user: dict = Depends(get_current_user),

):
    """
    Transférer un fichier vers une amélioration
    """
    # Vérifier permissions
    permissions = current_user.get("permissions", {})
    if not permissions.get("improvements", {}).get("edit", False):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Trouver le fichier
    message = await db.chat_messages.find_one({"attachments.id": attachment_id})
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Copier le fichier
    import shutil
    improvements_dir = "/app/backend/uploads/improvements/"
    os.makedirs(improvements_dir, exist_ok=True)
    
    new_file_path = os.path.join(improvements_dir, attachment.get("filename"))
    shutil.copy2(attachment.get("file_path"), new_file_path)
    
    # Ajouter à l'amélioration
    from bson import ObjectId
    await db.improvements.update_one(
        {"_id": ObjectId(improvement_id)},
        {
            "$push": {
                "attachments": {
                    "filename": attachment.get("original_filename"),
                    "path": new_file_path,
                    "type": attachment.get("mime_type"),
                    "size": attachment.get("file_size"),
                    "uploadedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"success": True, "message": "Fichier transféré vers l'amélioration"}


@router.post("/transfer-to-preventive")
async def transfer_to_preventive(
    attachment_id: str = Form(...),
    preventive_id: str = Form(...),
    current_user: dict = Depends(get_current_user),

):
    """
    Transférer un fichier vers une maintenance préventive
    """
    # Vérifier permissions
    permissions = current_user.get("permissions", {})
    if not permissions.get("preventiveMaintenance", {}).get("edit", False):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Trouver le fichier
    message = await db.chat_messages.find_one({"attachments.id": attachment_id})
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Copier le fichier
    import shutil
    preventive_dir = "/app/backend/uploads/preventive-maintenance/"
    os.makedirs(preventive_dir, exist_ok=True)
    
    new_file_path = os.path.join(preventive_dir, attachment.get("filename"))
    shutil.copy2(attachment.get("file_path"), new_file_path)
    
    # Ajouter à la maintenance préventive
    from bson import ObjectId
    await db.preventive_maintenances.update_one(
        {"_id": ObjectId(preventive_id)},
        {
            "$push": {
                "attachments": {
                    "filename": attachment.get("original_filename"),
                    "path": new_file_path,
                    "type": attachment.get("mime_type"),
                    "size": attachment.get("file_size"),
                    "uploadedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"success": True, "message": "Fichier transféré vers la maintenance préventive"}


@router.post("/transfer-to-nearmiss")
async def transfer_to_nearmiss(
    attachment_id: str = Form(...),
    nearmiss_id: str = Form(...),
    current_user: dict = Depends(get_current_user),

):
    """
    Transférer un fichier vers un presqu'accident
    """
    # Vérifier permissions (view suffit car ajouter un fichier n'est pas éditer le presqu'accident)
    permissions = current_user.get("permissions", {})
    if not permissions.get("presquaccident", {}).get("view", False):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Trouver le fichier
    message = await db.chat_messages.find_one({"attachments.id": attachment_id})
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Copier le fichier
    import shutil
    nearmiss_dir = "/app/backend/uploads/presqu-accident/"
    os.makedirs(nearmiss_dir, exist_ok=True)
    
    new_file_path = os.path.join(nearmiss_dir, attachment.get("filename"))
    shutil.copy2(attachment.get("file_path"), new_file_path)
    
    # Ajouter au presqu'accident
    await db.presqu_accident_items.update_one(
        {"id": nearmiss_id},
        {
            "$push": {
                "attachments": {
                    "filename": attachment.get("original_filename"),
                    "path": new_file_path,
                    "type": attachment.get("mime_type"),
                    "size": attachment.get("file_size"),
                    "uploadedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    return {"success": True, "message": "Fichier transféré vers le presqu'accident"}


@router.post("/transfer-by-email")
async def transfer_by_email(
    attachment_id: str = Form(...),
    recipient_user_ids: str = Form(...),
    message_text: str = Form(""),
    current_user: dict = Depends(get_current_user),

):
    """
    Transférer un fichier par email
    """
    import json
    
    # Parser les IDs
    try:
        user_ids = json.loads(recipient_user_ids)
    except:
        raise HTTPException(status_code=400, detail="Format recipient_user_ids invalide")
    
    # Trouver le fichier
    message = await db.chat_messages.find_one({"attachments.id": attachment_id})
    if not message:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    attachment = None
    for att in message.get("attachments", []):
        if att.get("id") == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Récupérer les emails des destinataires
    from bson import ObjectId
    recipient_object_ids = [ObjectId(uid) for uid in user_ids if ObjectId.is_valid(uid)]
    users = await db.users.find({"_id": {"$in": recipient_object_ids}}).to_list(length=None)
    
    if not users:
        raise HTTPException(status_code=404, detail="Aucun destinataire trouvé")
    
    # Envoyer l'email à chaque utilisateur
    sender_name = current_user.get("user_name", "Un utilisateur")
    
    for user in users:
        recipient_email = user.get("email")
        if not recipient_email:
            continue
        
        recipient_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip()
        
        email_subject = f"Fichier partagé par {sender_name}"
        email_body = f"""
Bonjour {recipient_name},

{sender_name} vous a partagé un fichier depuis le Chat Live de GMAO Iris :

Fichier : {attachment.get("original_filename")}
Taille : {attachment.get("file_size") // 1024} KB

{message_text if message_text else ""}

Le fichier est joint à cet email.

Cordialement,
GMAO Iris
        """
        
        try:
            send_email(
                to_email=recipient_email,
                subject=email_subject,
                body=email_body,
                attachment_path=attachment.get("file_path"),
                attachment_filename=attachment.get("original_filename")
            )
        except Exception as e:
            logger.error(f"Erreur envoi email à {recipient_email}: {e}")
    
    return {"success": True, "message": f"Fichier envoyé par email à {len(users)} utilisateur(s)"}


# =====================================
# NETTOYAGE AUTOMATIQUE (60 JOURS)
# =====================================

@router.post("/cleanup")
async def cleanup_old_messages():
    """
    Supprimer les messages et fichiers de plus de 60 jours
    (Endpoint à appeler via un cron job)
    """
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    
    # Récupérer les messages à supprimer
    old_messages = await db.chat_messages.find({"timestamp": {"$lt": cutoff_date}}).to_list(length=None)
    
    deleted_count = 0
    deleted_files = 0
    
    for message in old_messages:
        # Supprimer les fichiers attachés
        for attachment in message.get("attachments", []):
            file_path = attachment.get("file_path")
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    deleted_files += 1
                except Exception as e:
                    logger.error(f"Erreur suppression fichier {file_path}: {e}")
        
        # Supprimer le message
        await db.chat_messages.delete_one({"id": message.get("id")})
        deleted_count += 1
    
    logger.info(f"Nettoyage chat: {deleted_count} messages et {deleted_files} fichiers supprimés")
    
    return {
        "success": True,
        "deleted_messages": deleted_count,
        "deleted_files": deleted_files
    }
