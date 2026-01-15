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

### Session du 15 Janvier 2026 (Session actuelle)

#### ✅ Bug P0 Corrigé: Calendrier de Maintenance "Infini" 
**Solution** : Nouvelles fonctions `getLastMaintenanceEndDate()` et modification de `getStatusBlocksForDay()` + cron job

#### ✅ P1 Complété: Fin Anticipée de Maintenance
**Implémentation complète** avec dialogue de confirmation et mise à jour de toutes les entrées de planning

#### ✅ P1 Complété: Notification Dashboard - Maintenances en attente
**Composant** `MaintenanceStatusPendingAlert` intégré au Dashboard

#### ✅ Bug Fix: Synchronisation Planning M.Prev après fin anticipée
**Problème signalé** : Après changement de statut d'un équipement (fin anticipée), la page Planning M.Prev ne se mettait pas à jour.

**Causes identifiées** :
1. Le code `update_one` ne mettait à jour qu'UNE entrée de planning même s'il y avait des doublons
2. La page ne se rafraîchissait pas automatiquement après changement sur une autre page

**Solutions implémentées** :
1. **Backend** (`server.py` lignes 1832-1870):
   - Changé `update_one` → `update_many` pour mettre à jour TOUTES les entrées de planning actives
   - Ajout d'un broadcast WebSocket après fin anticipée
   
2. **Frontend** (`PlanningMPrev.jsx`):
   - Utilisation du hook `useEquipments` pour recevoir les mises à jour WebSocket
   - Ajout d'event listeners `visibilitychange` et `focus` pour rafraîchir au retour sur la page
   - Rechargement automatique du planning quand les équipements changent

---

## Tâches à Venir

### P1 - Priorité Haute
- **Migration WebSocket**: Pages "Rapports", "Equipes", "Historique Achat"

### P2 - Priorité Moyenne
- **Page "Rapport P.accident"**: Correction des mises à jour temps réel (récurrence: 7 fois)
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)

---

## Architecture Fichiers Clés

### Backend
```
/app/backend/
├── server.py                           # Serveur principal, endpoint status avec update_many
├── demande_arret_routes.py             # Routes demandes d'arrêt + pending-status-update
├── demande_arret_emails.py             # Envoi d'emails fin maintenance
└── ...
```

### Frontend
```
/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx                   # + MaintenanceStatusPendingAlert
│   ├── PlanningMPrev.jsx               # + useEquipments + visibility/focus refresh
│   └── EndMaintenance.jsx
└── components/
    ├── Dashboard/
    │   └── MaintenanceStatusPendingAlert.jsx
    └── Equipment/
        ├── QuickStatusChanger.jsx
        └── MaintenanceEndConfirmDialog.jsx
```

---

## Tests Créés

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `/app/tests/test_planning_mprev_bug_fix.py` | 15 | Bug P0 calendrier |
| `/app/tests/test_maintenance_end_features.py` | 14 | Fin anticipée + alerte |

---

## Dernière mise à jour
**Date**: 15 Janvier 2026
**Agent**: E1
**Bug corrigé**: Synchronisation Planning M.Prev après fin anticipée de maintenance
