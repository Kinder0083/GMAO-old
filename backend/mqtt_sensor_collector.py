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
                sensor_id = sensor.get("id")
                sensor_name = sensor.get("nom", "Unknown")
                
                if topic and topic not in self.subscribed_topics:
                    # Enregistrer le mapping topic -> sensor_id
                    self.topic_sensor_map[topic] = sensor_id
                    
                    # S'abonner au topic (sans callback spécifique, on utilisera le handler global)
                    success = mqtt_manager.subscribe(
                        topic=topic,
                        qos=0,
                        callback=self._create_sync_callback(sensor_id)
                    )
                    
                    if success:
                        self.subscribed_topics.add(topic)
                        logger.info(f"📡 Abonné au topic '{topic}' pour le capteur '{sensor_name}'")
                    else:
                        logger.error(f"❌ Échec abonnement au topic '{topic}' pour le capteur '{sensor_name}'")
                    
        except Exception as e:
            logger.error(f"Erreur lors de l'abonnement aux capteurs MQTT: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    def _create_sync_callback(self, sensor_id: str):
        """Créer un callback synchrone qui schedule le traitement async"""
        def callback(topic: str, payload: str, qos: int):
            # Utiliser le loop de l'application pour scheduler la tâche async
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Si on est dans un thread différent, utiliser call_soon_threadsafe
                    loop.call_soon_threadsafe(
                        lambda: asyncio.create_task(
                            self.handle_mqtt_message(sensor_id, topic, payload)
                        )
                    )
                else:
                    # Sinon, créer directement la tâche
                    asyncio.create_task(self.handle_mqtt_message(sensor_id, topic, payload))
            except RuntimeError:
                # Pas de loop en cours, utiliser run_coroutine_threadsafe
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(self.handle_mqtt_message(sensor_id, topic, payload))
                except Exception as e:
                    logger.error(f"Erreur exécution callback async: {e}")
        
        return callback
            
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
                
            # Parser le payload - utiliser format_json pour déterminer si on doit formater
            format_json = sensor.get("format_json", False)
            value = self.extract_value(payload, format_json)
            
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
            
            # Créer un relevé (toujours, car on veut enregistrer chaque changement)
            await self.create_reading(sensor, value_float)
            
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
            
    def extract_value(self, payload: str, format_json: bool = False) -> Optional[float]:
        """Extraire la valeur du payload MQTT
        
        Args:
            payload: Le contenu du message MQTT
            format_json: Si True, essayer de parser comme JSON et extraire la valeur
        """
        try:
            # Essayer d'abord de convertir directement en nombre
            try:
                return float(payload.strip())
            except (ValueError, TypeError):
                pass
            
            # Si format_json est activé ou si la conversion directe a échoué, essayer JSON
            try:
                data = json.loads(payload)
                
                if isinstance(data, (int, float)):
                    return float(data)
                    
                if isinstance(data, dict):
                    # Chercher les clés communes pour la valeur
                    for key in ["value", "data", "reading", "val", "v", "voltage", "current", "power", "temperature", "humidity", "pressure"]:
                        if key in data:
                            try:
                                return float(data[key])
                            except (ValueError, TypeError):
                                continue
                    
                    # Sinon prendre la première valeur numérique
                    for v in data.values():
                        try:
                            return float(v)
                        except (ValueError, TypeError):
                            continue
                            
                return None
                
            except json.JSONDecodeError:
                return None
                
        except Exception as e:
            logger.error(f"Erreur extraction valeur: {e}")
            return None
            
    async def create_reading(self, sensor: dict, value: float):
        """Créer un relevé pour chaque message reçu"""
        try:
            now = datetime.now(timezone.utc)
            
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
            
            logger.debug(f"✅ Relevé capteur créé pour '{sensor['nom']}': {value} {sensor.get('unite', '')}")
                
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
