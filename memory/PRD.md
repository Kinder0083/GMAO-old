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

### Session du 22 Janvier 2026

#### ✅ Feature: Refonte complète du Dashboard IoT - Graphiques et Export (22 Jan 2026)
**Implémentation complète** de la refonte des graphiques de capteurs et fonctionnalité d'export global :

**Nouveau composant SensorChart** (`/app/frontend/src/components/Sensors/SensorChart.jsx`) :
- Courbe spline lisse avec `type="monotone"` (Recharts)
- Axe Y adaptatif avec marge de 15% autour des valeurs
- Axe X dynamique supportant jusqu'à 8 heures de données
- Grille avec lignes de référence verticales
- Seuils min/max affichés en pointillés rouges (`strokeDasharray="5 5"`)
- Valeur actuelle affichée en ligne grise horizontale
- Tooltip personnalisé avec valeur et unité

**Fonctionnalité d'export global** :
- Bouton "Exporter" en haut à droite du Dashboard IoT
- Dialogue de sélection avec :
  - Période : 24 heures, 7 jours, 30 jours, 3 mois, 6 mois (max)
  - Format : CSV ou XLSX (Excel)
- Téléchargement automatique du fichier

**Nouvel endpoint backend** (`/api/sensors/export/readings`) :
- Paramètres : `period_days` (1-180), `format` (csv/xlsx)
- Export de toutes les lectures de tous les capteurs actifs
- Colonnes : Date/Heure, Capteur, Type, Valeur, Unité, Emplacement
- Support Excel avec en-têtes colorés (violet)

**Refonte page IoTDashboard** (`/app/frontend/src/pages/IoTDashboard.jsx`) :
- Sélecteur de période : 1h, 2h, 4h, 8h, 24h, 7 jours
- 3 onglets : Vue d'ensemble, Groupes par Type, Groupes par Localisation
- 4 KPIs : Capteurs Actifs, Alertes Actives, Température Moyenne, Puissance Totale
- Jauges circulaires pour les valeurs actuelles
- Graphiques utilisant le nouveau composant SensorChart

**Fichiers créés/modifiés :**
- `/app/frontend/src/components/Sensors/SensorChart.jsx` (NEW)
- `/app/frontend/src/pages/IoTDashboard.jsx` (REFONTE COMPLÈTE)
- `/app/backend/sensor_routes.py` (nouvel endpoint export/readings)
- `/app/frontend/src/services/api.js` (méthode exportReadings)

**Tests** : 11/11 tests backend ✅ + 100% frontend ✅ (rapport `/app/test_reports/iteration_11.json`)

---

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

#### ✅ Feature: Ordres de Travail Type (Modèles d'OT) (19 Jan 2026)
**Nouvelle fonctionnalité** permettant de créer des ordres de travail pré-configurés pour accélérer la création d'OT récurrents.

**Backend** (`/app/backend/work_order_templates_routes.py` - NOUVEAU) :
- Routes CRUD complètes pour les modèles d'OT
- Endpoint de duplication de modèle
- Compteur d'utilisation incrémenté automatiquement
- Vérification d'accès : Admin + Responsables de service

**Frontend** :
- **Page "Ordres Type"** (`/app/frontend/src/pages/WorkOrderTemplatesPage.jsx` - NOUVEAU) :
  - Interface de gestion des modèles groupés par catégorie
  - Statistiques (total, catégories, utilisations)
  - Actions : Créer, Modifier, Dupliquer, Supprimer
  - Accessible via bouton "Ordres Type" sur la page des OT

- **Bouton "+ Nouvel Ordre (Modèle)"** sur la page Ordres de travail :
  - Ouvre un dialogue de sélection de modèle (`TemplateSelectionDialog.jsx` - NOUVEAU)
  - Prévisualisation du modèle sélectionné
  - Pré-remplit le formulaire d'OT avec les données du modèle

**Champs pré-remplis** : Titre, Description, Catégorie, Priorité, Statut, Équipement, Temps estimé

