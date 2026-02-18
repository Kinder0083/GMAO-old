# GMAO Iris

Application de Gestion de Maintenance Assistee par Ordinateur (GMAO) complete et auto-hebergee.

**Version :** 1.6.0
**Concepteur :** Greg
**Derniere mise a jour :** Fevrier 2026

---

## Presentation

GMAO Iris est une application web full-stack concue pour gerer l'ensemble du cycle de maintenance industrielle : ordres de travail, equipements, maintenance preventive, inventaire, surveillance, M.E.S., cameras, chat en temps reel, et bien plus. Elle integre desormais une couche d'**intelligence artificielle** pour l'analyse automatique des donnees QHSE. Elle se deploie sur un serveur Proxmox LXC en une commande et dispose d'un systeme de mise a jour integre.

---

## Fonctionnalites principales

### Intelligence Artificielle (IA)

GMAO Iris integre des fonctionnalites d'IA generative (Gemini Pro) pour automatiser et enrichir les processus QHSE.

#### IA - Checklists et Maintenance
- **Generation automatique de checklists** : Upload d'un document technique, l'IA genere un template de checklist complet
- **Generation automatique de programmes de maintenance** : Upload d'une documentation constructeur, l'IA genere un plan de maintenance preventive
- **Analyse IA des non-conformites** : Analyse l'historique des executions de checklists pour detecter les patterns recurrents, tendances negatives et equipements a risque
- **Creation d'ordres de travail curatifs en 1 clic** : Depuis les resultats de l'analyse IA, creation automatique d'OT pour les actions correctives suggerees
- **Alertes email automatiques** : Envoi automatique d'emails aux responsables de service quand des patterns critiques sont detectes

#### IA - Presqu'accidents
- **Analyse des causes racines** : Methode 5 Pourquoi + diagramme Ishikawa generes automatiquement par l'IA a partir de la description de l'incident, avec suggestion d'actions preventives et evaluation severite/recurrence
- **Detection d'incidents similaires** : Lors de la creation d'un presqu'accident, l'IA recherche automatiquement les incidents similaires dans l'historique pour capitaliser sur les actions deja entreprises
- **Analyse IA des tendances** : Analyse globale de tous les presqu'accidents pour identifier les patterns recurrents, zones a risque, predictions de risques futurs, avec envoi d'alertes email aux responsables
- **Rapport de synthese QHSE** : Generation automatique d'un rapport structure (resume executif, KPIs, analyse par service, top risques, plan d'action) pret pour presentation en reunion QHSE, avec option d'impression

#### IA - Assistant (Adria)
- Assistant IA conversationnel integre (personnalisable : nom, genre, modele LLM)
- **Memoire de conversation** : Adria se souvient du contexte des echanges precedents
- **Contexte enrichi** : Requetes dynamiques vers les donnees GMAO (OT, equipements, alertes, inventaire) pour des reponses factuelles
- **Creation d'OT par IA** : "Cree un OT urgent pour reparer la pompe P-001" - Adria cree l'OT automatiquement avec titre, description, priorite et categorie
- **Creation de Widgets IA** : "Cree un camembert des OT par priorite" - Adria genere et cree des widgets sur le Dashboard Service
- **Support des formules mathematiques** : "Cree une jauge taux resolution = OT termines / total * 100" - L'IA genere les sources de donnees et les formules ($references, IF, ROUND, SUM, AVG)
- **Automatisations IA** : Configuration de regles automatiques en langage naturel (alertes capteurs, rappels maintenance, escalades, seuils inventaire)
- Historique des conversations IA accessible depuis le module "Historique IA"

#### IA - Tableau de Bord
- **Tableau de bord IA unifie** avec 5 onglets : Tendances, Ordres de Travail, Capteurs, Surveillance, Automatisations
- **Notifications push** : Alertes temps reel quand une automatisation se declenche (capteur, seuil, etc.)
- **Diagnostic IA** : Analyse des causes probables et recommandations pour chaque OT
- **Resume IA** : Synthese automatique des interventions
- **Anomalies capteurs** : Detection predictive par analyse de l'historique des mesures

