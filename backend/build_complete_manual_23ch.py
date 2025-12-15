#!/usr/bin/env python3
"""
Script pour construire generate_complete_manual.py avec 23 chapitres
Ce script fusionne le manuel de 12 chapitres avec les 11 chapitres supplémentaires
"""

# Lire le fichier original avec 12 chapitres
with open('/app/backend/generate_complete_manual_12ch.py', 'r') as f:
    original = f.read()

# Sections supplémentaires pour les chapitres 13-23 (déjà présentes dans add_missing_manual_chapters.py)
additional_chapters_code = '''    
    # Chapitres 13-23 additionnels
    {"id": "ch-013", "title": "💬 Chat Live et Collaboration", "description": "Communication en temps réel", "icon": "MessageCircle", "order": 13, "sections": ["sec-013-01"], "target_roles": [], "target_modules": ["chatLive"]},
    {"id": "ch-014", "title": "📡 Capteurs MQTT et IoT", "description": "Monitoring des capteurs", "icon": "Activity", "order": 14, "sections": ["sec-014-01", "sec-014-02"], "target_roles": [], "target_modules": ["sensors"]},
    {"id": "ch-015", "title": "📝 Demandes d'Achat", "description": "Gérer les demandes d'achat", "icon": "ShoppingCart", "order": 15, "sections": ["sec-015-01"], "target_roles": [], "target_modules": ["purchaseRequests"]},
    {"id": "ch-016", "title": "📍 Gestion des Zones", "description": "Organiser les zones", "icon": "MapPin", "order": 16, "sections": ["sec-016-01"], "target_roles": [], "target_modules": ["locations"]},
    {"id": "ch-017", "title": "⏱️ Compteurs", "description": "Suivi des compteurs", "icon": "Gauge", "order": 17, "sections": ["sec-017-01"], "target_roles": [], "target_modules": ["meters"]},
    {"id": "ch-018", "title": "👁️ Plan de Surveillance", "description": "Surveillance des installations", "icon": "Eye", "order": 18, "sections": ["sec-018-01"], "target_roles": [], "target_modules": ["surveillance"]},
    {"id": "ch-019", "title": "⚠️ Presqu'accidents", "description": "Gérer les presqu'accidents", "icon": "AlertTriangle", "order": 19, "sections": ["sec-019-01"], "target_roles": [], "target_modules": ["presquaccident"]},
    {"id": "ch-020", "title": "📂 Documentations", "description": "Gérer la documentation", "icon": "FolderOpen", "order": 20, "sections": ["sec-020-01"], "target_roles": [], "target_modules": ["documentations"]},
    {"id": "ch-021", "title": "📅 Planning", "description": "Planification des interventions", "icon": "Calendar", "order": 21, "sections": ["sec-021-01"], "target_roles": [], "target_modules": ["planning"]},
    {"id": "ch-022", "title": "🏪 Fournisseurs", "description": "Gérer les fournisseurs", "icon": "ShoppingCart", "order": 22, "sections": ["sec-022-01"], "target_roles": [], "target_modules": ["vendors"]},
    {"id": "ch-023", "title": "💾 Import / Export", "description": "Importer et exporter", "icon": "Database", "order": 23, "sections": ["sec-023-01"], "target_roles": [], "target_modules": ["importExport"]},
'''

