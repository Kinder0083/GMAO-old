#!/usr/bin/env python3
"""
Script pour ajouter la section MQTT au manuel d'utilisation
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def update_manual():
    # Connexion MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Nouveau chapitre MQTT
    mqtt_chapter = {
        "titre": "Système MQTT & IoT",
        "ordre": 25,
        "sections": [
            {
                "titre": "Introduction au Système MQTT",
                "contenu": """
Le système MQTT (Message Queuing Telemetry Transport) permet de connecter et surveiller des capteurs IoT en temps réel. 
Cette fonctionnalité transforme votre GMAO en plateforme de monitoring industriel complète.

**Avantages :**
- 📡 Surveillance en temps réel des équipements
- 📊 Historisation automatique des données
- 🔔 Alertes personnalisables
- 📈 Tableaux de bord interactifs
- 🔍 Débogage avancé avec logs
                """
            },
            {
                "titre": "Configuration MQTT",
                "contenu": """
**Étape 1 : Configuration du Broker MQTT**

1. Accédez à **Paramètres > Paramètres Spéciaux**
2. Section "Configuration MQTT" :
   - **Adresse du broker** : IP ou nom de domaine (ex: mqtt.exemple.com)
   - **Port** : 1883 (standard) ou 8883 (SSL)
   - **Nom d'utilisateur** : Identifiant MQTT
   - **Mot de passe** : Mot de passe MQTT
   - **Utiliser SSL** : Activer pour connexions sécurisées

3. Cliquez sur "Enregistrer"
4. Le système se connecte automatiquement au broker

**Test de Connexion :**
- Utilisez la page **P/L MQTT** (Publish/Listen)
- Publiez un message test sur un topic
- Vérifiez la réception dans les logs
                """
            },
            {
                "titre": "Gestion des Capteurs",
                "contenu": """
**Créer un Nouveau Capteur**

1. Accédez à **📡 Capteurs MQTT**
2. Cliquez sur "Nouveau capteur"

**Utilisation des Modèles** (Recommandé) :
- Une section "🎯 Utiliser un modèle" apparaît
- 16 modèles prédéfinis disponibles :
  * Température, Humidité, Pression
  * Qualité d'air, Luminosité
  * Puissance, Énergie, Tension, Courant
  * Niveau d'eau, Débit, Vibration
  * CO2, Bruit, Mouvement, Ouverture
- Cliquez sur un modèle pour pré-remplir le formulaire
- Personnalisez selon vos besoins

**Configuration Manuelle** :
- **Nom** : Nom descriptif du capteur
- **Type** : Catégorie du capteur
- **Emplacement** : Zone de surveillance
- **Topic MQTT** : Topic d'abonnement (ex: factory/temp/zone1)
- **Clé JSON** : Chemin vers la valeur (ex: data.temperature)
- **Intervalle** : Fréquence de relevé (minutes)
- **Unité** : Unité de mesure (°C, %, kW, etc.)

**Alertes** :
- Cochez "Activer les alertes"
- Définissez les seuils min/max
- Le système vérifie automatiquement les dépassements
                """
            },
            {
                "titre": "Import/Export de Capteurs",
                "contenu": """
**Exporter des Configurations**

1. Page **Capteurs MQTT**
2. Cliquez sur l'icône "Download" (Import/Export)
3. Choisissez le format :
   - **Export JSON** : Format complet avec métadonnées
   - **Export CSV** : Format tableur (Excel, LibreOffice)

**Importer des Configurations**

1. Cliquez sur "Importer JSON"
2. Sélectionnez un fichier JSON exporté précédemment
3. Le système :
   - Vérifie la validité du fichier
   - Détecte les doublons (même topic MQTT)
   - Importe les nouveaux capteurs
   - Affiche un résumé : importés / ignorés / erreurs

**Cas d'usage :**
- Dupliquer une configuration sur plusieurs sites
- Sauvegarder vos configurations
- Partager des templates d'équipe
                """
            },
            {
                "titre": "Dashboard IoT",
                "contenu": """
**Vue d'Ensemble Temps Réel**

Accédez à **📊 Dashboard IoT** pour visualiser :

**Cartes KPI** :
- Capteurs actifs
- Alertes en cours
- Température moyenne
- Puissance totale

**Graphiques Temps Réel** :
- Courbes d'évolution (6h, 24h, 7 jours)
- Graphiques par type de capteur
- Historique des valeurs
- Tendances et anomalies

**Jauges Visuelles** :
- Affichage circulaire de la valeur actuelle
- Codes couleur selon seuils :
  * Vert : Normal
  * Orange : Avertissement (proche seuil)
  * Rouge : Alerte (dépassement)

**Groupements** :
- Par type de capteur
- Par localisation
- Statistiques agrégées par groupe
                """
            },
            {
                "titre": "Statistiques Avancées",
                "contenu": """
**Analyse des Données de Capteurs**

Pour chaque capteur, consultez :

**Statistiques de Base** :
- **Compteur** : Nombre de relevés sur la période
- **Minimum** : Valeur la plus basse
- **Maximum** : Valeur la plus haute
- **Moyenne** : Valeur moyenne

**Statistiques Avancées** :
- **Médiane** : Valeur centrale (moins sensible aux extrêmes)
- **Écart-type** : Mesure de la dispersion des valeurs
- **Plage** : Différence entre max et min

**Analyse de Tendance** :
- **Direction** : Hausse (↗), Baisse (↘), Stable (→)
- **Pourcentage** : Variation sur la période
- **Régression linéaire** : Prédiction simple

**Périodes d'Analyse** :
- Dernière heure
- 6 heures
- 24 heures
- 7 jours
                """
            },
            {
                "titre": "Logs MQTT et Débogage",
                "contenu": """
