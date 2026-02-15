# GMAO Iris - PRD (Product Requirements Document)

## Problem Statement
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète avec gestion des équipements, ordres de travail, maintenances préventives, inventaire, sauvegardes automatiques, intégration Google Drive, accès distant via Tailscale Funnel.

## Core Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Scheduler**: APScheduler (AsyncIOScheduler) pour tâches cron
- **Integrations**: Google Drive API (OAuth2), Tailscale Funnel, MQTT

## Key Files
- `backend/backup_routes.py` - Routes backup + scheduler + Google Drive OAuth + upload manuel
- `backend/backup_service.py` - Service d'exécution des backups (ZIP + Excel + uploads)
- `frontend/src/pages/BackupTab.jsx` - Interface sauvegardes automatiques
- `backend/server.py` - Serveur principal FastAPI, scheduler startup
- `backend/timezone_routes.py` - Configuration fuseau horaire

## What's Implemented (Feb 2026)

### Session précédente (complété)
- Google Drive OAuth "Bad Gateway" fix
- Horloge digitale dans le header (Clock.jsx)
- Tailscale Funnel setup script
- README.md complet

### Session actuelle (Feb 15, 2026)
- **P0 FIXED**: Sauvegardes planifiées - Le scheduler APScheduler utilisait UTC au lieu du fuseau horaire configuré (GMT+1). Corrigé dans `_reload_scheduler` qui lit maintenant `timezone_offset` depuis `system_settings` et l'applique aux CronTrigger.
- **P1 DONE**: Bouton d'upload manuel vers Google Drive - Nouvel endpoint `POST /api/backup/drive/upload/{history_id}`, fonction helper `_get_or_create_gdrive_folder` pour créer/trouver le dossier "Backup GMAO", bouton Upload dans l'interface historique (visible seulement quand Drive connecté et fichier pas encore uploadé).
- **P1 DONE**: `_upload_to_gdrive` dans `backup_service.py` utilise maintenant le dossier "Backup GMAO" par défaut.

## Testing
- 11/11 tests backend passent (pytest)
- Frontend vérifié: CRUD planifications, backup manuel, historique, boutons conditionnels
- Test report: `/app/test_reports/iteration_17.json`

## Credentials
- App: admin@test.com / Admin123!
- Google Drive: credentials in backend/.env

## Backlog
- Aucune tâche en attente identifiée
