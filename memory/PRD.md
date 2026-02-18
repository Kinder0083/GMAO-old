# GMAO IRIS - PRD (Product Requirements Document)

## Problème Original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React/FastAPI/MongoDB, dotée d'un assistant IA "Adria" et d'un module de Plan de Surveillance réglementaire.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **IA**: Gemini (via emergentintegrations) pour Adria et extraction PDF
- **Temps réel**: WebSocket via RealtimeManager (broadcast par entité)

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Logique Métier du Plan de Surveillance

### Champs clés
- `derniere_visite` : date où le contrôle a été réalisé
- `prochain_controle` : date du PROCHAIN contrôle = derniere_visite + periodicite
- `status` : PLANIFIER (défaut) | PLANIFIE | REALISE
- `annee` : année de derniere_visite (pour le tri par onglets)
- `duree_rappel_echeance` : nombre de jours avant prochain_controle pour déclencher l'alerte (paramétrable, défaut 30)

### Règles
1. Un item créé par l'IA depuis un PDF a le statut REALISE (car le contrôle a déjà été fait)
2. Un item créé manuellement a le statut A PLANIFIER par défaut
3. `check-due-dates` ne change JAMAIS les statuts — il ne sert qu'à signaler les alertes
4. Les alertes ne se déclenchent que EN DÉCOMPTE (avant prochain_controle, pas après)
5. Le frontend affiche `derniere_visite` pour les items REALISE et `prochain_controle` pour les autres
6. La page utilise WebSocket (useSurveillancePlan hook) pour la synchronisation temps réel

## Ce qui a été implémenté
- [x] Ordres de Travail (CRUD complet)
- [x] Assistant Adria : CREATE_OT, MODIFY_OT, CLOSE_OT, ASSIGN_OT
- [x] Refactoring AIChatWidget.jsx en 3 fichiers
- [x] Plan de Surveillance : CRUD, import IA, contrôles récurrents
- [x] **FIX (Feb 2026)**: prochain_controle = derniere_visite + periodicite (logique correcte)
- [x] **FIX (Feb 2026)**: check-due-dates ne change plus les statuts (notification uniquement)
- [x] **FIX (Feb 2026)**: WebSocket temps réel activé sur la page Surveillance
- [x] **FIX (Feb 2026)**: Colonne "Date du Contrôle" dans les 3 vues avec affichage conditionnel
- [x] **FIX (Feb 2026)**: Statistiques de réalisation correctes (basées sur statut seul)

## Backlog
- P2: Adria - Clôture OT + résumé d'intervention en une commande vocale
- P2: Validation robustesse extraction IA (test avec PDF complexe 8+ contrôles)
