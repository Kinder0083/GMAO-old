# GMAO Iris - Product Requirements Document

## Problème Original
Application de GMAO (Gestion de Maintenance Assistée par Ordinateur) nommée "GMAO Iris".

## Architecture
```
/app
├── backend/
│   ├── server.py                    # Serveur principal FastAPI
│   ├── ai_maintenance_routes.py     # Routes IA (checklists, maintenance, non-conformités, OT curatifs)
│   ├── surveillance_routes.py       # Routes surveillance (+onglets année, +récurrence)
│   ├── dependencies.py              # Auth (require_permission, get_current_user)
│   ├── models.py                    # Modèles Pydantic
│   └── ...
└── frontend/
    └── src/
        ├── components/
        │   ├── AIChecklistGenerator.jsx       # Dialog génération IA checklists
        │   ├── AIMaintenanceGenerator.jsx     # Dialog génération IA maintenance
        │   └── AINonconformityAnalyzer.jsx    # Dialog analyse IA NC + création OT en 1 clic
        ├── services/api.js                    # +aiMaintenanceAPI
        └── pages/
            ├── ChecklistsManagement.jsx       # +bouton "Générer avec IA"
            ├── PreventiveMaintenance.jsx       # +bouton "Générer avec IA"
            ├── AnalyticsChecklistsPage.jsx    # +bouton "Analyse IA"
            └── SurveillancePlan.jsx           # +onglets par année
```

## Intégrations
- Google Drive API, Tailscale Funnel
- Gemini 2.5 Flash (via emergentintegrations) - AI extraction

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: tech.test@test.com / Test1234!

## Implémenté - Session 17 Feb 2026

### Bug P0 RBAC ✅
### Onglets par Année (Surveillance) ✅
### IA Génération Checklists ✅
### IA Programme Maintenance Préventive ✅
### IA Analyse Non-conformités ✅
### Création OT Curatifs depuis Analyse IA ✅
- Bouton "Créer OT" individuel + "Créer tous les OT" en lot
- Endpoint: POST /api/ai-maintenance/create-work-orders-from-analysis
- OT créés avec categorie=TRAVAUX_CURATIF, statut=OUVERT, source=ai_nonconformity_analysis

### Alertes Email Automatiques NC Critiques (17 Feb 2026)
- Quand l'analyse IA détecte des patterns CRITIQUE/IMPORTANT, envoi automatique :
  - Notification in-app (collection `notifications`, type `ai_nc_critical_alert`)
  - Email HTML formaté au responsable du service concerné (via `service_responsables`)
- Fichiers modifiés : `ai_maintenance_routes.py`, `email_service.py`, `AINonconformityAnalyzer.jsx`

### Nouvelles rubriques Presqu'accidents + Reorganisation formulaire (17 Feb 2026)
- 7 nouvelles rubriques ajoutées : Catégorie incident, Equipement lié, Mesures immédiates, Type lésion potentielle, Témoins, Conditions incident, Facteurs contributifs
- Formulaire réorganisé en 7 sections claires : Identification, Description, Personnes, Evaluation, Equipement, Actions, Pièces jointes
- Fichiers modifiés : `models.py`, `PresquAccidentList.jsx`

### 4 Fonctionnalités IA Presqu'accidents (17 Feb 2026)
- **Analyse IA Causes Racines** : 5 Pourquoi + Ishikawa dans le dialogue de traitement, avec bouton "Appliquer l'évaluation"
- **Détection Incidents Similaires** : Recherche automatique lors de la création (debounce 2s, min 15 chars)
- **Analyse IA Tendances** : Patterns récurrents, zones à risque, prédictions, alertes email aux responsables
- **Rapport QHSE** : Rapport structuré prêt pour réunion (résumé exécutif, KPIs, plan d'action, impression)
- Fichiers créés : `ai_presqu_accident_routes.py`, `AIRootCauseAnalyzer.jsx`, `AISimilarIncidents.jsx`, `AIPATrendAnalyzer.jsx`, `AIQHSEReport.jsx`
- Fichiers modifiés : `server.py`, `api.js`, `PresquAccidentList.jsx`, `PresquAccidentRapport.jsx`

### Indicateur visuel contrôles récurrents - Plan de Surveillance (17 Feb 2026)
- Icône chaîne (Link2) à côté du nom de chaque contrôle ayant un `groupe_controle_id`
- Popover au clic : affiche toutes les occurrences du contrôle (année, date, statut)
- Navigation inter-année : clic sur une occurrence → changement d'onglet année
- Occurrence courante mise en évidence (fond bleu, label "ici")
- Intégré dans les 3 vues : ListViewGrouped (Liste), GridView (Grille), ListView
- Backend : `GET /api/surveillance/occurrences/{groupe_controle_id}`
- Fichiers : `RecurrenceIndicator.jsx`, `ListView.jsx`, `ListViewGrouped.jsx`, `GridView.jsx`, `SurveillancePlan.jsx`
- Tests : 100% backend (5/5 pytest), 100% frontend (7/7 features)

## Backlog
- Aucune tâche en attente

### Documentation mise à jour (17 Feb 2026)
- README.md : section IA complète, endpoints API IA, stack technique mise à jour
- CHANGELOG.md : version 1.6.0 détaillée
- Manuel utilisateur : 2 nouveaux chapitres IA (8 sections)
- version.json : v1.6.0 "Intelligence Artificielle QHSE"
- Personnalisation IA : liste des fonctionnalités utilisant le modèle LLM

### Visite guidée personnalisée par profil (17 Feb 2026)
- 6 profils : Maintenance, Production, QHSE, Logistique, Direction, Générique (fallback)
- Étapes communes (intro, menu, dashboard, notifications, chat, assistant IA, fin) + étapes spécifiques au métier
- Textes adaptés au profil (ex: "Consultez les OT qui vous sont assignés" pour Maintenance)
- Admin sans service → visite Direction, non-admin sans service → visite Générique
- Fichier modifié : `GuidedTour.jsx`
