# GMAO Iris - PRD

## Problème original
Application GMAO (CMMS) complète pour la gestion de maintenance assistée par ordinateur. Interface en français.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS + Recharts + Nivo
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
- Bug Fix P0: Journal d'audit - ObjectId MongoDB non sérialisables
- Bug Fix P1: Rétention des sauvegardes globale
- Feature: Mises à jour temps réel des badges header via WebSocket
- Feature: Recherche autocomplete dans le manuel utilisateur
- **Feature: Section Contrats**
  - CRUD complet des contrats fournisseurs
  - Statistiques, sélection de fournisseur existant
  - Upload/download de pièces jointes
  - Système d'alertes (échéance, résiliation) avec email + in-app
  - Extraction IA via Gemini
  - Champ "Commande interne" ajouté au formulaire
- **Feature: Tableau de bord Contrats** (/contrats/dashboard)
  - KPI : contrats actifs, budget mensuel/annuel, à renouveler, expirés
  - Graphique évolution budget 12 mois (AreaChart)
  - Répartition par type (PieChart donut)
  - Coût par fournisseur (BarChart horizontal)
  - Répartition par statut (PieChart)
  - Top fournisseurs classés par coût
  - Calendrier des échéances groupé par mois (timeline)

## Fichiers clés - Contrats
- `backend/contract_routes.py` - Routes CRUD, dashboard, alertes, extraction IA
- `frontend/src/pages/Contracts.jsx` - Page liste des contrats
- `frontend/src/pages/ContractsDashboard.jsx` - Tableau de bord contrats
- `frontend/src/services/api.js` - contractsAPI

## Credentials
- Admin: admin@test.com / Admin123!

## Backlog
- Aucune tâche en attente identifiée
