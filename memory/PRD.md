# FSAO Iris - Product Requirements Document

## Probleme original
Application FSAO (Fonctionnement des Services Assistee par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de donnees**: MongoDB (gmao_iris)
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth
- **Depot GitHub**: https://github.com/Kinder0083/GMAO (le repo garde le nom GMAO)
- **Notifications push**: Expo Push Service (notifications.py)

## Fonctionnalites implementees

### 1-9. Voir sessions precedentes (tout TERMINE)

### 10. Renommage GMAO -> FSAO - TERMINE (Fev 2026)
- Textes utilisateur renommes partout (frontend, backend, prompts IA, docs)
- Noms techniques preserves : DB gmao_iris, services gmao-iris-backend, repo GitHub GMAO

### 11. Bug Fix: Script de mise a jour casse - TERMINE (Fev 2026)
- **Cause racine** : Le renommage global GMAO -> FSAO a aussi change `self.github_repo = "GMAO"` en `"FSAO"` dans update_service.py
- **Fix** : Restauration de `self.github_repo = "GMAO"` (nom reel du depot GitHub)

### 12. Notifications push mobile - TERMINE (Fev 2026)
- Nouveau fichier `backend/notifications.py` : service Expo Push
- 3 endpoints API : `/api/push-notifications/register`, `/unregister`, `/test`
- Declencheurs automatiques integres dans :
  - Creation d'OT avec assignation -> notification au technicien assigne
  - Mise a jour d'OT : changement de statut -> notification createur + assigne
  - Mise a jour d'OT : reassignation -> notification au nouveau assigne
  - Equipement passe HORS_SERVICE -> notification tous techniciens et admins
  - Messages prives dans le chat -> notification aux destinataires
- Index MongoDB crees au demarrage sur `device_tokens`
- Tests: 17/17 passes (iteration_58.json)

### 13. Mise a jour documentation - TERMINE (Fev 2026)
- README.md mis a jour : notifications push, architecture, endpoints API, collections MongoDB
- manual_default_content.json : mot-cle "fsao" ajoute

## Backlog
- Aucune tache en attente

## Taches futures
- Notifications push via PWA (reporte par l'utilisateur)

## Credentials
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!
