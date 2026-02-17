# GMAO Iris - Product Requirements Document

## Problème Original
Application de GMAO (Gestion de Maintenance Assistée par Ordinateur) nommée "GMAO Iris".

## Architecture
```
/app
├── backend/
│   ├── server.py                    # Serveur principal FastAPI
│   ├── ai_maintenance_routes.py     # NOUVEAU: Routes IA (checklists, maintenance, non-conformités)
│   ├── surveillance_routes.py       # Routes surveillance (+onglets année, +récurrence)
│   ├── dependencies.py              # Auth (require_permission, get_current_user)
│   ├── models.py                    # Modèles Pydantic
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── AIChecklistGenerator.jsx       # NOUVEAU: Dialog génération IA checklists
        │   ├── AIMaintenanceGenerator.jsx     # NOUVEAU: Dialog génération IA maintenance
        │   └── AINonconformityAnalyzer.jsx    # NOUVEAU: Dialog analyse IA non-conformités
        ├── services/api.js                    # +aiMaintenanceAPI
        ├── pages/
        │   ├── ChecklistsManagement.jsx       # +bouton "Générer avec IA"
        │   ├── PreventiveMaintenance.jsx       # +bouton "Générer avec IA"
        │   ├── AnalyticsChecklistsPage.jsx    # +bouton "Analyse IA"
        │   └── SurveillancePlan.jsx           # +onglets par année
        └── ...
```

## Intégrations 3rd Party
- Google Drive API, Tailscale Funnel
- Gemini Pro (via emergentintegrations) - AI extraction (surveillance, contrats, checklists, maintenance, non-conformités)

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: tech.test@test.com / Test1234!

## Fonctionnalités Implémentées - Session 17 Feb 2026

### 1. Bug P0 RBAC Permissions - CORRIGÉ ✅
- serialize_doc() polluait permissions → corrigé avec _is_root
- register + update_user corrigés + migration automatique au démarrage

### 2. Onglets par Année - Plan de Surveillance ✅
- Onglets 2024/2025/2026(en cours)/2027
- Génération automatique contrôles récurrents jusqu'à N+1
- Migration existants + stats par année

### 3. Feature IA: Génération de Checklists ✅
- Upload doc technique → IA extrait points de contrôle → crée templates checklists
- Endpoints: POST /api/ai-maintenance/generate-checklist, POST /api/ai-maintenance/create-checklists-batch
- Frontend: AIChecklistGenerator.jsx, bouton sur page ChecklistsManagement

### 4. Feature IA: Programme de Maintenance Préventive ✅
- Upload doc constructeur → IA génère programme complet (plans + checklists associées)
- Endpoints: POST /api/ai-maintenance/generate-maintenance-program, POST /api/ai-maintenance/create-maintenance-batch
- Frontend: AIMaintenanceGenerator.jsx, bouton sur page PreventiveMaintenance

### 5. Feature IA: Analyse des Non-conformités ✅
- Analyse historique exécutions checklists via IA
- Détection patterns récurrents, équipements à risque, recommandations, OT suggérés
- Endpoints: POST /api/ai-maintenance/analyze-nonconformities
- Frontend: AINonconformityAnalyzer.jsx, bouton sur page AnalyticsChecklistsPage

## Backlog / Tâches Futures
- Aucune tâche en attente signalée par l'utilisateur
