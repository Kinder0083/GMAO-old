# GMAO Iris - Product Requirements Document

## Description du Projet
Application de Gestion de Maintenance Assistée par Ordinateur (GMAO) avec tableau de bord temps réel, gestion des ordres de travail, équipements, planning du personnel et chat en direct.

## Stack Technique
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: WebSockets via FastAPI
- **AI Integration**: Google Gemini 2.5 Flash (Emergent LLM Key)
- **Video Surveillance**: RTSP/ONVIF + OpenCV + FFmpeg + **Frigate NVR (WebRTC via go2rtc)**

## Comptes de Test
- **Admin**: buenogy@gmail.com / Admin2024!

## Script d'Installation
- **Version actuelle**: `gmao-iris-v1.1.8-install-auto.sh`
- Compatible Proxmox 9.0 / Debian 12
- Installation automatique de toutes les dépendances (MongoDB, FFmpeg, OpenCV, jsPDF, etc.)

---

## Fonctionnalités Implémentées

### Session du 4 Février 2026

#### ✅ Feature: Intégration Frigate NVR (4 Fév 2026)
**Implémentation complète** de l'intégration avec Frigate NVR pour le streaming vidéo temps réel :

**Backend** (`/app/backend/`) :
- `frigate_service.py` : Service de connexion à Frigate NVR
  - Test de connexion avec version Frigate
  - Récupération des caméras et streams go2rtc
  - Proxy pour snapshots/thumbnails (évite CORS)
  - Génération des URLs WebRTC
- `camera_routes.py` : Nouvelles routes API Frigate
  - `GET/PUT /api/cameras/frigate/settings` : Paramètres Frigate
  - `POST /api/cameras/frigate/test` : Test connexion
  - `GET /api/cameras/frigate/cameras` : Liste caméras
  - `GET /api/cameras/frigate/streams` : Liste streams go2rtc
  - `GET /api/cameras/frigate/snapshot/{camera}` : Proxy snapshot
  - `GET /api/cameras/frigate/thumbnail/{camera}` : Proxy thumbnail
  - `GET /api/cameras/frigate/webrtc-info/{stream}` : Infos WebRTC

**Frontend** (`/app/frontend/src/components/Cameras/`) :
- `FrigateSettingsDialog.jsx` : Dialog de configuration
  - Paramètres connexion (IP, Port API 5000, Port go2rtc 1984)
  - Test de connexion avec affichage version
  - Onglet Streams : Mapping nom affiché → stream go2rtc
- `FrigateWebRTCPlayer.jsx` : Player WebRTC temps réel
  - Connexion directe à go2rtc via WebSocket
  - Latence ultra-basse (<500ms)
  - Contrôles : plein écran, mute, reconnexion
- `FrigateLivePanel.jsx` : Panel live avec 3 slots
  - Sélection des caméras/streams
  - Affichage multi-stream simultané
- `FrigateThumbnailGrid.jsx` : Grille de vignettes
  - Rafraîchissement périodique (30s)
  - Clic pour ouvrir en live
- `CamerasPage.jsx` : Nouvel onglet "Frigate" ajouté

**Paramètres configurables** (non figés dans le code) :
- Adresse IP du serveur Frigate
- Port API Frigate (défaut: 5000)
- Port go2rtc WebRTC (défaut: 1984)
- Mapping des streams (nom affiché → stream go2rtc)

---

### Fonctionnalités Précédentes

#### ✅ P3: Caméras RTSP/ONVIF
- Ajout manuel de caméras RTSP
- Découverte ONVIF (bloquée sur réseau multicast)
- Snapshots avec rafraîchissement périodique
- Système de cache de frames en mémoire (15 FPS)
- Alertes caméras par email

#### ✅ P2: Analytics Checklists
- Dashboard d'analyse des contrôles
- Graphiques de conformité (Recharts)
- Export PDF (jsPDF + html2canvas)

#### ✅ P1-4: Organisation du Menu
- Menu personnalisable par utilisateur
- Sauvegarde des préférences

#### ✅ P1-3: Gestion de l'équipe et Pointage
- Gestion des utilisateurs et rôles
- Pointage horaire

---

## Architecture des Fichiers Caméras

```
/app/backend/
├── camera_routes.py        # Routes API caméras + Frigate
├── camera_service.py       # Service capture RTSP local
├── frigate_service.py      # Service connexion Frigate NVR
└── camera_alert_service.py # Service alertes email

/app/frontend/src/components/Cameras/
├── CamerasPage.jsx         # Page principale + onglet Frigate
├── CameraGrid.jsx          # Grille caméras locales
├── LiveStreamPanel.jsx     # Live RTSP local (polling)
├── FrigateSettingsDialog.jsx   # Config Frigate
├── FrigateWebRTCPlayer.jsx     # Player WebRTC go2rtc
├── FrigateLivePanel.jsx        # Panel 3 slots Frigate
├── FrigateThumbnailGrid.jsx    # Vignettes Frigate
├── CameraAlertsPanel.jsx       # Config alertes
└── AddCameraDialog.jsx         # Ajout caméra
```

---

## Prochaines Tâches (Backlog)

### P2 - Dashboard Plan de Surveillance
- Dashboard dédié à la planification de surveillance

### Améliorations Futures
- Rapports PDF mensuels automatiques
- Affichage événements détection Frigate (personnes, véhicules)
- Détection de mouvement OpenCV
- Pointage NFC

---

## Configuration Frigate Requise

Pour que l'intégration fonctionne, Frigate doit avoir go2rtc configuré :

```yaml
go2rtc:
  streams:
    Camera_hq: rtsp://user:pass@ip:554/stream1
    Camera_lq: rtsp://user:pass@ip:554/stream2
```

Ports à exposer :
- **5000** : API Frigate
- **1984** : go2rtc (WebRTC)
- **8554** : RTSP restream (optionnel)
