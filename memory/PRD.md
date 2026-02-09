# GMAO Iris - PRD

## Description
Application GMAO full-stack (Python/FastAPI + React + MongoDB) déployée sur Proxmox VM.

## Travaux réalisés

### Session précédente
- Correction miniatures Tapo (go2rtc port 1984)

### 2026-02-08/09
- Correction processus de mise à jour (backup non-bloquant, détection venv élargie)
- Correction Bad Gateway lors mise à jour (restart détaché avec délai 3s)
- Nettoyage projet (~110 fichiers supprimés)
- Script installation unifié v1.5.0 (gmao-iris-install.sh)
- Suppression onglets Caméras "Vignettes" et "Live"
- Correction import Excel "undefined" :
  - Frontend : lecture `response.data.stats` au lieu de `response.data` directement
  - Backend : ajout mapping feuilles françaises (Sheet1, Tâches, Inventaire, Pieces, Fournisseurs, Demandeschat, User, Sensor)
  - Testé avec fichier utilisateur : 168 éléments importés avec succès

## Tâches restantes
Aucune tâche en attente.
