# FSAO Iris - GMAO (Gestion de Maintenance Assistée par Ordinateur)

## Description
Application de GMAO complète incluant gestion des ordres de travail, maintenance préventive, améliorations, consignations LOTO, inventaire par service, équipements, zones, dashboard, journal d'audit, chat, système de mise à jour, import/export, sauvegardes, QR codes articles et équipements.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT
- **Temps réel**: WebSockets
- **Notifications**: Web Push (pywebpush + VAPID)
- **LLM**: LiteLLM proxy

## Fonctionnalités implémentées

### Notifications push pour signalement de besoin QR (7 mars 2026)
- Si l'article appartient à un service avec un responsable → notification push au responsable
- Sinon (Non classé ou pas de responsable) → notification push à tous les admins
- Utilise le système Web Push existant (pywebpush + VAPID)

### WebSocket temps réel pour inventaire QR (7 mars 2026)
- Broadcast automatique après mouvement de stock
- Toast de notification en temps réel

### Signalement de besoin → Demande d'Achat (7 mars 2026)
- Crée automatiquement une Demande d'Achat (DA-YYYY-XXXXX)

### PWA installation corrigée (7 mars 2026)
- Icônes carrées 192x192 et 512x512

### Système de mise à jour - v3 (7 mars 2026)
- Logs dans `/var/log/gmao-iris-update.log` (hors git)
- Résultat dans `/var/log/gmao-iris-update-result.json`
- `rm -rf node_modules` avant yarn install (fix erreur @babel/runtime)
- `reboot` avec fallback sudo
- Script bash reproduit les commandes SSH exactes

### Inventaire par service, QR Codes, LOTO
- Voir changelog précédent

## IMPORTANT - Déploiement
L'utilisateur doit d'abord déployer manuellement via SSH pour obtenir le nouveau code, car l'ancien script de mise à jour (format [1/6], [2/6]...) est encore déployé sur le serveur Proxmox.

## Backlog
- P0: EN ATTENTE VALIDATION - Système de mise à jour (déployer manuellement d'abord)
- P1: Scanner QR intégré dans l'inventaire
- P2: Cadenas multiples LOTO
- P3: Notifications push mobile (Expo)

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
