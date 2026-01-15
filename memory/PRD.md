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

#### ✅ Système de Maintenance Planifiée Refactorisé (P0 - Complété)
**Problème initial** : Les maintenances planifiées s'affichaient en couche superposée sur l'historique des statuts au lieu de le remplacer.

**Solution implémentée** :
1. **Approbation de demande d'arrêt** :
   - Le statut "EN_MAINTENANCE" (jaune) est maintenant appliqué à l'équipement
   - L'historique des statuts est mis à jour pour toute la période de maintenance
   - Le point de couleur à gauche du nom est mis à jour
   - Suit la règle "heure arrondie à l'heure pleine inférieure"

2. **Affichage calendrier Planning M.Prev** :
   - Les maintenances planifiées **écrasent** l'historique pour leur période (plus de superposition)
   - Couleur jaune (EN_MAINTENANCE) uniforme pendant la période
   - Tooltip avec détails de la maintenance

3. **Fin de maintenance** :
   - Email automatique au demandeur à la date de fin avec boutons colorés
   - Page `/end-maintenance` avec choix de 7 statuts (Opérationnel, En Fonctionnement, À l'arrêt, En maintenance, Hors service, En C.T, Dégradé)
   - Boutons aux couleurs correspondantes au Planning M.Prev
   - Mise à jour automatique du statut équipement + historique

**Fichiers créés/modifiés** :
- `/app/frontend/src/pages/EndMaintenance.jsx` (nouveau)
- `/app/frontend/src/pages/PlanningMPrev.jsx` (modifié - getStatusBlocksForDay intègre maintenances)
- `/app/backend/demande_arret_routes.py` (modifié - endpoints end-maintenance)
- `/app/backend/demande_arret_emails.py` (modifié - send_end_maintenance_email)

**Endpoints API** :
- `GET /api/demandes-arret/end-maintenance?token=...` - Infos fin de maintenance (PUBLIC)
- `POST /api/demandes-arret/end-maintenance?token=...&statut=...` - Traiter fin de maintenance (PUBLIC)
- `POST /api/demandes-arret/check-end-maintenance` - Vérifier et envoyer emails de fin

#### ✅ Fin Anticipée de Maintenance (Complété - Session précédente)
- Dialogue de confirmation lors du changement de statut pendant une maintenance en cours
- Termination anticipée avec mise à jour de la date de fin

---

## Tâches à Venir

### P1 - Priorité Haute
- **Migration WebSocket**: Pages "Rapports", "Equipes", "Historique Achat"

### P2 - Priorité Moyenne
- **Page "Rapport P.accident"**: Correction des mises à jour temps réel (WebSockets)
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)

---

## Workflow Maintenance Planifiée

```
1. Demande d'arrêt créée
   └─> Email au destinataire (Approuver/Refuser)

2. Demande approuvée
   └─> Statut équipement → EN_MAINTENANCE (si date_debut <= aujourd'hui)
   └─> Historique mis à jour pour toute la période
   └─> Entrée planning_equipement créée
   └─> Point couleur équipement → Jaune

3. Pendant la maintenance
   └─> Calendrier affiche jaune (EN_MAINTENANCE)
   └─> Changement de statut manuel → Dialogue de confirmation
   └─> Si confirmé → Fin anticipée + nouveau statut appliqué

4. À la date de fin
   └─> Email au demandeur avec boutons colorés
   └─> Utilisateur choisit nouveau statut
   └─> Statut équipement mis à jour
   └─> Demande marquée "TERMINEE"
```

---

## Dernière mise à jour
**Date**: 15 Janvier 2026
**Agent**: E1
