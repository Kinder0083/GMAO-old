# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO (Gestion de Maintenance Assistee par Ordinateur) nommee "GMAO Iris".

## Architecture
```
/app
├── backend/
│   ├── server.py                        # Serveur principal FastAPI
│   ├── ai_chat_routes.py               # Adria - Assistant IA (memoire, contexte enrichi, requetes dynamiques)
│   ├── ai_maintenance_routes.py        # IA checklists, maintenance, non-conformites, OT curatifs
│   ├── ai_presqu_accident_routes.py    # IA presqu'accidents (causes racines, similaires, tendances, QHSE)
│   ├── ai_work_order_routes.py         # IA OT (diagnostic + resume cloture)
│   ├── ai_weekly_report_routes.py      # IA rapports hebdomadaires (generation auto)
│   ├── ai_sensor_routes.py             # IA capteurs (analyse predictive, detection anomalies)
│   ├── automation_routes.py            # Module automatisations (parse NL, apply, CRUD)
│   ├── surveillance_routes.py          # Plan de surveillance (recurrence, tendances)
│   ├── dependencies.py                 # Auth
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── Common/AIChatWidget.jsx            # Widget Adria (CONFIGURE_AUTOMATION support)
        │   ├── WorkOrders/AIDiagnosticPanel.jsx   # Diagnostic IA OT
        │   ├── WorkOrders/AISummaryPanel.jsx       # Resume IA cloture OT
        │   ├── Sensors/AISensorAnalysis.jsx        # Analyse predictive capteurs
        │   ├── WeeklyReports/AIReportGenerator.jsx # Generateur IA rapports
        │   ├── Surveillance/RecurrenceIndicator.jsx # Indicateur recurrence + tendance
        │   └── ...
        ├── services/api.js                         # API client (automationsAPI, aiReportsAPI, etc.)
        └── pages/...
```

## Fonctionnalites IA implementees

### 1. Adria - Assistant IA (17 Feb 2026)
- Memoire de conversation (historique injecte dans initial_messages du LLM)
- Contexte enrichi (OT recents avec titres, equipements avec details, alertes, inventaire)
- Requetes dynamiques pre-chat (interroge la DB selon la question posee)
- Support commande CONFIGURE_AUTOMATION pour automatisations en langage naturel

### 2. IA Ordres de Travail (17 Feb 2026)
- POST /api/ai-work-orders/diagnostic : analyse equipement + historique pannes + inventaire
- POST /api/ai-work-orders/summary : resume cloture avec performance et recommandations preventives
- Composants: AIDiagnosticPanel.jsx, AISummaryPanel.jsx integres dans WorkOrderDialog

### 3. IA Rapports Hebdomadaires (17 Feb 2026)
- POST /api/ai-weekly-reports/generate : compile donnees periode + genere rapport structure
- Composant: AIReportGenerator.jsx integre dans WeeklyReportsPage

### 4. IA Capteurs Predictive (17 Feb 2026)
- POST /api/ai-sensors/analyze : detection anomalies, prediction degradation, recommandations
- Composant: AISensorAnalysis.jsx integre dans IoTDashboard

### 5. Module Automatisations (17 Feb 2026)
- POST /api/automations/parse : traduit langage naturel en config structuree via LLM
- POST /api/automations/apply : applique la config (seuils capteurs, actions alertes)
- GET /api/automations/list, DELETE, PUT toggle
- Integration Adria : commande CONFIGURE_AUTOMATION dans le chat

### 6. Indicateur recurrence + tendance (17 Feb 2026)
- Icone chaine dans Plan de Surveillance pour controles recurrents
- Fleches colorees de tendance conformite (vert/orange/rouge)
- POST /api/surveillance/batch-trends

### Fonctionnalites precedentes (avant cette session)
- Alertes email automatiques NC critiques
- Refonte module Presqu'accidents (7 champs + 4 IA)
- Visite guidee personnalisee par profil utilisateur
- Analyse IA checklists, maintenance preventive, non-conformites

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Aucune tache en attente - demander prochaines exigences utilisateur
