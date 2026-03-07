"""
Service de collecte automatique des valeurs MQTT pour les compteurs
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from mqtt_manager import mqtt_manager
import os

logger = logging.getLogger(__name__)

# Configuration MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'gmao_iris'

class MQTTMeterCollector:
    """Collecteur de données MQTT pour les compteurs"""
    
    def __init__(self):
        self.db = None
        self.running = False
        self.subscribed_topics = set()
        
    async def initialize(self, database):
        """Initialiser le collecteur avec la base de données"""
        self.db = database
        logger.info("MQTT Meter Collector initialisé")
        
    async def start(self):
        """Démarrer la collecte automatique"""
        if self.running:
            logger.warning("Collecteur MQTT déjà en cours d'exécution")
            return
            
        self.running = True
        logger.info("🚀 Démarrage du collecteur MQTT pour les compteurs")
        
        # S'abonner aux topics des compteurs actifs avec MQTT activé
        await self.subscribe_to_meters()
        
        logger.info("✅ Collecteur MQTT démarré")
        
    async def stop(self):
        """Arrêter la collecte"""
        self.running = False
        logger.info("Arrêt du collecteur MQTT")
        
    async def subscribe_to_meters(self):
        """S'abonner aux topics MQTT de tous les compteurs actifs"""
        try:
            # Récupérer tous les compteurs avec MQTT activé
            meters = await self.db.meters.find({
                "actif": True,
                "mqtt_enabled": True,
                "mqtt_topic": {"$exists": True, "$ne": ""}
            }, {"_id": 0}).to_list(length=None)
            
            logger.info(f"🔍 {len(meters)} compteur(s) MQTT trouvé(s)")
            
            for meter in meters:
                topic = meter.get("mqtt_topic")
                if topic and topic not in self.subscribed_topics:
                    # S'abonner au topic avec callback
                    mqtt_manager.subscribe(
                        topic=topic,
                        qos=0,
                        callback=lambda t, p, q, mid=meter['id']: asyncio.create_task(
                            self.handle_mqtt_message(mid, t, p)
                        )
                    )
                    self.subscribed_topics.add(topic)
                    logger.info(f"📡 Abonné au topic '{topic}' pour le compteur '{meter['nom']}'")
                    
        except Exception as e:
            logger.error(f"Erreur lors de l'abonnement aux compteurs MQTT: {e}")
            
    async def handle_mqtt_message(self, meter_id: str, topic: str, payload: str):
        """Traiter un message MQTT reçu pour un compteur"""
        try:
            # Récupérer les informations du compteur
            meter = await self.db.meters.find_one({"id": meter_id}, {"_id": 0})
            
            if not meter or not meter.get("mqtt_enabled"):
                return
                
            # Parser le payload
            value = self.extract_value(payload, meter.get("mqtt_json_path"))
            
            if value is None:
                logger.warning(f"Impossible d'extraire la valeur du payload pour {meter['nom']}: {payload[:100]}")
                return
                
            # Convertir en float
            try:
                value_float = float(value)
            except (ValueError, TypeError):
                logger.error(f"Valeur non numérique reçue pour {meter['nom']}: {value}")
                return
                
            logger.info(f"📊 Valeur MQTT reçue pour '{meter['nom']}': {value_float} {meter.get('unite', '')}")
            
            # Mettre à jour la dernière valeur du compteur
            await self.db.meters.update_one(
                {"id": meter_id},
                {
                    "$set": {
                        "mqtt_last_value": value_float,
                        "mqtt_last_update": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Créer un relevé automatique selon l'intervalle configuré
            await self.create_reading_if_needed(meter, value_float)
            
        except Exception as e:
            logger.error(f"Erreur traitement message MQTT pour compteur {meter_id}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            
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
            
            # Suivre le chemin JSON (ex: "sensor.power" -> data['sensor']['power'])
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
            
    async def create_reading_if_needed(self, meter: dict, value: float):
        """Créer un relevé automatique si l'intervalle est écoulé"""
        try:
            # Récupérer le dernier relevé
            last_reading = await self.db.meter_readings.find_one(
                {"meter_id": meter["id"]},
                {"_id": 0},
                sort=[("date_releve", -1)]
            )
            
            # Vérifier si on doit créer un nouveau relevé
            now = datetime.now(timezone.utc)
            interval_minutes = meter.get("mqtt_refresh_interval", 5)
            
            should_create = False
            
            if not last_reading:
                should_create = True
            else:
                last_date = datetime.fromisoformat(last_reading["date_releve"].replace("Z", "+00:00"))
                minutes_since_last = (now - last_date).total_seconds() / 60
                
                if minutes_since_last >= interval_minutes:
                    should_create = True
                    
            if should_create:
                # Créer le relevé
                reading = {
                    "id": f"mqtt_{meter['id']}_{int(now.timestamp())}",
                    "meter_id": meter["id"],
                    "meter_nom": meter.get("nom"),
                    "date_releve": now.isoformat(),
                    "valeur": value,
                    "notes": "Relevé automatique MQTT",
                    "created_by": "system_mqtt",
                    "created_by_name": "MQTT Automatique",
                    "prix_unitaire": meter.get("prix_unitaire"),
                    "abonnement_mensuel": meter.get("abonnement_mensuel"),
                    "date_creation": now.isoformat()
                }
                
                # Calculer la consommation par rapport au relevé précédent
                if last_reading:
                    consommation = value - last_reading["valeur"]
                    reading["consommation"] = max(0, consommation)  # Éviter les valeurs négatives
                    
                    # Calculer le coût
                    if reading.get("consommation") and meter.get("prix_unitaire"):
                        reading["cout"] = reading["consommation"] * meter["prix_unitaire"]
                
                await self.db.meter_readings.insert_one(reading)
                
                logger.info(f"✅ Relevé automatique créé pour '{meter['nom']}': {value} {meter.get('unite', '')}")
                
        except Exception as e:
            logger.error(f"Erreur création relevé automatique: {e}")
            
    async def refresh_subscriptions(self):
        """Rafraîchir les abonnements (appelé quand un compteur est modifié)"""
        # Désabonner de tous les topics actuels
        for topic in self.subscribed_topics:
            mqtt_manager.unsubscribe(topic)
        self.subscribed_topics.clear()
        
        # Réabonner aux compteurs actifs
        await self.subscribe_to_meters()

# Instance globale
mqtt_meter_collector = MQTTMeterCollector()
