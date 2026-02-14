# PRD - GMAO Atlas / M.E.S. System

## Dernière mise à jour
**Date**: 2026-02-14
**Version**: 1.5.2

## Problem Statement
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps réel.

## Core Requirements

### M.E.S. Module (P0) - ✅ CORRIGÉ
- [x] Backend service complet (`mes_service.py`)
- [x] API routes (`mes_routes.py`)
- [x] Frontend UI (`MESPage.jsx`)
- [x] **CORRIGÉ** Bug MQTT - race condition startup (2026-02-14)
- [x] **CORRIGÉ** Système de listeners pour reconnexion MQTT
- [x] **CORRIGÉ** Callback synchrone pour thread paho-mqtt

### Issues en cours
1. **Import Excel (P1)** : Données importées non liées correctement
2. **Documentation page (P2)** : Utilisateurs importés non sélectionnables

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # App principale + startup events (modifié)
├── mes_service.py         # Service M.E.S. (corrigé callback MQTT)
├── mes_routes.py          # API M.E.S.
├── mqtt_manager.py        # Gestionnaire MQTT (ajout listeners)
└── ...autres modules
```

### Corrections MQTT M.E.S. (2026-02-14)
1. `mqtt_manager.py`:
   - Ajout `_on_connect_listeners` liste
   - Ajout `add_on_connect_listener()` méthode
   - Notification des listeners dans `_on_connect()`

2. `mes_service.py`:
   - Listener `_on_mqtt_connected()` enregistré à l'init
   - Méthode synchrone `_record_pulse_sync()` pour thread MQTT

3. `server.py`:
   - MQTT connect AVANT M.E.S. subscribe_all()

### Collections MongoDB (M.E.S.)
- `mes_machines`: Configuration machines (topic, cadence théorique, alertes)
- `mes_pulses`: Impulsions reçues
- `mes_cadence_history`: Historique cadence/minute
- `mes_alerts`: Alertes générées
- `mqtt_config`: Configuration broker MQTT

## Prioritized Backlog

### P0 (Bloquant) - ✅ TERMINÉ
- [x] Bug MQTT M.E.S.

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
