"""
WebSocket Manager pour le Tableau d'affichage
Gère la synchronisation temps réel entre les utilisateurs
"""

import asyncio
import json
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class WhiteboardConnectionManager:
    """Gestionnaire de connexions WebSocket pour le tableau d'affichage"""
    
    def __init__(self):
        # Connexions actives par tableau: {board_id: {user_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            "board_1": {},
            "board_2": {}
        }
        # Utilisateurs connectés: {user_id: user_info}
        self.connected_users: Dict[str, dict] = {}
        # Lock pour les opérations thread-safe
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, board_id: str, user_id: str, user_name: str):
        """Connecte un utilisateur à un tableau"""
        await websocket.accept()
        
        async with self._lock:
            if board_id not in self.active_connections:
                self.active_connections[board_id] = {}
            
            # Déconnecter l'ancienne connexion si elle existe
            if user_id in self.active_connections[board_id]:
                try:
                    old_ws = self.active_connections[board_id][user_id]
                    await old_ws.close()
                except:
                    pass
            
            self.active_connections[board_id][user_id] = websocket
            self.connected_users[user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "board_id": board_id,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }
        
        logger.info(f"Utilisateur {user_name} ({user_id}) connecté au tableau {board_id}")
        
        # Notifier les autres utilisateurs
        await self.broadcast_to_board(board_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)
        
        # Envoyer la liste des utilisateurs connectés
        await self.send_connected_users(board_id)
    
    async def disconnect(self, board_id: str, user_id: str):
        """Déconnecte un utilisateur d'un tableau"""
        user_name = self.connected_users.get(user_id, {}).get("user_name", "Inconnu")
        
        async with self._lock:
            if board_id in self.active_connections:
                self.active_connections[board_id].pop(user_id, None)
            self.connected_users.pop(user_id, None)
        
        logger.info(f"Utilisateur {user_name} ({user_id}) déconnecté du tableau {board_id}")
        
        # Notifier les autres utilisateurs
        await self.broadcast_to_board(board_id, {
            "type": "user_left",
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Mettre à jour la liste des utilisateurs
        await self.send_connected_users(board_id)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Envoie un message à un utilisateur spécifique"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Erreur envoi message personnel: {e}")
    
    async def broadcast_to_board(self, board_id: str, message: dict, exclude_user: Optional[str] = None):
        """Diffuse un message à tous les utilisateurs d'un tableau"""
        if board_id not in self.active_connections:
            return
        
        disconnected = []
        
        for user_id, websocket in self.active_connections[board_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Erreur broadcast à {user_id}: {e}")
                disconnected.append(user_id)
        
        # Nettoyer les connexions mortes
        for user_id in disconnected:
            await self.disconnect(board_id, user_id)
    
    async def broadcast_to_all(self, message: dict):
        """Diffuse un message à tous les tableaux"""
        for board_id in self.active_connections:
            await self.broadcast_to_board(board_id, message)
    
    async def send_connected_users(self, board_id: str):
        """Envoie la liste des utilisateurs connectés à un tableau"""
        users = []
        if board_id in self.active_connections:
            for user_id in self.active_connections[board_id]:
                if user_id in self.connected_users:
                    users.append({
                        "user_id": user_id,
                        "user_name": self.connected_users[user_id].get("user_name", "Inconnu")
                    })
        
        await self.broadcast_to_board(board_id, {
            "type": "users_list",
            "users": users,
            "count": len(users)
        })
    
    def get_connected_count(self, board_id: str) -> int:
        """Retourne le nombre d'utilisateurs connectés à un tableau"""
        if board_id in self.active_connections:
            return len(self.active_connections[board_id])
        return 0
    
    def get_all_connected_users(self) -> list:
        """Retourne tous les utilisateurs connectés"""
        return list(self.connected_users.values())

# Instance globale du gestionnaire
whiteboard_manager = WhiteboardConnectionManager()

async def handle_whiteboard_message(websocket: WebSocket, board_id: str, user_id: str, user_name: str, message: dict, db):
    """Traite les messages WebSocket du tableau d'affichage"""
    msg_type = message.get("type")
    
    if msg_type == "draw":
        # Un utilisateur dessine
        await whiteboard_manager.broadcast_to_board(board_id, {
            "type": "draw",
            "data": message.get("data"),
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)
    
    elif msg_type == "object_added":
        # Un objet a été ajouté
        object_data = message.get("object")
        object_id = message.get("object_id", str(uuid4()))
        
        # Sauvegarder en base
        await save_object_to_db(db, board_id, "add", object_id, object_data, user_id, user_name)
        
        await whiteboard_manager.broadcast_to_board(board_id, {
            "type": "object_added",
            "object": object_data,
            "object_id": object_id,
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)
    
    elif msg_type == "object_modified":
        # Un objet a été modifié
        object_data = message.get("object")
        object_id = message.get("object_id")
        
        # Sauvegarder en base
        await save_object_to_db(db, board_id, "modify", object_id, object_data, user_id, user_name)
        
        await whiteboard_manager.broadcast_to_board(board_id, {
            "type": "object_modified",
            "object": object_data,
            "object_id": object_id,
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)
    
    elif msg_type == "object_removed":
        # Un objet a été supprimé
        object_id = message.get("object_id")
        
        # Sauvegarder en base
        await save_object_to_db(db, board_id, "remove", object_id, None, user_id, user_name)
        
        await whiteboard_manager.broadcast_to_board(board_id, {
            "type": "object_removed",
            "object_id": object_id,
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_user=user_id)
    
    elif msg_type == "cursor_move":
        # Position du curseur de l'utilisateur
        await whiteboard_manager.broadcast_to_board(board_id, {
            "type": "cursor_move",
            "x": message.get("x"),
            "y": message.get("y"),
            "user_id": user_id,
            "user_name": user_name
        }, exclude_user=user_id)
    
    elif msg_type == "sync_request":
        # Demande de synchronisation de l'état du tableau
        board = await db.whiteboards.find_one({"board_id": board_id}, {"_id": 0})
        if board:
            await whiteboard_manager.send_personal(websocket, {
                "type": "sync_response",
                "board": board
            })
    
    elif msg_type == "full_sync":
        # Synchronisation complète du canvas (sauvegarde)
        objects = message.get("objects", [])
        now = datetime.now(timezone.utc).isoformat()
        
        await db.whiteboards.update_one(
            {"board_id": board_id},
            {
                "$set": {
                    "objects": objects,
                    "last_modified": now,
                    "last_modified_by": user_id,
                    "last_modified_by_name": user_name
                },
                "$inc": {"version": 1}
            },
            upsert=True
        )

from uuid import uuid4

async def save_object_to_db(db, board_id: str, action: str, object_id: str, object_data: dict, user_id: str, user_name: str):
    """Sauvegarde une modification d'objet en base de données"""
    now = datetime.now(timezone.utc).isoformat()
    
    if action == "add" and object_data:
        # Ajouter l'objet au tableau
        await db.whiteboards.update_one(
            {"board_id": board_id},
            {
                "$push": {
                    "objects": {
                        "id": object_id,
                        **object_data,
                        "created_by": user_id,
                        "created_by_name": user_name,
                        "created_at": now
                    }
                },
                "$set": {
                    "last_modified": now,
                    "last_modified_by": user_id
                },
                "$inc": {"version": 1}
            }
        )
    
    elif action == "modify" and object_data:
        # Modifier l'objet
        await db.whiteboards.update_one(
            {"board_id": board_id, "objects.id": object_id},
            {
                "$set": {
                    "objects.$": {
                        "id": object_id,
                        **object_data,
                        "modified_by": user_id,
                        "modified_by_name": user_name,
                        "modified_at": now
                    },
                    "last_modified": now,
                    "last_modified_by": user_id
                },
                "$inc": {"version": 1}
            }
        )
    
    elif action == "remove":
        # Supprimer l'objet
        await db.whiteboards.update_one(
            {"board_id": board_id},
            {
                "$pull": {"objects": {"id": object_id}},
                "$set": {
                    "last_modified": now,
                    "last_modified_by": user_id
                },
                "$inc": {"version": 1}
            }
        )
    
    # Journaliser l'action
    await db.whiteboard_history.insert_one({
        "id": str(uuid4()),
        "board_id": board_id,
        "action": action,
        "object_id": object_id,
        "user_id": user_id,
        "user_name": user_name,
        "timestamp": now
    })
