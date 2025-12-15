#!/usr/bin/env python3
"""
Script pour ajouter les chapitres manquants au manuel
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

async def add_missing_chapters():
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.getenv('DB_NAME', 'gmao_iris')
    db = client[db_name]
    
    print("📚 Ajout des chapitres manquants...")
    
    # Chapitres manquants
    missing_chapters = [
        {
            "id": "ch-013",
            "title": "💬 Chat Live et Collaboration",
            "description": "Communication en temps réel entre équipes",
            "icon": "MessageCircle",
            "order": 13,
            "sections": ["sec-013-01"],
            "target_roles": [],
            "target_modules": ["chatLive"]
        },
        {
            "id": "ch-014",
            "title": "📡 Capteurs MQTT et IoT",
            "description": "Monitoring des capteurs en temps réel",
            "icon": "Activity",
            "order": 14,
            "sections": ["sec-014-01", "sec-014-02"],
            "target_roles": [],
            "target_modules": ["sensors"]
        },
        {
            "id": "ch-015",
            "title": "📝 Demandes d'Achat",
            "description": "Gérer les demandes d'achat et approvisionnements",
            "icon": "ShoppingCart",
            "order": 15,
            "sections": ["sec-015-01"],
            "target_roles": [],
            "target_modules": ["purchaseRequests"]
        },
        {
            "id": "ch-016",
            "title": "📍 Gestion des Zones",
            "description": "Organiser les zones et localisations",
            "icon": "MapPin",
            "order": 16,
            "sections": ["sec-016-01"],
            "target_roles": [],
            "target_modules": ["locations"]
        },
        {
            "id": "ch-017",
            "title": "⏱️ Compteurs",
            "description": "Suivi des compteurs d'équipements",
            "icon": "Gauge",
            "order": 17,
            "sections": ["sec-017-01"],
            "target_roles": [],
            "target_modules": ["meters"]
        },
        {
            "id": "ch-018",
            "title": "👁️ Plan de Surveillance",
            "description": "Organiser la surveillance des installations",
            "icon": "Eye",
            "order": 18,
            "sections": ["sec-018-01"],
            "target_roles": [],
            "target_modules": ["surveillance"]
        },
        {
            "id": "ch-019",
            "title": "⚠️ Presqu'accidents",
            "description": "Gérer les presqu'accidents et incidents",
            "icon": "AlertTriangle",
            "order": 19,
            "sections": ["sec-019-01"],
            "target_roles": [],
            "target_modules": ["presquaccident"]
        },
        {
            "id": "ch-020",
            "title": "📂 Documentations",
            "description": "Gérer la documentation technique",
            "icon": "FolderOpen",
            "order": 20,
            "sections": ["sec-020-01"],
            "target_roles": [],
            "target_modules": ["documentations"]
        },
        {
            "id": "ch-021",
            "title": "📅 Planning",
            "description": "Planification des interventions et équipes",
            "icon": "Calendar",
            "order": 21,
            "sections": ["sec-021-01"],
            "target_roles": [],
            "target_modules": ["planning"]
        },
        {
            "id": "ch-022",
            "title": "🏪 Fournisseurs",
            "description": "Gérer les fournisseurs et contacts",
            "icon": "ShoppingCart",
            "order": 22,
            "sections": ["sec-022-01"],
            "target_roles": [],
            "target_modules": ["vendors"]
        },
        {
            "id": "ch-023",
            "title": "💾 Import / Export",
            "description": "Importer et exporter des données",
            "icon": "Database",
            "order": 23,
            "sections": ["sec-023-01"],
            "target_roles": [],
            "target_modules": ["importExport"]
        }
    ]
    
    # Sections correspondantes
    missing_sections = [
        # Chat Live
        {
            "id": "sec-013-01",
            "chapter_id": "ch-013",
            "title": "Utiliser le Chat Live",
            "content": """### Communication en Temps Réel

Le Chat Live permet une communication instantanée entre tous les membres de votre équipe.

**Fonctionnalités** :
- Messages instantanés
- Partage de fichiers et images
- Conversations de groupe
- Historique des messages
- Notifications en temps réel

**Utilisation** :
1. Cliquez sur l'icône **Chat Live** dans le menu
2. Sélectionnez un contact ou créez une conversation de groupe
3. Envoyez des messages, images ou fichiers
4. Utilisez @ pour mentionner quelqu'un

