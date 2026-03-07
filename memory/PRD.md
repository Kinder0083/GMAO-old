# FSAO Iris - GMAO (Gestion de Maintenance Assistée par Ordinateur)

## Description
Application de GMAO complète incluant gestion des ordres de travail, maintenance préventive, améliorations, consignations LOTO, inventaire par service, équipements, zones, dashboard, journal d'audit, chat, système de mise à jour, import/export, sauvegardes, QR codes articles et équipements.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT
- **Temps réel**: WebSockets
- **LLM**: LiteLLM proxy

## Fonctionnalités implémentées

### Système de mise à jour - Logs diagnostic (7 mars 2026)
- **Endpoint `/api/updates/log`** : lecture des logs de mise à jour depuis le serveur
- **Section "Logs du serveur (diagnostic)"** dans la page Mise à Jour
- **Script bash corrigé** : reproduit exactement les commandes SSH de l'utilisateur
  - Logs persistants dans `APP_ROOT/update_log.txt` (survit au reboot)
  - Résultat JSON persistant dans `APP_ROOT/last_update_result.json`
  - `reboot` à la fin (comme en SSH)
  - Écriture résultat en pur bash (pas de dépendance python3)
- **`check_and_save_update_result`** : cherche d'abord les fichiers persistants

### QR Codes articles d'inventaire (7 mars 2026)
- **Page publique** `/qr-inventory/{itemId}` : fiche article, jauge de stock, actions rapides
- **Ajout/Retrait** : boutons rapides (+1/+5/+10/+25/+50) + champ quantité libre + motif
- **Historique des mouvements** : liste des entrées/sorties avec utilisateur, date, quantité
- **Équipements associés** : liste des équipements utilisant cette pièce
- **Signaler un besoin** : demande de réapprovisionnement
- **Étiquette QR** : téléchargeable (PNG) avec nom + référence
- Collections : `inventory_movements`, `inventory_restock_requests`

### Inventaire par service (7 mars 2026)
- **Onglets par service** triés alphabétiquement
- Onglet par défaut = service de l'utilisateur connecté (sinon "Non classé")
- Admins/responsables : ajout/suppression d'onglets
- **Partage inter-services** : même stock, badge violet
- Migration automatique vers "Non classé"
- Collections : `inventory_services`, champs `service_id` et `shared_service_ids` sur `inventory`

### Système de mise à jour (7 mars 2026 - Corrigé v2)
- Script bash autonome via `nohup`, retour HTTP 202 immédiat
- Résultats persistés dans fichier JSON dans APP_ROOT, lus au redémarrage
- Logs persistants consultables depuis le frontend
- Reboot du serveur à la fin (comme les commandes SSH manuelles)

### LOTO (Consignation) - Complet
- CRUD procédures LOTO avec workflow complet, cadenas multiples, journalisation, filtres

## Fichiers clés
- `backend/update_service.py` : Service de mise à jour avec script bash et logs persistants
- `backend/server.py` : Endpoints API principaux dont `/api/updates/log`
- `backend/qr_inventory_routes.py` : Routes QR inventaire (public + auth)
- `frontend/src/pages/Updates.jsx` : Page mise à jour avec logs diagnostic
- `frontend/src/pages/QRInventoryPage.jsx` : Page QR article
- `frontend/src/pages/Inventory.jsx` : Page inventaire avec onglets + bouton QR

## Backlog
- P0: **EN ATTENTE VALIDATION UTILISATEUR** - Système de mise à jour (logs + script corrigé)
- P1: Scanner QR intégré dans l'inventaire (après validation P0)
- P2: Cadenas multiples LOTO
- P3: Notifications push mobile (Expo) - dépriorisé

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
