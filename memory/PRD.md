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

#### ✅ Fin Anticipée de Maintenance Préventive (P0 - Complété)
- **Problème résolu**: Impossible de changer le statut d'un équipement pendant une maintenance préventive planifiée
- **Solution implémentée**:
  - Le backend détecte automatiquement si un équipement a une maintenance en cours
  - Un dialogue de confirmation s'affiche demandant à l'utilisateur s'il veut terminer la maintenance de manière anticipée
  - Si confirmé, la date de fin de la maintenance est mise à jour à aujourd'hui
  - L'information de qui a terminé la maintenance et quand est enregistrée
- **Fichiers créés/modifiés**:
  - `/app/frontend/src/components/Equipment/MaintenanceEndConfirmDialog.jsx` (nouveau)
  - `/app/frontend/src/components/Equipment/QuickStatusChanger.jsx` (modifié)
  - `/app/backend/server.py` - endpoint `PATCH /api/equipments/{id}/status` (modifié)
  - `/app/frontend/src/services/api.js` - ajout paramètre `force`

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

#### ✅ Refactoring "Demande d'Arrêt" (Complété)
- **Ancien fichier**: `demande_arret_routes.py` (1939 lignes)
- **Nouveaux fichiers**:
  - `/app/backend/demande_arret_routes.py` (469 lignes) - Routes principales
  - `/app/backend/demande_arret_reports_routes.py` (555 lignes) - Routes reports
  - `/app/backend/demande_arret_attachments_routes.py` (189 lignes) - Routes pièces jointes
  - `/app/backend/demande_arret_emails.py` (651 lignes) - Fonctions email
  - `/app/backend/demande_arret_utils.py` (45 lignes) - Utilitaires partagés

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
