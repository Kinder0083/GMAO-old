# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket + realtime_manager + polling fallback
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Systeme de mise a jour (reecrit Mars 2026)
- **Script bash autonome** : apply_update() genere un script bash identique aux commandes SSH
- Le script est lance en arriere-plan (Popen detache) et le processus Python n'est pas implique
- Etapes du script : maintenance ON -> backup .env -> git reset --hard -> pip install via venv -> yarn build -> save result DB -> restart services -> maintenance OFF
- Frontend poll /api/updates/last-result avec champ `in_progress` pour suivre l'etat
- waitForBackendReady attend que le backend redemarre ET que in_progress=false

## Fonctionnalites LOTO
- Workflow 4 etapes, cadenas multiples, signatures, journalisation audit
- Suppression admin, icones cliquables temps reel, filtres avances
- Inclus dans Import/Export et sauvegardes automatiques
- Chapitre LOTO dans le manuel (ch-038)

## Fichiers cles mise a jour
- `backend/update_service.py` - apply_update() genere update.sh
- `backend/update_manager.py` - Detection version GitHub (commit + version.json)
- `backend/server.py` - /api/updates/last-result retourne in_progress
- `frontend/src/pages/Updates.jsx` - waitForBackendReady poll in_progress

## Problemes connus
- WebSocket /api/ws/loto renvoie 403 (non bloquant)
