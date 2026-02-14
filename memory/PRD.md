# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour
**Date**: 2026-02-14
**Version**: 1.6.0

## Problem Statement
Application GMAO (Gestion de Maintenance Assistee par Ordinateur) complete avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps reel.

## Core Requirements

### M.E.S. Module (P0) - COMPLET
- [x] Backend service complet (`mes_service.py`)
- [x] API routes (`mes_routes.py`)
- [x] Frontend UI (`MESPage.jsx`)
- [x] CORRIGE Bug MQTT - race condition startup
- [x] CORRIGE Systeme de listeners pour reconnexion MQTT
- [x] CORRIGE Callback synchrone pour thread paho-mqtt
- [x] CORRIGE Bug saisie parametres (perte focus)
- [x] AJOUTE Suppression en masse des alertes M.E.S.
- [x] AJOUTE Manuel d'utilisation M.E.S. (4 sections)

### TRS Avance Niveau 3 (P0) - COMPLET
- [x] Formule TRS = Disponibilite x Performance x Qualite
- [x] Planning de production configurable (24h/24 ou horaires personnalises)
- [x] Jours de production selectionnables (Lun-Dim)
- [x] Declaration de rebuts (quantite, motif predefini ou libre)
- [x] Gestion des motifs de rebut (CRUD admin)
- [x] Historique rebuts du jour avec operateur et heure
- [x] Affichage TRS avec 3 barres de progression (Disponibilite, Performance, Qualite)
- [x] Calcul qualite = (Production - Rebuts) / Production
- [x] Calcul disponibilite = Temps operationnel / Temps planifie
- [x] Calcul performance = Production reelle / Production theorique pendant temps operationnel

### Issues en cours
1. **Import Excel (P1)** : Donnees importees non liees correctement
2. **Documentation page (P2)** : Utilisateurs importes non selectionnables

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # App principale + startup events
├── mes_service.py         # Service M.E.S. (TRS avance, rebuts, planning prod)
├── mes_routes.py          # API M.E.S. (reject-reasons, rejects, metrics)
├── mqtt_manager.py        # Gestionnaire MQTT (listeners)
├── manual_routes.py       # Manuel utilisateur (chapitre M.E.S. ajoute)
└── ...autres modules
```

### Collections MongoDB (M.E.S.)
- `mes_machines`: Configuration machines + planning production
- `mes_pulses`: Impulsions recues
- `mes_cadence_history`: Historique cadence/minute
- `mes_alerts`: Alertes generees
- `mes_reject_reasons`: Motifs de rebut predefinis (admin)
- `mes_rejects`: Declarations de rebuts (operateur)
- `mqtt_config`: Configuration broker MQTT
- `manual_chapters`, `manual_sections`: Manuel utilisateur

## Key API Endpoints

### Machines
- `GET /api/mes/machines` - Lister machines
- `POST /api/mes/machines` - Creer machine
- `PUT /api/mes/machines/{id}` - Modifier machine (incl. schedule_*)
- `DELETE /api/mes/machines/{id}` - Supprimer machine
- `GET /api/mes/machines/{id}/metrics` - Metriques temps reel + TRS avance

### Motifs de rebut (Admin)
- `GET /api/mes/reject-reasons` - Lister motifs
- `POST /api/mes/reject-reasons` - Creer motif
- `PUT /api/mes/reject-reasons/{id}` - Modifier motif
- `DELETE /api/mes/reject-reasons/{id}` - Supprimer motif

### Rebuts (Operateur)
- `POST /api/mes/machines/{id}/rejects` - Declarer rebut
- `GET /api/mes/machines/{id}/rejects` - Lister rebuts du jour
- `DELETE /api/mes/rejects/{id}` - Supprimer rebut

### Alertes
- `GET /api/mes/alerts` - Lister alertes
- `DELETE /api/mes/alerts/all` - Supprimer toutes les alertes

## Prioritized Backlog

### P0 (Bloquant) - TERMINE
- [x] Bug MQTT M.E.S.
- [x] Bug saisie parametres
- [x] Suppression alertes
- [x] Manuel M.E.S.
- [x] TRS Avance Niveau 3 (Disponibilite x Performance x Qualite)

### P1 (Important)
- [ ] Fix import Excel
- [ ] Documentation page users

### P2 (Nice to have)
- [ ] Reporting historique M.E.S.
- [ ] Refactoring response_model API

## Credentials de test
- `admin@test.com` / `Admin123!`
- `buenogy@gmail.com` / `Admin2024!`

## Test Reports
- `/app/test_reports/iteration_2.json` - TRS Avance (33/33 backend, 100% frontend)
- `/app/backend/tests/test_mes_rejects_trs.py` - Tests pytest rebuts et TRS
