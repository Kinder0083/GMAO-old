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

### Session actuelle (18 Feb 2026)
12. Manuel utilisateur : 6 nouvelles sections IA + 1 section Dashboard Service
13. README.md : Enrichi avec fonctionnalites IA completes
14. Permissions : 3 nouveaux modules (aiDashboard, aiAutomations, aiWidgets)
    - Admin: full access
    - Technicien: view only
    - require_permission sur ai_widget_routes.py et automation_routes.py

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Tableau de bord temps reel (compteurs live, historique alertes 24h)
- Amelioration rafraichissement temps reel WebSocket
- Enrichissements dashboard IA (filtres, export PDF)
