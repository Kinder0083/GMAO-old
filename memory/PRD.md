# FSAO Iris - GMAO

## Description
Application de GMAO complete (FastAPI + React + MongoDB).

## Fonctionnalites implementees (7 mars 2026)

### Fix rafraichissement temps reel inventaire (P1)
- Bug: la quantite ne se mettait pas a jour visuellement via WebSocket
- Cause racine: useRef + refetch API = stale closure dans le listener WebSocket
- Fix: setServiceItems(prev => prev.map(item => match ? {...item, quantite: data.quantity_after} : item))
  La forme fonctionnelle du setter React recoit toujours le state le plus recent = zero stale closure
- Teste et confirme: quantite MAJ instantanement dans l'UI sans refresh manuel

### Fix PWA installation Android (P1)
- Cause: useInstallPrompt() faisait un return premature empechant beforeinstallprompt
- Fix: listener TOUJOURS enregistre + getInstalledRelatedApps()

### Fix bug "clone" QR Page
- Fix: res.clone().text() avec fallback

### Fix logs mise a jour perdus apres reboot
- Fix: repertoire dedie hors depot git + contenu logs embarque dans resultat JSON

### Mode Inventaire Rapide
- Scan QR continu pour comptage physique avec ajustements automatiques

### Scanner QR Code integre
- Navigation automatique vers la fiche de l'article/equipement scanne

### Fix systeme de mise a jour - update_log.txt
- Suppression du fichier update_log.txt du tracking Git

## Backlog
- P2: Cadenas multiples LOTO

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
