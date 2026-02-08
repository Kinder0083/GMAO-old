# GMAO Iris - PRD

## Description
Application GMAO (Gestion de la Maintenance Assistée par Ordinateur) full-stack avec backend Python/FastAPI et frontend React, déployée sur Proxmox VM.

## Architecture
- **Backend**: Python/FastAPI (`/app/backend/server.py` + services)
- **Frontend**: React (`/app/frontend/`)
- **Base de données**: MongoDB
- **Déploiement**: Proxmox VM à `/opt/gmao-iris`, venv Python, nginx, supervisorctl

## Fonctionnalités principales
- Gestion d'équipements et maintenance préventive
- Bons de travail, planning
- Caméras (Frigate/go2rtc)
- IoT/MQTT
- Système de mise à jour automatique
- Gestion d'utilisateurs et rôles

## Travaux réalisés

### 2026-02-08
- **Correction miniatures Tapo** (DONE): Remplacement de la logique de récupération des miniatures caméra par un appel direct au service go2rtc sur le port 1984.
- **Correction processus de mise à jour** (DONE): 
  - Remplacé `update_service.py` par la version fonctionnelle fournie par l'utilisateur
  - Corrigé le backup MongoDB bloquant → rendu non-bloquant (si mongodump échoue, la mise à jour continue)
  - Ajouté la détection du venv Python à la racine (`/opt/gmao-iris/venv`) en plus de `backend/venv`
  - Testé avec succès : backup, pip install, yarn install, yarn build, redémarrage des services

## Tâches restantes
- **P1**: Nettoyage du projet (suppression fichiers inutiles/obsolètes)
- **P1**: Script d'installation unifié (`gmao-iris-v1.1.8-install-auto.sh`)
- **P2**: Préparation pour GitHub