**Permissions** : Page "Ordres Type" accessible aux Admins et aux utilisateurs définis comme Responsables de service

---

#### ✅ Feature: WebSocket temps réel sur la page "Utilisateurs" (19 Jan 2026)
**Implémentation de la synchronisation temps réel** via WebSocket sur la page des utilisateurs :

**Frontend** (`/app/frontend/src/pages/People.jsx`) :
- Utilisation du hook `useRealtimeData` pour les utilisateurs
- Connexion WebSocket automatique au type `users`
- Polling de secours toutes les 60 secondes si WebSocket indisponible
- Indicateur visuel de connexion (badge "Temps réel" en vert ou "Hors ligne" en gris)
- Tooltip enrichi expliquant l'état de la synchronisation

**Backend** (`/app/backend/server.py`) :
- Ajout de l'émission d'événement WebSocket lors de la création d'un utilisateur
- Les événements `created`, `updated`, et `deleted` sont maintenant tous synchronisés

**Comportement** :
- Création d'un utilisateur → Tous les clients connectés voient le nouvel utilisateur apparaître
- Modification d'un utilisateur → Mise à jour automatique chez tous les clients
- Suppression d'un utilisateur → Disparition automatique de la liste chez tous

---

#### ✅ Bug Fix: Fonction "Demander de l'aide" - Envoi email (19 Jan 2026)
**Problème** : Message d'erreur "Erreur lors de l'envoi de l'email" lors de la soumission d'une demande d'aide.

**Cause** : Dans `/app/backend/server.py`, l'appel à `email_service.send_email_with_attachment()` passait un paramètre `attachments` (liste de dictionnaires) au lieu des paramètres attendus `attachment_data` (bytes) et `attachment_filename` (string).

**Correction** :
- Décodage du screenshot base64 en bytes avec `base64.b64decode()`
- Passage des paramètres corrects `attachment_data` et `attachment_filename`

**Fichier modifié** : `/app/backend/server.py` (ligne ~4157)

---

#### ✅ Feature: Tooltips enrichis sur l'ensemble de l'application (19 Jan 2026)
**Revue complète** de l'interface pour ajouter des infobulles enrichies (titre + description) :

**Pages modifiées avec tooltips enrichis** :
- `/app/frontend/src/components/Layout/MainLayout.jsx` - **EN-TÊTE PRINCIPAL** : Sidebar toggle, Chat Live, Échéances, Plan de Surveillance, Inventaire, Ordres de travail, Profil utilisateur
- `/app/frontend/src/pages/PoleDetails.jsx` - Boutons documents, bons, autorisations, formulaires
- `/app/frontend/src/pages/Inventory.jsx` - Actions surveillance, modifier, supprimer
- `/app/frontend/src/pages/Meters.jsx` - Boutons voir, modifier, supprimer (vues liste et arborescence)
- `/app/frontend/src/pages/RolesManagement.jsx` - Actions sur les rôles
- `/app/frontend/src/pages/FormTemplatesPage.jsx` - Actions sur les modèles
- `/app/frontend/src/pages/Documentations.jsx` - Actions sur les pôles
- `/app/frontend/src/components/FormBuilderDialog.jsx` - Actions sur les champs

**Format des tooltips enrichis** :
```jsx
<TooltipContent>
  <p className="font-medium">Titre de l'action</p>
  <p className="text-xs text-gray-300">Description détaillée</p>
</TooltipContent>
```

**Exemples ajoutés** :
- "Ouvrir le document" → "Télécharger ou imprimer ce fichier"
- "Modifier l'article" → "Éditer les informations et le stock"
- "Supprimer" → "Cette action est irréversible"
- "Activer la surveillance" → "Recevoir des alertes de stock bas"
- **En-tête** : "Minimiser le menu" → "Raccourci pour ajuster l'espace de travail"
- **En-tête** : "Chat Live" → "Messagerie instantanée avec l'équipe"
- **En-tête** : "Ordres de travail" → "X ordre(s) en attente"
- **En-tête** : "Mon Profil" → "Accéder aux paramètres du compte"

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

