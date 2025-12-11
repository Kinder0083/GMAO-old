"""
Modèles de capteurs prédéfinis pour faciliter la configuration MQTT
"""

SENSOR_TEMPLATES = {
    "TEMPERATURE": {
        "name": "Capteur de Température",
        "description": "Modèle pour capteur de température standard",
        "type": "TEMPERATURE",
        "unit": "°C",
        "icon": "thermometer",
        "default_min_threshold": -10.0,
        "default_max_threshold": 40.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/room/temperature",
            "factory/zone1/temp",
            "sensor/temp/001"
        ]
    },
    "HUMIDITY": {
        "name": "Capteur d'Humidité",
        "description": "Modèle pour capteur d'humidité relative",
        "type": "HUMIDITY",
        "unit": "%",
        "icon": "droplet",
        "default_min_threshold": 30.0,
        "default_max_threshold": 70.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/room/humidity",
            "factory/zone1/humidity",
            "sensor/humidity/001"
        ]
    },
    "PRESSURE": {
        "name": "Capteur de Pression",
        "description": "Modèle pour capteur de pression atmosphérique",
        "type": "PRESSURE",
        "unit": "hPa",
        "icon": "gauge",
        "default_min_threshold": 950.0,
        "default_max_threshold": 1050.0,
        "mqtt_refresh_interval": 300,
        "sample_topics": [
            "home/room/pressure",
            "factory/zone1/pressure",
            "sensor/pressure/001"
        ]
    },
    "AIR_QUALITY": {
        "name": "Capteur de Qualité d'Air",
        "description": "Modèle pour capteur de qualité d'air (CO2, particules, etc.)",
        "type": "AIR_QUALITY",
        "unit": "ppm",
        "icon": "wind",
        "default_min_threshold": 0.0,
        "default_max_threshold": 1000.0,
        "mqtt_refresh_interval": 120,
        "sample_topics": [
            "home/room/air-quality",
            "factory/zone1/co2",
            "sensor/air/001"
        ]
    },
    "LIGHT": {
        "name": "Capteur de Luminosité",
        "description": "Modèle pour capteur de luminosité",
        "type": "LIGHT",
        "unit": "lux",
        "icon": "sun",
        "default_min_threshold": 0.0,
        "default_max_threshold": 10000.0,
        "mqtt_refresh_interval": 120,
        "sample_topics": [
            "home/room/light",
            "factory/zone1/luminosity",
            "sensor/light/001"
        ]
    },
    "POWER": {
        "name": "Capteur de Puissance",
        "description": "Modèle pour capteur de puissance électrique",
        "type": "POWER",
        "unit": "W",
        "icon": "zap",
        "default_min_threshold": 0.0,
        "default_max_threshold": 5000.0,
        "mqtt_refresh_interval": 30,
        "sample_topics": [
            "home/power/total",
            "factory/machine1/power",
            "sensor/power/001"
        ]
    },
    "ENERGY": {
        "name": "Compteur d'Énergie",
        "description": "Modèle pour compteur d'énergie cumulée",
        "type": "ENERGY",
        "unit": "kWh",
        "icon": "zap",
        "default_min_threshold": 0.0,
        "default_max_threshold": 10000.0,
        "mqtt_refresh_interval": 300,
        "sample_topics": [
            "home/energy/total",
            "factory/machine1/energy",
            "sensor/energy/001"
        ]
    },
    "VOLTAGE": {
        "name": "Capteur de Tension",
        "description": "Modèle pour capteur de tension électrique",
        "type": "VOLTAGE",
        "unit": "V",
        "icon": "zap",
        "default_min_threshold": 200.0,
        "default_max_threshold": 250.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/power/voltage",
            "factory/machine1/voltage",
            "sensor/voltage/001"
        ]
    },
    "CURRENT": {
        "name": "Capteur de Courant",
        "description": "Modèle pour capteur de courant électrique",
        "type": "CURRENT",
        "unit": "A",
        "icon": "zap",
        "default_min_threshold": 0.0,
        "default_max_threshold": 50.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/power/current",
            "factory/machine1/current",
            "sensor/current/001"
        ]
    },
    "WATER_LEVEL": {
        "name": "Capteur de Niveau d'Eau",
        "description": "Modèle pour capteur de niveau d'eau",
        "type": "WATER_LEVEL",
        "unit": "cm",
        "icon": "droplet",
        "default_min_threshold": 10.0,
        "default_max_threshold": 100.0,
        "mqtt_refresh_interval": 300,
        "sample_topics": [
            "home/tank/water-level",
            "factory/reservoir/level",
            "sensor/water/001"
        ]
    },
    "FLOW": {
        "name": "Capteur de Débit",
        "description": "Modèle pour capteur de débit (eau, air, etc.)",
        "type": "FLOW",
        "unit": "L/min",
        "icon": "droplet",
        "default_min_threshold": 0.0,
        "default_max_threshold": 100.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/water/flow",
            "factory/pipe1/flow",
            "sensor/flow/001"
        ]
    },
    "VIBRATION": {
        "name": "Capteur de Vibration",
        "description": "Modèle pour capteur de vibration (maintenance prédictive)",
        "type": "VIBRATION",
        "unit": "mm/s",
        "icon": "activity",
        "default_min_threshold": 0.0,
        "default_max_threshold": 10.0,
        "mqtt_refresh_interval": 30,
        "sample_topics": [
            "factory/motor1/vibration",
            "machine/bearing/vibration",
            "sensor/vibration/001"
        ]
    },
    "CO2": {
        "name": "Capteur de CO2",
        "description": "Modèle pour capteur de dioxyde de carbone",
        "type": "CO2",
        "unit": "ppm",
        "icon": "wind",
        "default_min_threshold": 400.0,
        "default_max_threshold": 1000.0,
        "mqtt_refresh_interval": 120,
        "sample_topics": [
            "home/room/co2",
            "factory/zone1/co2",
            "sensor/co2/001"
        ]
    },
    "NOISE": {
        "name": "Capteur de Bruit",
        "description": "Modèle pour capteur de niveau sonore",
        "type": "NOISE",
        "unit": "dB",
        "icon": "activity",
        "default_min_threshold": 0.0,
        "default_max_threshold": 85.0,
        "mqtt_refresh_interval": 60,
        "sample_topics": [
            "home/room/noise",
            "factory/zone1/noise",
            "sensor/noise/001"
        ]
    },
    "MOTION": {
        "name": "Détecteur de Mouvement",
        "description": "Modèle pour détecteur de mouvement binaire (0/1)",
        "type": "MOTION",
        "unit": "",
        "icon": "activity",
        "default_min_threshold": 0.0,
        "default_max_threshold": 1.0,
        "mqtt_refresh_interval": 10,
        "sample_topics": [
            "home/room/motion",
            "factory/entrance/motion",
            "sensor/motion/001"
        ]
    },
    "DOOR": {
        "name": "Capteur d'Ouverture",
        "description": "Modèle pour capteur d'ouverture de porte/fenêtre (0/1)",
        "type": "DOOR",
        "unit": "",
        "icon": "activity",
        "default_min_threshold": 0.0,
        "default_max_threshold": 1.0,
        "mqtt_refresh_interval": 10,
        "sample_topics": [
            "home/door/status",
            "factory/gate/status",
            "sensor/door/001"
        ]
    }
}

def get_all_templates():
    """Retourne tous les modèles de capteurs disponibles"""
    return {
        "templates": [
            {
                "id": key,
                **value
            }
            for key, value in SENSOR_TEMPLATES.items()
        ]
    }

def get_template(template_id: str):
    """Retourne un modèle spécifique"""
    if template_id not in SENSOR_TEMPLATES:
        return None
    return {
        "id": template_id,
        **SENSOR_TEMPLATES[template_id]
    }