### Ordres de travail
- Creation, assignation, suivi et historique complet
- Gestion des priorites, statuts et temps (estime vs reel)
- Pieces jointes multiples (photos, videos, documents jusqu'a 25 Mo)
- Filtrage avance par date, periode, statut, priorite
- Templates d'ordres de travail reutilisables
- Bons de travail generables en PDF

### Equipements
- Inventaire complet avec structure hierarchique (parent/enfant)
- Suivi de l'etat operationnel, historique des maintenances
- Gestion des garanties, couts et compteurs (metres)
- Vues en liste et en arborescence

### Maintenance preventive
- Planification recurrente (hebdomadaire, mensuel, trimestriel, annuel)
- Planning visuel (calendrier Gantt)
- Checklists de maintenance, alertes automatiques
- Execution immediate possible

### Inventaire et achats
- Gestion des pieces detachees et alertes de stock bas
- Suivi des fournisseurs et des couts
- Demandes d'achat avec workflow de validation
- Historique des achats avec statistiques par utilisateur et par mois

### Surveillance et securite
- Plan de surveillance avec suivi des controles periodiques (onglets par annee, generation automatique des controles recurrents)
- Rapports de surveillance (3 modes : cartes, tableau, graphiques)
- Gestion des presqu'accidents avec formulaire enrichi (7 sections : identification, description, personnes, evaluation risque, equipement, actions, pieces jointes)
- Champs presqu'accidents : categorie d'incident, equipement lie GMAO, mesures immediates, type lesion potentielle, temoins, conditions, facteurs contributifs
- Integration cameras (snapshots, alertes via Frigate/MQTT)
- Autorisations particulieres (formulaires et suivi)

### M.E.S. (Manufacturing Execution System)
- Suivi de production en temps reel
- Calcul automatique de cadence (par minute, via scheduler)
- Rapports M.E.S. planifies

### Communication et collaboration
- Chat en temps reel (WebSocket)
- Tableau d'affichage collaboratif (Whiteboard, WebSocket)
- Consignes inter-equipes avec acquittement
- Notifications temps reel pour les ordres de travail et equipements

### Rapports et analytics
- Tableaux de bord en temps reel
- Dashboard personnalisable avec widgets custom
- Statistiques detaillees et analyse des couts
- Exports PDF, Excel, CSV (admin)
- Rapports hebdomadaires automatiques par email

### Import / Export et sauvegardes
- Import/export de 63 modules (selecteur par 12 categories)
- Export complet en ZIP (data.xlsx + fichiers uploades)
- Import ZIP pour restauration complete
- Sauvegardes automatiques planifiees (quotidien/hebdo/mensuel)
- Destinations : local, Google Drive, ou les deux
- Nettoyage automatique (retention 1 a 5 backups)
- Verification d'integrite des archives ZIP
- Historique avec telechargement, notifications email
- Icone de statut dans le header (vert = backup recent)

### Gestion des utilisateurs et roles
- 3 roles : Administrateur, Technicien, Visualiseur
- Permissions granulaires par module (view, edit, delete)
- Gestion des equipes, services et responsables hierarchiques
- Planning de disponibilite
- Preferences utilisateur personnalisees

### IoT et capteurs
- Dashboard IoT avec visualisation des capteurs
- Integration MQTT (publication/souscription, logs)
- Collecte automatique de donnees capteurs et compteurs

### Documentation et journal
- Gestion documentaire avec explorateur de fichiers
- Manuel integre avec chapitres
- Journal d'activite complet (audit)

### Systeme de mise a jour
- Detection automatique des nouvelles versions (comparaison commit Git)
- Mise a jour en un clic depuis l'interface admin
- Avertissement broadcast a tous les utilisateurs connectes avant MAJ
- Script post-update automatique (dependances + rebuild frontend)

### Autres
- Demandes d'arret de maintenance avec workflow email
- Demandes d'amelioration avec suivi
- Demandes d'intervention
- Acces SSH distant depuis l'interface (admin)
- Configuration Tailscale depuis l'interface web
- Gestion des fuseaux horaires

### Visite guidee personnalisee par profil
- A la premiere connexion, une visite guidee interactive presente les modules de l'application
- La visite est **automatiquement adaptee au profil** (service) de l'utilisateur connecte :
  - **Maintenance** : Equipements, Ordres de travail, Maintenance preventive, Planning, Inventaire, Demandes d'intervention
  - **Production** : M.E.S., Planning, Ordres de travail, Demandes d'intervention, Compteurs, Presqu'accidents
  - **QHSE** : Presqu'accidents + IA, Rapport Presqu'accidents, Analytics Checklists, Plan de Surveillance, Documentations, Contrats
  - **Logistique / ADV** : Inventaire, Demandes d'achat, Fournisseurs, Equipements, Historique Achat
  - **Direction / Admin** : Dashboard Service, Rapports, Gestion d'equipe, Utilisateurs, Rapport Presqu'accidents, Rapports Hebdomadaires
  - **Generique** (aucun service defini) : Equipements, Ordres de travail, Planning, Presqu'accidents, Rapports
- Les etapes communes (menu, dashboard, notifications, chat, assistant IA) sont presentes pour tous les profils
- Les textes de chaque etape sont adaptes au metier de l'utilisateur
- La visite peut etre relancee a tout moment depuis les parametres

---

## Architecture technique

```
gmao-iris/
├── backend/                    # API FastAPI (Python 3.11+)
│   ├── server.py               # Point d'entree principal (~9000 lignes)
│   ├── models.py               # Modeles Pydantic
│   ├── auth.py                 # Authentification JWT + bcrypt
│   ├── dependencies.py         # Dependances FastAPI (auth guards)
│   ├── *_routes.py             # 35+ modules de routes API
│   ├── ai_maintenance_routes.py # IA : checklists, maintenance, non-conformites
│   ├── ai_presqu_accident_routes.py # IA : causes racines, incidents similaires, tendances, rapport QHSE
│   ├── *_service.py            # 16 services metier
│   ├── websocket_manager.py    # Chat WebSocket
│   ├── realtime_manager.py     # Notifications temps reel
│   ├── whiteboard_manager.py   # Tableau d'affichage WebSocket
│   ├── mqtt_manager.py         # Integration MQTT
│   ├── backup_service.py       # Sauvegardes auto (local + Google Drive)
│   ├── backup_routes.py        # API sauvegardes + OAuth Google Drive
│   ├── import_export_routes.py # Import/export 63 modules
│   ├── update_service.py       # Mises a jour depuis GitHub
│   ├── migrations/             # Scripts de migration DB
│   ├── uploads/                # Fichiers uploades
│   └── .env                    # Configuration (voir ci-dessous)
│
├── frontend/                   # Application React 19
│   ├── src/
│   │   ├── pages/              # 66 pages
│   │   ├── components/         # Composants reutilisables
│   │   │   ├── ui/             # Shadcn/UI
│   │   │   ├── chat/           # Chat temps reel
│   │   │   ├── backup/         # (reserve)
│   │   │   └── import/         # (reserve)
│   │   └── hooks/              # Hooks React personnalises
│   ├── public/                 # Assets statiques
│   ├── nginx.conf              # Config Nginx production
│   └── package.json            # Dependances (React 19, Tailwind, etc.)
│
├── gmao-iris-install.sh        # Script installation Proxmox (complet)
├── gmao-ssl-gdrive-setup.sh    # Script post-install SSL + Google Drive
├── updates/                    # Metadonnees de version
│   └── version.json
├── CHANGELOG.md                # Notes de version
└── README.md                   # Ce fichier
```

### Stack technique

| Couche      | Technologie                                     |
|-------------|--------------------------------------------------|
| Frontend    | React 19, Shadcn/UI, Tailwind CSS, Lucide Icons |
| Backend     | FastAPI (Python 3.11+), Uvicorn                  |
| Base de donnees | MongoDB 7.0+                                |
| Temps reel  | WebSocket (chat, whiteboard, notifications)      |
| Scheduler   | APScheduler (backups, rapports, M.E.S.)          |
| Auth        | JWT + bcrypt                                     |
| Serveur web | Nginx (reverse proxy, SSL, static files)         |
| Process     | Supervisor                                       |
| Deploiement | Proxmox LXC (Debian 12)                         |
| IA          | Emergent LLM (Gemini 2.5 Flash) - assistant, analyse QHSE, generation documents |

---

## Installation

### Installation Proxmox LXC (recommandee)

Le script d'installation cree automatiquement un container LXC Debian 12 avec tout le necessaire.

**Depuis le serveur Proxmox (host) :**

```bash
bash gmao-iris-install.sh
```

Le script interactif vous demandera :
- Token GitHub (acces au depot prive)
- Configuration reseau (IP statique ou DHCP)
- Identifiants administrateur
- Mode d'acces distant (URL manuelle, Tailscale, ou local uniquement)

**Ce qui est installe automatiquement :**
- MongoDB 7.0, Node.js 20, Python 3.11+, Nginx, Supervisor
- Build complet du frontend (yarn)
- Environnement virtuel Python avec toutes les dependances
- Comptes administrateurs, services configures et demarres
- Hooks Git pour mise a jour automatique des dependances

### Post-installation : SSL + Google Drive

Apres l'installation, executez le script de configuration SSL et Google Drive **dans le container LXC** :

```bash
sudo bash gmao-ssl-gdrive-setup.sh
```

Ce script interactif :
1. Demande votre nom de domaine (ex: `gmaoiris.duckdns.org`)
2. Verifie la resolution DNS
3. Installe Certbot et genere un certificat SSL Let's Encrypt
4. Configure Nginx avec HTTPS (redirection HTTP, proxy API, WebSocket)
5. Met a jour le `.env` backend (URLs HTTPS, Google Drive)
6. Configure le renouvellement automatique du certificat
7. Redemarre les services et teste la connexion

### Installation Docker (alternative)

```bash
git clone https://github.com/Kinder0083/GMAO.git
cd GMAO
docker-compose up -d
```

**Acces :**
- Frontend : `http://localhost:3000`
- API : `http://localhost:8001`
- Documentation API : `http://localhost:8001/docs`

---

## Configuration

### Variables d'environnement backend (`backend/.env`)

```env
# Base de donnees
MONGO_URL=mongodb://localhost:27017
DB_NAME=gmao_iris

# Securite
SECRET_KEY=<cle_generee_openssl_rand_hex_32>

# URLs (adapter a votre domaine)
FRONTEND_URL=https://votre-domaine.com
BACKEND_URL=https://votre-domaine.com
APP_URL=https://votre-domaine.com

# SMTP (emails)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=<mot_de_passe_application>
SMTP_SENDER_EMAIL=votre-email@gmail.com
SMTP_FROM_NAME=GMAO Iris
SMTP_USE_TLS=true

# Google Drive (optionnel - pour sauvegardes cloud)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_DRIVE_REDIRECT_URI=https://votre-domaine.com/api/backup/drive/callback

# IA (assistant chat)
EMERGENT_LLM_KEY=sk-emergent-xxxx

# Cameras (optionnel)
CAMERA_ENCRYPTION_KEY=<cle_generee>

# Documentation API
DOCS_USER=admin
DOCS_PASS=<mot_de_passe>
```

### Configuration Google Drive

Pour utiliser Google Drive comme destination de sauvegarde :

**Etape 1 : Creer un projet Google Cloud**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com)
2. Creez un nouveau projet (ou selectionnez un projet existant)
3. Notez le **numero du projet** (visible dans les parametres du projet)