## Session du 19 Janvier 2026 (Suite)

#### ✅ Bug Fix: "Bell is not defined" dans AlertNotifications
- **Problème**: Erreur JavaScript "Bell is not defined" lors du clic sur l'icône roue dentée (alertes système)
- **Cause**: Import manquant de l'icône `Bell` depuis lucide-react
- **Solution**: Ajout de `Bell` dans les imports du fichier `AlertNotifications.jsx`
- **Fichier modifié**: `/app/frontend/src/components/Common/AlertNotifications.jsx`

#### ✅ P0 Validé: Script d'installation Proxmox v1.1.5
- **Fichier**: `/app/gmao-iris-v1.1.5-install-auto.sh`
- **Modifications validées par l'utilisateur**:
  - Version mise à jour 1.1.4 → 1.1.5
  - Appel au script `init_manual_on_install.py` pour générer le manuel complet
  - Messages de statut détaillés (24 chapitres, 70+ sections)
  - Documentation des nouvelles fonctionnalités (Ordres Type, Formulaires, Rôles, Tooltips)

---

## Tâches à venir

### P1 - Migration WebSocket
- Page "Rapports" - Mise à jour temps réel
- Page "Historique Achat" - Mise à jour temps réel

### P2 - Issues connues
- Page "Rapport P.accident" ne se met pas à jour en temps réel (récurrent)

### P2 - Backlog
- Fonctions spécifiques "Responsables de service"
- Dashboard Plan de Surveillance
- Analytique Checklists

---

## Session du 19 Janvier 2026 - Refonte Chatbot IA "Adria"

### ✅ Phase 1 : Refonte du Prompt Système (COMPLÉTÉ)
- Nouveau prompt expert GMAO (500+ lignes)
- Personnalité professionnelle et bienveillante
- Contexte enrichi avec données temps réel (OT, équipements, inventaire, alertes, maintenances)
- Support des commandes d'action automatique : `[[CREATE_OT:...]]`, `[[SEARCH:...]]`, etc.
- Commandes de navigation et guidage : `[[NAVIGATE:...]]`, `[[ACTION:...]]`

### ✅ Phase 2 : Actions Automatiques via Texte (COMPLÉTÉ)
- **Création d'OT** : L'IA peut créer des ordres de travail via commande
  - Endpoint : `/api/ai/action/create-ot`
  - Extraction automatique : titre, description, type, priorité, équipement
- **Ajout de temps** : Ajouter du temps passé sur un OT
  - Endpoint : `/api/ai/action/add-time`
- **Commentaires** : Ajouter des commentaires sur les OT
  - Endpoint : `/api/ai/action/comment`

### ✅ Phase 3 : Recherche Intelligente (COMPLÉTÉ)
- Recherche en langage naturel dans les données GMAO
- Endpoint : `/api/ai/action/search`
- Types supportés : work_orders, equipments, inventory, maintenance
- Filtres dynamiques (statut, priorité, type, etc.)

### ✅ Phase 4 : Guidage Visuel Pas à Pas (COMPLÉTÉ)
- Nouveau composant `GuidedHighlight.jsx`
- Surbrillance lumineuse sur les éléments cibles (pulse, glow, spotlight)
- Overlay sombre pour focaliser l'attention
- Flèche indicatrice pointant vers l'élément
- Panneau d'instruction avec progression (X/Y étapes)
- Commande : `[[GUIDE_START:nom]]...[[GUIDE_END]]`
- Ajout de `data-testid` sur les éléments du menu sidebar

### ✅ Phase 5 : Commandes Vocales Bidirectionnelles (COMPLÉTÉ)
- **Speech-to-Text (STT)** : 
  - Bouton microphone dans le chat
  - Enregistrement audio WebM
  - Transcription via OpenAI Whisper
  - Endpoint : `/api/ai/voice/transcribe`
