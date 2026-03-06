# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket + realtime_manager (rooms par entite)
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalites implementees

### Core GMAO
- Ordres de travail, Demandes, Ameliorations, Maintenance preventive
- Equipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Systeme LOTO (Lockout/Tagout) (Mars 2026)
- Gestion des consignations LOTO avec workflow 4 etapes
- Signatures electroniques, integration visuelle Header/OT/MP
- Icone cadenas dans le header avec badges par statut (rouge=actif, jaune=demande, vert=deconsigne)
- Menu deroulant avec navigation filtree (ACTIVE=CONSIGNE+INTERVENTION, DEMANDE, DECONSIGNE)
- Emission WebSocket (realtime_manager) apres chaque operation CRUD/workflow
- Polling fallback 60s pour la mise a jour des compteurs

### QR Code + IA Ameliore (Mars 2026)
- Endpoint `/api/qr/public/equipment/{id}/ai-summary`
- Resume IA genere par LLM configurable (Gemini/OpenAI/Claude)
- Section "Analyse IA" sur la page QR publique

### Choix du modele IA pour QR (Mars 2026)
- 3 fournisseurs : Google Gemini, OpenAI GPT, Anthropic Claude
- Configurable dans Personnalisation > IA (parametre systeme global)

### Mode Hors-ligne Ameliore (Mars 2026)
- Indicateur "En ligne"/"Hors ligne" positionne a cote de l'horloge
- Cache IndexedDB automatique des reponses API GET
- File d'attente de synchronisation pour mutations hors-ligne

### Correction systeme de mise a jour (Mars 2026)
- version.json conditionnel (non modifie si git echoue)
- Endpoint /api/updates/last-result pour verification post-MAJ
- Script de redemarrage avec auto-detection des services
- Detection de version robuste (fallback version.json)

## Fichiers cles
- `backend/server.py` - API endpoints principal
- `backend/loto_routes.py` - Routes LOTO + WebSocket emit
- `backend/update_service.py` - Service MAJ robuste
- `backend/qr_routes.py` - Routes QR + resume IA + ai-settings
- `frontend/src/components/Layout/Header.jsx` - Header (OfflineIndicator + horloge)
- `frontend/src/components/Common/LOTOHeaderIcon.jsx` - Cadenas + menu
- `frontend/src/pages/ConsignationsLOTO.jsx` - Page LOTO avec filtre ACTIVE
- `frontend/src/pages/QREquipmentPage.jsx` - Page QR publique + IA
- `frontend/src/components/Personnalisation/AISection.jsx` - Parametres IA
- `frontend/src/services/offlineDb.js` - IndexedDB
- `frontend/src/hooks/useOnlineStatus.js` - Hook statut reseau

## Backlog
- Stabilisation continue selon retours utilisateur
- Ameliorations application mobile native (Expo)
