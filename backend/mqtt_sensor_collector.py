"""
Service de collecte automatique des valeurs MQTT pour les capteurs
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from mqtt_manager import mqtt_manager

logger = logging.getLogger(__name__)

class MQTTSensorCollector:
    """Collecteur de données MQTT pour les capteurs"""
    
    def __init__(self):
        self.db = None
        self.running = False
        self.subscribed_topics = set()
        
    async def initialize(self, database):
        """Initialiser le collecteur avec la base de données"""
        self.db = database
        logger.info("MQTT Sensor Collector initialisé")
        
    async def start(self):
        """Démarrer la collecte automatique"""
        if self.running:
            logger.warning("Collecteur MQTT capteurs déjà en cours d'exécution")
            return
            
        self.running = True
        logger.info("🚀 Démarrage du collecteur MQTT pour les capteurs")
        
        # S'abonner aux topics des capteurs actifs
        await self.subscribe_to_sensors()
        
        logger.info("✅ Collecteur MQTT capteurs démarré")
        
    async def stop(self):
        """Arrêter la collecte"""
        self.running = False
        logger.info("Arrêt du collecteur MQTT capteurs")
        
    async def subscribe_to_sensors(self):
        """S'abonner aux topics MQTT de tous les capteurs actifs"""
        try:
            # Récupérer tous les capteurs actifs
            sensors = await self.db.sensors.find({
                "actif": True,
                "mqtt_topic": {"$exists": True, "$ne": ""}
            }, {"_id": 0}).to_list(length=None)
            
            logger.info(f"🔍 {len(sensors)} capteur(s) MQTT trouvé(s)")
            
            for sensor in sensors:
                topic = sensor.get("mqtt_topic")
                if topic and topic not in self.subscribed_topics:
                    # S'abonner au topic avec callback
                    mqtt_manager.subscribe(
                        topic=topic,
                        qos=0,
                        callback=lambda t, p, q, sid=sensor['id']: asyncio.create_task(
                            self.handle_mqtt_message(sid, t, p)
                        )
                    )
                    self.subscribed_topics.add(topic)
                    logger.info(f"📡 Abonné au topic '{topic}' pour le capteur '{sensor['nom']}'")
                    
        except Exception as e:
            logger.error(f"Erreur lors de l'abonnement aux capteurs MQTT: {e}")
            
    async def handle_mqtt_message(self, sensor_id: str, topic: str, payload: str):
        """Traiter un message MQTT reçu pour un capteur"""
        # Importer le logger MQTT
        from mqtt_logger import mqtt_logger
        
        try:
            # Récupérer les informations du capteur
            sensor = await self.db.sensors.find_one({"id": sensor_id}, {"_id": 0})
            
            if not sensor or not sensor.get("actif"):
                if mqtt_logger:
                    await mqtt_logger.log_message(
                        topic=topic,
                        payload=payload[:200],
                        sensor_id=sensor_id,
                        success=False,
                        error_message="Capteur non trouvé ou inactif"
                    )
                return
                
            # Parser le payload
            value = self.extract_value(payload, sensor.get("mqtt_json_path"))
            
            if value is None:
                logger.warning(f"Impossible d'extraire la valeur du payload pour {sensor['nom']}: {payload[:100]}")
                if mqtt_logger:
                    await mqtt_logger.log_message(
                        topic=topic,
                        payload=payload[:200],
                        sensor_id=sensor_id,
                        sensor_name=sensor.get('nom'),
                        success=False,
                        error_message="Impossible d'extraire la valeur"
                    )
                return
                
            # Convertir en float
            try:
                value_float = float(value)
            except (ValueError, TypeError):
                logger.error(f"Valeur non numérique reçue pour {sensor['nom']}: {value}")
                if mqtt_logger:
                    await mqtt_logger.log_message(
                        topic=topic,
                        payload=payload[:200],
                        sensor_id=sensor_id,
                        sensor_name=sensor.get('nom'),
                        success=False,
                        error_message=f"Valeur non numérique: {value}"
                    )
                return
                
            logger.info(f"📊 Valeur MQTT reçue pour capteur '{sensor['nom']}': {value_float} {sensor.get('unite', '')}")
            
            # Logger le message réussi
            if mqtt_logger:
                await mqtt_logger.log_message(
                    topic=topic,
                    payload=payload[:200],
                    sensor_id=sensor_id,
                    sensor_name=sensor.get('nom'),
                    success=True
                )
            
            # Mettre à jour la valeur actuelle du capteur
            await self.db.sensors.update_one(
                {"id": sensor_id},
                {
                    "$set": {
                        "current_value": value_float,
                        "last_update": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Créer un relevé selon l'intervalle configuré
            await self.create_reading_if_needed(sensor, value_float)
            
            # Vérifier les seuils d'alerte si activé
            if sensor.get("alert_enabled"):
                await self.check_alert_thresholds(sensor, value_float)
            
        except Exception as e:
            logger.error(f"Erreur traitement message MQTT pour capteur {sensor_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Logger l'erreur
            from mqtt_logger import mqtt_logger
            if mqtt_logger:
                await mqtt_logger.log_message(
                    topic=topic,
                    payload=payload[:200] if payload else "",
                    sensor_id=sensor_id,
                    success=False,
                    error_message=str(e)
                )
            
    def extract_value(self, payload: str, json_path: Optional[str]) -> Optional[float]:
        """Extraire la valeur du payload MQTT"""
        try:
            # Si pas de chemin JSON, essayer de convertir directement
            if not json_path:
                try:
                    return float(payload)
                except ValueError:
                    # Essayer de parser comme JSON
                    data = json.loads(payload)
                    # Si c'est un dict avec une seule clé "value" ou similaire
                    if isinstance(data, dict):
                        if "value" in data:
                            return float(data["value"])
                        elif "data" in data:
                            return float(data["data"])
                        elif "reading" in data:
                            return float(data["reading"])
                        # Sinon prendre la première valeur numérique
                        for v in data.values():
                            try:
                                return float(v)
                            except (ValueError, TypeError):
                                continue
                    return None
            
            # Parser le JSON
            data = json.loads(payload)
            
            # Suivre le chemin JSON (ex: "sensor.temperature" -> data['sensor']['temperature'])
            parts = json_path.split('.')
            value = data
            for part in parts:
                if isinstance(value, dict):
                    value = value.get(part)
                else:
                    return None
                    
            return value
            
        except json.JSONDecodeError:
            # Pas du JSON, essayer conversion directe
            try:
                return float(payload)
            except ValueError:
                return None
        except Exception as e:
            logger.error(f"Erreur extraction valeur: {e}")
            return None
            
    async def create_reading_if_needed(self, sensor: dict, value: float):
        """Créer un relevé selon l'intervalle configuré"""
        try:
            # Récupérer le dernier relevé
            last_reading = await self.db.sensor_readings.find_one(
                {"sensor_id": sensor["id"]},
                {"_id": 0},
                sort=[("timestamp", -1)]
            )
            
            # Vérifier si on doit créer un nouveau relevé
            now = datetime.now(timezone.utc)
            interval_minutes = sensor.get("refresh_interval", 1)
            
            should_create = False
            
            if not last_reading:
                should_create = True
            else:
                last_date = last_reading["timestamp"]
                if isinstance(last_date, str):
                    last_date = datetime.fromisoformat(last_date.replace("Z", "+00:00"))
                    
                minutes_since_last = (now - last_date).total_seconds() / 60
                
                if minutes_since_last >= interval_minutes:
                    should_create = True
                    
            if should_create:
                # Créer le relevé
                reading = {
                    "id": f"sensor_{sensor['id']}_{int(now.timestamp())}",
                    "sensor_id": sensor["id"],
                    "sensor_nom": sensor.get("nom"),
                    "timestamp": now,
                    "value": value,
                    "unit": sensor.get("unite", ""),
                    "date_creation": now
                }
                
                await self.db.sensor_readings.insert_one(reading)
                
                logger.info(f"✅ Relevé capteur créé pour '{sensor['nom']}': {value} {sensor.get('unite', '')}")
                
        except Exception as e:
            logger.error(f"Erreur création relevé capteur: {e}")
            
    async def check_alert_thresholds(self, sensor: dict, value: float):
        """Vérifier les seuils d'alerte et créer des alertes si nécessaire"""
        try:
            from alert_service import alert_service
            from models import AlertType, AlertSeverity
            
            min_threshold = sensor.get("min_threshold")
            max_threshold = sensor.get("max_threshold")
            
            alert_triggered = False
            threshold_value = None
            threshold_type = None
            severity = AlertSeverity.WARNING
            
            if min_threshold is not None and value < min_threshold:
                alert_triggered = True
                threshold_value = min_threshold
                threshold_type = "min"
                severity = AlertSeverity.WARNING
                title = f"Valeur basse - {sensor['nom']}"
                message = f"La valeur du capteur {sensor['nom']} est en dessous du seuil minimum.\nValeur actuelle: {value} {sensor.get('unite', '')}\nSeuil minimum: {min_threshold} {sensor.get('unite', '')}"
                
            elif max_threshold is not None and value > max_threshold:
                alert_triggered = True
                threshold_value = max_threshold
                threshold_type = "max"
                severity = AlertSeverity.CRITICAL
                title = f"Valeur élevée - {sensor['nom']}"
                message = f"La valeur du capteur {sensor['nom']} dépasse le seuil maximum.\nValeur actuelle: {value} {sensor.get('unite', '')}\nSeuil maximum: {max_threshold} {sensor.get('unite', '')}"
                
            if alert_triggered:
                # Créer l'alerte avec le service
                await alert_service.create_alert(
                    alert_type=AlertType.SENSOR_THRESHOLD,
                    severity=severity,
                    title=title,
                    message=message,
                    source_type="sensor",
                    source_id=sensor["id"],
                    source_name=sensor["nom"],
                    value=value,
                    threshold=threshold_value,
                    threshold_type=threshold_type
                )
                
                logger.warning(f"🚨 Alerte créée pour capteur {sensor['nom']}: {title}")
                
        except Exception as e:
            logger.error(f"Erreur vérification seuils alerte: {e}")
            
    async def refresh_subscriptions(self):
        """Rafraîchir les abonnements (appelé quand un capteur est modifié)"""
        # Désabonner de tous les topics actuels
        for topic in self.subscribed_topics:
            mqtt_manager.unsubscribe(topic)
        self.subscribed_topics.clear()
        
        # Réabonner aux capteurs actifs
        await self.subscribe_to_sensors()

# Instance globale
mqtt_sensor_collector = MQTTSensorCollector()
