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
