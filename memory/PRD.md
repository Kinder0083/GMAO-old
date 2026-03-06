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

### QR Code + IA (Mars 2026)
- Resume IA par equipement via scan QR public
- Modele IA configurable (Gemini/OpenAI/Claude) dans Personnalisation > IA

### Mode Hors-ligne (Mars 2026)
- Indicateur En ligne/Hors ligne a cote de l'horloge
- Cache IndexedDB + file de synchronisation mutations

### Correction systeme de mise a jour (Mars 2026)
- version.json conditionnel, endpoint last-result, script restart intelligent

### Organisation du Header (Mars 2026)
- Nouvel onglet "Organisation du Header" dans Personnalisation
- 19 icones configurables avec drag-and-drop
- Persistance par utilisateur dans user_preferences.header_icon_order

## Fichiers cles
- `backend/loto_routes.py` - Routes LOTO avec audit logging et suppression admin
- `backend/models.py` - EntityType.LOTO, schemas utilisateur
- `backend/audit_service.py` - Service de journalisation
- `backend/server.py` - Configuration serveur, init routes
- `frontend/src/pages/ConsignationsLOTO.jsx` - Page LOTO avec suppression admin
- `frontend/src/components/Common/LOTOBadge.jsx` - Badge LOTO cliquable
- `frontend/src/pages/Journal.jsx` - Journal d'audit avec filtre LOTO
- `frontend/src/pages/Improvements.jsx` - Ameliorations avec badge LOTO
- `frontend/src/pages/PreventiveMaintenance.jsx` - MP avec badge LOTO
- `frontend/src/pages/WorkOrders.jsx` - OT avec badge LOTO

## Problemes connus
- Notifications push mobile (Expo) non resolues (deprioritise)
- WebSocket /api/ws/loto renvoie 403 (non bloquant, le polling fonctionne)

## Backlog
- Aucune tache future definie pour le moment
