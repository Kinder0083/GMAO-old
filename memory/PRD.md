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

### Session du 18 Janvier 2026 (Session actuelle)

#### ✅ Feature: Gestion des rôles
**Nouvelle page** `/people/roles` accessible via le bouton "Gestion des rôles" dans la page Équipe :

**Onglet "Rôles" :**
- Liste de tous les rôles (système et personnalisés)
- Création de nouveaux rôles personnalisés
- Modification des rôles existants (label, description, couleur, permissions)
- Suppression des rôles personnalisés (rôles système protégés)
- Éditeur de permissions avec tableau complet (Voir/Éditer/Supprimer par module)
- Boutons "Tout autoriser" / "Tout refuser" pour configuration rapide

**Onglet "Responsables de service" :**
- Attribution d'un responsable par service (ADV, LOGISTIQUE, PRODUCTION, etc.)
- Ces responsables auront accès à des fonctions de supervision spécifiques

**13 rôles système initialisés :**
ADMIN, DIRECTEUR, QHSE, RSP_PROD, PROD, TECHNICIEN, LABO, ADV, LOGISTIQUE, INDUS, VISUALISEUR, AFFICHAGE, RSP_SERVICE

**Fichiers créés/modifiés :**
- `/app/backend/roles_routes.py` (NEW)
- `/app/frontend/src/pages/RolesManagement.jsx` (NEW)
- `/app/backend/models.py` (modèles Role, ServiceResponsable)
- `/app/frontend/src/services/api.js` (rolesAPI)
- `/app/frontend/src/pages/People.jsx` (bouton "Gestion des rôles")
- `/app/frontend/src/App.js` (route /people/roles)
- `/app/backend/server.py` (import et initialisation des routes)

#### ✅ Feature: Formulaires personnalisés avec champs configurables (18 Jan 2026)
**Implémentation complète** des modèles de formulaires personnalisés :

**Form Builder (création de modèles)** :
- 10 types de champs supportés :
  - ✅ Texte court (input)
  - ✅ Texte long (textarea)
  - ✅ Nombre (avec min/max)
  - ✅ Date
  - ✅ Liste déroulante (avec options personnalisables)
  - ✅ Case à cocher (checkbox)
  - ✅ Oui/Non (switch)
  - ✅ Signature (canvas dessin)
  - ✅ Upload fichier
  - ✅ Upload logo
- Drag & drop pour réorganiser les champs (@dnd-kit)
- Champs configurables : requis, placeholder, options

**Remplissage de formulaires (CustomFormFiller)** :
- Rendu dynamique selon le template
- Validation des champs requis
- Signature via canvas natif
- Sauvegarde en brouillon ou validé

**Export PDF** :
- Génération HTML côté serveur
- Inclut tous les champs et valeurs
- Affiche la signature en base64

**Fichiers créés/modifiés :**
- `/app/frontend/src/components/FormBuilderDialog.jsx` (NEW)
- `/app/frontend/src/components/CustomFormFiller.jsx` (NEW)
- `/app/frontend/src/pages/FormTemplatesPage.jsx` (refonte)
- `/app/frontend/src/pages/PoleDetails.jsx` (ajout custom forms)
- `/app/backend/documentations_routes.py` (endpoints custom-forms + PDF)

**Tests** : 16/16 tests backend ✅ + 100% frontend ✅ (rapport `/app/test_reports/iteration_10.json`)

#### ✅ Feature: Refonte page Documentations (18 Jan 2026)
**Implémentation complète** de la refonte de la page Documentations avec arborescence :

**Nouvelle page "Modèles de formulaires"** (`/documentations/modeles`) :
- Accessible uniquement aux administrateurs (bouton à côté du titre "Documentations")
- Liste des modèles de formulaires groupés par type (Bon de travail, Autorisation particulière)
- 2 templates système créés automatiquement (non modifiables/supprimables)
- Possibilité de créer de nouveaux modèles personnalisés

**Page détail pôle refaite avec arborescence** :
- En-tête simplifié avec 2 boutons : "+ Ajouter document" et "+ Ajouter formulaire"
- Barre de recherche pour filtrer documents et formulaires
- Affichage en **arborescence** avec 3 sections :
  - 📁 **Documents** (avec compteur) - chevron pour développer/replier
  - 📋 **Bons de travail** (avec compteur) - chevron pour développer/replier
  - 🛡️ **Autorisations particulières** (avec compteur) - chevron pour développer/replier
- Chaque élément affiche : nom, date, et icônes d'action (Modifier*, Imprimer, Supprimer*)
- *Permissions : Créateur + Responsable de service + Admin peuvent modifier/supprimer

**Dialog "Ajouter un formulaire"** :
- Liste déroulante des types de formulaires disponibles
- Description du type sélectionné
- Redirige vers le formulaire vide correspondant

