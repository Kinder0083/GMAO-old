# GMAO Iris - PRD

## Problème original
Application GMAO (CMMS) complète pour la gestion de maintenance assistée par ordinateur. Interface en français.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (gmao_iris)
- **Intégrations**: Google Drive API, Tailscale Funnel, MQTT, Gemini (extraction IA contrats)

## Fonctionnalités implémentées

### Session précédente
- Tableau de bord, ordres de travail, équipements, inventaire, zones
- Maintenance préventive, fournisseurs, historique d'achat
- Chat live, capteurs MQTT, système de backup/restore
- Import/export de données, journal d'audit
- Manuel utilisateur, personnalisation
- Gestion des utilisateurs et permissions (RBAC)

### Session actuelle (16/02/2026)
- Bug Fix: Compteur d'éléments en retard corrigé
- Refactoring: MainLayout avec hooks personnalisés (useOverdueItems, useWorkOrdersCount, etc.)
- Feature: Mises à jour temps réel des badges header via WebSocket
- Feature: Recherche autocomplete dans le manuel utilisateur
- Bug Fix P1: Rétention des sauvegardes globale (confirmé par l'utilisateur)
- Bug Fix P0: Journal d'audit - "Erreur lors du chargement du journal"
  - Cause racine: ObjectId MongoDB non sérialisables en JSON
  - Fix: _sanitize_log() dans audit_service.py + gestion robuste frontend/backend
- **Feature: Section Contrats** (NOUVEAU)
  - CRUD complet des contrats fournisseurs
  - Statistiques (total, actifs, expirés, coût mensuel/annuel)
  - Sélection de fournisseur existant (pré-remplissage automatique)
  - Upload/download de pièces jointes (PDF, images)
  - Système d'alertes (échéance, résiliation) avec email + in-app
  - Extraction IA via Gemini (upload PDF -> extraction automatique des champs)
  - Filtres par statut, type, recherche
  - Menu "Contrats" dans la sidebar avec icône FileSignature
  - Permissions RBAC intégrées
  - Scheduler cron quotidien pour vérification des alertes

## Fichiers clés - Contrats
- `backend/contract_routes.py` - Routes API CRUD, upload, alertes, extraction IA
- `frontend/src/pages/Contracts.jsx` - Page principale des contrats
- `frontend/src/services/api.js` - contractsAPI (fin du fichier)
- `frontend/src/App.js` - Route /contrats
- `frontend/src/components/Layout/menuConfig.js` - iconMap avec FileSignature

## Credentials
- Admin: admin@test.com / Admin123!

## Backlog
- Aucune tâche en attente identifiée
