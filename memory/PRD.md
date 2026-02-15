# GMAO Iris - PRD (Product Requirements Document)

## Énoncé du problème
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète pour la gestion des équipements, interventions, maintenance préventive, M.E.S., caméras, documents, etc.

## Architecture
- **Frontend:** React + Shadcn/UI + Tailwind CSS (port 3000)
- **Backend:** FastAPI + MongoDB (port 8001)
- **Base de données:** MongoDB (gmao_iris)
- **Temps réel:** WebSocket pour chat, consignes, notifications de mise à jour
- **Scheduler:** APScheduler pour tâches planifiées (maintenance, rapports, backups)

## Fonctionnalités implémentées

### Export/Import avec fichiers (P0 - TERMINÉ - 2026-02-15)
- **Export "Toutes les données"** génère un **ZIP** contenant :
  - `data.xlsx` : 63 modules de données MongoDB
  - `uploads/` : Tous les fichiers uploadés (pièces jointes OT, documents, photos, etc.)
- **Export individuel** reste en XLSX simple
- **Import** accepte les fichiers ZIP pour restaurer données + fichiers
- ZIP total ~28 Mo (données + 50 fichiers uploadés)
- Tests: 11/11 backend + UI validée (100%)

### Sauvegardes Automatiques (P0 - TERMINÉ - 2026-02-15)
- Planification (quotidienne/hebdo/mensuelle), destinations (local/Google Drive/les deux)
- Nettoyage automatique (garder 1-5 backups max)
- Backups en format ZIP (données + fichiers)
- Icône disquette dans le header : verte 24h après backup réussi
- Notifications email, backup manuel, historique avec téléchargement
- Tests: 24/24 backend + UI frontend (100%)

### Import/Export des 63 modules (P0 - TERMINÉ - 2026-02-15)
- Sélecteur groupé par 12 catégories
- Tests: 18/18 (100%)

### Sidebar, Vue Explorateur, WebSocket (TERMINÉS)
- Menu réorganisé, Vue Explorateur Documentations, Broadcast mises à jour

## Google Drive - Configuration requise
Pour utiliser la destination Google Drive:
1. Créer un projet sur Google Cloud Console
2. Activer l'API Google Drive
3. Configurer l'écran de consentement OAuth
4. Créer des identifiants OAuth (Web application)
5. Ajouter dans backend/.env:
   - GOOGLE_CLIENT_ID=...
   - GOOGLE_CLIENT_SECRET=...
   - GOOGLE_DRIVE_REDIRECT_URI=https://[URL]/api/backup/drive/callback

## Backlog

### P1
- Confirmer avec l'utilisateur si le bug d'importation Excel persiste encore

### P2
- Animation du logo page de connexion (reporté par l'utilisateur)

## Collections MongoDB ajoutées
- `backup_schedules` - Planifications de sauvegarde
- `backup_history` - Historique des exécutions
- `backup_status` - Statut dernière sauvegarde (pour l'icône)
- `drive_credentials` - Tokens OAuth Google Drive

## Credentials
- App: admin@test.com / Admin123!
- API Docs: admin / atlas2024
