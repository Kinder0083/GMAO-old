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

### Session du 1er Février 2026 (Session actuelle)

#### ✅ Feature: Centre d'aide (Support Request) - P0
**Implémentation complète** d'un bouton "Centre d'aide" sur la page Paramètres permettant aux utilisateurs d'envoyer des demandes d'aide aux administrateurs :

**Backend** (`/app/backend/server.py`) :
- `POST /api/support/request` - Envoie une demande de support aux administrateurs
  - Paramètres : `subject` (optionnel), `message` (requis)
  - Envoie un email à tous les administrateurs actifs
  - Sauvegarde la demande dans la collection `support_requests`
  - Retourne `success: true` et message de confirmation

**Frontend** :
- **Composant `SupportRequestDialog.jsx`** (`/app/frontend/src/components/Common/`) :
  - Dialogue modal avec icône et titre "Centre d'aide"
  - Champ sujet (optionnel) et message (requis)
  - État de chargement pendant l'envoi
  - Écran de succès avec checkmark vert et message de confirmation
  - Fermeture automatique après 2 secondes

- **Page `Settings.jsx`** :
  - Carte "Besoin d'aide ?" dans la sidebar avec bouton "Centre d'aide"
  - Intégration du dialogue `SupportRequestDialog`

**Tests** : API curl ✅ + Screenshot Playwright ✅ (dialogue ouvert, formulaire rempli, succès)

---

#### ✅ Feature: Rapports Hebdo. (Rapports automatiques) - P1
**Implémentation complète** d'une page dédiée "Rapports Hebdo." pour configurer et gérer des rapports automatiques hebdomadaires, mensuels ou annuels :

**Backend** - Nouveaux fichiers :
- **`/app/backend/weekly_report_routes.py`** : Routes CRUD complètes
  - `GET /api/weekly-reports/templates` - Liste des modèles
  - `POST /api/weekly-reports/templates` - Créer un modèle
  - `PUT /api/weekly-reports/templates/{id}` - Modifier un modèle
  - `DELETE /api/weekly-reports/templates/{id}` - Supprimer un modèle
  - `POST /api/weekly-reports/templates/{id}/duplicate` - Dupliquer
  - `POST /api/weekly-reports/templates/{id}/test` - Envoyer un test
  - `GET /api/weekly-reports/history` - Historique des envois
  - `GET /api/weekly-reports/history/{id}/pdf` - Télécharger PDF archivé
  - `GET/PUT /api/weekly-reports/settings` - Paramètres globaux
  
- **`/app/backend/weekly_report_service.py`** : Service de génération
  - Collecte des données par service (OT, équipements, demandes, performance)
  - Génération HTML email avec design professionnel
  - Génération PDF avec reportlab (fallback si weasyprint non disponible)
  - Envoi email avec PDF en pièce jointe

- **`/app/backend/weekly_report_scheduler.py`** : Scheduler APScheduler
  - Planification automatique au démarrage
  - Support hebdomadaire (jour + heure), mensuel (jour du mois + heure), annuel
  - Gestion dynamique des jobs (ajout/suppression/mise à jour)

**Frontend** - Nouveaux fichiers :
- **`/app/frontend/src/pages/WeeklyReportsPage.jsx`** : Page principale avec 3 onglets
  - Onglet "Modèles" : Liste des modèles avec cards détaillées
  - Onglet "Historique" : Tableau des envois avec téléchargement PDF
  - Onglet "Paramètres" : Configuration globale (admin uniquement)
  - Stats : Nombre de modèles, actifs, envoyés, dernier envoi

- **`/app/frontend/src/components/WeeklyReports/`** :
  - `ReportTemplateCard.jsx` : Card d'affichage d'un modèle avec actions
  - `ReportTemplateForm.jsx` : Formulaire de création/édition avec 4 onglets
    - Général : Nom, description, service, période, actif/inactif
    - Planification : Fréquence, jour, heure, fuseau horaire
    - Destinataires : Emails personnalisés + responsables du service
    - Sections : OT, équipements, demandes, performance équipe
  - `ReportHistoryTable.jsx` : Tableau d'historique avec statuts et téléchargement
  - `ReportGlobalSettings.jsx` : Paramètres globaux (fuseau, email expéditeur)

