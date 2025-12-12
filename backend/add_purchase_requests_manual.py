"""
Script pour ajouter le chapitre "Demandes d'Achat" au manuel utilisateur
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def add_purchase_requests_chapter():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db_name = os.environ.get('DB_NAME', 'gmao_iris')
    db = client[db_name]
    
    print("=" * 80)
    print("🛒 AJOUT DU CHAPITRE DEMANDES D'ACHAT AU MANUEL")
    print("=" * 80)
    
    # Vérifier si le chapitre existe déjà
    existing = await db.manual_chapters.find_one({"id": "ch-013"})
    if existing:
        print("⚠️  Le chapitre existe déjà, mise à jour...")
        await db.manual_chapters.delete_one({"id": "ch-013"})
        await db.manual_sections.delete_many({"chapter_id": "ch-013"})
    
    # Créer le chapitre
    chapter = {
        "id": "ch-013",
        "title": "🛒 Demandes d'Achat",
        "order": 13,
        "sections": [
            "sec-013-01",
            "sec-013-02",
            "sec-013-03",
            "sec-013-04",
            "sec-013-05",
            "sec-013-06"
        ],
        "target_roles": []
    }
    
    # Créer les sections
    sections = [
        {
            "id": "sec-013-01",
            "chapter_id": "ch-013",
            "title": "Vue d'ensemble",
            "order": 1,
            "content": """# Vue d'ensemble

Le module **Demandes d'Achat** permet de gérer l'ensemble du processus d'achat de matériel, pièces et services au sein de votre organisation.

## Fonctionnalités principales

- **Création de demandes** : Formulaire complet pour soumettre des demandes d'achat
- **Workflow d'approbation** : Validation hiérarchique (N+1 puis service achat)
- **Suivi en temps réel** : 8 statuts pour suivre l'avancement de chaque demande
- **Notifications email** : Alertes automatiques à chaque changement de statut
- **Intégration inventaire** : Ajout automatique des articles reçus au stock
- **Historique complet** : Traçabilité de toutes les actions et modifications

## Accès au module

Cliquez sur **"Demandes d'Achat"** dans le menu latéral pour accéder au module.

## Permissions

- **Tous les utilisateurs** peuvent créer et consulter leurs propres demandes
- **Les N+1** reçoivent les demandes de leurs équipes pour validation
- **Les administrateurs** gèrent l'ensemble du processus d'achat
""",
            "target_roles": []
        },
        {
            "id": "sec-013-02",
            "chapter_id": "ch-013",
            "title": "Créer une demande d'achat",
            "order": 2,
            "content": """# Créer une demande d'achat

## Étapes de création

1. Cliquez sur le bouton **"Nouvelle Demande"** en haut à droite
2. Remplissez le formulaire avec les informations requises
3. Cliquez sur **"Créer la demande"**

## Champs du formulaire

### Informations de base

- **Article depuis l'inventaire** (optionnel) : Sélectionnez un article existant pour pré-remplir le formulaire
- **Type** : Nature de l'article (Pièce détachée, Équipement, Consommable, Service, etc.)
- **Urgence** : Normale, Urgent, Très urgent
- **Désignation** : Nom de l'article ou du service (obligatoire)
- **Référence** : Référence fabricant ou code article
- **Description** : Caractéristiques techniques détaillées

### Quantité

- **Quantité** : Nombre d'unités à commander (obligatoire)
- **Unité** : Unité, Kg, L, m, m², m³, Boîte, Carton, Palette

### Informations complémentaires

- **Fournisseur suggéré** : Nom du fournisseur recommandé (avec autocomplétion depuis la liste des fournisseurs)
- **Destinataire final** : Personne qui recevra l'article (texte libre avec autocomplétion des utilisateurs)
- **Justification** : Expliquez pourquoi cet achat est nécessaire (minimum 10 caractères, obligatoire)

## Après la création

Une fois créée, la demande :
- Reçoit un **numéro unique** (format DA-ANNÉE-XXXXX)
- Est automatiquement transmise à votre **N+1** par email
- Apparaît dans la liste avec le statut **"Transmise au N+1"**
""",
            "target_roles": []
        },
        {
            "id": "sec-013-03",
            "chapter_id": "ch-013",
            "title": "Workflow et statuts",
            "order": 3,
            "content": """# Workflow et statuts

Le processus de demande d'achat suit un workflow en 8 étapes :

