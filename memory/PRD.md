# PRD - GMAO Atlas / M.E.S. System

## Dernière mise à jour
**Date**: 2026-02-14
**Version**: 1.5.3

## Problem Statement
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps réel.

## Core Requirements

### M.E.S. Module (P0) - ✅ COMPLET
- [x] Backend service complet (`mes_service.py`)
- [x] API routes (`mes_routes.py`)
- [x] Frontend UI (`MESPage.jsx`)
- [x] **CORRIGÉ** Bug MQTT - race condition startup
- [x] **CORRIGÉ** Système de listeners pour reconnexion MQTT
- [x] **CORRIGÉ** Callback synchrone pour thread paho-mqtt
- [x] **CORRIGÉ** Bug saisie paramètres (perte focus)
- [x] **AJOUTÉ** Suppression en masse des alertes M.E.S.
- [x] **AJOUTÉ** Manuel d'utilisation M.E.S. (4 sections)

### Issues en cours
1. **Import Excel (P1)** : Données importées non liées correctement
2. **Documentation page (P2)** : Utilisateurs importés non sélectionnables

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # App principale + startup events
├── mes_service.py         # Service M.E.S. (callback MQTT corrigé)
├── mes_routes.py          # API M.E.S. + suppression alertes
├── mqtt_manager.py        # Gestionnaire MQTT (listeners)
├── manual_routes.py       # Manuel utilisateur (chapitre M.E.S. ajouté)
└── ...autres modules
```

### Corrections 2026-02-14
1. `MESPage.jsx` : Composant `SettingsField` déplacé hors du modal
2. `MESAlertIcon.jsx` : Icône corbeille + suppression alertes
3. `manual_routes.py` : Chapitre M.E.S. + endpoint `POST /api/manual/upgrade-mes`

### Collections MongoDB (M.E.S.)
- `mes_machines`: Configuration machines
- `mes_pulses`: Impulsions reçues
- `mes_cadence_history`: Historique cadence/minute
- `mes_alerts`: Alertes générées
- `mqtt_config`: Configuration broker MQTT
- `manual_chapters`, `manual_sections`: Manuel utilisateur

## Prioritized Backlog

### P0 (Bloquant) - ✅ TERMINÉ
- [x] Bug MQTT M.E.S.
- [x] Bug saisie paramètres
- [x] Suppression alertes
- [x] Manuel M.E.S.

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
- `DELETE /api/mes/alerts/all` - Supprimer toutes les alertes
- `POST /api/manual/upgrade-mes` - Ajouter chapitre M.E.S. au manuel existant
