from fastapi import WebSocket
from typing import Dict, List, Set
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gestionnaire de connexions WebSocket pour le chat (multi-connexions par utilisateur)"""
    
    def __init__(self):
        # Connexions actives : {user_id: [WebSocket, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Historique des connexions pour debug
        self.connection_history: List[Dict] = []
    
    async def connect(self, websocket: WebSocket, user_id: str, user_name: str):
        """Accepter une nouvelle connexion WebSocket"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        connection_info = {
            "user_id": user_id,
            "user_name": user_name,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "action": "connected"
        }
        self.connection_history.append(connection_info)
        logger.info(f"WebSocket connecté: {user_name} (ID: {user_id}, total: {len(self.active_connections[user_id])})")
        
        # Notifier tous les autres utilisateurs (uniquement si c'est la première connexion)
        if len(self.active_connections[user_id]) == 1:
            await self.broadcast_user_status(user_id, user_name, "online")
    
    def disconnect(self, user_id: str, user_name: str = "Unknown", websocket: WebSocket = None):
        """Déconnecter un utilisateur (une connexion spécifique ou toutes)"""
        if user_id not in self.active_connections:
            return
        
        if websocket:
            # Retirer uniquement cette connexion
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        else:
            # Retirer toutes les connexions
            del self.active_connections[user_id]
        
        disconnection_info = {
            "user_id": user_id,
            "user_name": user_name,
            "disconnected_at": datetime.now(timezone.utc).isoformat(),
            "action": "disconnected"
        }
        self.connection_history.append(disconnection_info)
        logger.info(f"WebSocket déconnecté: {user_name} (ID: {user_id})")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Envoyer un message à toutes les connexions d'un utilisateur"""
        if user_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Erreur envoi message à {user_id}: {e}")
                dead.append(ws)
        for ws in dead:
            self.active_connections[user_id] = [
                w for w in self.active_connections.get(user_id, []) if w != ws
            ]
        if user_id in self.active_connections and not self.active_connections[user_id]:
            del self.active_connections[user_id]
    
    async def broadcast(self, message: dict, exclude_user_id: str = None):
        """Diffuser un message à tous les utilisateurs connectés"""
        disconnected_users = []
        
        for user_id, websockets in list(self.active_connections.items()):
            if user_id == exclude_user_id:
                continue
            dead = []
            for ws in websockets:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Erreur broadcast à {user_id}: {e}")
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id] = [
                    w for w in self.active_connections.get(user_id, []) if w != ws
                ]
            if user_id in self.active_connections and not self.active_connections[user_id]:
                disconnected_users.append(user_id)
        
        for user_id in disconnected_users:
            if user_id in self.active_connections:
                del self.active_connections[user_id]
    
    async def send_to_users(self, message: dict, user_ids: List[str]):
        """Envoyer un message à une liste d'utilisateurs spécifiques"""
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    async def broadcast_user_status(self, user_id: str, user_name: str, status: str):
        """Diffuser le changement de statut d'un utilisateur"""
        message = {
            "type": "user_status",
            "user_id": user_id,
            "user_name": user_name,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast(message, exclude_user_id=user_id)
    
    def get_online_users(self) -> List[str]:
        """Retourner la liste des user_ids connectés"""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Vérifier si un utilisateur est connecté"""
        return user_id in self.active_connections

# Instance globale
manager = ConnectionManager()
