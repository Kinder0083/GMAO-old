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
**Problème initial** : Lorsqu'une demande d'arrêt pour maintenance est approuvée, le planning inscrit correctement la date de début mais la date de fin n'est pas respectée. Le statut EN_MAINTENANCE (jaune) apparaît comme infini au-delà de la date de fin prévue.

**Solution implémentée** :
1. **Nouvelle fonction `getLastMaintenanceEndDate()`** :
   - Trouve la date de fin de la dernière maintenance planifiée pour chaque équipement
   - Utilisée pour déterminer si un jour est "après" toutes les maintenances

2. **Modification de `getStatusBlocksForDay()`** :
   - Pour les jours APRÈS la date de fin de la dernière maintenance : retourne `null` (gris "Sans données")
   - Pour les jours DANS la période de maintenance : retourne `EN_MAINTENANCE` (jaune)
   - Pour les jours AVANT la maintenance : utilise l'historique normal

3. **Amélioration du filtrage API** :
   - Logique de chevauchement correcte : `date_fin >= query.date_debut AND date_debut <= query.date_fin`
   - Les maintenances terminées sont exclues

4. **Nouveau Cron Job `manage_planned_maintenance_status()`** :
   - S'exécute à 0h05 et 12h00 chaque jour
   - Démarre automatiquement les maintenances qui commencent aujourd'hui
   - Envoie les emails de fin pour les maintenances qui se terminent aujourd'hui

**Fichiers modifiés** :
- `/app/frontend/src/pages/PlanningMPrev.jsx` (nouvelles fonctions, correction logique)
- `/app/backend/demande_arret_routes.py` (filtrage API amélioré)
- `/app/backend/server.py` (nouveau cron job)

**Tests** : 15/15 passés (fichier: `/app/tests/test_planning_mprev_bug_fix.py`)

---

### Sessions Précédentes

#### ✅ Système de Maintenance Planifiée (P0 - Complété)
- Approbation de demande d'arrêt avec mise à jour statut équipement
- Affichage calendrier Planning M.Prev avec couleurs correctes
- Fin de maintenance par email avec boutons colorés
- Page `/end-maintenance` pour sélection du nouveau statut

#### ✅ Fin Anticipée de Maintenance
- Dialogue de confirmation lors du changement de statut pendant une maintenance
- Termination anticipée avec mise à jour de la date de fin

#### ✅ Workflow "Demande de Report"
- Approbation, refus, contre-propositions pour reports de maintenance

#### ✅ Refactoring `demande_arret_routes.py`
- Division en modules : `_reports`, `_attachments`, `_emails`, `_utils`

---

## Tâches à Venir

### P1 - Priorité Haute
- **Migration WebSocket**: Pages "Rapports", "Equipes", "Historique Achat"

### P2 - Priorité Moyenne
- **Page "Rapport P.accident"**: Correction des mises à jour temps réel (récurrence: 7 fois)
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)

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

## Workflow Maintenance Planifiée (Mis à jour)

```
1. Demande d'arrêt créée
   └─> Email au destinataire (Approuver/Refuser)

2. Demande approuvée
   └─> Entrée planning_equipement créée avec date_debut et date_fin
   └─> Si date_debut <= aujourd'hui: statut équipement → EN_MAINTENANCE
   └─> Sinon: le cron job mettra à jour le statut le jour J

3. Pendant la maintenance (date_debut <= jour <= date_fin)
   └─> Calendrier affiche jaune (EN_MAINTENANCE)
   └─> Changement de statut manuel → Dialogue de confirmation fin anticipée

4. À la date de fin (géré par cron job manage_planned_maintenance_status)
   └─> Email au demandeur avec boutons colorés
   └─> Utilisateur choisit nouveau statut via /end-maintenance
   └─> Statut équipement mis à jour
   └─> Demande marquée "TERMINEE"

5. Après la date de fin (jours futurs)
   └─> Calendrier affiche gris "Sans données" (en attente de sélection statut)
   └─> Pas de statut infini EN_MAINTENANCE
```

---

## Dernière mise à jour
**Date**: 15 Janvier 2026
**Agent**: E1
**Bug corrigé**: P0 - Calendrier maintenance "infini"
