# FSAO Iris - GMAO

## Description
Application de GMAO complete (FastAPI + React + MongoDB).

## Fonctionnalites implementees

### Module Formation et Questionnaire (7 mars 2026)
- Sessions de formation avec slides editables et questionnaire QCM (20 questions)
- Envoi de liens ephemeres par email (validite configurable, defaut 7 jours)
- Page publique sans authentification pour les nouveaux arrivants
- Calcul automatique du score au questionnaire
- Historique des reponses pour les administrateurs
- Integration au systeme de permissions (permission "training")
- Session pre-remplie basee sur les fichiers QHSE originaux (15 slides, 20 questions)
- Upload d'images pour les slides
- Attestations formateur et employe

### Refonte systeme de mise a jour (7 mars 2026)
- Worker Python independant (/tmp/gmao_update_worker.py) - survit au git reset --hard
- Logs sauvegardes dans MongoDB en temps reel (plus de fichiers temporaires perdus)
- Endpoint /api/updates/log lit depuis MongoDB (source fiable)
- Utilise pymongo (synchrone) pour ecriture DB depuis le worker
- Reboot uniquement si toutes les etapes reussissent
- Diagnostic environnement (PATH, git, yarn, node, pip)

### Cadenas multiples LOTO
### Fix PWA, QR clone, inventaire temps reel (valides par utilisateur)

## Architecture
```
/app/backend/
  training_routes.py          # Module formation complet
  update_worker.py            # NOUVEAU - Worker independant de mise a jour
  update_service.py           # MODIFIE - Lance le worker au lieu d'un script bash
  models.py                   # Permission "training"
  server.py                   # Routes training + endpoint logs MongoDB

/app/frontend/src/
  pages/TrainingPage.jsx      # Page admin formation
  pages/TrainingPublicPage.jsx # Page publique nouveaux arrivants
```

## DB Collections (Training)
- training_sessions: { id, title, description, slides[], questionnaire[], status }
- training_links: { id, token, session_id, employee_name, employee_email, expires_at, completed }
- training_responses: { id, link_id, session_id, answers[], score, total_questions }

## DB Settings (Update)
- system_settings (key: "last_update_result"): { log_output, current_step, status, errors, success }

## Backlog
- Scanner QR integre (via camera)
- Mode inventaire rapide (scan successif)

## Credentials
- Admin: buenogy@gmail.com / Admin2024!