- **Text-to-Speech (TTS)** :
  - Synthèse vocale des réponses d'Adria
  - Voix "nova" (féminine naturelle)
  - Bouton ON/OFF pour activer/désactiver
  - Endpoint : `/api/ai/voice/tts`

### Fichiers créés/modifiés
- `/app/backend/ai_chat_routes.py` - Refonte majeure (+300 lignes)
- `/app/frontend/src/components/Common/GuidedHighlight.jsx` - NOUVEAU
- `/app/frontend/src/components/Common/AIChatWidget.jsx` - +150 lignes (vocal)
- `/app/frontend/src/components/Layout/MainLayout.jsx` - data-testid ajoutés
- `/app/frontend/src/services/api.js` - Nouvelles fonctions API IA

---

## Tâches à venir

### P1 - Chatbot IA (suite)
- Phase 6 : Assistant contextuel par page (bouton "?" sur chaque page)
- Amélioration continue du prompt selon retours utilisateur

### P1 - Migration WebSocket
- Page "Rapports" - Mise à jour temps réel
- Page "Historique Achat" - Mise à jour temps réel

### P2 - Backlog
- Fonctions spécifiques "Responsables de service"
- Dashboard Plan de Surveillance
- Analytique Checklists

---

## Session du 20 Janvier 2026

### ✅ Bug Fix : Dialogue de statut après création d'OT
**Problème** : Lors de la création d'un nouvel ordre de travail (vierge ou depuis un modèle), le dialogue "Changer le statut de l'ordre de travail" apparaissait automatiquement et attendait une action de l'utilisateur.

**Cause racine** : Dans `WorkOrderFormDialog.jsx`, l'appel à `onOpenChange(false)` déclenchait le callback `handleDialogClose` qui contenait une logique pour afficher le dialogue de statut. Le `useState` n'était pas mis à jour de façon synchrone.

**Solution** : Utilisation de `useRef` pour le flag `submitSuccessfulRef` au lieu de `useState` - les refs sont synchrones.

**Fichier modifié** : `/app/frontend/src/components/WorkOrders/WorkOrderFormDialog.jsx`

---

### ✅ Bug Fix : Liste des OT ne se mettait pas à jour après création
**Problème** : Le toast "Succès" s'affichait mais le nouvel OT n'apparaissait pas dans la liste.

**Causes** :
1. La fonction `refresh` dans `useRealtimeData.js` ne retournait pas la Promise de `loadData()`
2. Une donnée corrompue dans MongoDB (statut `'en_attente'` en minuscule) faisait crasher l'API GET /work-orders

**Solutions** :
1. Correction de `useRealtimeData.js` : `return loadData()` au lieu de `loadData()`
2. Ajout de `await onSuccess()` dans `WorkOrderFormDialog.jsx`
3. Nettoyage des données corrompues dans MongoDB

**Fichiers modifiés** :
- `/app/frontend/src/hooks/useRealtimeData.js`
- `/app/frontend/src/components/WorkOrders/WorkOrderFormDialog.jsx`

**Tests effectués** :
- ✅ Création OT vierge → Toast + Liste mise à jour (15 → 16)
- ✅ Pas de dialogue de statut après création

---

### ✅ P0 Complété : Gestion des Doublons pour Import "Ordres Type"

**Problème** : L'import de modèles depuis Excel/CSV créait des doublons si des modèles avec les mêmes noms existaient déjà.

**Solution implémentée** :
- **Détection automatique** : Lors de l'import, le système compare les noms des modèles importés avec ceux existants (comparaison insensible à la casse)
- **Nouveau dialogue** : "Doublons détectés" affichant :
  - Résumé : Nombre de doublons vs nouveaux modèles
  - Liste détaillée des modèles en double avec leur catégorie
- **3 options utilisateur** :
  - **Écraser les existants** : Met à jour les modèles existants + crée les nouveaux
  - **Ignorer les doublons** : Crée uniquement les nouveaux modèles, ignore les existants
  - **Annuler l'import** : Aucune modification effectuée

