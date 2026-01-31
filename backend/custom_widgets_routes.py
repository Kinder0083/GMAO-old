"""
Routes API pour les Widgets Personnalisés
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import asyncio

from custom_widgets_models import (
    CustomWidget, CustomWidgetCreate, CustomWidgetUpdate,
    DataSource, DataSourceType, WidgetType,
    ServiceDashboardConfig
)
from excel_smb_service import read_excel_from_smb, test_smb_connection, get_excel_preview, configure_smb
from gmao_data_service import get_gmao_data, get_available_gmao_data_types, init_gmao_data_service
from formula_engine import evaluate_formula, validate_formula

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/custom-widgets", tags=["Custom Widgets"])

# Référence à la base de données (initialisée dans init_custom_widgets_routes)
db = None
audit_service = None


def init_custom_widgets_routes(database, audit_svc=None):
    """Initialise les routes avec la base de données"""
    global db, audit_service
    db = database
    audit_service = audit_svc
    init_gmao_data_service(database)
    logger.info("Routes Custom Widgets initialisées")


# === Dépendances ===

from dependencies import get_current_user


# === Routes CRUD Widgets ===

@router.get("", response_model=List[Dict])
async def get_widgets(
    service: Optional[str] = None,
    shared_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère les widgets accessibles par l'utilisateur
    
    - Ses propres widgets
    - Les widgets partagés avec son rôle
    - Les widgets de son service
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    user_service = current_user.get("service")
    
    query = {"$or": [
        {"created_by": user_id},  # Ses propres widgets
        {"is_shared": True, "shared_with_roles": user_role},  # Partagés avec son rôle
    ]}
    
    # Si l'utilisateur a un service, inclure les widgets du service
    if user_service:
        query["$or"].append({"service": user_service, "is_shared": True})
    
    # Filtre par service si spécifié
    if service:
        query["service"] = service
    
    # Filtre partagés uniquement
    if shared_only:
        query["is_shared"] = True
    
    widgets = await db.custom_widgets.find(query, {"_id": 0}).to_list(length=None)
    
    # Trier par position puis par date de création
    widgets.sort(key=lambda w: (w.get("position", 999), w.get("created_at", "")))
    
    return widgets


@router.get("/my-widgets", response_model=List[Dict])
async def get_my_widgets(current_user: dict = Depends(get_current_user)):
    """Récupère uniquement les widgets créés par l'utilisateur"""
    user_id = current_user.get("id")
    widgets = await db.custom_widgets.find(
        {"created_by": user_id},
        {"_id": 0}
    ).to_list(length=None)
    return widgets


