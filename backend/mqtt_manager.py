"""
Gestionnaire MQTT pour connexion, publication et abonnement
"""
import paho.mqtt.client as mqtt
import json
import logging
from typing import Optional, Callable, Dict
from datetime import datetime, timezone
import threading
import os

logger = logging.getLogger(__name__)

class MQTTManager:
    """Gestionnaire de connexion MQTT"""
    
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False
        self.config: Dict = {}
        self.message_callbacks: Dict[str, list] = {}  # {topic: [callbacks]}
        self.connection_lock = threading.Lock()
        self.db = None  # Référence à la base de données pour restaurer les abonnements
        self._auto_restore = True  # Activer la restauration automatique des abonnements
        
    def set_database(self, database):
        """Définir la référence à la base de données pour restaurer les abonnements"""
        self.db = database
        logger.info("MQTT Manager: référence base de données configurée")
        
    def configure(self, host: str, port: int, username: str = None, password: str = None, 
                  use_ssl: bool = False, client_id: str = "gmao_iris"):
        """Configurer les paramètres de connexion MQTT"""
        self.config = {
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "use_ssl": use_ssl,
            "client_id": client_id
        }
        logger.info(f"Configuration MQTT mise à jour: {host}:{port}")
    
    def connect(self) -> bool:
        """Se connecter au broker MQTT"""
        with self.connection_lock:
            if self.is_connected:
                logger.info("Déjà connecté au broker MQTT")
                return True
            
            if not self.config.get("host"):
                logger.error("Configuration MQTT manquante")
                return False
            
            try:
                # Créer le client MQTT
                self.client = mqtt.Client(client_id=self.config.get("client_id", "gmao_iris"))
                
                # Configuration des callbacks
                self.client.on_connect = self._on_connect
                self.client.on_disconnect = self._on_disconnect
                self.client.on_message = self._on_message
                
                # Authentification
                if self.config.get("username"):
                    self.client.username_pw_set(
                        self.config["username"],
                        self.config.get("password")
                    )
                
                # SSL/TLS
                if self.config.get("use_ssl"):
                    self.client.tls_set()
                
                # Connexion
                self.client.connect(
                    self.config["host"],
                    self.config["port"],
                    keepalive=60
                )
                
                # Démarrer la boucle dans un thread séparé
                self.client.loop_start()
                
                logger.info(f"Connexion MQTT initiée vers {self.config['host']}:{self.config['port']}")
                return True
                
            except Exception as e:
                logger.error(f"Erreur connexion MQTT: {e}")
                self.is_connected = False
                return False
    
    def disconnect(self):
        """Se déconnecter du broker MQTT"""
        if self.client and self.is_connected:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
            logger.info("Déconnecté du broker MQTT")
    
    def publish(self, topic: str, payload: str, qos: int = 0, retain: bool = False) -> bool:
        """Publier un message sur un topic"""
        if not self.is_connected:
            if not self.connect():
                return False
        
        try:
            result = self.client.publish(topic, payload, qos=qos, retain=retain)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Message publié sur {topic}: {payload[:100]}...")
                return True
            else:
                logger.error(f"Erreur publication: {result.rc}")
                return False
        except Exception as e:
            logger.error(f"Erreur lors de la publication: {e}")
            return False
    
    def subscribe(self, topic: str, qos: int = 0, callback: Callable = None):
        """S'abonner à un topic MQTT"""
        logger.info(f"[MQTT] Demande d'abonnement à '{topic}' (QoS={qos})")
        
        if not self.is_connected:
            logger.info("[MQTT] Pas connecté, tentative de connexion...")
            if not self.connect():
                logger.error("[MQTT] Impossible de se connecter pour s'abonner")
                return False
        
        # Attendre que la connexion soit vraiment établie
        import time
        max_wait = 5  # secondes
        waited = 0
        while not self.is_connected and waited < max_wait:
            time.sleep(0.1)
            waited += 0.1
        
        if not self.is_connected:
            logger.error("[MQTT] Timeout: connexion MQTT non établie")
            return False
        
        try:
            logger.info(f"[MQTT] Envoi de la commande subscribe pour '{topic}'...")
            result = self.client.subscribe(topic, qos=qos)
            
            logger.info(f"[MQTT] Résultat subscribe: {result}")
            
            if result[0] != mqtt.MQTT_ERR_SUCCESS:
                logger.error(f"[MQTT] Erreur lors de la souscription: code {result[0]}")
                return False
            
            # Enregistrer le callback pour ce topic
            if callback:
                if topic not in self.message_callbacks:
                    self.message_callbacks[topic] = []
                if callback not in self.message_callbacks[topic]:
                    self.message_callbacks[topic].append(callback)
                logger.info(f"[MQTT] Callback enregistré pour '{topic}'")
            
            logger.info(f"✅ [MQTT] Abonné au topic: {topic} (QoS: {qos})")
            return True
        except Exception as e:
            logger.error(f"❌ [MQTT] Erreur lors de l'abonnement à {topic}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def unsubscribe(self, topic: str):
        """Se désabonner d'un topic"""
        if self.client and self.is_connected:
            self.client.unsubscribe(topic)
            if topic in self.message_callbacks:
                del self.message_callbacks[topic]
            logger.info(f"Désabonné du topic: {topic}")
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback appelé lors de la connexion"""
        if rc == 0:
            self.is_connected = True
            logger.info("✅ [MQTT] Connecté au broker MQTT avec succès")
            logger.info(f"[MQTT] Flags: {flags}")
            
            # Restaurer automatiquement les abonnements sauvegardés
            if self._auto_restore:
                self._restore_subscriptions_sync()
        else:
            self.is_connected = False
            logger.error(f"❌ [MQTT] Échec de connexion MQTT, code: {rc}")
            # Codes d'erreur MQTT
            errors = {
                1: "Protocol version incorrect",
                2: "Client ID invalide",
                3: "Serveur indisponible",
                4: "Username/password incorrect",
                5: "Non autorisé"
            }
            logger.error(f"[MQTT] Erreur: {errors.get(rc, 'Erreur inconnue')}")
    
    def _restore_subscriptions_sync(self):
        """Restaurer les abonnements sauvegardés depuis la base de données (synchrone)"""
        try:
            from pymongo import MongoClient
            
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            db_name = os.getenv('DB_NAME', 'gmao_iris')
            
            logger.info(f"[MQTT] Restauration des abonnements depuis {db_name}...")
            
            mongo_client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
            db_sync = mongo_client[db_name]
            
            # Récupérer tous les abonnements actifs
            subscriptions = list(db_sync.mqtt_subscriptions.find({"active": True}))
            
            if not subscriptions:
                logger.info("[MQTT] Aucun abonnement actif à restaurer")
                mongo_client.close()
                return
                
            logger.info(f"[MQTT] {len(subscriptions)} abonnement(s) à restaurer")
            
            for sub in subscriptions:
                topic = sub.get("topic")
                qos = sub.get("qos", 0)
                
                if topic and self.client:
                    try:
                        result = self.client.subscribe(topic, qos=qos)
                        if result[0] == mqtt.MQTT_ERR_SUCCESS:
                            logger.info(f"✅ [MQTT] Abonnement restauré: {topic} (QoS={qos})")
                        else:
                            logger.error(f"❌ [MQTT] Échec restauration: {topic}")
                    except Exception as e:
                        logger.error(f"❌ [MQTT] Erreur restauration {topic}: {e}")
            
            mongo_client.close()
            logger.info("✅ [MQTT] Restauration des abonnements terminée")
            
        except Exception as e:
            logger.error(f"❌ [MQTT] Erreur lors de la restauration des abonnements: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback appelé lors de la déconnexion"""
        self.is_connected = False
        if rc != 0:
            logger.warning(f"Déconnexion inattendue du broker MQTT, code: {rc}")
    
    def _on_message(self, client, userdata, message):
        """Callback appelé lors de la réception d'un message"""
        topic = message.topic
        payload = message.payload.decode('utf-8')
        qos = message.qos
        
        logger.info(f"📨 [MQTT] Message reçu sur '{topic}' (QoS={qos}): {payload[:100]}...")
        
        # Sauvegarder IMMÉDIATEMENT dans MongoDB avec pymongo (synchrone)
        try:
            from pymongo import MongoClient
            import os
            from datetime import datetime, timezone
            
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            db_name = os.getenv('DB_NAME', 'gmao_iris')
            
            logger.info(f"[MQTT] Connexion à MongoDB: {mongo_url}/{db_name}")
            
            mongo_client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
            db_sync = mongo_client[db_name]
            
            # Créer le document
            doc = {
                "topic": topic,
                "payload": payload,
                "qos": qos,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"[MQTT] Insertion du message dans mqtt_messages...")
            result = db_sync.mqtt_messages.insert_one(doc)
            logger.info(f"✅ [MQTT] Message sauvegardé avec ID: {result.inserted_id}")
            
            mongo_client.close()
            
        except Exception as e:
            logger.error(f"❌ [MQTT] ERREUR sauvegarde message: {e}")
            import traceback
            logger.error(traceback.format_exc())
        
        # Appeler les callbacks enregistrés si présents
        if topic in self.message_callbacks:
            logger.info(f"[MQTT] Appel des callbacks pour {topic}")
            for callback in self.message_callbacks[topic]:
                try:
                    callback(topic, payload, qos)
                except Exception as e:
                    logger.error(f"❌ [MQTT] Erreur callback {topic}: {e}")
        
        # Wildcards
        for registered_topic, callbacks in self.message_callbacks.items():
            if self._topic_matches(registered_topic, topic):
                logger.info(f"[MQTT] Match wildcard: {registered_topic} -> {topic}")
                for callback in callbacks:
                    try:
                        callback(topic, payload, qos)
                    except Exception as e:
                        logger.error(f"❌ [MQTT] Erreur callback wildcard {topic}: {e}")
    
    def _topic_matches(self, pattern: str, topic: str) -> bool:
        """Vérifier si un topic correspond à un pattern avec wildcards"""
        # Si c'est un match exact, ne pas le retraiter ici
        if pattern == topic:
            return False
        
        # Cas spécial: # seul matche tous les topics
        if pattern == '#':
            return True
        
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')
        
        # Traiter le wildcard multi-niveau '#'
        if '#' in pattern:
            # # doit être le dernier élément
            if pattern_parts[-1] == '#':
                # Si # est seul ou après un /, matcher tout ce qui commence par le préfixe
                if len(pattern_parts) == 1:
                    return True  # # seul matche tout
                prefix = '/'.join(pattern_parts[:-1])
                if prefix == '':
                    return True
                return topic.startswith(prefix + '/') or topic == prefix
        
        # Traiter le wildcard single-niveau '+'
        if '+' in pattern:
            if len(pattern_parts) != len(topic_parts):
                return False
            for p, t in zip(pattern_parts, topic_parts):
                if p != '+' and p != t:
                    return False
            return True
        
        return False
    
    def get_status(self) -> Dict:
        """Obtenir le statut de la connexion MQTT"""
        return {
            "connected": self.is_connected,
            "host": self.config.get("host", "Non configuré"),
            "port": self.config.get("port", 0),
            "client_id": self.config.get("client_id", "gmao_iris")
        }

# Instance globale
mqtt_manager = MQTTManager()
