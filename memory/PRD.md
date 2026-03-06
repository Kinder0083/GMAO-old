# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket + realtime_manager
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalites implementees

### Core GMAO
- Ordres de travail, Demandes, Ameliorations, Maintenance preventive
- Equipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Systeme LOTO (Mars 2026)
- Workflow 4 etapes, signatures electroniques
- Icone cadenas sans texte + menu deroulant avec navigation filtree
- WebSocket via realtime_manager pour mise a jour temps reel

### QR Code + IA (Mars 2026)
- Resume IA par equipement via scan QR public
- Modele IA configurable (Gemini/OpenAI/Claude) dans Personnalisation > IA

### Mode Hors-ligne (Mars 2026)
- Indicateur En ligne/Hors ligne a cote de l'horloge
- Cache IndexedDB + file de synchronisation mutations

### Correction systeme de mise a jour (Mars 2026)
- version.json conditionnel, endpoint last-result, script restart intelligent

### Organisation du Header (Mars 2026)
- **Nouvel onglet** "Organisation du Header" dans Personnalisation (8 onglets total)
- **19 icones configurables** : Manuel, Adria, Aide, Horloge, Statut en ligne, Sauvegarde, Cameras, M.E.S., Chat Live, Echeances, Mise a jour, Surveillance, Inventaire, MQTT, LOTO, Notifications, Quoi de neuf, Cloche, Profil
- **Reorganisation** : Fleches haut/bas + drag-and-drop
- **Persistance par utilisateur** : Stocke dans `user_preferences.header_icon_order`
- **Header dynamique** : `renderIcon()` + `iconOrder` depuis preferences, zones gauche/droite respectees
- **Profil toujours en dernier** : Exclu de la reorganisation
- **Reinitialisation** : Bouton pour remettre l'ordre par defaut
- **Fichiers** : `HeaderOrganizationSection.jsx`, `Header.jsx` (refactored), `Personnalisation.jsx`, `models.py`

## Fichiers cles
- `frontend/src/components/Layout/Header.jsx` - Header dynamique avec renderIcon()
- `frontend/src/components/Personnalisation/HeaderOrganizationSection.jsx` - Config header (HEADER_ICONS_REGISTRY)
- `frontend/src/pages/Personnalisation.jsx` - 8 onglets dont Organisation du Header
- `frontend/src/components/Common/LOTOHeaderIcon.jsx` - Cadenas + menu + WebSocket
- `frontend/src/components/Common/OfflineIndicator.jsx` - Statut connexion
- `backend/models.py` - header_icon_order dans UserPreferences*
- `backend/server.py` - default_prefs avec header_icon_order
- `backend/loto_routes.py` - LOTO CRUD + emit WebSocket
- `backend/update_service.py` - MAJ robuste

## Backlog
- Stabilisation continue selon retours utilisateur
- Ameliorations application mobile native (Expo)