**Collections MongoDB** :
- `weekly_report_templates` : Modèles de rapports configurés
- `weekly_report_history` : Historique des envois avec chemin PDF
- `weekly_report_settings` : Paramètres globaux

**Accès** :
- Administrateurs : Accès complet à tous les services
- Responsables de service : Accès uniquement à leur service

**Tests** : API curl ✅ + Screenshot Playwright ✅ (page avec modèle, envoi test réussi, PDF généré)

---

### Session du 31 Janvier 2026

#### ✅ Feature: Consigne Générale (envoi par service) - P0
**Implémentation complète** de la fonctionnalité "Consigne générale" permettant d'envoyer des messages pop-up à tous les utilisateurs d'un service ou à tous les services :

**Backend** (`/app/backend/consignes_routes.py`) :
- `GET /api/consignes/services` - Récupère la liste des services distincts des utilisateurs
- `POST /api/consignes/send-group` - Envoie une consigne à tous les utilisateurs d'un service (ou tous)
  - Paramètres : `service` (nom du service ou "ALL"), `message`
  - Retourne : total envoyés, en ligne, hors ligne, MQTT envoyés, liste des destinataires
  - Crée une consigne individuelle pour chaque destinataire
  - Envoie MQTT si configuré (topic principal + topic discret)
  - Log dans le journal d'audit

**Frontend** (`/app/frontend/src/pages/ChatLive.jsx`) :
- Nouveau bouton **"Consigne générale"** (rouge) à côté du bouton "Consigne" (orange)
- Modal complet avec :
  - Dropdown de sélection de service (ou "📢 Tous les services")
  - Textarea pour le message
  - Zone d'information sur ce que fait la consigne
  - Affichage du résultat après envoi :
    - Stats (total, en ligne, hors ligne, MQTT)
    - Liste détaillée des destinataires avec indicateur en ligne/hors ligne et MQTT
  - Bouton "Fermer" après envoi (au lieu de "Annuler")

**Data-testid ajoutés** :
- `consigne-group-button` - Bouton d'ouverture du modal
- `consigne-group-service-select` - Dropdown de sélection de service
- `consigne-group-message-input` - Textarea du message
- `send-consigne-group-button` - Bouton d'envoi

**Tests** : API testée via curl ✅ + Screenshots Playwright ✅

#### ✅ Refactoring: SpecialSettings.jsx - P3
**Découpage** du fichier monolithique de 2073 lignes en 7 composants réutilisables :

**Fichiers créés dans `/app/frontend/src/components/Settings/`** :
- `UserPasswordReset.jsx` (242 lignes) - Gestion des mots de passe utilisateurs
- `SecuritySettings.jsx` (126 lignes) - Paramètres de déconnexion automatique
- `TailscaleSettings.jsx` (307 lignes) - Configuration IP Tailscale
- `SmtpSettings.jsx` (394 lignes) - Configuration emails (SMTP)
- `MqttSettings.jsx` (340 lignes) - Configuration MQTT/IoT
- `LlmKeysSettings.jsx` (259 lignes) - Clés API des fournisseurs LLM
- `TimezoneSettings.jsx` (423 lignes) - Fuseau horaire et NTP
- `index.js` - Export centralisé des composants

**Fichier principal refactorisé** :
- `/app/frontend/src/pages/SpecialSettings.jsx` (70 lignes) - Importe et assemble les composants

**Avantages** :
- Meilleure maintenabilité et lisibilité
- Composants isolés et réutilisables
- Tests unitaires facilités
- Chaque composant gère son propre état

**Tests** : Screenshot Playwright ✅ + Compilation réussie ✅

