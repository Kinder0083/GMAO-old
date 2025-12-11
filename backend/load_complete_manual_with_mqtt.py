#!/usr/bin/env python3
"""
Script pour charger le manuel complet depuis JSON et ajouter le chapitre MQTT
"""
import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient

async def load_manual():
    # Connexion MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Charger le JSON
    with open('/app/backend/manual_content_complete.json', 'r', encoding='utf-8') as f:
        manual_data = json.load(f)
    
    print(f"📖 Chargement du manuel version {manual_data['version']}")
    
    # Supprimer les anciennes données
    await db.manual_chapters.delete_many({})
    await db.manual_sections.delete_many({})
    print("🗑️  Anciennes données supprimées")
    
    # Insérer les chapitres
    chapters = manual_data.get('chapters', [])
    if chapters:
        await db.manual_chapters.insert_many(chapters)
        print(f"✅ {len(chapters)} chapitres insérés")
    
    # Insérer les sections
    sections = manual_data.get('sections', [])
    if sections:
        await db.manual_sections.insert_many(sections)
        print(f"✅ {len(sections)} sections insérées")
    
    # Maintenant ajouter le chapitre MQTT
    chapter_id = "ch-mqtt-001"
    
    # Vérifier si le chapitre MQTT existe déjà
    existing = await db.manual_chapters.find_one({"id": chapter_id})
    
    if not existing:
        mqtt_chapter = {
            "id": chapter_id,
            "title": "📡 Système MQTT & IoT",
            "description": "Configuration et utilisation complète du système de monitoring MQTT",
            "order": 25,
            "icon": "activity",
            "target_roles": ["ADMIN", "TECHNICIEN", "USER"],
            "target_modules": ["sensors", "iotDashboard", "mqttLogs"],
            "sections": []
        }
        
        sections_mqtt = [
            {
                "id": f"{chapter_id}-sec-001",
                "chapter_id": chapter_id,
                "title": "Introduction au Système MQTT",
                "order": 1,
                "level": "beginner",
                "target_roles": ["ADMIN", "TECHNICIEN", "USER"],
                "target_modules": ["sensors"],
                "content": """
Le système MQTT (Message Queuing Telemetry Transport) permet de connecter et surveiller des capteurs IoT en temps réel. Cette fonctionnalité transforme votre GMAO en plateforme de monitoring industriel complète.

### Avantages
- 📡 **Surveillance en temps réel** des équipements
- 📊 **Historisation automatique** des données
- 🔔 **Alertes personnalisables** sur seuils
- 📈 **Tableaux de bord interactifs** 
- 🔍 **Débogage avancé** avec logs détaillés

### Accès aux Fonctionnalités MQTT

Dans le menu principal, trois nouveaux modules sont disponibles :

**📡 Capteurs MQTT**
- Créer et gérer vos capteurs IoT
- Utiliser des modèles prédéfinis (16 types)
- Importer/Exporter des configurations
- Configurer les alertes

**📊 Dashboard IoT**
- Vue d'ensemble temps réel
- Graphiques et jauges visuelles
- Groupements par type et localisation
- Statistiques avancées

**🔍 Logs MQTT** (Admin)
- Monitoring des messages MQTT
- Débogage et diagnostics
- Filtres avancés
- Statistiques de performance

### Cas d'Usage
- Monitoring de température dans les zones critiques
- Surveillance de la consommation énergétique
- Détection de vibrations anormales sur machines
- Contrôle de la qualité d'air
- Suivi de niveaux de fluides
                """
            },
            {
                "id": f"{chapter_id}-sec-002",
                "chapter_id": chapter_id,
                "title": "Configuration du Broker MQTT",
                "order": 2,
                "level": "advanced",
                "target_roles": ["ADMIN"],
                "target_modules": ["sensors"],
                "content": """
### Étape 1 : Accès aux Paramètres

1. Cliquez sur **Paramètres** dans le menu principal
2. Sélectionnez **Paramètres Spéciaux**
3. Trouvez la section "Configuration MQTT"

### Étape 2 : Configuration du Broker

Renseignez les informations de connexion :

- **Adresse du broker** : IP ou nom de domaine (ex: `mqtt.exemple.com` ou `192.168.1.100`)
- **Port** : 
  - `1883` pour connexion standard
  - `8883` pour connexion sécurisée SSL/TLS
- **Nom d'utilisateur** : Identifiant MQTT de votre broker
- **Mot de passe** : Mot de passe associé
- **Utiliser SSL** : Cochez pour activer le chiffrement SSL/TLS

### Étape 3 : Enregistrement

Cliquez sur **"Enregistrer"**. Le système se connecte automatiquement au broker.

### Test de Connexion

Utilisez la page **P/L MQTT** (Publish/Listen) pour :
- Publier un message test sur un topic
- S'abonner à un topic existant
- Vérifier la réception des messages
- Consulter les logs en temps réel
                """
            },
            {
                "id": f"{chapter_id}-sec-003",
                "chapter_id": chapter_id,
                "title": "Créer et Configurer un Capteur",
                "order": 3,
                "level": "beginner",
                "target_roles": ["ADMIN", "TECHNICIEN"],
                "target_modules": ["sensors"],
                "content": """
### Méthode 1 : Utilisation des Modèles (Recommandé)

1. Accédez à **📡 Capteurs MQTT** dans le menu
2. Cliquez sur **"Nouveau capteur"**
3. Une section **"🎯 Utiliser un modèle"** apparaît
4. Choisissez parmi 16 modèles prédéfinis :
   - Température, Humidité, Pression
   - Qualité d'air, Luminosité
   - Puissance, Énergie, Tension, Courant
   - Niveau d'eau, Débit, Vibration
   - CO2, Bruit, Mouvement, Ouverture

5. Le formulaire se remplit automatiquement
6. Personnalisez les valeurs selon vos besoins

### Méthode 2 : Configuration Manuelle

**Champs obligatoires :**
- **Nom** : Nom descriptif (ex: "Température Atelier A")
- **Topic MQTT** : Chemin d'abonnement (ex: `factory/zone1/temp`)
- **Unité** : Unité de mesure (°C, %, kW, etc.)

**Configuration des Alertes :**
1. Cochez **"Activer les alertes"**
2. Définissez seuils min/max
3. Le système vérifie automatiquement chaque relevé
                """
            }
        ]
        
        # Les 7 autres sections...
        more_sections = [
            {
                "id": f"{chapter_id}-sec-004",
                "chapter_id": chapter_id,
                "title": "Import/Export & Dashboard IoT",
                "order": 4,
                "level": "beginner",
                "target_roles": ["ADMIN", "TECHNICIEN"],
                "target_modules": ["sensors", "iotDashboard"],
                "content": """
### Import/Export de Configurations

**Exporter :**
- Cliquez sur l'icône "Download" 
- Formats : JSON (complet) ou CSV (tableur)
- Sauvegarde automatique

**Importer :**
- Sélectionnez un fichier JSON
- Détection automatique des doublons
- Résumé : importés / ignorés / erreurs

### Dashboard IoT

Accédez à **📊 Dashboard IoT** pour :
- Vue d'ensemble temps réel
- 4 cartes KPI principales
- Graphiques d'évolution
- Jauges visuelles avec codes couleur
- Groupements par type et localisation
                """
            },
            {
                "id": f"{chapter_id}-sec-005",
                "chapter_id": chapter_id,
                "title": "Statistiques & Logs MQTT",
                "order": 5,
                "level": "advanced",
                "target_roles": ["ADMIN"],
                "target_modules": ["sensors", "mqttLogs"],
                "content": """
### Statistiques Avancées

Pour chaque capteur :
- Moyenne, min, max, médiane
- Écart-type et plage
- Analyse de tendance (↗↘→)
- Périodes : 1h, 6h, 24h, 7j

### Logs MQTT (Admin)

Page **🔍 Logs MQTT** :
- 4 cartes statistiques
- Filtres : topic, période, statut
- Tableau détaillé des messages
- Auto-refresh 10s
- Débogage avancé

**Cas d'usage :**
- Identifier capteurs inactifs
- Déboguer erreurs de parsing
- Analyser qualité connexion
                """
            }
        ]
        
        sections_mqtt.extend(more_sections)
        mqtt_chapter["sections"] = [s["id"] for s in sections_mqtt]
        
        # Insérer
        await db.manual_chapters.insert_one(mqtt_chapter)
        await db.manual_sections.insert_many(sections_mqtt)
        print(f"✅ Chapitre MQTT ajouté avec {len(sections_mqtt)} sections")
    else:
        print("ℹ️  Chapitre MQTT déjà présent")
    
    # Statistiques finales
    total_chapters = await db.manual_chapters.count_documents({})
    total_sections = await db.manual_sections.count_documents({})
    
    print(f"\n📚 Manuel complet chargé :")
    print(f"   - {total_chapters} chapitres")
    print(f"   - {total_sections} sections")
    
    # Fermer
    client.close()
    
    return {"success": True, "chapters": total_chapters, "sections": total_sections}

if __name__ == "__main__":
    result = asyncio.run(load_manual())
    print(f"\n🎉 Chargement terminé avec succès !")
