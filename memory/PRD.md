# GMAO Iris - Product Requirements Document

## Problème Original
Application de GMAO (Gestion de Maintenance Assistée par Ordinateur) nommée "GMAO Iris" avec de nombreux modules: ordres de travail, équipements, maintenance préventive, surveillance, etc.

## Fonctionnalités Récentes Ajoutées (Sessions Précédentes)
- **AI Extraction Surveillance**: Upload de documents, extraction IA, recherche web de périodicité, création automatique d'ordres curatifs
- **Historique & Dashboard AI**: Collection `ai_analysis_history`, page historique, dashboard KPIs/graphiques/alertes
- **Export PDF Dashboard**: Bouton export PDF via jspdf + html2canvas
- **Pièces jointes multiples**: Support multi-fichiers sur contrôles de surveillance
- **Recherche Plan de Surveillance**: Endpoint search + UI barre de recherche

## Bug P0 Corrigé (Session Actuelle - 17 Feb 2026)

### Problème
Les utilisateurs non-admin ne pouvaient pas accéder aux modules (Ordres de Travail, etc.) malgré leurs permissions de rôle.

### Causes Racines Identifiées et Corrigées
1. **`serialize_doc()` polluait les permissions** - Ajoutait récursivement `dateCreation` et `attachments` à TOUS les dicts imbriqués, y compris les permissions. Corrigé avec paramètre `_is_root`.
2. **`register` utilisait des permissions hardcodées obsolètes** (9 modules au lieu de 42). Corrigé pour utiliser `get_default_permissions_by_role()`.
3. **`update_user` ne mettait PAS à jour les permissions quand le rôle changeait**. Corrigé pour auto-update.
4. **Migration automatique au démarrage** ajoutée pour corriger les utilisateurs existants avec permissions incomplètes.
5. **Bug menu migration** corrigé (crash quand `menu_items` contenait des strings).

### Fichiers Modifiés
- `backend/server.py`: serialize_doc(), register(), update_user(), startup migration, migrate-all-permissions endpoint
- Aucun fichier frontend modifié (le bug était 100% backend)

### Endpoints Ajoutés
- `POST /api/users/migrate-all-permissions` - Réinitialise les permissions de tous les utilisateurs selon leur rôle

## Architecture
```
/app
├── backend/
│   ├── server.py              # Serveur principal FastAPI
│   ├── auth.py                # Auth JWT
│   ├── dependencies.py        # get_current_user, require_permission, check_permission
│   ├── models.py              # Modèles Pydantic, UserPermissions, get_default_permissions_by_role
│   ├── roles_routes.py        # Routes gestion des rôles
│   ├── surveillance_routes.py # Routes AI surveillance
│   └── ...
└── frontend/
    └── src/
        ├── hooks/usePermissions.js  # Hook permissions frontend
        ├── components/Layout/MainLayout.jsx  # Menu filtrage par permissions
        └── ...
```

## Intégrations 3rd Party
- Google Drive API
- Gemini Pro (via emergentintegrations) - Extraction IA
- Tailscale Funnel

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: tech.test@test.com / Test1234!

## Backlog / Tâches Futures
- Aucune tâche en attente signalée par l'utilisateur
- Note: Le dialogue de changement de mot de passe apparaît pour les utilisateurs firstLogin=true (comportement attendu)