#### ✅ Feature: Visite guidée interactive - P2
**Implémentation complète** d'un système de visite guidée pour les nouveaux utilisateurs :

**Composants créés** :
- `/app/frontend/src/contexts/GuidedTourContext.jsx` - Contexte React pour gérer l'état de la visite
- `/app/frontend/src/components/GuidedTour/GuidedTour.jsx` - Composant principal avec 11 étapes
- `/app/frontend/src/components/Settings/GuidedTourSettings.jsx` - Section dans les paramètres

**Fonctionnalités** :
- Tour de 11 étapes couvrant les principales fonctionnalités
- Overlay avec spotlight sur l'élément ciblé
- Navigation : Précédent, Suivant, Passer
- Progression visuelle (points + compteur)
- Démarrage automatique pour les nouveaux utilisateurs
- Possibilité de relancer depuis Paramètres
- Stockage dans localStorage pour mémoriser la complétion
- Compatible React 19 (solution custom sans dépendances externes)

**Étapes de la visite** :
1. Introduction de bienvenue
2. Menu de navigation (sidebar)
3. Tableau de bord (statistiques)
4. Notifications
5. Menu utilisateur (profil)
6. Équipements
7. Ordres de travail
8. Planning
9. Chat en direct
10. Assistant IA
11. Conclusion

**Data-testid ajoutés** :
- `sidebar-nav`, `dashboard-stats`, `ai-assistant-button`

**Tests** : Screenshots Playwright ✅ (3 étapes testées)

#### 🔧 Bug Fix: "Rapport P.accident" temps réel - P2
**Diagnostic du problème** :
- Le WebSocket `/ws/realtime/near_miss` fonctionne correctement en local (testé avec Python websockets)
- Les connexions WebSocket sont bloquées par le proxy Kubernetes de l'environnement de preview Emergent
- Le backend émet bien les événements `created`, `updated`, `deleted`

**Corrections appliquées** :
1. **Backend** (`/app/backend/realtime_manager.py`, `/app/backend/server.py`) :
   - Corrigé le potentiel double appel à `websocket.accept()` (paramètre `already_accepted`)
   - Ajouté des logs détaillés pour le debugging des connexions WebSocket
   - Validation du `user_id` requise

2. **Frontend** (`/app/frontend/src/hooks/usePresquAccident.js`) :
   - Réduit l'intervalle de polling de 30s à **10s** pour une meilleure réactivité

3. **Frontend** (`/app/frontend/src/pages/PresquAccidentList.jsx`) :
   - Ajouté un indicateur visuel de synchronisation :
     - "Temps réel" (vert) quand WebSocket connecté
     - "Sync auto" (orange) avec icône animée quand en mode polling

**État** :
- ✅ **Environnement local/production** : WebSocket fonctionne parfaitement
- ⚠️ **Preview Emergent** : Polling de secours actif (10s) car le proxy ne route pas les WebSocket `/ws/realtime/*`

---

### Session du 18 Janvier 2026

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

---

### Session du 22 Janvier 2026 (Fuseau Horaire)

#### ✅ Feature: Configuration Fuseau Horaire et NTP (22 Jan 2026)
**Objectif** : Permettre la configuration du fuseau horaire global de l'application et la synchronisation NTP pour corriger l'horodatage des capteurs MQTT.

**Backend créé** :
- `/app/backend/timezone_routes.py` : Nouveau module avec endpoints :
  - `GET /api/timezone/config` : Récupérer la configuration actuelle
  - `PUT /api/timezone/config` : Mettre à jour le fuseau horaire et serveur NTP
  - `GET /api/timezone/timezones` : Liste des 29 fuseaux horaires (GMT-12 à GMT+14)
  - `GET /api/timezone/ntp-servers` : Liste des serveurs NTP populaires
  - `POST /api/timezone/test-ntp?server=xxx` : Tester la connexion NTP
  - `GET /api/timezone/current-time` : Heure actuelle avec fuseau configuré

