"""
Définitions des événements temps réel pour toutes les entités
Standardisation des types d'événements
"""

from enum import Enum
from typing import Dict, Any


class EventType(str, Enum):
    """Types d'événements standards pour toutes les entités"""
    
    # Événements CRUD de base
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    
    # Événements de statut
    STATUS_CHANGED = "status_changed"
    
    # Événements d'assignation
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    
    # Événements de commentaires
    COMMENT_ADDED = "comment_added"
    
    # Événements de fichiers
    FILE_ATTACHED = "file_attached"
    FILE_REMOVED = "file_removed"
    
    # Événements de connexion
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CONNECTED = "connected"


class EntityType(str, Enum):
    """Types d'entités supportés par le système temps réel"""
    
    # Principales entités
    WORK_ORDERS = "work_orders"
    INTERVENTION_REQUESTS = "intervention_requests"
    IMPROVEMENT_REQUESTS = "improvement_requests"
    IMPROVEMENTS = "improvements"
    PREVENTIVE_MAINTENANCE = "preventive_maintenance"
    EQUIPMENTS = "equipments"
    INVENTORY = "inventory"
    PURCHASE_REQUESTS = "purchase_requests"
    ZONES = "zones"
    COUNTERS = "counters"
    SURVEILLANCE_PLANS = "surveillance_plans"
    SURVEILLANCE_REPORTS = "surveillance_reports"
    NEAR_MISS = "near_miss"
    NEAR_MISS_REPORTS = "near_miss_reports"
    DOCUMENTATIONS = "documentations"
    REPORTS = "reports"
    TEAMS = "teams"
    PLANNING = "planning"
    SUPPLIERS = "suppliers"
    PURCHASE_HISTORY = "purchase_history"
    DASHBOARD = "dashboard"


def create_event(event_type: EventType, entity_type: EntityType, data: Any, user_id: str = None) -> Dict:
    """
    Créer un événement standardisé
    
    Args:
        event_type: Type d'événement
        entity_type: Type d'entité
        data: Données de l'événement
        user_id: ID de l'utilisateur qui a déclenché l'événement
    
    Returns:
        Dict avec la structure standardisée de l'événement
    """
    from datetime import datetime, timezone
    
    return {
        "type": event_type.value,
        "entity_type": entity_type.value,
        "data": data,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Événements spécifiques pour Work Orders
class WorkOrderEvent:
    """Événements spécifiques aux ordres de travail"""
    
    @staticmethod
    def created(work_order: Dict, user_id: str = None):
        return create_event(EventType.CREATED, EntityType.WORK_ORDERS, work_order, user_id)
    
    @staticmethod
    def updated(work_order: Dict, user_id: str = None):
        return create_event(EventType.UPDATED, EntityType.WORK_ORDERS, work_order, user_id)
    
    @staticmethod
    def deleted(work_order_id: str, user_id: str = None):
        return create_event(EventType.DELETED, EntityType.WORK_ORDERS, {"id": work_order_id}, user_id)
    
    @staticmethod
    def status_changed(work_order_id: str, old_status: str, new_status: str, user_id: str = None):
        return create_event(
            EventType.STATUS_CHANGED, 
            EntityType.WORK_ORDERS, 
            {"id": work_order_id, "old_status": old_status, "new_status": new_status},
            user_id
        )
    
    @staticmethod
    def assigned(work_order_id: str, assignee_id: str, assignee_name: str, user_id: str = None):
        return create_event(
            EventType.ASSIGNED,
            EntityType.WORK_ORDERS,
            {"id": work_order_id, "assignee_id": assignee_id, "assignee_name": assignee_name},
            user_id
        )