@router.get("/{widget_id}", response_model=Dict)
async def get_widget(widget_id: str, current_user: dict = Depends(get_current_user)):
    """Récupère un widget par son ID"""
    widget = await db.custom_widgets.find_one({"id": widget_id}, {"_id": 0})
    if not widget:
        raise HTTPException(status_code=404, detail="Widget non trouvé")
    
    # Vérifier l'accès
    user_id = current_user.get("id")
    user_role = current_user.get("role")
    
    can_access = (
        widget.get("created_by") == user_id or
        (widget.get("is_shared") and user_role in widget.get("shared_with_roles", []))
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return widget


@router.post("", response_model=Dict)
async def create_widget(
    widget_data: CustomWidgetCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Crée un nouveau widget personnalisé"""
    user_id = current_user.get("id")
    user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
    user_service = current_user.get("service")
    
    widget = {
        "id": str(uuid.uuid4()),
        "name": widget_data.name,
        "description": widget_data.description,
        "data_sources": [ds.model_dump() for ds in widget_data.data_sources],
        "primary_source_id": widget_data.primary_source_id,
        "visualization": widget_data.visualization.model_dump(),
        "refresh_interval": widget_data.refresh_interval or 5,
        "is_shared": widget_data.is_shared,
        "shared_with_roles": widget_data.shared_with_roles,
        "service": widget_data.service or user_service,
        "created_by": user_id,
        "created_by_name": user_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "position": 0,
        "is_active": True
    }
    
    await db.custom_widgets.insert_one(widget)
    widget.pop("_id", None)
    
    # Rafraîchir les données en arrière-plan
    background_tasks.add_task(refresh_widget_data, widget["id"])
    
    logger.info(f"Widget créé: {widget['name']} par {user_name}")
    
    if audit_service:
        await audit_service.log_action(
            "CUSTOM_WIDGET_CREATED",
            user_id,
            f"Widget '{widget['name']}' créé",
            {"widget_id": widget["id"]}
        )
    
    return widget


@router.put("/{widget_id}", response_model=Dict)
async def update_widget(
    widget_id: str,
    widget_data: CustomWidgetUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour un widget existant"""
    widget = await db.custom_widgets.find_one({"id": widget_id})
    if not widget:
        raise HTTPException(status_code=404, detail="Widget non trouvé")
    
    # Vérifier que l'utilisateur est le créateur
    if widget.get("created_by") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Seul le créateur peut modifier ce widget")
    
    update_data = {}
    if widget_data.name is not None:
        update_data["name"] = widget_data.name
    if widget_data.description is not None:
        update_data["description"] = widget_data.description
    if widget_data.data_sources is not None:
        update_data["data_sources"] = [ds.model_dump() for ds in widget_data.data_sources]
    if widget_data.primary_source_id is not None:
        update_data["primary_source_id"] = widget_data.primary_source_id
    if widget_data.visualization is not None:
        update_data["visualization"] = widget_data.visualization.model_dump()
    if widget_data.refresh_interval is not None:
        update_data["refresh_interval"] = widget_data.refresh_interval
    if widget_data.is_shared is not None:
        update_data["is_shared"] = widget_data.is_shared
    if widget_data.shared_with_roles is not None:
        update_data["shared_with_roles"] = widget_data.shared_with_roles
    if widget_data.service is not None:
        update_data["service"] = widget_data.service
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.custom_widgets.update_one({"id": widget_id}, {"$set": update_data})
    
    # Rafraîchir les données en arrière-plan
    background_tasks.add_task(refresh_widget_data, widget_id)
    
    updated = await db.custom_widgets.find_one({"id": widget_id}, {"_id": 0})
    return updated


@router.delete("/{widget_id}")
async def delete_widget(widget_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime un widget"""
    widget = await db.custom_widgets.find_one({"id": widget_id})
    if not widget:
        raise HTTPException(status_code=404, detail="Widget non trouvé")
    
    # Vérifier que l'utilisateur est le créateur ou admin
    if widget.get("created_by") != current_user.get("id") and current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Non autorisé à supprimer ce widget")
    
    await db.custom_widgets.delete_one({"id": widget_id})
    
    logger.info(f"Widget supprimé: {widget_id}")
    
    return {"message": "Widget supprimé", "id": widget_id}


@router.put("/{widget_id}/position")
async def update_widget_position(
    widget_id: str,
    position: int,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour la position d'un widget sur le dashboard"""
    result = await db.custom_widgets.update_one(
        {"id": widget_id, "created_by": current_user.get("id")},
        {"$set": {"position": position}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Widget non trouvé")
    
    return {"message": "Position mise à jour"}


# === Routes de rafraîchissement des données ===

@router.post("/{widget_id}/refresh")
async def refresh_widget(widget_id: str, current_user: dict = Depends(get_current_user)):
    """Force le rafraîchissement des données d'un widget"""
    widget = await db.custom_widgets.find_one({"id": widget_id})
    if not widget:
        raise HTTPException(status_code=404, detail="Widget non trouvé")
    
    try:
        await refresh_widget_data(widget_id)
        updated = await db.custom_widgets.find_one({"id": widget_id}, {"_id": 0})
        return {"message": "Widget rafraîchi", "widget": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de rafraîchissement: {str(e)}")


async def refresh_widget_data(widget_id: str):
    """Rafraîchit les données d'un widget (appelé en arrière-plan)"""
    widget = await db.custom_widgets.find_one({"id": widget_id})
    if not widget:
        return
    
    try:
        sources_values = {}
        errors = []
        
        # Rafraîchir chaque source de données
        for source in widget.get("data_sources", []):
            source_id = source.get("id")
            source_type = source.get("type")
            
            try:
                value = None
                
                if source_type == "manual":
                    value = source.get("manual_value")
                
                elif source_type == "excel":
                    excel_config = source.get("excel_config", {})
                    value = read_excel_from_smb(
                        smb_path=excel_config.get("smb_path"),
                        sheet_name=excel_config.get("sheet_name"),
                        cell_reference=excel_config.get("cell_reference"),
                        column_name=excel_config.get("column_name"),
                        row_filter=excel_config.get("row_filter"),
                        aggregation=excel_config.get("aggregation")
                    )
                
                elif source_type == "gmao":
                    gmao_config = source.get("gmao_config", {})
                    value = await get_gmao_data(
                        data_type=gmao_config.get("data_type"),
                        service_filter=gmao_config.get("service_filter"),
                        status_filter=gmao_config.get("status_filter"),
                        date_from=gmao_config.get("date_from"),
                        date_to=gmao_config.get("date_to"),
                        group_by=gmao_config.get("group_by"),
                        sensor_id=gmao_config.get("sensor_id")
                    )
                
                sources_values[source.get("name")] = value
                
                # Mettre à jour la valeur en cache
                source["cached_value"] = value
                source["last_updated"] = datetime.now(timezone.utc).isoformat()
                source["error_message"] = None
                
            except Exception as e:
                logger.error(f"Erreur source {source_id}: {e}")
                source["error_message"] = str(e)
                errors.append(f"Source '{source.get('name')}': {str(e)}")
        
        # Évaluer les formules
        for source in widget.get("data_sources", []):
            if source.get("type") == "formula" and source.get("formula"):
                try:
                    value = evaluate_formula(source["formula"], sources_values)
                    sources_values[source.get("name")] = value
                    source["cached_value"] = value
                    source["last_updated"] = datetime.now(timezone.utc).isoformat()
                    source["error_message"] = None
                except Exception as e:
                    logger.error(f"Erreur formule: {e}")
                    source["error_message"] = str(e)
                    errors.append(f"Formule '{source.get('name')}': {str(e)}")
        
        # Mettre à jour le widget
        update_data = {
            "data_sources": widget["data_sources"],
            "last_refresh": datetime.now(timezone.utc).isoformat(),
            "refresh_error": "; ".join(errors) if errors else None
        }
        
        await db.custom_widgets.update_one({"id": widget_id}, {"$set": update_data})
        
    except Exception as e:
        logger.error(f"Erreur rafraîchissement widget {widget_id}: {e}")
        await db.custom_widgets.update_one(
            {"id": widget_id},
            {"$set": {"refresh_error": str(e), "last_refresh": datetime.now(timezone.utc).isoformat()}}
        )


# === Routes utilitaires ===

@router.get("/data-types/gmao")
async def get_gmao_data_types(current_user: dict = Depends(get_current_user)):
    """Retourne la liste des types de données GMAO disponibles"""
    return get_available_gmao_data_types()


@router.post("/test/excel-connection")
async def test_excel_connection(
    smb_path: str,
    username: Optional[str] = None,
    password: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Teste la connexion à un fichier Excel via SMB"""
    result = test_smb_connection(smb_path, username, password)
    return result


@router.post("/preview/excel")
async def preview_excel_file(
    smb_path: str,
    sheet_name: Optional[str] = None,
    max_rows: int = 10,
    username: Optional[str] = None,
    password: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Prévisualise le contenu d'un fichier Excel"""
    result = get_excel_preview(smb_path, sheet_name, max_rows, username, password)
    return result


@router.post("/validate/formula")
async def validate_formula_endpoint(
    formula: str,
    source_names: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Valide une formule et retourne les erreurs éventuelles"""
    return validate_formula(formula, source_names)


@router.post("/test/formula")
async def test_formula(
    formula: str,
    test_values: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Teste une formule avec des valeurs de test"""
    try:
        result = evaluate_formula(formula, test_values)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


# === Routes Dashboard Responsable de Service ===

@router.get("/dashboard/config")
async def get_dashboard_config(current_user: dict = Depends(get_current_user)):
    """Récupère la configuration du dashboard de l'utilisateur"""
    user_id = current_user.get("id")
    
    config = await db.service_dashboard_configs.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not config:
        # Créer une configuration par défaut
        config = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "service": current_user.get("service"),
            "widget_ids": [],
            "layout": None,
            "auto_refresh": True,
            "theme": "light",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.service_dashboard_configs.insert_one(config)
        config.pop("_id", None)
    
    return config


@router.put("/dashboard/config")
async def update_dashboard_config(
    config_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Met à jour la configuration du dashboard"""
    user_id = current_user.get("id")
    
    config_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.service_dashboard_configs.update_one(
        {"user_id": user_id},
        {"$set": config_data},
        upsert=True
    )
    
    return {"message": "Configuration mise à jour"}


# === Configuration SMB globale ===

@router.post("/config/smb")
async def configure_smb_credentials(
    username: str,
    password: str,
    domain: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Configure les credentials SMB pour l'accès aux fichiers Excel"""
    # Seuls les admins peuvent configurer
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs")
    
    # Stocker de manière sécurisée (crypté)
    import os
    os.environ["SMB_USERNAME"] = username
    os.environ["SMB_PASSWORD"] = password
    if domain:
        os.environ["SMB_DOMAIN"] = domain
    
    configure_smb(username, password, domain)
    
    # Stocker en DB aussi (crypté)
    await db.system_config.update_one(
        {"key": "smb_config"},
        {"$set": {
            "key": "smb_config",
            "username": username,
            "domain": domain,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("id")
        }},
        upsert=True
    )
    
    logger.info(f"Configuration SMB mise à jour par {current_user.get('email')}")
    
    return {"message": "Configuration SMB enregistrée"}
