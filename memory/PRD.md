# GMAO Iris - Product Requirements Document

## Problème original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth

## Fonctionnalités récentes (Fév 2026)

### 1. Correspondance Intelligente du Plan de Surveillance - TERMINÉ ✅
- Matching IA (scoring multicritères, tolérance ±8%)
- Gestion ambiguïté (haute confiance = auto, moyenne = choix utilisateur)
- Colonne "Écart (jours)" dans les 3 vues
- Icône robot pour correspondance manuelle

### 2. Rapport Surveillance enrichi - TERMINÉ ✅
- Onglets d'années (filtrage par année)
- KPI: Taux réalisation, En retard, Dans les temps ±8%, Écart moyen

### 3. Export PDF/Excel du Rapport Surveillance - TERMINÉ ✅
- Export PDF visuel (html2canvas + jsPDF)
- Export Excel structuré (4 onglets)

### 4. Suppression du Plan de Surveillance - TERMINÉ ✅
- Bouton dans Paramètres Spéciaux > Réinitialisation des données

### 5. Refactoring create_batch_from_ai - TERMINÉ ✅
- Décomposition en 8 fonctions spécialisées
- Fonction principale réduite de ~450 à ~100 lignes
- Aucune régression (tous endpoints fonctionnels)

## Backlog
- Aucune tâche en attente
