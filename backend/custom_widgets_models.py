"""
Modèles pour les Widgets Personnalisés des Responsables de Service
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import datetime, timezone
import uuid


class WidgetType(str, Enum):
    """Types de widgets disponibles"""
    VALUE = "value"           # Valeur simple (grand chiffre)
    GAUGE = "gauge"           # Jauge avec pourcentage
    LINE_CHART = "line_chart" # Graphique en ligne
    BAR_CHART = "bar_chart"   # Graphique en barres
    PIE_CHART = "pie_chart"   # Camembert
    DONUT_CHART = "donut"     # Donut
    TABLE = "table"           # Tableau de données


class DataSourceType(str, Enum):
    """Types de sources de données"""
    MANUAL = "manual"         # Valeur entrée manuellement
    EXCEL = "excel"           # Fichier Excel via SMB/CIFS
    GMAO = "gmao"             # Données de l'application FSAO
    FORMULA = "formula"       # Résultat d'une formule


class GmaoDataType(str, Enum):
    """Types de données FSAO disponibles"""
    # Interventions
    WORK_ORDERS_COUNT = "work_orders_count"
    WORK_ORDERS_BY_STATUS = "work_orders_by_status"
    WORK_ORDERS_BY_PRIORITY = "work_orders_by_priority"
    WORK_ORDERS_COMPLETION_RATE = "work_orders_completion_rate"
    WORK_ORDERS_AVG_DURATION = "work_orders_avg_duration"
    
    # Équipements
    ASSETS_COUNT = "assets_count"
    ASSETS_BY_STATUS = "assets_by_status"
    ASSETS_BY_TYPE = "assets_by_type"
    ASSETS_AVAILABILITY_RATE = "assets_availability_rate"
    
    # Maintenance préventive
    PREVENTIVE_COMPLETION_RATE = "preventive_completion_rate"
    PREVENTIVE_OVERDUE_COUNT = "preventive_overdue_count"
    PREVENTIVE_UPCOMING_COUNT = "preventive_upcoming_count"
    
    # Demandes
    INTERVENTION_REQUESTS_COUNT = "intervention_requests_count"
    IMPROVEMENT_REQUESTS_COUNT = "improvement_requests_count"
    PURCHASE_REQUESTS_COUNT = "purchase_requests_count"
    
    # Presqu'accidents
    NEAR_MISS_COUNT = "near_miss_count"
    NEAR_MISS_BY_SEVERITY = "near_miss_by_severity"
    
    # Capteurs IoT
    SENSOR_VALUE = "sensor_value"
    SENSOR_HISTORY = "sensor_history"
    
    # Inventaire
    INVENTORY_COUNT = "inventory_count"
    INVENTORY_LOW_STOCK = "inventory_low_stock"
    INVENTORY_VALUE = "inventory_value"
    
    # Surveillance
    SURVEILLANCE_COMPLIANCE_RATE = "surveillance_compliance_rate"
    SURVEILLANCE_OVERDUE = "surveillance_overdue"
    
    # Utilisateurs
    USERS_ONLINE_COUNT = "users_online_count"
    USERS_BY_SERVICE = "users_by_service"


class FormulaOperator(str, Enum):
    """Opérateurs disponibles pour les formules"""
    # Opérations de base
    ADD = "+"
    SUBTRACT = "-"
    MULTIPLY = "*"
    DIVIDE = "/"
    MODULO = "%"
    
    # Fonctions d'agrégation
    SUM = "SUM"
    AVG = "AVG"
    MIN = "MIN"
    MAX = "MAX"
    COUNT = "COUNT"
    
    # Fonctions conditionnelles
    IF = "IF"
    
    # Comparaisons temporelles
    VS_PREVIOUS_MONTH = "VS_PREV_MONTH"
    VS_PREVIOUS_YEAR = "VS_PREV_YEAR"
    GROWTH_RATE = "GROWTH_RATE"


class ThresholdConfig(BaseModel):
    """Configuration des seuils pour les jauges et alertes"""
    warning_min: Optional[float] = None
    warning_max: Optional[float] = None
    danger_min: Optional[float] = None
    danger_max: Optional[float] = None
    success_min: Optional[float] = None
    success_max: Optional[float] = None


class ExcelDataSource(BaseModel):
    """Configuration pour source de données Excel"""
    smb_path: str  # Chemin SMB ex: \\\\serveur\\partage\\fichier.xlsx
    sheet_name: Optional[str] = None  # Nom de la feuille (défaut: première)
    cell_reference: Optional[str] = None  # Référence cellule ex: A1, B2:D10
    column_name: Optional[str] = None  # Nom de colonne pour recherche
    row_filter: Optional[Dict[str, Any]] = None  # Filtre sur les lignes
    aggregation: Optional[str] = None  # SUM, AVG, COUNT, etc.
    # Credentials SMB optionnels (si non renseignés, utilise les credentials système)
    smb_username: Optional[str] = None
    smb_password: Optional[str] = None


class GmaoDataSource(BaseModel):
    """Configuration pour source de données FSAO"""
    data_type: GmaoDataType
    service_filter: Optional[str] = None  # Filtrer par service
    status_filter: Optional[List[str]] = None  # Filtrer par statut
    date_from: Optional[str] = None  # Date début (relative: -7d, -1m, -1y)
    date_to: Optional[str] = None  # Date fin
    group_by: Optional[str] = None  # Grouper par (service, type, status, etc.)
    sensor_id: Optional[str] = None  # Pour les capteurs IoT


class FormulaElement(BaseModel):
    """Élément d'une formule"""
    type: str  # "value", "source", "operator", "function"
    value: Optional[Union[float, str]] = None
    source_id: Optional[str] = None  # Référence vers une autre source de données
    operator: Optional[str] = None
    function_name: Optional[str] = None
    arguments: Optional[List["FormulaElement"]] = None


