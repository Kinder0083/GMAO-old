"""
Script pour ajouter le chapitre Dashboard Service au manuel utilisateur
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from datetime import datetime, timezone

async def add_dashboard_service_chapter():
    """Ajoute le chapitre Dashboard Service au manuel"""
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'gmao_db')]
    
    # ID du nouveau chapitre
    chapter_id = "ch-dashboard-service"
    
    # Vérifier si le chapitre existe déjà
    existing = await db.manual_chapters.find_one({"id": chapter_id})
    if existing:
        print(f"Le chapitre {chapter_id} existe déjà, mise à jour...")
        await db.manual_chapters.delete_one({"id": chapter_id})
        # Supprimer les anciennes sections
        await db.manual_sections.delete_many({"chapter_id": chapter_id})
    
    # Créer le chapitre
    chapter = {
        "id": chapter_id,
        "title": "📊 Dashboard Service",
        "description": "Créer des widgets personnalisés pour suivre vos indicateurs",
        "icon": "Presentation",
        "order": 2.5,  # Juste après le Dashboard principal
        "sections": [
            "sec-ds-01",
            "sec-ds-02", 
            "sec-ds-03",
            "sec-ds-04",
            "sec-ds-05"
        ],
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.manual_chapters.insert_one(chapter)
    print(f"✅ Chapitre créé: {chapter['title']}")
    
    # Créer les sections
    sections = [
        {
            "id": "sec-ds-01",
            "chapter_id": chapter_id,
            "title": "Présentation du Dashboard Service",
            "order": 1,
            "content": """## Qu'est-ce que le Dashboard Service ?

Le **Dashboard Service** est un tableau de bord personnalisable destiné aux responsables de service. Il permet de créer des **widgets** (indicateurs visuels) pour suivre en temps réel les données importantes de votre activité.

### Fonctionnalités principales

- **Widgets personnalisés** : Créez vos propres indicateurs en quelques clics
- **Sources de données multiples** : Données GMAO, fichiers Excel, valeurs manuelles, formules
- **Visualisations variées** : Valeur simple, jauge, graphiques, tableaux
- **Actualisation automatique** : Les données se mettent à jour toutes les minutes
- **Partage** : Partagez vos widgets avec votre équipe ou d'autres services

### Accès au Dashboard Service

1. Connectez-vous à GMAO Iris
2. Dans le menu latéral, cliquez sur **Dashboard Service**
3. Vous accédez à votre tableau de bord personnalisé

> **💡 Astuce** : Si vous ne voyez pas ce menu, demandez à votre administrateur de vous donner accès au module "Dashboard Service" dans vos permissions."""
        },
        {
            "id": "sec-ds-02",
            "chapter_id": chapter_id,
            "title": "Utiliser les templates de widgets",
            "order": 2,
            "content": """## Templates de widgets prédéfinis

Pour faciliter la création de widgets, GMAO Iris propose **14 templates prêts à l'emploi** organisés par catégorie.

### Comment utiliser un template ?

1. Sur le Dashboard Service, cliquez sur **Utiliser un template**
2. Sélectionnez une catégorie (Ordres de Travail, Équipements, etc.)
3. Cliquez sur le template souhaité
4. Si nécessaire, sélectionnez un capteur ou compteur spécifique
5. Cliquez sur **Créer le widget**

### Templates disponibles

#### 📋 Ordres de Travail
- **Taux de complétion OT** : Pourcentage d'OT terminés (30 derniers jours)
- **OT en attente** : Nombre d'ordres de travail en attente
- **OT en cours** : Nombre d'ordres de travail en cours

#### 🔧 Équipements
- **Équipements en panne** : Nombre d'équipements actuellement en panne
- **Disponibilité équipements** : Taux de disponibilité global

#### 📦 Inventaire
- **Stock critique** : Articles sous le seuil de stock minimum
- **Valeur du stock** : Valeur totale du stock en euros

#### 🗓️ Maintenance Préventive
- **Réalisation M.Prev** : Taux de réalisation de la maintenance préventive
- **M.Prev en retard** : Nombre de maintenances préventives en retard

