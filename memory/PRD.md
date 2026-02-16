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
- Bug Fix P0: Journal d'audit - ObjectId MongoDB non sérialisables
- Bug Fix P1: Rétention des sauvegardes globale
- Feature: Mises à jour temps réel des badges header via WebSocket
- Feature: Recherche autocomplete dans le manuel utilisateur
- **Feature: Section Contrats** (CRUD, alertes, extraction IA Gemini, dashboard)
- **Feature: Tableau de bord Contrats** (KPIs, graphiques, timeline)

### Session actuelle (16/02/2026)
- **Feature: Extraction IA de documents de contrôle (Plan de Surveillance)**
  - Upload de documents PDF de contrôle (rapports APAVE, SOCOTEC, etc.)
  - Analyse IA via Gemini pour extraire les informations de chaque type de contrôle
  - Détection automatique de la périodicité réglementaire (avec niveau de confiance)
  - Création automatique de PLUSIEURS contrôles depuis un seul document multi-équipements
  - Création automatique de bons de travail curatifs (TRAVAUX_CURATIF) pour les non-conformités
  - Nouveaux champs formulaire : référence réglementaire, numéro de rapport, organisme de contrôle, résultat (Conforme/Non conforme/Avec réserves)
  - Formulaire réorganisé en sections : Identification, Réglementation & Rapport, Planification, Notifications

## Fichiers clés - Surveillance IA
- `backend/surveillance_routes.py` - Routes IA: /ai/extract, /ai/create-batch
- `backend/models.py` - SurveillanceItem avec nouveaux champs
- `frontend/src/components/Surveillance/SurveillanceAIExtract.jsx` - Dialog extraction IA
- `frontend/src/components/Surveillance/SurveillanceItemForm.jsx` - Formulaire mis à jour
- `frontend/src/pages/SurveillancePlan.jsx` - Bouton "Analyse IA"
- `frontend/src/services/api.js` - surveillanceAPI.extractFromDocument, createBatchFromAI

## Fichiers clés - Contrats
- `backend/contract_routes.py` - Routes CRUD, dashboard, alertes, extraction IA
- `frontend/src/pages/Contracts.jsx` - Page liste des contrats
- `frontend/src/pages/ContractsDashboard.jsx` - Tableau de bord contrats

## Credentials
- Admin: admin@test.com / Admin123!

## Backlog
- Aucune tâche en attente identifiée