## 1. Transmise au N+1 (SOUMISE)
- La demande est envoyée au responsable hiérarchique par email
- Le N+1 reçoit un PDF de la demande avec des boutons "Approuver" / "Refuser"

## 2. Validée par N+1 (VALIDEE_N1)
- Le N+1 a approuvé la demande
- Un email est automatiquement envoyé au service achat
- Le demandeur est notifié par email

## 3. Approuvée Achat (APPROUVEE_ACHAT)
- Le service achat a approuvé la demande
- L'achat peut être effectué
- Le demandeur est notifié

## 4. Achat Effectué (ACHAT_EFFECTUE)
- L'achat a été réalisé
- La commande est en cours de livraison
- Le demandeur est notifié

## 5. Réceptionnée (RECEPTIONNEE)
- L'article a été reçu et vérifié
- En attente de distribution au destinataire

## 6. Distribuée (DISTRIBUEE)
- L'article a été remis au destinataire final
- Le destinataire reçoit une notification par email
- Possibilité d'ajouter l'article à l'inventaire

## Statuts de refus

### Refusée par N+1 (REFUSEE_N1)
- Le responsable hiérarchique a refusé la demande
- Le demandeur est notifié avec le motif du refus

### Refusée Achat (REFUSEE_ACHAT)
- Le service achat a refusé la demande
- Le demandeur est notifié avec le motif du refus

## Notifications email

À chaque changement de statut, des emails sont automatiquement envoyés :
- **Demandeur** : Informé de tous les changements
- **N+1** : Reçoit les nouvelles demandes à valider
- **Service achat** : Reçoit les demandes validées par les N+1
- **Destinataire** : Informé quand l'article est distribué
""",
            "target_roles": []
        },
        {
            "id": "sec-013-04",
            "chapter_id": "ch-013",
            "title": "Consulter et filtrer les demandes",
            "order": 4,
            "content": """# Consulter et filtrer les demandes

## Vue d'ensemble

La page principale affiche :
- **Statistiques** : Total, En attente, Approuvées, Refusées
- **Barre de recherche** : Recherche par numéro, article ou demandeur
- **Filtre par statut** : Afficher uniquement un statut spécifique
- **Liste des demandes** : Cartes cliquables avec informations essentielles

## Informations affichées

Pour chaque demande, vous voyez :
- **Numéro** : DA-YYYY-XXXXX
- **Type** : Icône et libellé (🔧 Pièce détachée, ⚙️ Équipement, etc.)
- **Date de création**
- **Référence fabricant** (ou "N/A" si non renseignée)
- **Désignation** : Nom de l'article
- **Quantité** : Nombre et unité
- **Demandeur** : Nom de la personne ayant créé la demande
- **Destinataire** : Personne qui recevra l'article
- **Urgence** : Badge coloré (Normal, Urgent, Très urgent)
- **Statut actuel** : Badge avec icône

## Détail d'une demande

Cliquez sur une demande pour voir :
- **Détails complets** : Toutes les informations saisies
- **Historique** : Chronologie de toutes les actions avec date, heure, utilisateur et commentaire
- **Dates importantes** : Création, validation, approbation, etc.
- **Justification** : Raison de l'achat
- **Responsables** : Demandeur, N+1, destinataire

## Filtres disponibles

- **Par statut** : Tous / Transmise / Validée / Approuvée / etc.
- **Par recherche** : Texte libre dans numéro, désignation ou demandeur
""",
            "target_roles": []
        },
        {
            "id": "sec-013-05",
            "chapter_id": "ch-013",
            "title": "Valider et gérer les demandes",
            "order": 5,
            "content": """# Valider et gérer les demandes

## Pour les N+1 (Responsables hiérarchiques)

### Validation par email
1. Vous recevez un email avec le PDF de la demande
2. Deux boutons sont disponibles : **"Approuver"** ou **"Refuser"**
3. Un clic sur le bouton valide ou refuse immédiatement la demande
4. Le demandeur est automatiquement notifié

### Validation dans l'application
1. Allez dans "Demandes d'Achat"
2. Cliquez sur la demande à traiter
3. Cliquez sur **"Changer le statut"**
4. Choisissez "Valider (N+1)" ou "Refuser (N+1)"
5. Ajoutez un commentaire (optionnel)
6. Confirmez

## Pour les administrateurs (Service achat)

