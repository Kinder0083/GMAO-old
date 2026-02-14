# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour
**Date**: 2026-02-14
**Version**: 2.2.0

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
- [x] Respect planning production

### References Produites (P0) - COMPLET
- [x] CRUD admin + selecteur reference + application automatique
- [x] Lecture seule pour non-admins + journal audit

### TRS Hebdomadaire (P0) - COMPLET
- [x] Graphique histogramme evolution TRS sur 7 jours

### Reporting Historique M.E.S. (P2) - COMPLET
- [x] Page dediee /mes-reports avec filtres, graphiques, tableaux
- [x] Export Excel/PDF professionnels

### Planification Rapports Automatiques - COMPLET
- [x] APScheduler + CRUD rapports planifies + envoi email

### Refactoring response_model API - COMPLET (2026-02-14)
**Phase 1 - server.py:**
- [x] 11 modeles de reponse generiques (MessageResponse, SuccessResponse, VersionResponse, InviteMemberResponse, ValidateInvitationResponse, InventoryStatsResponse, ToggleMonitoringResponse, NotificationCountResponse, ResetPasswordAdminResponse, ResetSectionResponse, ResetAllResponse)
- [x] 103 endpoints annotes dans server.py
- [x] Correction securite: serialize_doc() supprime hashed_password, reset_token
- [x] Tests Phase 1: 18/18 passes (100%)

**Phase 2 - Routeurs externes:**
- [x] mes_routes.py: 10 endpoints (deletes + actions MES)
- [x] mqtt_routes.py: 5 endpoints (config/connect/disconnect/publish/unsubscribe)
- [x] alert_routes.py: 6 endpoints (mark read/delete/config)
- [x] sensor_routes.py: 2 endpoints (delete sensor/readings)
- [x] camera_routes.py: 1 endpoint (delete camera)
- [x] documentations_routes.py: 5 endpoints (delete poles/documents/bons/templates/forms)
- [x] chat_routes.py: 1 endpoint (delete message)
- [x] weekly_report_routes.py: 1 endpoint (delete template)
- [x] purchase_request_routes.py: 1 endpoint (delete request)
- [x] work_order_templates_routes.py: 1 endpoint (delete template)
- [x] time_tracking_routes.py: 1 endpoint (delete absence)
- [x] autorisation_routes.py: 1 endpoint (delete autorisation)
- [x] presqu_accident_routes.py: 2 endpoints (delete item/attachment)
- [x] surveillance_routes.py: 1 endpoint (delete item)
- [x] demande_arret_attachments_routes.py: 1 endpoint (delete attachment)
- [x] Tests Phase 2: 32/32 passes (100%)

**Total: 193 endpoints avec response_model** (103 server.py + 90 routeurs externes)

## Architecture

### Backend (FastAPI + MongoDB)
- `server.py`: Routes principales + 103 response_model
- `mes_service.py`: Service M.E.S. complet
- `mes_routes.py`: Routes M.E.S. + 10 response_model
- `models.py`: Modeles Pydantic + 11 modeles de reponse generiques

### Frontend (React)
- `MESPage.jsx`: Page principale M.E.S.
- `MESReportsPage.jsx`: Reporting historique + rapports planifies

## Prioritized Backlog

### P1 (Important)
- [ ] Fix import Excel (donnees importees non fonctionnelles)
- [ ] Documentation page users (lie au bug Excel)

### P2 (Nice to have)
- [x] ~~Reporting historique M.E.S.~~ DONE
- [x] ~~Planification rapports~~ DONE
- [x] ~~Refactoring response_model~~ DONE (Phase 1 + 2)

## Test Reports
- iteration_2.json - TRS Avance base (33/33)
- iteration_3.json - TRS Target + Email (15/15)
- iteration_4.json - Product refs + TRS weekly (17/17)
- iteration_5.json - Response model Phase 1 (18/18) + Security fix
- iteration_6.json - Response model Phase 2 (32/32)

## Credentials
- admin@test.com / Admin123!
- buenogy@gmail.com / Admin2024!
