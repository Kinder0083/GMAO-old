# FSAO Iris - Product Requirements Document

## Description
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète pour la gestion des opérations de maintenance industrielle. Interface en français.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Notifications**: Web Push (VAPID/pywebpush) + Expo Push Service
- **PWA**: Service Worker, manifest.json, installation mobile
- **IA**: Emergent LLM (Gemini 2.5 Flash) - assistant Adria, analyse QHSE
- **Temps réel**: WebSocket (Chat Live, Whiteboard, notifications)
- **Déploiement production**: Proxmox LXC (Debian 12) + Tailscale Funnel (HTTPS)

## Fonctionnalités implémentées

### Core
- Ordres de travail (CRUD, pièces jointes, galerie lightbox, templates, bons PDF)
- Demandes d'intervention / amélioration
- Améliorations (suivi complet)
- Maintenance préventive (checklists, planification)
- Gestion des équipements, inventaire, zones, compteurs
- Plan de surveillance (contrôles qualité)
- Presqu'accidents (analyse QHSE)
- Chat Live (WebSocket temps réel)
- Tableau d'affichage (Whiteboard)
- Consignes inter-équipes
- Dashboard service, rapports hebdomadaires
- Système de permissions par rôle
- Import/Export données
- Sauvegarde planifiée

### PWA & Mobile (Février 2026)
- Installation sur écran d'accueil (Android/iOS)
- Notifications push navigateur (Web Push VAPID/pywebpush)
- Service Worker avec versionnement de cache
- Interface responsive mobile (sidebar overlay, header adaptatif)

### Deep-linking depuis le header (Février 2026)
- Navigation intelligente depuis les badges de notification
- Hook centralisé `useLocationStateFilter` (7 pages refactorisées)

### Changelog "Quoi de neuf ?" (Mars 2026)
- Badge "NEW" vert sur icône cadeau dans le header
- Panneau latéral (Sheet) avec historique des versions
- **Feedback pouce haut/bas** par entrée avec compteurs et toggle
- Interface admin (Paramètres) pour CRUD + résumé des feedbacks
- API: `/api/releases` (CRUD) + `/api/releases/feedback` + `/api/releases/feedback-summary`
- Collections MongoDB: `releases`, `releases_user_seen`, `releases_feedback`

## Credentials de test
- Admin (Direction): admin@test.com / Admin123!
- Technicien (Maintenance): technicien@test.com / Technicien123!

## Backlog
- Aucune tâche en attente

## Notes techniques
- Environnement production: Proxmox, géré par supervisor
- Après `git pull` frontend: `cd /opt/gmao-iris/frontend && yarn build`
- Le cache du Service Worker est très persistant → vider le cache mobile
- URL production: https://gmao-iris.tail4d419a.ts.net
- Routes `/api/changelog` = mises à jour système (git). `/api/releases` = changelog admin