additional_sections_code = '''
    
    # Chapitre 13 : Chat Live
    "sec-013-01": {
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
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["chatLive"],
        "keywords": ["chat", "communication", "collaboration"]
    },
    
    # Chapitre 14 : MQTT
    "sec-014-01": {
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
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["sensors"],
        "keywords": ["mqtt", "iot", "capteurs", "monitoring"]
    },
    
    "sec-014-02": {
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
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["sensors"],
        "keywords": ["dashboard", "iot", "graphiques", "temps réel"]
    },
    
    # Chapitre 15 : Demandes d'Achat
    "sec-015-01": {
        "title": "Créer une Demande d'Achat",
        "content": """### Soumettre une Demande d'Achat

1. Module **Demandes d'Achat**
2. **+ Nouvelle Demande**
3. Remplir : Articles, Quantités, Justification, Budget
4. **Soumettre pour approbation**

La demande suivra le circuit de validation configuré.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["purchaseRequests"],
        "keywords": ["achat", "demande", "approvisionnement"]
    },
    
    # Chapitre 16 : Zones
    "sec-016-01": {
        "title": "Gérer les Zones",
        "content": """### Créer et Organiser les Zones

Les zones permettent d'organiser géographiquement vos équipements.

1. Module **Zones**
2. **+ Nouvelle Zone**
3. Nom, Description, Zone parente (optionnel)
4. **Créer**

Vous pouvez ensuite associer des équipements à chaque zone.""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["locations"],
        "keywords": ["zones", "localisation", "organisation"]
    },
    
    # Chapitre 17 : Compteurs
    "sec-017-01": {
        "title": "Suivi des Compteurs",
        "content": """### Gérer les Compteurs d'Équipements

Les compteurs permettent de suivre l'utilisation des équipements (heures, kilomètres, cycles, etc.).

1. Module **Compteurs**
2. Associer un compteur à un équipement
3. Enregistrer les relevés régulièrement
4. Déclencher des maintenances basées sur les compteurs""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["meters"],
        "keywords": ["compteurs", "relevés", "utilisation"]
    },
    
    # Chapitre 18 : Surveillance
    "sec-018-01": {
        "title": "Plan de Surveillance",
        "content": """### Organiser la Surveillance

Le Plan de Surveillance permet de définir les contrôles périodiques à effectuer.

1. Module **Plan de Surveillance**
2. Définir les points de contrôle
3. Planifier la fréquence
4. Assigner les responsables""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["surveillance"],
        "keywords": ["surveillance", "contrôle", "inspection"]
    },
    
    # Chapitre 19 : Presqu'accidents
    "sec-019-01": {
        "title": "Déclarer un Presqu'accident",
        "content": """### Signaler un Presqu'accident

Les presqu'accidents doivent être déclarés pour améliorer la sécurité.

1. Module **Presqu'accident**
2. **+ Nouvelle Déclaration**
3. Décrire l'événement, lieu, circonstances
4. Proposer des actions correctives
5. **Soumettre**

Un rapport sera généré pour analyse.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["presquaccident"],
        "keywords": ["sécurité", "incident", "presqu'accident"]
    },
    
    # Chapitre 20 : Documentations
    "sec-020-01": {
        "title": "Gérer les Documentations",
        "content": """### Organiser la Documentation Technique

Centralisez toute votre documentation technique.

1. Module **Documentations**
2. **+ Nouveau Document**
3. Upload PDF, images, fichiers
4. Associer aux équipements concernés
5. Organiser par catégories""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["documentations"],
        "keywords": ["documentation", "fichiers", "manuels"]
    },
    
    # Chapitre 21 : Planning
    "sec-021-01": {
        "title": "Utiliser le Planning",
        "content": """### Planifier les Interventions

Le Planning affiche toutes les interventions et maintenances.

1. Module **Planning**
2. Vue calendrier avec tous les ordres de travail
3. Drag & drop pour réorganiser
4. Filtrer par technicien, zone, type
5. Exporter le planning""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["planning"],
        "keywords": ["planning", "calendrier", "organisation"]
    },
    
    # Chapitre 22 : Fournisseurs
    "sec-022-01": {
        "title": "Gérer les Fournisseurs",
        "content": """### Ajouter et Gérer les Fournisseurs

1. Module **Fournisseurs**
2. **+ Nouveau Fournisseur**
3. Nom, Contact, Adresse, Spécialités
4. Associer aux pièces fournies
5. Historique des commandes""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["vendors"],
        "keywords": ["fournisseurs", "contacts", "achats"]
    },
    
    # Chapitre 23 : Import/Export
    "sec-023-01": {
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
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["importExport"],
        "keywords": ["import", "export", "excel", "csv", "données"]
    },
'''

# Trouver où insérer les nouveaux chapitres dans la liste des chapitres
# Chercher la ligne qui contient {"id": "ch-012"... et ajouter après
chapters_marker = '{"id": "ch-012", "title": "❓ FAQ et Dépannage"'
if chapters_marker in original:
    # Trouver la fin de la définition du chapitre 012
    marker_pos = original.find(chapters_marker)
    # Trouver la prochaine ligne qui ferme ce chapitre (contient "},")
    next_closing = original.find('}', marker_pos)
    next_comma_newline = original.find(',\n', next_closing)
    
    # Insérer les nouveaux chapitres
    modified = original[:next_comma_newline+2] + additional_chapters_code + original[next_comma_newline+2:]
else:
    print("ERREUR: Marqueur de chapitre 012 non trouvé")
    exit(1)

# Trouver où insérer les nouvelles sections
# Chercher la fin de ALL_SECTIONS (juste avant la fermeture du dictionnaire)
sections_end_marker = '    }\n}'
if sections_end_marker in modified:
    # Trouver la dernière occurrence
    marker_pos = modified.rfind(sections_end_marker)
    # Insérer les nouvelles sections juste avant la fermeture
    modified = modified[:marker_pos] + '    },' + additional_sections_code + '\n}' + modified[marker_pos+len(sections_end_marker):]
else:
    print("ERREUR: Fin de ALL_SECTIONS non trouvée")
    exit(1)

# Mettre à jour le commentaire sur le nombre de chapitres
modified = modified.replace(
    'Manuel complet avec 12 chapitres',
    'Manuel complet avec 23 chapitres'
).replace(
    '"Manuel complet avec 12 chapitres",',
    '"Manuel complet avec 23 chapitres",'
).replace(
    '49 sections détaillées couvrant tous les modules',
    'Toutes les sections détaillées couvrant tous les modules GMAO Iris'
)

# Écrire le fichier final
with open('/app/backend/generate_complete_manual.py', 'w') as f:
    f.write(modified)

print("✅ Script generate_complete_manual.py mis à jour avec 23 chapitres")
print(f"   Taille: {len(modified)} caractères")
