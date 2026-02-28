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
- Declencheurs automatiques integres dans creation/update OT, equipements HORS_SERVICE, chat prive
- Tests: 17/17 passes (iteration_58.json)

### 13. Mise a jour documentation - TERMINE (Fev 2026)
- README.md et manual_default_content.json mis a jour

### 14. Bug Fix: Systeme de mise a jour en boucle - TERMINE (Fev 2026)
- **Cause racine** : `update_manager.py` ligne 17 avait `self.github_repo = "FSAO"` au lieu de `"GMAO"` (meme bug recurrent que #11, cette fois dans un fichier different)
- L'API GitHub retournait 404 car le repo "FSAO" n'existe pas, l'endpoint `/api/updates/check` retournait toujours `update_available: false`
- **Fix** : Correction de `self.github_repo = "GMAO"` dans update_manager.py
- **Fix additionnel** : Route en double `/api/updates/check` renommee en `/api/updates/check-version` pour eviter conflit entre update_manager et update_service

### 15. Previsualisation des pieces jointes dans le navigateur - TERMINE (Fev 2026)
- **Backend** : Ajout du parametre `?preview=true` sur 6 endpoints de telechargement (work-orders, preventive-maintenance, improvements, chat, presqu-accidents, demandes-arret)
- Quand `preview=true` : `Content-Disposition: inline` (affichage dans le navigateur)
- Quand absent ou false : `Content-Disposition: attachment` (telechargement force)
- **Frontend** : Ajout d'un bouton Eye (previsualiser) sur tous les composants AttachmentsList (WorkOrders, shared, Improvements)
- **Chat** : Clic sur fichier previewable ouvre dans un nouvel onglet, menu contextuel avec option "Previsualiser"
- Types previewables : image/*, application/pdf, video/*, text/*
- Tests: 11/11 passes (iteration_59.json)

### 16. Mise a jour documentation (P1) - TERMINE (Fev 2026)
- README.md : ajout mention previsualisation pieces jointes, nettoyage tokens push
- manual_default_content.json : section "Joindre des Fichiers" enrichie + nouveau chapitre "Notifications Push Mobile"

### 17. Galerie de pieces jointes avec miniatures et lightbox - TERMINE (Fev 2026)
- Nouveau composant `components/shared/AttachmentGallery.jsx` reutilisable
- **Miniatures** : grille de miniatures cliquables dans la fiche (images = vraie preview, PDF/video/texte = icone stylisee)
- **Lightbox** : overlay plein ecran (fond sombre, navigation fleches, compteur, nom de fichier, fermeture X/Escape/clic exterieur)
- Support complet : images (img), PDF (iframe), videos (lecteur avec controles), texte (iframe)
- Navigation clavier : Escape, ArrowLeft, ArrowRight
- Integre dans tous les modules : OT, ameliorations, presqu'accidents, maintenance preventive, demandes d'arret (via shared + WO + Improvements AttachmentsList)
- Tests: 8/8 backend + frontend 100% (iteration_60.json)

### 18. Bug Fix: Lightbox blob URLs revoquees prematurement - TERMINE (Fev 2026)
- Le cleanup du useEffect dans AttachmentGallery.jsx revoquait les blob URLs a chaque changement de reference de `attachments`
- Les miniatures restaient visibles (navigateur garde les images en memoire) mais le lightbox echouait car il creait un nouvel element img avec une URL revoquee
- Fix: Separation du cleanup dans un useEffect a deps vides (unmount only) + ajout mountedRef pour eviter les mises a jour d'etat apres demontage
- Tests: 15/15 passes (iteration_61.json)

### 19. Bug Fix: Systeme de mise a jour - chemins hardcodes - TERMINE (Fev 2026)
- 8 occurrences de `/opt/gmao-iris` hardcodees dans update_manager.py empechaient le systeme de fonctionner si l'installation etait dans un autre repertoire
- Fix: Ajout de `self.app_root = str(Path(__file__).parent.parent)` et remplacement de toutes les occurrences
- Fonctions corrigees: get_current_commit, create_backup, apply_update, get_git_history, rollback_to_commit
- Tests: API /api/updates/current et /api/updates/check fonctionnels (iteration_61.json)

## ATTENTION - Point de vigilance recurrent
Le repo GitHub s'appelle **GMAO** (PAS FSAO). Le nom est maintenant centralise dans `backend/.env` :
- `GITHUB_USER=Kinder0083`
- `GITHUB_REPO=GMAO`
- `GITHUB_BRANCH=main`
Les fichiers `update_service.py` et `update_manager.py` lisent ces variables via `os.environ.get()`.

## Backlog
- Aucune tache en attente

## Taches futures
- Notifications push via PWA (reporte par l'utilisateur)

## Credentials
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!