class DataSource(BaseModel):
    """Source de données pour un widget"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # Nom de la source pour référence dans les formules
    type: DataSourceType
    
    # Pour source manuelle
    manual_value: Optional[Union[float, str]] = None
    
    # Pour source Excel
    excel_config: Optional[ExcelDataSource] = None
    
    # Pour source GMAO
    gmao_config: Optional[GmaoDataSource] = None
    
    # Pour formule
    formula: Optional[str] = None  # Ex: "SUM(source1, source2) / source3 * 100"
    formula_elements: Optional[List[FormulaElement]] = None
    
    # Valeur calculée (mise à jour par le scheduler)
    cached_value: Optional[Union[float, str, List, Dict]] = None
    last_updated: Optional[str] = None
    error_message: Optional[str] = None


class WidgetVisualization(BaseModel):
    """Configuration de visualisation du widget"""
    title: str
    subtitle: Optional[str] = None
    type: WidgetType
    
    # Pour valeur simple
    unit: Optional[str] = None  # Ex: "€", "%", "h"
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    decimal_places: int = 0
    
    # Pour jauge
    min_value: float = 0
    max_value: float = 100
    thresholds: Optional[ThresholdConfig] = None
    
    # Pour graphiques
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    show_legend: bool = True
    colors: Optional[List[str]] = None
    
    # Pour tableau
    columns: Optional[List[Dict[str, str]]] = None  # [{key, label, format}]
    
    # Style
    size: str = "medium"  # small, medium, large, full
    color_scheme: str = "blue"  # blue, green, red, purple, orange, etc.
    icon: Optional[str] = None  # Nom de l'icône Lucide


class CustomWidgetBase(BaseModel):
    """Base model pour widget personnalisé"""
    name: str
    description: Optional[str] = None
    
    # Sources de données
    data_sources: List[DataSource]
    
    # Source principale pour l'affichage
    primary_source_id: str
    
    # Configuration visuelle
    visualization: WidgetVisualization
    
    # Fréquence de mise à jour en minutes (défaut 5)
    refresh_interval: int = 5
    
    # Partage
    is_shared: bool = False
    shared_with_roles: List[str] = []  # ["ADMIN", "RSP_SERVICE"]
    
    # Service associé (pour filtrage)
    service: Optional[str] = None


class CustomWidgetCreate(CustomWidgetBase):
    """Modèle pour créer un widget"""
    pass


class CustomWidgetUpdate(BaseModel):
    """Modèle pour mettre à jour un widget"""
    name: Optional[str] = None
    description: Optional[str] = None
    data_sources: Optional[List[DataSource]] = None
    primary_source_id: Optional[str] = None
    visualization: Optional[WidgetVisualization] = None
    refresh_interval: Optional[int] = None
    is_shared: Optional[bool] = None
    shared_with_roles: Optional[List[str]] = None
    service: Optional[str] = None


class CustomWidget(CustomWidgetBase):
    """Modèle complet du widget"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    
    # Position sur le dashboard
    position: int = 0
    
    # Statut
    is_active: bool = True
    last_refresh: Optional[str] = None
    refresh_error: Optional[str] = None
    
    class Config:
        from_attributes = True


# === Modèles pour le Dashboard Responsable de Service ===

class ServiceDashboardConfig(BaseModel):
    """Configuration du dashboard d'un responsable de service"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    service: str
    
    # Widgets actifs (IDs)
    widget_ids: List[str] = []
    
    # Layout personnalisé
    layout: Optional[Dict[str, Any]] = None
    
    # Préférences
    auto_refresh: bool = True
    theme: str = "light"
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
