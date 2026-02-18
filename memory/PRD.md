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
        │   ├── Common/AIChatWidget.jsx
        │   ├── Common/NotificationsDropdown.jsx  # Supporte automation_trigger
        │   ├── WorkOrders/AIDiagnosticPanel.jsx
        │   ├── WorkOrders/AISummaryPanel.jsx
        │   ├── Sensors/AISensorAnalysis.jsx
        │   ├── WeeklyReports/AIReportGenerator.jsx
        │   ├── Surveillance/RecurrenceIndicator.jsx
        │   └── IADashboard/IADashboardTabs.jsx    # + bouton test trigger
        ├── services/api.js
        └── pages/
            ├── SurveillanceAIDashboard.jsx
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

### 3. IA Rapports Hebdomadaires (17 Feb 2026)
- POST /api/ai-weekly-reports/generate

### 4. IA Capteurs Predictive (17 Feb 2026)
- POST /api/ai-sensors/analyze

### 5. Module Automatisations (17 Feb 2026)
- POST /api/automations/parse, POST /api/automations/apply
- GET /api/automations/list, DELETE, PUT toggle

### 6. Indicateur recurrence + tendance (17 Feb 2026)

### 7. Tableau de bord IA unifie (18 Feb 2026)
- 5 onglets: Tendances, OT, Capteurs, Surveillance, Automatisations
- Bug fix: tooltip evolution + mapping par_resultat

### 8. Notifications push automatisations (18 Feb 2026) - NEW
- Backend: alert_service.send_push_notification() cree des notifications pour admin/techniciens
- Backend: POST /api/automations/test-trigger/{id} pour simulation
- Backend: Mise a jour trigger_count et last_triggered
- Frontend: Bouton test (cloche) dans onglet Automatisations
- Frontend: NotificationsDropdown supporte type automation_trigger avec icone Zap ambre
- Flux reel: capteur MQTT > seuil depasse > alert_service > NOTIFICATION_ONLY > notification push

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Enrichissements dashboard (filtres par date, comparaisons periodes)
- Export PDF ameliore par onglet
- Nouvelles fonctionnalites IA selon besoins utilisateur
