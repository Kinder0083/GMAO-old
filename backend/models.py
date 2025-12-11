from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime, timezone
from enum import Enum
import re
import uuid

# Enums
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    TECHNICIEN = "TECHNICIEN"
    VISUALISEUR = "VISUALISEUR"
    DIRECTEUR = "DIRECTEUR"
    QHSE = "QHSE"
    RSP_PROD = "RSP_PROD"
    PROD = "PROD"
    INDUS = "INDUS"
    LOGISTIQUE = "LOGISTIQUE"
    LABO = "LABO"
    ADV = "ADV"

# Permission Models
class ModulePermission(BaseModel):
    view: bool = False
    edit: bool = False
    delete: bool = False

class UserPermissions(BaseModel):
    dashboard: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    interventionRequests: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    workOrders: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    improvementRequests: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    improvements: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    preventiveMaintenance: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    planningMprev: ModulePermission = ModulePermission(view=True, edit=False, delete=False)  # Planning M.Prev.
    assets: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    inventory: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    locations: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    meters: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    surveillance: ModulePermission = ModulePermission(view=True, edit=False, delete=False)  # Plan de Surveillance
    surveillanceRapport: ModulePermission = ModulePermission(view=True, edit=False, delete=False)  # Rapport Surveillance
    presquaccident: ModulePermission = ModulePermission(view=True, edit=False, delete=False)  # Presqu'accident
    presquaccidentRapport: ModulePermission = ModulePermission(view=True, edit=False, delete=False)  # Rapport P.accident
    documentations: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    vendors: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    reports: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    people: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    planning: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    purchaseHistory: ModulePermission = ModulePermission(view=True, edit=False, delete=False)
    importExport: ModulePermission = ModulePermission(view=False, edit=False, delete=False)
    journal: ModulePermission = ModulePermission(view=False, edit=False, delete=False)  # Audit
    settings: ModulePermission = ModulePermission(view=False, edit=False, delete=False)  # Paramètres
    personalization: ModulePermission = ModulePermission(view=True, edit=True, delete=False)  # Personnalisation
    chatLive: ModulePermission = ModulePermission(view=True, edit=True, delete=False)  # Chat Live

# Fonction helper pour obtenir les permissions par défaut selon le rôle
def get_default_permissions_by_role(role: str) -> UserPermissions:
    """Retourne les permissions par défaut selon le rôle de l'utilisateur"""
    
    # Permissions complètes pour ADMIN
    if role == "ADMIN":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=True, delete=True),
            interventionRequests=ModulePermission(view=True, edit=True, delete=True),
            workOrders=ModulePermission(view=True, edit=True, delete=True),
            improvementRequests=ModulePermission(view=True, edit=True, delete=True),
            improvements=ModulePermission(view=True, edit=True, delete=True),
            preventiveMaintenance=ModulePermission(view=True, edit=True, delete=True),
            planningMprev=ModulePermission(view=True, edit=True, delete=True),
            assets=ModulePermission(view=True, edit=True, delete=True),
            inventory=ModulePermission(view=True, edit=True, delete=True),
            locations=ModulePermission(view=True, edit=True, delete=True),
            meters=ModulePermission(view=True, edit=True, delete=True),
            surveillance=ModulePermission(view=True, edit=True, delete=True),
            surveillanceRapport=ModulePermission(view=True, edit=True, delete=True),
            presquaccident=ModulePermission(view=True, edit=True, delete=True),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=True),
            documentations=ModulePermission(view=True, edit=True, delete=True),
            vendors=ModulePermission(view=True, edit=True, delete=True),
            reports=ModulePermission(view=True, edit=True, delete=True),
            people=ModulePermission(view=True, edit=True, delete=True),
            planning=ModulePermission(view=True, edit=True, delete=True),
            purchaseHistory=ModulePermission(view=True, edit=True, delete=True),
            importExport=ModulePermission(view=True, edit=True, delete=True),
            journal=ModulePermission(view=True, edit=False, delete=False),
            settings=ModulePermission(view=True, edit=True, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=True)
        )
    
    # DIRECTEUR : Demande d'inter./Demandes d'amél. en visualisation et modification
    # Ordres de travail/Améliorations/Maintenance prev./Compteurs/Historique Achat en visualisation seulement
    elif role == "DIRECTEUR":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=True, edit=False, delete=False),
            improvementRequests=ModulePermission(view=True, edit=True, delete=False),
            improvements=ModulePermission(view=True, edit=False, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            planningMprev=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=False, delete=False),
            inventory=ModulePermission(view=True, edit=False, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=True, edit=False, delete=False),
            surveillance=ModulePermission(view=True, edit=False, delete=False),
            surveillanceRapport=ModulePermission(view=True, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=True, delete=False),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=False),
            documentations=ModulePermission(view=True, edit=True, delete=False),
            vendors=ModulePermission(view=True, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=True, edit=False, delete=False),
            planning=ModulePermission(view=True, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=True, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # QHSE : Demande d'inter./Demandes d'amél. en visualisation et modification
    # Ordres de travail/Améliorations/Compteurs en visualisation seulement
    # QHSE a accès complet au Plan de Surveillance et Presqu'accident (view + edit + delete)
    elif role == "QHSE":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=True, edit=False, delete=False),
            improvementRequests=ModulePermission(view=True, edit=True, delete=False),
            improvements=ModulePermission(view=True, edit=False, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            planningMprev=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=False, delete=False),
            inventory=ModulePermission(view=True, edit=False, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=True, edit=False, delete=False),
            surveillance=ModulePermission(view=True, edit=True, delete=True),
            surveillanceRapport=ModulePermission(view=True, edit=True, delete=True),
            presquaccident=ModulePermission(view=True, edit=True, delete=True),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=True),
            documentations=ModulePermission(view=True, edit=True, delete=True),
            vendors=ModulePermission(view=False, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=False, edit=False, delete=False),
            planning=ModulePermission(view=False, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=False, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # LABO et ADV : Demande d'inter. en visualisation et modification
    # Fournisseurs/Compteurs/Historique Achat en visualisation seulement
    elif role in ["LABO", "ADV"]:
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=False, edit=False, delete=False),
            improvementRequests=ModulePermission(view=False, edit=False, delete=False),
            improvements=ModulePermission(view=False, edit=False, delete=False),
            preventiveMaintenance=ModulePermission(view=False, edit=False, delete=False),
            assets=ModulePermission(view=False, edit=False, delete=False),
            inventory=ModulePermission(view=False, edit=False, delete=False),
            locations=ModulePermission(view=False, edit=False, delete=False),
            meters=ModulePermission(view=True, edit=False, delete=False),
            surveillance=ModulePermission(view=False, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=True, delete=False),
            documentations=ModulePermission(view=True, edit=True, delete=False),
            vendors=ModulePermission(view=True, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=False, edit=False, delete=False),
            planning=ModulePermission(view=False, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=True, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # PROD (RSP_PROD et PROD) : Demande d'inter./Demandes d'amél./Ordres de travail/Améliorations/Equipement en visualisation et modification
    # Inventaire/Maintenance prev. en visualisation seulement
    elif role in ["RSP_PROD", "PROD"]:
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=True, edit=True, delete=False),
            improvementRequests=ModulePermission(view=True, edit=True, delete=False),
            improvements=ModulePermission(view=True, edit=True, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=True, delete=False),
            inventory=ModulePermission(view=True, edit=False, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=False, edit=False, delete=False),
            surveillance=ModulePermission(view=False, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=True, delete=False),
            documentations=ModulePermission(view=True, edit=True, delete=False),
            vendors=ModulePermission(view=False, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=False, edit=False, delete=False),
            planning=ModulePermission(view=False, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=False, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # INDUS : Demande d'inter./Demandes d'amél./Ordres de travail/Améliorations/Equipement en visualisation et modification
    # Inventaire/Maintenance prev./Compteurs en visualisation seulement
    elif role == "INDUS":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=True, edit=True, delete=False),
            improvementRequests=ModulePermission(view=True, edit=True, delete=False),
            improvements=ModulePermission(view=True, edit=True, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            planningMprev=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=True, delete=False),
            inventory=ModulePermission(view=True, edit=False, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=True, edit=False, delete=False),
            surveillance=ModulePermission(view=False, edit=False, delete=False),
            surveillanceRapport=ModulePermission(view=False, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=True, delete=False),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=False),
            documentations=ModulePermission(view=True, edit=True, delete=False),
            vendors=ModulePermission(view=False, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=False, edit=False, delete=False),
            planning=ModulePermission(view=False, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=False, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # LOGISTIQUE : Même que PROD mais peut-être avec accès Fournisseurs
    elif role == "LOGISTIQUE":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=False),
            workOrders=ModulePermission(view=True, edit=True, delete=False),
            improvementRequests=ModulePermission(view=True, edit=True, delete=False),
            improvements=ModulePermission(view=True, edit=True, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            planningMprev=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=True, delete=False),
            inventory=ModulePermission(view=True, edit=True, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=False, edit=False, delete=False),
            surveillance=ModulePermission(view=False, edit=False, delete=False),
            surveillanceRapport=ModulePermission(view=False, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=True, delete=False),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=False),
            documentations=ModulePermission(view=True, edit=True, delete=False),
            vendors=ModulePermission(view=True, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=False, edit=False, delete=False),
            planning=ModulePermission(view=False, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=True, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # TECHNICIEN : Permissions complètes sur les modules opérationnels
    elif role == "TECHNICIEN":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=True, delete=True),
            workOrders=ModulePermission(view=True, edit=True, delete=True),
            improvementRequests=ModulePermission(view=True, edit=True, delete=True),
            improvements=ModulePermission(view=True, edit=True, delete=True),
            preventiveMaintenance=ModulePermission(view=True, edit=True, delete=True),
            planningMprev=ModulePermission(view=True, edit=True, delete=True),
            assets=ModulePermission(view=True, edit=True, delete=True),
            inventory=ModulePermission(view=True, edit=True, delete=True),
            locations=ModulePermission(view=True, edit=True, delete=True),
            meters=ModulePermission(view=True, edit=True, delete=True),
            surveillance=ModulePermission(view=True, edit=True, delete=True),
            surveillanceRapport=ModulePermission(view=True, edit=True, delete=True),
            presquaccident=ModulePermission(view=True, edit=True, delete=True),
            presquaccidentRapport=ModulePermission(view=True, edit=True, delete=True),
            documentations=ModulePermission(view=True, edit=True, delete=True),
            vendors=ModulePermission(view=True, edit=True, delete=True),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=True, edit=False, delete=False),
            planning=ModulePermission(view=True, edit=True, delete=False),
            purchaseHistory=ModulePermission(view=True, edit=True, delete=True),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=True, delete=False)
        )
    
    # VISUALISEUR : Visualisation uniquement sur tout
    elif role == "VISUALISEUR":
        return UserPermissions(
            dashboard=ModulePermission(view=True, edit=False, delete=False),
            interventionRequests=ModulePermission(view=True, edit=False, delete=False),
            workOrders=ModulePermission(view=True, edit=False, delete=False),
            improvementRequests=ModulePermission(view=True, edit=False, delete=False),
            improvements=ModulePermission(view=True, edit=False, delete=False),
            preventiveMaintenance=ModulePermission(view=True, edit=False, delete=False),
            planningMprev=ModulePermission(view=True, edit=False, delete=False),
            assets=ModulePermission(view=True, edit=False, delete=False),
            inventory=ModulePermission(view=True, edit=False, delete=False),
            locations=ModulePermission(view=True, edit=False, delete=False),
            meters=ModulePermission(view=True, edit=False, delete=False),
            surveillance=ModulePermission(view=True, edit=False, delete=False),
            surveillanceRapport=ModulePermission(view=True, edit=False, delete=False),
            presquaccident=ModulePermission(view=True, edit=False, delete=False),
            presquaccidentRapport=ModulePermission(view=True, edit=False, delete=False),
            documentations=ModulePermission(view=True, edit=False, delete=False),
            vendors=ModulePermission(view=True, edit=False, delete=False),
            reports=ModulePermission(view=True, edit=False, delete=False),
            people=ModulePermission(view=True, edit=False, delete=False),
            planning=ModulePermission(view=True, edit=False, delete=False),
            purchaseHistory=ModulePermission(view=True, edit=False, delete=False),
            importExport=ModulePermission(view=False, edit=False, delete=False),
            settings=ModulePermission(view=False, edit=False, delete=False),
            personalization=ModulePermission(view=True, edit=True, delete=False),
            journal=ModulePermission(view=False, edit=False, delete=False),
            chatLive=ModulePermission(view=True, edit=False, delete=False)
        )
    
    # Par défaut : permissions minimales
    else:
        return UserPermissions()


