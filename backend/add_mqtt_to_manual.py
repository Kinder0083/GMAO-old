#!/usr/bin/env python3
"""
Script pour ajouter le chapitre MQTT au manuel d'utilisation dans les bonnes collections
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def add_mqtt_chapter():
    # Connexion MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # ID du chapitre
    chapter_id = "ch-mqtt-001"
    
    # Créer le chapitre MQTT
    mqtt_chapter = {
        "id": chapter_id,
        "title": "📡 Système MQTT & IoT",
        "description": "Configuration et utilisation complète du système de monitoring MQTT",
        "order": 25,
        "icon": "activity",
        "target_roles": ["ADMIN", "TECHNICIEN", "USER"],
        "target_modules": ["sensors", "iotDashboard", "mqttLogs"],
        "sections": []  # On va ajouter les IDs des sections
    }
    
    # Sections du chapitre
    sections = [
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

### Cas d'usage
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

5. Le formulaire se remplit automatiquement avec :
   - Type de capteur approprié
   - Unité de mesure
   - Seuils min/max recommandés
   - Intervalle de rafraîchissement optimal

6. Personnalisez les valeurs selon vos besoins

### Méthode 2 : Configuration Manuelle

**Champs obligatoires :**
- **Nom** : Nom descriptif du capteur (ex: "Température Atelier A")
- **Topic MQTT** : Chemin d'abonnement MQTT (ex: `factory/zone1/temp`)
- **Unité** : Unité de mesure (°C, %, kW, hPa, etc.)

**Champs optionnels :**
- **Emplacement** : Zone de surveillance
- **Clé JSON** : Si le payload est JSON, chemin vers la valeur (ex: `data.temperature` ou `value`)
- **Intervalle** : Fréquence de rafraîchissement en minutes (défaut: 1 min)

### Configuration des Alertes

1. Cochez **"Activer les alertes"**
2. Définissez les seuils :
   - **Seuil minimum** : Valeur en dessous de laquelle une alerte se déclenche
   - **Seuil maximum** : Valeur au-dessus de laquelle une alerte se déclenche

Le système vérifie automatiquement chaque nouveau relevé et déclenche les alertes si nécessaire.
            """
        },
        {
            "id": f"{chapter_id}-sec-004",
            "chapter_id": chapter_id,
            "title": "Import/Export de Configurations",
            "order": 4,
            "level": "advanced",
            "target_roles": ["ADMIN"],
            "target_modules": ["sensors"],
            "content": """
### Exporter des Configurations

1. Sur la page **Capteurs MQTT**
2. Cliquez sur l'icône **"Download"** (Import/Export)
3. Choisissez le format :

**Export JSON** :
- Format complet avec toutes les métadonnées
- Inclut : date d'export, utilisateur, liste complète des capteurs
- Idéal pour sauvegardes et migrations complètes

**Export CSV** :
- Format tableur (Excel, LibreOffice Calc compatible)
- Colonnes : nom, type, unité, topic, seuils, emplacement
- Pratique pour analyse et documentation

### Importer des Configurations

1. Cliquez sur **"Importer JSON"** dans le menu Import/Export
2. Sélectionnez un fichier JSON exporté précédemment
3. Le système :
   - ✓ Vérifie la validité du fichier JSON
   - ✓ Détecte les doublons (capteurs avec le même topic MQTT)
   - ✓ Importe les nouveaux capteurs uniquement
   - ✓ Affiche un résumé détaillé : X importés, Y ignorés, Z erreurs

### Cas d'Usage Pratiques

- **Multi-sites** : Dupliquer une configuration sur plusieurs sites
- **Sauvegarde** : Exporter régulièrement pour backup
- **Templates** : Créer des configurations réutilisables
- **Migration** : Transférer des configurations entre environnements
- **Documentation** : CSV pour intégration dans documentation
            """
        },
        {
            "id": f"{chapter_id}-sec-005",
            "chapter_id": chapter_id,
            "title": "Dashboard IoT - Vue d'Ensemble",
            "order": 5,
            "level": "beginner",
            "target_roles": ["ADMIN", "TECHNICIEN", "USER"],
            "target_modules": ["iotDashboard"],
            "content": """
Accédez à **📊 Dashboard IoT** pour une vue d'ensemble temps réel.

### Cartes KPI

Quatre indicateurs principaux :
- **Capteurs actifs** : Nombre total de capteurs en fonctionnement
- **Alertes en cours** : Alertes actives nécessitant attention
- **Température moyenne** : Moyenne de tous les capteurs de température
- **Puissance totale** : Somme des puissances mesurées

### Graphiques Temps Réel

**Courbes d'évolution** :
- Visualisation sur 6h, 24h ou 7 jours
- Une courbe par capteur
- Codes couleur pour identification rapide
- Zoom et navigation temporelle

**Graphiques par Type** :
- Groupement automatique par type de capteur
- Permet de comparer les capteurs similaires
- Affichage des moyennes par groupe

### Jauges Visuelles

Affichage circulaire pour chaque capteur :
- **Zone verte** : Valeur normale (dans les seuils)
- **Zone orange** : Avertissement (proche des seuils)
- **Zone rouge** : Alerte (dépassement des seuils)

### Onglet Groupements

**Par Type de Capteur** :
- Vue agrégée par catégorie
- Statistiques : moyenne, min, max par groupe
- Nombre de capteurs par type

**Par Localisation** :
- Regroupement géographique/par zone
- Moyenne par emplacement
- Nombre d'alertes actives par zone
            """
        },
        {
            "id": f"{chapter_id}-sec-006",
            "chapter_id": chapter_id,
            "title": "Statistiques Avancées des Capteurs",
            "order": 6,
            "level": "advanced",
            "target_roles": ["ADMIN", "TECHNICIEN"],
            "target_modules": ["sensors", "iotDashboard"],
            "content": """
Cliquez sur un capteur pour accéder aux statistiques détaillées.

### Statistiques de Base

- **Compteur** : Nombre total de relevés sur la période
- **Minimum** : Valeur la plus basse enregistrée
- **Maximum** : Valeur la plus haute enregistrée
- **Moyenne** : Valeur moyenne arithmétique

### Statistiques Avancées

**Médiane** :
- Valeur centrale de l'ensemble des relevés
- Moins sensible aux valeurs extrêmes que la moyenne
- Utile pour détecter des anomalies

**Écart-type** :
- Mesure de la dispersion des valeurs
- Écart-type faible = valeurs stables
- Écart-type élevé = forte variation

**Plage** :
- Différence entre max et min
- Indique l'amplitude des variations

### Analyse de Tendance

**Direction** :
- ↗ **Hausse** : Tendance à l'augmentation
- ↘ **Baisse** : Tendance à la diminution
- → **Stable** : Pas de tendance marquée

**Calcul** :
- Régression linéaire sur la période
- Pourcentage de variation
- Prédiction simple

### Périodes d'Analyse

Sélectionnez la période :
- **1 heure** : Monitoring temps réel
- **6 heures** : Surveillance sur une demi-journée
- **24 heures** : Vue journalière
- **7 jours** : Analyse hebdomadaire, détection de cycles
            """
        },
        {
            "id": f"{chapter_id}-sec-007",
            "chapter_id": chapter_id,
            "title": "Logs MQTT et Débogage",
            "order": 7,
            "level": "advanced",
            "target_roles": ["ADMIN"],
            "target_modules": ["mqttLogs"],
            "content": """
Page **🔍 Logs MQTT** (Accès Admin uniquement)

### Cartes Statistiques

En haut de la page, 4 indicateurs :
- **Total messages** : Nombre total de messages MQTT reçus
- **Messages réussis** : Messages traités avec succès
- **Messages en erreur** : Messages ayant échoué
- **Taux de succès** : Pourcentage de succès global

### Filtres Avancés

**Par Topic** :
- Recherche textuelle dans les topics MQTT
- Sensible à la casse
- Recherche partielle acceptée

**Par Période** :
- Dernière heure
- 6 heures
- 24 heures
- 7 jours

**Par Statut** :
- Tous les messages
- Succès uniquement
- Erreurs uniquement

**Limite d'Affichage** :
- 50, 100, 500 ou 1000 logs
- Tri du plus récent au plus ancien

### Tableau de Logs

Colonnes affichées :
- **Timestamp** : Date et heure précise du message
- **Statut** : ✓ Succès ou ✗ Erreur (icône visuelle)
- **Topic** : Topic MQTT concerné
- **Capteur** : Nom du capteur (si identifié)
- **Payload** : Contenu du message (tronqué à 200 caractères)
- **Erreur** : Message d'erreur détaillé (si applicable)

### Fonctionnalités

**Auto-refresh** :
- Actualisation automatique toutes les 10 secondes
- Désactivable manuellement

**Actualisation Manuelle** :
- Bouton "Actualiser" avec icône
- Recharge immédiate des données

**Suppression** (Admin) :
- Bouton "Vider les logs"
- Supprime tous les logs de la période
- Confirmation requise

### Cas d'Usage de Débogage

**Capteur ne remonte pas de données** :
1. Filtrer par nom du capteur
2. Vérifier si des messages sont reçus
3. Si non : problème de configuration broker/topic
4. Si oui : vérifier les erreurs de parsing

**Messages en erreur répétés** :
1. Filtrer par "Erreurs uniquement"
2. Consulter le payload et le message d'erreur
3. Causes fréquentes :
   - Format JSON invalide
   - Clé JSON introuvable
   - Valeur non numérique
   - Topic incorrect

**Vérification de la qualité** :
1. Vue sur 24h
2. Consulter le taux de succès
3. Si < 95% : investigation nécessaire
            """
        },
        {
            "id": f"{chapter_id}-sec-008",
            "chapter_id": chapter_id,
            "title": "Système d'Alertes MQTT",
            "order": 8,
            "level": "beginner",
            "target_roles": ["ADMIN", "TECHNICIEN"],
            "target_modules": ["sensors"],
            "content": """
Les alertes surveillent automatiquement vos capteurs 24/7.

### Configuration d'une Alerte

1. Modifiez un capteur existant
2. Cochez **"Activer les alertes"**
3. Définissez les seuils :
   - **Seuil minimum** : Alerte si valeur < seuil
   - **Seuil maximum** : Alerte si valeur > seuil

Exemple :
- Capteur de température
- Min : 18°C (trop froid)
- Max : 26°C (trop chaud)

### Déclenchement Automatique

À chaque nouveau relevé :
1. Le système compare la valeur aux seuils
2. Si dépassement détecté :
   - ✓ Alerte créée automatiquement
   - ✓ Notification visuelle dans le header
   - ✓ Apparition dans le Dashboard IoT

### Actions Possibles (Configuration Avancée)

**Création automatique d'Ordre de Travail** :
- Génération d'un OT dès dépassement de seuil
- Priorité automatique selon gravité
- Description pré-remplie avec valeur mesurée

**Envoi d'Email** :
- Notification aux responsables de zone
- Email avec détails : capteur, valeur, seuil, timestamp

**Message dans Chat Live** :
- Publication automatique dans un canal dédié
- Notification instantanée de l'équipe

**Notification Visuelle** :
- Icône cloche dans le header avec compteur
- Clic pour voir la liste des alertes actives

### Gestion des Alertes

**Visualisation** :
- Dashboard IoT : compteur d'alertes actives
- Liste détaillée par capteur
- Historique complet des déclenchements

**Désactivation Temporaire** :
- Option dans les paramètres du capteur
- Utile pendant maintenance ou calibrage
- Réactivation simple

**Accusé de Réception** :
- Marquer une alerte comme "vue"
- Traçabilité des actions
- Historique consultable
            """
        },
        {
            "id": f"{chapter_id}-sec-009",
            "chapter_id": chapter_id,
            "title": "Bonnes Pratiques & Optimisation",
            "order": 9,
            "level": "advanced",
            "target_roles": ["ADMIN"],
            "target_modules": ["sensors", "mqttLogs"],
            "content": """
### Nommage des Topics MQTT

**Structure hiérarchique recommandée** :
```
site/zone/equipement/metrique
```

**Exemples concrets** :
- `usine-paris/atelier-a/moteur-01/temperature`
- `batiment-b/etage-2/salle-203/humidite`
- `ligne-production-3/station-5/vibration`

**Avantages** :
- Organisation claire et lisible
- Filtrage facile par zone
- Évolutivité (ajout de niveaux)

### Fréquence de Relevé Optimale

**Temps réel critique** (10-30 secondes) :
- Alarmes de sécurité
- Systèmes critiques
- Détection de pannes

**Surveillance standard** (1-5 minutes) :
- Température ambiante
- Humidité
- Qualité d'air

**Tendances long terme** (10-60 minutes) :
- Consommation énergétique
- Compteurs d'eau
- Statistiques de production

### Format des Messages

**Préféré - JSON structuré** :
```json
{
  "value": 23.5,
  "unit": "°C",
  "timestamp": "2025-01-15T10:30:00Z",
  "quality": "good"
}
```

**Accepté - Valeur simple** :
```
23.5
```

### Sécurité

**En production** :
- ✓ Utilisez SSL/TLS (port 8883)
- ✓ Mots de passe forts (12+ caractères)
- ✓ Certificats signés pour SSL
- ✓ Restriction des topics par utilisateur MQTT
- ✓ Changement régulier des mots de passe

### Performance

**Optimisation** :
- Limitez à ~100 capteurs simultanés par broker
- Augmentez l'intervalle si latence élevée
- Surveillez les logs pour détecter erreurs répétées
- Nettoyez l'historique > 6 mois régulièrement

**Monitoring** :
- Consultez les Logs MQTT quotidiennement
- Vérifiez le taux de succès (objectif > 95%)
- Identifiez les capteurs problématiques

### Maintenance Régulière

**Hebdomadaire** :
- Vérifier les Logs MQTT
- Identifier les erreurs récurrentes
- Tester les alertes critiques

**Mensuel** :
- Exporter les configurations (backup)
- Vérifier les seuils d'alerte (ajustement saisonnier)
- Nettoyer les capteurs obsolètes

**Trimestriel** :
- Audit complet du système
- Mise à jour de la documentation
- Formation équipe sur nouvelles fonctionnalités
            """
        },
        {
            "id": f"{chapter_id}-sec-010",
            "chapter_id": chapter_id,
            "title": "Guide de Dépannage MQTT",
            "order": 10,
            "level": "advanced",
            "target_roles": ["ADMIN"],
            "target_modules": ["sensors", "mqttLogs"],
            "content": """
### Problème : Broker ne se connecte pas

**Symptômes** :
- Message "Configuration MQTT manquante"
- Aucun capteur ne reçoit de données
- Page P/L MQTT inactive

**Solutions** :
1. Vérifiez l'adresse et le port du broker (Paramètres Spéciaux)
2. Testez la connectivité réseau : `ping [adresse-broker]`
3. Vérifiez les credentials (nom d'utilisateur/mot de passe)
4. Désactivez temporairement SSL pour test
5. Consultez les logs backend : `/var/log/supervisor/backend.err.log`

### Problème : Capteur ne reçoit pas de données

**Symptômes** :
- Valeur "Aucune donnée" ou "N/A"
- Pas de nouvelles entrées dans l'historique
- Graphiques vides

**Solutions** :
1. **Vérifier le topic MQTT** :
   - Sensible à la casse : `factory/temp` ≠ `Factory/Temp`
   - Testez avec P/L MQTT (Subscribe au topic)

2. **Vérifier la clé JSON** :
   - Si payload JSON : `{"data": {"temp": 23.5}}`
   - Clé correcte : `data.temp`
   - Testez dans Logs MQTT : consultez le payload reçu

3. **Vérifier l'intervalle** :
   - Intervalle trop long ?
   - Modifier et réduire temporairement

4. **Consulter les Logs MQTT** :
   - Filtrer par nom du capteur
   - Vérifier si messages reçus
   - Lire les erreurs éventuelles

### Problème : Valeurs incorrectes ou aberrantes

**Symptômes** :
- Valeurs négatives inattendues
- Valeurs hors plage normale
- Message "Valeur non numérique"

**Solutions** :
1. **Format du message** :
   - Vérifiez que c'est bien un nombre
   - Pas de texte ou caractères spéciaux

2. **Clé JSON incorrecte** :
   - Relisez attentivement le payload dans Logs MQTT
   - Ajustez la clé JSON dans config capteur

3. **Unité de mesure** :
   - Vérifiez que l'unité correspond
   - Ex: capteur envoie en Kelvin mais affiché en °C

4. **Payload simple** :
   - Si erreur persiste, testez avec valeur numérique simple
   - Sans structure JSON : juste `23.5`

### Problème : Alertes ne se déclenchent pas

**Symptômes** :
- Valeur dépasse seuil mais pas d'alerte
- Aucune notification
- Compteur d'alertes à zéro

**Solutions** :
1. Vérifiez que les alertes sont **activées** sur le capteur
2. Contrôlez les seuils min/max :
   - Min < valeur actuelle < Max : pas d'alerte (normal)
3. Vérifiez que le capteur reçoit bien des données récentes
4. Consultez les logs du service d'alertes (backend)

### Problème : Performances dégradées

**Symptômes** :
- Interface lente
- Délai dans la réception des données
- Timeout sur requêtes API

**Solutions** :
1. **Trop de capteurs** :
   - Recommandation : < 100 capteurs par broker
   - Réduire le nombre ou augmenter intervalles

2. **Historique trop volumineux** :
   - Nettoyer l'historique > 6 mois
   - Exporter avant suppression pour archivage

3. **Logs MQTT accumulés** :
   - Vider les logs MQTT (page Logs MQTT)
   - Limiter conservation à 24-48h

### Ressources et Support

**Documentation officielle** :
- MQTT.org : Spécifications MQTT
- Forum communautaire GMAO Iris

**Logs système** :
- Backend : `/var/log/supervisor/backend.err.log`
- Frontend : Console développeur du navigateur

**Contact support** :
- Email admin système
- Créer un ticket avec :
  * Description du problème
  * Captures d'écran
  * Extrait des logs
  * Configurations impliquées
            """
        }
    ]
    
    # Ajouter les IDs de sections au chapitre
    mqtt_chapter["sections"] = [s["id"] for s in sections]
    
    # Insérer le chapitre
    await db.manual_chapters.delete_many({"id": chapter_id})
    await db.manual_chapters.insert_one(mqtt_chapter)
    print(f"✅ Chapitre MQTT créé : {mqtt_chapter['title']}")
    
    # Insérer les sections
    section_ids = [s["id"] for s in sections]
    await db.manual_sections.delete_many({"id": {"$in": section_ids}})
    await db.manual_sections.insert_many(sections)
    print(f"✅ {len(sections)} sections ajoutées")
    
    # Afficher les titres des sections
    for i, section in enumerate(sections, 1):
        print(f"   {i}. {section['title']}")
    
    # Fermer la connexion
    client.close()
    
    return {
        "success": True,
        "chapter_id": chapter_id,
        "sections_count": len(sections)
    }

if __name__ == "__main__":
    result = asyncio.run(add_mqtt_chapter())
    print(f"\n🎉 Manuel MQTT intégré avec succès !")
    print(f"   Chapitre: {result['chapter_id']}")
    print(f"   Sections: {result['sections_count']}")
