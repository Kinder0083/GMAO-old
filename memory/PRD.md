# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket (Chat Live, Whiteboard, SSH Terminal)
- **SSH Terminal**: xterm.js + WebSocket + PTY + Macros
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalites implementees

### Core GMAO
- Ordres de travail, Demandes, Ameliorations, Maintenance preventive
- Equipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Terminal SSH + Macros (Mars 2026)
- Console interactive xterm.js + WebSocket + PTY
- Macros SSH : CRUD complet, execution sequentielle
- Menu contextuel IA desactive sur page SSH

### Systeme de resilience (Mars 2026)
- Page de maintenance HTML avec auto-refresh + bypass admin
- Health Check automatique (cron 5 min)
- Recuperation 4 niveaux : SOFT > ROLLBACK > MEDIUM > HARD
- Confirmation renforcee : taper "MAINTENANCE" pour activer

### Panneau Sante du Systeme (Mars 2026)
- Page admin /system-health sous "Parametres Speciaux"
- 4 cartes sante temps reel : Backend API, MongoDB, Disque, Memoire

### Alertes Email (Mars 2026)
- 6 types d'alertes configurables avec seuils et cooldown

### Systeme LOTO (Lockout/Tagout) - Consignations de securite (Mars 2026)
- Gestion des consignations LOTO avec workflow 4 etapes
- Systeme de cadenas, Points d'isolation, Signatures electroniques
- Integration visuelle dans Header, OT, MP, Ameliorations

### Correction cache navigateur persistant (Mars 2026)
- Middleware anti-cache backend + intercepteur frontend
- SW simplifie pour notifications push uniquement

### Correction PWA/Notifications persistantes (Mars 2026)
- Persistance choix utilisateur dans localStorage

### QR Code + IA Ameliore (Mars 2026)
- **Endpoint IA** : `/api/qr/public/equipment/{id}/ai-summary` genere un resume IA complet
- **Donnees analysees** : Fiche equipement, historique OT (20 derniers), KPI, maintenances preventives, consignations LOTO actives
- **LLM** : Gemini 2.5 Flash via emergentintegrations (cle Emergent)
- **Frontend** : Section "Analyse IA" sur la page QR avec loading, KPI chips, texte formate, bouton Actualiser
- **Public** : Accessible sans authentification via scan QR code
- **Fichiers** : `qr_routes.py` (endpoint), `QREquipmentPage.jsx` (UI)

### Mode Hors-ligne Ameliore (Mars 2026)
- **Indicateur visuel** : Badge "En ligne" (vert) / "Hors ligne" (rouge clignotant) dans le header
- **Cache IndexedDB** : Reponses API GET mises en cache automatiquement (excl. auth/chat/IA)
- **File d'attente** : Mutations POST/PUT/DELETE queued quand hors-ligne, synchronisees au retour
- **Synchronisation auto** : Service `offlineSync.js` ecoute l'evenement 'online' et rejoue les mutations
- **Compteur** : Badge ambre avec nombre de mutations en attente de synchronisation
- **Nettoyage** : Cache automatiquement purge apres 24h
- **Fichiers** : `useOnlineStatus.js`, `offlineDb.js`, `offlineSync.js`, `OfflineIndicator.jsx`, `api.js` (intercepteurs)

## Fichiers cles
- `backend/server.py` - API endpoints principal
- `backend/qr_routes.py` - Routes QR codes + resume IA
- `backend/loto_routes.py` - Routes LOTO
- `frontend/src/pages/QREquipmentPage.jsx` - Page QR avec IA
- `frontend/src/components/Common/OfflineIndicator.jsx` - Indicateur connexion
- `frontend/src/services/offlineDb.js` - IndexedDB pour cache offline
- `frontend/src/services/offlineSync.js` - Synchronisation offline
- `frontend/src/services/api.js` - Axios avec cache offline

## Collections MongoDB
- `health_alerts_config` - Configuration des alertes
- `loto_procedures` - Consignations LOTO
- `qr_actions_config` - Configuration actions QR
- `user_preferences` - Preferences utilisateur (choix modele IA)

## Backlog
- Stabilisation continue selon retours utilisateur
- Ameliorations application mobile native (Expo)
- Choix du modele IA configurable dans les parametres pour les resumes QR
