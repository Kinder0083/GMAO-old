# GMAO Iris - Product Requirements Document

## Problème original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth

## Fonctionnalités implémentées

### 1. Correspondance Intelligente du Plan de Surveillance - TERMINÉ
- Matching IA (scoring multicritères, tolérance ±8%)
- Gestion ambiguïté (haute confiance = auto, moyenne = choix utilisateur)
- Colonne "Écart (jours)" dans les 3 vues
- Icône robot pour correspondance manuelle

### 2. Rapport Surveillance enrichi - TERMINÉ
- Onglets d'années (filtrage par année)
- KPI: Taux réalisation, En retard, Dans les temps ±8%, Écart moyen

### 3. Export PDF/Excel du Rapport Surveillance - TERMINÉ
- Export PDF visuel (html2canvas + jsPDF)
- Export Excel structuré (4 onglets)

### 4. Suppression du Plan de Surveillance - TERMINÉ
- Bouton dans Paramètres Spéciaux > Réinitialisation des données

### 5. Refactoring create_batch_from_ai - TERMINÉ
- Décomposition en 8 fonctions spécialisées

### 6. Bug Fix: Assignation OT via Adria - TERMINÉ (Fév 2026)
- **Cause racine 1**: `update_work_order` utilisait `{"id": ...}` au lieu de `{"_id": ...}` pour le filtre MongoDB → updates silencieusement ignorés
- **Cause racine 2**: L'IA confirmait l'assignation dans le texte mais n'incluait pas `assigne_a` dans la commande JSON
- **Fix 3 couches**: (1) Prompt IA avec REGLE CRITIQUE obligeant l'inclusion de `assigne_a`, (2) Fallback frontend auto-assignation depuis localStorage, (3) Backend utilise `_id` pour le filtre
- **Testé**: 10/10 backend + frontend validés

### 7. Bug Fix: Crash GET /work-orders - TERMINÉ (Fév 2026)
- Cause: Statuts en minuscules dans MongoDB
- Fix: Normalisation + migration des données

### 8. Bug Fix: Rafraîchissement UI après correspondance manuelle - TERMINÉ (Fév 2026)
- SurveillanceAIExtract: Ajout de `hasChanges` pour tracker les modifications

## Backlog
- Aucune tâche en attente

## Credentials
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!
