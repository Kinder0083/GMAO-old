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

### Session du 12 Janvier 2026

#### ✅ Migration WebSocket - Page "Planning" (Complété)
- **Fichiers créés/modifiés**:
  - `/app/frontend/src/hooks/usePlanning.js` (nouveau)
  - `/app/frontend/src/pages/Planning.jsx` (mis à jour)
  - `/app/backend/server.py` (événements WebSocket ajoutés)
  - `/app/backend/realtime_events.py` (entités USERS et AVAILABILITIES ajoutées)
- Synchronisation temps réel des utilisateurs et disponibilités
- Indicateur de connexion WebSocket (Temps réel / Hors ligne)
- Fallback au polling HTTP si WebSocket indisponible

#### ✅ Refonte Page "Planning" (Complété)
- **Fichier**: `/app/frontend/src/pages/Planning.jsx`
- Affichage du mois complet sans défilement horizontal
- Regroupement du personnel par service avec sections pliables
- **Services repliés par défaut** pour une vue compacte
- Support des services personnalisés (saisis manuellement)
- Statistiques par service (disponibles/total)
- Navigation entre mois et bouton "Aujourd'hui"
- Mise en évidence du jour actuel et des weekends

#### ✅ Assignation de Service aux Utilisateurs (Complété)
- **Fichiers modifiés**:
  - `/app/frontend/src/components/Common/EditUserDialog.jsx`
  - `/app/frontend/src/components/Common/CreateMemberDialog.jsx`
- Dropdown avec services prédéfinis (Maintenance, Production, QHSE, etc.)
- Option de saisie manuelle pour services personnalisés
- Icône et texte explicatif pour l'intégration avec le Planning

### Sessions Précédentes

#### ✅ Migration WebSocket - Tableau de bord
- **Fichiers**: `/app/frontend/src/pages/Dashboard.jsx`, `/app/frontend/src/hooks/useDashboard.js`

#### ✅ Migration WebSocket - Documentations
- **Fichiers**: `/app/frontend/src/pages/Documentations.jsx`, `/app/frontend/src/hooks/useDocumentations.js`

#### ✅ Correction Chat Live - Téléchargements
- **Fichier**: `/app/frontend/src/pages/ChatLive.jsx`

#### ✅ Améliorations Page "Équipements"
- **Fichiers**: `/app/frontend/src/pages/Assets.jsx`, `/app/frontend/src/components/Equipment/*`

---

## Issues en Attente

### 🟡 P1 - "Rapport P.accident" temps réel (Vérification utilisateur requise)
- **Fichier**: `/app/frontend/src/pages/PresquAccidentRapport.jsx`
- Fix appliqué dans session précédente, attente de validation
- **Récurrence**: 2 fois signalé

---

## Tâches Futures

### 🟢 P1 - Migration WebSocket (Pages restantes)
- Planning M.Prev.
- Rapports
- Equipes
- Historique Achat

### 🔵 P2 - Chatbot IA
- Dé-priorisé par l'utilisateur

---

## Architecture des Fichiers Clés

```
/app/
├── backend/
│   ├── server.py               # FastAPI principal + événements WebSocket
│   ├── models.py               # Modèles Pydantic
│   ├── realtime_manager.py     # Gestion WebSocket
│   ├── realtime_events.py      # Définitions entités (USERS, AVAILABILITIES ajoutés)
│   └── chat_routes.py          # Routes chat
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx       # WebSocket ✅
        │   ├── Documentations.jsx  # WebSocket ✅
        │   ├── Planning.jsx        # WebSocket ✅ (migré cette session)
        │   ├── ChatLive.jsx        # Download corrigé
        │   └── Assets.jsx          # Vue tree, nouveaux statuts
        ├── hooks/
        │   ├── useRealtimeData.js  # Hook WebSocket central
        │   ├── useDashboard.js     # Hook Dashboard
        │   ├── useDocumentations.js # Hook Documentations
        │   └── usePlanning.js      # Hook Planning (nouveau)
        └── components/Common/
            ├── EditUserDialog.jsx      # Service dropdown
            └── CreateMemberDialog.jsx  # Service dropdown
```

## Services Prédéfinis pour le Planning
- Maintenance
- Production
- QHSE
- Logistique
- Laboratoire
- Industrialisation
- Administration
- Direction
- ADV

## Intégrations Tierces
- Google Gemini 2.5 Flash (Emergent LLM Key)
- Fabric.js v6.9.1 (Whiteboard)
- WebSockets natifs FastAPI
