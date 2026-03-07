# FSAO Iris - GMAO (Gestion de Maintenance Assistée par Ordinateur)

## Description
Application de GMAO complète incluant gestion des ordres de travail, maintenance préventive, améliorations, consignations LOTO, inventaire par service, équipements, zones, dashboard, journal d'audit, chat, système de mise à jour, import/export, sauvegardes, et plus.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT
- **Temps réel**: WebSockets
- **LLM**: LiteLLM proxy

## Fonctionnalités implémentées

### Inventaire par service (7 mars 2026)
- **Onglets par service** : L'inventaire est organisé par service (Maintenance, Production, etc.)
- **Service par défaut** : L'onglet actif correspond au service de l'utilisateur connecté. Si aucun service, "Non classé" est affiché.
- **Gestion des onglets** : Admins/responsables peuvent ajouter/supprimer des services
- **Partage inter-services** : Articles partagés entre services via lien (même stock, badge violet)
- **Permissions** : Tous voient tous les onglets, mais ne modifient que dans leur service
- **Migration** : Articles existants migrés vers "Non classé" au démarrage
- Collections : `inventory_services`, champs `service_id` et `shared_service_ids` sur `inventory`

### Système de mise à jour (7 mars 2026 - Corrigé)
- **Approche**: Script bash autonome exécuté via `nohup` en arrière-plan
- **Endpoint**: `POST /api/updates/apply` → HTTP 202 immédiat
- **Script**: Backup MongoDB, git init/fetch/reset, pip install, yarn build, restart services
- **Résultats**: Fichier JSON lu au redémarrage par `check_and_save_update_result()`

### LOTO (Consignation) - Complet
- CRUD procédures LOTO avec workflow complet
- Cadenas multiples (plusieurs utilisateurs)
- Journalisation audit, suppression admin
- Icônes temps réel via WebSockets
- Filtres avancés (période, équipement)

### Documentation et Intégration
- README.md, manuel utilisateur, import/export, sauvegardes incluant LOTO

## Fichiers clés
- `backend/server.py` : Endpoints API (routes inventory/services après ligne ~3085, migration startup)
- `backend/models.py` : Modèles (InventoryBase avec service_id, shared_service_ids)
- `backend/update_service.py` : Service de mise à jour (script bash autonome)
- `frontend/src/pages/Inventory.jsx` : Page inventaire avec onglets
- `frontend/src/components/Inventory/InventoryFormDialog.jsx` : Formulaire article (prop serviceId)
- `frontend/src/services/api.js` : API client (inventoryAPI avec services/share/unshare)

## Backlog
- P2: Notifications push mobile (Expo) - dépriorisé
- P3: Validation utilisateur du système de mise à jour sur Proxmox

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
