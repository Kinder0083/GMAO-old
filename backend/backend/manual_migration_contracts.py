"""
Script de migration pour ajouter le chapitre Contrats au manuel utilisateur
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "gmao_iris")

NEW_CHAPTERS = [
    {
        "id": "ch-036",
        "title": "Gestion des Contrats",
        "description": "Gestion complete des contrats fournisseurs avec suivi des echeances, alertes et extraction IA",
        "icon": "FileSignature",
        "order": 36,
        "target_roles": [],
        "sections_count": 0,
    },
]

NEW_SECTIONS = [
    # --- Chapitre Contrats ---
    {
        "id": "sec-036-01",
        "chapter_id": "ch-036",
        "title": "Presentation de la section Contrats",
        "content": """La section **Contrats** permet de gerer l'ensemble des contrats passes avec des societes exterieures (maintenance, service, location, prestation, etc.).

**Acces :** Menu lateral > Contrats

**Vue principale :**
- **Statistiques** : Nombre total de contrats, contrats actifs, expires, expirant bientot, cout mensuel et annuel
- **Filtres** : Recherche par texte, filtrage par statut (actif, expire, resilie) et par type (maintenance, service, location, prestation)
- **Tableau** : Liste de tous les contrats avec numero, titre, fournisseur, type, statut, echeance et montant

**Actions disponibles :**
- Creer un nouveau contrat
- Consulter le detail d'un contrat
- Modifier un contrat
- Supprimer un contrat
- Acceder au tableau de bord des contrats""",
        "order": 1,
        "level": "beginner",
        "keywords": ["contrat", "fournisseur", "echeance", "maintenance", "service", "location"],
    },
    {
        "id": "sec-036-02",
        "chapter_id": "ch-036",
        "title": "Creer et modifier un contrat",
        "content": """**Creation d'un contrat :**

1. Cliquez sur **"Nouveau contrat"**
2. Remplissez les informations :

**Informations generales :**
- Numero de contrat (obligatoire)
- Titre / Objet du contrat (obligatoire)
- Type : Maintenance, Service, Location, Prestation, Autre
- Statut : Actif, Expire, Resilie, En renouvellement

**Dates :**
- Date d'etablissement
- Date de debut
- Date de fin

**Informations financieres :**
- Montant total du contrat (EUR)
- Periodicite de paiement : Mensuel, Trimestriel, Annuel
- Montant par periode
- Mode de paiement (virement, prelevement, cheque...)

**Fournisseur :**
- Selectionnez un fournisseur existant (les champs seront pre-remplis automatiquement)
- Ou saisissez manuellement : nom, adresse, telephone, email, site web

**Personne de contact chez le fournisseur :**
- Nom, telephone, email

**Signataire interne et commande interne :**
- Nom de la personne ayant signe le contrat
- Numero de commande interne

**Alertes :**
- Alerte d'echeance : nombre de jours avant la fin du contrat (defaut: 30 jours)
- Alerte de resiliation : nombre de jours de preavis pour penser a resilier

**Notes :**
- Champ libre pour toute information complementaire

3. Cliquez sur **"Creer"** ou **"Mettre a jour"**""",
        "order": 2,
        "level": "beginner",
        "keywords": ["creer", "modifier", "formulaire", "fournisseur", "date", "montant", "alerte"],
    },
    {
        "id": "sec-036-03",
        "chapter_id": "ch-036",
        "title": "Extraction IA des contrats",
        "content": """**Fonctionnalite d'extraction automatique par IA :**

Lors de la creation d'un nouveau contrat, vous pouvez importer un fichier PDF ou une image du contrat pour que l'intelligence artificielle extraie automatiquement les informations.

**Comment utiliser :**
1. Cliquez sur **"Nouveau contrat"**
2. Dans la zone **"Extraction IA"** en haut du formulaire, cliquez sur **"Choisir un fichier"**
3. Selectionnez votre contrat (formats acceptes : PDF, PNG, JPG, JPEG, WEBP)
4. L'IA analyse le document et pre-remplit les champs automatiquement
5. **Verifiez et completez** les informations extraites si necessaire
6. Cliquez sur **"Creer"**

**Informations extraites automatiquement :**
- Numero de contrat, titre
- Dates (etablissement, debut, fin)
- Montants et periodicite
- Nom et coordonnees de la societe
- Personne de contact
- Resume des points importants (dans les notes)

