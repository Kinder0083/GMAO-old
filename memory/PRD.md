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

### Scanner QR Code integre (7 mars 2026)
- Bouton "Scanner QR" sur la page Inventaire
- Utilise la camera du mobile/PC pour scanner les QR codes
- Supporte les QR codes d'articles (/qr-inventory/{id}) et d'equipements (/qr/{id})
- Navigation automatique vers la fiche de l'article/equipement scanne
- Composant: QRScannerDialog.jsx avec html5-qrcode

### Fix systeme de mise a jour (7 mars 2026)
- CAUSE RACINE TROUVEE: update_log.txt etait traque par Git et contenait l'ancien format [1/6]
- L'endpoint de lecture des logs lisait ce fichier en fallback, montrant l'ancien contenu
- CORRECTION: Suppression de update_log.txt du tracking Git, nettoyage .gitignore, suppression du fallback dans l'endpoint
- Le script de mise a jour v4.0 utilise le format [ETAPE x/7] et ecrit dans /var/log/

### Notifications push pour signalement de besoin QR (7 mars 2026)
- Si l'article appartient a un service avec un responsable -> notification push au responsable
- Sinon (Non classe ou pas de responsable) -> notification push a tous les admins

### WebSocket temps reel pour inventaire QR (7 mars 2026)
- Broadcast automatique apres mouvement de stock
- Toast de notification en temps reel

### Signalement de besoin -> Demande d'Achat (7 mars 2026)
- Cree automatiquement une Demande d'Achat (DA-YYYY-XXXXX)

### PWA installation corrigee (7 mars 2026)
- Icones carrees 192x192 et 512x512
- Fetch handler dans sw.js pour Chrome Android

### Inventaire par service, QR Codes, LOTO
- Voir changelog precedent

## IMPORTANT - Deploiement
L'utilisateur doit faire "Save to Github" puis deployer manuellement via SSH.
Le fichier update_log.txt a ete supprime du tracking Git pour eviter de montrer d'anciens logs.

## Backlog
- P1: Bug rafraichissement temps reel inventaire (WebSocket recu mais UI pas mise a jour)
- P1: Bug installation PWA Android (a verifier apres deploiement)
- P2: Cadenas multiples LOTO
- P3: Notifications push mobile (Expo)

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
