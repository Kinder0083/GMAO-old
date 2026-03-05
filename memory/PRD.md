# FSAO Iris - Product Requirements Document

## Description
Application GMAO complète pour la gestion de maintenance industrielle. Interface en français. Déployée sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps réel**: WebSocket (Chat Live, Whiteboard, SSH Terminal)
- **SSH Terminal**: xterm.js + WebSocket + PTY + Macros
- **Déploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalités implémentées

### Core GMAO
- Ordres de travail, Demandes, Améliorations, Maintenance préventive
- Équipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Terminal SSH + Macros (Mars 2026)
- Console interactive xterm.js + WebSocket + PTY
- Macros SSH : CRUD complet, exécution séquentielle
- Menu contextuel IA désactivé sur page SSH

### Système de résilience (Mars 2026)
- **Page de maintenance HTML** avec auto-refresh + bypass admin (logo 5x ou lien "Administrateur?")
- **Health Check automatique** (cron 5 min)
- **Récupération 4 niveaux** : SOFT → ROLLBACK → MEDIUM → HARD
- **Confirmation renforcée** : taper "MAINTENANCE" pour activer
- **API** : `/api/maintenance/activate`, `/deactivate`, `/status`

### Panneau Santé du Système (Mars 2026)
- Page admin `/system-health` sous "Paramètres Spéciaux" dans la sidebar
- 4 cartes santé temps réel : Backend API, MongoDB, Disque, Mémoire
- État du Health Check + actions manuelles + historique récupérations

### Alertes Email (Mars 2026)
- **6 types d'alertes** : Application en panne, Récupération réussie/échouée, Disque plein, Mémoire critique, Maintenance changée
- **Seuils configurables** : Disque (%), Mémoire (%), Échecs consécutifs
- **Fréquence** : 1 envoi max par type par 24h (cooldown)
- **Destinataires multiples** avec ajout/suppression
- **Bouton test** pour vérifier la configuration
- **Intégration SMTP existant** de "Paramètres Spéciaux"
- **API** : GET/PUT `/api/health/alerts-config`, POST `/api/health/alerts-test`, GET `/api/health/alerts-history`

### Documentation PDF (Mars 2026)
- 3 présentations PDF + PDF README (28 pages)

## Fichiers clés
- `frontend/src/pages/SystemHealth.jsx` - Panneau santé + alertes
- `backend/health_alert_service.py` - Service d'envoi d'alertes email
- `backend/server.py` - API endpoints
- `health_recovery.py` - Script 4 niveaux + envoi alertes
- `maintenance.html` - Page maintenance + bypass admin
- `setup_health_check.sh` - Installation cron

## Collections MongoDB
- `health_alerts_config` - Configuration des alertes (enabled, recipients, alerts, cooldown)
- `ssh_macros` - Macros SSH

## Backlog
- Stabilisation continue selon retours utilisateur
- Améliorations application mobile native (Expo)
