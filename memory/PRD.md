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
- **QR Codes**: qrcode + Pillow (génération étiquettes)
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

### Deep-linking (Février 2026)
- Navigation intelligente depuis les badges du header
- Hook centralisé `useLocationStateFilter`

### Changelog "Quoi de neuf ?" (Mars 2026)
- Badge "NEW" + panneau latéral + feedback pouce haut/bas
- Interface admin CRUD + résumé feedbacks
- API: `/api/releases`

### QR Codes Équipements (Mars 2026)
- **Page publique** `/qr/{equipmentId}` (sans auth pour lecture)
  - Fiche équipement (nom, statut, emplacement, photo)
  - 6 actions rapides avec panneaux inline expandables
  - Dernier OT, Historique OT, KPI, Demande d'intervention, Signaler panne, Plan préventif
  - Actions lecture = sans auth, Actions écriture = auth requise
- **Boutons QR** sur la fiche équipement
  - "Aperçu QR" : ouvre la page publique
  - "Étiquette QR" : télécharge PNG (QR code + nom équipement) prêt à imprimer
- **Admin actions QR** dans Paramètres
  - Ajouter/modifier/supprimer des actions
  - Activer/désactiver par toggle
  - Type link/action, icône, flag auth requise
- API: `/api/qr/public/*` (public), `/api/qr/*` (auth), `/api/qr/actions` (admin)
- Collections MongoDB: `qr_actions_config`

## Credentials de test
- Admin (Direction): admin@test.com / Admin123!
- Technicien (Maintenance): technicien@test.com / Technicien123!

### Version dynamique (Mars 2026)
- Endpoint `/api/version` retourne dynamiquement la dernière version depuis la collection `releases`
- Page de login affiche la version en temps réel (plus de valeur codée en dur)
- Fallback gracieux : version masquée si API indisponible

### Bug Fix QR Code (Mars 2026)
- Lazy import robuste pour `PIL/Pillow` et `qrcode` avec messages d'erreur explicites
- Endpoint de diagnostic `/api/qr/check-deps` pour vérifier les dépendances
- Frontend affiche le message d'erreur exact du backend au lieu d'un message générique

### Icône cloche multi-badges (Mars 2026)
- 3 badges : Rouge (OT en attente), Violet (Améliorations), Vert (Maintenance préventive échue)
- Endpoint `/api/bell-counts` pour compteurs efficaces côté serveur
- Tooltip détaillé avec légende des couleurs

## Backlog
- Validation en production : "Save to GitHub" puis mise à jour via le menu intégré

## Notes techniques
- Environnement production: Proxmox, géré par supervisor
- Système de mise à jour intégré (git pull + yarn build + restart automatique)
- URL production: https://gmao-iris.tail4d419a.ts.net
- FRONTEND_URL dans backend/.env pour les URLs des QR codes
- La dépendance `qrcode[pil]` doit être installée sur le serveur de production
