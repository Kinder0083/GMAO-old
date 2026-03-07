# FSAO Iris - GMAO

## Description
Application de GMAO complete (FastAPI + React + MongoDB).

## Fonctionnalites implementees

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

## Backlog
- Aucun item P0/P1/P2 restant

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