**Important :** Verifiez toujours les informations extraites. L'IA peut faire des erreurs, notamment sur les montants et les dates.""",
        "order": 3,
        "level": "intermediate",
        "keywords": ["IA", "extraction", "PDF", "automatique", "intelligence artificielle", "import"],
    },
    {
        "id": "sec-036-04",
        "chapter_id": "ch-036",
        "title": "Pieces jointes et detail du contrat",
        "content": """**Consulter le detail d'un contrat :**
- Cliquez sur l'icone oeil ou sur le numero/titre du contrat dans le tableau

**Le detail affiche :**
- Informations generales (numero, type, statut, dates, jours restants)
- Informations financieres (montant total, montant par periode, mode de paiement)
- Coordonnees du fournisseur et de la personne de contact
- Configuration des alertes
- Liste des pieces jointes
- Notes

**Gestion des pieces jointes :**
- Dans la vue detail, cliquez sur **"Ajouter un fichier"** pour joindre un document
- Formats acceptes : PDF, images, et tout autre type de fichier
- Chaque piece jointe affiche le nom du fichier, sa taille et la date d'ajout
- Vous pouvez telecharger ou supprimer chaque piece jointe individuellement

**Cas d'utilisation typiques :**
- Joindre le contrat original signe
- Ajouter des avenants
- Joindre des factures associees
- Ajouter des photos ou plans""",
        "order": 4,
        "level": "beginner",
        "keywords": ["pieces jointes", "fichier", "upload", "telecharger", "detail", "PDF"],
    },
    {
        "id": "sec-036-05",
        "chapter_id": "ch-036",
        "title": "Systeme d'alertes des contrats",
        "content": """**Types d'alertes :**

1. **Alerte d'echeance** : Vous previent X jours avant la fin du contrat
   - Configurable par contrat (defaut : 30 jours)
   - Severite : Critique (expire ou < 15j), Avertissement (< 30j), Information (> 30j)

2. **Alerte de resiliation** : Vous rappelle de penser a resilier avant la date limite
   - Configurable avec le delai de preavis (ex: 90 jours = 3 mois avant l'echeance)
   - Particulierement utile pour les contrats avec reconduction tacite

**Ou voir les alertes :**
- **Bouton "Alertes"** sur la page Contrats (badge rouge avec le nombre d'alertes)
- **Calendrier des echeances** dans le Tableau de bord Contrats
- **Par email** : un email recapitulatif est envoye quotidiennement aux administrateurs

**Mise a jour automatique des statuts :**
- Les contrats dont la date de fin est passee sont automatiquement marques comme "Expire"
- Cette verification s'effectue chaque jour a 8h00

**Configuration SMTP requise :**
Pour recevoir les alertes par email, assurez-vous que les parametres SMTP sont configures dans les Reglages > Parametres email.""",
        "order": 5,
        "level": "intermediate",
        "keywords": ["alerte", "echeance", "resiliation", "notification", "email", "preavis", "expiration"],
    },
    {
        "id": "sec-036-06",
        "chapter_id": "ch-036",
        "title": "Tableau de bord des contrats",
        "content": """**Acces :** Page Contrats > Bouton **"Tableau de bord"**
Ou directement : /contrats/dashboard

**KPI (Indicateurs cles) :**
- Nombre de contrats actifs
- Budget mensuel total (somme des couts mensuels de tous les contrats actifs)
- Budget annuel total
- Contrats a renouveler ce trimestre
- Nombre de contrats expires

**Graphiques :**
1. **Evolution du budget mensuel (12 mois)** : Courbe montrant l'evolution de vos engagements sur l'annee ecoulee
2. **Repartition par type** : Diagramme en anneau (Maintenance, Service, Location, Prestation)
3. **Cout par fournisseur** : Barres horizontales montrant le cout mensuel et annuel par fournisseur
4. **Repartition par statut** : Diagramme en anneau (Actif, Expire, Resilie)
5. **Top fournisseurs** : Classement des 5 fournisseurs les plus couteux

**Calendrier des echeances :**
- Timeline chronologique des prochaines echeances et dates de resiliation
- Groupe par mois
- Code couleur : Rouge (critique), Orange (avertissement), Bleu (information)
- Cliquez sur un evenement pour acceder au contrat correspondant""",
        "order": 6,
        "level": "intermediate",
        "keywords": ["tableau de bord", "dashboard", "KPI", "graphique", "budget", "calendrier", "statistiques"],
    },
]


async def run_migration():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    added_chapters = 0
    added_sections = 0
    
    for chapter in NEW_CHAPTERS:
        existing = await db.manual_chapters.find_one({"id": chapter["id"]})
        if not existing:
            chapter["created_at"] = now.isoformat()
            chapter["updated_at"] = now.isoformat()
            await db.manual_chapters.insert_one(chapter)
            added_chapters += 1
            print(f"  + Chapitre ajoute: {chapter['title']}")
        else:
            print(f"  = Chapitre existant: {chapter['title']}")
    
    for section in NEW_SECTIONS:
        existing = await db.manual_sections.find_one({"id": section["id"]})
        if not existing:
            section["parent_id"] = None
            section["target_roles"] = []
            section["target_modules"] = []
            section["images"] = []
            section["video_url"] = None
            section["created_at"] = now.isoformat()
            section["updated_at"] = now.isoformat()
            if "keywords" not in section:
                section["keywords"] = []
            await db.manual_sections.insert_one(section)
            added_sections += 1
            print(f"  + Section ajoutee: {section['title']}")
        else:
            print(f"  = Section existante: {section['title']}")
    
    # Update version
    await db.manual_versions.update_many({"is_current": True}, {"$set": {"is_current": False}})
    await db.manual_versions.insert_one({
        "id": f"migration-contracts-{now.strftime('%Y%m%d%H%M%S')}",
        "version": "2.4",
        "release_date": now.isoformat(),
        "changes": [
            "Ajout chapitre: Gestion des Contrats",
            "6 sections: Presentation, Creation, Extraction IA, Pieces jointes, Alertes, Tableau de bord"
        ],
        "author_id": "system",
        "is_current": True
    })
    
    print(f"\nMigration terminee: {added_chapters} chapitre(s), {added_sections} section(s)")
    client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
