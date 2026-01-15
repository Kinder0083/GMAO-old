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
**Problème initial** : Le statut EN_MAINTENANCE (jaune) apparaissait comme infini au-delà de la date de fin prévue.

**Solution implémentée** :
1. Nouvelle fonction `getLastMaintenanceEndDate()` dans PlanningMPrev.jsx
2. Modification de `getStatusBlocksForDay()` pour retourner "Sans données" (gris) après la fin de maintenance
3. Nouveau Cron Job `manage_planned_maintenance_status()` (0h05 et 12h00)

**Tests** : 15/15 passés

---

#### ✅ P1 Complété: Fin Anticipée de Maintenance
**Description** : Permettre de terminer une maintenance préventive avant sa date de fin prévue.

**Implémentation** :
- **Backend** (`server.py` ligne 1792-1900): 
  - `PATCH /api/equipments/{id}/status` détecte si l'équipement a une maintenance active
  - Retourne `requires_confirmation: true` avec les détails de la maintenance
  - Avec `force=true`, termine la maintenance et met à jour le statut
  
- **Frontend** :
  - `QuickStatusChanger.jsx` : Intègre le dialogue de confirmation
  - `MaintenanceEndConfirmDialog.jsx` : Affiche les détails de la maintenance (dates, motif) et permet de confirmer

**Tests** : 14/14 passés

---

#### ✅ P1 Complété: Notification Dashboard - Maintenances en attente de statut
**Description** : Afficher une alerte sur le tableau de bord quand des maintenances terminées attendent la sélection d'un nouveau statut.

**Implémentation** :
- **Backend** (`demande_arret_routes.py`):
  - `GET /api/demandes-arret/pending-status-update`
  - Retourne les maintenances dont `date_fin < aujourd'hui` et sans `statut_apres_maintenance`
  - Filtres : 30 derniers jours, pas de `fin_anticipee`, avec `end_maintenance_token`
  
- **Frontend** :
  - `MaintenanceStatusPendingAlert.jsx` : Composant d'alerte avec badge compteur
  - Bouton "Voir les détails" pour expand/collapse la liste
  - Bouton "Définir le statut" ouvre `/end-maintenance?token=xxx`
  - Intégré dans `Dashboard.jsx`

**Tests** : 100% passés

---

### Sessions Précédentes

#### ✅ Système de Maintenance Planifiée (P0 - Complété)
- Approbation de demande d'arrêt avec mise à jour statut équipement
- Affichage calendrier Planning M.Prev avec couleurs correctes
- Fin de maintenance par email avec boutons colorés
- Page `/end-maintenance` pour sélection du nouveau statut

#### ✅ Workflow "Demande de Report" (Complété)
- Approbation, refus, contre-propositions pour reports de maintenance

#### ✅ Refactoring `demande_arret_routes.py` (Complété)
- Division en modules : `_reports`, `_attachments`, `_emails`, `_utils`

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
├── server.py                           # Serveur principal, cron jobs
├── demande_arret_routes.py             # Routes CRUD demandes d'arrêt
├── demande_arret_reports_routes.py     # Routes reports
├── demande_arret_attachments_routes.py # Routes pièces jointes
├── demande_arret_emails.py             # Envoi d'emails
└── demande_arret_utils.py              # Utilitaires partagés
```

### Frontend
```
/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx                   # Tableau de bord avec alerte maintenance
│   ├── PlanningMPrev.jsx               # Calendrier planning maintenance
│   └── EndMaintenance.jsx              # Page sélection statut fin maintenance
└── components/
    ├── Dashboard/
    │   └── MaintenanceStatusPendingAlert.jsx  # Alerte maintenances en attente
    └── Equipment/
        ├── QuickStatusChanger.jsx              # Changeur de statut avec confirmation
        └── MaintenanceEndConfirmDialog.jsx     # Dialogue confirmation fin anticipée
```

---

## Architecture Cron Jobs

| Job | Heure | Description |
|-----|-------|-------------|
| `auto_check_preventive_maintenance` | 00:00 | Crée les bons de travail pour maintenances échues |
| `manage_planned_maintenance_status` | 00:05, 12:00 | Gère les transitions de statut des maintenances planifiées |
| `check_for_updates` | 01:00 | Vérifie les mises à jour système |
| `check_expired_demandes_cron` | 02:00 | Expire les demandes d'arrêt non traitées (7 jours) |
| `chat_cleanup_service` | 03:00 | Nettoie les messages > 60 jours |
| `check_llm_versions_job` | Lundi 03:00 | Vérifie les versions LLM |

---

## Workflow Maintenance Planifiée (Complet)

```
1. Demande d'arrêt créée
   └─> Email au destinataire (Approuver/Refuser)

2. Demande approuvée
   └─> Entrée planning_equipement créée
   └─> Si date_debut <= aujourd'hui: statut → EN_MAINTENANCE
   └─> Sinon: cron job met à jour le jour J

3. Pendant la maintenance (date_debut <= jour <= date_fin)
   └─> Calendrier affiche jaune (EN_MAINTENANCE)
   └─> Changement de statut manuel → Dialogue confirmation fin anticipée
   └─> Si confirmé: date_fin = aujourd'hui, fin_anticipee = true

4. À la date de fin (géré par cron job)
   └─> Email au demandeur avec boutons colorés
   └─> Utilisateur choisit nouveau statut via /end-maintenance

5. Après la date de fin (sans nouveau statut défini)
   └─> Calendrier affiche gris "Sans données"
   └─> Alerte sur Dashboard "Action requise"
   └─> Notification avec liste des maintenances en attente

6. Nouveau statut sélectionné
   └─> Statut équipement mis à jour
   └─> statut_apres_maintenance enregistré
   └─> Demande marquée "TERMINEE"
   └─> Alerte disparaît du Dashboard
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
**Fonctionnalités complétées**: 
- Bug P0 calendrier maintenance "infini"
- P1 Fin anticipée de maintenance
- P1 Notification Dashboard maintenances en attente
