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

### Système de mise à jour (7 mars 2026 - Corrigé)
- Script bash autonome via `nohup`, retour HTTP 202 immédiat
- Résultats persistés dans fichier JSON, lus au redémarrage

### LOTO (Consignation) - Complet
- CRUD procédures LOTO avec workflow complet, cadenas multiples, journalisation, filtres

## Fichiers clés
- `backend/qr_inventory_routes.py` : Routes QR inventaire (public + auth)
- `frontend/src/pages/QRInventoryPage.jsx` : Page QR article
- `frontend/src/pages/Inventory.jsx` : Page inventaire avec onglets + bouton QR
- `backend/server.py` : Endpoints API principaux
- `backend/models.py` : Modèles de données

## Backlog
- P2: Notifications push mobile (Expo) - dépriorisé
- P3: Validation du système de mise à jour sur Proxmox

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