**Frontend ajouté dans `/app/frontend/src/pages/SpecialSettings.jsx`** :
- Section "Fuseau Horaire et Synchronisation NTP" avec :
  - Indicateur d'heure en temps réel du serveur
  - Recherche et sélection des fuseaux horaires par ville ou GMT
  - Grille des serveurs NTP populaires (pool.ntp.org, time.google.com, etc.)
  - Champ personnalisé pour serveur NTP custom
  - Bouton "Tester la connexion" avec affichage du décalage en ms
  - Bouton "Sauvegarder la configuration"

**Modifications supplémentaires** :
- `/app/backend/mqtt_sensor_collector.py` : Applique le fuseau configuré aux horodatages des capteurs MQTT
- `/app/backend/models.py` : Nouveaux modèles Pydantic (TimezoneConfig, NTPTestResult)
- Dépendance `ntplib` ajoutée pour les tests NTP

**Tests** : API validée par curl, frontend validé par screenshots

---

### Session du 26 Janvier 2026

#### ✅ Bug Fix: Abscisses graphique IoT décalées de -1h (26 Jan 2026)
**Problème** : Les heures sur les abscisses du graphique des capteurs IoT étaient toujours décalées de -1h par rapport à l'heure réelle, même après avoir configuré le fuseau horaire.

**Cause** : La fonction `formatChartData` dans `IoTDashboard.jsx` utilisait `toLocaleTimeString` qui appliquait le fuseau horaire local du navigateur au lieu du fuseau horaire configuré dans l'application.

**Solution** :
- Créé un nouvel endpoint public `GET /api/timezone/offset` qui retourne uniquement le décalage horaire configuré
- Modifié `IoTDashboard.jsx` pour charger le fuseau horaire au démarrage
- Réécrit `formatChartData` en `useCallback` pour appliquer manuellement le décalage horaire aux timestamps avant l'affichage

**Fichiers modifiés** :
- `/app/backend/timezone_routes.py` : Ajout de l'endpoint `GET /api/timezone/offset`
- `/app/frontend/src/services/api.js` : Ajout de la méthode `api.timezone.getOffset()`
- `/app/frontend/src/pages/IoTDashboard.jsx` : Chargement du timezone et correction de `formatChartData`

