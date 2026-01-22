"""
Service de collecte automatique des valeurs MQTT pour les capteurs
"""
import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from mqtt_manager import mqtt_manager

logger = logging.getLogger(__name__)


async def get_configured_timezone_offset(db):
    """Récupérer l'offset du fuseau horaire configuré depuis la base de données"""
    try:
        settings = await db.system_settings.find_one({"_id": "default"})
        if settings and "timezone_offset" in settings:
            return settings.get("timezone_offset", 0)
        return 0  # UTC par défaut
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du fuseau horaire: {e}")
        return 0


def get_local_datetime(offset_hours: int = 0) -> datetime:
    """Obtenir l'heure actuelle avec le décalage horaire configuré"""
    utc_now = datetime.now(timezone.utc)
    local_tz = timezone(timedelta(hours=offset_hours))
    return utc_now.astimezone(local_tz)


class MQTTSensorCollector:
    """Collecteur de données MQTT pour les capteurs"""
    
    def __init__(self):
        self.db = None
        self.running = False
        self.subscribed_topics = set()
        self.topic_sensor_map = {}  # Mapping topic -> sensor_id
        
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
        
        # S'abonner aux topics des capteurs actifs (si MQTT connecté)
        await self.subscribe_to_sensors()
        
        # Démarrer également le watcher de messages MQTT (solution de secours)
        asyncio.create_task(self._watch_mqtt_messages())
        
        logger.info("✅ Collecteur MQTT capteurs démarré")
    
    async def _watch_mqtt_messages(self):
        """Observer les nouveaux messages MQTT et les traiter pour les capteurs"""
        logger.info("👀 Démarrage du watcher de messages MQTT pour les capteurs")
        
        last_processed_time = datetime.now(timezone.utc)
        
        while self.running:
            try:
                # Attendre un peu avant de vérifier
                await asyncio.sleep(2)
                
                if self.db is None:
                    continue
                
                # Récupérer les messages récents (depuis la dernière vérification)
                recent_messages = await self.db.mqtt_messages.find({
                    "received_at": {"$gt": last_processed_time.isoformat()}
                }).sort("received_at", 1).to_list(length=100)
                
                if recent_messages:
                    # Récupérer tous les capteurs actifs avec leurs topics
                    sensors = await self.db.sensors.find({
                        "actif": True,
                        "mqtt_topic": {"$exists": True, "$ne": ""}
                    }, {"_id": 0}).to_list(length=None)
                    
                    # Créer un mapping topic -> sensor
                    topic_to_sensor = {s["mqtt_topic"]: s for s in sensors}
                    
                    for msg in recent_messages:
                        topic = msg.get("topic")
                        payload = msg.get("payload", "")
                        
                        # Vérifier si ce topic correspond à un capteur
                        if topic in topic_to_sensor:
                            sensor = topic_to_sensor[topic]
                            logger.info(f"📨 Message MQTT détecté pour capteur '{sensor['nom']}': {payload[:50]}...")
                            await self.handle_mqtt_message(sensor["id"], topic, payload)
                    
                    # Mettre à jour le timestamp du dernier message traité
                    last_msg = recent_messages[-1]
                    try:
                        last_processed_time = datetime.fromisoformat(last_msg["received_at"].replace("Z", "+00:00"))
                    except:
                        last_processed_time = datetime.now(timezone.utc)
                        
            except Exception as e:
                logger.error(f"Erreur dans le watcher MQTT capteurs: {e}")
                import traceback
                logger.error(traceback.format_exc())
                await asyncio.sleep(5)
        
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
            
            # Appliquer la formule si définie
            formula = sensor.get("formula")
            if formula:
                original_value = value_float
                value_float = self.apply_formula(value_float, formula)
                if value_float is None:
                    logger.error(f"Erreur application formule '{formula}' sur valeur {original_value} pour {sensor['nom']}")
                    if mqtt_logger:
                        await mqtt_logger.log_message(
                            topic=topic,
                            payload=payload[:200],
                            sensor_id=sensor_id,
                            sensor_name=sensor.get('nom'),
                            success=False,
                            error_message=f"Erreur formule: {formula}"
                        )
                    return
                logger.info(f"🔢 Formule '{formula}' appliquée: {original_value} → {value_float}")
                
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
            
            # Notifier via WebSocket pour mise à jour temps réel
            try:
                from realtime_manager import realtime_manager
                await realtime_manager.broadcast_update("sensors", {
                    "action": "sensor_value_update",
                    "sensor_id": sensor_id,
                    "value": value_float,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            except Exception as ws_error:
                logger.debug(f"WebSocket notification error (non-critical): {ws_error}")
            
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
    
    def apply_formula(self, value: float, formula: str) -> Optional[float]:
        """Appliquer une formule mathématique à la valeur
        
        Args:
            value: La valeur brute à transformer
            formula: La formule à appliquer (ex: x/100, (x-32)*5/9, x*2+10)
            
        Returns:
            La valeur transformée ou None en cas d'erreur
        """
        if not formula or not formula.strip():
            return value
            
        try:
            # Nettoyer la formule
            formula = formula.strip()
            
            # Vérifier que la formule contient bien 'x'
            if 'x' not in formula.lower():
                # Si la formule ne contient pas x, c'est peut-être une opération simple comme "/100"
                # Dans ce cas, préfixer avec x
                if formula.startswith(('+', '-', '*', '/')):
                    formula = f"x{formula}"
                else:
                    return value
            
            # Remplacer 'x' ou 'X' par la valeur
            expression = formula.lower().replace('x', str(value))
            
            # Liste des caractères/fonctions autorisés pour la sécurité
            allowed_chars = set('0123456789.+-*/() ')
            allowed_funcs = {'abs', 'round', 'min', 'max', 'pow'}
            
            # Vérifier que l'expression ne contient que des caractères autorisés
            # (sauf les fonctions mathématiques autorisées)
            clean_expr = expression
            for func in allowed_funcs:
                clean_expr = clean_expr.replace(func, '')
            
            if not all(c in allowed_chars for c in clean_expr):
                logger.warning(f"Caractères non autorisés dans la formule: {formula}")
                return None
            
            # Évaluer l'expression de manière sécurisée
            # Utiliser un environnement restreint
            safe_dict = {
                '__builtins__': {},
                'abs': abs,
                'round': round,
                'min': min,
                'max': max,
                'pow': pow
            }
            
            result = eval(expression, safe_dict)
            
            # S'assurer que le résultat est un nombre
            if isinstance(result, (int, float)) and not isinstance(result, bool):
                return float(result)
            else:
                logger.warning(f"Résultat non numérique de la formule: {result}")
                return None
                
        except ZeroDivisionError:
            logger.error(f"Division par zéro dans la formule: {formula}")
            return None
        except Exception as e:
            logger.error(f"Erreur évaluation formule '{formula}': {e}")
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
        logger.info("🔄 Rafraîchissement des abonnements MQTT capteurs...")
        
        # Désabonner de tous les topics actuels
        for topic in self.subscribed_topics:
            mqtt_manager.unsubscribe(topic)
        self.subscribed_topics.clear()
        self.topic_sensor_map.clear()
        
        # Réabonner aux capteurs actifs
        await self.subscribe_to_sensors()
        
        logger.info(f"✅ Rafraîchissement terminé - {len(self.subscribed_topics)} topic(s) abonné(s)")

# Instance globale
mqtt_sensor_collector = MQTTSensorCollector()
