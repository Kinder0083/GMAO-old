"""
Routes pour l'import/export de données GMAO Iris
Module séparé pour une meilleure organisation du code
"""
import io
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
import pandas as pd
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Import/Export"])

# Variable globale pour la DB (sera injectée depuis server.py)
db = None

def init_db(database):
    """Initialiser la référence à la base de données"""
    global db
    db = database

# Mapping des modules vers les collections MongoDB
EXPORT_MODULES = {
    "intervention-requests": "intervention_requests",
    "work-orders": "work_orders",
    "improvement-requests": "improvement_requests",
    "improvements": "improvements",
    "equipments": "equipments",
    "meters": "meters",
    "meter-readings": "meter_readings",
    "surveillance-items": "surveillance_items",
    "presqu-accident-items": "presqu_accident_items",
    "users": "users",
    "inventory": "inventory",
    "locations": "locations",
    "vendors": "vendors",
    "purchase-history": "purchase_history",
    "purchase-requests": "purchase_requests",
    "preventive-maintenance": "preventive_maintenance",
    "preventive-checklists": "preventive_checklists",
    "preventive-checklist-templates": "preventive_checklist_templates",
    "preventive-checklist-executions": "preventive_checklist_executions",
    "sensors": "sensors",
    "documentations": "documentations",
    "mqtt-logs": "mqtt_logs",
    "chat-messages": "chat_messages"
}