#### ✅ Bug Fix: Filtrage par date non fonctionnel sur "Ordres de travail" (26 Jan 2026)
**Problème** : Sur la page "Ordres de travail", les boutons de filtrage par date (Aujourd'hui, Cette semaine, Ce mois, Personnalisé) n'avaient aucun effet - tous les OT étaient affichés quelle que soit la sélection.

**Cause** : Le hook `useWorkOrders` était appelé avec des paramètres vides `{}` et ne transmettait jamais les filtres de date calculés (`date_debut`, `date_fin`, `date_type`) à l'API backend.

**Solution** :
- Modifié `useWorkOrders.js` pour accepter et transmettre les paramètres de date (`date_debut`, `date_fin`, `date_type`) à `workOrdersAPI.getAll(params)`
- Refactorisé `WorkOrders.jsx` pour calculer les filtres de date via `getDateFilters()` (useCallback) et les passer au hook `useWorkOrders`

**Fichiers modifiés** :
- `/app/frontend/src/hooks/useWorkOrders.js` : Ajout de la transmission des paramètres de date à l'API
- `/app/frontend/src/pages/WorkOrders.jsx` : Calcul des filtres de date et passage au hook

**Tests effectués** :
- ✅ API `/api/timezone/offset` retourne correctement `{"timezone_offset": 1}`
- ✅ Filtrage "Aujourd'hui" fonctionne (0 OT car aucun n'a été créé aujourd'hui, l'unique OT date du 21/01)
- ✅ Frontend compile sans erreurs

#### ✅ Feature: Historique Git et Rollback de versions (26 Jan 2026)
**Objectif** : Permettre de voir l'historique des versions déployées et revenir à une version précédente via Git.

**Backend ajouté** (`/app/backend/update_manager.py`) :
- `get_git_history(limit)` : Récupère les derniers commits Git avec hash, date, message, auteur
- `rollback_to_commit(commit_hash)` : Effectue un `git reset --hard` vers un commit spécifique avec backup automatique

**Nouveaux endpoints** (`/app/backend/server.py`) :
- `GET /api/updates/git-history` : Liste les commits Git disponibles
- `POST /api/updates/git-rollback?commit_hash=xxx` : Rollback vers un commit spécifique

**Frontend modifié** (`/app/frontend/src/pages/Updates.jsx`) :
- Nouvelle section "Historique des versions (Git)" en violet
- Affiche la liste des commits avec :
  - Hash court (ex: `a1b2c3d`)
  - Message du commit
  - Date et auteur
  - Badge "VERSION ACTUELLE" pour le commit actif
  - Bouton "Revenir" pour chaque version précédente
- Message explicatif si Git non configuré sur le serveur
- Confirmation avec description avant rollback
- Backup automatique de la BDD avant rollback

**Note** : Cette fonctionnalité nécessite que Git soit installé et configuré sur le serveur Proxmox. Sur l'environnement Emergent, la section affiche "Aucun historique Git disponible".

---

## Tâches à venir

### P1 - Priorité Haute
- Bug "Rapport P.accident" temps réel (récurrent - 10+ occurrences, NON RÉSOLU)

### P2 - Backlog
- Fonctions spécifiques "Responsables de service"
- Dashboard Plan de Surveillance
- Analytique Checklists
- Visite guidée
- Refactoring `SpecialSettings.jsx` (~1800 lignes)

---

### Session du 31 Janvier 2026

#### ✅ Feature: Système de Consignes avec notification MQTT (31 Jan 2026)
**Objectif** : Permettre aux administrateurs d'envoyer des consignes importantes aux utilisateurs avec notification popup et intégration MQTT.

**Backend créé** (`/app/backend/consignes_routes.py`) :
- `POST /api/consignes/send` : Envoie une consigne à un utilisateur
  - Stocke en base de données (collection `consignes`)
  - Notifie via WebSocket si l'utilisateur est connecté
  - Envoie un message MQTT sur `{topic_utilisateur}{action_reception}`
  - Avertit l'expéditeur si le destinataire est hors ligne
- `GET /api/consignes/pending` : Récupère les consignes non acquittées
- `POST /api/consignes/{id}/acknowledge` : Acquitte une consigne
  - Envoie un message MQTT sur `{topic_utilisateur}{action_ok}`
  - Envoie un message dans le Chat Live
  - Log dans le journal d'audit
- `GET /api/consignes/history` : Historique des consignes envoyées/reçues
- WebSocket `/ws/consignes/{token}` : Notifications temps réel

**Frontend - Profil utilisateur** (`EditUserDialog.jsx`) :
- Nouveaux champs visibles uniquement pour les administrateurs :
  - **Topic Récepteur MQTT** : Topic de base pour l'utilisateur
  - **Action Réception** : Suffixe ajouté lors de la réception d'une consigne
  - **Action OK** : Suffixe ajouté lors de l'acquittement

**Frontend - Chat Live** (`ChatLive.jsx`) :
- Nouveau bouton **"Consigne"** (orange) à côté de "Message privé"
- Modal pour sélectionner un destinataire et écrire le message
- Indicateur si l'utilisateur est en ligne (🟢) ou hors ligne (⚫)
- Avertissement si l'utilisateur est hors ligne

**Frontend - Popup globale** (`ConsignePopup.jsx`) :
- Composant intégré dans `MainLayout.jsx`
- S'affiche par-dessus toute l'application
- Affiche : nom de l'expéditeur, date/heure, message
- Bouton "OK - J'ai lu la consigne" pour acquitter
- Gère plusieurs consignes en file d'attente

**Format des messages MQTT** (identique à "Publier un paquet") :
```json
// À la réception (topic: {mqtt_topic}{action_reception})
{
  "type": "consigne_received",
  "sender": "Nom Expéditeur",
  "message": "Contenu de la consigne",
  "timestamp": "2026-01-31T...",
  "consigne_id": "..."
}

// À l'acquittement (topic: {mqtt_topic}{action_ok})
{
  "type": "consigne_acknowledged",
  "consigne_id": "...",
  "acknowledged_by": "Nom Utilisateur",
  "timestamp": "2026-01-31T...",
  "original_sender": "Nom Expéditeur"
}
```

**Tests effectués** :
- ✅ API `/api/consignes/pending` retourne les consignes en attente
- ✅ Interface Chat Live avec bouton "Consigne" visible
- ✅ Modal d'envoi de consigne fonctionnel
- ✅ Champs MQTT dans le formulaire d'édition utilisateur

---

### Session du 31 Janvier 2026

#### ✅ Feature: Système de Widgets Personnalisés pour Responsables de Service (31 Jan 2026)
**Implémentation complète** du système de widgets customisables avec dashboard dédié :

**Nouvelle page ServiceDashboard** (`/app/frontend/src/pages/ServiceDashboard.jsx`) :
- Grille responsive de widgets (4 colonnes)
- Auto-refresh toutes les 60 secondes (configurable)
- Actions par widget : Rafraîchir, Modifier, Supprimer
- Affichage de l'horodatage de dernière mise à jour
- Badge "Partagé" pour widgets partagés
- Badge "Erreur" pour widgets en échec
- Accessible via `/service-dashboard` depuis le menu principal

**Éditeur de widgets** (`/app/frontend/src/pages/CustomWidgetEditor.jsx`) :
- 4 onglets : Général, Sources de données, Visualisation, Partage
- **Types de sources** :
  - Valeur manuelle (input direct)
  - Fichier Excel via SMB (avec credentials optionnels)
  - Données GMAO (26 types de données disponibles)
  - Formules combinant plusieurs sources
- **Types de visualisation** :
  - Valeur simple, Jauge, Graphique ligne, Graphique barres
  - Camembert, Donut, Tableau
- **Personnalisation** :
  - Taille (petit, moyen, large, plein)
  - 10 schémas de couleurs
  - Préfixe/Suffixe, Unité, Décimales
- **Partage** :
  - Privé, Service, Admins seulement, Rôles spécifiques

**Backend API** (`/app/backend/custom_widgets_routes.py`) :
- `GET /api/custom-widgets` - Liste des widgets accessibles
- `GET /api/custom-widgets/{id}` - Détail d'un widget
- `POST /api/custom-widgets` - Création
- `PUT /api/custom-widgets/{id}` - Modification
- `DELETE /api/custom-widgets/{id}` - Suppression
- `POST /api/custom-widgets/{id}/refresh` - Rafraîchir les données
- `GET /api/custom-widgets/data-types/gmao` - 26 types de données GMAO
- `POST /api/custom-widgets/test/excel-connection` - Test connexion SMB
- `POST /api/custom-widgets/validate/formula` - Validation formule

**Service GMAO** (`/app/backend/gmao_data_service.py`) :
- 26 types de données extraites de la base MongoDB :
  - Ordres de travail (total, en attente, en cours, complétion, durée moyenne)
  - Équipements (total, actifs, pannes, taux disponibilité)
  - Maintenance préventive (planifiées, réalisées, taux réalisation)
  - Interventions (demandes, terminées, temps réponse)
  - Inventaire (articles, valeur stock, alertes)
  - Capteurs (actifs, en alarme)
  - Utilisateurs (total, actifs)
- Support des filtres par service et période

**Modèles de données** (`/app/backend/custom_widgets_models.py`) :
```python
CustomWidgetCreate:
  - name, description
  - data_sources: List[WidgetDataSource]
  - primary_source_id
  - visualization: WidgetVisualization
  - refresh_interval (minutes)
  - is_shared, shared_with_roles

WidgetDataSource:
  - id, name, type
  - manual_value, excel_config, gmao_config, formula
  - cached_value, last_refresh, error_message

ExcelDataSource:
  - smb_path, sheet_name, cell_reference
  - column_name, row_filter, aggregation
  - smb_username, smb_password (optionnels)
```

**Tests** (`/app/backend/tests/test_custom_widgets.py`) :
- 11 tests unitaires passent à 100%
- Couverture : CRUD, refresh, types GMAO, connexion Excel, formules

**Notes importantes** :
- Le service Excel SMB (`excel_smb_service.py`) est un PLACEHOLDER - retourne des données mock car pas de serveur SMB disponible dans l'environnement de preview
- Les credentials SMB peuvent être saisis manuellement par l'utilisateur pour chaque source
- L'entrée "Dashboard Service" a été ajoutée au menu de navigation

---

## Session du 31 Janvier 2026 (Suite)

### ✅ Feature: Filtrage automatique par service (P0 - COMPLÉTÉ)
**Implémentation complète** du filtrage automatique des données par service pour les responsables :

**Backend** (`/app/backend/service_filter.py`) :
- `get_user_service_filter(user)` : Retourne le filtre service pour un utilisateur
- `get_user_managed_services(user)` : Retourne les services gérés par un responsable
- `is_service_manager(user)` : Vérifie si l'utilisateur est responsable de service
- `apply_service_filter(query, user, field)` : Applique le filtre aux requêtes MongoDB
- `get_service_team_members(user)` : Retourne les membres de l'équipe du service

**Nouveaux endpoints API** (`/app/backend/server.py`) :
- `GET /api/service-manager/status` : Statut de responsable + services gérés
- `GET /api/service-manager/team` : Liste des membres de l'équipe
- `GET /api/service-manager/stats` : Statistiques filtrées (OT, équipements, etc.)

**Endpoints avec filtrage automatique** :
- `GET /api/work-orders` : Filtrage par champ `service`
- `GET /api/equipments` : Filtrage par champ `service`
- `GET /api/preventive-maintenance` : Filtrage par champ `service`
- `GET /api/intervention-requests` : Filtrage par champ `service`
- `GET /api/improvement-requests` : Filtrage par champ `service`
- `GET /api/presqu-accidents` : Filtrage par champ `service`

**Frontend** :
- `/app/frontend/src/hooks/useServiceManagerStatus.js` : Hook pour récupérer le statut de manager
- `/app/frontend/src/components/Common/ServiceFilterBadge.jsx` : Badge "Service : X" affiché sur les pages filtrées
- Badge intégré dans `WorkOrders.jsx` et `Assets.jsx`
- Page `ServiceTeamView.jsx` complète avec stats et liste d'équipe

**Modèles mis à jour** (`/app/backend/models.py`) :
- `WorkOrderBase`, `WorkOrderUpdate` : Ajout du champ `service`
- `EquipmentBase`, `EquipmentCreate`, `EquipmentUpdate` : Ajout du champ `service`

**Comportement** :
- **Admin** : Voit toutes les données, pas de badge affiché
- **Responsable de service** : Voit uniquement les données de son service, badge bleu "Service : X" affiché
- **Utilisateur normal** : Voit les données de son propre service (si défini)

**Utilisateur de test créé** :
- Email : `responsable.maintenance@test.com`
- Password : `password`
- Rôle : TECHNICIEN, responsable du service "Maintenance"

**Tests** : 100% backend (11/11) + 100% frontend (rapport `/app/test_reports/iteration_14.json`)

---

## Tâches à venir

### P1 - Priorité Haute
- Validation/Approbation des demandes (workflow)
- Rapport hebdomadaire automatique (scheduler)
- Gestion d'équipe et pointage

### P2 - Backlog
- Dashboard Plan de Surveillance
- Analytics Checklist
- Caméras RTSP/ONVIF (requires infrastructure)

### P3 - Futur
- Intégration calendrier externe
- Application mobile
