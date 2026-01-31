"""
Script pour ajouter le chapitre "Fonctions Responsable de Service" au manuel utilisateur.
Inclut le filtrage automatique par service et la gestion d'équipe.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

async def add_service_manager_chapter():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'gmao_iris')]
    
    chapter_id = str(uuid.uuid4())
    
    # Vérifier si le chapitre existe déjà
    existing = await db.manual_chapters.find_one({"title": {"$regex": "Responsable de Service"}})
    if existing:
        print("⚠️ Le chapitre 'Fonctions Responsable de Service' existe déjà.")
        return
    
    # Déterminer le prochain numéro d'ordre
    last_chapter = await db.manual_chapters.find_one(sort=[("order", -1)])
    next_order = (last_chapter.get("order", 24) if last_chapter else 24) + 1
    
    # Créer le chapitre
    chapter = {
        "id": chapter_id,
        "title": "👔 Fonctions Responsable de Service",
        "description": "Guide des fonctionnalités spécifiques aux responsables de service : filtrage automatique des données, gestion d'équipe, statistiques et supervision.",
        "order": next_order,
        "icon": "building-2",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.manual_chapters.insert_one(chapter)
    print(f"✅ Chapitre créé : {chapter['title']} (ordre: {next_order})")
    
    # Créer les sections du chapitre
    sections = [
        {
            "id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "title": "Introduction aux fonctions de responsable",
            "content": """
## Rôle du Responsable de Service

Le responsable de service dispose de fonctionnalités avancées pour superviser et gérer son équipe et les activités de son département.

### Accès aux fonctions de responsable

Pour être reconnu comme responsable de service, un administrateur doit vous assigner via :
1. Aller dans **Gestion des rôles** (depuis la page Équipe)
2. Onglet **Responsables de service**
3. Sélectionner votre service et vous assigner comme responsable

### Fonctionnalités disponibles

Une fois assigné comme responsable, vous bénéficiez de :
- **Filtrage automatique** : Les données affichées sont automatiquement filtrées pour votre service
- **Dashboard Service** : Tableau de bord personnalisé avec widgets configurables
- **Vue Équipe** : Visualisation de votre équipe et de leurs activités
- **Statistiques** : Indicateurs de performance de votre service
""",
            "order": 1,
            "keywords": ["responsable", "service", "manager", "supervision", "accès"],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "title": "Filtrage automatique par service",
            "content": """
## Filtrage Automatique des Données

### Comment ça fonctionne

Lorsque vous êtes identifié comme responsable d'un service, l'application filtre automatiquement les données sur plusieurs pages pour n'afficher que les éléments de votre service.

### Pages avec filtrage automatique

| Page | Champ filtré | Effet |
|------|--------------|-------|
| Ordres de travail | service | Seuls les OT de votre service sont affichés |
| Équipements | service | Seuls les équipements de votre service sont affichés |
| Maintenance préventive | service | Filtrées par service |
| Demandes d'intervention | service | Filtrées par service |
| Demandes d'amélioration | service | Filtrées par service |
| Presqu'accidents | service | Filtrées par service |

### Indicateur visuel

Un **badge bleu** s'affiche à côté du titre de la page pour indiquer que le filtrage est actif :

```
📋 Ordres de travail   🏢 Service : Maintenance
```

Ce badge vous rappelle que vous ne voyez que les données de votre service.

### Différence avec un administrateur

| Utilisateur | Comportement |
|-------------|--------------|
| **Administrateur** | Voit toutes les données de tous les services |
| **Responsable de service** | Voit uniquement les données de son/ses service(s) |
| **Utilisateur normal** | Voit les données de son propre service |

### Gestion de plusieurs services

Si vous êtes responsable de plusieurs services, les données de tous ces services seront affichées. Le système combine automatiquement les filtres.
""",
            "order": 2,
            "keywords": ["filtrage", "automatique", "service", "badge", "données"],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "title": "Vue Équipe (Mon Équipe)",
            "content": """
## Page Mon Équipe

### Accès

1. Cliquez sur **Dashboard Service** dans le menu latéral
2. Cliquez sur le bouton **Mon Équipe** ou accédez directement via `/service-dashboard/team`

### Informations affichées

#### En-tête
- Nom du service géré
- Nombre total de membres dans l'équipe

#### Statistiques rapides (4 cartes)
- **OT en cours** : Nombre d'ordres de travail en cours dans votre service
- **OT en attente** : Nombre d'ordres de travail en attente
- **Équip. en panne** : Nombre d'équipements actuellement en panne
- **Taux complétion** : Pourcentage d'OT terminés sur le total

