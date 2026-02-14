# PRD - GMAO Atlas / M.E.S. System

## Dernière mise à jour
**Date**: 2026-02-14
**Version**: 1.5.1

## Problem Statement
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps réel.

## Core Requirements

### M.E.S. Module (P0)
- [x] Backend service complet (`mes_service.py`)
- [x] API routes (`mes_routes.py`)
- [x] Frontend UI (`MESPage.jsx`)
- [x] Correction bug MQTT - race condition (2026-02-14)
- [ ] **En attente test utilisateur** : Configuration MQTT requise

### Issues en cours
1. **Import Excel (P1)** : Données importées non liées correctement
2. **Documentation page (P2)** : Utilisateurs importés non sélectionnables

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # App principale + startup events
├── mes_service.py         # Service M.E.S. (modifié 2026-02-14)
├── mes_routes.py          # API M.E.S.
├── mqtt_manager.py        # Gestionnaire MQTT
└── ...autres modules
```

### Frontend (React + Mantine UI)
```
/app/frontend/src/
├── pages/
│   ├── MESPage/MESPage.jsx    # Page M.E.S. complète
│   └── IoTDashboard/          # Dashboard IoT (timezone corrigé)
└── components/
```

### Collections MongoDB (M.E.S.)
- `mes_machines`: Configuration machines
- `mes_pulses`: Impulsions reçues
- `mes_cadence_history`: Historique cadence/minute
- `mes_alerts`: Alertes générées
- `mqtt_config`: Configuration broker MQTT

## What's Been Implemented

### 2026-02-14 - Fix MQTT Race Condition
- Réorganisation ordre démarrage : MQTT connect AVANT subscribe M.E.S.
- Hook reconnexion robuste `_setup_mqtt_reconnect_hook()`
- Logging détaillé pour debug
- Test validé via simulation de pulses

### 2026-02-13 - M.E.S. Frontend Complete
- Interface complète avec KPI cards, graphique Recharts
- Panel alertes et sélection machines
- Correction timezone sur graphiques

## Prioritized Backlog

### P0 (Bloquant)
- [ ] Test utilisateur MQTT M.E.S.

### P1 (Important)
- [ ] Fix import Excel
- [ ] Documentation page users

### P2 (Nice to have)
- [ ] Refactoring `formatLocalDate` → utils
- [ ] Amélioration calcul TRS
- [ ] Reporting historique M.E.S.

## Credentials de test
- `admin@test.com` / `Admin123!`
- `buenogy@gmail.com` / `Admin2024!`

## Key API Endpoints
- `POST /api/mes/machines` - Créer machine
- `GET /api/mes/machines/{id}/metrics` - Métriques temps réel
- `POST /api/mes/machines/{id}/simulate-pulse` - Test simulation
- `POST /api/mqtt/config` - Config MQTT
- `POST /api/mqtt/connect` - Connexion broker
