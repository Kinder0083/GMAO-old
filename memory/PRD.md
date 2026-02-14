# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour
**Date**: 2026-02-14
**Version**: 2.2.0

## Problem Statement
Application GMAO complete avec module M.E.S. (Manufacturing Execution System) pour le monitoring de production en temps reel.

## Core Requirements

### M.E.S. Module (P0) - COMPLET
- [x] Backend service + API routes + Frontend UI
- [x] MQTT real-time data processing
- [x] TRS Avance Niveau 3 (Disponibilite x Performance x Qualite)
- [x] Planning production configurable
- [x] Rebuts: declaration, motifs, historique
- [x] Objectif TRS + Alertes Email
- [x] References Produites (CRUD admin + selecteur)
- [x] TRS Hebdomadaire (histogramme)

### Reporting Historique M.E.S. - COMPLET
- [x] Page dediee /mes-reports avec filtres, graphiques, tableaux
- [x] Export Excel/PDF + Rapports planifies automatiques (APScheduler)

### Refactoring response_model API - COMPLET
**Phase 1 (server.py):** 103 endpoints annotes + 11 modeles de reponse + correction securite serialize_doc
**Phase 2 (routeurs externes):** 90 endpoints annotes dans 15 fichiers
**Total: 193 endpoints avec response_model**
- Tests Phase 1: 18/18 (100%) | Phase 2: 32/32 (100%)

### Documentation Swagger/OpenAPI Enrichie - COMPLET (2026-02-14)
- [x] Configuration FastAPI enrichie (titre, description, version 2.2.0, contact, licence)
- [x] 55 tags avec descriptions en francais couvrant tous les modules
- [x] 571 endpoints avec summaries et descriptions
- [x] Codes d'erreur documentes (401, 403, 404, 422, 500) avec exemples
- [x] Templates d'erreurs reutilisables (STANDARD_ERRORS, CRUD_ERRORS, AUTH_ERRORS)
- [x] Protection Swagger UI et ReDoc par HTTP Basic Auth (admin/atlas2024)
- [x] Schema OpenAPI public a /api/openapi.json
- [x] Fichier openapi_config.py: description API, tags ordonnes, templates erreurs
- [x] MES routes: descriptions detaillees + exemples pour chaque endpoint
- [x] Tests: 18/18 passes (100%), aucune regression

## Architecture

### Backend (FastAPI + MongoDB)
- `server.py`: Routes principales + 103 response_model + tags + summaries
- `openapi_config.py`: Configuration OpenAPI (description, 55 tags, templates erreurs)
- `mes_service.py`: Service M.E.S. complet
- `mes_routes.py`: Routes M.E.S. enrichies avec descriptions
- `models.py`: Modeles Pydantic + 11 modeles de reponse generiques

### Frontend (React)
- `MESPage.jsx`: Page principale M.E.S.
- `MESReportsPage.jsx`: Reporting historique + rapports planifies

### Acces Documentation
- Swagger UI: `/api/docs` (HTTP Basic Auth: admin/atlas2024)
- ReDoc: `/api/redoc` (HTTP Basic Auth: admin/atlas2024)
- OpenAPI JSON: `/api/openapi.json` (public)

## Prioritized Backlog

### P1 (Important)
- [ ] Fix import Excel (donnees importees non fonctionnelles)
- [ ] Documentation page users (lie au bug Excel)

## Test Reports
- iteration_2.json - TRS Avance (33/33)
- iteration_3.json - TRS Target + Email (15/15)
- iteration_4.json - Product refs + TRS weekly (17/17)
- iteration_5.json - Response model Phase 1 (18/18) + Security fix
- iteration_6.json - Response model Phase 2 (32/32)
- iteration_7.json - Swagger/OpenAPI documentation (18/18)

## Credentials
- API: admin@test.com / Admin123!
- API: buenogy@gmail.com / Admin2024!
- Swagger Docs: admin / atlas2024
