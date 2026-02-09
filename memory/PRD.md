# GMAO Iris - PRD

## Description
Application GMAO full-stack (Python/FastAPI + React + MongoDB) déployée sur Proxmox VM.

## Architecture
- **Backend**: Python/FastAPI, Supervisor (`gmao-iris-backend`), port 8001
- **Frontend**: React, servi par nginx (fichiers statiques `frontend/build/`)
- **Base de données**: MongoDB
- **Déploiement**: Proxmox VM à `/opt/gmao-iris`, venv dans `backend/venv`

## Travaux réalisés

### 2026-02-08/09
- Correction miniatures Tapo (go2rtc port 1984)
- Correction processus de mise à jour :
  - Restart détaché (script bash avec délai 3s + nginx reload)
  - `version.json` mis à jour dynamiquement (plus de version hardcodée)
  - `update_manager.py` et `update_service.py` lisent la version depuis `version.json`
  - `waitForBackendReady` simplifié (détecte disponibilité, pas version)
  - Backup MongoDB non-bloquant
  - Détection venv élargie (backend/venv + racine/venv)
- Nettoyage projet (~110 fichiers supprimés)
- Script d'installation v1.5.0
- Suppression onglets Caméras "Vignettes"/"Live"
- Correction import Excel "undefined" (mapping feuilles françaises)

## Causes racines du Bad Gateway
1. `supervisorctl restart all` tuait le backend AVANT l'envoi de la réponse HTTP → 502
2. Version hardcodée `"1.5.0"` vs version GitHub `"latest-xxx"` → `waitForBackendReady` bouclait 40x sans match → timeout
3. `nginx -s reload` jamais exécuté après `yarn build` → anciens assets JS servis → erreurs