**Nettoyage automatique** : Les messages de plus de 60 jours sont automatiquement supprimés.""",
            "order": 1,
            "level": "beginner",
            "target_roles": [],
            "target_modules": ["chatLive"],
            "keywords": ["chat", "communication", "collaboration"]
        },
        
        # MQTT
        {
            "id": "sec-014-01",
            "chapter_id": "ch-014",
            "title": "Configuration des Capteurs MQTT",
            "content": """### Ajouter un Capteur IoT

1. Module **Capteurs MQTT**
2. **+ Nouveau Capteur**
3. Configuration :
   - Nom du capteur
   - Topic MQTT à surveiller
   - Type (température, humidité, pression...)
   - Seuils d'alerte (min/max)
   - Localisation
4. **Activer**

Le système surveillera automatiquement le capteur et vous alertera si les seuils sont dépassés.""",
            "order": 1,
            "level": "advanced",
            "target_roles": [],
            "target_modules": ["sensors"],
            "keywords": ["mqtt", "iot", "capteurs", "monitoring"]
        },
        {
            "id": "sec-014-02",
            "chapter_id": "ch-014",
            "title": "Dashboard IoT",
            "content": """### Visualiser les Données IoT

Le **Dashboard IoT** affiche en temps réel toutes les données de vos capteurs.

**Onglets disponibles** :
1. **Vue d'ensemble** : Tous les capteurs avec valeurs actuelles
2. **Groupes par Type** : Capteurs regroupés par type (température, humidité, etc.)
3. **Groupes par Localisation** : Capteurs regroupés par zone

**Graphiques** :
- Évolution des valeurs dans le temps
- Statistiques (min, max, moyenne)
- Alertes actives

