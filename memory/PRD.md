# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO nommee "GMAO Iris" avec capacites IA via assistant "Adria".

## Fonctionnalites IA implementees
1. Adria - Assistant IA (memoire, contexte enrichi, commandes auto)
2. IA Ordres de Travail (diagnostic + resume)
3. IA Rapports Hebdomadaires
4. IA Capteurs Predictive
5. Module Automatisations (parse/apply/list/toggle/delete/test-trigger)
6. Indicateur recurrence + tendance
7. Tableau de bord IA unifie (5 onglets)
8. Notifications push automatisations
9. Bug fix: Creation OT via Adria (import workOrdersAPI)
10. Bug fix: Rapport QHSE + toutes routes IA - fallback cle LLM DB (18 Feb 2026)

## Bug fix #10 detail
- Cause: ai_presqu_accident_routes.py, ai_maintenance_routes.py, ai_chat_routes.py (TTS/STT) ne cherchaient la cle LLM que dans os.environ, pas dans global_settings DB
- Fix: Ajout helper _get_llm_key() avec fallback DB dans ai_presqu_accident_routes.py et ai_maintenance_routes.py, + fallback inline dans ai_chat_routes.py (transcription/TTS)
- Fichiers corriges: ai_presqu_accident_routes.py (4 occurrences), ai_maintenance_routes.py (3 occurrences), ai_chat_routes.py (2 occurrences)

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Tableau de bord temps reel (compteurs live, historique alertes 24h) - sauvegarde
- Enrichissements dashboard (filtres par date, comparaisons periodes)
- Export PDF ameliore par onglet
