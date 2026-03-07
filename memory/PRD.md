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

### WebSocket temps réel pour inventaire QR (7 mars 2026)
- Broadcast automatique après mouvement de stock (ajout/retrait) via QR code
- Broadcast automatique après signalement de besoin via QR code
- Page Inventaire écoute les événements `inventory_update` et `inventory_restock_request`
- Toast de notification en temps réel pour les autres utilisateurs connectés

### Signalement de besoin → Demande d'Achat (7 mars 2026)
- Le signalement de besoin via QR code crée automatiquement une Demande d'Achat (DA-YYYY-XXXXX)
- Visible dans la page "Demandes d'Achat" par les administrateurs et le demandeur
- Fix du bug ObjectId dans purchase_request_routes.py (sérialisation)

### PWA installation corrigée (7 mars 2026)
- Icônes carrées générées : 192x192 et 512x512 (l'ancien logo 1770x896 n'était pas carré)
- manifest.json mis à jour avec 4 entrées d'icônes (any + maskable pour chaque taille)

### Système de mise à jour - Logs diagnostic (7 mars 2026)
- Endpoint `/api/updates/log` pour lire les logs de mise à jour
- Logs dans `/var/log/gmao-iris-update.log` (hors du dépôt git, survit au git reset + reboot)
- Résultat dans `/var/log/gmao-iris-update-result.json`
- Script bash reproduit exactement les commandes SSH de l'utilisateur
- `reboot` avec fallback `sudo`
- Section "Logs du serveur (diagnostic)" dans la page Mise à Jour

### QR Codes articles d'inventaire
- Page publique `/qr-inventory/{itemId}` : fiche article, jauge de stock, actions rapides
- Ajout/Retrait via boutons rapides + champ quantité libre + motif
- Historique des mouvements de stock
- Signaler un besoin → crée une Demande d'Achat

### Inventaire par service
- Onglets par service triés alphabétiquement
- Onglet par défaut = service de l'utilisateur connecté
- Gestion des services (ajout/suppression) par admins/responsables
- Partage inter-services

### LOTO (Consignation)
- CRUD procédures LOTO avec workflow complet

## Fichiers clés
- `backend/update_service.py` : Service de mise à jour
- `backend/server.py` : Endpoints API principaux
- `backend/qr_inventory_routes.py` : Routes QR inventaire avec WebSocket broadcast
- `backend/purchase_request_routes.py` : Routes demandes d'achat (fix ObjectId)
- `frontend/src/pages/Updates.jsx` : Page mise à jour avec logs diagnostic
- `frontend/src/pages/QRInventoryPage.jsx` : Page QR article
- `frontend/src/pages/Inventory.jsx` : Inventaire avec onglets + WebSocket temps réel
- `frontend/public/manifest.json` : PWA manifest avec icônes carrées

## Backlog
- P0: **EN ATTENTE VALIDATION** - Système de mise à jour (tester sur Proxmox)
- P1: Scanner QR intégré dans l'inventaire
- P2: Cadenas multiples LOTO
- P3: Notifications push mobile (Expo) - dépriorisé

## Credentials de test
- Admin: buenogy@gmail.com / Admin2024!