#### 📡 IoT (Capteurs et Compteurs)
- **Valeur capteur** : Affiche la valeur actuelle d'un capteur MQTT spécifique
- **Relevé compteur** : Affiche le dernier relevé d'un compteur

#### 📝 Demandes
- **Demandes d'intervention** : Nombre de demandes en attente
- **Demandes d'achat** : Nombre de demandes d'achat en attente

#### ⚠️ Sécurité
- **Presqu'accidents du mois** : Nombre de presqu'accidents signalés ce mois

> **📝 Note** : Les templates IoT (capteur, compteur) nécessitent de sélectionner un capteur ou compteur spécifique lors de la création."""
        },
        {
            "id": "sec-ds-03",
            "chapter_id": chapter_id,
            "title": "Créer un widget personnalisé",
            "order": 3,
            "content": """## Créer un widget de A à Z

Si les templates ne correspondent pas à vos besoins, vous pouvez créer un widget entièrement personnalisé.

### Étapes de création

#### 1. Informations générales
- Cliquez sur **Créer un widget**
- Renseignez le **nom** et la **description** du widget
- Définissez la **fréquence de rafraîchissement** (1 à 60 minutes)

#### 2. Sources de données
Ajoutez une ou plusieurs sources de données :

**Valeur manuelle**
- Entrez directement une valeur numérique ou texte
- Utile pour des objectifs ou des références fixes

**Fichier Excel (SMB)**
- Chemin SMB du fichier : `\\\\serveur\\partage\\fichier.xlsx`
- Identifiants SMB (optionnel) : nom d'utilisateur et mot de passe
- Feuille et cellule ou plage à lire
- Agrégation : SUM, AVG, MIN, MAX, COUNT

**Données GMAO**
- Sélectionnez un type de données parmi 28 disponibles
- Pour les capteurs MQTT : sélectionnez le capteur spécifique
- Pour les compteurs : sélectionnez le compteur spécifique
- Filtrez par service ou période si nécessaire

**Formule**
- Combinez plusieurs sources avec des opérations mathématiques
- Exemple : `{Source1} + {Source2} * 100`

#### 3. Visualisation
Choisissez le type d'affichage :
- **Valeur simple** : Affiche un nombre ou texte
- **Jauge** : Affiche une valeur avec barre de progression
- **Graphique ligne** : Évolution dans le temps
- **Graphique barres** : Comparaison de valeurs
- **Camembert / Donut** : Répartition en pourcentages
- **Tableau** : Affichage de données tabulaires

Personnalisez l'apparence :
- Titre et sous-titre
- Taille (petit, moyen, large, plein)
- Couleur (10 schémas disponibles)
- Préfixe, suffixe, unité
- Nombre de décimales

#### 4. Partage
Définissez qui peut voir ce widget :
- **Privé** : Vous seul
- **Mon service** : Les membres de votre service
- **Admins** : Les administrateurs
- **Rôles spécifiques** : Sélectionnez les rôles concernés"""
        },
        {
            "id": "sec-ds-04",
            "chapter_id": chapter_id,
            "title": "Sources de données GMAO",
            "order": 4,
            "content": """## Types de données GMAO disponibles

Le Dashboard Service peut récupérer automatiquement **28 types de données** depuis votre base GMAO.

### Interventions
| Type | Description |
|------|-------------|
| Nombre d'OT | Total des ordres de travail |
| OT par statut | Répartition par statut (en attente, en cours, etc.) |
| OT par priorité | Répartition par niveau de priorité |
| Taux de complétion | Pourcentage d'OT terminés |
| Durée moyenne OT | Temps moyen de résolution |

### Équipements
| Type | Description |
|------|-------------|
| Nombre d'équipements | Total des équipements |
| Équipements par statut | Répartition (actif, en panne, etc.) |
| Équipements par type | Répartition par catégorie |
| Taux de disponibilité | Pourcentage d'équipements disponibles |

### Maintenance Préventive
| Type | Description |
|------|-------------|
| Taux réalisation M.Prev | Pourcentage de M.Prev réalisées |
| M.Prev en retard | Nombre de maintenances en retard |
| M.Prev à venir (7j) | Maintenances planifiées dans les 7 jours |

