# FSAO Iris - GMAO (Gestion de Maintenance Assistée par Ordinateur)

## Description
Application de GMAO complète incluant gestion des ordres de travail, maintenance préventive, améliorations, consignations LOTO, inventaire, équipements, zones, dashboard, journal d'audit, chat, système de mise à jour, import/export, sauvegardes, et plus.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT
- **Temps réel**: WebSockets
- **LLM**: LiteLLM proxy

## Fonctionnalités implémentées

### LOTO (Consignation) - Complet
- CRUD procédures LOTO
- Workflow: DEMANDE → CONSIGNE → INTERVENTION → DECONSIGNE
- Cadenas multiples (plusieurs utilisateurs)
- Journalisation audit
- Suppression admin
- Icônes temps réel via WebSockets (OT, Améliorations, MP)
- Remplissage automatique depuis OT
- Filtres avancés (période, équipement)

### Système de mise à jour - Corrigé (7 mars 2026)
- **Approche**: Script bash autonome exécuté via `nohup` en arrière-plan
- **Endpoint**: `POST /api/updates/apply` → HTTP 202 immédiat
- **Script**: Backup MongoDB, git init/fetch/reset, pip install, yarn build, restart services
- **Résultats**: Fichier JSON `/tmp/gmao_update_result_*.json` lu au redémarrage par `check_and_save_update_result()`
- **Frontend**: Timeout 30s, polling post-redémarrage

### Documentation
- README.md à jour
- Manuel utilisateur avec chapitres LOTO
- Import/export incluant LOTO
- Sauvegarde automatique incluant LOTO

## Fichiers clés
- `backend/update_service.py`: Service de mise à jour (script bash autonome)
- `backend/server.py`: Endpoints API + startup events
- `backend/loto_routes.py`: Routes LOTO
- `frontend/src/pages/Updates.jsx`: Page mise à jour
- `frontend/src/pages/ConsignationsLOTO.jsx`: Page LOTO
- `frontend/src/components/Common/UpdateNotificationBadge.jsx`: Badge notification MAJ
- `frontend/src/hooks/useLotoRealtime.js`: Hook WebSocket LOTO

## Backlog
- P2: Notifications push mobile (Expo) - dépriorisé
- P3: Validation utilisateur sur environnement Proxmox

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
