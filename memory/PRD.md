# FSAO Iris - Product Requirements Document

## Description
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète pour la gestion des opérations de maintenance industrielle. Interface en français.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Notifications**: Web Push (VAPID/pywebpush) + Expo Push Service
- **PWA**: Service Worker, manifest.json, installation mobile
- **IA**: Emergent LLM (Gemini 2.5 Flash) - assistant Adria, analyse QHSE
- **Temps réel**: WebSocket (Chat Live, Whiteboard, notifications, SSH Terminal)
- **QR Codes**: qrcode + Pillow (génération étiquettes)
- **SSH Terminal**: xterm.js + WebSocket + PTY (binaires système)
- **Déploiement production**: Proxmox LXC (Debian 12) + Tailscale Funnel (HTTPS)

## Fonctionnalités implémentées

### Core
- Ordres de travail, Demandes d'intervention/amélioration, Améliorations
- Maintenance préventive, Équipements, Inventaire, Zones, Compteurs
- Plan de surveillance, Presqu'accidents, Chat Live, Whiteboard
- Consignes inter-équipes, Dashboard, Rapports, Permissions par rôle
- Import/Export, Sauvegarde planifiée, Système de mise à jour intégré

### Terminal SSH + Macros (Mars 2026)
- Console interactive via xterm.js + WebSocket + PTY
- Système de macros SSH : CRUD complet, panneau latéral, exécution séquentielle
- Menu contextuel IA désactivé sur la page SSH (clic droit natif)

### Système de résilience (Mars 2026)
- **Page de maintenance HTML** : logo IRIS, barre animée, auto-refresh 30s
- **Health Check automatique** : surveillance toutes les 5 min via cron
- **Récupération 4 niveaux** : SOFT → ROLLBACK → MEDIUM → HARD
- **API Maintenance** : `/api/maintenance/activate`, `/deactivate`, `/status`
- **Intégration mise à jour** : activation auto de la maintenance avant MAJ

### Panneau Santé du Système (Mars 2026)
- **Page admin** `/system-health` accessible uniquement aux administrateurs
- **4 cartes de santé temps réel** : Backend API, MongoDB, Disque, Mémoire
- **État du Health Check** : dernière vérification, échecs, compteur récupérations
- **Actions manuelles** : forcer health check, activer/désactiver maintenance, reset compteur
- **Historique des récupérations** : tableau chronologique avec niveau et résultat
- **Guide des 4 niveaux** de récupération avec code couleur
- **Auto-refresh** toutes les 30 secondes
- Menu sidebar "Santé Système" sous "Paramètres Spéciaux"

### Présentations et Documentation PDF (Mars 2026)
- 3 versions de présentation PDF + PDF README (28 pages)

### Notifications cloche multi-badges (Mars 2026)
- 3 badges (OT, améliorations, préventif échu) + menu déroulant

## Fichiers clés
- `frontend/src/pages/SystemHealth.jsx` - Panneau santé système
- `frontend/src/pages/SSHTerminal.jsx` - Terminal SSH + Macros
- `frontend/src/components/Layout/Sidebar.jsx` - Menu sidebar
- `maintenance.html` - Page de maintenance statique
- `health_recovery.py` - Script récupération 4 niveaux
- `setup_health_check.sh` - Installation cron
- `backend/update_service.py` - MaintenanceMode + UpdateService
- `backend/server.py` - API endpoints

## API Endpoints (nouveaux)
- `GET /api/maintenance/status` - Statut maintenance + health state + historique
- `POST /api/maintenance/activate` - Activer maintenance
- `POST /api/maintenance/deactivate` - Désactiver maintenance
- `POST /api/health/force-check` - Health check immédiat
- `POST /api/health/reset-failures` - Reset compteur échecs
- `GET /api/health/recovery-history` - Historique récupérations
- CRUD `/api/ssh/macros` - Macros SSH

## Backlog
- Stabilisation continue basée sur retours utilisateur
- Améliorations application mobile native (Expo)