# Mappings de colonnes pour l'import (noms français/anglais vers noms internes)
COLUMN_MAPPINGS = {
    "purchase-history": {
        "Fournisseur": "fournisseur",
        "N° Commande ": "numeroCommande",
        "N° Commande": "numeroCommande",
        "N° reception": "numeroReception",
        "Date de création": "dateCreation",
        "Article": "article",
        "Description 1": "description",
        "Description": "description",
        "Groupe statistique": "groupeStatistique",
        "Groupe statistique STK": "groupeStatistique",
        "STK quantité": "quantite",
        "quantité": "quantite",
        "Quantité": "quantite",
        "Montant ligne HT": "montantLigneHT",
        "Quantité retournée": "quantiteRetournee",
        "Site ": "site",
        "Site": "site",
        "Creation user": "creationUser"
    },
    "work-orders": {
        "ID": "id", "id": "id",
        "Titre": "titre", "Title": "titre", "titre": "titre",
        "Description": "description", "description": "description",
        "Priorité": "priorite", "Priority": "priorite", "priorite": "priorite",
        "Statut": "statut", "Status": "statut", "statut": "statut",
        "Catégorie": "categorie", "Category": "categorie", "categorie": "categorie",
        "Date création": "dateCreation", "dateCreation": "dateCreation",
        "Date début": "dateDebut", "dateDebut": "dateDebut",
        "Date fin": "dateFin", "dateFin": "dateFin",
        "Date limite": "dateLimite", "dateLimite": "dateLimite",
        "Équipement": "equipement_id", "Equipment": "equipement_id", "equipement_id": "equipement_id",
        "Assigné à": "assigne_a_id", "Assigned To": "assigne_a_id", "assigne_a_id": "assigne_a_id",
        "Emplacement": "emplacement_id", "Location": "emplacement_id", "emplacement_id": "emplacement_id",
        "Temps estimé": "tempsEstime", "tempsEstime": "tempsEstime",
        "Temps réel": "tempsReel", "tempsReel": "tempsReel",
        "Numéro": "numero", "numero": "numero",
        "Créé par": "createdBy", "createdBy": "createdBy"
    },
    "equipments": {
        "ID": "id", "Nom": "name", "Name": "name", "Code": "code",
        "Type": "type", "Marque": "brand", "Brand": "brand",
        "Modèle": "model", "Model": "model",
        "Numéro de série": "serialNumber", "Serial Number": "serialNumber",
        "Zone": "location", "Location": "location",
        "Statut": "status", "Status": "status",
        "Date installation": "installDate"
    },
    "intervention-requests": {
        "ID": "id", "Titre": "title", "Title": "title",
        "Description": "description", "Priorité": "priority", "Priority": "priority",
        "Statut": "status", "Status": "status",
        "Date création": "dateCreation",
        "Équipement": "equipment", "Equipment": "equipment",
        "Demandeur": "requestedBy", "Requested By": "requestedBy"
    },
    "improvement-requests": {
        "ID": "id", "Titre": "title", "Title": "title",
        "Description": "description", "Priorité": "priority", "Priority": "priority",
        "Statut": "status", "Status": "status",
        "Date création": "dateCreation", "Demandeur": "requestedBy"
    },
    "improvements": {
        "ID": "id", "Titre": "title", "Title": "title",
        "Description": "description", "Priorité": "priority", "Priority": "priority",
        "Statut": "status", "Status": "status",
        "Date création": "dateCreation", "Date début": "dateDebut",
        "Date fin": "dateFin", "Assigné à": "assignedTo"
    },
    "locations": {
        "ID": "id", "Nom": "name", "Name": "name", "Code": "code",
        "Type": "type", "Parent": "parent", "Description": "description"
    },
    "meters": {
        "ID": "id", "Nom": "name", "Name": "name", "Type": "type",
        "Équipement": "equipment", "Equipment": "equipment",
        "Unité": "unit", "Unit": "unit",
        "Valeur actuelle": "currentValue", "Current Value": "currentValue"
    },
    "users": {
        "ID": "id", "Email": "email",
        "Prénom": "prenom", "First Name": "prenom",
        "Nom": "nom", "Last Name": "nom",
        "Rôle": "role", "Role": "role",
        "Téléphone": "telephone", "Phone": "telephone",
        "Service": "service"
    },
    "inventory": {
        "ID": "id", "Nom": "name", "Name": "name", "Code": "code",
        "Catégorie": "category", "Category": "category",
        "Quantité": "quantity", "Quantity": "quantity",
        "Seuil min": "minQuantity", "Min Quantity": "minQuantity",
        "Unité": "unit", "Unit": "unit",
        "Emplacement": "location", "Location": "location",
        "Prix unitaire": "unitPrice", "Unit Price": "unitPrice"
    },
    "vendors": {
        "ID": "id", "Nom": "name", "Name": "name",
        "Email": "email", "Téléphone": "phone", "Phone": "phone",
        "Adresse": "address", "Address": "address",
        "Contact": "contact", "Notes": "notes"
    }
}

# Mapping des noms de feuilles Excel vers les modules
SHEET_TO_MODULE = {
    # Noms techniques (export récent)
    "intervention-requests": "intervention-requests",
    "intervention_requests": "intervention-requests",
    "work-orders": "work-orders",
    "work_orders": "work-orders",
    "improvement-requests": "improvement-requests",
    "improvement_requests": "improvement-requests",
    "improvements": "improvements",
    "equipments": "equipments",
    "locations": "locations",
    "inventory": "inventory",
    "purchase-history": "purchase-history",
    "purchase_history": "purchase-history",
    "purchase-requests": "purchase-requests",
    "purchase_requests": "purchase-requests",
    "meters": "meters",
    "users": "users",
    "people": "users",
    "vendors": "vendors",
    "sensors": "sensors",
    "chat-messages": "chat-messages",
    "chat_messages": "chat-messages",
    "preventive-maintenance": "preventive-maintenance",
    "preventive_maintenance": "preventive-maintenance",
    "documentations": "documentations",
    # Noms français (export ancienne version)
    "fournisseurs": "vendors",
    "inventaire": "inventory",
    "pieces": "chat-messages",
    "pièces": "chat-messages",
    "user": "users",
    "utilisateurs": "users",
    "utilisateur": "users",
    "sensor": "sensors",
    "capteurs": "sensors",
    "capteur": "sensors",
    "tâches": "work-orders",
    "taches": "work-orders",
    "ordres": "work-orders",
    "ordres de travail": "work-orders",
    "sheet1": "work-orders",
    "demandeschat": "chat-messages",
    "demandes": "purchase-requests",
    "demandes d'achat": "purchase-requests",
    "améliorations": "improvements",
    "ameliorations": "improvements",
    "zones": "locations",
    "emplacements": "locations",
    "équipements": "equipments",
    "equipements": "equipments",
    "maintenance préventive": "preventive-maintenance",
    "maintenance preventive": "preventive-maintenance",
}


