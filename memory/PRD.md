# GMAO IRIS - PRD (Product Requirements Document)

## Original Problem Statement
Application de Gestion de Maintenance Assistée par Ordinateur (GMAO) avec intégration de caméras IP via Frigate NVR.

### User Persona
- **Grèg** - Concepteur et utilisateur principal
- **Équipe maintenance** - Techniciens et visualiseurs

### Core Requirements
1. Gestion des ordres de travail
2. Gestion des équipements et actifs
3. Gestion des équipes et utilisateurs
4. Intégration caméras IP via Frigate NVR
5. Alertes et notifications
6. Rapports et analytics

---

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Point d'entrée principal
- `/app/backend/frigate_routes.py` - Routes API Frigate
- `/app/backend/frigate_service.py` - Service connexion Frigate
- `/app/backend/camera_routes.py` - Routes caméras legacy

### Frontend (React)
- `/app/frontend/src/pages/CamerasPage.jsx` - Page principale caméras
- `/app/frontend/src/components/Cameras/FrigateSettingsDialog.jsx` - Configuration Frigate
- `/app/frontend/src/components/Cameras/FrigateLivePanel.jsx` - Panel live streaming
- `/app/frontend/src/components/Cameras/FrigateStreamPlayer.jsx` - Player MJPEG
- `/app/frontend/src/components/Cameras/FrigateThumbnailGrid.jsx` - Grille vignettes

---

## What's Been Implemented

### Phase 1 - Core GMAO ✅
- Authentification JWT
- Gestion utilisateurs et rôles
- Ordres de travail CRUD
- Gestion équipements
- Dashboard principal

### Phase 2 - Team Management ✅
- Gestion des équipes
- Organisation des menus
- Permissions par module

### Phase 3 - Camera Integration 
#### P3.1 - Custom RTSP (Abandonné)
- Implémentation initiale avec polling RTSP
- Problèmes de performance avec multiple caméras
- Remplacé par intégration Frigate

#### P3.2 - Frigate NVR Integration ✅ (2024-02-05)
- **Connexion Frigate:** Authentification JWT, HTTPS support
- **Settings Panel:** Configuration host/port/credentials
- **API Endpoints:**
  - `GET /api/cameras/frigate/settings` - Récupérer config
  - `PUT /api/cameras/frigate/settings` - Sauvegarder config
  - `POST /api/cameras/frigate/test` - Tester connexion
  - `GET /api/cameras/frigate/cameras` - Liste caméras
  - `GET /api/cameras/frigate/streams` - Liste streams go2rtc
  - `GET /api/cameras/frigate/thumbnail/{camera}` - Vignette
  - `GET /api/cameras/frigate/snapshot/{camera}` - Snapshot
  - `GET /api/cameras/frigate/stream/{camera}` - **Stream MJPEG (NOUVEAU)**

---

## Prioritized Backlog

### P0 - Critical (Current)
- [x] Endpoint streaming MJPEG manquant - DONE (2024-02-05)

### P1 - High Priority
- [ ] Tester thumbnails et live sur Frigate réel

### P2 - Medium Priority
- [ ] Dashboard Plan de Surveillance
- [ ] Intégration événements détection Frigate

### P3 - Nice to Have
- [ ] Rapports PDF mensuels automatiques
- [ ] NFC time tracking

---

## Known Issues & Workarounds

### WebSocket Real-time Updates
- **Status:** BLOCKED (infrastructure externe)
- **Workaround:** Polling périodique

### ONVIF Discovery
- **Status:** BLOCKED (réseau utilisateur)
- **Workaround:** Ajout manuel des caméras / Frigate

---

## Deployment Notes

### Proxmox Server
```bash
cd /opt/gmao-iris/backend
source venv/bin/activate
pip install -r requirements.txt

cd /opt/gmao-iris/frontend
yarn build

sudo supervisorctl restart backend frontend
```

### Environment Variables
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name (gmao_iris)
- `SECRET_KEY` - JWT secret
- `REACT_APP_BACKEND_URL` - API URL for frontend
