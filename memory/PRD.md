# GMAO Iris - PRD (Product Requirements Document)

## Problem Statement
Application CMMS/GMAO complète (Gestion de Maintenance Assistée par Ordinateur). L'application gère la maintenance préventive et corrective, le suivi des équipements, la gestion des capteurs MQTT/IoT, les ordres de travail, l'inventaire, les achats, et plus encore.

## Core Requirements
1. **Dashboard & Analytics** - Tableaux de bord opérationnels et IoT
2. **Work Orders & Maintenance** - Ordres de travail, maintenance préventive, planning
3. **Asset Management** - Équipements, compteurs, capteurs MQTT
4. **Inventory & Purchasing** - Inventaire, demandes d'achat, fournisseurs
5. **User Management** - Rôles, permissions granulaires, personnalisation UI
6. **Reporting** - Rapports hebdomadaires, surveillance, MES
7. **Communication** - Chat live, demandes d'intervention
8. **Import/Export** - Import/Export Excel des données

## Tech Stack
- **Frontend:** React + Tailwind CSS + Shadcn/UI + Recharts
- **Backend:** FastAPI + Python
- **Database:** MongoDB
- **Real-time:** WebSockets (chat, notifications de mise à jour)
- **IoT:** MQTT (paho-mqtt) pour capteurs
- **Scheduling:** APScheduler

## Completed Features
- [x] Intégration des permissions pour toutes les nouvelles pages (13 clés)
- [x] Personnalisation UI (menus, préférences d'affichage) pour nouvelles pages
- [x] Manuel utilisateur complet (36 chapitres) via manual_chapters.json
- [x] Système de changelog et notification de mise à jour (WebSocket broadcast, badges "NEW", décompte/déconnexion auto)
- [x] Documentation API protégée (admin/atlas2024)
- [x] Correction bug écran blanc (données de menu incohérentes)
- [x] Réorganisation sidebar: "Logs MQTT" déplacé sous "P/L MQTT" (14 fév 2026)
- [x] Réorganisation sidebar: "Import / Export" déplacé sous "Paramètres Spéciaux" (14 fév 2026)
- [x] Vue en fenêtre (Explorateur Windows) dans la section Documentations (14 fév 2026)
  - Navigation par dossiers/sous-dossiers avec breadcrumb
  - Création, renommage, suppression de dossiers
  - Menu contextuel (clic droit) pour toutes les actions
  - Drag & drop pour déplacer documents/dossiers
  - 3 vues disponibles : Carte, Liste, Fenêtre
- [x] Fix WebSocket broadcast mise à jour (14 fév 2026)
  - Routes WS migrées de /ws/ à /api/ws/ pour routing K8s
  - Token JWT remplacé par user_id pour compatibilité proxy
  - chat_manager mis à jour pour connexions multiples par utilisateur

## Pending / Backlog
- [ ] **P1** Bug import Excel (données pas correctement liées) - l'utilisateur dit ne pas avoir ce problème, en attente de confirmation
- [ ] Autres améliorations à définir par l'utilisateur

## Credentials
- **App:** admin@test.com / Admin123!
- **API Docs:** admin / atlas2024

## Architecture
```
/app
├── backend/
│   ├── api/ (routes FastAPI)
│   ├── data/manual_chapters.json
│   ├── services/
│   ├── models.py
│   └── server.py
└── frontend/
    └── src/
        ├── components/Layout/ (Sidebar.jsx, menuConfig.js, MainLayout.jsx)
        ├── components/ (UpdateWarningOverlay, ChangelogPopup, etc.)
        ├── pages/
        └── services/
```
