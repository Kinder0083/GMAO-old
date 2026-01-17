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

### Session du 17 Janvier 2026 (Session actuelle)

#### ✅ Bug Fix: Bouton livre (Book) grisé malgré checklist associée
**Problème** : L'icône livre restait grisée même après avoir associé une checklist à une maintenance préventive.
**Cause** : Incohérence de noms de champs - le frontend vérifiait `checklist_id` mais le backend utilisait `checklist_template_id`.
**Solution** : Alignement du frontend pour utiliser `checklist_template_id` dans tous les composants concernés.

#### ✅ Feature: Système de notifications push pour maintenances préventives
**Implémentation complète** d'un système de notifications utilisateur :

**Backend** :
- Nouveau modèle `Notification` dans models.py (type, titre, message, priorité, lien, métadonnées)
- Endpoints CRUD : GET /api/notifications, GET /api/notifications/count, PUT /api/notifications/{id}/read, PUT /api/notifications/read-all, DELETE /api/notifications/{id}
- Cron job quotidien à 7h00 pour vérifier les maintenances préventives et créer des notifications :
  - J-3 : Notification priorité moyenne
  - J-1 : Notification priorité haute
  - J-0 : Notification priorité urgente
  - Retard : Notification priorité urgente

**Frontend** :
- Nouveau composant `NotificationsDropdown.jsx` intégré dans la barre de navigation
- Icône **clé (Wrench)** pour les notifications de maintenance préventive
- Badge **bleu** en haut à droite pour notifications PM
- Badge **rouge** en bas à gauche (animé) pour notifications RP (Réparation à Planifier)
- Liste des notifications avec icônes, priorité, horodatage, badge "RP" pour les non-conformités
- Actions : marquer comme lu, tout marquer lu, supprimer
- Clic sur notification → navigation vers la page concernée

#### ✅ Feature: Flux complet de validation checklist avec création automatique OT RP
**Nouveau flux d'exécution complet** :
1. Clic sur Play (Exécuter) dans PM → Création OT "PM-[Nom]" avec checklist
2. Ouverture automatique du dialogue d'exécution de la checklist
3. Remplissage des items (Conforme/Non conforme, valeurs numériques)
4. Clic sur "Valider la checklist" → Dialogue de saisie du temps passé
5. Confirmation → Mise à jour OT :
   - Statut : "Terminé"
   - Catégorie : "Travaux Préventifs"
   - Priorité : "Normale"
   - Temps passé enregistré
6. Si non-conformité(s) détectée(s) → Création automatique OT "RP-[Nom OT]" :
   - Statut : "Ouvert"
   - Priorité : "Haute"
   - Catégorie : "Travaux Curatif"
   - Description : Liste détaillée des non-conformités
   - Notification envoyée aux admins/superviseurs

#### ✅ Feature: Bouton "Livre" dans les Ordres de Travail
- Nouvelle icône **BookOpen** entre le crayon et la corbeille dans la liste des OT
- Permet d'exécuter la checklist associée à un OT
- Désactivé/grisé si aucune checklist associée