#### Liste des membres
Un tableau affiche tous les membres de votre équipe avec :
- **Nom** : Prénom et nom de l'utilisateur
- **Email** : Adresse email professionnelle
- **Rôle** : Fonction dans l'entreprise (Technicien, Admin, etc.)
- **Service** : Service d'appartenance
- **Statut** : Actif ou Inactif

### Recherche

Utilisez la barre de recherche pour filtrer les membres par :
- Nom ou prénom
- Email
- Rôle

### Permissions requises

Pour accéder à cette page, vous devez être :
- Assigné comme responsable de service, **OU**
- Avoir le rôle Administrateur
""",
            "order": 3,
            "keywords": ["équipe", "team", "membres", "statistiques", "vue"],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "title": "Dashboard Service personnalisé",
            "content": """
## Dashboard Service

### Accès

Cliquez sur **Dashboard Service** dans le menu latéral (visible uniquement pour les responsables de service et administrateurs).

### Fonctionnalités

Le Dashboard Service vous permet de créer des **widgets personnalisés** pour suivre les indicateurs importants de votre service.

### Types de widgets disponibles

| Type | Description |
|------|-------------|
| Valeur simple | Affiche une valeur numérique avec unité |
| Jauge | Affiche une valeur avec un indicateur visuel circulaire |
| Graphique ligne | Tendance sur une période |
| Graphique barres | Comparaison de valeurs |
| Camembert | Répartition en pourcentages |
| Tableau | Données sous forme de tableau |

### Sources de données

Les widgets peuvent puiser leurs données de :
- **Données GMAO** : Statistiques automatiques (OT, équipements, inventaire, etc.)
- **Fichiers Excel** : Via partage SMB (avec credentials si nécessaire)
- **Valeurs manuelles** : Saisie directe
- **Formules** : Combinaison de plusieurs sources

### Création d'un widget

1. Cliquez sur **+ Créer un widget** ou utilisez un modèle prédéfini
2. Remplissez les informations générales (nom, description)
3. Configurez la source de données
4. Choisissez le type de visualisation
5. Définissez les options de partage

### Modèles prédéfinis

14 modèles sont disponibles pour créer rapidement des widgets courants :
- Compteur OT ouvert
- Taux de disponibilité équipements
- Stock critique
- Et plus encore...

### Partage de widgets

Vous pouvez partager vos widgets avec :
- Uniquement vous (privé)
- Votre service
- Les administrateurs
- Des rôles spécifiques
""",
            "order": 4,
            "keywords": ["dashboard", "widgets", "personnalisation", "indicateurs", "graphiques"],
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "title": "Bonnes pratiques pour les responsables",
            "content": """
## Bonnes Pratiques

### Organisation quotidienne

1. **Consultez le Dashboard Service** chaque matin pour avoir une vue d'ensemble
2. **Vérifiez les OT en attente** et assignez-les à votre équipe
3. **Surveillez les équipements en panne** et priorisez les interventions

### Gestion d'équipe

- Utilisez la page **Mon Équipe** pour voir la charge de travail
- Répartissez équitablement les tâches entre les membres
- Suivez les indicateurs de performance (taux de complétion)

### Création de widgets utiles

Créez des widgets pour suivre :
- Les KPIs de votre service (temps moyen d'intervention, etc.)
- Les alertes importantes (stock bas, équipements critiques)
- Les tendances sur plusieurs semaines/mois

### Communication

- Utilisez le **Chat Live** pour communiquer avec votre équipe
- Envoyez des **Consignes** pour les informations importantes
- Documentez les procédures dans la section **Documentations**

### Suivi régulier

| Fréquence | Actions |
|-----------|---------|
| Quotidien | Vérifier OT en attente, équipements en panne |
| Hebdomadaire | Analyser les statistiques, ajuster les priorités |
| Mensuel | Réviser les indicateurs, créer/modifier les widgets |
""",
            "order": 5,
            "keywords": ["bonnes pratiques", "conseils", "organisation", "gestion"],
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    # Insérer les sections
    for section in sections:
        await db.manual_sections.insert_one(section)
        print(f"  ✅ Section ajoutée : {section['title']}")
    
    # Mettre à jour la version du manuel
    await db.manual_versions.update_one(
        {"is_current": True},
        {"$set": {
            "version": "2.1",
            "updated_at": datetime.now(timezone.utc),
            "changes": ["Ajout du chapitre 'Fonctions Responsable de Service'", "Documentation du filtrage automatique par service", "Guide de la vue équipe et du dashboard service"]
        }}
    )
    
    print(f"\n✅ Manuel mis à jour vers la version 2.1")
    print(f"📚 Chapitre ajouté avec 5 sections")

if __name__ == "__main__":
    asyncio.run(add_service_manager_chapter())
