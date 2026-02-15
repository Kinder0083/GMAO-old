# GMAO Iris - PRD (Product Requirements Document)

## Enonce du probleme
Application GMAO (Gestion de Maintenance Assistee par Ordinateur) complete pour la gestion des equipements, interventions, maintenance preventive, M.E.S., cameras, documents, etc.

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS (port 3000)
- **Backend:** FastAPI + MongoDB (port 8001)
- **Base de donnees:** MongoDB (gmao_iris)
- **Temps reel:** WebSocket pour chat, consignes, notifications de mise a jour
- **Scheduler:** APScheduler pour taches planifiees (maintenance, rapports, backups)
- **Deploiement:** Proxmox LXC (Debian 12) avec Nginx + Supervisor

## Fonctionnalites implementees

### Export/Import avec fichiers (P0 - TERMINE)
- Export ZIP (data.xlsx + uploads/), import ZIP, export individuel XLSX
- Tests: 11/11 backend + UI (100%)

### Sauvegardes Automatiques (P0 - TERMINE)
- Planification, destinations (local/Google Drive), nettoyage, notifications
- Tests: 24/24 (100%)

### Import/Export 63 modules (P0 - TERMINE)
- Selecteur groupe par 12 categories - Tests: 18/18 (100%)

### Bug fichier corrompu (P0 - CORRIGE)
- Fix extension .xlsx -> .zip - Tests: 8/8 (100%)

### Verification integrite backups (TERMINE)
- testzip() + verification data.xlsx - Tests: 9/9 (100%)

### Broadcast avertissement MAJ (CORRIGE)
- Appel POST /api/updates/broadcast-warning avant MAJ - Tests: 100%

### Refactoring ImportExport.jsx (TERMINE)
- Decoupe en 4 fichiers (ImportExport, ImportExportTab, BackupTab, importExportModules)
- Tests: 8/8 (100%)

### Google Drive Integration (TERMINE)
- Configuration backend .env + OAuth flow fonctionnel

### Configuration serveur Proxmox (TERMINE)
- Nginx SSL, Let's Encrypt, redirection HTTP->HTTPS, WebSocket proxy

### Google Drive OAuth - Bug "Bad Gateway" (CORRIGE - 2026-02-16)
- Le callback `/api/backup/drive/callback` n'avait aucun try/except
- `scopes=None` dans le callback (au lieu de `['drive.file']`)
- Toute erreur (code invalide, URI mismatch, réseau) crashait le backend → 502 Nginx
- Fix : error handling complet, logging, scopes corrigés, redirection avec message d'erreur
- Frontend affiche maintenant le message d'erreur Google Drive via `drive_error` query param

### Script post-installation SSL + Google Drive (TERMINE - 2026-02-16)
- Script interactif `gmao-ssl-gdrive-setup.sh` (579 lignes)
- Fonctionnalites :
  - Collecte interactive (domaine, email Certbot, identifiants Google Drive)
  - Verification DNS du domaine
  - Installation Certbot + generation certificat SSL (nginx + fallback standalone)
  - Configuration Nginx complète (HTTP->HTTPS, proxy, WebSocket)
  - Mise a jour .env backend (URLs HTTPS, Google Drive)
  - Redemarrage services + tests automatiques (API, HTTPS, Google Drive)
  - Cron auto-renouvellement SSL si absent
  - Log de session, firewall UFW
- Validation : bash -n OK, shellcheck (warning level) OK

## Google Drive - Configuration requise
1. Creer un projet sur Google Cloud Console
2. Activer l'API Google Drive
3. Configurer ecran de consentement OAuth
4. Creer identifiants OAuth (Web application)
5. URI de redirection : https://[DOMAIN]/api/backup/drive/callback

## Backlog

### P0
- Aucune tache P0 en attente

### Taches retirees
- ~~Bug import Excel~~ — Confirme resolu
- ~~Animation logo login~~ — Annule

## Collections MongoDB
- backup_schedules, backup_history, backup_status, drive_credentials

## Credentials
- App: admin@test.com / Admin123!
- API Docs: admin / atlas2024

## Scripts de deploiement
- `gmao-iris-install.sh` : Installation complete Proxmox (creation LXC, MongoDB, Node.js, Python, Nginx, build)
- `gmao-ssl-gdrive-setup.sh` : Post-installation SSL + Google Drive (interactif)