**Fichiers créés/modifiés :**
- `/app/frontend/src/pages/FormTemplatesPage.jsx` (NEW)
- `/app/frontend/src/pages/PoleDetails.jsx` (refonte complète)
- `/app/frontend/src/pages/Documentations.jsx` (bouton admin ajouté)
- `/app/frontend/src/App.js` (route /documentations/modeles)
- `/app/backend/documentations_routes.py` (endpoints form-templates)

**Tests** : 11/11 tests backend + 100% frontend (rapport `/app/test_reports/iteration_9.json`)

#### ✅ P0 Complété: Refonte module Presqu'accident
**Implémentation complète** de la refonte majeure du module Presqu'accident :

**Nouveau format d'ID automatique** :
- Format : `[année]-[numéro incrémenté]` (ex: 2026-001, 2026-002)
- Numérotation remise à 001 chaque nouvelle année
- Champ `numero` ajouté au modèle `PresquAccidentItem`
- Génération automatique à la création via `presqu_accident_routes.py` ligne 107-116

**Formulaire de création simplifié** :
- Champs **retirés** : Actions de prévention, Responsable action, Date échéance action, Commentaire
- Ces champs sont maintenant dans le **dialogue de traitement**
- Upload de fichiers possible dès la création

**Vue liste mise à jour** :
- Numéro formaté affiché dans une boîte grise à gauche (ex: "N° 2026-001")
- Anciens presqu'accidents affichent "N° -"
- **Icône Trombone (Paperclip)** : prévisualisation des pièces jointes
- **Icône ClipboardCheck** : ouvre le dialogue de traitement

**Nouveau dialogue de traitement** :
- Résumé de l'incident (numéro, titre, description)
- Champs : Statut*, Actions de prévention, Responsable de l'action, Date d'échéance, Commentaire
- Section pièces jointes du traitement
- **Permissions** : Responsable assigné peut éditer, autres utilisateurs en lecture seule

**Nouveaux statuts** :
- `A_TRAITER` (À traiter) - défaut
- `EN_COURS` (En cours)
- `TERMINE` (Terminé)
- `RISQUE_RESIDUEL` (Risque résiduel)
- Ancien statut `ARCHIVE` supprimé

**Bug Fix: Statistiques non chargées** :
- Correction backend : `ARCHIVE` → `RISQUE_RESIDUEL` dans 6 endpoints statistiques
- Correction frontend : accès correct aux données `stats.global` au lieu de `stats`
- Correction API : suppression du `.data` en double
- Ajout de la 5ème carte "Risque résiduel" (violet)

**Tests** : 8/8 tests backend + 100% frontend (rapport `/app/test_reports/iteration_8.json`)

#### ✅ Bug Fix: Statut planning M.Prev après fin de maintenance
**Problème** : Quand l'utilisateur terminait une maintenance et changeait le statut de l'équipement, les jours de maintenance passés affichaient "À l'arrêt" au lieu de "En maintenance".
**Cause** : Les entrées de planning étaient supprimées (`delete_many`) au lieu d'être marquées comme terminées, et l'API filtrait les entrées des demandes terminées.
**Solution** : 
- Remplacé `delete_many` par `update_many` pour conserver l'historique avec `maintenance_terminee: True`
- Modifié l'API pour retourner toutes les entrées (y compris terminées) avec un flag `demande_terminee`

#### ✅ Feature: Responsable de notification dans Plan de Surveillance
**Implémentation** d'un système de rappel par email pour les contrôles de surveillance :

**Frontend** (`SurveillanceItemForm.jsx`) :
- Nouveau champ "Responsable de notification" avec liste déroulante des utilisateurs
- Positionné entre "Durée de rappel d'échéance (jours)" et "Commentaire"
- Texte d'aide : "Cette personne recevra un email de rappel avant l'échéance du contrôle"

**Backend** :
- Nouveaux champs dans `SurveillanceItem` : `responsable_notification_id`, `email_rappel_envoye`
- Fonction `send_surveillance_reminder_email()` pour envoyer des emails HTML formatés
- Fonction `check_surveillance_reminders()` pour vérifier quotidiennement les échéances
- Cron job à 7h30 pour déclencher les rappels

**Contenu de l'email** :
- Nom du contrôle
- Équipement/Bâtiment concerné
- Date d'échéance

**Logique** : L'email est envoyé une seule fois, X jours avant l'échéance (basé sur "Durée de rappel d'échéance")

### Session du 17 Janvier 2026

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
- **Bug Page "Rapport P.accident"**: Correction des mises à jour temps réel (récurrence: 10 fois - NON RÉSOLU)

### P2 - Priorité Moyenne
- **Chatbot IA**: Implémentation (dé-priorisé par l'utilisateur)
- **Dashboard Plan de Surveillance**: Graphiques tendances des non-conformités
- **Analytics Checklists**: Dashboard analysant les résultats des checklists

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
