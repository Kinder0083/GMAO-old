# GMAO IRIS - PRD (Product Requirements Document)

## Problème Original
Application GMAO full-stack avec React/FastAPI/MongoDB, assistant IA "Adria" et modules Surveillance/Fournisseurs.

## Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **IA**: Gemini 2.5 Flash (via emergentintegrations)

## Comptes de Test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Ce qui a été implémenté

### Plan de Surveillance
- [x] CRUD complet, import IA PDF, contrôles récurrents
- [x] check-due-dates = notification uniquement (PAS de changement de statut)
- [x] WebSocket temps réel via useSurveillancePlan hook
- [x] Colonne "Date du Contrôle" avec affichage conditionnel

### Fournisseurs (NOUVEAU - Feb 2026)
- [x] Modèle enrichi: 12 nouveaux champs (pays, ville, code_postal, tva_intra, siret, conditions_paiement, devise, categorie, sous_traitant, contact_fonction, site_web, notes)
- [x] Formulaire en 4 onglets (Société, Contact, Adresse, Commercial)
- [x] Extraction IA depuis documents (Excel, PDF, images) via Gemini
- [x] Dialog d'import IA avec prévisualisation et pré-remplissage du formulaire
- [x] Vue grille et liste enrichies (badges catégorie, sous-traitant, localisation)

### Système de mise à jour
- [x] Journal détaillé: commande, stdout/stderr, code retour, durée par étape
- [x] emergentintegrations retiré de requirements.txt (fix déploiement Proxmox)
- [x] Script verify_deployment.sh pour diagnostic

### Assistant Adria
- [x] CREATE_OT, MODIFY_OT, CLOSE_OT, ASSIGN_OT
- [x] Refactoring en 3 fichiers (UI, handlers, voice hook)

## Backlog
- P2: Adria - Clôture OT + résumé d'intervention en une commande vocale
- P2: Validation robustesse extraction IA (PDF complexe 8+ contrôles)
