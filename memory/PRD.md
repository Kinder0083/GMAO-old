# PRD - GMAO Atlas / M.E.S. System

## Derniere mise a jour: 2026-02-14

## Enonce du probleme original
Application CMMS/GMAO complete avec module M.E.S. (Manufacturing Execution System) pour le suivi de production en temps reel.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async)
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Temps reel**: WebSocket + MQTT (paho-mqtt)
- **Planification**: APScheduler
- **Graphiques**: Recharts

## Fonctionnalites implementees

### Phase 1 - Base GMAO (Complete)
- Authentification JWT
- Gestion des utilisateurs et roles
- Ordres de travail (CRUD complet)
- Demandes d'intervention
- Gestion des equipements
- Inventaire et stock
- Maintenance preventive
- Planning et calendrier
- Fournisseurs
- Import/Export Excel
- Journal d'audit
- Chat Live et collaboration
- Capteurs MQTT et IoT
- Cameras RTSP/ONVIF
- Tableau d'affichage (Whiteboard)
- Demandes d'achat
- Gestion des zones
- Compteurs
- Plan de surveillance
- Presqu'accidents
- Documentations
- Rapports et analyses
- Assistant IA
- Dashboard Service
- Gestion d'equipe / Pointage
- Rapports hebdomadaires planifies
- Analytics Checklists
- Demandes d'arret
- Consignes
- Autorisations particulieres

### Phase 2 - Module M.E.S. (Complete)
- Suivi production temps reel
- Calcul TRS (Disponibilite, Performance, Qualite)
- Comptage coups/impulsions MQTT
- Detection arrets machine
- Alertes sous/sur-cadence
- Rapports M.E.S. historiques
- Rapports planifies automatiques
- Configuration machines et parametres

### Phase 3 - Refactoring API (Complete - 2026-02-13)
- ~193 endpoints avec response_model Pydantic
- Documentation Swagger/ReDoc protegee (HTTP Basic Auth)
- Enrichissement OpenAPI avec tags, descriptions, exemples
- Configuration dans backend/utils/openapi_config.py

### Phase 4 - Integration permissions, menus et manuel (Complete - 2026-02-14)
- 7 nouveaux modules de permissions (mes, mesReports, serviceDashboard, weeklyReports, demandesArret, consignes, autorisationsParticulieres)
- Tous les modules presents dans MenuOrganizationSection (35 items) et DisplayPreferencesSection
- Manuel utilisateur: 36 chapitres et 106 sections (10 nouveaux chapitres)
- Migration automatique au demarrage (permissions, manuel, menus)
- Fichier manual_default_content.json pour installations fraiches
- Endpoint migration: POST /api/roles/migrate-permissions
- RolesManagement: 43 modules dans la grille de permissions

### Phase 5 - Changelog, Badges et Avertissement MAJ (Complete - 2026-02-14)
- **Changelog integre**: Popup affichant les nouveautes apres mise a jour
  - GET /api/changelog - Liste des mises a jour avec compteur non-lus
  - POST /api/changelog/mark-seen - Marquer comme lu
  - ChangelogPopup.jsx monte dans MainLayout
- **Badges "NEW"** sur les menus recemment ajoutes dans la sidebar
  - GET /api/menu-badges - Liste des IDs de menus nouveaux
  - POST /api/menu-badges/dismiss - Masquer les badges
  - Badge vert anime "NEW" dans Sidebar.jsx
- **Avertissement mise a jour + deconnexion automatique**
  - POST /api/updates/broadcast-warning - Broadcast WebSocket a tous les utilisateurs
  - UpdateWarningOverlay.jsx - Overlay plein ecran avec compte a rebours 30s
  - Deconnexion automatique apres le compte a rebours
  - Flux: Admin clique "Installer" -> Avertissement broadcast -> 30s countdown -> Deconnexion auto -> MAJ lancee

## Fichiers cles
- backend/server.py - Serveur principal, migrations, endpoints changelog/badges/broadcast
- backend/models.py - Modeles Pydantic (UserPermissions, etc.)
- backend/roles_routes.py - Gestion des roles et migration permissions
- backend/manual_routes.py - Manuel utilisateur
- backend/manual_default_content.json - Contenu complet du manuel (36 chapitres)
- backend/websocket_manager.py - Gestionnaire WebSocket (broadcast)
- frontend/src/components/Common/UpdateWarningOverlay.jsx - Overlay avertissement MAJ
- frontend/src/components/Common/ChangelogPopup.jsx - Popup changelog
- frontend/src/components/Common/UpdateNotificationBadge.jsx - Flow MAJ modifie
- frontend/src/components/Layout/Sidebar.jsx - Badges NEW
- frontend/src/components/Layout/MainLayout.jsx - Monte tous les composants globaux
- frontend/src/pages/RolesManagement.jsx - 43 modules permissions
- frontend/src/components/Personnalisation/MenuOrganizationSection.jsx - 35 items menu
- frontend/src/components/Personnalisation/DisplayPreferencesSection.jsx - Pages disponibles

## Credentials
- **Application**: admin@test.com / Admin123!
- **API Docs**: admin / atlas2024

## Taches P0/P1 restantes
- **P1**: Bug import Excel - donnees importees ne s'affichent pas correctement

## Backlog
- Aucune tache supplementaire identifiee