**Visualiseur de Logs** (Admin uniquement)

Accédez à **🔍 Logs MQTT** pour :

**Cartes Statistiques** :
- Total de messages reçus
- Messages traités avec succès
- Messages en erreur
- Taux de succès global

**Filtres Avancés** :
- **Topic** : Recherche par topic MQTT
- **Période** : 1h, 6h, 24h, 7 jours
- **Statut** : Tous / Succès / Erreurs uniquement
- **Limite** : 50 à 1000 logs affichés

**Tableau de Logs** :
- **Timestamp** : Date/heure précise
- **Statut** : ✓ Succès ou ✗ Erreur
- **Topic** : Topic MQTT concerné
- **Capteur** : Nom du capteur (si applicable)
- **Payload** : Contenu du message (tronqué)
- **Erreur** : Message d'erreur détaillé

**Fonctionnalités** :
- Auto-refresh automatique (10 secondes)
- Actualisation manuelle
- Suppression des logs (maintenance)
- Export vers fichier (à venir)

**Cas d'Usage** :
- Déboguer un capteur qui ne remonte pas de données
- Vérifier le format des messages MQTT
- Identifier des erreurs de parsing JSON
- Analyser la qualité de connexion broker
                """
            },
            {
                "titre": "Système d'Alertes MQTT",
                "contenu": """
**Configuration des Alertes**

Les alertes surveillent automatiquement vos capteurs :

**Création d'Alerte** :
1. Modifiez un capteur
2. Activez "Alertes"
3. Définissez les seuils :
   - **Seuil minimum** : Alerte si valeur < seuil
   - **Seuil maximum** : Alerte si valeur > seuil

**Déclenchement Automatique** :
- Vérification à chaque nouveau relevé
- Détection immédiate des dépassements
- Notification dans l'interface

**Actions Possibles** :
- Création automatique d'Ordre de Travail
- Envoi d'email aux responsables
- Message dans le Chat Live
- Notification visuelle dans le header

**Gestion des Alertes** :
- Visualisation dans le Dashboard IoT
- Compteur d'alertes actives
- Historique des déclenchements
- Désactivation temporaire possible
                """
            },
            {
                "titre": "Meilleures Pratiques MQTT",
                "contenu": """
**Nommage des Topics** :
- Structure hiérarchique : site/zone/equipement/metrique
- Exemples :
  * usine1/atelier-a/moteur-01/temperature
  * batiment-b/etage-2/salle-12/humidite
  * ligne-prod/station-3/pression

**Fréquence de Relevé** :
- **Temps réel critique** : 10-30 secondes (alarmes, sécurité)
- **Surveillance standard** : 1-5 minutes (température, humidité)
- **Tendances long terme** : 10-60 minutes (consommation énergétique)

**Format des Messages** :
- **Préféré** : JSON structuré
  ```json
  {
    "value": 23.5,
    "unit": "°C",
    "timestamp": "2025-01-15T10:30:00Z"
  }
  ```
- **Accepté** : Valeur numérique simple
  ```
  23.5
  ```

**Sécurité** :
- Utilisez SSL/TLS en production (port 8883)
- Mots de passe forts pour le broker
- Certificats signés pour SSL
- Restriction des topics par utilisateur

**Performance** :
- Limitez le nombre de capteurs simultanés (< 100 recommandé)
- Augmentez l'intervalle si latence élevée
- Surveillez les logs pour détecter les erreurs
- Nettoyez régulièrement l'historique (> 6 mois)

**Maintenance** :
- Testez régulièrement avec P/L MQTT
- Vérifiez les logs pour détecter anomalies
- Exportez les configurations (backup)
- Documentez vos topics et capteurs
                """
            },
            {
                "titre": "Dépannage MQTT",
                "contenu": """
**Problème : Broker ne se connecte pas**

Solutions :
- Vérifiez l'adresse et le port du broker
- Testez la connectivité réseau (ping)
- Vérifiez les credentials (user/password)
- Désactivez temporairement SSL pour tester
- Consultez les logs backend (/var/log/supervisor/backend.err.log)

**Problème : Capteur ne reçoit pas de données**

Solutions :
- Vérifiez le topic MQTT (sensible à la casse)
- Testez le topic avec P/L MQTT (Subscribe)
- Vérifiez la clé JSON (chemin correct dans le payload)
- Consultez les Logs MQTT pour voir les messages reçus
- Vérifiez l'intervalle de rafraîchissement du capteur

**Problème : Valeurs incorrectes**

Solutions :
- Vérifiez le format du message MQTT
- Corrigez la clé JSON dans la configuration
- Vérifiez l'unité de mesure
- Testez avec un message simple (valeur numérique uniquement)

**Problème : Alertes ne se déclenchent pas**

Solutions :
- Vérifiez que les alertes sont activées
- Contrôlez les seuils min/max
- Vérifiez que le capteur reçoit bien des données
- Consultez les logs du service d'alertes

**Support** :
- Documentation MQTT officielle : mqtt.org
- Logs système : /var/log/supervisor/
- Contactez l'administrateur système
                """
            }
        ]
    }
    
    # Insérer le nouveau chapitre
    result = await db.user_manuals.update_one(
        {"titre": "Système MQTT & IoT"},
        {"$set": mqtt_chapter},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"✅ Nouveau chapitre MQTT créé (ID: {result.upserted_id})")
    else:
        print(f"✅ Chapitre MQTT mis à jour ({result.modified_count} modification(s))")
    
    # Fermer la connexion
    client.close()
    
    return {"success": True, "message": "Manuel MQTT ajouté avec succès"}

if __name__ == "__main__":
    result = asyncio.run(update_manual())
    print(f"\n{result['message']}")
