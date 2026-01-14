# GMAO Iris - Product Requirements Document

## Description du Projet
Application de Gestion de Maintenance Assistée par Ordinateur (GMAO) avec tableau de bord temps réel, gestion des ordres de travail, équipements, planning du personnel et chat en direct.

## Stack Technique
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: WebSockets via FastAPI
- **AI Integration**: Google Gemini 2.5 Flash (Emergent LLM Key)

## Comptes de Test
- **Admin**: admin@test.com / password
- **User**: user@test.com / password

---

## Fonctionnalités Implémentées

### Session du 14 Janvier 2026 (Session actuelle)

#### ✅ Workflow "Demande de Report" (P0 - Complété)
- **Fichiers créés**:
  - `/app/backend/demande_arret_reports_routes.py` - Routes API pour les reports
  - `/app/frontend/src/pages/ValidateReport.jsx` - Page de validation des reports
  - `/app/frontend/src/pages/ValidateCounterProposal.jsx` - Page de validation des contre-propositions
- **Endpoints API**:
  - `POST /api/demandes-arret/{id}/request-report` - Créer une demande de report
  - `GET /api/demandes-arret/validate-report?token=...&action=...` - Valider/refuser un report (PUBLIC)
  - `POST /api/demandes-arret/submit-counter-proposal` - Soumettre une contre-proposition (PUBLIC)
  - `GET /api/demandes-arret/validate-counter-proposal?token=...&action=...` - Valider contre-proposition (PUBLIC)
  - `GET /api/demandes-arret/reports/history` - Historique des reports avec statistiques
- **Workflow complet**:
  1. Utilisateur demande un report avec nouvelles dates et raison
  2. Email envoyé au destinataire avec 3 boutons: Approuver, Refuser, Contre-proposer
  3. Si contre-proposition: formulaire avec nouvelles dates envoyé au demandeur
  4. Le demandeur peut accepter ou refuser la contre-proposition
  5. Mise à jour automatique des dates de la demande d'arrêt
- **Frontend**:
  - Pages publiques de validation accessibles sans authentification
  - Affichage des informations du report (dates actuelles, dates demandées, raison)
  - Formulaire de contre-proposition avec date-pickers
  - Messages de succès/erreur clairs

#### ✅ Refactoring "Demande d'Arrêt" (Complété)
- **Ancien fichier**: `demande_arret_routes.py` (1939 lignes)
- **Nouveaux fichiers**:
  - `/app/backend/demande_arret_routes.py` (469 lignes) - Routes principales
  - `/app/backend/demande_arret_reports_routes.py` (555 lignes) - Routes reports
  - `/app/backend/demande_arret_attachments_routes.py` (189 lignes) - Routes pièces jointes
  - `/app/backend/demande_arret_emails.py` (651 lignes) - Fonctions email
  - `/app/backend/demande_arret_utils.py` (45 lignes) - Utilitaires partagés
- **Avantages**:
  - Code plus maintenable et lisible
  - Séparation des responsabilités
  - Facilité de test et de débogage
  - Réduction des conflits de routage FastAPI

#### ✅ Mode Édition Dashboard (P0 - Complété - Session précédente)
- Migration de `react-beautiful-dnd` vers `@dnd-kit` pour stabilité
- Drag-and-drop fonctionnel et validé par l'utilisateur
- Sauvegarde du layout personnalisé par utilisateur

#### ✅ Pièces Jointes pour Demandes d'Arrêt (P1 - Complété - Session précédente)
- Upload/download/suppression de fichiers (max 10MB)
- Zone de drag-and-drop dans le formulaire

#### ✅ Rappel Email Automatique (P1 - Complété - Session précédente)
- Rappel pour demandes en attente depuis 3+ jours
- Déclenché automatiquement à chaque visite du dashboard

---

## Tâches à Venir

### P1 - Priorité Haute
- **Migration WebSocket**: Pages "Rapports", "Equipes", "Historique Achat"

### P2 - Priorité Moyenne
- **Page "Rapport P.accident"**: Correction des mises à jour temps réel (WebSockets)
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)

---

## Architecture des Routes Demandes d'Arrêt

```
/api/demandes-arret/
├── POST /                              → Créer une demande
├── GET /                               → Liste des demandes
├── GET /trigger-reminders              → Déclencher rappels
├── POST /check-pending-reminders       → Vérifier rappels
├── GET /reports/history                → Historique des reports
├── GET /validate-report                → Valider un report (PUBLIC)
├── POST /submit-counter-proposal       → Contre-proposition (PUBLIC)
├── GET /validate-counter-proposal      → Valider contre-prop (PUBLIC)
├── GET /planning/equipements           → Planning équipements
├── POST /check-expired                 → Vérifier expirations
├── GET /{demande_id}                   → Détail d'une demande
├── POST /validate/{token}              → Valider demande initiale
├── POST /refuse/{token}                → Refuser demande initiale
├── POST /{demande_id}/cancel           → Annuler une demande
├── POST /{demande_id}/request-report   → Demander un report
├── POST /{demande_id}/accept-report    → Accepter report (auth)
├── POST /{demande_id}/attachments      → Upload pièce jointe
├── GET /{demande_id}/attachments       → Liste pièces jointes
├── GET /{demande_id}/attachments/{id}  → Download pièce jointe
└── DELETE /{demande_id}/attachments/{id} → Supprimer pièce jointe
```

---

## Dernière mise à jour
**Date**: 14 Janvier 2026
**Agent**: E1
