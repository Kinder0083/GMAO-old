# GMAO IRIS - PRD (Product Requirements Document)

## Problème Original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) full-stack avec React/FastAPI/MongoDB, dotée d'un assistant IA "Adria" et d'un module de Plan de Surveillance réglementaire.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **IA**: Gemini (via emergentintegrations) pour Adria et extraction PDF

## Fonctionnalités Principales
- Ordres de Travail (OT) avec gestion complète (création, modification, clôture)
- Plan de Surveillance réglementaire avec import IA de rapports PDF
- Assistant IA Adria (chat + voix) avec commandes : CREATE_OT, MODIFY_OT, CLOSE_OT, ASSIGN_OT
- Contrôles récurrents avec génération automatique jusqu'à N+1
- Statistiques et rapports de conformité

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Ce qui a été implémenté
- [x] Création/Modification/Suppression d'OT
- [x] Assistant Adria : CREATE_OT, MODIFY_OT, CLOSE_OT, ASSIGN_OT
- [x] Refactoring AIChatWidget.jsx en 3 fichiers
- [x] Plan de Surveillance : CRUD, import IA, contrôles récurrents
- [x] **FIX (Feb 2026)**: Bug date Plan de Surveillance corrigé - prochain_controle = derniere_visite pour items REALISE
- [x] **FIX (Feb 2026)**: Colonne "Date du Contrôle" dans les 3 vues (ListView, ListViewGrouped, GridView)
- [x] **FIX (Feb 2026)**: Statistiques de réalisation basées sur statut seul

## Backlog
- P2: Adria - Clôture OT + résumé d'intervention en une commande vocale
- P2: Validation robustesse extraction IA (test avec PDF complexe 8+ contrôles)
