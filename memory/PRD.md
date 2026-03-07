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

### Fix bug "clone" QR Page (7 mars 2026)
- Bug: "Failed to execute 'clone' on 'Response': response body is already used"
- Cause: conflit entre le Service Worker et la lecture directe du body de la reponse
- Fix: utilisation de res.clone().text() avec fallback sur res.text() dans fetchPublic/fetchAuth

### Fix logs mise a jour perdus apres reboot (7 mars 2026)
- Bug: apres un reboot, les logs de mise a jour n'etaient plus disponibles
- Cause: /var/log inaccessible (permissions), /tmp efface au reboot
- Fix: repertoire dedie hors du depot git ($APP_ROOT/../gmao-iris-logs/) + contenu des logs embarque dans le fichier resultat JSON + copie dans multiples emplacements
- Le endpoint /api/updates/log cherche maintenant dans: repertoire dedie > /var/log > DB > /tmp

### Mode Inventaire Rapide (7 mars 2026)
- Bouton "Inventaire Rapide" (vert emeraude) sur la page Inventaire
- Mode plein ecran sombre pour usage mobile
- Scan QR continu -> saisir quantite comptee -> confirmer -> scan suivant
- Ajustement automatique du stock + indicateur d'ecart visuel
- Sidebar temps reel + ecran de resume final

### Scanner QR Code integre (7 mars 2026)
- Bouton "Scanner QR" sur la page Inventaire
- Navigation automatique vers la fiche de l'article/equipement scanne

### Fix systeme de mise a jour - update_log.txt (7 mars 2026)
- Suppression du fichier update_log.txt du tracking Git (contenait l'ancien format)
- Nettoyage .gitignore

### Notifications push, Signalement -> DA, PWA, Inventaire par service, QR Codes, LOTO
- Voir changelog precedent

## IMPORTANT - Deploiement
L'utilisateur doit faire "Save to Github" puis deployer manuellement via SSH.
Les logs de mise a jour sont maintenant dans $APP_ROOT/../gmao-iris-logs/ (hors du depot git).

## Backlog
- P1: Bug rafraichissement temps reel inventaire (WebSocket recu mais UI pas mise a jour)
- P1: Bug installation PWA Android (a verifier apres deploiement)
- P2: Cadenas multiples LOTO

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
