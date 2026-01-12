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

#### ✅ Refonte Page "Planning" (P0 - Complété)
- **Fichier**: `/app/frontend/src/pages/Planning.jsx`
- Affichage du mois complet sans défilement horizontal
- Regroupement du personnel par service avec sections pliables
- Statistiques par service (disponibles/total)
- Navigation entre mois et bouton "Aujourd'hui"
- Mise en évidence du jour actuel et des weekends
- Tests validés à 100%

### Sessions Précédentes

#### ✅ Migration WebSocket - Tableau de bord
- **Fichiers**: `/app/frontend/src/pages/Dashboard.jsx`, `/app/frontend/src/hooks/useDashboard.js`
- Correction du bug des widgets vides
- Migration du polling HTTP vers WebSockets

#### ✅ Migration WebSocket - Documentations
- **Fichiers**: `/app/frontend/src/pages/Documentations.jsx`, `/app/frontend/src/hooks/useDocumentations.js`
- Mise à jour temps réel via WebSockets

#### ✅ Correction Chat Live - Téléchargements
- **Fichier**: `/app/frontend/src/pages/ChatLive.jsx`
- Remplacement de window.open par fetch avec Authorization header

#### ✅ Améliorations Page "Équipements"
- **Fichiers**: `/app/frontend/src/pages/Assets.jsx`, `/app/frontend/src/components/Equipment/*`
- Vue arborescence par défaut (collapsed)
- Nouveaux statuts: "En Fonctionnement", "A l'arrêt"
- Tuiles de statut adaptatives (masquées si count=0)
- Formulaire simplifié (retrait date/coût d'achat)

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
│   ├── server.py               # FastAPI principal
│   ├── models.py               # Modèles Pydantic (EquipmentStatus enum)
│   ├── realtime_manager.py     # Gestion WebSocket
│   └── chat_routes.py          # Routes chat avec téléchargement
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx       # WebSocket
        │   ├── Documentations.jsx  # WebSocket
        │   ├── ChatLive.jsx        # Download corrigé
        │   ├── Assets.jsx          # Vue tree, nouveaux statuts
        │   └── Planning.jsx        # REFAIT - Mois complet, groupement service
        ├── hooks/
        │   ├── useRealtimeData.js  # Hook WebSocket central
        │   ├── useDashboard.js     # Hook Dashboard
        │   └── useDocumentations.js # Hook Documentations
        └── components/Equipment/
            ├── EquipmentFormDialog.jsx
            ├── EquipmentTreeView.jsx
            └── QuickStatusChanger.jsx
```

## Intégrations Tierces
- Google Gemini 2.5 Flash (Emergent LLM Key)
- Fabric.js v6.9.1 (Whiteboard)
- WebSockets natifs FastAPI