### Approbation d'achat
1. Vous recevez un email lorsqu'une demande est validée par un N+1
2. Cliquez sur **"Approuver l'achat"** ou **"Refuser"** dans l'email
3. Ou validez dans l'application via le bouton **"Changer le statut"**

### Suivi de l'achat
Une fois approuvé, mettez à jour le statut au fur et à mesure :
1. **"Achat effectué"** : Commande passée
2. **"Réceptionnée"** : Article reçu
3. **"Distribuée"** : Article remis au destinataire

### Ajout à l'inventaire
Lorsqu'une demande est au statut **"Distribuée"** :
1. Un bouton **"Ajouter à l'inventaire"** apparaît
2. Cliquez dessus pour démarrer le processus
3. **Détection automatique des doublons** :
   - Le système recherche des articles similaires par désignation
   - Si des articles proches sont trouvés, vous pouvez :
     - Ajouter la quantité à un article existant
     - Ou créer un nouvel article malgré la similarité
4. L'article est créé ou mis à jour dans l'inventaire
5. Un badge "Ajouté à l'inventaire" apparaît sur la demande

## Ajout de commentaires

À chaque changement de statut, vous pouvez ajouter un commentaire :
- Visible dans l'historique de la demande
- Aide à la traçabilité et communication
- Utile pour expliquer un refus ou donner des instructions
""",
            "target_roles": []
        },
        {
            "id": "sec-013-06",
            "chapter_id": "ch-013",
            "title": "Intégration avec l'inventaire",
            "order": 6,
            "content": """# Intégration avec l'inventaire

## Lien avec l'inventaire existant

### Lors de la création
- Le formulaire propose une liste déroulante des articles en stock
- Sélectionner un article pré-remplit automatiquement :
  - Désignation
  - Référence
  - Unité
  - Type

### Ajout après distribution

Une fois une demande distribuée, l'administrateur peut l'ajouter à l'inventaire :

#### 1. Sans doublon détecté
- L'article est automatiquement créé dans l'inventaire
- Quantité, référence et fournisseur sont repris de la demande
- Un lien est établi entre la demande et l'article

#### 2. Avec doublons détectés
Le système affiche les articles similaires trouvés :
- **Correspondance exacte** : Désignation identique (badge rouge)
- **Correspondance partielle** : Désignation proche (badge orange)

Pour chaque doublon, vous voyez :
- Nom de l'article existant
- Stock actuel et unité
- Référence et emplacement

**Deux options** :
1. **"Ajouter ici"** : Ajoute la quantité à l'article existant
2. **"Créer un nouvel article"** : Crée un article distinct

## Surveillance du stock

Les articles ajoutés depuis les demandes d'achat intègrent automatiquement la surveillance du stock :
- Génèrent des alertes si le stock est bas
- Apparaissent dans les statistiques de l'inventaire
- Peuvent être désactivés de la surveillance ultérieurement

## Option de désactivation de surveillance

Dans l'inventaire, pour tout article :
1. Cliquez sur l'icône **œil barré** (👁️‍🗨️) dans la colonne Actions
2. L'article passe en mode "Non surveillé"
3. Avantages :
   - Ne génère plus d'alertes de stock
   - N'apparaît plus dans les statistiques
   - Reste visible dans l'inventaire (ligne semi-transparente)
   - Badge "Non surveillé" affiché
4. Recliquez sur l'icône **œil** pour réactiver la surveillance

## Cas d'usage

- **Articles archivés** : Matériel hors service mais conservé pour historique
- **Stock de sécurité** : Articles stockés sans surveillance active
- **En attente de validation** : Articles reçus mais pas encore mis en service
""",
            "target_roles": []
        }
    ]
    
    # Insérer le chapitre
    await db.manual_chapters.insert_one(chapter)
    print(f"✅ Chapitre créé : {chapter['title']}")
    
    # Insérer les sections
    await db.manual_sections.insert_many(sections)
    print(f"✅ {len(sections)} sections créées")
    
    # Mettre à jour la date de dernière modification de la version
    await db.manual_versions.update_one(
        {"is_current": True},
        {"$set": {"release_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    print("\n" + "=" * 80)
    print("✅ MANUEL MIS À JOUR AVEC SUCCÈS")
    print("=" * 80)
    print("\nLe chapitre 'Demandes d'Achat' est maintenant disponible dans le manuel.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_purchase_requests_chapter())
