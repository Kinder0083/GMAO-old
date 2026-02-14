# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour
**Date**: 2026-02-14
**Version**: 1.7.0

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

### Objectif TRS + Alertes Email (P0) - COMPLET
- [x] Champ trs_target configurable par machine (defaut 85%)
- [x] Alerte automatique TRS_BELOW_TARGET quand TRS < objectif
- [x] Affichage objectif TRS sur la carte TRS (indicateur couleur)
- [x] Notifications email configurables par machine
- [x] Liste de destinataires (ajout/suppression chips)
- [x] Types d'alertes a notifier par email (6 types selectionnables)
- [x] Delai configurable entre alertes email (min)
- [x] Respect du planning de production (pas d'alertes hors horaires)
- [x] Template email professionnel HTML via email_service.py (SMTP Gmail)

### Issues en cours
1. **Import Excel (P1)** : Donnees importees non liees correctement
2. **Documentation page (P2)** : Utilisateurs importes non selectionnables

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py              # App principale + startup events
├── mes_service.py         # M.E.S. (TRS avance, rebuts, alertes email, planning)
├── mes_routes.py          # API M.E.S. (machines, reject-reasons, rejects, alertes)
├── mqtt_manager.py        # Gestionnaire MQTT (listeners)
├── email_service.py       # Service SMTP (Gmail) pour envoi emails
├── manual_routes.py       # Manuel utilisateur
└── ...autres modules
```

### Collections MongoDB (M.E.S.)
- `mes_machines`: Config machines + planning production + trs_target + email_notifications
- `mes_pulses`: Impulsions recues
- `mes_cadence_history`: Historique cadence/minute
- `mes_alerts`: Alertes generees (avec email_sent flag)
- `mes_reject_reasons`: Motifs de rebut predefinis (admin)
- `mes_rejects`: Declarations de rebuts (operateur)

## Key API Endpoints

### Machines
- `GET /api/mes/machines` - Lister machines
- `POST /api/mes/machines` - Creer machine (avec trs_target, email_notifications)
- `PUT /api/mes/machines/{id}` - Modifier machine
- `DELETE /api/mes/machines/{id}` - Supprimer machine
- `GET /api/mes/machines/{id}/metrics` - Metriques temps reel + TRS avance + trs_target

### Motifs de rebut
- `GET /api/mes/reject-reasons` - Lister
- `POST /api/mes/reject-reasons` - Creer
- `PUT /api/mes/reject-reasons/{id}` - Modifier
- `DELETE /api/mes/reject-reasons/{id}` - Supprimer

### Rebuts
- `POST /api/mes/machines/{id}/rejects` - Declarer
- `GET /api/mes/machines/{id}/rejects` - Lister (jour)
- `DELETE /api/mes/rejects/{id}` - Supprimer

### Alertes
- `GET /api/mes/alerts` - Lister
- `DELETE /api/mes/alerts/all` - Supprimer toutes

## Prioritized Backlog

### P0 (Bloquant) - TERMINE
- [x] Bug MQTT M.E.S.
- [x] TRS Avance Niveau 3
- [x] Objectif TRS par machine + Alertes email

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
- `/app/test_reports/iteration_2.json` - TRS Avance base (33/33 backend, 100% frontend)
- `/app/test_reports/iteration_3.json` - TRS Target + Email notif (15/15 backend, 100% frontend)
