# GMAO Iris - PRD (Product Requirements Document)

## Énoncé du problème
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète pour la gestion des équipements, interventions, maintenance préventive, M.E.S., caméras, documents, etc.

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS (port 3000)
- **Backend:** FastAPI + MongoDB (port 8001)
- **Base de données:** MongoDB (gmao_iris)
- **Temps réel:** WebSocket pour chat, consignes, notifications de mise à jour

## Fonctionnalités implémentées

### Import/Export (P0 - TERMINÉ - 2026-02-15)
- Export de 63 modules en XLSX ou CSV
- Sélecteur groupé par catégories : Opérations, Équipements, M.E.S., QHSE, IoT, Caméras, Documents, Rapports, Ressources, Stock, Communication, Configuration
- Import avec modes "Ajouter" et "Écraser"
- Authentification admin requise
- Tests : 18/18 backend + UI validé (100%)

### Sidebar (TERMINÉ)
- Menu réorganisé : "Log MQTT" sous "P/L MQTT", "Import / Export" sous "Paramètres Spéciaux"

### Vue Explorateur Documentations (TERMINÉ)
- Vue fichier/dossier style Windows Explorer
- CRUD dossiers, navigation par breadcrumbs
- Persistance du mode de vue (localStorage)

### WebSocket Notifications (TERMINÉ)
- Broadcast de mises à jour avec countdown
- Auth via user_id (pas JWT dans URL)
- Support connexions multiples par utilisateur

## Backlog

### P1
- Confirmer avec l'utilisateur si le bug d'importation Excel persiste encore

### P2
- Animation du logo sur la page de connexion (reporté par l'utilisateur)

## Credentials
- App: admin@test.com / Admin123!
- API Docs: admin / atlas2024
