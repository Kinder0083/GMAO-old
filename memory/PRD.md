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

### Panneau Sante du Systeme (Mars 2026)
- Page admin /system-health sous "Parametres Speciaux"
- 4 cartes sante temps reel : Backend API, MongoDB, Disque, Memoire

### Alertes Email (Mars 2026)
- 6 types d'alertes configurables avec seuils et cooldown

### Systeme LOTO (Lockout/Tagout) (Mars 2026)
- Gestion des consignations LOTO avec workflow 4 etapes
- Systeme de cadenas, Points d'isolation, Signatures electroniques
- Integration visuelle dans Header, OT, MP, Ameliorations

### Correction cache navigateur persistant (Mars 2026)
- Middleware anti-cache backend + intercepteur frontend

### QR Code + IA Ameliore (Mars 2026)
- Endpoint `/api/qr/public/equipment/{id}/ai-summary` genere un resume IA complet
- Donnees analysees : Fiche equipement, historique OT, KPI, maintenances preventives, LOTO
- Frontend : Section "Analyse IA" sur la page QR avec loading, KPI chips, texte formate

### Mode Hors-ligne Ameliore (Mars 2026)
- Indicateur visuel "En ligne"/"Hors ligne" dans le header
- Cache IndexedDB automatique des reponses API GET
- File d'attente de synchronisation pour les mutations hors-ligne
- Synchronisation automatique au retour en ligne

### Choix du modele IA pour QR (Mars 2026)
- **3 fournisseurs** : Google Gemini, OpenAI GPT, Anthropic Claude
- **Parametres systeme** : Configurable dans Personnalisation > IA > "Modele IA pour les resumes QR"
- **Endpoints** : GET/PUT `/api/qr/ai-settings` (PUT = admin seulement)
- **Validation** : Provider et modele valides verifies avant sauvegarde
- **Integration** : L'endpoint ai-summary lit le modele configure depuis `system_settings`
- **Fichiers** : `qr_routes.py` (QR_AI_PROVIDERS, endpoints), `AISection.jsx` (UI)

## Fichiers cles
- `backend/server.py` - API endpoints principal
- `backend/qr_routes.py` - Routes QR codes + resume IA + ai-settings
- `backend/ai_chat_routes.py` - Routes chatbot IA + LLM_PROVIDERS
- `frontend/src/pages/QREquipmentPage.jsx` - Page QR avec IA
- `frontend/src/components/Personnalisation/AISection.jsx` - Parametres IA + QR model
- `frontend/src/components/Common/OfflineIndicator.jsx` - Indicateur connexion
- `frontend/src/services/offlineDb.js` - IndexedDB pour cache offline

## Collections MongoDB
- `system_settings` - Parametres systeme (dont qr_ai_settings)
- `loto_procedures` - Consignations LOTO
- `qr_actions_config` - Configuration actions QR
- `user_preferences` - Preferences utilisateur (modele IA chatbot)

## Backlog
- Stabilisation continue selon retours utilisateur
- Ameliorations application mobile native (Expo)