**Logs MQTT** : Consultez l'historique complet dans **Logs MQTT**""",
            "order": 2,
            "level": "intermediate",
            "target_roles": [],
            "target_modules": ["sensors"],
            "keywords": ["dashboard", "iot", "graphiques", "temps réel"]
        },
        
        # Autres chapitres (contenu minimal)
        {
            "id": "sec-015-01",
            "chapter_id": "ch-015",
            "title": "Créer une Demande d'Achat",
            "content": """### Soumettre une Demande d'Achat

1. Module **Demandes d'Achat**
2. **+ Nouvelle Demande**
3. Remplir : Articles, Quantités, Justification, Budget
4. **Soumettre pour approbation**

La demande suivra le circuit de validation configuré.""",
            "order": 1,
            "level": "beginner",
            "target_roles": [],
            "target_modules": ["purchaseRequests"],
            "keywords": ["achat", "demande", "approvisionnement"]
        },
        {
            "id": "sec-016-01",
            "chapter_id": "ch-016",
            "title": "Gérer les Zones",
            "content": """### Créer et Organiser les Zones

Les zones permettent d'organiser géographiquement vos équipements.

1. Module **Zones**
2. **+ Nouvelle Zone**
3. Nom, Description, Zone parente (optionnel)
4. **Créer**

Vous pouvez ensuite associer des équipements à chaque zone.""",
            "order": 1,
            "level": "intermediate",
            "target_roles": [],
            "target_modules": ["locations"],
            "keywords": ["zones", "localisation", "organisation"]
        },
        {
            "id": "sec-017-01",
            "chapter_id": "ch-017",
            "title": "Suivi des Compteurs",
            "content": """### Gérer les Compteurs d'Équipements

Les compteurs permettent de suivre l'utilisation des équipements (heures, kilomètres, cycles, etc.).

1. Module **Compteurs**
2. Associer un compteur à un équipement
3. Enregistrer les relevés régulièrement
4. Déclencher des maintenances basées sur les compteurs""",
            "order": 1,
            "level": "intermediate",
            "target_roles": [],
            "target_modules": ["meters"],
            "keywords": ["compteurs", "relevés", "utilisation"]
        },
        {
            "id": "sec-018-01",
            "chapter_id": "ch-018",
            "title": "Plan de Surveillance",
            "content": """### Organiser la Surveillance

Le Plan de Surveillance permet de définir les contrôles périodiques à effectuer.

1. Module **Plan de Surveillance**
2. Définir les points de contrôle
3. Planifier la fréquence
4. Assigner les responsables""",
            "order": 1,
            "level": "intermediate",
            "target_roles": [],
            "target_modules": ["surveillance"],
            "keywords": ["surveillance", "contrôle", "inspection"]
        },
        {
            "id": "sec-019-01",
            "chapter_id": "ch-019",
            "title": "Déclarer un Presqu'accident",
            "content": """### Signaler un Presqu'accident

Les presqu'accidents doivent être déclarés pour améliorer la sécurité.

1. Module **Presqu'accident**
2. **+ Nouvelle Déclaration**
3. Décrire l'événement, lieu, circonstances
4. Proposer des actions correctives
5. **Soumettre**

Un rapport sera généré pour analyse.""",
            "order": 1,
            "level": "beginner",
            "target_roles": [],
            "target_modules": ["presquaccident"],
            "keywords": ["sécurité", "incident", "presqu'accident"]
        },
        {
            "id": "sec-020-01",
            "chapter_id": "ch-020",
            "title": "Gérer les Documentations",
            "content": """### Organiser la Documentation Technique

Centralisez toute votre documentation technique.

1. Module **Documentations**
2. **+ Nouveau Document**
3. Upload PDF, images, fichiers
4. Associer aux équipements concernés
5. Organiser par catégories""",
            "order": 1,
            "level": "beginner",
            "target_roles": [],
            "target_modules": ["documentations"],
            "keywords": ["documentation", "fichiers", "manuels"]
        },
        {
            "id": "sec-021-01",
            "chapter_id": "ch-021",
            "title": "Utiliser le Planning",
            "content": """### Planifier les Interventions

Le Planning affiche toutes les interventions et maintenances.

1. Module **Planning**
2. Vue calendrier avec tous les ordres de travail
3. Drag & drop pour réorganiser
4. Filtrer par technicien, zone, type
5. Exporter le planning""",
            "order": 1,
            "level": "intermediate",
            "target_roles": [],
            "target_modules": ["planning"],
            "keywords": ["planning", "calendrier", "organisation"]
        },
        {
            "id": "sec-022-01",
            "chapter_id": "ch-022",
            "title": "Gérer les Fournisseurs",
            "content": """### Ajouter et Gérer les Fournisseurs

1. Module **Fournisseurs**
2. **+ Nouveau Fournisseur**
3. Nom, Contact, Adresse, Spécialités
4. Associer aux pièces fournies
5. Historique des commandes""",
            "order": 1,
            "level": "beginner",
            "target_roles": [],
            "target_modules": ["vendors"],
            "keywords": ["fournisseurs", "contacts", "achats"]
        },
        {
            "id": "sec-023-01",
            "chapter_id": "ch-023",
            "title": "Import / Export de Données",
            "content": """### Importer et Exporter

**Import** :
1. Module **Import / Export**
2. **Import**
3. Sélectionner le type (équipements, pièces, etc.)
4. Upload fichier Excel/CSV
5. Mapper les colonnes
6. **Importer**

**Export** :
- Exporter toutes vos données en Excel
- Choisir les modules à exporter
- Sauvegardes régulières recommandées""",
            "order": 1,
            "level": "advanced",
            "target_roles": [],
            "target_modules": ["importExport"],
            "keywords": ["import", "export", "excel", "csv", "données"]
        }
    ]
    
    # Insérer les chapitres manquants
    for chapter in missing_chapters:
        existing = await db.manual_chapters.find_one({"id": chapter["id"]})
        if not existing:
            chapter.update({
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            await db.manual_chapters.insert_one(chapter)
            print(f"✅ {chapter['title']}")
    
    # Insérer les sections manquantes
    for section in missing_sections:
        existing = await db.manual_sections.find_one({"id": section["id"]})
        if not existing:
            section.update({
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            await db.manual_sections.insert_one(section)
    
    # Compter le total
    total_chapters = await db.manual_chapters.count_documents({})
    total_sections = await db.manual_sections.count_documents({})
    
    print(f"\n✅ {len(missing_chapters)} chapitres ajoutés")
    print(f"✅ {len(missing_sections)} sections ajoutées")
    print(f"\n📚 Total: {total_chapters} chapitres, {total_sections} sections")
    print("\n🎉 Manuel complet mis à jour !")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_missing_chapters())
