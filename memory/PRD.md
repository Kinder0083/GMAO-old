# FSAO Iris - GMAO

## Description
Application de GMAO complete (FastAPI + React + MongoDB).

## Fonctionnalites implementees

### Extraction IA Presqu'accidents (7 mars 2026)
- Bouton "Extraction IA" dans la section Presqu'accident
- Parse fichiers Excel .xls (xlrd) et .xlsx (openpyxl)
- Extraction automatique: numero, service, date, lieu, categorie, description, mesures immediates
- Conversion dates Excel (format numerique) en YYYY-MM-DD
- Mapping automatique des services (PRODUCTION, MAINTENANCE, QUALITE, etc.)
- Dialog de selection avec checkboxes pour choisir les items a importer
- Import en masse via l'API existante createItem

### Module Formation et Questionnaire (7 mars 2026)
- Sessions de formation avec slides editables et questionnaire QCM (20 questions)
- Envoi de liens ephemeres par email
- Page publique sans authentification pour les nouveaux arrivants
- Historique des reponses, calcul automatique du score
- Integration au systeme de permissions

### Refonte systeme de mise a jour (7 mars 2026)
- Worker Python independant (update_worker.py) copie dans /tmp/ avant execution
- Logs sauvegardes dans MongoDB en temps reel via pymongo
- Endpoint /api/updates/log lit depuis MongoDB

## Architecture
```
/app/backend/
  presqu_accident_routes.py   # MODIFIE - Endpoint /ai/extract
  training_routes.py          # Module formation
  update_worker.py            # Worker independant mise a jour
  update_service.py           # Lance le worker
  server.py                   # Routes + endpoint logs MongoDB

/app/frontend/src/
  pages/PresquAccidentList.jsx # MODIFIE - Bouton Extraction IA + dialog
  pages/TrainingPage.jsx       # Page admin formation
  pages/TrainingPublicPage.jsx # Page publique nouveaux arrivants
```

## Backlog
- Scanner QR integre (via camera)
- Mode inventaire rapide (scan successif)

## Credentials
- Admin: buenogy@gmail.com / Admin2024!