**Etape 2 : Activer l'API Google Drive (OBLIGATOIRE)**
1. Dans le menu lateral, allez dans **APIs & Services > Bibliotheque**
2. Recherchez **"Google Drive API"**
3. Cliquez dessus puis cliquez sur **"Activer"** (Enable)
4. **Attendez 1-2 minutes** pour que l'activation se propage

> **IMPORTANT :** Sans cette etape, vous obtiendrez une erreur `HttpError 403 - accessNotConfigured` lors de l'upload vers Google Drive. Lien direct pour activer : `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=VOTRE_NUMERO_PROJET`

**Etape 3 : Configurer l'ecran de consentement OAuth**
1. Allez dans **APIs & Services > Ecran de consentement OAuth**
2. Choisissez **"Externe"** comme type d'utilisateur
3. Remplissez les champs obligatoires (nom de l'application, email de contact)
4. Dans les **Scopes**, ajoutez : `https://www.googleapis.com/auth/drive.file`
5. Dans **Utilisateurs test**, ajoutez votre adresse email Google
6. Publiez ou gardez en mode test (suffisant pour usage interne)

**Etape 4 : Creer les identifiants OAuth 2.0**
1. Allez dans **APIs & Services > Identifiants**
2. Cliquez sur **"Creer des identifiants" > "ID client OAuth"**
3. Type d'application : **Application Web**
4. Nom : `GMAO Iris` (ou autre)
5. **URI de redirection autorisee** : ajoutez exactement :
   ```
   https://votre-domaine.com/api/backup/drive/callback
   ```
6. Copiez le **Client ID** et le **Client Secret** generes

**Etape 5 : Configurer le backend**
1. Renseignez les variables dans `backend/.env` :
   ```env
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   GOOGLE_DRIVE_REDIRECT_URI=https://votre-domaine.com/api/backup/drive/callback
   ```
2. Redemarrez le backend :
   ```bash
   supervisorctl restart gmao-iris-backend
   ```

**Etape 6 : Connecter depuis l'application**
1. Dans GMAO Iris : **Import/Export > Sauvegardes Automatiques**
2. Cliquez sur **"Connecter Google Drive"**
3. Autorisez l'acces dans la fenetre Google
4. Vous devriez voir le statut **"Connecte"** en vert

**Comportement des sauvegardes Google Drive :**
- Les sauvegardes sont automatiquement stockees dans un dossier **"Backup GMAO"** sur Google Drive
- Le dossier est cree automatiquement s'il n'existe pas
- Vous pouvez egalement uploader manuellement un backup existant vers Google Drive via l'icone d'upload dans l'historique des sauvegardes

### Checklist rapide Google Drive

| Etape | Verification |
|-------|-------------|
| API Google Drive activee | Console Google > APIs & Services > Bibliotheque > Google Drive API > **Activee** |
| Ecran de consentement configure | Console Google > APIs & Services > Ecran de consentement > **Configure** |
| Identifiants OAuth crees | Console Google > APIs & Services > Identifiants > **ID client OAuth present** |
| URI de redirection correcte | L'URI dans Google Cloud = `GOOGLE_DRIVE_REDIRECT_URI` dans `.env` |
| Variables `.env` renseignees | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_REDIRECT_URI` |
| Backend redemarre | `supervisorctl restart gmao-iris-backend` apres modification du `.env` |
| Connexion dans l'app | Import/Export > Sauvegardes Automatiques > **Connecte (vert)** |

---

## Utilisation

### Comptes par defaut (apres installation Proxmox)

1. **Compte administrateur** : defini pendant l'installation
2. **Compte de secours** : `buenogy@gmail.com` / `Admin2024!`

> Changez ou supprimez le compte de secours en production.

### Endpoints API principaux

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Authentification |
| GET | `/api/auth/me` | Profil utilisateur |
| GET | `/api/work-orders` | Ordres de travail |
| GET | `/api/equipments` | Equipements |
| GET | `/api/preventive-maintenance` | Maintenance preventive |
| GET | `/api/inventory` | Inventaire |
| POST | `/api/export/{module}` | Export donnees (admin) |
| POST | `/api/import/{module}` | Import donnees (admin) |
| GET | `/api/backup/schedules` | Planifications de sauvegarde |
| POST | `/api/backup/run` | Sauvegarde manuelle |
| POST | `/api/backup/drive/upload/{id}` | Upload manuel d'un backup vers Google Drive |
| GET | `/api/backup/drive/connect` | Connexion OAuth Google Drive |
| GET | `/api/backup/drive/status` | Statut connexion Google Drive |
| GET | `/api/version` | Version de l'application |
| POST | `/api/updates/broadcast-warning` | Avertissement avant MAJ |
| POST | `/api/ai/checklist/generate-from-doc` | IA : generer checklist depuis document |
| POST | `/api/ai/maintenance/generate-from-doc` | IA : generer plan maintenance depuis document |
| POST | `/api/ai-maintenance/analyze-nonconformities` | IA : analyser non-conformites checklists |
| POST | `/api/ai-maintenance/create-curative-wos` | IA : creer OT curatifs |
| POST | `/api/ai-presqu-accident/analyze-root-causes` | IA : analyse causes racines (5 Pourquoi + Ishikawa) |
| POST | `/api/ai-presqu-accident/find-similar` | IA : detection incidents similaires |
| POST | `/api/ai-presqu-accident/analyze-trends` | IA : analyse tendances presqu'accidents |
| POST | `/api/ai-presqu-accident/generate-report` | IA : rapport synthese QHSE |
| WS | `/ws/chat/` | Chat temps reel |
| WS | `/ws/whiteboard/` | Tableau d'affichage |
| WS | `/api/ws/realtime/{entity}` | Notifications temps reel |

Documentation Swagger complete : `https://votre-domaine.com/docs` (identifiants dans `.env`)

---

## Administration

### Commandes Proxmox

```bash
# Entrer dans le container
pct enter <CTID>

# Statut des services
supervisorctl status
systemctl status mongod
systemctl status nginx

# Logs backend
tail -f /var/log/gmao-iris-backend.err.log
tail -f /var/log/gmao-iris-backend.out.log

# Redemarrer le backend
supervisorctl restart gmao-iris-backend

# Tester et redemarrer Nginx
nginx -t && systemctl reload nginx

# Mise a jour manuelle
cd /opt/gmao-iris && ./update.sh
```

### Sauvegardes

**Via l'interface (recommande) :**
- Import/Export > Sauvegardes Automatiques
- Planifier des backups quotidiens/hebdomadaires/mensuels
- Destinations : local, Google Drive, ou les deux
- Les heures des planifications utilisent le fuseau horaire configure dans Parametres > Fuseau horaire
- Upload manuel vers Google Drive : cliquez sur l'icone d'upload a cote d'un backup dans l'historique
- Les fichiers sont stockes dans le dossier **"Backup GMAO"** sur Google Drive
- Icone disquette dans le header : **vert** = backup recent reussi, **rouge** = echec, **gris** = aucun ou ancien

**Via la ligne de commande :**
```bash
# Backup MongoDB
mongodump --db gmao_iris --out /backup/gmao-$(date +%Y%m%d)

# Snapshot Proxmox (depuis le host)
vzdump <CTID> --mode snapshot --compress zstd
```

### SSL / Certificat

```bash
# Verifier le certificat
certbot certificates

# Renouveler manuellement
certbot renew

# Le renouvellement automatique est configure via cron ou certbot.timer
```

---

## Depannage

### Backend ne demarre pas

```bash
# Verifier les logs
tail -50 /var/log/gmao-iris-backend.err.log

# Verifier MongoDB
systemctl status mongod

# Reinstaller les dependances
cd /opt/gmao-iris/backend
source venv/bin/activate
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
supervisorctl restart gmao-iris-backend
```

### Erreur 502 Bad Gateway

```bash
# Verifier que le backend tourne
supervisorctl status gmao-iris-backend

# Redemarrer
supervisorctl restart gmao-iris-backend
sleep 5
nginx -t && systemctl reload nginx
```

### Impossible de se connecter

```bash
cd /opt/gmao-iris/backend
source venv/bin/activate

# Lister les utilisateurs
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
client = MongoClient(os.environ['MONGO_URL'])
db = client[os.environ.get('DB_NAME', 'gmao_iris')]
for user in db.users.find():
    print(f\"Email: {user['email']}, Role: {user['role']}, Statut: {user.get('statut','?')}\")
"
```

### Google Drive : erreur de connexion

Si le callback OAuth echoue, le message d'erreur s'affiche dans un toast sur la page Import/Export.
Causes frequentes :
- **redirect_uri_mismatch** : L'URI dans Google Cloud Console ne correspond pas a `GOOGLE_DRIVE_REDIRECT_URI` dans le `.env`
- **invalid_grant** : Le code d'autorisation a expire (reessayez)
- **Packages manquants** : Verifiez que `google-auth-oauthlib` est installe (`pip list | grep google`)

### Google Drive : erreur lors de l'upload (403)

Si l'upload vers Google Drive echoue avec une erreur `HttpError 403 - accessNotConfigured` :
1. **L'API Google Drive n'est pas activee** dans votre projet Google Cloud
2. Allez sur : `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=VOTRE_NUMERO_PROJET`
3. Cliquez sur **"Activer"**
4. Attendez **1-2 minutes** puis reessayez
5. Si vous venez d'activer l'API, il peut falloir jusqu'a 5 minutes pour la propagation

### Sauvegardes planifiees ne se declenchent pas

Si les backups planifies ne s'executent pas a l'heure prevue :
1. **Verifiez le fuseau horaire** : Parametres > Fuseau Horaire. Le scheduler utilise ce fuseau pour determiner l'heure de declenchement
2. **Verifiez les logs** : `tail -100 /var/log/gmao-iris-backend.err.log | grep Backup`
3. Vous devriez voir : `[Backup] Fuseau horaire configure: GMT+X` au demarrage
4. **Redemarrez le backend** apres avoir modifie le fuseau horaire : `supervisorctl restart gmao-iris-backend`

---

## Collections MongoDB

| Collection | Description |
|------------|-------------|
| `users` | Utilisateurs et permissions |
| `work_orders` | Ordres de travail |
| `equipments` | Equipements (hierarchie parent/enfant) |
| `preventive_maintenance` | Plans de maintenance preventive |
| `inventory` | Pieces et stock |
| `locations` | Emplacements |
| `vendors` | Fournisseurs |
| `backup_schedules` | Planifications de sauvegarde |
| `backup_history` | Historique des sauvegardes |
| `backup_status` | Statut derniere sauvegarde |
| `drive_credentials` | Tokens OAuth Google Drive |
| `surveillance_plans` | Plans de surveillance |
| `presqu_accidents` | Presqu'accidents (enrichi: categorie, equipement, lesion, facteurs, temoins, conditions) |
| `improvement_requests` | Demandes d'amelioration |
| `purchase_requests` | Demandes d'achat |
| `chat_messages` | Messages de chat |
| `consignes` | Consignes inter-equipes |
| `documentations` | Documents |
| `sensors` | Capteurs IoT |
| `ai_analysis_history` | Historique des analyses IA (causes racines, tendances, rapports) |
| `notifications` | Notifications in-app (inclut alertes IA critiques) |
| ... | Et 40+ autres collections |

---

## Developpement

### Frontend

```bash
cd frontend
yarn install
yarn start     # Serveur dev sur http://localhost:3000
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

---

## Licence

Ce projet est sous licence Proprietaire.

## Support

- Documentation API : `/docs` (Swagger) ou `/redoc`
- Logs : `/var/log/gmao-iris-backend.err.log`
- Issues : GitHub

---

**Developpe par Greg**
**Version 1.6.0 - Fevrier 2026**
