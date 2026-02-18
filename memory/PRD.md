# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO nommee "GMAO Iris" avec capacites IA via assistant "Adria".

## Fonctionnalites IA implementees

### Sessions precedentes (17-18 Feb 2026)
1. Adria - Assistant IA (memoire, contexte enrichi, commandes)
2. IA Ordres de Travail (diagnostic + resume)
3. IA Rapports Hebdomadaires
4. IA Capteurs Predictive
5. Module Automatisations
6. Indicateur recurrence + tendance
7. Tableau de bord IA unifie (5 onglets)
8. Notifications push automatisations
9. Bug fix: Creation OT via Adria (import + api.workOrders)
10. Bug fix: Rapport QHSE (fallback cle LLM DB)
11. Creation de widgets IA via Adria (formules mathematiques)

### Session precedente (18 Feb 2026)
12. Manuel utilisateur : 6 nouvelles sections IA + 1 section Dashboard Service
13. README.md : Enrichi avec fonctionnalites IA completes
14. Permissions : 3 nouveaux modules (aiDashboard, aiAutomations, aiWidgets)
    - Admin: full access
    - Technicien: view only
    - require_permission sur ai_widget_routes.py et automation_routes.py

### Session actuelle (18 Feb 2026)
15. Bug fix: CREATE_OT via Adria - Resolution equipement_nom en equipement_id
    - Import equipmentsAPI dans AIChatWidget.jsx
    - Recherche equipement par nom/reference avant creation de l'OT
    - Priorite et categorie correctement transmises au backend
16. Nouvelle fonctionnalite: MODIFY_OT via Adria
    - Commande [[MODIFY_OT:...]] ajoutee au prompt systeme
    - Handler frontend: recherche OT par ref/titre, resolution equipement, appel PUT
    - Regex de parsing mis a jour pour inclure MODIFY_OT
    - Tests: 100% backend (8/8) + E2E frontend valide
17. Assignation technicien via Adria (CREATE_OT + MODIFY_OT)
    - Champ assigne_a dans les commandes CREATE_OT et MODIFY_OT
    - Resolution nom technicien en assigne_a_id via GET /api/users
    - Tests: 100% backend (7/7) + E2E frontend valide (iteration_45)
18. Cloture OT en une commande via Adria (CLOSE_OT)
    - Commande [[CLOSE_OT:...]] : recherche OT, ajout temps, commentaire + pieces, statut TERMINE
    - Resolution pieces depuis inventaire (deduction stock automatique)
    - Parsing temps flexible (2h, 1h30, 2h30min)
    - Tests: 100% backend (11/11) + E2E frontend valide (iteration_46)
19. Refactoring AIChatWidget.jsx (1311 → 775 lignes, 3 fichiers)
    - adriaCommandHandlers.js : handlers CREATE/MODIFY/CLOSE_OT + helpers resolution
    - useAdriaVoice.js : hook custom STT/TTS
    - Tests regression: 100% (13/13 backend + E2E frontend, iteration_47)
20. Documentation mise a jour
    - README.md : sections MODIFY_OT, CLOSE_OT, assignation technicien
    - Manuel : 3 nouvelles sections (sec-024-11/12/13) + maj sec-024-05
    - Tests: verification contenu via API (PASS)
21. Bug fix: Surveillance AI batch creation - corrections completes
    - Items crees via IA n'avaient pas de champ annee → invisibles
    - annee = annee de derniere_visite (pas prochain_controle)
    - prochain_controle = derniere_visite + periodicite (pour stats "a jour")
    - Normalisation periodicite: "Annuelle (ref. Arretes du 5 mars 1993)" → "1 an"
    - batiment=null → "" (ne crashe plus Pydantic)
    - derniere_visite manquant → fallback date_intervention du document
    - Colonne "Date du controle" affiche derniere_visite si REALISE, prochain sinon
    - Pourcentage realisation = count(status=REALISE)/total (sans condition date)
    - Prompt IA ameliore: extraction multi-controles + periodicite format simple
    - Gestion erreur par controle + generation recurrences
    - Tests: 100% (9/9 backend, iteration_49)

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Refactoring AIChatWidget.jsx (composant volumineux, extraire les handlers de commandes)
- Tableau de bord temps reel (compteurs live, historique alertes 24h)
- Enrichissements dashboard IA (filtres, export PDF)
- Bug TTS mineur: "Failed to execute clone on Response" (LOW priority)
