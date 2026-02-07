# GMAO IRIS - Product Requirements Document

## Application Overview
GMAO IRIS est une application de Gestion de Maintenance Assistée par Ordinateur (GMAO) complète avec:
- Gestion des équipements, ordres de travail, maintenance préventive
- Intégration Frigate NVR pour la surveillance par caméras
- Chat temps réel, MQTT, tableaux blancs collaboratifs
- Rapports automatisés, gestion d'équipes, etc.

## Tech Stack
- **Backend:** FastAPI (Python), MongoDB, APScheduler
- **Frontend:** React.js, TailwindCSS
- **Infrastructure:** Supervisor, Nginx
- **Intégrations:** Frigate NVR, MQTT

## Current Version
- Version: 1.5.0 "Rapport de Surveillance Avancé"
- Release Date: 2025-01-18

---

## Completed Work (Feb 7, 2026)

### Frigate NVR Integration
- ✅ Proxy backend pour WebRTC/MJPEG (évite l'exposition des ports internes)
- ✅ Authentification JWT avec Frigate
- ✅ Composants frontend: `FrigateStreamPlayer`, `FrigateLivePanel`, `FrigateSettingsDialog`

### Installation & Updates
- ✅ Correction bug `cryptography` dans `install.sh` (remplacé par `openssl`)
- ✅ Fallbacks `REACT_APP_BACKEND_URL` ajoutés dans les composants frontend
- ✅ Script mise à jour manuelle fourni à l'utilisateur
- ✅ Script diagnostic `/app/backend/diagnose_backend.py` créé

---

## Pending Issues

### P0 - Critique
- **Backend crash sur Proxmox** - Le service `gmao-iris-backend` reste `STOPPED` sur l'installation Proxmox de l'utilisateur
  - Root cause: Spécifique à l'environnement Proxmox (fonctionne sur Emergent preview)
  - Next: L'utilisateur doit exécuter `diagnose_backend.py` pour identifier la cause exacte

### P2 - Validation Utilisateur
1. Script de mise à jour manuelle - En attente de test par l'utilisateur
2. Fix script d'installation (`install.sh`) - En attente de validation

---

## Key Files
- `/app/backend/server.py` - Point d'entrée backend FastAPI
- `/app/backend/frigate_routes.py` - API Frigate
- `/app/backend/frigate_service.py` - Service connexion Frigate
- `/app/backend/diagnose_backend.py` - Script diagnostic
- `/app/frontend/src/components/cameras/` - Composants caméras frontend
- `/app/install.sh` - Script installation Proxmox

---

## API Endpoints Clés
- `GET /api/version` - Version de l'application
- `POST /api/cameras/frigate/test` - Test connexion Frigate
- `GET /api/cameras/frigate/settings` - Paramètres Frigate
- `GET /api/cameras/frigate/proxy/mjpeg/{camera}` - Proxy stream MJPEG
