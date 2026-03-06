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

### Systeme LOTO (Lockout/Tagout) (Mars 2026)
- Gestion des consignations LOTO avec workflow 4 etapes
- Signatures electroniques, integration visuelle Header/OT/MP

### QR Code + IA Ameliore (Mars 2026)
- Endpoint `/api/qr/public/equipment/{id}/ai-summary`
- Resume IA genere par LLM (Gemini/OpenAI/Claude configurable)
- Section "Analyse IA" sur la page QR publique

### Choix du modele IA pour QR (Mars 2026)
- 3 fournisseurs : Google Gemini, OpenAI GPT, Anthropic Claude
- Configurable dans Personnalisation > IA (parametre systeme global)
- Endpoints GET/PUT `/api/qr/ai-settings`

### Mode Hors-ligne Ameliore (Mars 2026)
- Indicateur visuel "En ligne"/"Hors ligne" dans le header
- Cache IndexedDB automatique des reponses API GET
- File d'attente de synchronisation pour mutations hors-ligne
- Synchronisation automatique au retour en ligne

### Correction systeme de mise a jour (Mars 2026)
**3 bugs racines corriges :**
1. **version.json conditionnel** : N'est plus mis a jour si le code n'a pas ete synchronise depuis GitHub (`git_available=False` → skip step 5)
2. **Verification post-MAJ** : Nouveau endpoint `/api/updates/last-result` stocke le resultat reel en DB. Le frontend verifie ce resultat apres reconnexion au lieu de supposer succes.
3. **Detection de version robuste** : `check_github_version()` utilise version.json comme fallback quand `.git` est absent/corrompu au lieu de forcer `update_available=True`.
4. **Script de redemarrage intelligent** : Auto-detecte les noms de services (supervisorctl/systemctl) au lieu de deviner des noms fixes. Log dans `/tmp/gmao_restart_*.log`. Dernier recours : kill du processus uvicorn.
5. **Meilleur reporting d'erreurs** : Erreurs reseau ne sont plus silencieusement traitees comme "redemarrage en cours" — le resultat reel est verifie depuis la DB.

## Fichiers cles
- `backend/server.py` - API endpoints principal
- `backend/update_service.py` - Service de mise a jour (step 5 conditionnel, restart intelligent)
- `backend/update_manager.py` - Gestionnaire de version (fallback version.json)
- `backend/qr_routes.py` - Routes QR codes + resume IA + ai-settings
- `frontend/src/pages/Updates.jsx` - Page MAJ avec verification post-update
- `frontend/src/pages/QREquipmentPage.jsx` - Page QR avec IA
- `frontend/src/components/Personnalisation/AISection.jsx` - Parametres IA + QR model
- `frontend/src/components/Common/OfflineIndicator.jsx` - Indicateur connexion
- `frontend/src/services/offlineDb.js` - IndexedDB pour cache offline

## Collections MongoDB
- `system_settings` - Parametres systeme (qr_ai_settings, last_update_result)
- `system_update_history` - Historique detaille des mises a jour
- `loto_procedures` - Consignations LOTO
- `user_preferences` - Preferences utilisateur (modele IA chatbot)

## Backlog
- Stabilisation continue selon retours utilisateur
- Ameliorations application mobile native (Expo)
