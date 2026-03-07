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

### Mode Inventaire Rapide (7 mars 2026)
- Bouton "Inventaire Rapide" (vert emeraude) sur la page Inventaire
- Mode plein ecran sombre (theme slate-900) pour usage mobile
- Scan QR continu : scanner un article -> saisir quantite comptee -> confirmer -> scanner le suivant
- Ajustement automatique du stock (ajout/retrait) via motif "Comptage physique (inventaire rapide)"
- Boutons +/- pour ajuster facilement la quantite
- Indicateur d'ecart visuel (conforme/ajout/retrait) avec couleurs
- Bouton "Passer" pour ignorer un article
- Detection des articles deja comptes dans la session
- Sidebar laterale (desktop) avec liste des articles comptes en temps reel
- Ecran de resume final : conformes / ajustes / passes avec detail par article
- Possibilite de relancer une nouvelle session
- Composant: QuickInventoryMode.jsx

### Scanner QR Code integre (7 mars 2026)
- Bouton "Scanner QR" sur la page Inventaire
- Utilise la camera du mobile/PC pour scanner les QR codes
- Supporte les QR codes d'articles (/qr-inventory/{id}) et d'equipements (/qr/{id})
- Navigation automatique vers la fiche de l'article/equipement scanne

### Fix systeme de mise a jour (7 mars 2026)
- CAUSE RACINE TROUVEE: update_log.txt etait traque par Git et contenait l'ancien format [1/6]
- CORRECTION: Suppression du tracking Git, nettoyage .gitignore, suppression fallback endpoint

### Notifications push pour signalement de besoin QR
- Notification push au responsable du service ou aux admins

### Signalement de besoin -> Demande d'Achat
- Cree automatiquement une Demande d'Achat (DA-YYYY-XXXXX)

### PWA, Inventaire par service, QR Codes, LOTO
- Voir changelog precedent

## IMPORTANT - Deploiement
L'utilisateur doit faire "Save to Github" puis deployer manuellement via SSH.
Le fichier update_log.txt a ete supprime du tracking Git pour eviter de montrer d'anciens logs.

## Backlog
- P1: Bug rafraichissement temps reel inventaire (WebSocket recu mais UI pas mise a jour)
- P1: Bug installation PWA Android (a verifier apres deploiement)
- P2: Cadenas multiples LOTO

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
