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

### PWA & Mobile (Février 2026)
- Installation PWA (Android/iOS), Notifications push (VAPID)
- Interface responsive, Sidebar overlay mobile

### Terminal SSH + Macros (Mars 2026)
- Console interactive via xterm.js + WebSocket + PTY
- Connexion locale (login -f) et distante (ssh binaire)
- Système de macros SSH : CRUD complet, panneau latéral, exécution séquentielle
- Menu contextuel IA désactivé sur la page SSH (clic droit natif)

### Système de résilience (Mars 2026)
- **Page de maintenance HTML** : affichée pendant les mises à jour (logo IRIS, barre animée, auto-refresh 30s, détection auto du retour de l'app)
- **Health Check automatique** : surveillance toutes les 5 min via cron
- **Récupération 4 niveaux** :
  - Niveau 1 SOFT : Restart des services
  - Niveau 2 ROLLBACK : Retour au commit Git précédent
  - Niveau 3 MEDIUM : Réinstallation des dépendances
  - Niveau 4 HARD : Reset Git complet depuis GitHub
- **API Maintenance** : `/api/maintenance/activate`, `/deactivate`, `/status`
- **Intégration mise à jour** : activation auto de la maintenance avant MAJ, désactivation après

### Présentations et Documentation PDF (Mars 2026)
- 3 versions de présentation PDF (courte, moyenne, complète)
- PDF README Documentation (28 pages) avec captures d'écran

### Notifications cloche multi-badges (Mars 2026)
- 3 badges (OT en attente, améliorations, préventif échu)
- Menu déroulant avec navigation directe

## Fichiers clés (résilience)
- `maintenance.html` - Page de maintenance HTML statique
- `health_recovery.py` - Script health check + récupération 4 niveaux
- `setup_health_check.sh` - Installation cron de surveillance
- `backend/update_service.py` - MaintenanceMode + UpdateService intégré
- `backend/server.py` - API endpoints maintenance

## Backlog
- Stabilisation continue basée sur les retours utilisateur
- Améliorations de l'application mobile native (Expo)
