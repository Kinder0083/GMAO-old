# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO (Gestion de Maintenance Assistee par Ordinateur) nommee "GMAO Iris".
L'objectif est d'infuser des capacites IA dans toute l'application et enrichir l'assistant IA "Adria".

## Architecture
```
/app
├── backend/
│   ├── server.py                        # Serveur principal FastAPI
│   ├── ai_chat_routes.py               # Adria - Assistant IA
│   ├── ai_maintenance_routes.py        # IA checklists, maintenance
│   ├── ai_presqu_accident_routes.py    # IA presqu'accidents
│   ├── ai_work_order_routes.py         # IA OT (diagnostic + resume)
│   ├── ai_weekly_report_routes.py      # IA rapports hebdomadaires
│   ├── ai_sensor_routes.py             # IA capteurs (anomalies)
│   ├── automation_routes.py            # Module automatisations
│   ├── surveillance_routes.py          # Plan de surveillance + analytics IA
│   └── dependencies.py                 # Auth
└── frontend/
    └── src/
        ├── components/
        │   ├── Common/AIChatWidget.jsx
        │   ├── WorkOrders/AIDiagnosticPanel.jsx
        │   ├── WorkOrders/AISummaryPanel.jsx
        │   ├── Sensors/AISensorAnalysis.jsx
        │   ├── WeeklyReports/AIReportGenerator.jsx
        │   ├── Surveillance/RecurrenceIndicator.jsx
        │   └── IADashboard/IADashboardTabs.jsx    # Onglets dashboard IA
        ├── services/api.js
        └── pages/
            ├── SurveillanceAIDashboard.jsx         # Dashboard IA unifie (5 onglets)
            └── WorkOrderDialog.jsx
```

## Fonctionnalites IA implementees

### 1. Adria - Assistant IA (17 Feb 2026)
- Memoire de conversation
- Contexte enrichi (OT, equipements, alertes, inventaire)
- Requetes dynamiques pre-chat
- Support commande CONFIGURE_AUTOMATION

### 2. IA Ordres de Travail (17 Feb 2026)
- POST /api/ai-work-orders/diagnostic
- POST /api/ai-work-orders/summary
- Composants: AIDiagnosticPanel.jsx, AISummaryPanel.jsx

### 3. IA Rapports Hebdomadaires (17 Feb 2026)
- POST /api/ai-weekly-reports/generate
- Composant: AIReportGenerator.jsx

### 4. IA Capteurs Predictive (17 Feb 2026)
- POST /api/ai-sensors/analyze
- Composant: AISensorAnalysis.jsx

### 5. Module Automatisations (17 Feb 2026)
- POST /api/automations/parse, POST /api/automations/apply
- GET /api/automations/list, DELETE, PUT toggle

### 6. Indicateur recurrence + tendance (17 Feb 2026)
- Icone chaine + fleches tendance dans Plan de Surveillance

### 7. Tableau de bord IA unifie (18 Feb 2026) - COMPLETE
- Page SurveillanceAIDashboard.jsx avec 5 onglets:
  - Tendances: KPIs, graphiques evolution mensuelle, repartition, organismes, categories
  - Ordres de travail: KPIs, graphiques categories/equipements, temps maintenance
  - Capteurs: KPIs statut, cartes capteurs, alertes recentes
  - Surveillance: KPIs conformite, barre progression, conformite par categorie
  - Automatisations: Liste avec activation/desactivation/suppression
- Bug fix: tooltip graphique evolution (YYYY-MM/undefined -> YYYY-MM)
- Bug fix: mapping champs par_resultat (resultat/count -> label/value)

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Enrichissements dashboard (filtres par date, comparaisons periodes)
- Export PDF ameliore pour chaque onglet
- Nouvelles fonctionnalites IA selon besoins utilisateur