### Capteurs MQTT
| Type | Description |
|------|-------------|
| Valeur d'un capteur | Dernière valeur reçue du capteur sélectionné |
| Historique capteur | Liste des dernières valeurs |

> **⚠️ Important** : Lorsque vous sélectionnez "Valeur d'un capteur MQTT", vous devez ensuite choisir le capteur spécifique dans la liste déroulante qui apparaît.

### Compteurs
| Type | Description |
|------|-------------|
| Relevé d'un compteur | Dernière valeur du compteur sélectionné |
| Historique compteur | Liste des derniers relevés |

> **⚠️ Important** : Lorsque vous sélectionnez "Relevé d'un compteur", vous devez choisir le compteur spécifique.

### Inventaire
| Type | Description |
|------|-------------|
| Articles en stock | Nombre total d'articles |
| Articles en rupture | Articles sous le seuil minimum |
| Valeur du stock | Valeur totale en euros |

### Autres
| Type | Description |
|------|-------------|
| Demandes d'intervention | Nombre de demandes |
| Demandes d'achat | Nombre de demandes d'achat |
| Presqu'accidents | Nombre d'incidents signalés |
| Utilisateurs en ligne | Nombre d'utilisateurs connectés |"""
        },
        {
            "id": "sec-ds-05",
            "chapter_id": chapter_id,
            "title": "Gérer ses widgets",
            "order": 5,
            "content": """## Gestion des widgets

### Actions disponibles

Pour chaque widget, un menu d'actions (⋮) permet de :

- **Rafraîchir** : Met à jour immédiatement les données
- **Modifier** : Ouvre l'éditeur pour modifier la configuration
- **Supprimer** : Supprime définitivement le widget

### Rafraîchissement automatique

Par défaut, le Dashboard Service actualise tous les widgets **toutes les minutes**. Vous pouvez :
- Désactiver l'actualisation automatique avec le bouton **Auto-refresh ON/OFF**
- Forcer un rafraîchissement manuel avec le bouton **Rafraîchir**

### Indicateurs visuels

- **Badge "Partagé"** : Le widget est visible par d'autres utilisateurs
- **Badge "Erreur"** : Le widget n'a pas pu récupérer ses données
- **Horodatage** : "Mis à jour à XX:XX" indique la dernière actualisation

### Bonnes pratiques

1. **Nommez clairement vos widgets** : Utilisez des noms explicites comme "Taux OT Production - Mois"
2. **Limitez le nombre de widgets** : Trop de widgets peut ralentir l'affichage
3. **Choisissez la bonne fréquence** : Des données qui changent peu n'ont pas besoin d'un rafraîchissement rapide
4. **Testez vos sources Excel** : Utilisez le bouton "Tester" avant de sauvegarder
5. **Partagez intelligemment** : Ne partagez que les widgets utiles à votre équipe

### Résolution de problèmes

| Problème | Solution |
|----------|----------|
| Widget affiche "Erreur" | Vérifiez la source de données (fichier Excel accessible, capteur actif, etc.) |
| Valeur toujours à 0 | Vérifiez les filtres (service, période) et la configuration de la source |
| Capteur non trouvé | Assurez-vous que le capteur est configuré dans la section "Capteurs MQTT" |
| Fichier Excel inaccessible | Vérifiez le chemin SMB et les identifiants |"""
        }
    ]
    
    for section in sections:
        section["created_at"] = datetime.now(timezone.utc).isoformat()
        section["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.manual_sections.insert_one(section)
        print(f"  ✅ Section créée: {section['title']}")
    
    print(f"\n✅ Chapitre 'Dashboard Service' ajouté avec {len(sections)} sections")
    
    # Mettre à jour la version du manuel
    await db.user_manuals.update_one(
        {"id": "manual-gmao-iris"},
        {
            "$set": {
                "version": "1.3",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "changes": "Ajout du chapitre Dashboard Service et widgets personnalisés (Janvier 2026)"
            }
        },
        upsert=True
    )
    
    print("✅ Version du manuel mise à jour: 1.3")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_dashboard_service_chapter())
