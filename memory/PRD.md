# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour
**Date**: 2026-02-14
**Version**: 1.9.0

## Problem Statement
Application GMAO complete avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps reel.

## Core Requirements

### M.E.S. Module (P0) - COMPLET
- [x] Backend service + API routes + Frontend UI
- [x] MQTT real-time data processing (fixed race condition)
- [x] Delete all alerts, manual M.E.S. chapter

### TRS Avance Niveau 3 (P0) - COMPLET
- [x] TRS = Disponibilite x Performance x Qualite
- [x] Planning production configurable (24h ou horaires, jours)
- [x] Rebuts: declaration, motifs predefinis/libres, historique

### Objectif TRS + Alertes Email (P0) - COMPLET
- [x] trs_target par machine + alerte TRS_BELOW_TARGET
- [x] Notifications email configurables par machine
- [x] Respect planning production (pas d'alertes hors horaires)

### References Produites (P0) - COMPLET
- [x] Collection `mes_product_references` partagees entre machines
- [x] CRUD admin (creer/modifier/supprimer avec dialogues de confirmation)
- [x] Selecteur reference en haut du modal Parametres
- [x] Application automatique des parametres reference sur la machine
- [x] Lecture seule pour non-admins (champs desactives/gris)
- [x] Journal d'audit pour changements de reference

### TRS Hebdomadaire (P0) - COMPLET
- [x] Graphique evolution TRS sur 7 jours par machine
- [x] **CORRIGE**: Affichage en histogramme (barres) au lieu de courbe
- [x] Barres: TRS, Disponibilite, Performance, Qualite
- [x] Ligne de reference objectif TRS
- [x] Exclusion jours non-production

### Reporting Historique M.E.S. (P2) - COMPLET (2026-02-14)
- [x] Page dediee `/mes-reports` avec menu navigation
- [x] Filtres: machine(s), type rapport, periode (predefinie/personnalisee)
- [x] Types de rapports: TRS, Production, Arrets, Rebuts, Alertes, Complet
- [x] Graphiques interactifs (Recharts): barres, courbes, camemberts
- [x] Tableaux recapitulatifs par section
- [x] Export Excel (openpyxl) multi-feuilles stylisees
- [x] Export PDF (reportlab) avec mise en page professionnelle
- [x] Rapports par machine individuelle OU consolides toutes machines

## Architecture

### Backend (FastAPI + MongoDB)
- `mes_service.py`: TRS avance, rebuts, references, alertes email, planning, historique TRS, **reporting**
- `mes_routes.py`: Toutes les routes M.E.S. + product-references + trs-history + **reports/data, reports/export/excel, reports/export/pdf**
- `mqtt_manager.py`: Gestionnaire MQTT
- `email_service.py`: Service SMTP Gmail

### Frontend (React)
- `MESPage.jsx`: Page principale M.E.S.
- `MESReportsPage.jsx`: **NEW** Page reporting avec graphiques et exports

### Collections MongoDB (M.E.S.)
- `mes_machines`, `mes_pulses`, `mes_cadence_history`, `mes_alerts`
- `mes_reject_reasons`, `mes_rejects`
- `mes_product_references`

## Key API Endpoints
- Machines CRUD: GET/POST/PUT/DELETE /api/mes/machines
- Metrics: GET /api/mes/machines/{id}/metrics
- Reject reasons CRUD: /api/mes/reject-reasons
- Rejects: POST/GET/DELETE /api/mes/machines/{id}/rejects
- Product refs CRUD: GET/POST/PUT/DELETE /api/mes/product-references (admin)
- Select ref: POST /api/mes/machines/{id}/select-reference
- TRS history: GET /api/mes/machines/{id}/trs-history?days=7
- Alerts: GET /api/mes/alerts, DELETE /api/mes/alerts/all
- **Reports**: POST /api/mes/reports/data (JSON), /api/mes/reports/export/excel, /api/mes/reports/export/pdf

## Prioritized Backlog

### P1 (Important)
- [ ] Fix import Excel
- [ ] Documentation page users

### P2 (Nice to have)
- [x] ~~Reporting historique M.E.S. avance (exports)~~ DONE
- [ ] Refactoring response_model API

## Test Reports
- iteration_2.json - TRS Avance base (33/33)
- iteration_3.json - TRS Target + Email (15/15)
- iteration_4.json - Product refs + TRS weekly (17/17)
- iteration_5.json - References + TRS chart tests

## Credentials
- admin@test.com / Admin123!
- buenogy@gmail.com / Admin2024!
