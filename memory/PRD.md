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

#### ✅ Régimes de Travail avec Cellules Adaptatives (Complété)
- **Fichiers modifiés**:
  - `/app/backend/models.py` (UserRegime enum, champs disponibilités étendus)
  - `/app/frontend/src/pages/Planning.jsx` (cellules adaptatives)
  - `/app/frontend/src/components/Common/EditUserDialog.jsx`
  - `/app/frontend/src/components/Common/CreateMemberDialog.jsx`
- **Régimes disponibles**:
  - **Journée**: Case pleine carrée (vert/rouge/blanc)
  - **2×8**: Case divisée horizontalement (Matin en haut, Après-midi en bas)
  - **3×8**: Cercle divisé en 3 secteurs à 120° (Matin haut-gauche, Après-midi haut-droite, Nuit bas)
- **Fonctionnalités**:
  - Clic = Basculer entre Non défini → Disponible → Indisponible
  - Glisser vers la droite = Copier la cellule sur les jours suivants
  - Badge du régime (2×8 ou 3×8) affiché à côté du nom
- **Tests**: 100% réussite (13 tests backend + tests frontend)

#### ✅ Migration WebSocket - Page "Planning" (Complété)
- **Fichiers**: `/app/frontend/src/hooks/usePlanning.js`, `/app/frontend/src/pages/Planning.jsx`
- Synchronisation temps réel des utilisateurs et disponibilités
- Fallback au polling HTTP si WebSocket indisponible

#### ✅ Refonte Page "Planning" (Complété)
- Affichage du mois complet sans défilement horizontal
- Regroupement du personnel par service avec sections pliables
- Services repliés par défaut
- Support des services personnalisés

#### ✅ Assignation de Service aux Utilisateurs (Complété)
- Dropdown avec services prédéfinis + saisie manuelle

### Sessions Précédentes

#### ✅ Migration WebSocket - Tableau de bord & Documentations
#### ✅ Correction Chat Live - Téléchargements
#### ✅ Améliorations Page "Équipements"

---

## Issues en Attente

### 🟡 P1 - "Rapport P.accident" temps réel (Vérification utilisateur requise)

---

## Tâches Futures

### 🟢 P1 - Migration WebSocket (Pages restantes)
- Planning M.Prev., Rapports, Equipes, Historique Achat

### 🔵 P2 - Chatbot IA (dé-priorisé)

---

## Architecture des Fichiers Clés

```
/app/
├── backend/
│   ├── server.py               # FastAPI + WebSocket events
│   ├── models.py               # UserRegime enum, disponibilités étendues
│   ├── realtime_manager.py     # Gestion WebSocket
│   └── realtime_events.py      # USERS, AVAILABILITIES entities
└── frontend/
    └── src/
        ├── pages/
        │   ├── Planning.jsx        # Cellules adaptatives (Journée/2×8/3×8)
        │   └── ...
        ├── hooks/
        │   └── usePlanning.js      # WebSocket hook
        └── components/Common/
            ├── EditUserDialog.jsx  # Champ régime
            └── CreateMemberDialog.jsx
```

## Régimes de Travail
| Régime | Affichage | Parties |
|--------|-----------|---------|
| Journée | Case pleine | 1 (journée entière) |
| 2×8 | Case divisée horizontalement | 2 (Matin, Après-midi) |
| 3×8 | Cercle 3 secteurs | 3 (Matin, Après-midi, Nuit) |

## Services Prédéfinis
Maintenance, Production, QHSE, Logistique, Laboratoire, Industrialisation, Administration, Direction, ADV

## Intégrations Tierces
- Google Gemini 2.5 Flash (Emergent LLM Key)
- Fabric.js v6.9.1 (Whiteboard)
- WebSockets natifs FastAPI
