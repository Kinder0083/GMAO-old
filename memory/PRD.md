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

### Deep-linking (Février 2026)
- Navigation intelligente depuis les badges du header
- Hook centralisé `useLocationStateFilter`

### Changelog "Quoi de neuf ?" (Mars 2026)
- Badge "NEW" + panneau latéral + feedback pouce haut/bas
- Interface admin CRUD + résumé feedbacks
- API: `/api/releases`

### QR Codes Équipements (Mars 2026)
- Page publique `/qr/{equipmentId}` (sans auth pour lecture)
- QR Codes et étiquettes imprimables
- Actions rapides configurables

### Terminal SSH (Mars 2026)
- Console interactive via xterm.js + WebSocket + PTY
- Connexion locale (login -f) et distante (ssh binaire)
- Support complet des commandes interactives (vim, top, htop)
- **Système de macros SSH** : CRUD complet pour enregistrer et exécuter des séquences de commandes
  - API: GET/POST/PUT/DELETE `/api/ssh/macros`
  - Panneau latéral avec liste des macros, couleurs, descriptions
  - Dialogue de création/modification avec lignes de commandes éditables
  - Exécution séquentielle des commandes dans le terminal connecté
- Menu contextuel IA désactivé sur la page SSH (clic droit natif)

### Présentations et Documentation PDF (Mars 2026)
- 3 versions de présentation PDF (courte, moyenne, complète) avec captures d'écran
- PDF README Documentation (28 pages) avec captures d'écran et contenu complet du README.md
- Fichiers: `/app/presentations/`

### Notifications cloche multi-badges (Mars 2026)
- 3 badges (OT en attente, améliorations, préventif échu)
- Menu déroulant avec navigation directe et filtres pré-appliqués
- API: `/api/bell-counts`

## Backlog / Tâches futures
- Stabilisation continue basée sur les retours utilisateur
- Améliorations de l'application mobile native (Expo) - notifications push
- Améliorations UX diverses selon retours terrain

## Fichiers clés
- `backend/ssh_routes.py` - Terminal SSH + Macros CRUD
- `frontend/src/pages/SSHTerminal.jsx` - UI Terminal + Panneau Macros
- `frontend/src/contexts/AIContextMenuContext.jsx` - Menu contextuel IA (SSH exclu)
- `presentations/generate_readme_pdf.py` - Générateur PDF README
- `presentations/generate_pdfs.py` - Générateur présentations PDF
- `backend/server.py` - Point d'entrée backend principal

## Collections MongoDB
- `ssh_macros` - Macros SSH (macro_id, name, description, commands, color, created_by, dates)
- Plus 40+ autres collections existantes