#### ✅ Amélioration: Fonctionnalité bouton "Livre" dans Maintenance préventive
**Changement** : Le bouton livre dans la page PM ouvre maintenant le **formulaire de modification** de la checklist associée (pas l'exécution).

#### ✅ P0 Complété: Refonte page "Maintenance préventive"
**Implémentation complète** de la refonte demandée par l'utilisateur :

**Changements UI** :
- Vue par défaut changée de "Liste" à "Arborescence" (tree)
- Vue "Liste" renommée en "Carte" (card)
- Boutons texte remplacés par icônes : Play (Exécuter), Pencil (Modifier), BookOpen (Checklist), Trash (Supprimer)
- Bouton "Gérer les Checklists" navigue vers nouvelle page dédiée

**Nouvelle page `/preventive-maintenance/checklists`** :
- Page dédiée `ChecklistsManagement.jsx` pour créer, modifier, supprimer les checklists
- Statistiques : Total checklists, Items de contrôle, Modèles actifs
- Bouton "Retour" pour revenir à la maintenance préventive

**Nouveau flux d'exécution** :
- Clic sur Play → Dialogue de confirmation (sans demander de créer OT)
- Création automatique d'un OT avec titre "PM-[Nom PM]" et statut "En Cours"
- Option de mettre l'équipement en statut "En maintenance" (si équipement associé)
- Redirection automatique vers la page /work-orders avec l'OT créé

**Tests** : 10/10 tests frontend passés (100%)

#### ✅ P0 Complété précédemment: Pièces jointes pour Presqu'accident et Maintenance préventive
**Implémentation complète** de la gestion des pièces jointes multi-fichiers :

**Backend** :
- Nouveau endpoint `POST /api/presqu-accident/items/{id}/attachments` - Upload fichier
- Nouveau endpoint `GET /api/presqu-accident/items/{id}/attachments` - Liste pièces jointes
- Nouveau endpoint `GET /api/presqu-accident/items/{id}/attachments/{att_id}` - Téléchargement
- Nouveau endpoint `DELETE /api/presqu-accident/items/{id}/attachments/{att_id}` - Suppression
- Idem pour `/api/preventive-maintenance/{id}/attachments`

**Frontend** :
- Composant générique `AttachmentUploader.jsx` (boutons Photo + Fichier)
- Composant générique `AttachmentsList.jsx` (liste, téléchargement, suppression)
- Intégration dans `PresquAccidentList.jsx` (formulaire d'édition)
- Intégration dans `PreventiveMaintenanceFormDialog.jsx`

**Tests** : 17/17 tests backend passés (100%)

#### ✅ Bug Fix: Transfert fichier Chat Live
**Problème** : Erreur "Impossible de transférer le fichier" lors du transfert de pièces jointes du chat vers Presqu'accident ou Maintenance préventive.
**Cause** : Les modèles n'avaient pas de champ `attachments[]` - seulement les anciens champs `piece_jointe_url` et `piece_jointe_nom`.
**Solution** : 
- Ajout du champ `attachments: List[dict] = []` aux modèles `PresquAccidentItem` et `PreventiveMaintenance`
- Mise à jour de l'API frontend avec les nouvelles méthodes

### Session du 15 Janvier 2026

#### ✅ Bug P0 Corrigé: Calendrier de Maintenance "Infini" 
**Solution** : Nouvelles fonctions `getLastMaintenanceEndDate()` et modification de `getStatusBlocksForDay()` + cron job

#### ✅ P1 Complété: Fin Anticipée de Maintenance
**Implémentation complète** avec dialogue de confirmation et mise à jour de toutes les entrées de planning

#### ✅ P1 Complété: Notification Dashboard - Maintenances en attente
**Composant** `MaintenanceStatusPendingAlert` intégré au Dashboard

#### ✅ Bug Fix: Synchronisation Planning M.Prev après fin anticipée
**Problème signalé** : Après changement de statut d'un équipement (fin anticipée), la page Planning M.Prev ne se mettait pas à jour.

---

## Tâches à Venir

### P1 - Priorité Haute
- **Migration WebSocket**: Pages "Rapports", "Equipes", "Historique Achat"

### P2 - Priorité Moyenne
- **Page "Rapport P.accident"**: Correction des mises à jour temps réel (récurrence: 9 fois - NON RÉSOLU)
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)

---

## Architecture Fichiers Clés

### Backend
```
/app/backend/
├── server.py                           # Serveur principal + endpoints PM attachments
├── presqu_accident_routes.py           # Routes presqu'accident + attachments
├── demande_arret_routes.py             # Routes demandes d'arrêt
├── chat_routes.py                      # Chat + transfert fichiers
└── models.py                           # Modèles avec attachments[]
```

### Frontend
```
/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx                   # + MaintenanceStatusPendingAlert
│   ├── PlanningMPrev.jsx               # + useEquipments + visibility/focus refresh
│   ├── PresquAccidentList.jsx          # + Section pièces jointes
│   └── EndMaintenance.jsx
├── components/
│   ├── shared/
│   │   ├── AttachmentUploader.jsx      # Composant upload réutilisable
│   │   └── AttachmentsList.jsx         # Liste pièces jointes réutilisable
│   ├── PreventiveMaintenance/
│   │   └── PreventiveMaintenanceFormDialog.jsx  # + Section pièces jointes
│   └── Dashboard/
│       └── MaintenanceStatusPendingAlert.jsx
└── services/
    └── api.js                          # + méthodes attachments
```

---

## Tests Créés

| Fichier | Tests | Couverture |
|---------|-------|------------|
| `/app/tests/test_attachments_feature.py` | 17 | Pièces jointes PA + PM |
| `/app/tests/test_planning_mprev_bug_fix.py` | 15 | Bug P0 calendrier |
| `/app/tests/test_maintenance_end_features.py` | 14 | Fin anticipée + alerte |

---

## Dernière mise à jour
**Date**: 17 Janvier 2026
**Agent**: E1
**Tâche complétée**: Icône clé pour notifications PM, bouton livre = modifier checklist, ouverture auto checklist lors exécution PM
