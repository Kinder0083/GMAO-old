# GMAO Iris - PRD

## Problème original
Application GMAO (CMMS) complète pour la gestion de maintenance assistée par ordinateur. Interface en français.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS + Recharts + Nivo
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (gmao_iris)
- **Intégrations**: Google Drive API, Tailscale Funnel, MQTT, Gemini (extraction IA contrats + surveillance)

## Fonctionnalités implémentées

### Sessions précédentes
- Tableau de bord, ordres de travail, équipements, inventaire, zones
- Maintenance préventive, fournisseurs, historique d'achat
- Chat live, capteurs MQTT, système de backup/restore
- Import/export de données, journal d'audit
- Manuel utilisateur, personnalisation
- Gestion des utilisateurs et permissions (RBAC)
- Bug Fix: Journal d'audit - ObjectId MongoDB, rétention sauvegardes
- Feature: Section Contrats (CRUD, alertes, extraction IA Gemini, dashboard KPIs)

### Session 16/02/2026
- **Feature: Extraction IA documents de contrôle (Plan de Surveillance)**
  - Upload PDF de contrôle → Gemini extrait les infos multi-types
  - Recherche automatique de la périodicité réglementaire
  - Création batch de plusieurs contrôles depuis un seul document
  - Création automatique BT curatifs pour non-conformités
  - Nouveaux champs: référence réglementaire, n° rapport, organisme, résultat

### Session 17/02/2026
- **Feature: Historique des analyses IA (Phase 1 - Stockage)**
  - Collection MongoDB `ai_analysis_history` 
  - Archivage automatique à chaque create-batch (filename, résultats, IDs créés, données brutes)
- **Feature: Page Historique IA (Phase 2)**
  - Liste chronologique de toutes les analyses IA
  - Filtres par organisme et catégorie
  - Dialog détail avec données brutes extraites
  - Route: /surveillance-ai-history
- **Feature: Tableau de bord IA Tendances (Phase 3)**
  - KPIs: analyses, contrôles, taux conformité, non-conformités, BT curatifs
  - Graphiques: évolution mensuelle (AreaChart), répartition résultats (PieChart), par organisme (BarChart), conformité par catégorie (barres de progression)
  - **Export PDF** : Bouton pour générer un rapport PDF formaté pour réunions QHSE (en-tête bleu, KPIs, graphiques, alertes, pagination auto)
  - Route: /surveillance-ai-dashboard
- **Feature: Alertes intelligentes (Phase 4)**
  - Détection de tendances de dégradation (non-conformités consécutives)
  - Alerte taux conformité bas par catégorie (<70%)
  - Alerte non-conformité sans BT curatif
  - Sévérité HAUTE/MOYENNE/BASSE avec tri par priorité

## Fichiers clés - Surveillance IA
- `backend/surveillance_routes.py` - Routes: /ai/extract, /ai/create-batch, /ai/history, /ai/analytics, /ai/alerts
- `backend/models.py` - SurveillanceItem + AIAnalysisHistory
- `frontend/src/components/Surveillance/SurveillanceAIExtract.jsx` - Dialog extraction
- `frontend/src/components/Surveillance/SurveillanceItemForm.jsx` - Formulaire mis à jour
- `frontend/src/pages/SurveillancePlan.jsx` - Bouton "Analyse IA"
- `frontend/src/pages/SurveillanceAIHistory.jsx` - Page historique
- `frontend/src/pages/SurveillanceAIDashboard.jsx` - Dashboard tendances

- **Feature: Pièces jointes multiples** sur les contrôles de surveillance
  - Upload multi-fichiers (PDF, images, etc.)

## Credentials
  - Download et suppression individuelle
  - Rattachement automatique du PDF source lors de la création via IA
  - Section "Pièces jointes" dans le formulaire (création + édition)
- **Feature: Recherche avancée** dans le Plan de Surveillance (style Manuel)
  - Barre de recherche avec scoring pondéré (type > catégorie > exécutant > description...)
  - Résultats avec badges catégorie, badges résultat, excerpts, score de pertinence
  - Clic sur résultat = ouverture directe en édition
- Admin: admin@test.com / Admin123!

## Backlog
- Aucune tâche en attente identifiée
