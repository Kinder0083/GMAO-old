# GMAO Iris - PRD

## Description
Application GMAO (Gestion de la Maintenance Assistée par Ordinateur) full-stack avec backend Python/FastAPI et frontend React, déployée sur Proxmox VM.

## Architecture
- **Backend**: Python/FastAPI (`/app/backend/server.py` + services)
- **Frontend**: React (`/app/frontend/`)
- **Base de données**: MongoDB
- **Déploiement**: Proxmox VM à `/opt/gmao-iris`, venv Python, nginx, supervisorctl

## Travaux réalisés

### Session précédente
- **Correction miniatures Tapo** (DONE)

### 2026-02-08/09
- **Correction processus de mise à jour** (DONE)
- **Nettoyage du projet** (DONE) : ~110 fichiers supprimés
- **Script d'installation unifié** (DONE) : Renommé `gmao-iris-install.sh`, mis à jour v1.5.0
- **Préparation pour GitHub** (DONE) : .gitignore nettoyé
- **Suppression onglets Caméras** (DONE) : Supprimé "Vignettes" et "Live", gardé "Frigate" et "Alertes"

## Tâches restantes
Aucune tâche en attente.
