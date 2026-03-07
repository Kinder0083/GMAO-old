# FSAO Iris - GMAO

## Description
Application de GMAO complete (FastAPI + React + MongoDB).

## Fonctionnalites implementees

### Module Formation et Questionnaire (7 mars 2026)
- Sessions de formation avec slides editables (titre, contenu, images) et questionnaire QCM (20 questions)
- Envoi de liens ephemeres par email (validite configurable, defaut 7 jours)
- Page publique sans authentification pour les nouveaux arrivants: presentation + questionnaire
- Calcul automatique du score au questionnaire
- Historique complet des reponses pour les administrateurs
- Integration au systeme de permissions (permission "training" ajoutee a tous les roles)
- Migration automatique des permissions pour les roles existants
- Session pre-remplie basee sur les fichiers QHSE originaux (15 slides, 20 questions)
- Upload d'images pour les slides
- Attestations formateur et employe

### Cadenas multiples LOTO (7 mars 2026)
- Cadenas par point d'isolation: chaque cadenas est lie a un point specifique (disjoncteur, vanne, etc.) ou global
- Numerotation automatique: CAD-001, CAD-002, etc.
- Type normal ou superviseur (seul le poseur ou un admin peut retirer un superviseur)
- Plusieurs cadenas par utilisateur (suppression de la limite 1/personne)
- Bouton "+ Cadenas" sur chaque point d'isolation dans la vue detail
- Dialog de pose: choix du point + type (normal/superviseur)
- Vue globale: liste des cadenas actifs avec numero, poseur, date, type
- Historique des cadenas retires (details pliable)
- Badge compteur sur chaque point d'isolation
- Deconsignation bloquee tant que des cadenas sont actifs
- Retrait par numero specifique (cadenas_numero)
- Fix casse role admin/ADMIN pour cadenas superviseur

### Fix rafraichissement temps reel inventaire (7 mars 2026)
- setServiceItems(prev => prev.map(...)) au lieu de refetch API

### Fix PWA installation Android (7 mars 2026)
- Listener beforeinstallprompt toujours enregistre

### Fix bug "clone" QR Page (7 mars 2026)
- res.clone().text() avec fallback

### Fix logs mise a jour (7 mars 2026)
- Repertoire dedie hors depot git + logs embarques dans resultat JSON

### Script mise a jour v5.0 (7 mars 2026)
- Commandes identiques au deploiement SSH manuel de l'utilisateur

### Mode Inventaire Rapide + Scanner QR (7 mars 2026)
- Scan QR continu pour comptage physique

## Architecture
```
/app/backend/
  training_routes.py          # NOUVEAU - Module formation complet
  models.py                   # MODIFIE - Permission "training" ajoutee
  roles_routes.py             # MODIFIE - Migration permission "training"
  server.py                   # MODIFIE - Enregistrement training_router

/app/frontend/src/
  pages/TrainingPage.jsx      # NOUVEAU - Page admin formation
  pages/TrainingPublicPage.jsx # NOUVEAU - Page publique nouveaux arrivants
  App.js                      # MODIFIE - Routes /training et /training-public/:token
  components/Layout/MainLayout.jsx  # MODIFIE - Menu "Formation"
  components/Layout/menuConfig.js   # MODIFIE - Icone GraduationCap
  pages/RolesManagement.jsx   # MODIFIE - Label permission "Formation"
```

## DB Collections (Training)
- `training_sessions`: { id, title, description, slides[], questionnaire[], status, created_by, created_at }
- `training_links`: { id, token, session_id, employee_name, employee_email, expires_at, completed }
- `training_responses`: { id, link_id, session_id, employee_name, answers[], score, total_questions }

## Backlog
- Scanner QR integre (via camera)
- Mode inventaire rapide (scan successif)
- Bug systeme de mise a jour (en attente logs serveur utilisateur)

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
