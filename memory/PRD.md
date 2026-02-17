# GMAO Iris - Product Requirements Document

## Problème Original
Application de GMAO (Gestion de Maintenance Assistée par Ordinateur) nommée "GMAO Iris".

## Architecture
```
/app
├── backend/
│   ├── server.py                    # Serveur principal FastAPI
│   ├── ai_maintenance_routes.py     # Routes IA (checklists, maintenance, non-conformités, OT curatifs)
│   ├── surveillance_routes.py       # Routes surveillance (+onglets année, +récurrence)
│   ├── dependencies.py              # Auth (require_permission, get_current_user)
│   ├── models.py                    # Modèles Pydantic
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── AIChecklistGenerator.jsx       # Dialog génération IA checklists
        │   ├── AIMaintenanceGenerator.jsx     # Dialog génération IA maintenance
        │   └── AINonconformityAnalyzer.jsx    # Dialog analyse IA NC + création OT en 1 clic
        ├── services/api.js                    # +aiMaintenanceAPI
        └── pages/
            ├── ChecklistsManagement.jsx       # +bouton "Générer avec IA"
            ├── PreventiveMaintenance.jsx       # +bouton "Générer avec IA"
            ├── AnalyticsChecklistsPage.jsx    # +bouton "Analyse IA"
            └── SurveillancePlan.jsx           # +onglets par année
```

## Intégrations
- Google Drive API, Tailscale Funnel
- Gemini 2.5 Flash (via emergentintegrations) - AI extraction

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: tech.test@test.com / Test1234!

## Implémenté - Session 17 Feb 2026

### Bug P0 RBAC ✅
### Onglets par Année (Surveillance) ✅
### IA Génération Checklists ✅
### IA Programme Maintenance Préventive ✅
### IA Analyse Non-conformités ✅
### Création OT Curatifs depuis Analyse IA ✅
- Bouton "Créer OT" individuel + "Créer tous les OT" en lot
- Endpoint: POST /api/ai-maintenance/create-work-orders-from-analysis
- OT créés avec categorie=TRAVAUX_CURATIF, statut=OUVERT, source=ai_nonconformity_analysis

## Backlog
- Aucune tâche en attente
