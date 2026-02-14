"""
Script de migration pour ajouter les chapitres manquants au manuel utilisateur.
Ce script peut être exécuté directement ou via l'endpoint /api/manual/upgrade-all-modules
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "gmao_iris")

NEW_CHAPTERS = [
    {
        "id": "ch-026",
        "title": "📹 Caméras",
        "description": "Visualisation et gestion des caméras RTSP/ONVIF",
        "icon": "Camera",
        "order": 26,
        "target_roles": [],
        "target_modules": ["cameras"],
        "sections": ["sec-026-01", "sec-026-02", "sec-026-03"]
    },
    {
        "id": "ch-027",
        "title": "📊 Rapports M.E.S.",
        "description": "Historiques, exports et rapports planifiés de production",
        "icon": "FileBarChart",
        "order": 27,
        "target_roles": [],
        "target_modules": ["mes"],
        "sections": ["sec-027-01", "sec-027-02", "sec-027-03"]
    },
    {
        "id": "ch-028",
        "title": "📋 Dashboard Service",
        "description": "Tableau de bord personnalisé par service",
        "icon": "Presentation",
        "order": 28,
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "sections": ["sec-028-01", "sec-028-02", "sec-028-03"]
    },
    {
        "id": "ch-029",
        "title": "👥 Gestion d'Equipe",
        "description": "Pointage horaire et gestion des equipes",
        "icon": "UserCog",
        "order": 29,
        "target_roles": [],
        "target_modules": ["timeTracking"],
        "sections": ["sec-029-01", "sec-029-02", "sec-029-03"]
    },
    {
        "id": "ch-030",
        "title": "📑 Rapports Hebdomadaires",
        "description": "Creation et planification de rapports de service automatiques",
        "icon": "FileText",
        "order": 30,
        "target_roles": [],
        "target_modules": ["weeklyReports"],
        "sections": ["sec-030-01", "sec-030-02", "sec-030-03"]
    },
    {
        "id": "ch-031",
        "title": "📺 Tableau d'Affichage",
        "description": "Tableau blanc collaboratif et affichage dynamique",
        "icon": "Presentation",
        "order": 31,
        "target_roles": [],
        "target_modules": ["whiteboard"],
        "sections": ["sec-031-01", "sec-031-02"]
    },
    {
        "id": "ch-032",
        "title": "📈 Analytics Checklists",
        "description": "Dashboard d'analyse des resultats des controles qualite",
        "icon": "BarChart3",
        "order": 32,
        "target_roles": [],
        "target_modules": ["analyticsChecklists"],
        "sections": ["sec-032-01", "sec-032-02"]
    },
    {
        "id": "ch-033",
        "title": "🎨 Personnalisation",
        "description": "Options de personnalisation de l'interface et des preferences",
        "icon": "Palette",
        "order": 33,
        "target_roles": [],
        "target_modules": ["personalization"],
        "sections": ["sec-033-01", "sec-033-02", "sec-033-03"]
    },
    {
        "id": "ch-034",
        "title": "📝 Autorisations Particulieres",
        "description": "Gestion des autorisations speciales de travail",
        "icon": "Shield",
        "order": 34,
        "target_roles": [],
        "target_modules": ["documentations"],
        "sections": ["sec-034-01", "sec-034-02"]
    },
    {
        "id": "ch-035",
        "title": "🛑 Demandes d'Arret",
        "description": "Gestion des demandes d'arret machine et validation",
        "icon": "AlertTriangle",
        "order": 35,
        "target_roles": [],
        "target_modules": ["documentations"],
        "sections": ["sec-035-01", "sec-035-02", "sec-035-03"]
    },
]

NEW_SECTIONS = [
    # === CAMERAS ===
    {
        "id": "sec-026-01",
        "chapter_id": "ch-026",
        "title": "Presentation du module Cameras",
        "content": """**Module Cameras RTSP/ONVIF**

Le module Cameras permet de visualiser et gerer vos cameras de surveillance industrielle directement depuis GMAO Iris.

