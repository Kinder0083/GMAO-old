# GMAO-IRIS - PRD

## Problème Original
Intégration de flux vidéo en direct depuis des caméras Frigate dans l'application GMAO-IRIS. Objectif : streaming à faible latence via WebRTC avec fallbacks robustes.

## Architecture
```
/app
├── backend/         # Django/FastAPI backend
│   ├── frigate_routes.py      # Routes API Frigate (thumbnails, frames, settings)
│   ├── frigate_service.py     # Service connexion Frigate (auth, thumbnails, streams)
│   └── server.py              # Serveur principal
└── frontend/
    └── src/components/Cameras/
        ├── FrigateLivePanel.jsx       # Panel sélection caméras + vue live
        ├── FrigateStreamPlayer.jsx    # Lecteur stream (iframe go2rtc)
        └── FrigateThumbnailGrid.jsx   # Grille miniatures caméras
```

## Infrastructure Utilisateur
- GMAO: 192.168.1.126
- Frigate/go2rtc: 192.168.1.120 (API port 5000, go2rtc port 1984)
- Caméras: Ouest (.60), Salon (.61), Sud (.62), Tapo (.77)
- Streams go2rtc: Ouest_hq/lq, Salon_hq/lq, Sud_hq/lq, Tapo, Tapo_mjpeg

## Ce qui a été implémenté

### Session précédente
- Live streaming via iframe go2rtc (stream.html) - FONCTIONNEL
- Fix bug sélection caméra (key prop React) - FONCTIONNEL
- Abandon du player WebRTC custom (ICE failures réseau)

### Session actuelle (8 février 2026)
- **Fix thumbnail Tapo** : Ajout fallback go2rtc direct (port 1984) pour les caméras dont le snapshot Frigate et le proxy go2rtc ne fonctionnent pas
  - `frigate_service.py`: 3 stratégies de thumbnail (proxy Frigate → go2rtc direct → snapshot Frigate)
  - `frigate_routes.py`: paramètre `stream` optionnel, ports par défaut corrigés (1984 au lieu de 8555)
  - `FrigateThumbnailGrid.jsx`: regex inclut `_h264/_H264`, envoie `streamName` comme paramètre

## Backlog
- P2: Transcodage H.265 automatique dans go2rtc.yaml
