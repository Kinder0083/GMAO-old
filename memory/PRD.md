# GMAO IRIS - PRD (Product Requirements Document)

## Problème Original
Application GMAO full-stack avec React/FastAPI/MongoDB, assistant IA "Adria" et modules Surveillance/Fournisseurs.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **IA**: Gemini 2.5 Flash (via emergentintegrations)

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Système de mise à jour
### Flux de mise à jour (corrigé Feb 2026)
1. Backup MongoDB (mongodump)
2. Sauvegarde des fichiers .env (backend + frontend)
3. `git fetch origin` + `git reset --hard origin/main` (remplace l'ancien `git pull`)
4. Restauration des fichiers .env
5. `pip install -r requirements.txt` (via venv)
6. `yarn install` + `yarn build` (frontend)
7. Redémarrage services (supervisorctl + nginx reload)

### Pourquoi git reset --hard au lieu de git pull?
- Emergent "Save to Github" peut réécrire l'historique Git (force push)
- `git pull` tente une fusion → retourne "Already up to date" même si les fichiers sont différents
- `git reset --hard` écrase le code local = code distant garanti

### Journal de mise à jour
- Chaque étape enregistrée: commande, stdout/stderr, code retour, durée
- Résumé avec compteurs (OK/warnings/erreurs)
- Frontend affiche les logs dans un terminal-like

## Ce qui a été implémenté
- [x] Ordres de Travail (CRUD), Assistant Adria (CREATE/MODIFY/CLOSE/ASSIGN_OT)
- [x] Plan de Surveillance: CRUD, import IA PDF, contrôles récurrents, WebSocket
- [x] Fournisseurs: modèle enrichi (12 champs), extraction IA (Excel/PDF/images), formulaire 4 onglets
- [x] Système de mise à jour: git fetch+reset, journal détaillé, sauvegarde .env

## Backlog
- P2: Adria - Clôture OT + résumé d'intervention en commande vocale
- P2: Validation robustesse extraction IA (PDF complexe 8+ contrôles)