class WorkOrderStatus(str, Enum):
    OUVERT = "OUVERT"
    EN_COURS = "EN_COURS"
    EN_ATTENTE = "EN_ATTENTE"
    TERMINE = "TERMINE"

class Priority(str, Enum):
    HAUTE = "HAUTE"
    MOYENNE = "MOYENNE"
    NORMALE = "NORMALE"
    BASSE = "BASSE"
    AUCUNE = "AUCUNE"

class WorkOrderCategory(str, Enum):
    CHANGEMENT_FORMAT = "CHANGEMENT_FORMAT"
    TRAVAUX_PREVENTIFS = "TRAVAUX_PREVENTIFS"
    TRAVAUX_CURATIF = "TRAVAUX_CURATIF"
    TRAVAUX_DIVERS = "TRAVAUX_DIVERS"
    FORMATION = "FORMATION"
    REGLAGE = "REGLAGE"

class EquipmentStatus(str, Enum):
    OPERATIONNEL = "OPERATIONNEL"
    EN_MAINTENANCE = "EN_MAINTENANCE"
    HORS_SERVICE = "HORS_SERVICE"
    EN_CT = "EN_CT"
    ALERTE_S_EQUIP = "ALERTE_S_EQUIP"

class Frequency(str, Enum):
    HEBDOMADAIRE = "HEBDOMADAIRE"
    MENSUEL = "MENSUEL"
    TRIMESTRIEL = "TRIMESTRIEL"
    ANNUEL = "ANNUEL"

class PMStatus(str, Enum):
    ACTIF = "ACTIF"
    INACTIF = "INACTIF"

class ActionType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"

class EntityType(str, Enum):
    USER = "USER"
    WORK_ORDER = "WORK_ORDER"
    EQUIPMENT = "EQUIPMENT"
    LOCATION = "LOCATION"
    VENDOR = "VENDOR"
    INVENTORY = "INVENTORY"
    PREVENTIVE_MAINTENANCE = "PREVENTIVE_MAINTENANCE"
    PURCHASE_HISTORY = "PURCHASE_HISTORY"
    IMPROVEMENT_REQUEST = "IMPROVEMENT_REQUEST"
    IMPROVEMENT = "IMPROVEMENT"
    SURVEILLANCE = "SURVEILLANCE"
    PRESQU_ACCIDENT = "PRESQU_ACCIDENT"
    DOCUMENTATION = "DOCUMENTATION"
    SETTINGS = "SETTINGS"
    DEMANDE_ARRET = "DEMANDE_ARRET"

# Audit Log Models
class AuditLog(BaseModel):
    id: str
    timestamp: datetime
    user_id: str
    user_name: str
    user_email: str
    action: ActionType
    entity_type: EntityType
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    changes: Optional[Dict] = None

