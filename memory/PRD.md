# GMAO Iris - Product Requirements Document

## Problème original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth

## Fonctionnalités implémentées

### 1. Correspondance Intelligente du Plan de Surveillance - TERMINÉ
### 2. Rapport Surveillance enrichi - TERMINÉ
### 3. Export PDF/Excel du Rapport Surveillance - TERMINÉ
### 4. Suppression du Plan de Surveillance - TERMINÉ
### 5. Refactoring create_batch_from_ai - TERMINÉ

### 6. Bug Fix: Assignation OT via Adria - TERMINÉ (Fév 2026)
- Fix 3 couches: Prompt IA + Fallback frontend + Backend _id filter

### 7. Bug Fix: Crash GET /work-orders - TERMINÉ (Fév 2026)
- Normalisation des statuts minuscules

### 8. Bug Fix: Rafraîchissement UI après correspondance manuelle - TERMINÉ (Fév 2026)

### 9. Bug Fix: Modification OT via Adria (description) - TERMINÉ (Fév 2026)
- `findWorkOrder`: Priorisation de recherche (numéro exact > numéro partiel > id > titre)
- `handleModifyOT`: Logs console, validation payload non-vide, meilleur feedback
- Testé E2E dans le navigateur : description correctement persistée

## Backlog
- Aucune tâche en attente

## Credentials
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!
