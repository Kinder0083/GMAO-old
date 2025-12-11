"""
Routes API pour les capteurs IoT
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from models import Sensor, SensorCreate, SensorUpdate, SensorReading, SensorReadingCreate
from dependencies import get_current_user, get_current_admin_user
from datetime import datetime, timezone, timedelta
import logging
from uuid import uuid4

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sensors", tags=["sensors"])

# Variables globales (seront injectées depuis server.py)
db = None

def init_sensor_routes(database):
    """Initialize sensor routes with database"""
    global db
    db = database

# =======================
# Sensors CRUD
# =======================

@router.post("", response_model=Sensor, status_code=201)
async def create_sensor(
    sensor: SensorCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Créer un nouveau capteur (admin seulement)"""
    try:
        sensor_id = str(uuid4())
        sensor_data = sensor.model_dump()
        sensor_data["id"] = sensor_id
        sensor_data["date_creation"] = datetime.now(timezone.utc)
        sensor_data["actif"] = True
        sensor_data["created_by"] = current_user["id"]
        sensor_data["current_value"] = None
        sensor_data["last_update"] = None
        
        # Récupérer les informations de l'emplacement si fourni
        if sensor_data.get("emplacement_id"):
            location = await db.locations.find_one({"id": sensor_data["emplacement_id"]}, {"_id": 0})
            if location:
                sensor_data["emplacement"] = {"id": location["id"], "nom": location["nom"]}
        
        await db.sensors.insert_one(sensor_data)
        
        # Rafraîchir les abonnements MQTT
        from mqtt_sensor_collector import mqtt_sensor_collector
        await mqtt_sensor_collector.refresh_subscriptions()
        
        logger.info(f"Capteur créé: {sensor.nom} (type: {sensor.type})")
        
        return Sensor(**sensor_data)
        
    except Exception as e:
        logger.error(f"Erreur création capteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[Sensor])
async def get_all_sensors(
    type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les capteurs actifs"""
    try:
        query = {"actif": True}
        if type:
            query["type"] = type
            
        sensors = []
        async for sensor in db.sensors.find(query, {"_id": 0}).sort("date_creation", -1):
            sensors.append(Sensor(**sensor))
        
        return sensors
        
    except Exception as e:
        logger.error(f"Erreur récupération capteurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sensor_id}", response_model=Sensor)
async def get_sensor(
    sensor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un capteur spécifique"""
    sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur non trouvé")
    return Sensor(**sensor)


@router.put("/{sensor_id}", response_model=Sensor)
async def update_sensor(
    sensor_id: str,
    sensor_update: SensorUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Mettre à jour un capteur (admin seulement)"""
    sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur non trouvé")
    
    update_data = {k: v for k, v in sensor_update.model_dump().items() if v is not None}
    
    # Mettre à jour l'emplacement si nécessaire
    if "emplacement_id" in update_data:
        if update_data["emplacement_id"]:
            location = await db.locations.find_one({"id": update_data["emplacement_id"]}, {"_id": 0})
            if location:
                update_data["emplacement"] = {"id": location["id"], "nom": location["nom"]}
        else:
            update_data["emplacement"] = None
    
    await db.sensors.update_one({"id": sensor_id}, {"$set": update_data})
    
    # Récupérer le capteur mis à jour
    updated_sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    
    # Rafraîchir les abonnements MQTT si topic modifié
    if "mqtt_topic" in update_data:
        from mqtt_sensor_collector import mqtt_sensor_collector
        await mqtt_sensor_collector.refresh_subscriptions()
    
    return Sensor(**updated_sensor)


@router.delete("/{sensor_id}")
async def delete_sensor(
    sensor_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un capteur (admin seulement)"""
    sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
    if not sensor:
        raise HTTPException(status_code=404, detail="Capteur non trouvé")
    
    # Soft delete
    await db.sensors.update_one({"id": sensor_id}, {"$set": {"actif": False}})
    
    return {"message": "Capteur supprimé"}


# =======================
# Sensor Readings
# =======================

@router.get("/{sensor_id}/readings", response_model=List[SensorReading])
async def get_sensor_readings(
    sensor_id: str,
    limit: int = 100,
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les relevés d'un capteur"""
    try:
        # Calculer la date de début
        start_date = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        readings = []
        async for reading in db.sensor_readings.find(
            {
                "sensor_id": sensor_id,
                "timestamp": {"$gte": start_date}
            },
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit):
            readings.append(SensorReading(**reading))
        
        return readings
        
    except Exception as e:
        logger.error(f"Erreur récupération relevés capteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sensor_id}/statistics")
async def get_sensor_statistics(
    sensor_id: str,
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Obtenir les statistiques d'un capteur"""
    try:
        start_date = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        # Récupérer tous les relevés de la période
        readings = await db.sensor_readings.find(
            {
                "sensor_id": sensor_id,
                "timestamp": {"$gte": start_date}
            },
            {"_id": 0}
        ).sort("timestamp", 1).to_list(length=None)
        
        if not readings:
            return {
                "count": 0,
                "min": None,
                "max": None,
                "avg": None,
                "current": None
            }
        
        values = [r["value"] for r in readings]
        
        stats = {
            "count": len(readings),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "current": readings[-1]["value"] if readings else None,
            "unit": readings[0].get("unit", ""),
            "last_update": readings[-1]["timestamp"].isoformat() if readings else None
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Erreur calcul statistiques capteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sensor_id}/readings")
async def clear_sensor_readings(
    sensor_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Effacer les relevés d'un capteur (admin seulement)"""
    try:
        result = await db.sensor_readings.delete_many({"sensor_id": sensor_id})
        
        return {
            "message": f"{result.deleted_count} relevés supprimés"
        }
        
    except Exception as e:
        logger.error(f"Erreur suppression relevés capteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =======================
# Templates & Import/Export
# =======================

@router.get("/templates/list")
async def get_sensor_templates(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les modèles de capteurs disponibles"""
    from sensor_templates import get_all_templates
    return get_all_templates()


@router.get("/templates/{template_id}")
async def get_sensor_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un modèle de capteur spécifique"""
    from sensor_templates import get_template
    template = get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    
    return template


@router.get("/export/json")
async def export_sensors_json(
    current_user: dict = Depends(get_current_admin_user)
):
    """Exporter tous les capteurs en JSON (admin seulement)"""
    from fastapi.responses import JSONResponse
    import json
    
    try:
        sensors = await db.sensors.find({"actif": True}, {"_id": 0}).to_list(length=None)
        
        export_data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "exported_by": current_user.get("email"),
            "total_sensors": len(sensors),
            "sensors": sensors
        }
        
        return JSONResponse(
            content=export_data,
            headers={
                "Content-Disposition": f"attachment; filename=sensors_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            }
        )
        
    except Exception as e:
        logger.error(f"Erreur export capteurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/csv")
async def export_sensors_csv(
    current_user: dict = Depends(get_current_admin_user)
):
    """Exporter tous les capteurs en CSV (admin seulement)"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    try:
        sensors = await db.sensors.find({"actif": True}, {"_id": 0}).to_list(length=None)
        
        # Créer le CSV
        output = io.StringIO()
        fieldnames = ['nom', 'type', 'unite', 'mqtt_topic', 'mqtt_json_key', 'mqtt_refresh_interval', 
                      'alert_enabled', 'min_threshold', 'max_threshold', 'emplacement_id']
        
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        for sensor in sensors:
            # Extraire seulement les champs nécessaires
            row = {
                'nom': sensor.get('nom', ''),
                'type': sensor.get('type', ''),
                'unite': sensor.get('unite', ''),
                'mqtt_topic': sensor.get('mqtt_topic', ''),
                'mqtt_json_key': sensor.get('mqtt_json_key', 'value'),
                'mqtt_refresh_interval': sensor.get('mqtt_refresh_interval', 60),
                'alert_enabled': sensor.get('alert_enabled', False),
                'min_threshold': sensor.get('min_threshold', ''),
                'max_threshold': sensor.get('max_threshold', ''),
                'emplacement_id': sensor.get('emplacement_id', '')
            }
            writer.writerow(row)
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=sensors_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
        
    except Exception as e:
        logger.error(f"Erreur export CSV capteurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/json")
async def import_sensors_json(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """Importer des capteurs depuis un fichier JSON (admin seulement)"""
    import json
    
    try:
        # Lire le fichier
        content = await file.read()
        data = json.loads(content)
        
        # Valider la structure
        if "sensors" not in data:
            raise HTTPException(status_code=400, detail="Format JSON invalide: clé 'sensors' manquante")
        
        sensors_to_import = data["sensors"]
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for sensor_data in sensors_to_import:
            try:
                # Vérifier si un capteur avec le même topic existe déjà
                existing = await db.sensors.find_one({
                    "mqtt_topic": sensor_data.get("mqtt_topic"),
                    "actif": True
                })
                
                if existing:
                    skipped_count += 1
                    errors.append(f"Capteur '{sensor_data.get('nom')}' ignoré (topic déjà existant)")
                    continue
                
                # Créer un nouveau capteur
                sensor_id = str(uuid4())
                new_sensor = {
                    "id": sensor_id,
                    "nom": sensor_data.get("nom"),
                    "type": sensor_data.get("type"),
                    "unite": sensor_data.get("unite"),
                    "mqtt_topic": sensor_data.get("mqtt_topic"),
                    "mqtt_json_key": sensor_data.get("mqtt_json_key", "value"),
                    "mqtt_refresh_interval": sensor_data.get("mqtt_refresh_interval", 60),
                    "alert_enabled": sensor_data.get("alert_enabled", False),
                    "min_threshold": sensor_data.get("min_threshold"),
                    "max_threshold": sensor_data.get("max_threshold"),
                    "emplacement_id": sensor_data.get("emplacement_id"),
                    "date_creation": datetime.now(timezone.utc),
                    "actif": True,
                    "created_by": current_user["id"],
                    "current_value": None,
                    "last_update": None
                }
                
                # Récupérer l'emplacement si fourni
                if new_sensor.get("emplacement_id"):
                    location = await db.locations.find_one({"id": new_sensor["emplacement_id"]}, {"_id": 0})
                    if location:
                        new_sensor["emplacement"] = {"id": location["id"], "nom": location["nom"]}
                
                await db.sensors.insert_one(new_sensor)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Erreur import capteur '{sensor_data.get('nom', 'inconnu')}': {str(e)}")
        
        return {
            "success": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Fichier JSON invalide")
    except Exception as e:
        logger.error(f"Erreur import capteurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