**Fichier modifié** :
- `/app/frontend/src/pages/WorkOrderTemplatesPage.jsx` - Ajout du dialogue `DuplicateManagementDialog` et logique de détection

**Tests effectués** :
- ✅ Import avec doublons → Dialogue affiché correctement
- ✅ "Ignorer" → Seuls les nouveaux créés (7 → 8 modèles)
- ✅ "Écraser" → Existants mis à jour (descriptions, priorités changées)
- ✅ "Annuler" → Aucune modification, toast de confirmation

---

## Tâches à venir

### P1 - Migration WebSocket
- Page "Rapports" - Mise à jour temps réel
- Page "Historique Achat" - Mise à jour temps réel
- Bug "Rapport P.accident" temps réel (récurrent)

### P2 - Backlog
- Fonctions spécifiques "Responsables de service"
- Dashboard Plan de Surveillance
- Analytique Checklists
- Visite guidée

### ✅ Amélioration UX : Formulaire de visualisation d'un Ordre de Travail
**Demande utilisateur** : Simplifier la validation des interventions sur les OT.

**Modifications apportées** :

1. **Champ "Temps Passé" simplifié** (`WorkOrderDialog.jsx`) :
   - Un seul champ de saisie au lieu de deux (heures/minutes)
   - Parsing intelligent acceptant plusieurs formats : `01:30`, `1:30`, `1h30`, `1.5` (décimal)
   - Placeholder explicite : "Ex: 1:30, 1h30, 1.5"
   
2. **Boutons "Valider" et "Annuler"** :
   - Déplacés en bas à droite de la fenêtre
   - "Valider" (vert) : Enregistre commentaire + temps + ouvre dialogue statut
   - "Annuler" : Ferme la fenêtre sans sauvegarder
   
3. **Validation obligatoire** :
   - Commentaire obligatoire (*)
   - Temps passé obligatoire (*)
   
4. **Dialogue "Changer le statut"** (`StatusChangeDialog.jsx`) :
   - Suppression du champ "Temps passé sur cet ordre de travail" (car saisi avant)

**Fichiers modifiés** :
- `/app/frontend/src/components/WorkOrders/WorkOrderDialog.jsx`
- `/app/frontend/src/components/WorkOrders/StatusChangeDialog.jsx`

---
**Problème** : Les barres du graphique ne s'arrêtaient pas exactement au niveau des graduations de l'échelle Y. Par exemple, une barre de 3h s'affichait visuellement entre 3h et 4h au lieu d'être exactement à 3h.

**Cause** : 
1. L'échelle Y et les barres utilisaient des conteneurs de hauteurs différentes (h-full vs h-64)
2. L'échelle utilisait des pourcentages fixes (0%, 25%, 50%, 75%, 100%) au lieu de valeurs entières
3. Une marge de 10% était ajoutée au maxValue, créant un décalage

**Solution** :
1. Échelle Y avec des graduations entières dynamiques (0h, 1h, 2h, 3h...)
2. Alignement parfait entre l'échelle et les barres (même hauteur 256px)
3. Ajout de lignes de grille horizontales alignées sur les graduations
4. Suppression de la marge artificielle

**Fichier modifié** : `/app/frontend/src/components/Reports/TimeByCategoryChart.jsx`

---

## Dernière mise à jour
**Date**: 21 Janvier 2026
**Agent**: E1
**Tâche complétée**: Refonte UX du dialogue "Voir Amélioration" (alignement avec "Voir Ordre de Travail")

---

## Session du 21 Janvier 2026

### ✅ Feature : Refonte UX du dialogue "Voir Amélioration"
**Demande utilisateur** : Appliquer les mêmes modifications UX du dialogue "Voir Ordre de Travail" au dialogue "Voir Amélioration" pour assurer la cohérence de l'interface.

**Modifications apportées** :

