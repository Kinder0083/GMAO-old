# FSAO Iris - Product Requirements Document

## Problème original
Application FSAO (Fonctionnement des Services Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB (gmao_iris)
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth
- **Dépôt GitHub**: https://github.com/Kinder0083/GMAO (le repo garde le nom GMAO)

## Fonctionnalités implémentées

### 1-9. Voir sessions précédentes (tout TERMINÉ)

### 10. Renommage GMAO → FSAO - TERMINÉ (Fév 2026)
- Textes utilisateur renommés partout (frontend, backend, prompts IA, docs)
- Noms techniques préservés : DB gmao_iris, services gmao-iris-backend, repo GitHub GMAO

### 11. Bug Fix: Script de mise à jour cassé - TERMINÉ (Fév 2026)
- **Cause racine** : Le renommage global GMAO → FSAO a aussi changé `self.github_repo = "GMAO"` en `"FSAO"` dans update_service.py (ligne 23)
- Le script de mise à jour pointait vers `https://github.com/Kinder0083/FSAO` au lieu de `https://github.com/Kinder0083/GMAO.git`
- **Fix** : Restauration de `self.github_repo = "GMAO"` (nom réel du dépôt GitHub)

## Backlog
- Aucune tâche en attente

## Credentials
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!
