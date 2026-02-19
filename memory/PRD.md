# GMAO Iris - Product Requirements Document

## Problème original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth

## Fonctionnalités principales
- Tableau de bord, Ordres de travail, Maintenance préventive, Plan de Surveillance, Équipements, Inventaire, Capteurs IoT/MQTT, MES, Chat, Alertes, Import/Export, Sauvegarde, RBAC

## Fonctionnalités récentes (Fév 2026)

### 1. Correspondance Intelligente du Plan de Surveillance - TERMINÉ ✅
- Matching IA (scoring multicritères, tolérance ±8%)
- Gestion ambiguïté (haute confiance = auto, moyenne = choix utilisateur)
- Colonne "Écart (jours)" dans les 3 vues
- Icône robot pour correspondance manuelle
- Endpoints: `create-batch-from-ai`, `analyze-report`, `confirm-match`

### 2. Rapport Surveillance enrichi - TERMINÉ ✅
- Onglets d'années (filtrage par année)
- KPI: Taux réalisation, En retard, Dans les temps ±8%, Écart moyen
- Écart moyen par catégorie dans les vues cartes et tableau

### 3. Export PDF/Excel du Rapport Surveillance - TERMINÉ ✅
- Export PDF visuel (html2canvas + jsPDF, multi-pages)
- Export Excel structuré (4 onglets: Synthèse, Catégories, Bâtiments, Périodicités)
- Filtré par l'année sélectionnée

### 4. Suppression du Plan de Surveillance - TERMINÉ ✅
- Bouton "Plan de surveillance" ajouté dans Paramètres Spéciaux > Réinitialisation des données
- Confirmation obligatoire (taper CONFIRMER)
- Backend: `surveillance_items` ajouté à `RESET_COLLECTIONS`

## Backlog
- P2: Refactoring de `create_batch_from_ai` (décomposition en fonctions plus petites)
