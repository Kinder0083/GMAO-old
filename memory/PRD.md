# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket + realtime_manager
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalites implementees

### Core GMAO
- Ordres de travail, Demandes, Ameliorations, Maintenance preventive
- Equipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Systeme LOTO (Mars 2026)
- Workflow 4 etapes, signatures electroniques
- Icone cadenas sans texte + menu deroulant avec navigation filtree
- WebSocket via realtime_manager pour mise a jour temps reel
- **Journalisation LOTO** : Toutes les operations (creation, consignation, deconsignation, cadenas, suppression) sont enregistrees dans le journal d'audit avec entity_type=LOTO
- **Suppression Admin** : Seuls les administrateurs peuvent supprimer une consignation (statut DEMANDE/ANNULE/DECONSIGNE). Dialog de confirmation avec icone corbeille.
- **Cadenas multiples** : Systeme de cadenas multi-utilisateurs. L'equipement reste consigne tant qu'un cadenas est en place.
- **Icone cadenas cliquable** : LOTOBadge cliquable dans les listes OT, Ameliorations et MP. Navigation vers /consignations-loto avec filtre de statut.
- **Remplissage automatique** : A la selection d'un OT/MP/Amelioration dans la modale de creation LOTO, les champs Equipement, Motif et Duree prevue sont remplis automatiquement.

### Systeme de mise a jour (Mars 2026)
- Detection automatique via comparaison de commits GitHub
- version.json avec versioning semantique (ex: 1.6.0)
- Exclusion des fichiers runtime (health_state.json, etc.) de la detection de conflits
- Logging des fichiers reellement modifies apres git reset --hard
- Installation pip via activation du venv (source venv/bin/activate)
- git fetch complet (sans --depth=1) pour compatibilite maximale

### QR Code + IA (Mars 2026)
- Resume IA par equipement via scan QR public
- Modele IA configurable (Gemini/OpenAI/Claude) dans Personnalisation > IA

### Mode Hors-ligne (Mars 2026)
- Indicateur En ligne/Hors ligne a cote de l'horloge
- Cache IndexedDB + file de synchronisation mutations

### Organisation du Header (Mars 2026)
- Nouvel onglet "Organisation du Header" dans Personnalisation
- 19 icones configurables avec drag-and-drop
- Persistance par utilisateur dans user_preferences.header_icon_order

## Fichiers cles
- `backend/update_service.py` - Service de mise a jour (git fetch, pip install, yarn build)
- `backend/update_manager.py` - Gestionnaire de detection de version (comparaison commits GitHub)
- `backend/loto_routes.py` - Routes LOTO avec audit logging et suppression admin
- `backend/models.py` - EntityType.LOTO, schemas utilisateur
- `backend/audit_service.py` - Service de journalisation
- `frontend/src/pages/Updates.jsx` - Page de mise a jour
- `frontend/src/pages/ConsignationsLOTO.jsx` - Page LOTO avec suppression admin
- `frontend/src/components/Common/LOTOBadge.jsx` - Badge LOTO cliquable

## Problemes connus
- Notifications push mobile (Expo) non resolues (deprioritise)
- WebSocket /api/ws/loto renvoie 403 (non bloquant, le polling fonctionne)

## Backlog
- Aucune tache future definie pour le moment
