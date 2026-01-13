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

### Session du 13 Janvier 2026 (soir - suite)

#### ✅ Améliorations Majeures "Planning M.Prev" (Complété)
- **Renommage statut**: ALERTE_S_EQUIP → MAINT_PREV (Maintenance Préventive)
- **Couleurs mises à jour**:
  - EN_MAINTENANCE: Jaune clair (#fde047)
  - MAINT_PREV: Orange (#f97316)
- **Vue hiérarchique des équipements**:
  - Affichage par défaut réduit (équipements principaux uniquement)
  - Chevron pour développer/réduire les sous-équipements
  - Indentation visuelle des sous-équipements
- **Bouton "Historique des demandes"**:
  - Statistiques (Total, En attente, Approuvées, Refusées)
  - Filtres (Statut, Équipement, Période)
  - Liste détaillée avec badges de statut et priorité
  - Affichage des commentaires de refus
- **Badge de demandes en attente** dans le header
- **Journal d'audit**: Enregistrement des changements de statut des équipements

#### ✅ Améliorations "Demande d'Arrêt pour Maintenance" (Complété)
- **Priorité de la demande**: Urgente / Normale / Basse
- **Pièces jointes** (optionnel)
- **Sélecteur d'équipements hiérarchique**:
  - Vue réduite par défaut
  - Chevron pour développer les sous-équipements
  - Checkbox pour sélection multiple
- **Nouveau modèle backend** avec champs:
  - `priorite`: URGENTE / NORMALE / BASSE
  - `attachments`: Liste de fichiers joints

### Session du 13 Janvier 2026 (soir)

#### ✅ Refonte Complète Page "Planning M.Prev" avec Historique des Statuts (Complété)
- **Fichiers modifiés**:
  - `/app/frontend/src/pages/PlanningMPrev.jsx`
  - `/app/backend/models.py` (ajout modèle `EquipmentStatusHistory`)
  - `/app/backend/server.py` (endpoints PUT et PATCH modifiés + nouvel endpoint GET)
  - `/app/frontend/src/services/api.js` (ajout `getStatusHistory`)
- **Nouvelle collection MongoDB**: `equipment_status_history`
  - `equipment_id`: ID de l'équipement
  - `statut`: Statut enregistré
  - `changed_at`: Date/heure du changement (arrondie à l'heure inférieure)
  - `changed_by`: ID de l'utilisateur
  - `changed_by_name`: Nom de l'utilisateur
- **Logique implémentée**:
  - Historique complet des changements de statut conservé
  - Cellules grises (sans données) pour les périodes sans historique
  - Statistiques basées uniquement sur les données historiques
  - Changement de statut = nouveau point de départ (arrondi à l'heure inférieure)
  - Si changement à la même heure, l'ancien est écrasé (upsert)
  - Le statut précédent est conservé, seul le futur change
- **Bug corrigé**: L'endpoint PATCH (changement rapide) n'enregistrait pas l'historique
- **Couleurs harmonisées** avec la page Équipements (7 statuts)

### Session du 13 Janvier 2026 (après-midi)

#### ✅ Refonte Page "Planning M.Prev" - Orientation Verticale (Complété)
- Orientation des cellules 24h : **0h en haut, 24h en bas** (verticale)
- Bordure bleue du jour actuel appliquée **uniquement à l'en-tête**

### Session du 13 Janvier 2026

#### ✅ Appartenance des Articles aux Équipements (Complété)
- **Fichiers modifiés**:
  - `/app/backend/models.py` (ajout `equipment_ids` à InventoryBase/Update)
  - `/app/frontend/src/components/Inventory/InventoryFormDialog.jsx` (sélecteur en cascade)
  - `/app/frontend/src/pages/Inventory.jsx` (colonne Appartenance + filtre)
- **Fonctionnalités**:
  - Un article peut appartenir à **plusieurs** équipements/sous-équipements
  - Sélecteur en cascade : équipement principal → sous-équipement (optionnel)
  - Colonne "Appartenance" dans le tableau avec badges
  - Filtre dropdown pour trier par équipement
  - Les sous-équipements n'apparaissent que si l'équipement principal en possède

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
