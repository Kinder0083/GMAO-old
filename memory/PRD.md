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

### Sauvegardes Automatiques (P0 - TERMINÉ - 2026-02-15)
- **Planification**: Quotidienne, hebdomadaire ou mensuelle avec heure personnalisable
- **Destinations**: Local, Google Drive, ou les deux (Google Drive nécessite OAuth)
- **Nettoyage automatique**: Garder les X dernières sauvegardes (max 5)
- **Icône header**: Disquette verte pendant 24h après backup réussi, grise sinon
- **Notifications email**: Email de confirmation ou d'alerte d'échec
- **Backup manuel**: Bouton "Sauvegarder maintenant" pour backup immédiat
- **Historique**: Table avec date, statut, destination, taille, nombre de modules
- **Téléchargement**: Possibilité de télécharger les backups locaux
- **CRUD planifications**: Créer, modifier, activer/désactiver, supprimer
- Tests: 24/24 backend + UI validé (100%)

### Import/Export des nouveaux modules (P0 - TERMINÉ - 2026-02-15)
- Export de 63 modules en XLSX ou CSV
- Sélecteur groupé par 12 catégories
- Import avec modes "Ajouter" et "Écraser"
- Tests: 18/18 backend + UI validé (100%)

### Sidebar (TERMINÉ)
- Menu réorganisé

### Vue Explorateur Documentations (TERMINÉ)
- Vue fichier/dossier style Windows Explorer

### WebSocket Notifications (TERMINÉ)
- Broadcast de mises à jour avec countdown

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
- Animation du logo sur la page de connexion (reporté par l'utilisateur)

## Collections MongoDB ajoutées
- `backup_schedules` - Planifications de sauvegarde
- `backup_history` - Historique des exécutions
- `backup_status` - Statut de la dernière sauvegarde (pour l'icône)
- `drive_credentials` - Tokens OAuth Google Drive

## Credentials
- App: admin@test.com / Admin123!
- API Docs: admin / atlas2024
