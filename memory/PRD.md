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
- Icone cadenas sans texte + menu deroulant avec navigation filtree
- WebSocket via realtime_manager pour mise a jour temps reel
- **Journalisation LOTO** : Toutes les operations enregistrees dans le journal d'audit (entity_type=LOTO)
- **Suppression Admin** : Seuls les administrateurs peuvent supprimer (DEMANDE/ANNULE/DECONSIGNE) avec dialog confirmation
- **Cadenas multiples** : Multi-utilisateurs, equipement consigne tant qu'un cadenas actif
- **Icone cadenas cliquable** : LOTOBadge cliquable dans OT, Ameliorations et MP avec navigation vers /consignations-loto
- **Remplissage automatique** : Selection OT → auto-fill Equipement, Motif et Duree prevue (operateur ?? pour gerer valeur 0)
- **WebSocket temps reel LOTOBadge** : Hook useLotoByLinked() avec WS + realtime events + polling 60s dans OT/Ameliorations/MP
- **Filtres avances** : Periode (Mois/Annee/Personnalisee/Tout afficher) + Equipement (dropdown alphabetique) + compteur resultats

### Systeme de mise a jour (Mars 2026)
- Detection automatique via comparaison commits GitHub
- version.json avec versioning semantique (1.6.0)
- Exclusion fichiers runtime (health_state.json) de la detection de conflits
- Logging des fichiers modifies apres git reset --hard
- Installation pip via activation venv (source venv/bin/activate)
- git fetch complet (sans --depth=1) pour compatibilite Proxmox

### QR Code + IA (Mars 2026)
- Resume IA par equipement via scan QR public
- Modele IA configurable (Gemini/OpenAI/Claude)

### Mode Hors-ligne (Mars 2026)
- Indicateur En ligne/Hors ligne
- Cache IndexedDB + file de synchronisation mutations

### Organisation du Header (Mars 2026)
- 19 icones configurables avec drag-and-drop par utilisateur

## Fichiers cles
- `backend/update_service.py` - Service de mise a jour
- `backend/update_manager.py` - Gestionnaire de detection version
- `backend/loto_routes.py` - Routes LOTO avec audit logging et suppression admin
- `frontend/src/pages/ConsignationsLOTO.jsx` - Page LOTO avec filtres avances
- `frontend/src/hooks/useLotoRealtime.js` - Hook WS temps reel pour LOTOBadge
- `frontend/src/components/Common/LOTOBadge.jsx` - Badge LOTO cliquable
- `frontend/src/pages/WorkOrders.jsx` - OT avec LOTOBadge temps reel
- `frontend/src/pages/Improvements.jsx` - Ameliorations avec LOTOBadge temps reel
- `frontend/src/pages/PreventiveMaintenance.jsx` - MP avec LOTOBadge temps reel

## Problemes connus
- WebSocket /api/ws/loto renvoie 403 (non bloquant, le polling fonctionne)
- Notifications push mobile (Expo) non resolues (deprioritise)

## Backlog
- Aucune tache future definie
