# FSAO Iris - GMAO (Gestion de Maintenance Assistee par Ordinateur)

## Description
Application de GMAO complete incluant gestion des ordres de travail, maintenance preventive, ameliorations, consignations LOTO, inventaire par service, equipements, zones, dashboard, journal d'audit, chat, systeme de mise a jour, import/export, sauvegardes, QR codes articles et equipements.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT
- **Temps reel**: WebSockets
- **Notifications**: Web Push (pywebpush + VAPID)
- **LLM**: LiteLLM proxy
- **QR Scanner**: html5-qrcode

## Fonctionnalites implementees

### Fix PWA installation Android (7 mars 2026)
- Bug: l'installation PWA echouait silencieusement sur Android
- Cause: useInstallPrompt() faisait un return premature quand display-mode:standalone etait detecte
  empechant l'enregistrement du listener beforeinstallprompt
- Fix: listener TOUJOURS enregistre + getInstalledRelatedApps() + beforeinstallprompt force isInstalled=false

### Fix bug "clone" QR Page (7 mars 2026)
- Fix: res.clone().text() avec fallback dans fetchPublic/fetchAuth

### Fix logs mise a jour perdus apres reboot (7 mars 2026)
- Fix: repertoire dedie hors depot git + contenu logs embarque dans resultat JSON

### Mode Inventaire Rapide (7 mars 2026)
- Scan QR continu pour comptage physique avec ajustements automatiques

### Scanner QR Code integre (7 mars 2026)
- Navigation automatique vers la fiche de l'article/equipement scanne

### Fix systeme de mise a jour - update_log.txt (7 mars 2026)
- Suppression du fichier update_log.txt du tracking Git

### Notifications push, Signalement -> DA, PWA, Inventaire par service, QR Codes, LOTO
- Voir changelog precedent

## IMPORTANT - Deploiement
L'utilisateur doit faire "Save to Github" puis deployer manuellement via SSH.
Apres deploiement, vider le cache Chrome sur mobile pour que le nouveau SW soit installe.

## Backlog
- P1: Bug rafraichissement temps reel inventaire (WebSocket recu mais UI pas mise a jour)
- P2: Cadenas multiples LOTO

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
