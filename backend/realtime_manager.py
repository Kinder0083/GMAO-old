"""
WebSocket Manager Central Réutilisable
Gère les connexions WebSocket pour toutes les entités de l'application
"""

from fastapi import WebSocket
from typing import Dict, Set, Optional, Any
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class RealtimeManager:
    """
    Manager central pour gérer les connexions WebSocket par entité
    Architecture: Une room par type d'entité
    """
    
    def __init__(self):
        # Structure: {entity_type: {user_id: WebSocket}}
        self.connections: Dict[str, Dict[str, WebSocket]] = {}
        # Compteur de connexions
        self.connection_counts: Dict[str, int] = {}
        
    async def connect(self, entity_type: str, user_id: str, websocket: WebSocket):
        """
        Connecter un utilisateur à une room d'entité
        
        Args:
            entity_type: Type d'entité (work_orders, equipments, etc.)
            user_id: ID de l'utilisateur
            websocket: WebSocket connection
        """
        await websocket.accept()
        
        # Initialiser la room si nécessaire
        if entity_type not in self.connections:
            self.connections[entity_type] = {}
            self.connection_counts[entity_type] = 0
        
        # Ajouter la connexion
        self.connections[entity_type][user_id] = websocket
        self.connection_counts[entity_type] += 1
        
        logger.info(f"[Realtime] User {user_id} connecté à {entity_type}. Total: {self.connection_counts[entity_type]}")
        
        # Envoyer confirmation de connexion
        await self.send_to_user(entity_type, user_id, {
            "type": "connected",
            "entity_type": entity_type,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_users": self.connection_counts[entity_type]
        })
        
        # Notifier les autres utilisateurs
        await self.broadcast(entity_type, {
            "type": "user_joined",
            "entity_type": entity_type,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_users": self.connection_counts[entity_type]
        }, exclude_user=user_id)
    
    def disconnect(self, entity_type: str, user_id: str):
        """
        Déconnecter un utilisateur d'une room
        """
        if entity_type in self.connections and user_id in self.connections[entity_type]:
            del self.connections[entity_type][user_id]
            self.connection_counts[entity_type] -= 1
            
            logger.info(f"[Realtime] User {user_id} déconnecté de {entity_type}. Total: {self.connection_counts[entity_type]}")
            
            # Nettoyer la room si vide
            if self.connection_counts[entity_type] == 0:
                del self.connections[entity_type]
                del self.connection_counts[entity_type]
    
    async def send_to_user(self, entity_type: str, user_id: str, message: dict):
        """
        Envoyer un message à un utilisateur spécifique
        """
        if entity_type in self.connections and user_id in self.connections[entity_type]:
            try:
                await self.connections[entity_type][user_id].send_json(message)
            except Exception as e:
                logger.error(f"[Realtime] Erreur envoi à {user_id}: {e}")
                self.disconnect(entity_type, user_id)
    
    async def broadcast(self, entity_type: str, message: dict, exclude_user: Optional[str] = None):
        """
        Broadcaster un message à tous les utilisateurs d'une room
        
        Args:
            entity_type: Type d'entité
            message: Message à envoyer
            exclude_user: ID utilisateur à exclure (optionnel)
        """
        if entity_type not in self.connections:
            return
        
        disconnected_users = []
        
        for user_id, websocket in self.connections[entity_type].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"[Realtime] Erreur broadcast à {user_id}: {e}")
                disconnected_users.append(user_id)
        
        # Nettoyer les connexions mortes
        for user_id in disconnected_users:
            self.disconnect(entity_type, user_id)
    
    async def emit_event(self, entity_type: str, event_type: str, data: Any, user_id: Optional[str] = None):
        """
        Émettre un événement à tous les utilisateurs connectés
        
        Args:
            entity_type: Type d'entité (work_orders, equipments, etc.)
            event_type: Type d'événement (created, updated, deleted, etc.)
            data: Données de l'événement
            user_id: ID de l'utilisateur qui a déclenché l'événement (pour exclure)
        """
        message = {
            "type": event_type,
            "entity_type": entity_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.broadcast(entity_type, message, exclude_user=user_id)
        
        logger.info(f"[Realtime] Event {event_type} émis pour {entity_type}")
    
    def get_connected_users(self, entity_type: str) -> list:
        """
        Obtenir la liste des utilisateurs connectés à une room
        """
        if entity_type not in self.connections:
            return []
        
        return list(self.connections[entity_type].keys())
    
    def get_connection_count(self, entity_type: str) -> int:
        """
        Obtenir le nombre d'utilisateurs connectés à une room
        """
        return self.connection_counts.get(entity_type, 0)


# Instance globale du manager
realtime_manager = RealtimeManager()
