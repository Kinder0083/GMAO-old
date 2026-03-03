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
- Viewport optimisé iOS (viewport-fit=cover)

### Deep-linking depuis le header (Février 2026)
- Navigation intelligente depuis les badges de notification
- Filtres pré-appliqués (OT en attente, échéances dépassées, alertes stock, contrôles en retard)
- Hook centralisé `useLocationStateFilter` (7 pages refactorisées)

### Galerie de pièces jointes (Février 2026)
- Lightbox plein écran (images, PDF, vidéos, texte)
- Navigation clavier
- Miniatures cliquables

### Changelog "Quoi de neuf ?" (Mars 2026)
- Badge "NEW" vert sur l'icône cadeau dans le header quand de nouvelles versions sont disponibles
- Panneau latéral (Sheet) affichant l'historique des versions avec badges par catégorie (Nouveau, Amélioration, Correction)
- Le badge disparaît après consultation (mark-read)
- Interface admin dans Paramètres pour créer/modifier/supprimer des versions
- Contenu par défaut pré-rempli (3 versions : 1.7.0, 1.6.0, 1.5.0)
- API: `/api/releases` (GET, POST, PUT, DELETE) + `/api/releases/mark-read`
- Collections MongoDB: `releases`, `releases_user_seen`

## Credentials de test
- Admin (Direction): admin@test.com / Admin123!
- Technicien (Maintenance): technicien@test.com / Technicien123!

## Backlog
- Aucune tâche en attente

## Notes techniques
- L'environnement de production est sur Proxmox, géré par supervisor
- Après chaque `git pull` avec changements frontend: `cd /opt/gmao-iris/frontend && yarn build`
- Le cache du Service Worker est très persistant → rappeler de vider le cache mobile
- URL production: https://gmao-iris.tail4d419a.ts.net (Tailscale Funnel)
- Les routes `/api/changelog` existantes sont pour les mises à jour système (git). Le nouveau changelog admin utilise `/api/releases`
