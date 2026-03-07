# FSAO Iris - Product Requirements Document

## Description
Application GMAO complete pour la gestion de maintenance industrielle. Interface en francais. Deployee sur Proxmox LXC.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Temps reel**: WebSocket + realtime_manager + polling fallback
- **Deploiement**: Proxmox LXC (Debian 12) + Tailscale Funnel

## Fonctionnalites implementees

### Core GMAO
- Ordres de travail, Demandes, Ameliorations, Maintenance preventive
- Equipements, Inventaire, Zones, Compteurs, Dashboard, Rapports

### Systeme LOTO (Mars 2026)
- Workflow 4 etapes, signatures electroniques
- Cadenas multiples, Points d'isolation, Code PIN
- Journalisation, Suppression admin, Icones cliquables temps reel
- Filtres avances (Mois/Annee/Personnalisee/Equipement)
- Remplissage auto OT, WS temps reel dans OT/Ameliorations/MP
- **Inclus dans Import/Export** (module `loto-consignations`)
- **Inclus dans les sauvegardes automatiques**
- **Chapitre LOTO dans le manuel** (ch-038, 5 sections)
- **Documente dans le README.md** (endpoints API, collection MongoDB)

### Systeme de mise a jour (Mars 2026)
- version.json semantique (1.6.0), exclusion fichiers runtime, git fetch complet

### QR Code + IA, Mode Hors-ligne, Organisation du Header
- Toutes les fonctionnalites precedentes restent en place

## Fichiers cles
- `README.md` - Documentation complete du projet
- `backend/manual_default_content.json` - Contenu par defaut du manuel (ch-038 = LOTO)
- `backend/import_export_routes.py` - Module export `loto-consignations`
- `frontend/src/pages/importExportModules.js` - Module LOTO dans le frontend
- `backend/backup_service.py` - Utilise EXPORT_MODULES (inclut LOTO auto)

## Problemes connus
- WebSocket /api/ws/loto renvoie 403 (non bloquant, le polling fonctionne)

## Backlog
- Aucune tache future definie
