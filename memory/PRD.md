# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO (Gestion de Maintenance Assistee par Ordinateur) nommee "GMAO Iris".
L'objectif est d'infuser des capacites IA dans toute l'application et enrichir l'assistant IA "Adria".

## Architecture
```
/app
├── backend/
│   ├── server.py                        # Serveur principal FastAPI
│   ├── alert_service.py                 # Service alertes + notifications push automatisations
│   ├── ai_chat_routes.py               # Adria - Assistant IA
│   ├── ai_maintenance_routes.py        # IA checklists, maintenance
│   ├── ai_presqu_accident_routes.py    # IA presqu'accidents
│   ├── ai_work_order_routes.py         # IA OT (diagnostic + resume)
│   ├── ai_weekly_report_routes.py      # IA rapports hebdomadaires
│   ├── ai_sensor_routes.py             # IA capteurs (anomalies)
│   ├── automation_routes.py            # Module automatisations + test-trigger
│   ├── surveillance_routes.py          # Plan de surveillance + analytics IA
│   └── dependencies.py                 # Auth
└── frontend/
    └── src/
        ├── components/
        │   ├── Common/AIChatWidget.jsx             # Fix: import workOrdersAPI
        │   ├── Common/NotificationsDropdown.jsx     # Supporte automation_trigger
        │   ├── WorkOrders/AIDiagnosticPanel.jsx
        │   ├── WorkOrders/AISummaryPanel.jsx
        │   ├── Sensors/AISensorAnalysis.jsx
        │   ├── WeeklyReports/AIReportGenerator.jsx
        │   ├── Surveillance/RecurrenceIndicator.jsx
        │   └── IADashboard/IADashboardTabs.jsx
        ├── services/api.js
        └── pages/
            ├── SurveillanceAIDashboard.jsx
            └── WorkOrderDialog.jsx
```

## Fonctionnalites IA implementees

### 1-6. (Voir sessions precedentes)

### 7. Tableau de bord IA unifie (18 Feb 2026)
- 5 onglets: Tendances, OT, Capteurs, Surveillance, Automatisations

### 8. Notifications push automatisations (18 Feb 2026)
- Backend: send_push_notification() + test-trigger endpoint
- Frontend: Bouton test + icone Zap ambre dans NotificationsDropdown

### 9. Bug fix: Creation OT via Adria (18 Feb 2026)
- Cause: api.workOrders.create() undefined car workOrdersAPI est un named export
- Fix: Import workOrdersAPI et appel direct workOrdersAPI.create()
- Fix: Mapping champs (priorite uppercase, categorie, tempsEstime)
- Fix: Prompt LLM mis a jour avec champs corrects

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Tableau de bord temps reel (compteurs live, historique alertes 24h)
- Enrichissements dashboard (filtres par date, comparaisons periodes)
- Export PDF ameliore par onglet
- Nouvelles fonctionnalites IA selon besoins utilisateur
