# GMAO Iris - Product Requirements Document

## Problème original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React, FastAPI et MongoDB. L'application gère la maintenance industrielle incluant les ordres de travail, la maintenance préventive, le plan de surveillance réglementaire, les capteurs IoT, le MES, et bien plus.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB
- **IA**: Gemini 2.5 Flash via emergentintegrations
- **Authentification**: JWT + Google OAuth

## Fonctionnalités principales
- Tableau de bord
- Ordres de travail (CRUD + IA)
- Maintenance préventive
- Plan de Surveillance réglementaire (avec IA)
- Gestion des équipements
- Inventaire
- Capteurs IoT / MQTT
- MES (Manufacturing Execution System)
- Chat en temps réel
- Système d'alertes et notifications
- Import/Export de données
- Sauvegarde/Restauration
- Gestion des rôles et permissions (RBAC)

## Fonctionnalité récente : Correspondance Intelligente du Plan de Surveillance (Fév 2026)

### Exigences
1. **Logique de correspondance (Matching)**: Lors de l'analyse d'un nouveau rapport, l'IA recherche une occurrence planifiée existante correspondante (basée sur catégorie, type, exécutant, bâtiment, date)
2. **Mise à jour si correspondance**: Si correspondance trouvée → statut "Réalisé", date réelle, calcul écart_jours, génération prochaine occurrence
3. **Fenêtre de tolérance**: ±8% de la périodicité (ex: 7j pour 90j, 29j pour 365j)
4. **Gestion de l'ambiguïté**: Si confiance moyenne → proposer les options à l'utilisateur
5. **Création si pas de correspondance**: Comportement classique de création
6. **Colonne "Écart (jours)"**: Affichée dans toutes les vues (Liste, Grille, Liste groupée)
7. **Icône robot (correspondance manuelle)**: Clic → upload rapport → IA analyse et met à jour l'occurrence spécifique

### Implémentation
- Backend: `surveillance_routes.py` - fonctions `find_matching_occurrence`, `calculate_tolerance_days`, endpoints `create-batch-from-ai`, `analyze-report-for-occurrence`, `confirm-match`
- Frontend: `ListView.jsx`, `ListViewGrouped.jsx`, `GridView.jsx` (colonne Écart + icône Bot), `ManualMatchDialog.jsx` (nouveau), `SurveillanceAIExtract.jsx` (gestion matched/ambiguous)
- API: `analyzeReportForItem`, `confirmMatch` ajoutés à `surveillanceAPI`

### Status: TERMINÉ ET TESTÉ ✅ (19 Fév 2026)
- Backend: 10/10 tests passés
- Frontend: 100% vérifications UI passées

## Backlog
- P2: Refactoring de `create_batch_from_ai` (décomposition en fonctions plus petites)