**Fonctionnalites principales :**
- Visualisation en temps reel des flux RTSP
- Support du protocole ONVIF pour la decouverte automatique
- Captures d'ecran automatiques et manuelles
- Alertes sur detection d'evenements
- Historique des captures et evenements

**Types de cameras supportes :**
- Cameras IP avec flux RTSP
- Cameras compatibles ONVIF
- Cameras Frigate (integration avancee)

**Pre-requis :**
- Camera accessible sur le reseau local
- URL du flux RTSP de la camera
- Droits d'acces au module Cameras""",
        "order": 1,
        "level": "beginner",
        "keywords": ["cameras", "rtsp", "onvif", "surveillance", "video"],
    },
    {
        "id": "sec-026-02",
        "chapter_id": "ch-026",
        "title": "Ajouter et configurer une camera",
        "content": """**Ajouter une camera**

1. Accedez au module **Cameras** depuis la sidebar
2. Cliquez sur **"+ Ajouter une camera"**
3. Remplissez les informations :
   - **Nom** : Nom descriptif de la camera
   - **URL RTSP** : L'URL du flux video (ex: rtsp://192.168.1.100:554/stream)
   - **Emplacement** : Zone ou la camera est installee
   - **Type** : RTSP, ONVIF ou Frigate

**Configuration avancee :**
- **Intervalle de capture** : Frequence des captures automatiques
- **Stockage** : Duree de conservation des captures
- **Alertes** : Configuration des notifications

**Tester la connexion :**
Cliquez sur le bouton **"Tester"** pour verifier que le flux est accessible avant de sauvegarder.""",
        "order": 2,
        "level": "beginner",
        "keywords": ["ajouter", "configurer", "rtsp", "url", "camera"],
    },
    {
        "id": "sec-026-03",
        "chapter_id": "ch-026",
        "title": "Visualisation et alertes cameras",
        "content": """**Visualisation en direct**

- Cliquez sur une camera pour afficher le flux en direct
- Utilisez le mode **mosaique** pour afficher plusieurs cameras simultanement
- Double-cliquez pour passer en plein ecran

**Captures d'ecran**
- Capture manuelle : Cliquez sur l'icone camera
- Captures automatiques : Configurees dans les parametres de la camera
- Les captures sont stockees et consultables dans l'historique

**Systeme d'alertes**
- Alertes de deconnexion si la camera devient inaccessible
- Alertes de detection de mouvement (si supporte par la camera)
- Les alertes apparaissent dans le systeme de notifications""",
        "order": 3,
        "level": "beginner",
        "keywords": ["visualisation", "capture", "alerte", "flux", "mosaique"],
    },

    # === RAPPORTS M.E.S. ===
    {
        "id": "sec-027-01",
        "chapter_id": "ch-027",
        "title": "Page Rapports M.E.S.",
        "content": """**Rapports M.E.S. - Historiques de production**

La page Rapports M.E.S. permet d'acceder a l'ensemble des donnees historiques de production avec des outils d'analyse avances.

**Fonctionnalites :**
- Filtrage par machine, periode, equipe
- Graphiques de production (cadence, TRS, arrets)
- Tableaux detailles avec tri et recherche
- Comparaison entre machines ou periodes
- Export Excel et PDF

**Acces :**
Depuis la sidebar, cliquez sur **Rapports M.E.S.** ou depuis la page M.E.S., cliquez sur **"Voir les rapports"**.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["rapports", "mes", "historique", "production", "analyse"],
    },
    {
        "id": "sec-027-02",
        "chapter_id": "ch-027",
        "title": "Filtres et analyse des rapports",
        "content": """**Filtres disponibles**

- **Machine** : Selectionnez une ou plusieurs machines
- **Periode** : Jour, semaine, mois ou periode personnalisee
- **Equipe** : Filtrer par equipe de production (matin, apres-midi, nuit)
- **Reference produit** : Filtrer par produit fabrique

**Graphiques d'analyse**
- **Courbe de cadence** : Evolution de la cadence dans le temps
- **Histogramme TRS** : TRS par jour/semaine avec decomposition (Disponibilite, Performance, Qualite)
- **Diagramme de Pareto** : Causes d'arret les plus frequentes
- **Comparatif** : Performance entre machines

**Indicateurs cles**
- TRS moyen sur la periode
- Nombre total de pieces produites
- Temps d'arret cumule
- Taux de rebuts""",
        "order": 2,
        "level": "beginner",
        "keywords": ["filtres", "graphiques", "trs", "analyse", "pareto"],
    },
    {
        "id": "sec-027-03",
        "chapter_id": "ch-027",
        "title": "Exports et rapports planifies",
        "content": """**Export des donnees**

- **Excel** : Export complet avec toutes les donnees filtrees
- **PDF** : Rapport formate avec graphiques et resume

**Rapports planifies automatiques**

Les administrateurs peuvent configurer des rapports automatiques :
1. Accedez aux **Parametres M.E.S.**
2. Section **"Rapports planifies"**
3. Configurez :
   - Frequence (quotidien, hebdomadaire, mensuel)
   - Destinataires email
   - Machines incluses
   - Format du rapport

Les rapports sont generes automatiquement et envoyes par email aux destinataires configures.""",
        "order": 3,
        "level": "advanced",
        "keywords": ["export", "excel", "pdf", "planifie", "automatique", "email"],
    },

    # === DASHBOARD SERVICE ===
    {
        "id": "sec-028-01",
        "chapter_id": "ch-028",
        "title": "Presentation du Dashboard Service",
        "content": """**Dashboard Service - Tableau de bord par service**

Le Dashboard Service offre une vue personnalisee des indicateurs cles de votre service.

**Fonctionnalites :**
- Widgets personnalisables (compteurs, graphiques, listes)
- Vue par service (Maintenance, Production, QHSE, etc.)
- Donnees en temps reel
- Acces rapide aux taches prioritaires

**Acces :**
Depuis la sidebar, cliquez sur **Dashboard Service**. Le dashboard affiche automatiquement les informations pertinentes pour votre service.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["dashboard", "service", "widgets", "indicateurs"],
    },
    {
        "id": "sec-028-02",
        "chapter_id": "ch-028",
        "title": "Widgets personnalises",
        "content": """**Creer un widget personnalise**

1. Cliquez sur **"+ Nouveau widget"**
2. Choisissez le type :
   - **Compteur** : Affiche un chiffre cle (ex: OT en cours)
   - **Graphique** : Courbe ou histogramme
   - **Liste** : Top 5 des items
   - **Jauge** : Indicateur de performance
3. Configurez la source de donnees
4. Definissez la periode et les filtres
5. Sauvegardez

**Organiser les widgets :**
- Glissez-deposez pour reorganiser
- Redimensionnez en tirant les bords
- Masquez/affichez selon vos besoins""",
        "order": 2,
        "level": "advanced",
        "keywords": ["widget", "personnalise", "compteur", "graphique", "creer"],
    },
    {
        "id": "sec-028-03",
        "chapter_id": "ch-028",
        "title": "Vue equipe du service",
        "content": """**Vue Equipe**

La vue equipe permet de visualiser les membres de votre service et leur charge de travail.

**Informations affichees :**
- Liste des membres du service
- Taches assignees a chaque membre
- Charge de travail (indicateur visuel)
- Statut de disponibilite

**Acces :**
Depuis le Dashboard Service, cliquez sur **"Vue equipe"** ou accedez via `/service-dashboard/team`.""",
        "order": 3,
        "level": "beginner",
        "keywords": ["equipe", "service", "charge", "membres", "taches"],
    },

    # === GESTION D'EQUIPE ===
    {
        "id": "sec-029-01",
        "chapter_id": "ch-029",
        "title": "Presentation de la Gestion d'equipe",
        "content": """**Gestion d'equipe et Pointage**

Le module Gestion d'equipe permet de gerer les equipes, les plannings et le pointage horaire.

**Fonctionnalites :**
- Pointage d'arrivee et de depart
- Suivi du temps de travail
- Gestion des equipes et services
- Historique des pointages
- Rapports de presence

**Acces :**
Depuis la sidebar, cliquez sur **Gestion d'equipe**.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["equipe", "pointage", "horaire", "presence", "temps"],
    },
    {
        "id": "sec-029-02",
        "chapter_id": "ch-029",
        "title": "Pointage horaire",
        "content": """**Effectuer un pointage**

1. Accedez a **Gestion d'equipe**
2. Cliquez sur **"Pointer"**
3. Le systeme enregistre automatiquement :
   - L'heure d'arrivee
   - L'heure de depart
   - La duree de travail

**Consulter ses pointages :**
- Vue quotidienne, hebdomadaire ou mensuelle
- Total des heures travaillees
- Alertes en cas d'anomalie (retard, absence)

**Pour les responsables :**
- Vue globale de l'equipe
- Validation des pointages
- Export des donnees de presence""",
        "order": 2,
        "level": "beginner",
        "keywords": ["pointer", "arrivee", "depart", "heures", "validation"],
    },
    {
        "id": "sec-029-03",
        "chapter_id": "ch-029",
        "title": "Configuration des equipes",
        "content": """**Gerer les equipes**

Les administrateurs et responsables de service peuvent :

- **Creer des equipes** : Definir les groupes de travail
- **Assigner des membres** : Affecter des utilisateurs aux equipes
- **Definir les horaires** : Configurer les plages horaires par equipe
- **Gerer les regimes** : Journee, 2x8, 3x8, etc.

**Configuration :**
1. Accedez a **Parametres > Gestion d'equipe**
2. Definissez les equipes et leurs horaires
3. Assignez les utilisateurs""",
        "order": 3,
        "level": "advanced",
        "keywords": ["equipe", "creer", "configurer", "horaires", "regime"],
    },

    # === RAPPORTS HEBDOMADAIRES ===
    {
        "id": "sec-030-01",
        "chapter_id": "ch-030",
        "title": "Presentation des Rapports Hebdomadaires",
        "content": """**Rapports Hebdomadaires de Service**

Les rapports hebdomadaires permettent de generer automatiquement des bilans d'activite par service.

**Fonctionnalites :**
- Generation automatique selon un planning
- Contenu personnalisable par service
- Envoi par email aux destinataires configures
- Historique des rapports generes
- Templates personnalisables

**Acces :**
Depuis la sidebar, cliquez sur **Rapports Hebdo.**""",
        "order": 1,
        "level": "beginner",
        "keywords": ["rapports", "hebdomadaire", "service", "bilan", "automatique"],
    },
    {
        "id": "sec-030-02",
        "chapter_id": "ch-030",
        "title": "Creer et configurer un rapport",
        "content": """**Creer un rapport planifie**

1. Accedez a **Rapports Hebdo.**
2. Cliquez sur **"+ Nouveau rapport"**
3. Configurez :
   - **Service** : Le service concerne
   - **Frequence** : Hebdomadaire, bi-mensuel, mensuel
   - **Jour d'envoi** : Jour de la semaine
   - **Heure d'envoi** : Heure de generation
   - **Destinataires** : Emails des destinataires
   - **Contenu** : Selectionnez les sections a inclure

**Sections disponibles :**
- Resume des interventions
- OT crees/termines
- Indicateurs de performance
- Alertes et anomalies
- Statistiques de maintenance preventive""",
        "order": 2,
        "level": "advanced",
        "keywords": ["creer", "configurer", "planifie", "frequence", "sections"],
    },
    {
        "id": "sec-030-03",
        "chapter_id": "ch-030",
        "title": "Historique et validation des rapports",
        "content": """**Consulter l'historique**

- Tous les rapports generes sont archivees
- Filtrez par service, periode, statut
- Telechargez en PDF

**Processus de validation**
1. Le rapport est genere automatiquement
2. Le responsable de service recoit une notification
3. Il peut valider, modifier ou regenerer le rapport
4. Le rapport valide est envoye aux destinataires

**Modifier un template**
Les administrateurs peuvent personnaliser les templates de rapports pour chaque service.""",
        "order": 3,
        "level": "advanced",
        "keywords": ["historique", "validation", "template", "archive", "modifier"],
    },

    # === TABLEAU D'AFFICHAGE ===
    {
        "id": "sec-031-01",
        "chapter_id": "ch-031",
        "title": "Presentation du Tableau d'Affichage",
        "content": """**Tableau d'Affichage (Whiteboard)**

Le Tableau d'Affichage est un espace collaboratif pour partager des informations visuelles.

**Fonctionnalites :**
- Tableau blanc interactif
- Ajout de textes, images, formes
- Partage en temps reel
- Ideal pour les reunions et briefings
- Mode plein ecran pour affichage sur TV

**Cas d'utilisation :**
- Affichage des consignes de securite
- Indicateurs de production du jour
- Planning de la semaine
- Notes et informations equipe

**Acces :**
Depuis la sidebar, cliquez sur **Tableau d'affichage**. Le role **AFFICHAGE** a acces uniquement a cette page.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["tableau", "affichage", "whiteboard", "collaboratif", "partage"],
    },
    {
        "id": "sec-031-02",
        "chapter_id": "ch-031",
        "title": "Utiliser le Tableau d'Affichage",
        "content": """**Creer et editer du contenu**

- **Texte** : Cliquez pour ajouter du texte, modifiez la taille et la couleur
- **Formes** : Rectangles, cercles, fleches
- **Images** : Importez des images depuis votre ordinateur
- **Notes adhesives** : Post-its colores pour les informations rapides

**Mode affichage**
- Cliquez sur **"Plein ecran"** pour afficher sur un ecran TV
- Le contenu se rafraichit automatiquement
- Ideal pour les ateliers et salles de reunion

**Gestion des droits**
- Les utilisateurs avec le role AFFICHAGE voient uniquement le tableau
- Les editeurs peuvent modifier le contenu
- Les administrateurs gerent les droits d'acces""",
        "order": 2,
        "level": "beginner",
        "keywords": ["creer", "editer", "plein ecran", "affichage", "contenu"],
    },

    # === ANALYTICS CHECKLISTS ===
    {
        "id": "sec-032-01",
        "chapter_id": "ch-032",
        "title": "Presentation Analytics Checklists",
        "content": """**Analytics Checklists - Analyse des controles**

Le module Analytics Checklists fournit un dashboard d'analyse des resultats des controles qualite effectues via les checklists.

**Fonctionnalites :**
- Taux de conformite par checklist
- Evolution dans le temps des resultats
- Identification des points de non-conformite recurrents
- Comparaison entre equipements ou zones
- Export des analyses

**Acces :**
Depuis la sidebar, cliquez sur **Analytics Checklists**.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["analytics", "checklists", "controles", "qualite", "conformite"],
    },
    {
        "id": "sec-032-02",
        "chapter_id": "ch-032",
        "title": "Utiliser le dashboard Analytics",
        "content": """**Filtres et visualisations**

- **Par checklist** : Selectionnez les checklists a analyser
- **Par periode** : Jour, semaine, mois, trimestre
- **Par equipement** : Filtrez par machine ou zone

**Graphiques disponibles :**
- Taux de conformite global
- Evolution temporelle
- Repartition des anomalies par type
- Heatmap des controles

**Actions rapides**
- Cliquez sur un point non-conforme pour voir le detail
- Creez un OT directement depuis une anomalie detectee
- Exportez le rapport d'analyse en PDF""",
        "order": 2,
        "level": "advanced",
        "keywords": ["filtres", "graphiques", "conformite", "anomalies", "export"],
    },

    # === PERSONNALISATION ===
    {
        "id": "sec-033-01",
        "chapter_id": "ch-033",
        "title": "Presentation de la Personnalisation",
        "content": """**Personnalisation de l'interface**

La page Personnalisation permet d'adapter l'interface de GMAO Iris a vos preferences.

**Sections disponibles :**
- **Organisation des menus** : Reorganisez, masquez ou groupez les menus
- **Preferences d'affichage** : Page d'accueil, format de date, devise
- **Apparence** : Theme clair/sombre, couleurs
- **Notifications** : Preferences de notifications
- **Dashboard** : Widgets et disposition du tableau de bord

**Acces :**
Depuis la sidebar, cliquez sur **Personnalisation** ou via le menu utilisateur.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["personnalisation", "interface", "preferences", "theme", "menus"],
    },
    {
        "id": "sec-033-02",
        "chapter_id": "ch-033",
        "title": "Organisation des menus",
        "content": """**Reorganiser la sidebar**

1. Accedez a **Personnalisation > Organisation des menus**
2. **Visibilite** : Cliquez sur l'oeil pour masquer/afficher un menu
3. **Favoris** : Cliquez sur l'etoile pour marquer un favori
4. **Ordre** : Utilisez les fleches ou le glisser-deposer pour reordonner
5. **Categories** : Creez des groupes pour organiser vos menus

**Creer une categorie :**
- Cliquez sur **"Nouvelle categorie"**
- Donnez un nom et choisissez une icone
- Glissez les menus dans la categorie

**Reinitialiser :**
Cliquez sur **"Reinitialiser"** pour revenir a la configuration par defaut.

**Ajouter les menus manquants :**
Apres une mise a jour, cliquez sur **"Ajouter les menus manquants"** pour integrer les nouveaux modules.""",
        "order": 2,
        "level": "beginner",
        "keywords": ["menus", "sidebar", "organiser", "categories", "favoris"],
    },
    {
        "id": "sec-033-03",
        "chapter_id": "ch-033",
        "title": "Preferences d'affichage",
        "content": """**Configurer les preferences**

- **Page d'accueil** : Choisissez la page qui s'ouvre apres connexion
- **Format de date** : DD/MM/YYYY, MM/DD/YYYY ou YYYY-MM-DD
- **Format d'heure** : 24h ou 12h (AM/PM)
- **Devise** : Euro, Dollar, Livre

**Theme et apparence**
- Basculez entre le theme clair et sombre
- Les preferences sont sauvegardees automatiquement
- Chaque utilisateur a ses propres preferences

**Parametres du Dashboard**
- Personnalisez les widgets affiches sur le tableau de bord
- Configurez les periodes par defaut des graphiques""",
        "order": 3,
        "level": "beginner",
        "keywords": ["preferences", "date", "heure", "devise", "theme", "dashboard"],
    },

    # === AUTORISATIONS PARTICULIERES ===
    {
        "id": "sec-034-01",
        "chapter_id": "ch-034",
        "title": "Presentation des Autorisations Particulieres",
        "content": """**Autorisations Particulieres**

Les autorisations particulieres sont des documents formels requis pour certains travaux specifiques necessitant des precautions de securite renforcees.

**Types d'autorisations :**
- Travaux en hauteur
- Travaux par points chauds (soudure, meulage)
- Travaux en espace confine
- Travaux electriques
- Travaux a proximite de reseaux

**Cycle de vie :**
1. Creation par le demandeur
2. Analyse des risques
3. Validation par le responsable
4. Execution des travaux
5. Cloture et archivage

**Acces :**
Depuis la page Documentations ou via le menu Autorisations Particulieres.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["autorisation", "particuliere", "securite", "travaux", "risques"],
    },
    {
        "id": "sec-034-02",
        "chapter_id": "ch-034",
        "title": "Creer une autorisation particuliere",
        "content": """**Remplir une autorisation**

1. Cliquez sur **"Nouvelle autorisation"**
2. Selectionnez le **type** d'autorisation
3. Remplissez :
   - **Zone de travail** : Emplacement exact
   - **Description** : Nature des travaux
   - **Date et duree** : Periode de validite
   - **Intervenants** : Personnes autorisees
   - **Mesures de securite** : EPI, consignations, etc.
4. Ajoutez l'**analyse des risques**
5. Soumettez pour validation

**Validation :**
Le responsable securite ou le responsable de zone valide l'autorisation avant le debut des travaux.

**Cloture :**
A la fin des travaux, le responsable cloture l'autorisation et confirme la remise en etat.""",
        "order": 2,
        "level": "beginner",
        "keywords": ["creer", "remplir", "validation", "risques", "cloture"],
    },

    # === DEMANDES D'ARRET ===
    {
        "id": "sec-035-01",
        "chapter_id": "ch-035",
        "title": "Presentation des Demandes d'Arret",
        "content": """**Demandes d'Arret Machine**

Le module Demandes d'Arret permet de gerer formellement les demandes d'arret de machine pour maintenance ou intervention.

**Objectifs :**
- Formaliser les demandes d'arret
- Planifier les interventions pendant les arrets
- Coordonner entre Production et Maintenance
- Tracer l'historique des arrets planifies

**Processus :**
1. La Maintenance soumet une demande d'arret
2. La Production analyse l'impact et valide/refuse
3. Si validee, l'arret est planifie
4. Les interventions sont executees pendant l'arret
5. La remise en service est confirmee

**Acces :**
Via les pages Documentations ou par lien direct.""",
        "order": 1,
        "level": "beginner",
        "keywords": ["demande", "arret", "machine", "maintenance", "planifier"],
    },
    {
        "id": "sec-035-02",
        "chapter_id": "ch-035",
        "title": "Creer une demande d'arret",
        "content": """**Soumettre une demande**

1. Accedez aux **Demandes d'arret**
2. Cliquez sur **"Nouvelle demande"**
3. Remplissez :
   - **Machine/Equipement** : Selectionnez l'equipement concerne
   - **Motif** : Raison de la demande d'arret
   - **Date souhaitee** : Date et heure prevues
   - **Duree estimee** : Temps d'arret necessaire
   - **Priorite** : Urgente, Haute, Moyenne, Basse
   - **Travaux prevus** : Liste des interventions a realiser
4. Ajoutez des **pieces jointes** si necessaire
5. Soumettez la demande

**Suivi :**
Suivez l'etat de votre demande : En attente, Validee, Refusee, En cours, Terminee.""",
        "order": 2,
        "level": "beginner",
        "keywords": ["creer", "soumettre", "machine", "motif", "duree"],
    },
    {
        "id": "sec-035-03",
        "chapter_id": "ch-035",
        "title": "Validation et suivi des demandes",
        "content": """**Processus de validation**

Le responsable de production ou le directeur recoit la demande et peut :
- **Valider** : Accepter l'arret aux dates proposees
- **Proposer une alternative** : Suggerer d'autres dates
- **Refuser** : Avec justification obligatoire

**Notifications :**
- Email envoye au demandeur a chaque changement de statut
- Rappels avant la date d'arret planifiee
- Notification de validation/refus en temps reel

**Rapports :**
- Historique complet des demandes
- Statistiques d'arrets par machine
- Temps d'arret cumule par periode
- Taux de validation/refus""",
        "order": 3,
        "level": "advanced",
        "keywords": ["validation", "refus", "notification", "historique", "statistiques"],
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
        
    # Update version
    await db.manual_versions.update_many({"is_current": True}, {"$set": {"is_current": False}})
    await db.manual_versions.insert_one({
        "id": f"migration-{now.strftime('%Y%m%d%H%M%S')}",
        "version": "2.3",
        "release_date": now.isoformat(),
        "changes": [
            "Ajout chapitres: Cameras, Rapports M.E.S., Dashboard Service",
            "Ajout chapitres: Gestion d'equipe, Rapports Hebdo., Tableau d'affichage",
            "Ajout chapitres: Analytics Checklists, Personnalisation",
            "Ajout chapitres: Autorisations Particulieres, Demandes d'Arret"
        ],
        "author_id": "system",
        "author_name": "Migration automatique",
        "is_current": True
    })
    
    print(f"\nMigration terminee: {added_chapters} chapitres, {added_sections} sections ajoutees")
    client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