class AuditLogCreate(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    action: ActionType
    entity_type: EntityType
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    changes: Optional[Dict] = None

# Comment Models
class Comment(BaseModel):
    id: str
    user_id: str
    user_name: str
    text: str
    timestamp: datetime

class CommentCreate(BaseModel):
    text: str

class CommentWithPartsCreate(BaseModel):
    text: str
    parts_used: List['PartUsedCreate'] = []  # Liste des pièces utilisées

# Parts Used Models
class PartUsed(BaseModel):
    id: str
    inventory_item_id: Optional[str] = None  # None si pièce externe (texte libre)
    inventory_item_name: Optional[str] = None  # Nom de la pièce d'inventaire
    custom_part_name: Optional[str] = None  # Nom de pièce externe (texte libre)
    quantity: float  # Quantité utilisée
    source_equipment_id: Optional[str] = None  # ID équipement (si sélectionné)
    source_equipment_name: Optional[str] = None  # Nom équipement
    custom_source: Optional[str] = None  # Source personnalisée (texte libre)
    user_name: Optional[str] = None  # Nom de l'utilisateur qui a ajouté la pièce
    timestamp: datetime

class PartUsedCreate(BaseModel):
    inventory_item_id: Optional[str] = None
    inventory_item_name: Optional[str] = None
    custom_part_name: Optional[str] = None
    quantity: float
    source_equipment_id: Optional[str] = None
    source_equipment_name: Optional[str] = None
    custom_source: Optional[str] = None

# User Models
class UserBase(BaseModel):
    nom: str
    prenom: str
    email: str  # Changé de EmailStr à str pour accepter .local
    telephone: Optional[str] = None
    role: UserRole = UserRole.VISUALISEUR
    service: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class UserCreate(UserBase):
    password: str

class UserInvite(BaseModel):
    nom: str
    prenom: str
    email: str
    telephone: Optional[str] = None
    role: UserRole = UserRole.VISUALISEUR
    service: Optional[str] = None
    permissions: Optional[UserPermissions] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    role: Optional[UserRole] = None
    service: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class UserProfileUpdate(BaseModel):
    """Modèle pour mise à jour du profil utilisateur depuis Settings"""
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    service: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class UserPermissionsUpdate(BaseModel):
    permissions: UserPermissions

class User(UserBase):
    id: str
    statut: str = "actif"
    dateCreation: datetime
    derniereConnexion: Optional[datetime] = None
    permissions: UserPermissions = Field(default_factory=UserPermissions)
    firstLogin: Optional[bool] = False  # True si premier login, nécessite changement de mot de passe

    class Config:
        from_attributes = True

# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class LoginRequest(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()


class ForgotPasswordRequest(BaseModel):
    email: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class CompleteRegistrationRequest(BaseModel):
    token: str
    password: str
    prenom: str
    nom: str
    telephone: Optional[str] = None

class InviteMemberRequest(BaseModel):
    email: str
    role: UserRole
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class CreateMemberRequest(BaseModel):
    email: str
    prenom: str
    nom: str
    role: UserRole
    telephone: Optional[str] = None
    service: Optional[str] = None
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

# Work Order Models
class WorkOrderBase(BaseModel):
    titre: str
    description: str
    statut: WorkOrderStatus = WorkOrderStatus.OUVERT
    priorite: Priority = Priority.AUCUNE
    categorie: Optional[WorkOrderCategory] = None
    equipement_id: Optional[str] = None
    assigne_a_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    dateLimite: Optional[datetime] = None
    tempsEstime: Optional[float] = None
    createdBy: Optional[str] = None  # ID de l'utilisateur créateur

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrderUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    statut: Optional[WorkOrderStatus] = None
    priorite: Optional[Priority] = None
    categorie: Optional[WorkOrderCategory] = None
    equipement_id: Optional[str] = None
    assigne_a_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    dateLimite: Optional[datetime] = None
    tempsEstime: Optional[float] = None
    tempsReel: Optional[float] = None


class AddTimeSpent(BaseModel):
    hours: int
    minutes: int

class WorkOrder(WorkOrderBase):
    id: str
    numero: str
    tempsReel: Optional[float] = None
    dateCreation: datetime
    dateTermine: Optional[datetime] = None
    equipement: Optional[dict] = None
    assigneA: Optional[dict] = None
    emplacement: Optional[dict] = None
    attachments: List[dict] = []
    comments: List[Comment] = []
    parts_used: List[PartUsed] = []  # Pièces utilisées
    createdByName: Optional[str] = None

    class Config:
        from_attributes = True

# Attachment Model
class AttachmentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    size: int
    mime_type: str
    uploaded_at: datetime
    url: str

# Equipment Models
class EquipmentBase(BaseModel):
    nom: str
    categorie: Optional[str] = None
    emplacement_id: str
    statut: EquipmentStatus = EquipmentStatus.OPERATIONNEL
    dateAchat: Optional[datetime] = None
    coutAchat: Optional[float] = None
    numeroSerie: Optional[str] = None
    anneeFabrication: Optional[int] = None
    garantie: Optional[str] = None
    parent_id: Optional[str] = None

class EquipmentCreate(BaseModel):
    nom: str
    categorie: Optional[str] = None
    emplacement_id: Optional[str] = None  # Optional to allow inheritance from parent
    statut: EquipmentStatus = EquipmentStatus.OPERATIONNEL
    dateAchat: Optional[datetime] = None
    coutAchat: Optional[float] = None
    numeroSerie: Optional[str] = None
    anneeFabrication: Optional[int] = None
    garantie: Optional[str] = None
    parent_id: Optional[str] = None

class EquipmentUpdate(BaseModel):
    nom: Optional[str] = None
    categorie: Optional[str] = None
    emplacement_id: Optional[str] = None
    statut: Optional[EquipmentStatus] = None
    dateAchat: Optional[datetime] = None
    coutAchat: Optional[float] = None
    numeroSerie: Optional[str] = None
    anneeFabrication: Optional[int] = None
    garantie: Optional[str] = None
    derniereMaintenance: Optional[datetime] = None
    parent_id: Optional[str] = None

class Equipment(EquipmentBase):
    id: str
    derniereMaintenance: Optional[datetime] = None
    dateCreation: datetime
    emplacement: Optional[dict] = None
    parent: Optional[dict] = None
    hasChildren: bool = False
    createdBy: Optional[str] = None  # ID de l'utilisateur créateur

    class Config:
        from_attributes = True

# Location Models (renommées en Zone)
class LocationBase(BaseModel):
    nom: str
    adresse: Optional[str] = None
    ville: Optional[str] = None
    codePostal: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None  # Pour hiérarchie (sous-zones)

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    codePostal: Optional[str] = None
    type: Optional[str] = None
    parent_id: Optional[str] = None

class Location(LocationBase):
    id: str
    dateCreation: datetime
    parent: Optional[dict] = None  # Informations de la zone parente
    hasChildren: bool = False  # Indique si cette zone a des sous-zones
    level: int = 0  # Niveau dans la hiérarchie (0 = racine, 1 = sous-zone, 2 = sous-sous-zone)

    class Config:
        from_attributes = True

# Inventory Models
class InventoryBase(BaseModel):
    nom: str
    reference: str
    categorie: str
    quantite: int
    quantiteMin: int
    prixUnitaire: float
    fournisseur: str
    emplacement: str

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    nom: Optional[str] = None
    reference: Optional[str] = None
    categorie: Optional[str] = None
    quantite: Optional[int] = None
    quantiteMin: Optional[int] = None
    prixUnitaire: Optional[float] = None
    fournisseur: Optional[str] = None
    emplacement: Optional[str] = None

class Inventory(InventoryBase):
    id: str
    dateCreation: datetime
    derniereModification: datetime

    class Config:
        from_attributes = True

# Preventive Maintenance Models
class PreventiveMaintenanceBase(BaseModel):
    titre: str
    equipement_id: str
    frequence: Frequency
    prochaineMaintenance: datetime
    assigne_a_id: Optional[str] = None
    duree: float
    statut: PMStatus = PMStatus.ACTIF

class PreventiveMaintenanceCreate(PreventiveMaintenanceBase):
    pass

class PreventiveMaintenanceUpdate(BaseModel):
    titre: Optional[str] = None
    equipement_id: Optional[str] = None
    frequence: Optional[Frequency] = None
    prochaineMaintenance: Optional[datetime] = None
    assigne_a_id: Optional[str] = None
    duree: Optional[float] = None
    statut: Optional[PMStatus] = None
    derniereMaintenance: Optional[datetime] = None

class PreventiveMaintenance(PreventiveMaintenanceBase):
    id: str
    derniereMaintenance: Optional[datetime] = None
    dateCreation: datetime
    equipement: Optional[dict] = None
    assigneA: Optional[dict] = None

    class Config:
        from_attributes = True

# Availability Models
class UserAvailability(BaseModel):
    user_id: str
    date: datetime
    disponible: bool = True
    motif: Optional[str] = None  # Raison de l'indisponibilité (congé, maladie, etc.)

class UserAvailabilityCreate(BaseModel):
    user_id: str
    date: datetime
    disponible: bool = True
    motif: Optional[str] = None

class UserAvailabilityUpdate(BaseModel):
    disponible: Optional[bool] = None
    motif: Optional[str] = None

class UserAvailabilityResponse(UserAvailability):
    id: str
    user: Optional[dict] = None

    class Config:
        from_attributes = True

# Vendor Models
class VendorBase(BaseModel):
    nom: str
    contact: str
    email: str
    telephone: str
    adresse: str
    specialite: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    nom: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    specialite: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Validation basique d'email qui accepte les domaines locaux
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.local$'
        if not re.match(email_pattern, v):
            raise ValueError('Format d\'email invalide')
        return v.lower()

class Vendor(VendorBase):
    id: str
    dateCreation: datetime

    class Config:
        from_attributes = True


# Purchase History Models (Historique Achat)
class PurchaseHistoryBase(BaseModel):
    fournisseur: str
    numeroCommande: str
    numeroReception: Optional[str] = None
    dateCreation: datetime
    article: str
    description: Optional[str] = None
    groupeStatistique: Optional[str] = None
    quantite: float
    montantLigneHT: float
    quantiteRetournee: Optional[float] = 0.0
    site: Optional[str] = None
    creationUser: Optional[str] = None

class PurchaseHistoryCreate(PurchaseHistoryBase):
    pass

class PurchaseHistoryUpdate(BaseModel):
    fournisseur: Optional[str] = None
    numeroCommande: Optional[str] = None
    numeroReception: Optional[str] = None
    dateCreation: Optional[datetime] = None
    article: Optional[str] = None
    description: Optional[str] = None
    groupeStatistique: Optional[str] = None
    quantite: Optional[float] = None
    montantLigneHT: Optional[float] = None
    quantiteRetournee: Optional[float] = None
    site: Optional[str] = None
    creationUser: Optional[str] = None

class PurchaseHistory(PurchaseHistoryBase):
    id: str
    dateEnregistrement: datetime  # Date d'enregistrement dans la BD

    class Config:
        from_attributes = True


# Meter (Compteur) Models
class MeterType(str, Enum):
    EAU = "EAU"  # Eau
    GAZ = "GAZ"  # Gaz
    ELECTRICITE = "ELECTRICITE"  # Électricité
    AIR_COMPRIME = "AIR_COMPRIME"  # Air comprimé
    VAPEUR = "VAPEUR"  # Vapeur
    FUEL = "FUEL"  # Fuel/Mazout
    SOLAIRE = "SOLAIRE"  # Énergie solaire
    AUTRE = "AUTRE"  # Autre

class Meter(BaseModel):
    id: str
    nom: str
    type: MeterType
    numero_serie: Optional[str] = None
    emplacement_id: Optional[str] = None
    emplacement: Optional[Dict] = None
    unite: str  # m³, kWh, L, etc.
    prix_unitaire: Optional[float] = None  # Prix par unité
    abonnement_mensuel: Optional[float] = None  # Abonnement fixe mensuel
    date_creation: datetime
    notes: Optional[str] = None
    actif: bool = True
    
    # MQTT Integration
    mqtt_enabled: bool = False  # Activer la collecte MQTT
    mqtt_topic: Optional[str] = None  # Topic MQTT à écouter
    mqtt_json_path: Optional[str] = None  # Chemin JSON (ex: "value" ou "sensor.temperature")
    mqtt_refresh_interval: int = 5  # Intervalle de collecte en minutes (par défaut 5 min)
    mqtt_last_value: Optional[float] = None  # Dernière valeur reçue
    mqtt_last_update: Optional[str] = None  # Dernière mise à jour MQTT

class MeterCreate(BaseModel):
    nom: str
    type: MeterType
    numero_serie: Optional[str] = None
    emplacement_id: Optional[str] = None
    unite: str = "kWh"
    prix_unitaire: Optional[float] = None
    abonnement_mensuel: Optional[float] = None
    notes: Optional[str] = None
    
    # MQTT Integration
    mqtt_enabled: bool = False
    mqtt_topic: Optional[str] = None
    mqtt_json_path: Optional[str] = None
    mqtt_refresh_interval: int = 5

class MeterUpdate(BaseModel):
    nom: Optional[str] = None
    numero_serie: Optional[str] = None
    emplacement_id: Optional[str] = None
    unite: Optional[str] = None
    prix_unitaire: Optional[float] = None
    abonnement_mensuel: Optional[float] = None
    notes: Optional[str] = None
    actif: Optional[bool] = None
    
    # MQTT Integration
    mqtt_enabled: Optional[bool] = None
    mqtt_topic: Optional[str] = None
    mqtt_json_path: Optional[str] = None
    mqtt_refresh_interval: Optional[int] = None

# Reading (Relevé) Models
class MeterReading(BaseModel):
    id: str
    meter_id: str
    meter_nom: Optional[str] = None
    date_releve: datetime
    valeur: float  # Index du compteur
    notes: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    consommation: Optional[float] = None  # Calculée automatiquement
    cout: Optional[float] = None  # Calculé automatiquement
    prix_unitaire: Optional[float] = None  # Prix au moment du relevé
    abonnement_mensuel: Optional[float] = None  # Abonnement au moment du relevé
    date_creation: datetime

class MeterReadingCreate(BaseModel):
    date_releve: datetime
    valeur: float
    notes: Optional[str] = None
    prix_unitaire: Optional[float] = None
    abonnement_mensuel: Optional[float] = None

class MeterReadingUpdate(BaseModel):
    date_releve: Optional[datetime] = None
    valeur: Optional[float] = None
    notes: Optional[str] = None
    prix_unitaire: Optional[float] = None
    abonnement_mensuel: Optional[float] = None



# Intervention Request (Demande d'intervention) Models
class InterventionRequest(BaseModel):
    id: str
    titre: str
    description: str
    priorite: Priority
    equipement_id: Optional[str] = None
    equipement: Optional[Dict] = None
    emplacement_id: Optional[str] = None
    emplacement: Optional[Dict] = None
    date_limite_desiree: Optional[datetime] = None
    date_creation: datetime
    created_by: str
    created_by_name: Optional[str] = None
    work_order_id: Optional[str] = None  # ID de l'ordre de travail créé
    work_order_numero: Optional[str] = None  # Numéro de l'ordre de travail créé (ex: 5801)
    work_order_date_limite: Optional[datetime] = None  # Date limite de l'ordre créé
    converted_at: Optional[datetime] = None  # Date de conversion
    converted_by: Optional[str] = None  # ID de qui a converti

class InterventionRequestCreate(BaseModel):
    titre: str
    description: str
    priorite: Priority = Priority.AUCUNE
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    date_limite_desiree: Optional[datetime] = None

class InterventionRequestUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    priorite: Optional[Priority] = None
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    date_limite_desiree: Optional[datetime] = None



# Improvement Request (Demande d'amélioration) Models
class ImprovementRequest(BaseModel):
    id: str
    titre: str
    description: str
    priorite: Priority
    equipement_id: Optional[str] = None
    equipement: Optional[Dict] = None
    emplacement_id: Optional[str] = None
    emplacement: Optional[Dict] = None
    date_limite_desiree: Optional[datetime] = None
    date_creation: datetime
    created_by: str
    created_by_name: Optional[str] = None
    improvement_id: Optional[str] = None  # ID de l'amélioration créée
    improvement_numero: Optional[str] = None  # Numéro de l'amélioration créée
    improvement_date_limite: Optional[datetime] = None  # Date limite de l'amélioration créée
    converted_at: Optional[datetime] = None  # Date de conversion
    converted_by: Optional[str] = None  # ID de qui a converti

class ImprovementRequestCreate(BaseModel):
    titre: str
    description: str
    priorite: Priority = Priority.AUCUNE
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    date_limite_desiree: Optional[datetime] = None

class ImprovementRequestUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    priorite: Optional[Priority] = None
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    date_limite_desiree: Optional[datetime] = None

# Improvement (Amélioration) Models - Copie de WorkOrder
class Improvement(BaseModel):
    id: str
    numero: str
    titre: str
    description: str
    statut: WorkOrderStatus
    priorite: Priority
    equipement_id: Optional[str] = None
    equipement: Optional[Dict] = None
    emplacement_id: Optional[str] = None
    emplacement: Optional[Dict] = None
    assigne_a_id: Optional[str] = None
    assigneA: Optional[Dict] = None
    dateLimite: Optional[datetime] = None
    tempsEstime: Optional[int] = None
    tempsReel: Optional[int] = None
    dateCreation: datetime
    dateTermine: Optional[datetime] = None
    createdBy: str
    createdByName: Optional[str] = None
    attachments: Optional[List[Dict]] = []
    comments: Optional[List[Dict]] = []

class ImprovementCreate(BaseModel):
    titre: str
    description: str
    priorite: Priority = Priority.AUCUNE
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    assigne_a_id: Optional[str] = None
    dateLimite: Optional[datetime] = None
    tempsEstime: Optional[int] = None

class ImprovementUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    statut: Optional[WorkOrderStatus] = None
    priorite: Optional[Priority] = None
    equipement_id: Optional[str] = None
    emplacement_id: Optional[str] = None
    assigne_a_id: Optional[str] = None
    dateLimite: Optional[datetime] = None
    tempsEstime: Optional[int] = None
    tempsReel: Optional[int] = None


# ==================== SETTINGS MODELS ====================
class SystemSettings(BaseModel):
    inactivity_timeout_minutes: int = 15  # Temps d'inactivité en minutes avant déconnexion

class SystemSettingsUpdate(BaseModel):
    inactivity_timeout_minutes: Optional[int] = None

# SMTP Configuration Models
class SMTPConfig(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "GMAO Iris"
    smtp_use_tls: bool = True
    frontend_url: str = ""
    backend_url: str = ""

class SMTPConfigUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    frontend_url: Optional[str] = None
    backend_url: Optional[str] = None

class SMTPTestRequest(BaseModel):
    test_email: EmailStr


# Plan de Surveillance Models
class SurveillanceItemStatus(str, Enum):
    PLANIFIER = "PLANIFIER"  # À planifier
    PLANIFIE = "PLANIFIE"    # Planifié mais non réalisé
    REALISE = "REALISE"      # Réalisé

class SurveillanceCategory(str, Enum):
    MMRI = "MMRI"  # Mesures de maîtrise des risques instrumentées
    INCENDIE = "INCENDIE"  # Sécurité incendie
    SECURITE_ENVIRONNEMENT = "SECURITE_ENVIRONNEMENT"  # Sécurité/Environnement
    ELECTRIQUE = "ELECTRIQUE"  # Installations électriques
    MANUTENTION = "MANUTENTION"  # Engins de manutention
    EXTRACTION = "EXTRACTION"  # Extraction des liquides
    AUTRE = "AUTRE"  # Autre

class SurveillanceResponsible(str, Enum):
    MAINT = "MAINT"
    PROD = "PROD"
    QHSE = "QHSE"
    EXTERNE = "EXTERNE"

class SurveillanceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    classe_type: str  # Ex: "Protection incendie", "Installations électriques"
    category: str  # Catégorie dynamique (ex: "INCENDIE", "ELECTRIQUE", etc.)
    batiment: str  # Ex: "BATIMENT 1", "BATIMENT 1 ET 2"
    periodicite: str  # Ex: "6 mois", "1 an", "3 ans"
    responsable: SurveillanceResponsible
    executant: str  # Nom de l'exécutant (entreprise externe ou interne)
    description: Optional[str] = None  # Description détaillée du contrôle
    
    # Dates et suivi
    derniere_visite: Optional[str] = None  # Date ISO ou X
    prochain_controle: Optional[str] = None  # Date ISO
    status: SurveillanceItemStatus = SurveillanceItemStatus.PLANIFIER
    date_realisation: Optional[str] = None  # Date de réalisation effective
    
    # Suivi mensuel (12 mois)
    janvier: bool = False
    fevrier: bool = False
    mars: bool = False
    avril: bool = False
    mai: bool = False
    juin: bool = False
    juillet: bool = False
    aout: bool = False
    septembre: bool = False
    octobre: bool = False
    novembre: bool = False
    decembre: bool = False
    
    # Documents et commentaires
    commentaire: Optional[str] = None
    piece_jointe_url: Optional[str] = None  # URL du fichier uploadé
    piece_jointe_nom: Optional[str] = None  # Nom original du fichier
    
    # Alertes
    alerte_envoyee: bool = False  # True si alerte d'échéance déjà envoyée
    alerte_date: Optional[str] = None  # Date de la dernière alerte
    duree_rappel_echeance: int = 30  # Durée en jours avant échéance pour déclencher l'alerte (défaut: 30)
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class SurveillanceItemCreate(BaseModel):
    classe_type: str
    category: str  # Catégorie dynamique (ex: "INCENDIE", "ELECTRIQUE", etc.)
    batiment: str
    periodicite: str
    responsable: SurveillanceResponsible
    executant: str
    description: Optional[str] = None
    derniere_visite: Optional[str] = None
    prochain_controle: Optional[str] = None
    commentaire: Optional[str] = None
    duree_rappel_echeance: int = 30  # Durée en jours avant échéance pour l'alerte (défaut: 30)

class SurveillanceItemUpdate(BaseModel):
    classe_type: Optional[str] = None
    category: Optional[str] = None  # Catégorie dynamique (ex: "INCENDIE", "ELECTRIQUE", etc.)
    batiment: Optional[str] = None
    periodicite: Optional[str] = None
    responsable: Optional[SurveillanceResponsible] = None
    executant: Optional[str] = None
    description: Optional[str] = None
    derniere_visite: Optional[str] = None
    prochain_controle: Optional[str] = None
    status: Optional[SurveillanceItemStatus] = None
    date_realisation: Optional[str] = None
    janvier: Optional[bool] = None
    fevrier: Optional[bool] = None
    mars: Optional[bool] = None
    avril: Optional[bool] = None
    mai: Optional[bool] = None
    juin: Optional[bool] = None
    juillet: Optional[bool] = None
    aout: Optional[bool] = None
    septembre: Optional[bool] = None
    octobre: Optional[bool] = None
    novembre: Optional[bool] = None
    decembre: Optional[bool] = None
    commentaire: Optional[str] = None
    piece_jointe_url: Optional[str] = None
    piece_jointe_nom: Optional[str] = None
    duree_rappel_echeance: Optional[int] = None  # Durée en jours avant échéance pour l'alerte


# ==================== PRESQU'ACCIDENT (NEAR MISS) MODELS ====================

class PresquAccidentStatus(str, Enum):
    A_TRAITER = "A_TRAITER"  # À traiter
    EN_COURS = "EN_COURS"  # En cours de traitement
    TERMINE = "TERMINE"  # Terminé / Traité
    ARCHIVE = "ARCHIVE"  # Archivé

class PresquAccidentService(str, Enum):
    ADV = "ADV"
    LOGISTIQUE = "LOGISTIQUE"
    PRODUCTION = "PRODUCTION"
    QHSE = "QHSE"
    MAINTENANCE = "MAINTENANCE"
    LABO = "LABO"
    INDUS = "INDUS"
    AUTRE = "AUTRE"

class PresquAccidentSeverity(str, Enum):
    FAIBLE = "FAIBLE"  # Faible
    MOYEN = "MOYEN"  # Moyen
    ELEVE = "ELEVE"  # Élevé
    CRITIQUE = "CRITIQUE"  # Critique

class PresquAccidentItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Informations principales
    titre: str  # Titre court du presqu'accident
    description: str  # Description détaillée / Circonstances
    date_incident: str  # Date ISO de l'incident
    lieu: str  # Lieu de l'incident
    service: PresquAccidentService  # Service concerné
    
    # Personnes impliquées
    personnes_impliquees: Optional[str] = None  # Noms des personnes (séparés par virgule)
    declarant: Optional[str] = None  # Nom du déclarant
    
    # Analyse
    contexte_cause: Optional[str] = None  # Contexte et cause probable
    severite: PresquAccidentSeverity = PresquAccidentSeverity.MOYEN
    
    # Actions correctives
    actions_proposees: Optional[str] = None  # Actions proposées par l'encadrement
    actions_preventions: Optional[str] = None  # Actions de prévention
    responsable_action: Optional[str] = None  # Responsable de l'action
    date_echeance_action: Optional[str] = None  # Date ISO d'échéance de l'action
    
    # Statut et suivi
    status: PresquAccidentStatus = PresquAccidentStatus.A_TRAITER
    date_cloture: Optional[str] = None  # Date ISO de clôture
    
    # Documents et commentaires
    commentaire: Optional[str] = None
    piece_jointe_url: Optional[str] = None  # URL du fichier uploadé
    piece_jointe_nom: Optional[str] = None  # Nom original du fichier
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class PresquAccidentItemCreate(BaseModel):
    titre: str
    description: str
    date_incident: str
    lieu: str
    service: PresquAccidentService
    personnes_impliquees: Optional[str] = None
    declarant: Optional[str] = None
    contexte_cause: Optional[str] = None
    severite: PresquAccidentSeverity = PresquAccidentSeverity.MOYEN
    actions_proposees: Optional[str] = None
    actions_preventions: Optional[str] = None
    responsable_action: Optional[str] = None
    date_echeance_action: Optional[str] = None
    commentaire: Optional[str] = None

class PresquAccidentItemUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    date_incident: Optional[str] = None
    lieu: Optional[str] = None
    service: Optional[PresquAccidentService] = None
    personnes_impliquees: Optional[str] = None
    declarant: Optional[str] = None
    contexte_cause: Optional[str] = None
    severite: Optional[PresquAccidentSeverity] = None
    actions_proposees: Optional[str] = None
    actions_preventions: Optional[str] = None
    responsable_action: Optional[str] = None
    date_echeance_action: Optional[str] = None
    status: Optional[PresquAccidentStatus] = None
    date_cloture: Optional[str] = None
    commentaire: Optional[str] = None
    piece_jointe_url: Optional[str] = None
    piece_jointe_nom: Optional[str] = None



# ==================== DOCUMENTATIONS & PÔLES DE SERVICE ====================

class DocumentType(str, Enum):
    FORMULAIRE = "FORMULAIRE"  # Formulaire créé en ligne
    PIECE_JOINTE = "PIECE_JOINTE"  # Document uploadé (PDF, Word, Excel, etc.)
    TEMPLATE = "TEMPLATE"  # Template de formulaire

class ServicePole(str, Enum):
    MAINTENANCE = "MAINTENANCE"
    PRODUCTION = "PRODUCTION"
    QHSE = "QHSE"
    LOGISTIQUE = "LOGISTIQUE"
    LABO = "LABO"
    ADV = "ADV"
    INDUS = "INDUS"
    DIRECTION = "DIRECTION"
    RH = "RH"
    AUTRE = "AUTRE"

class PoleDeService(BaseModel):
    """Pôle de Service - Conteneur pour les documents"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str  # Nom du pôle (ex: "Maintenance", "Production")
    pole: ServicePole  # Type de pôle
    description: Optional[str] = None
    responsable: Optional[str] = None  # Responsable du pôle
    couleur: Optional[str] = "#3b82f6"  # Couleur pour l'UI
    icon: Optional[str] = "Folder"  # Icône Lucide React
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None

class Document(BaseModel):
    """Document ou formulaire dans un pôle de service"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Informations de base
    titre: str
    description: Optional[str] = None
    pole_id: str  # ID du pôle de service parent
    type_document: DocumentType
    
    # Pour les pièces jointes
    fichier_url: Optional[str] = None  # URL du fichier uploadé
    fichier_nom: Optional[str] = None  # Nom original du fichier
    fichier_type: Optional[str] = None  # MIME type
    fichier_taille: Optional[int] = None  # Taille en bytes
    
    # Pour les formulaires en ligne
    formulaire_data: Optional[dict] = None  # Structure JSON du formulaire
    
    # Métadonnées
    version: str = "1.0"
    statut: str = "ACTIF"  # ACTIF, ARCHIVE, BROUILLON
    tags: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class BonDeTravail(BaseModel):
    """Bon de Travail - Formulaire spécifique maintenance"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Travaux à réaliser
    localisation_ligne: str
    description_travaux: str
    nom_intervenants: str
    
    # Risques identifiés
    risques_materiel: List[str] = []  # Checkboxes cochées
    risques_materiel_autre: Optional[str] = None
    
    risques_autorisation: List[str] = []  # Point chaud, Espace confiné
    
    risques_produits: List[str] = []  # Toxique, Inflammable, etc.
    
    risques_environnement: List[str] = []  # Co-activité, Passage chariot, etc.
    risques_environnement_autre: Optional[str] = None
    
    # Précautions à prendre
    precautions_materiel: List[str] = []
    precautions_materiel_autre: Optional[str] = None
    
    precautions_epi: List[str] = []  # Équipements de protection
    precautions_epi_autre: Optional[str] = None
    
    precautions_environnement: List[str] = []
    precautions_environnement_autre: Optional[str] = None
    
    # Engagement
    date_engagement: str
    nom_agent_maitrise: str
    nom_representant: str
    
    # Métadonnées
    pole_id: str  # Lié au pôle Maintenance
    entreprise: str = "Non assignée"  # Entreprise du bon de travail
    statut: str = "BROUILLON"  # BROUILLON, VALIDE, ENVOYE
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None
    titre: Optional[str] = None  # Titre du bon de travail


# ==================== AUTORISATION PARTICULIERE ====================

class PersonnelAutorise(BaseModel):
    """Personnel autorisé pour l'autorisation particulière"""
    nom: str
    fonction: str

class AutorisationParticuliere(BaseModel):
    """Autorisation Particulière de Travaux - Formulaire MAINT_FE_003_V03"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: int  # N° d'autorisation (auto-généré, >= 8000)
    
    # Informations principales
    date_etablissement: str  # Date d'établissement
    service_demandeur: str
    responsable: str
    
    # Personnel autorisé (4 entrées max)
    personnel_autorise: List[PersonnelAutorise] = []
    
    # Description des travaux (type de travaux)
    type_point_chaud: bool = False
    type_fouille: bool = False
    type_espace_clos: bool = False
    type_autre_cas: bool = False
    description_travaux: str = ""  # Champ texte libre
    
    # Horaires et lieu
    horaire_debut: str  # Format HH:MM
    horaire_fin: str  # Format HH:MM
    lieu_travaux: str
    
    # Risques potentiels (liste)
    risques_potentiels: str
    
    # Mesures de sécurité (checkboxes avec FAIT/A FAIRE)
    mesure_consignation_materiel: str = ""  # "" ou "FAIT" ou "A_FAIRE"
    mesure_consignation_electrique: str = ""
    mesure_debranchement_force: str = ""
    mesure_vidange_appareil: str = ""
    mesure_decontamination: str = ""
    mesure_degazage: str = ""
    mesure_pose_joint: str = ""
    mesure_ventilation: str = ""
    mesure_zone_balisee: str = ""
    mesure_canalisations_electriques: str = ""
    mesure_souterraines_balisees: str = ""
    mesure_egouts_cables: str = ""
    mesure_taux_oxygene: str = ""
    mesure_taux_explosivite: str = ""
    mesure_explosimetre: str = ""
    mesure_eclairage_surete: str = ""
    mesure_extincteur: str = ""
    mesure_autres: str = ""
    mesures_securite_texte: str = ""  # Champ texte libre
    
    # Équipements de protection (checkboxes)
    epi_visiere: bool = False
    epi_tenue_impermeable: bool = False
    epi_cagoule_air: bool = False
    epi_masque: bool = False
    epi_gant: bool = False
    epi_harnais: bool = False
    epi_outillage_anti_etincelle: bool = False
    epi_presence_surveillant: bool = False
    epi_autres: bool = False
    equipements_protection_texte: str = ""  # Champ texte libre
    
    # Signatures
    signature_demandeur: Optional[str] = None
    date_signature_demandeur: Optional[str] = None
    signature_responsable_securite: Optional[str] = None
    date_signature_responsable: Optional[str] = None
    
    # Lien avec les bons de travail (optionnel, plusieurs bons possibles)
    bons_travail_ids: List[str] = []
    
    # Métadonnées
    statut: str = "BROUILLON"  # BROUILLON, VALIDE
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None

class AutorisationParticuliereCreate(BaseModel):
    """Modèle pour la création d'une autorisation particulière"""
    service_demandeur: str
    responsable: str
    personnel_autorise: List[PersonnelAutorise] = []
    # Types de travaux
    type_point_chaud: bool = False
    type_fouille: bool = False
    type_espace_clos: bool = False
    type_autre_cas: bool = False
    description_travaux: str = ""
    # Horaires
    horaire_debut: str
    horaire_fin: str
    lieu_travaux: str
    risques_potentiels: str
    # Mesures de sécurité
    mesure_consignation_materiel: str = ""
    mesure_consignation_electrique: str = ""
    mesure_debranchement_force: str = ""
    mesure_vidange_appareil: str = ""
    mesure_decontamination: str = ""
    mesure_degazage: str = ""
    mesure_pose_joint: str = ""
    mesure_ventilation: str = ""
    mesure_zone_balisee: str = ""
    mesure_canalisations_electriques: str = ""
    mesure_souterraines_balisees: str = ""
    mesure_egouts_cables: str = ""
    mesure_taux_oxygene: str = ""
    mesure_taux_explosivite: str = ""
    mesure_explosimetre: str = ""
    mesure_eclairage_surete: str = ""
    mesure_extincteur: str = ""
    mesure_autres: str = ""
    mesures_securite_texte: str = ""
    # EPI
    epi_visiere: bool = False
    epi_tenue_impermeable: bool = False
    epi_cagoule_air: bool = False
    epi_masque: bool = False
    epi_gant: bool = False
    epi_harnais: bool = False
    epi_outillage_anti_etincelle: bool = False
    epi_presence_surveillant: bool = False
    epi_autres: bool = False
    equipements_protection_texte: str = ""
    # Signatures
    signature_demandeur: Optional[str] = None
    date_signature_demandeur: Optional[str] = None
    signature_responsable_securite: Optional[str] = None
    date_signature_responsable: Optional[str] = None
    bons_travail_ids: List[str] = []

class AutorisationParticuliereUpdate(BaseModel):
    """Modèle pour la mise à jour d'une autorisation particulière"""
    service_demandeur: Optional[str] = None
    responsable: Optional[str] = None
    personnel_autorise: Optional[List[PersonnelAutorise]] = None
    # Types de travaux
    type_point_chaud: Optional[bool] = None
    type_fouille: Optional[bool] = None
    type_espace_clos: Optional[bool] = None
    type_autre_cas: Optional[bool] = None
    description_travaux: Optional[str] = None
    # Horaires
    horaire_debut: Optional[str] = None
    horaire_fin: Optional[str] = None
    lieu_travaux: Optional[str] = None
    risques_potentiels: Optional[str] = None
    # Mesures de sécurité
    mesure_consignation_materiel: Optional[str] = None
    mesure_consignation_electrique: Optional[str] = None
    mesure_debranchement_force: Optional[str] = None
    mesure_vidange_appareil: Optional[str] = None
    mesure_decontamination: Optional[str] = None
    mesure_degazage: Optional[str] = None
    mesure_pose_joint: Optional[str] = None
    mesure_ventilation: Optional[str] = None
    mesure_zone_balisee: Optional[str] = None
    mesure_canalisations_electriques: Optional[str] = None
    mesure_souterraines_balisees: Optional[str] = None
    mesure_egouts_cables: Optional[str] = None
    mesure_taux_oxygene: Optional[str] = None
    mesure_taux_explosivite: Optional[str] = None
    mesure_explosimetre: Optional[str] = None
    mesure_eclairage_surete: Optional[str] = None
    mesure_extincteur: Optional[str] = None
    mesure_autres: Optional[str] = None
    mesures_securite_texte: Optional[str] = None
    # EPI
    epi_visiere: Optional[bool] = None
    epi_tenue_impermeable: Optional[bool] = None
    epi_cagoule_air: Optional[bool] = None
    epi_masque: Optional[bool] = None
    epi_gant: Optional[bool] = None
    epi_harnais: Optional[bool] = None
    epi_outillage_anti_etincelle: Optional[bool] = None
    epi_presence_surveillant: Optional[bool] = None
    epi_autres: Optional[bool] = None
    equipements_protection_texte: Optional[str] = None
    # Signatures
    signature_demandeur: Optional[str] = None
    date_signature_demandeur: Optional[str] = None
    signature_responsable_securite: Optional[str] = None
    date_signature_responsable: Optional[str] = None
    bons_travail_ids: Optional[List[str]] = None
    statut: Optional[str] = None

# Models CRUD
class PoleDeServiceCreate(BaseModel):
    nom: str
    pole: ServicePole
    description: Optional[str] = None
    responsable: Optional[str] = None
    couleur: Optional[str] = "#3b82f6"
    icon: Optional[str] = "Folder"

class PoleDeServiceUpdate(BaseModel):
    nom: Optional[str] = None
    pole: Optional[ServicePole] = None
    description: Optional[str] = None
    responsable: Optional[str] = None
    couleur: Optional[str] = None
    icon: Optional[str] = None

class DocumentCreate(BaseModel):
    titre: str
    description: Optional[str] = None
    pole_id: str
    type_document: DocumentType
    formulaire_data: Optional[dict] = None
    tags: List[str] = []

class DocumentUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    type_document: Optional[DocumentType] = None
    formulaire_data: Optional[dict] = None
    statut: Optional[str] = None
    tags: Optional[List[str]] = None

class BonDeTravailCreate(BaseModel):
    titre: str
    localisation_ligne: str
    description_travaux: str
    nom_intervenants: str
    risques_materiel: List[str] = []
    risques_materiel_autre: Optional[str] = None
    risques_autorisation: List[str] = []
    risques_produits: List[str] = []
    risques_environnement: List[str] = []
    risques_environnement_autre: Optional[str] = None
    precautions_materiel: List[str] = []
    precautions_materiel_autre: Optional[str] = None
    precautions_epi: List[str] = []
    precautions_epi_autre: Optional[str] = None
    precautions_environnement: List[str] = []
    precautions_environnement_autre: Optional[str] = None
    date_engagement: str
    nom_agent_maitrise: str
    nom_representant: str
    pole_id: str
    entreprise: str = "Non assignée"



# ==================== DEMANDES D'ARRÊT POUR MAINTENANCE ====================

class DemandeArretStatus(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    APPROUVEE = "APPROUVEE"
    REFUSEE = "REFUSEE"
    EXPIREE = "EXPIREE"  # Auto-refusée après 7 jours

class PeriodeType(str, Enum):
    JOURNEE_COMPLETE = "JOURNEE_COMPLETE"
    MATIN = "MATIN"  # 8h-12h
    APRES_MIDI = "APRES_MIDI"  # 13h-17h

class DemandeArretMaintenance(BaseModel):
    """Demande d'arrêt d'équipement pour maintenance"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Période demandée
    date_debut: str  # Format ISO date
    date_fin: str  # Format ISO date
    periode_debut: PeriodeType = PeriodeType.JOURNEE_COMPLETE
    periode_fin: PeriodeType = PeriodeType.JOURNEE_COMPLETE
    
    # Demandeur
    demandeur_id: str
    demandeur_nom: str
    
    # Équipements concernés (sélection multiple)
    equipement_ids: List[str] = []
    equipement_noms: List[str] = []  # Pour affichage
    
    # Ordre de travail ou maintenance préventive (optionnel)
    work_order_id: Optional[str] = None
    maintenance_preventive_id: Optional[str] = None
    
    # Commentaire libre
    commentaire: str = ""
    
    # Destinataire
    destinataire_id: str
    destinataire_nom: str
    destinataire_email: str
    
    # Statut et validation
    statut: DemandeArretStatus = DemandeArretStatus.EN_ATTENTE
    date_creation: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    date_expiration: str  # Auto-calculée : date_creation + 7 jours
    date_reponse: Optional[str] = None
    commentaire_reponse: Optional[str] = None
    date_proposee: Optional[str] = None  # Si refus avec proposition nouvelle date
    
    # Token pour validation par email
    validation_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DemandeArretMaintenanceCreate(BaseModel):
    """Modèle pour créer une demande d'arrêt"""
    date_debut: str
    date_fin: str
    periode_debut: PeriodeType = PeriodeType.JOURNEE_COMPLETE
    periode_fin: PeriodeType = PeriodeType.JOURNEE_COMPLETE
    equipement_ids: List[str] = []
    work_order_id: Optional[str] = None
    maintenance_preventive_id: Optional[str] = None
    commentaire: str = ""
    destinataire_id: str  # Si non fourni, prendre le premier user avec rôle RSP_PROD

class DemandeArretMaintenanceUpdate(BaseModel):
    """Modèle pour mettre à jour une demande"""
    statut: Optional[DemandeArretStatus] = None
    commentaire_reponse: Optional[str] = None
    date_proposee: Optional[str] = None

# ==================== PLANNING EQUIPEMENT ====================

class PlanningEquipementEntry(BaseModel):
    """Entrée dans le planning équipement (après validation d'une demande)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipement_id: str
    date_debut: str
    date_fin: str
    periode_debut: PeriodeType
    periode_fin: PeriodeType
    statut: EquipmentStatus = EquipmentStatus.EN_MAINTENANCE
    demande_arret_id: str  # Référence à la demande d'arrêt
    work_order_id: Optional[str] = None
    maintenance_preventive_id: Optional[str] = None
    commentaire: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==================== USER PREFERENCES ====================

class ThemeMode(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"

class SidebarPosition(str, Enum):
    LEFT = "left"
    RIGHT = "right"

class SidebarBehavior(str, Enum):
    ALWAYS_OPEN = "always_open"
    MINIMIZABLE = "minimizable"
    AUTO_COLLAPSE = "auto_collapse"

class DisplayDensity(str, Enum):
    COMPACT = "compact"
    NORMAL = "normal"
    SPACIOUS = "spacious"

class FontSize(str, Enum):
    SMALL = "small"
    NORMAL = "normal"
    LARGE = "large"

class DateFormat(str, Enum):
    DD_MM_YYYY = "DD/MM/YYYY"
    MM_DD_YYYY = "MM/DD/YYYY"
    YYYY_MM_DD = "YYYY-MM-DD"

class TimeFormat(str, Enum):
    H24 = "24h"
    H12 = "12h"

class Currency(str, Enum):
    EUR = "€"
    USD = "$"
    GBP = "£"

class MenuCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: Optional[str] = None
    order: int = 0
    items: List[str] = []  # Liste des IDs de menu items

class MenuItem(BaseModel):
    id: str
    label: str
    path: str
    icon: str
    module: str
    order: int = 0
    visible: bool = True
    favorite: bool = False
    category_id: Optional[str] = None

class UserPreferences(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Apparence générale
    theme_mode: ThemeMode = ThemeMode.LIGHT
    primary_color: str = "#2563eb"  # Bleu par défaut
    secondary_color: str = "#64748b"  # Gris par défaut
    background_image_url: Optional[str] = None
    display_density: DisplayDensity = DisplayDensity.NORMAL
    font_size: FontSize = FontSize.NORMAL
    
    # Sidebar
    sidebar_bg_color: str = "#1f2937"  # Gris foncé par défaut
    sidebar_position: SidebarPosition = SidebarPosition.LEFT
    sidebar_behavior: SidebarBehavior = SidebarBehavior.MINIMIZABLE
    sidebar_width: int = 256  # pixels (16rem = 256px)
    sidebar_icon_color: str = "#ffffff"
    
    # Organisation du menu
    menu_categories: List[MenuCategory] = []
    menu_items: List[MenuItem] = []
    
    # Préférences d'affichage
    default_home_page: str = "/dashboard"
    date_format: DateFormat = DateFormat.DD_MM_YYYY
    time_format: TimeFormat = TimeFormat.H24
    currency: Currency = Currency.EUR
    language: str = "fr"
    
    # Dashboard personnalisé
    dashboard_widgets: List[str] = []  # IDs des widgets à afficher
    dashboard_layout: Dict = {}  # Configuration du layout
    
    # Notifications
    notifications_enabled: bool = True
    email_notifications: bool = True
    push_notifications: bool = True
    sound_enabled: bool = True
    stock_alert_threshold: int = 5
    
    # Page de personnalisation
    customization_view_mode: str = "tabs"  # "tabs" ou "scroll"
    
    # Thèmes prédéfinis
    preset_theme: Optional[str] = None  # "orange", "vert", "blanc", "bleu", "custom"
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserPreferencesCreate(BaseModel):
    user_id: str
    theme_mode: Optional[ThemeMode] = ThemeMode.LIGHT
    primary_color: Optional[str] = "#2563eb"
    secondary_color: Optional[str] = "#64748b"
    background_image_url: Optional[str] = None
    display_density: Optional[DisplayDensity] = DisplayDensity.NORMAL
    font_size: Optional[FontSize] = FontSize.NORMAL
    sidebar_bg_color: Optional[str] = "#1f2937"
    sidebar_position: Optional[SidebarPosition] = SidebarPosition.LEFT
    sidebar_behavior: Optional[SidebarBehavior] = SidebarBehavior.MINIMIZABLE
    sidebar_width: Optional[int] = 256
    sidebar_icon_color: Optional[str] = "#ffffff"
    menu_categories: Optional[List[MenuCategory]] = []
    menu_items: Optional[List[MenuItem]] = []
    default_home_page: Optional[str] = "/dashboard"
    date_format: Optional[DateFormat] = DateFormat.DD_MM_YYYY
    time_format: Optional[TimeFormat] = TimeFormat.H24
    currency: Optional[Currency] = Currency.EUR
    language: Optional[str] = "fr"
    dashboard_widgets: Optional[List[str]] = []
    dashboard_layout: Optional[Dict] = {}
    notifications_enabled: Optional[bool] = True
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    sound_enabled: Optional[bool] = True
    stock_alert_threshold: Optional[int] = 5
    customization_view_mode: Optional[str] = "tabs"
    preset_theme: Optional[str] = None

class UserPreferencesUpdate(BaseModel):
    theme_mode: Optional[ThemeMode] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_image_url: Optional[str] = None
    display_density: Optional[DisplayDensity] = None
    font_size: Optional[FontSize] = None
    sidebar_bg_color: Optional[str] = None
    sidebar_position: Optional[SidebarPosition] = None
    sidebar_behavior: Optional[SidebarBehavior] = None
    sidebar_width: Optional[int] = None
    sidebar_icon_color: Optional[str] = None
    menu_categories: Optional[List[MenuCategory]] = None
    menu_items: Optional[List[MenuItem]] = None
    default_home_page: Optional[str] = None
    date_format: Optional[DateFormat] = None
    time_format: Optional[TimeFormat] = None
    currency: Optional[Currency] = None
    language: Optional[str] = None
    dashboard_widgets: Optional[List[str]] = None
    dashboard_layout: Optional[Dict] = None
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sound_enabled: Optional[bool] = None
    stock_alert_threshold: Optional[int] = None
    customization_view_mode: Optional[str] = None
    preset_theme: Optional[str] = None

# ==================== SUPPORT HELP REQUEST ====================

class HelpRequest(BaseModel):
    screenshot: str  # Base64 encoded image
    user_message: Optional[str] = None
    page_url: str
    browser_info: str
    console_logs: Optional[List[str]] = []
    
class HelpRequestResponse(BaseModel):
    success: bool
    message: str
    request_id: Optional[str] = None


# ==================== MANUEL UTILISATEUR ====================

class ManualSection(BaseModel):
    """Une section du manuel (peut contenir des sous-sections)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str  # Markdown format
    order: int
    parent_id: Optional[str] = None  # Pour les sous-sections
    target_roles: List[str] = []  # Rôles concernés (vide = tous)
    target_modules: List[str] = []  # Modules concernés (vide = général)
    level: str = "beginner"  # "beginner", "advanced", "both"
    images: List[str] = []  # URLs des images/captures
    video_url: Optional[str] = None
    keywords: List[str] = []  # Pour la recherche
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ManualChapter(BaseModel):
    """Un chapitre du manuel contenant plusieurs sections"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    icon: str = "BookOpen"
    order: int
    sections: List[str] = []  # IDs des sections
    target_roles: List[str] = []
    target_modules: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ManualVersion(BaseModel):
    """Version du manuel pour historique"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: str  # ex: "1.0", "1.1"
    release_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    changes: List[str] = []  # Liste des modifications
    author_id: str
    author_name: str
    is_current: bool = True

class ManualCreate(BaseModel):
    """Pour créer/mettre à jour le contenu du manuel"""
    chapters: List[ManualChapter]
    sections: List[ManualSection]
    version: str
    changes: List[str] = []

class ManualSearchRequest(BaseModel):
    """Requête de recherche dans le manuel"""
    query: str
    role_filter: Optional[str] = None
    module_filter: Optional[str] = None
    level_filter: Optional[str] = None

class ManualSearchResult(BaseModel):
    """Résultat de recherche"""
    section_id: str
    chapter_id: str
    title: str
    excerpt: str
    relevance_score: float

class ManualExportRequest(BaseModel):
    """Requête d'export PDF"""
    role_filter: Optional[str] = None
    module_filter: Optional[str] = None
    include_images: bool = True
    include_toc: bool = True


# =====================================
# CHAT LIVE MODELS
# =====================================

class ChatAttachment(BaseModel):
    """Fichier joint dans un message de chat"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_path: str
    file_size: int  # en bytes
    mime_type: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatReaction(BaseModel):
    """Réaction emoji sur un message"""
    user_id: str
    user_name: str
    emoji: str
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatMessage(BaseModel):
    """Message de chat"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    message: str
    recipient_ids: List[str] = []  # Vide = message de groupe, sinon privé
    recipient_names: List[str] = []  # Noms des destinataires (pour affichage)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_deleted: bool = False
    deleted_at: Optional[str] = None
    reply_to_id: Optional[str] = None  # ID du message auquel on répond
    reply_to_preview: Optional[str] = None  # Aperçu du message cité
    reactions: List[ChatReaction] = []
    attachments: List[ChatAttachment] = []
    deletable_until: str = Field(default_factory=lambda: (datetime.now(timezone.utc).timestamp() + 10))  # Timestamp + 10s
    is_private: bool = False  # True si message privé

class ChatMessageCreate(BaseModel):
    """Créer un nouveau message"""
    message: str
    recipient_ids: List[str] = []
    reply_to_id: Optional[str] = None

class ChatMessageDelete(BaseModel):
    """Supprimer un message"""
    message_id: str

class UserChatActivity(BaseModel):
    """Activité utilisateur dans le chat"""
    user_id: str
    last_seen_timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_online: bool = False
    last_activity: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatReactionAdd(BaseModel):
    """Ajouter une réaction à un message"""
    emoji: str

class ChatFileTransfer(BaseModel):
    """Transférer un fichier vers un OT/Amélioration/Maintenance"""
    attachment_id: str
    target_type: str  # "work_order", "improvement", "preventive_maintenance"
    target_id: str

class ChatEmailTransfer(BaseModel):
    """Transférer un fichier par email"""
    attachment_id: str
    recipient_user_ids: List[str]
    message: Optional[str] = None



# =======================
# MQTT Models
# =======================

class MQTTConfig(BaseModel):
    """Configuration du broker MQTT"""
    host: str
    port: int = 1883


# =======================
# Sensor (Capteur) Models
# =======================

class SensorType(str, Enum):
    TEMPERATURE = "TEMPERATURE"  # Température
    HUMIDITY = "HUMIDITY"  # Humidité
    PRESSURE = "PRESSURE"  # Pression
    AIR_QUALITY = "AIR_QUALITY"  # Qualité de l'air
    LIGHT = "LIGHT"  # Luminosité
    MOTION = "MOTION"  # Mouvement/Présence
    DOOR = "DOOR"  # Ouverture porte/fenêtre
    WATER_LEVEL = "WATER_LEVEL"  # Niveau d'eau
    VOLTAGE = "VOLTAGE"  # Tension électrique
    CURRENT = "CURRENT"  # Courant électrique
    POWER = "POWER"  # Puissance électrique
    ENERGY = "ENERGY"  # Énergie
    FLOW = "FLOW"  # Débit
    VIBRATION = "VIBRATION"  # Vibration
    NOISE = "NOISE"  # Niveau sonore
    CO2 = "CO2"  # CO2
    OTHER = "OTHER"  # Autre

class Sensor(BaseModel):
    id: str
    nom: str
    type: SensorType
    emplacement_id: Optional[str] = None
    emplacement: Optional[Dict] = None
    unite: str  # °C, %, bar, lux, ppm, etc.
    mqtt_topic: str  # Topic MQTT obligatoire
    mqtt_json_path: Optional[str] = None  # Chemin JSON pour extraire la valeur
    refresh_interval: int = 1  # Intervalle de rafraîchissement en minutes
    current_value: Optional[float] = None  # Valeur actuelle
    last_update: Optional[str] = None  # Dernière mise à jour
    min_threshold: Optional[float] = None  # Seuil minimum pour alerte
    max_threshold: Optional[float] = None  # Seuil maximum pour alerte
    alert_enabled: bool = False  # Activer les alertes
    notes: Optional[str] = None
    actif: bool = True
    date_creation: datetime
    created_by: str

class SensorCreate(BaseModel):
    nom: str
    type: SensorType
    emplacement_id: Optional[str] = None
    unite: str
    mqtt_topic: str
    mqtt_json_path: Optional[str] = None
    refresh_interval: int = 1
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    alert_enabled: bool = False
    notes: Optional[str] = None

class SensorUpdate(BaseModel):
    nom: Optional[str] = None
    type: Optional[SensorType] = None
    emplacement_id: Optional[str] = None
    unite: Optional[str] = None
    mqtt_topic: Optional[str] = None
    mqtt_json_path: Optional[str] = None
    refresh_interval: Optional[int] = None
    min_threshold: Optional[float] = None
    max_threshold: Optional[float] = None
    alert_enabled: Optional[bool] = None
    notes: Optional[str] = None
    actif: Optional[bool] = None

class SensorReading(BaseModel):
    id: str
    sensor_id: str
    sensor_nom: Optional[str] = None
    timestamp: datetime
    value: float
    unit: str
    date_creation: datetime

class SensorReadingCreate(BaseModel):
    value: float

    username: Optional[str] = None
    password: Optional[str] = None
    use_ssl: bool = False
    client_id: str = "gmao_iris"

class MQTTPublish(BaseModel):
    """Publier un message MQTT"""
    topic: str
    payload: str
    qos: int = Field(default=0, ge=0, le=2)
    retain: bool = False

class MQTTSubscribe(BaseModel):
    """S'abonner à un topic MQTT"""
    topic: str
    qos: int = Field(default=0, ge=0, le=2)

class MQTTMessage(BaseModel):
    """Message MQTT reçu"""
    topic: str
    payload: str
    qos: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