def clean_item_for_export(item: dict) -> dict:
    """Nettoyer un item pour l'export (convertir types non sérialisables)"""
    import json
    cleaned = {k: v for k, v in item.items() if k != "_id"}
    cleaned["id"] = str(item.get("_id", item.get("id", "")))
    
    for key, value in cleaned.items():
        if isinstance(value, datetime):
            cleaned[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            cleaned[key] = str(value)
        elif isinstance(value, list):
            cleaned[key] = json.dumps(value, default=str)
        elif isinstance(value, dict):
            cleaned[key] = json.dumps(value, default=str)
    
    return cleaned


def detect_csv_separator(content: bytes) -> str:
    """Détecter le séparateur CSV (virgule, point-virgule ou tabulation)"""
    content_str = content.decode('utf-8', errors='ignore')
    first_line = content_str.split('\n')[0] if content_str else ""
    
    comma_count = first_line.count(',')
    semicolon_count = first_line.count(';')
    tab_count = first_line.count('\t')
    
    if semicolon_count > comma_count and semicolon_count > tab_count:
        return ';'
    elif tab_count > comma_count:
        return '\t'
    return ','


def convert_date_field(value, field_name: str):
    """Convertir une valeur de date en datetime"""
    if value is None:
        return None
    
    try:
        if isinstance(value, str):
            # Format français DD/MM/YYYY
            if '/' in value:
                parts = value.split('/')
                if len(parts) == 3:
                    value = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            return datetime.fromisoformat(value)
        elif hasattr(value, 'to_pydatetime'):
            return value.to_pydatetime()
        elif isinstance(value, datetime):
            return value
    except Exception as e:
        logger.warning(f"Erreur conversion date {field_name}: {e}")
    return None


async def process_import_item(item: dict, module: str, collection_name: str, current_user: dict, mode: str) -> dict:
    """Traiter un item pour l'import"""
    import json
    
    # Nettoyer les NaN
    cleaned = {k: v for k, v in item.items() if pd.notna(v)}
    
    # Initialiser les champs liste
    list_fields = ["comments", "attachments", "historique", "permissions", "parts_used"]
    for field in list_fields:
        if field in cleaned:
            if isinstance(cleaned[field], str):
                try:
                    parsed = json.loads(cleaned[field])
                    cleaned[field] = parsed if isinstance(parsed, list) else []
                except:
                    cleaned[field] = []
            elif not isinstance(cleaned[field], list):
                cleaned[field] = []
        else:
            cleaned[field] = []
    
    # Traitement spécifique par module
    if module == "purchase-history":
        # Convertir les champs numériques
        for num_field in ["quantite", "montantLigneHT", "quantiteRetournee"]:
            if num_field in cleaned:
                try:
                    value = cleaned[num_field]
                    if isinstance(value, str):
                        value = value.replace(',', '.').replace(' ', '')
                    cleaned[num_field] = float(value)
                except:
                    cleaned[num_field] = 0.0
        
        # Convertir date
        if "dateCreation" in cleaned:
            cleaned["dateCreation"] = convert_date_field(cleaned["dateCreation"], "dateCreation")
        
        cleaned["dateEnregistrement"] = datetime.utcnow()
        if "creationUser" not in cleaned or not cleaned["creationUser"]:
            cleaned["creationUser"] = current_user.get("email", "import")
    
    else:
        # Traitement générique
        date_fields = ["dateCreation", "dateDebut", "dateFin", "installDate", "dateEnregistrement"]
        for date_field in date_fields:
            if date_field in cleaned:
                cleaned[date_field] = convert_date_field(cleaned[date_field], date_field)
        
        if "dateCreation" not in cleaned:
            cleaned["dateCreation"] = datetime.utcnow()
        
        # Champs spécifiques work-orders et improvements
        if module in ["work-orders", "improvements"]:
            if "numero" not in cleaned:
                last_item = await db[collection_name].find_one(sort=[("numero", -1)])
                last_num = last_item.get("numero", 0) if last_item else 0
                if isinstance(last_num, str):
                    try:
                        last_num = int(last_num.replace("N/A", "0"))
                    except:
                        last_num = 0
                cleaned["numero"] = last_num + 1
            
            if "statut" not in cleaned:
                cleaned["statut"] = "OUVERT"
            if "priorite" not in cleaned:
                cleaned["priorite"] = "AUCUNE"
            if "categorie" not in cleaned:
                cleaned["categorie"] = "TRAVAUX_DIVERS"
    
    # Générer/vérifier l'ID
    item_id = cleaned.get("id")
    
    if item_id and mode == "replace":
        # Mode remplacement: mettre à jour si existe
        existing = await db[collection_name].find_one({"id": item_id})
        if existing:
            await db[collection_name].update_one({"id": item_id}, {"$set": cleaned})
            return {"action": "updated", "id": item_id}
    
    # Générer un nouvel ID si nécessaire
    if not item_id:
        from uuid import uuid4
        cleaned["id"] = str(uuid4())
    
    await db[collection_name].insert_one(cleaned)
    return {"action": "inserted", "id": cleaned["id"]}


# Fonction pour obtenir get_current_admin_user (sera définie depuis server.py)
_get_current_admin_user = None

def set_auth_dependency(auth_func):
    """Configurer la fonction d'authentification admin"""
    global _get_current_admin_user
    _get_current_admin_user = auth_func


@router.get("/export/{module}")
async def export_data(
    module: str,
    format: str = "csv",
    current_user: dict = Depends(lambda: _get_current_admin_user)
):
    """Exporter les données d'un module (admin uniquement)"""
    # Import de la dépendance ici pour éviter les imports circulaires
    from server import get_current_admin_user
    
    try:
        if module not in EXPORT_MODULES and module != "all":
            raise HTTPException(status_code=400, detail="Module invalide")
        
        data_to_export = {}
        
        if module == "all":
            modules_to_export = EXPORT_MODULES
        else:
            modules_to_export = {module: EXPORT_MODULES[module]}
        
        for mod_name, collection_name in modules_to_export.items():
            items = await db[collection_name].find().to_list(10000)
            cleaned_items = [clean_item_for_export(item) for item in items]
            data_to_export[mod_name] = cleaned_items
        
        # Générer le fichier
        if format == "csv":
            if len(data_to_export) == 1:
                mod_name = list(data_to_export.keys())[0]
                df = pd.DataFrame(data_to_export[mod_name])
                
                output = io.StringIO()
                df.to_csv(output, index=False, encoding='utf-8')
                output.seek(0)
                
                return StreamingResponse(
                    io.BytesIO(output.getvalue().encode('utf-8')),
                    media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={mod_name}.csv"}
                )
            else:
                raise HTTPException(status_code=400, detail="Pour exporter tout, utilisez le format xlsx")
        
        elif format == "xlsx":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                for mod_name, items in data_to_export.items():
                    df = pd.DataFrame(items)
                    sheet_name = mod_name[:31]
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            output.seek(0)
            filename = f"export_{module}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Format non supporté (csv ou xlsx)")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur export: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/{module}")
