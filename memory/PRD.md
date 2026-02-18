# GMAO Iris - Product Requirements Document

## Probleme Original
Application de GMAO nommee "GMAO Iris" avec capacites IA via assistant "Adria".

## Fonctionnalites IA implementees

### 1-9. Sessions precedentes (voir CHANGELOG)

### 10. Creation de widgets IA via Adria (18 Feb 2026) - NEW
- Backend: POST /api/ai/widgets/generate - genere config widget via Gemini a partir de langage naturel
- Support complet des 7 types de visualisation (value, gauge, line_chart, bar_chart, pie_chart, donut, table)
- Support des sources GMAO (OT, equipements, capteurs, inventaire, surveillance, etc.)
- Support des formules mathematiques ($references, +, -, *, /, IF(), ROUND(), etc.)
- Frontend: commande [[CREATE_WIDGET:...]] parsee dans AIChatWidget.jsx
- Widget cree directement sur le Dashboard Service, visible immediatement
- Tests passes 100% backend + frontend

## Architecture cles
- ai_widget_routes.py : endpoint generation widget IA
- ai_chat_routes.py : prompt Adria avec commande CREATE_WIDGET
- AIChatWidget.jsx : handler CREATE_WIDGET + regex parser
- custom_widgets_routes.py : CRUD widgets existant
- formula_engine.py : moteur formules mathematiques
- gmao_data_service.py : sources donnees GMAO

## Credentials test
- Admin: admin@test.com / Admin123!
- Technicien: technicien@test.com / Technicien123!

## Integration 3rd party
- Gemini Pro (via emergentintegrations + EMERGENT_LLM_KEY)

## Backlog
- Tableau de bord temps reel (compteurs live, historique alertes 24h)
- Enrichissements dashboard IA (filtres par date, export PDF)
- Amelioration rafraichissement temps reel (WebSocket exclude_user)
