# GMAO Iris - PRD

## Description
Application GMAO (Gestion de la Maintenance Assistée par Ordinateur) full-stack avec backend Python/FastAPI et frontend React, déployée sur Proxmox VM.

## Architecture
- **Backend**: Python/FastAPI (`/app/backend/server.py` + services)
- **Frontend**: React (`/app/frontend/`)
- **Base de données**: MongoDB
- **Déploiement**: Proxmox VM à `/opt/gmao-iris`, venv Python, nginx, supervisorctl

## Travaux réalisés

### Session précédente
- **Correction miniatures Tapo** (DONE): Remplacement de la logique de récupération des miniatures caméra par un appel direct au service go2rtc sur le port 1984.

### 2026-02-08
- **Correction processus de mise à jour** (DONE):
  - Remplacé `update_service.py` par la version fonctionnelle fournie par l'utilisateur
  - Backup MongoDB rendu non-bloquant (continue même si mongodump échoue)
  - Détection du venv Python élargie (racine + backend/venv)
  - Testé : backup, pip install, yarn install, yarn build, redémarrage services

- **Nettoyage du projet** (DONE):
  - Supprimé 56 fichiers .md obsolètes à la racine (gardé README.md, CHANGELOG.md)
  - Supprimé 12 scripts Python one-off à la racine
  - Supprimé 38 scripts backend one-off (add_*, build_*, generate_*, migrate_*, test_*, etc.)
  - Supprimé fichiers backup (.bak, .backup) et JSON de contenu inutilisés
  - Supprimé dossiers obsolètes (deployment-proxmox, tests, node_modules racine)
  - Nettoyé .gitignore corrompu (remplacé par version propre)

- **Script d'installation unifié** (DONE):
  - Mis à jour header v1.1.8 → v1.5.0
  - Supprimé référence à `init_manual_on_install.py` (fichier supprimé)
  - Supprimé création inline de `category_mapping.py` (déjà dans le repo)
  - Mis à jour `post-update.sh` pour détecter le venv aux deux emplacements
  - Simplifié section SMTP (configurer depuis l'UI)
  - Renommé en `gmao-iris-install.sh`

- **Préparation pour GitHub** (DONE):
  - .gitignore nettoyé et corrigé
  - Projet prêt à être poussé via "Save to Github"

## Structure finale
```
/app/
  README.md
  CHANGELOG.md
  gmao-iris-install.sh
  .gitignore
  updates/version.json
  backend/ (71 fichiers .py + requirements.txt)
  frontend/ (React app)
  data/cameras/
```

## Tâches restantes
Aucune tâche en attente. Le projet est prêt pour GitHub.
