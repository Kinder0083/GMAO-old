# GMAO Iris - PRD

## Description
Application GMAO full-stack (Python/FastAPI + React + MongoDB) déployée sur Proxmox VM.

## Architecture
- **Backend**: Python/FastAPI, Supervisor (`gmao-iris-backend`), port 8001
- **Frontend**: React, servi par nginx (fichiers statiques `frontend/build/`)
- **Base de données**: MongoDB
- **Déploiement**: Proxmox VM à `/opt/gmao-iris`, venv dans `backend/venv`

## Travaux réalisés

### 2026-02-08/09
- Correction miniatures Tapo (go2rtc port 1984)
- Correction processus de mise à jour :
  - Restart détaché (script bash avec délai 3s + nginx reload)
  - `version.json` mis à jour dynamiquement (plus de version hardcodée)
  - `update_manager.py` et `update_service.py` lisent la version depuis `version.json`
  - `waitForBackendReady` simplifié (détecte disponibilité, pas version)
  - Backup MongoDB non-bloquant
  - Détection venv élargie (backend/venv + racine/venv)
- Nettoyage projet (~110 fichiers supprimés)
- Script d'installation v1.5.0
- Suppression onglets Caméras "Vignettes"/"Live"
- Correction import Excel "undefined" (mapping feuilles françaises)

## Causes racines du Bad Gateway
1. `supervisorctl restart all` tuait le backend AVANT l'envoi de la réponse HTTP → 502
2. Version hardcodée `"1.5.0"` vs version GitHub `"latest-xxx"` → `waitForBackendReady` bouclait 40x sans match → timeout
3. `nginx -s reload` jamais exécuté après `yarn build` → anciens assets JS servis → erreurs

### 2026-02-10
- **Page M.E.S. - Frontend complet** :
  - Liste de machines avec cartes KPI temps réel (cadence, production, TRS)
  - Dashboard machine avec 8 métriques (cp/min, cp/h, prod jour, prod 24h, arrêt actuel, arrêt jour, TRS, cadence théorique)
  - Graphique historique de cadence (Recharts LineChart) avec sélecteur de période (6h/12h/24h/7d/personnalisé)
  - Panneau d'alertes avec couleurs par type, badge compteur, marquer comme lu
  - Modal de configuration (Production, Capteur, Alertes)
  - Modal de création de machine avec sélection d'équipement GMAO
  - Bouton Simuler impulsion et Ping capteur
  - Fix: MetricCard utilise une map de couleurs statique (corrige le purge Tailwind)
  - Fix: MachineCard utilise `group` class pour le bouton supprimer
  - Fix: Graphique cadence utilise le timezone offset configurable depuis Parametres Speciaux (NTP/Fuseau Horaire)
  - Fix: Timestamps alertes appliquent aussi l'offset timezone
  - Fix: Menu sidebar - ajout entree M.E.S. dans defaultMenuItems de MainLayout.jsx
  - Tests: 100% backend (15/15) + 100% frontend

## Tâches en attente
- (P1) Bug import Excel - données importées non affichées correctement
- (P2) Page Documentation - vérifier chargement utilisateurs importés
- (P2) Refactoring response_model Pydantic retirés temporairement
- (P2) TRS avancé
- (P2) Rapports/analyses historiques M.E.S.
