# GMAO Iris - Product Requirements Document

## Problème Original
Application de GMAO (Gestion de Maintenance Assistée par Ordinateur) nommée "GMAO Iris" avec de nombreux modules: ordres de travail, équipements, maintenance préventive, surveillance, etc.

## Architecture
```
/app
├── backend/
│   ├── server.py              # Serveur principal FastAPI
│   ├── auth.py                # Auth JWT
│   ├── dependencies.py        # get_current_user, require_permission, check_permission
│   ├── models.py              # Modèles Pydantic (SurveillanceItem: +annee, +groupe_controle_id)
│   ├── roles_routes.py        # Routes gestion des rôles
│   ├── surveillance_routes.py # Routes surveillance (+onglets année, +récurrence, +migration)
│   └── ...
└── frontend/
    └── src/
        ├── hooks/useSurveillancePlan.js  # Hook temps réel (+annee param)
        ├── services/api.js               # API (+getAvailableYears, +migrateYears, stats avec annee)
        ├── pages/SurveillancePlan.jsx     # Page principale (+onglets année, +selectedYear state)
        └── ...
```

## Intégrations 3rd Party
- Google Drive API, Tailscale Funnel, Gemini Pro (via emergentintegrations)

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: tech.test@test.com / Test1234!

## Fonctionnalités Implémentées

### Session 17 Feb 2026 (actuelle)

#### Bug P0 RBAC Permissions - CORRIGÉ ✅
- `serialize_doc()` polluait récursivement les dicts imbriqués avec dateCreation/attachments
- `register` utilisait des permissions hardcodées obsolètes (9 vs 42 modules)
- `update_user` ne mettait pas à jour les permissions quand le rôle changeait
- Migration automatique au démarrage + endpoint POST /api/users/migrate-all-permissions

#### Onglets par Année - Plan de Surveillance ✅
- Onglets 2024/2025/2026(en cours)/2027 au-dessus des catégories
- Année courante sélectionnée par défaut avec badge "(en cours)"
- Statistiques calculées par année sélectionnée
- Génération automatique des contrôles récurrents jusqu'à fin N+1 lors de la création
- Migration des contrôles existants avec assignation d'année et génération des récurrences
- Endpoints: GET /surveillance/available-years, POST /surveillance/migrate-years
- Modèle: +annee (int), +groupe_controle_id (str) sur SurveillanceItem

### Sessions Précédentes
- AI Extraction Surveillance ✅
- Historique & Dashboard AI ✅
- Export PDF Dashboard ✅
- Pièces jointes multiples ✅
- Recherche Plan de Surveillance ✅

## Backlog / Tâches Futures
- Aucune tâche en attente signalée par l'utilisateur