1. **Champ "Temps Passé" simplifié** (`ImprovementDialog.jsx`) :
   - Un seul champ de saisie au lieu de deux (heures/minutes)
   - Parsing intelligent acceptant plusieurs formats : `01:30`, `1:30`, `1h30`, `1.5` (décimal)
   - Placeholder explicite : "Ex: 1:30, 1h30, 1.5"
   
2. **Boutons "Valider" et "Annuler"** :
   - Déplacés en bas de la section temps
   - "Valider" (vert) : Enregistre commentaire + temps + ouvre dialogue statut
   - "Annuler" : Ferme la fenêtre sans sauvegarder
   
3. **Validation obligatoire** :
   - Commentaire obligatoire (*)
   - Temps passé obligatoire (*)
   
4. **Dialogue "Changer le statut"** (`StatusChangeDialog.jsx` pour Improvements) :
   - Suppression du champ "Temps passé sur cette amélioration" (car saisi avant dans ImprovementDialog)

5. **Correction Backend** :
   - Modèles `Improvement`, `ImprovementCreate`, `ImprovementUpdate` : changé `tempsEstime` et `tempsReel` de `int` à `float` pour cohérence avec WorkOrder

**Fichiers modifiés** :
- `/app/frontend/src/components/Improvements/ImprovementDialog.jsx`
- `/app/frontend/src/components/Improvements/StatusChangeDialog.jsx`
- `/app/backend/models.py`

**Tests effectués** :
- ✅ Nouveau champ temps flexible fonctionne (formats 1h30, 1:30, 1.5)
- ✅ Boutons Valider/Annuler présents et fonctionnels
- ✅ Validation : commentaire et temps obligatoires
- ✅ Workflow complet : Valider → Toast succès → Dialogue statut s'ouvre
- ✅ Dialogue statut sans champ de temps redondant
- ✅ Temps réel mis à jour dans la liste

---

### Session du 22 Janvier 2026 (Suite)

#### ✅ Refactoring: Modularisation de MainLayout.jsx (22 Jan 2026)
**Objectif** : Réduire la complexité du fichier monolithique `MainLayout.jsx` (~1260 lignes) en extrayant des composants modulaires.

**Résultat du refactoring** :
| Fichier | Avant | Après |
|---------|-------|-------|
| `MainLayout.jsx` | ~1260 lignes | 616 lignes (-51%) |
| `Header.jsx` | nouveau | 388 lignes |
| `Sidebar.jsx` | nouveau | 287 lignes |
| `menuConfig.js` | existait | 168 lignes |
| `useOverdueItems.js` | existait | 210 lignes |

**Composants créés/modifiés** :
- `/app/frontend/src/components/Layout/Header.jsx` - Composant header avec :
  - Toggle sidebar
  - Logo GMAO Iris
  - Boutons Manuel, IA, Aide
  - Badges notifications (Chat Live, Échéances, Surveillance, Inventaire, OT)
  - Menu déroulant échéances dépassées
  - Profil utilisateur

- `/app/frontend/src/components/Layout/Sidebar.jsx` - Composant sidebar avec :
  - Menus de navigation principaux
  - Catégories avec sous-menus extensibles
  - Section admin (Paramètres Spéciaux, MQTT, Mise à jour, Journal, SSH)
  - Personnalisation et Déconnexion

- `/app/frontend/src/components/Layout/MainLayout.jsx` - Composant principal simplifié avec :
  - Logique métier (chargement données, événements)
  - Composition des composants Header et Sidebar
  - Zone de contenu principal (Outlet)
  - Modaux et popups

**Tests** : 100% frontend validé (rapport `/app/test_reports/iteration_12.json`)

---

## Tâches à venir

### P1 - Migration WebSocket
- Page "Rapports" - Mise à jour temps réel
- Page "Historique Achat" - Mise à jour temps réel
- Bug "Rapport P.accident" temps réel (récurrent - Issue #2)

### P2 - Backlog
- Fonctions spécifiques "Responsables de service"
- Dashboard Plan de Surveillance
- Analytique Checklists
- Visite guidée