async def import_data(
    module: str,
    mode: str = "add",
    file: UploadFile = File(...),
    current_user: dict = Depends(lambda: _get_current_admin_user)
):
    """Importer les données d'un module (admin uniquement)"""
    from server import get_current_admin_user
    
    try:
        if module not in EXPORT_MODULES and module != "all":
            raise HTTPException(status_code=400, detail="Module invalide")
        
        if module == "all":
            modules_to_import = EXPORT_MODULES
        else:
            modules_to_import = {module: EXPORT_MODULES[module]}
        
        content = await file.read()
        data_sheets = {}
        
        # Lire le fichier selon son format
        try:
            if file.filename.endswith('.csv'):
                separator = detect_csv_separator(content)
                logger.info(f"📋 Séparateur détecté: '{separator}'")
                df = pd.read_csv(io.BytesIO(content), sep=separator, encoding='utf-8')
                logger.info(f"✅ CSV lu: {len(df)} lignes, {len(df.columns)} colonnes")
                data_sheets[module] = df
                
            elif file.filename.endswith(('.xlsx', '.xls', '.xlsb')):
                if module == "all":
                    all_sheets = pd.read_excel(io.BytesIO(content), sheet_name=None, engine='openpyxl')
                    logger.info(f"✅ Excel multi-feuilles: {len(all_sheets)} feuilles")
                    
                    for sheet_name, df in all_sheets.items():
                        module_name = SHEET_TO_MODULE.get(sheet_name.lower())
                        if module_name and module_name in modules_to_import:
                            data_sheets[module_name] = df
                            logger.info(f"📋 Feuille '{sheet_name}' → module '{module_name}': {len(df)} lignes")
                    
                    if not data_sheets:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Aucune feuille reconnue. Disponibles: {list(all_sheets.keys())}"
                        )
                else:
                    df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
                    data_sheets[module] = df
            else:
                raise HTTPException(status_code=400, detail="Format non supporté (CSV, XLSX, XLS)")
                
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur lecture: {str(e)}")
        
        # Traiter les données
        stats = {
            "total": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "modules": {}
        }
        
        for current_module, df in data_sheets.items():
            collection_name = modules_to_import[current_module]
            
            # Appliquer le mapping des colonnes
            if current_module in COLUMN_MAPPINGS:
                df = df.rename(columns=COLUMN_MAPPINGS[current_module])
            
            # Nettoyer les noms de colonnes
            df.columns = [str(col).strip() if col is not None else f'col_{i}' for i, col in enumerate(df.columns)]
            
            items = df.to_dict('records')
            module_stats = {"total": len(items), "inserted": 0, "updated": 0, "skipped": 0, "errors": []}
            
            logger.info(f"🔄 Module '{current_module}': {len(items)} éléments")
            
            for idx, item in enumerate(items):
                try:
                    result = await process_import_item(item, current_module, collection_name, current_user, mode)
                    if result["action"] == "inserted":
                        module_stats["inserted"] += 1
                    elif result["action"] == "updated":
                        module_stats["updated"] += 1
                except Exception as e:
                    module_stats["errors"].append(f"Ligne {idx+1}: {str(e)[:100]}")
                    module_stats["skipped"] += 1
            
            stats["modules"][current_module] = module_stats
            stats["total"] += module_stats["total"]
            stats["inserted"] += module_stats["inserted"]
            stats["updated"] += module_stats["updated"]
            stats["skipped"] += module_stats["skipped"]
            stats["errors"].extend(module_stats["errors"][:5])
        
        logger.info(f"✅ Import terminé: {stats['inserted']} insérés, {stats['updated']} mis à jour, {stats['skipped']} ignorés")
        
        return {
            "success": True,
            "message": f"Import réussi: {stats['inserted']} insérés, {stats['updated']} mis à jour",
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur import: {e}")
        raise HTTPException(status_code=500, detail=str(e))
