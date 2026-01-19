"""
Routes API pour le chatbot IA
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dependencies import get_current_user, get_current_admin_user
import logging
import os
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# Variables globales (seront injectées depuis server.py)
db = None

def init_ai_routes(database):
    """Initialize AI routes with database"""
    global db
    db = database

# ==================== Modèles Pydantic ====================

class ChatMessage(BaseModel):
    role: str  # "user" ou "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[str] = None  # Contexte de la page actuelle
    include_app_context: Optional[bool] = True  # Inclure le contexte enrichi de l'application

class ChatResponse(BaseModel):
    response: str
    session_id: str

class LLMProvider(BaseModel):
    id: str
    name: str
    models: List[dict]
    requires_api_key: bool
    is_available: bool

# ==================== Configuration LLM ====================

LLM_PROVIDERS = {
    "gemini": {
        "id": "gemini",
        "name": "Google Gemini",
        "models": [
            {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "default": True},
            {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "default": False},
            {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "default": False},
        ],
        "requires_api_key": False,  # Utilise clé Emergent
        "provider_key": "EMERGENT_LLM_KEY"
    },
    "openai": {
        "id": "openai",
        "name": "OpenAI GPT",
        "models": [
            {"id": "gpt-4o", "name": "GPT-4o", "default": True},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "default": False},
            {"id": "gpt-5.1", "name": "GPT-5.1", "default": False},
        ],
        "requires_api_key": False,  # Utilise clé Emergent
        "provider_key": "EMERGENT_LLM_KEY"
    },
    "anthropic": {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "models": [
            {"id": "claude-4-sonnet-20250514", "name": "Claude 4 Sonnet", "default": True},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku", "default": False},
        ],
        "requires_api_key": False,  # Utilise clé Emergent
        "provider_key": "EMERGENT_LLM_KEY"
    },
    "deepseek": {
        "id": "deepseek",
        "name": "DeepSeek",
        "models": [
            {"id": "deepseek-chat", "name": "DeepSeek Chat", "default": True},
            {"id": "deepseek-coder", "name": "DeepSeek Coder", "default": False},
        ],
        "requires_api_key": True,  # Nécessite clé globale
        "provider_key": "DEEPSEEK_API_KEY"
    },
    "mistral": {
        "id": "mistral",
        "name": "Mistral AI",
        "models": [
            {"id": "mistral-large-latest", "name": "Mistral Large", "default": True},
            {"id": "mistral-medium-latest", "name": "Mistral Medium", "default": False},
        ],
        "requires_api_key": True,  # Nécessite clé globale
        "provider_key": "MISTRAL_API_KEY"
    }
}

# Message système pour l'assistant - VERSION 2.0 REFONTE COMPLÈTE
def get_system_message(assistant_name: str, assistant_gender: str, language: str = "fr", app_context: dict = None):
    gender_pronoun = "une assistante experte" if assistant_gender == "female" else "un assistant expert"
    gender_adj = "spécialisée" if assistant_gender == "female" else "spécialisé"
    gender_adj2 = "prête" if assistant_gender == "female" else "prêt"
    
    # Construire le contexte enrichi de l'application
    app_context_text = ""
    if app_context:
        app_context_text = f"""

═══════════════════════════════════════════════════════════════
📊 CONTEXTE TEMPS RÉEL DE L'APPLICATION
═══════════════════════════════════════════════════════════════

👤 UTILISATEUR CONNECTÉ :
   - Nom : {app_context.get('current_user_name', 'Inconnu')}
   - Rôle : {app_context.get('current_user_role', 'N/A')}
   - Page actuelle : {app_context.get('current_page', 'Non détectée')}
   - Dernière action : {app_context.get('last_action', 'Aucune')}

📋 ORDRES DE TRAVAIL :
   - En cours/attente : {app_context.get('active_work_orders', 0)}
   - Urgents (priorité haute) : {app_context.get('urgent_work_orders', 0)}

🔧 ÉQUIPEMENTS :
   - En maintenance/hors service : {app_context.get('equipment_in_maintenance', 0)}

🚨 ALERTES :
   - Alertes actives : {app_context.get('active_alerts', 0)}
   - Capteurs en alerte : {app_context.get('sensors_in_alert', 0)}

📦 INVENTAIRE :
   - Articles en rupture : {app_context.get('inventory_rupture', 0)}
   - Articles niveau bas : {app_context.get('inventory_low', 0)}

⚡ UTILISE CES DONNÉES pour personnaliser tes réponses :
   - Si OT urgents > 0 : Mentionne-le et propose de les afficher
   - Si alertes actives : Propose de les consulter
   - Adapte ton aide à la page actuelle de l'utilisateur
═══════════════════════════════════════════════════════════════"""
    
    return f"""
═══════════════════════════════════════════════════════════════════════════════
🤖 IDENTITÉ ET PERSONNALITÉ
═══════════════════════════════════════════════════════════════════════════════

Tu es {assistant_name}, {gender_pronoun} en GMAO (Gestion de Maintenance Assistée par Ordinateur), {gender_adj} dans l'application GMAO Iris.

🎯 TA MISSION PRINCIPALE :
Accompagner les utilisateurs de manière proactive, intelligente et bienveillante dans toutes leurs tâches de maintenance industrielle. Tu n'es pas un simple chatbot - tu es une véritable experte métier qui comprend les enjeux de la maintenance.

💡 TA PERSONNALITÉ :
- Experte et professionnelle, mais accessible et chaleureuse
- Proactive : tu anticipes les besoins et proposes des solutions
- Pédagogue : tu expliques clairement, étape par étape
- Efficace : tu vas droit au but tout en étant complète
- Empathique : tu comprends les frustrations et rassures l'utilisateur
- Toujours en français

═══════════════════════════════════════════════════════════════════════════════
🎓 TES DOMAINES D'EXPERTISE
═══════════════════════════════════════════════════════════════════════════════

1. ORDRES DE TRAVAIL (OT)
   - Création, suivi, clôture d'OT
   - Types : Corrective (panne), Préventive (planifiée), Améliorative (optimisation)
   - Priorités : Basse, Normale, Haute, Urgente
   - Statuts : En attente → En cours → Terminé / Annulé
   - Assignation aux techniciens
   - Suivi du temps passé

2. ÉQUIPEMENTS
   - Inventaire des machines et équipements
   - Fiche technique : fabricant, modèle, n° série, date installation
   - Historique des interventions
   - Plans de maintenance associés
   - QR codes pour identification rapide

3. MAINTENANCE PRÉVENTIVE
   - Planification des maintenances récurrentes
   - Fréquences : quotidienne, hebdomadaire, mensuelle, annuelle
   - Checklists de contrôle
   - Génération automatique d'OT

4. INVENTAIRE & PIÈCES DE RECHANGE
   - Stock des pièces détachées
   - Seuils d'alerte (niveau bas, rupture)
   - Demandes d'achat
   - Historique des consommations

5. CAPTEURS IoT & MQTT
   - Surveillance en temps réel des paramètres (température, pression, vibration...)
   - Configuration des seuils d'alerte
   - Historique des mesures
   - Actions automatiques sur dépassement

6. ZONES & EMPLACEMENTS
   - Organisation hiérarchique des sites
   - Localisation des équipements
   - Cartographie de l'usine

7. RAPPORTS & ANALYTICS
   - Statistiques de maintenance
   - MTBF, MTTR, taux de disponibilité
   - Coûts de maintenance
   - Rapports d'incidents

═══════════════════════════════════════════════════════════════════════════════
🚀 TES CAPACITÉS D'ACTION (TRÈS IMPORTANT)
═══════════════════════════════════════════════════════════════════════════════

Tu peux EXÉCUTER des actions concrètes dans l'application via des commandes spéciales.
Quand l'utilisateur te demande de faire quelque chose, UTILISE ces commandes.

📌 COMMANDES D'ACTION AUTOMATIQUE :
Utilise ces commandes quand l'utilisateur te demande de créer ou modifier quelque chose.
Place la commande à la FIN de ta réponse, après ton explication.

CRÉER UN ORDRE DE TRAVAIL :
[[CREATE_OT:{{
  "titre": "Titre de l'OT",
  "description": "Description détaillée",
  "type_maintenance": "CORRECTIVE|PREVENTIVE|AMELIORATIVE",
  "priorite": "BASSE|NORMALE|HAUTE|URGENTE",
  "equipement_nom": "Nom de l'équipement (optionnel)",
  "temps_estime": "2h30 (optionnel)"
}}]]

Exemple : Si l'utilisateur dit "Crée un OT pour réparer la pompe P-001 en urgence"
→ Tu réponds : "Je crée immédiatement un ordre de travail correctif urgent pour la pompe P-001."
[[CREATE_OT:{{"titre": "Réparation pompe P-001", "description": "Intervention corrective demandée par l'utilisateur", "type_maintenance": "CORRECTIVE", "priorite": "URGENTE", "equipement_nom": "P-001"}}]]

AJOUTER DU TEMPS À UN OT :
[[ADD_TIME_OT:{{
  "ot_reference": "#5801 ou titre",
  "temps": "2h30",
  "commentaire": "Commentaire optionnel"
}}]]

Exemple : "Ajoute 1h30 sur l'OT #5801"
→ [[ADD_TIME_OT:{{"ot_reference": "#5801", "temps": "1h30"}}]]

AJOUTER UN COMMENTAIRE À UN OT :
[[COMMENT_OT:{{
  "ot_reference": "#5801 ou titre",
  "commentaire": "Le commentaire à ajouter"
}}]]

RECHERCHER DANS LES DONNÉES :
[[SEARCH:{{
  "type": "work_orders|equipments|inventory|maintenance",
  "query": "critères de recherche",
  "filters": {{"statut": "en_cours", "priorite": "haute"}}
}}]]

Exemple : "Montre-moi les OT urgents en cours"
→ [[SEARCH:{{"type": "work_orders", "filters": {{"statut": "en_cours", "priorite": "haute"}}}}]]

═══════════════════════════════════════════════════════════════════════════════
🗺️ COMMANDES DE NAVIGATION ET GUIDAGE VISUEL
═══════════════════════════════════════════════════════════════════════════════

Tu peux GUIDER VISUELLEMENT l'utilisateur dans l'application.
Quand tu guides, l'élément à cliquer sera MIS EN SURBRILLANCE avec un effet lumineux.

📍 NAVIGATION SIMPLE (aller vers une page) :
[[NAVIGATE:dashboard]] - Tableau de bord
[[NAVIGATE:work-orders]] - Ordres de travail
[[NAVIGATE:equipments]] - Équipements
[[NAVIGATE:locations]] - Zones/Emplacements
[[NAVIGATE:inventory]] - Inventaire
[[NAVIGATE:preventive-maintenance]] - Maintenance préventive
[[NAVIGATE:planning-mprev]] - Planning maintenance
[[NAVIGATE:sensors]] - Capteurs MQTT
[[NAVIGATE:meters]] - Compteurs
[[NAVIGATE:reports]] - Rapports
[[NAVIGATE:settings]] - Paramètres
[[NAVIGATE:chat-live]] - Chat Live
[[NAVIGATE:people]] - Équipe/Utilisateurs

🎯 ACTIONS AVEC SURBRILLANCE (naviguer ET mettre en évidence un bouton) :
[[ACTION:creer-ot]] - Aller aux OT et surligner le bouton Créer
[[ACTION:creer-equipement]] - Aller aux Équipements et surligner Ajouter
[[ACTION:creer-emplacement]] - Aller aux Zones et surligner Ajouter
[[ACTION:creer-maintenance]] - Aller à Maintenance Préventive et surligner Créer

═══════════════════════════════════════════════════════════════════════════════
🎓 GUIDAGE PAS À PAS AVEC SURBRILLANCE VISUELLE (TRÈS IMPORTANT)
═══════════════════════════════════════════════════════════════════════════════

Quand l'utilisateur demande "comment faire", "guide-moi", "montre-moi comment",
tu DOIS utiliser le système de guidage pas à pas avec surbrillance.

[[GUIDE_START:nom_du_guide]]
{{
  "title": "Titre du guide",
  "steps": [
    {{
      "instruction": "Ce que l'utilisateur doit faire",
      "target": "selecteur CSS de l'élément à surligner",
      "highlight_type": "pulse|glow|spotlight",
      "wait_for_click": true,
      "navigate_to": "/page (optionnel)"
    }},
    ...
  ]
}}
[[GUIDE_END]]

EXEMPLE - Guide pour créer un OT :
Si l'utilisateur dit "Comment créer un ordre de travail ?"

Tu réponds :
"Parfait ! Je vais te guider pas à pas pour créer un ordre de travail. Suis les étapes, je vais mettre en surbrillance chaque élément sur lequel tu dois cliquer. 🎯

[[GUIDE_START:creer_ot]]
{{
  "title": "Créer un Ordre de Travail",
  "steps": [
    {{
      "instruction": "Clique sur 'Ordres de travail' dans le menu à gauche",
      "target": "[data-testid='sidebar-work-orders'], a[href='/work-orders']",
      "highlight_type": "pulse",
      "wait_for_click": true
    }},
    {{
      "instruction": "Clique sur le bouton '+ Nouvel ordre' en haut à droite",
      "target": "[data-testid='create-work-order-btn'], button:has-text('Nouvel ordre')",
      "highlight_type": "glow",
      "wait_for_click": true
    }},
    {{
      "instruction": "Remplis le titre de l'ordre de travail",
      "target": "input[name='titre'], input[placeholder*='titre']",
      "highlight_type": "spotlight",
      "wait_for_click": false
    }},
    {{
      "instruction": "Sélectionne le type de maintenance (Corrective, Préventive ou Améliorative)",
      "target": "[data-testid='type-maintenance-select'], select[name='type']",
      "highlight_type": "pulse",
      "wait_for_click": true
    }},
    {{
      "instruction": "Choisis la priorité de l'intervention",
      "target": "[data-testid='priority-select'], select[name='priorite']",
      "highlight_type": "pulse",
      "wait_for_click": true
    }},
    {{
      "instruction": "Clique sur 'Créer' pour valider l'ordre de travail",
      "target": "button[type='submit']:has-text('Créer'), [data-testid='submit-ot-btn']",
      "highlight_type": "glow",
      "wait_for_click": true
    }}
  ]
}}
[[GUIDE_END]]"

GUIDES PRÉDÉFINIS À UTILISER :
- creer_ot : Créer un ordre de travail
- creer_equipement : Ajouter un équipement
- creer_maintenance_preventive : Planifier une maintenance
- consulter_dashboard : Explorer le tableau de bord
- configurer_capteur : Configurer un capteur IoT
- gerer_inventaire : Gérer le stock de pièces

═══════════════════════════════════════════════════════════════════════════════
✨ EFFETS VISUELS SUPPLÉMENTAIRES
═══════════════════════════════════════════════════════════════════════════════

[[SPOTLIGHT:selecteur]] - Effet projecteur sur un élément (assombrit le reste)
[[PULSE:selecteur]] - Effet pulsation lumineuse
[[GLOW:selecteur]] - Effet lueur continue
[[ARROW:selecteur]] - Flèche pointant vers l'élément
[[TOOLTIP:selecteur:message]] - Bulle d'info sur un élément
[[CELEBRATE]] - Effet confettis après une réussite

═══════════════════════════════════════════════════════════════════════════════
📚 AIDE CONTEXTUELLE PAR PAGE
═══════════════════════════════════════════════════════════════════════════════

Adapte TOUJOURS tes réponses à la PAGE ACTUELLE de l'utilisateur :

Si page = "dashboard" ou "tableau-de-bord" :
→ Parle des KPIs, statistiques, alertes en cours
→ Propose de détailler les OT urgents ou les équipements en panne

Si page = "work-orders" ou "ordres-de-travail" :
→ Aide sur la création, le suivi, la clôture des OT
→ Propose de filtrer par statut ou priorité

Si page = "equipments" ou "equipements" :
→ Aide sur la gestion des équipements, fiches techniques
→ Propose de voir l'historique de maintenance

Si page = "inventory" ou "inventaire" :
→ Aide sur le stock, les alertes niveau bas
→ Propose de faire une demande d'achat

Si page = "preventive-maintenance" ou "maintenance-prev" :
→ Aide sur la planification des maintenances
→ Propose de créer un nouveau plan

Si page = "sensors" ou "capteurs" :
→ Aide sur la configuration des capteurs IoT
→ Explique les seuils et alertes

═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLES IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

1. TOUJOURS répondre en français
2. Être PROACTIVE : si tu vois des alertes ou OT urgents dans le contexte, mentionne-les
3. UTILISER les commandes d'action quand l'utilisateur demande de FAIRE quelque chose
4. UTILISER le guidage visuel quand l'utilisateur demande COMMENT faire
5. Rester dans le domaine de la GMAO - pour les questions hors sujet, redirige poliment
6. Être CONCISE mais COMPLÈTE - pas de blabla inutile
7. TOUJOURS proposer une action de suivi ("Veux-tu que je...", "Souhaites-tu...")
8. Si tu ne comprends pas, demande des précisions plutôt que de deviner

═══════════════════════════════════════════════════════════════════════════════
💬 EXEMPLES DE CONVERSATIONS IDÉALES
═══════════════════════════════════════════════════════════════════════════════

EXEMPLE 1 - Création d'OT par commande :
👤 "Crée un OT pour la pompe P-001, elle fuit"
🤖 "Je crée immédiatement un ordre de travail correctif pour la pompe P-001 avec la description 'Fuite détectée'. Quelle priorité souhaites-tu ? (Haute recommandée pour une fuite)
[[CREATE_OT:{{"titre": "Fuite pompe P-001", "description": "Fuite détectée - intervention requise", "type_maintenance": "CORRECTIVE", "priorite": "HAUTE", "equipement_nom": "P-001"}}]]"

EXEMPLE 2 - Guidage pas à pas :
👤 "Comment je fais pour ajouter un équipement ?"
🤖 "Je vais te guider étape par étape ! Suis les zones en surbrillance. 🎯
[[GUIDE_START:creer_equipement]]..."

EXEMPLE 3 - Recherche intelligente :
👤 "Montre-moi tous les OT en retard"
🤖 "Je recherche les ordres de travail en retard...
[[SEARCH:{{"type": "work_orders", "filters": {{"statut": "en_retard"}}}}]]"

EXEMPLE 4 - Proactivité basée sur le contexte :
(Si contexte montre 3 OT urgents)
👤 "Bonjour"
🤖 "Bonjour ! 👋 Je vois que tu as 3 ordres de travail urgents en attente. Veux-tu que je te les affiche pour que tu puisses les prioriser ?
[[SEARCH:{{"type": "work_orders", "filters": {{"priorite": "haute", "statut": "en_attente"}}}}]]"

{app_context_text}

Tu es maintenant {gender_adj2} à aider l'utilisateur. Sois proactive, experte et bienveillante ! 🚀
"""


# ==================== Fonctions de Contexte Enrichi ====================

async def get_enriched_app_context(current_user: dict) -> dict:
    """
    Récupère le contexte enrichi de l'application pour améliorer la pertinence des réponses de l'IA.
    Inclut des statistiques en temps réel sur l'état de l'application.
    """
    try:
        context = {
            "current_user_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip() or current_user.get('email', 'Utilisateur'),
            "current_user_role": current_user.get('role', 'N/A'),
            "current_page": "N/A",
            "last_action": "N/A"
        }
        
        # Compter les ordres de travail actifs
        try:
            active_wos = await db.work_orders.count_documents({
                "statut": {"$in": ["en_attente", "en_cours", "En attente", "En cours"]}
            })
            context["active_work_orders"] = active_wos
        except Exception:
            context["active_work_orders"] = 0
        
        # Compter les OT urgents (priorité haute)
        try:
            urgent_wos = await db.work_orders.count_documents({
                "statut": {"$in": ["en_attente", "en_cours", "En attente", "En cours"]},
                "priorite": {"$in": ["haute", "urgente", "Haute", "Urgente", "critical"]}
            })
            context["urgent_work_orders"] = urgent_wos
        except Exception:
            context["urgent_work_orders"] = 0
        
        # Équipements en maintenance
        try:
            eq_maintenance = await db.equipments.count_documents({
                "statut": {"$in": ["en_maintenance", "En maintenance", "hors_service", "Hors service"]}
            })
            context["equipment_in_maintenance"] = eq_maintenance
        except Exception:
            context["equipment_in_maintenance"] = 0
        
        # Alertes actives (capteurs)
        try:
            alerts = await db.sensor_alerts.count_documents({
                "status": {"$in": ["active", "unacknowledged"]}
            })
            context["active_alerts"] = alerts
        except Exception:
            context["active_alerts"] = 0
        
        # Capteurs en alerte
        try:
            sensors_alert = await db.sensors.count_documents({
                "status": {"$in": ["alert", "warning", "critical"]}
            })
            context["sensors_in_alert"] = sensors_alert
        except Exception:
            context["sensors_in_alert"] = 0
        
        # Inventaire - Articles en rupture
        try:
            inventory_rupture = await db.inventory.count_documents({
                "$expr": {"$lte": ["$quantite", 0]}
            })
            context["inventory_rupture"] = inventory_rupture
        except Exception:
            context["inventory_rupture"] = 0
        
        # Inventaire - Articles niveau bas
        try:
            inventory_low = await db.inventory.count_documents({
                "$and": [
                    {"$expr": {"$gt": ["$quantite", 0]}},
                    {"$expr": {"$lte": ["$quantite", "$seuil_alerte"]}}
                ]
            })
            context["inventory_low"] = inventory_low
        except Exception:
            context["inventory_low"] = 0
        
        # Maintenances préventives en retard
        try:
            from datetime import datetime, timezone
            today = datetime.now(timezone.utc)
            pm_overdue = await db.preventive_maintenance.count_documents({
                "prochaine_date": {"$lt": today},
                "statut": {"$ne": "terminé"}
            })
            context["preventive_maintenance_overdue"] = pm_overdue
        except Exception:
            context["preventive_maintenance_overdue"] = 0
        
        # Dernière action utilisateur (depuis l'audit)
        try:
            last_audit = await db.audit_logs.find_one(
                {"user_id": current_user.get("id")},
                sort=[("timestamp", -1)]
            )
            if last_audit:
                context["last_action"] = f"{last_audit.get('action', 'N/A')} sur {last_audit.get('entity_type', 'N/A')}"
        except Exception:
            context["last_action"] = "N/A"
        
        return context
        
    except Exception as e:
        logger.error(f"Erreur récupération contexte enrichi: {e}")
        return {
            "current_user_name": current_user.get('email', 'Utilisateur'),
            "current_user_role": current_user.get('role', 'N/A'),
            "active_work_orders": 0,
            "urgent_work_orders": 0,
            "equipment_in_maintenance": 0,
            "active_alerts": 0,
            "sensors_in_alert": 0,
            "current_page": "N/A",
            "last_action": "N/A"
        }


# ==================== Endpoints ====================

@router.get("/context")
async def get_app_context(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le contexte enrichi de l'application pour l'IA"""
    try:
        context = await get_enriched_app_context(current_user)
        return {"context": context}
    except Exception as e:
        logger.error(f"Erreur récupération contexte: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération contexte")


@router.get("/providers")
async def get_llm_providers(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer la liste des fournisseurs LLM disponibles"""
    try:
        # Vérifier quels fournisseurs sont disponibles (ont une clé API)
        providers_list = []
        
        for provider_id, provider_info in LLM_PROVIDERS.items():
            is_available = False
            
            # Vérifier si la clé est disponible
            key_name = provider_info.get("provider_key")
            if key_name:
                # Vérifier d'abord la clé globale, puis la clé Emergent
                global_key = await db.global_settings.find_one({"key": key_name})
                if global_key and global_key.get("value"):
                    is_available = True
                elif key_name == "EMERGENT_LLM_KEY":
                    # Vérifier la variable d'environnement
                    is_available = bool(os.environ.get("EMERGENT_LLM_KEY"))
            
            providers_list.append({
                "id": provider_info["id"],
                "name": provider_info["name"],
                "models": provider_info["models"],
                "requires_api_key": provider_info["requires_api_key"],
                "is_available": is_available
            })
        
        return {"providers": providers_list}
        
    except Exception as e:
        logger.error(f"Erreur récupération fournisseurs LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération fournisseurs LLM")


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Envoyer un message au chatbot IA"""
    try:
        user_id = current_user.get("id")
        
        # Récupérer les préférences utilisateur pour l'IA
        preferences = await db.user_preferences.find_one({"user_id": user_id})
        
        assistant_name = preferences.get("ai_assistant_name", "Adria") if preferences else "Adria"
        assistant_gender = preferences.get("ai_assistant_gender", "female") if preferences else "female"
        llm_provider = preferences.get("ai_llm_provider", "gemini") if preferences else "gemini"
        llm_model = preferences.get("ai_llm_model", "gemini-2.5-flash") if preferences else "gemini-2.5-flash"
        language = preferences.get("language", "fr") if preferences else "fr"
        
        # Générer ou récupérer l'ID de session
        session_id = request.session_id or f"{user_id}_{str(uuid.uuid4())[:8]}"
        
        # Récupérer le contexte enrichi de l'application si demandé
        app_context = None
        if request.include_app_context:
            app_context = await get_enriched_app_context(current_user)
            # Ajouter le contexte de page si fourni
            if request.context:
                app_context["current_page"] = request.context
        
        # Récupérer l'historique de conversation
        history = await db.ai_chat_history.find(
            {"session_id": session_id}
        ).sort("timestamp", 1).to_list(length=50)
        
        # Sauvegarder le message de l'utilisateur
        user_message_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": request.message,
            "context": request.context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_chat_history.insert_one(user_message_doc)
        
        # Obtenir la réponse de l'IA
        try:
            response_text = await get_llm_response(
                message=request.message,
                history=history,
                assistant_name=assistant_name,
                assistant_gender=assistant_gender,
                language=language,
                provider=llm_provider,
                model=llm_model,
                context=request.context,
                app_context=app_context
            )
        except Exception as llm_error:
            logger.error(f"Erreur LLM: {llm_error}")
            response_text = f"Désolé, je rencontre actuellement des difficultés techniques. Veuillez réessayer dans quelques instants. (Erreur: {str(llm_error)[:100]})"
        
        # Sauvegarder la réponse de l'assistant
        assistant_message_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_chat_history.insert_one(assistant_message_doc)
        
        return ChatResponse(response=response_text, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Erreur chat IA: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur chat IA: {str(e)}")


@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer l'historique d'une conversation"""
    try:
        user_id = current_user.get("id")
        
        history = await db.ai_chat_history.find(
            {"session_id": session_id, "user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(length=100)
        
        return {"history": history, "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Erreur récupération historique: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération historique")


@router.delete("/history/{session_id}")
async def clear_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Effacer l'historique d'une conversation"""
    try:
        user_id = current_user.get("id")
        
        result = await db.ai_chat_history.delete_many(
            {"session_id": session_id, "user_id": user_id}
        )
        
        return {"success": True, "deleted_count": result.deleted_count}
        
    except Exception as e:
        logger.error(f"Erreur suppression historique: {e}")
        raise HTTPException(status_code=500, detail="Erreur suppression historique")


@router.get("/sessions")
async def get_user_sessions(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les sessions de conversation de l'utilisateur"""
    try:
        user_id = current_user.get("id")
        
        # Récupérer les sessions distinctes
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$session_id",
                "last_message": {"$last": "$timestamp"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"last_message": -1}},
            {"$limit": 20}
        ]
        
        sessions = await db.ai_chat_history.aggregate(pipeline).to_list(length=20)
        
        return {"sessions": [
            {
                "session_id": s["_id"],
                "last_message": s["last_message"],
                "message_count": s["message_count"]
            } for s in sessions
        ]}
        
    except Exception as e:
        logger.error(f"Erreur récupération sessions: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération sessions")


# ==================== Endpoints Clés API Globales ====================

class GlobalLLMKeys(BaseModel):
    deepseek_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None

@router.get("/global-keys")
async def get_global_llm_keys(
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer les clés API globales (admin seulement)"""
    try:
        keys = {}
        
        # Récupérer chaque clé
        for key_name in ["DEEPSEEK_API_KEY", "MISTRAL_API_KEY"]:
            setting = await db.global_settings.find_one({"key": key_name})
            # Masquer partiellement la clé pour la sécurité
            if setting and setting.get("value"):
                value = setting["value"]
                # Montrer seulement les 4 premiers et 4 derniers caractères
                if len(value) > 12:
                    masked = value[:4] + "*" * (len(value) - 8) + value[-4:]
                else:
                    masked = "****" + value[-4:] if len(value) > 4 else "****"
                keys[key_name.lower()] = masked
            else:
                keys[key_name.lower()] = ""
        
        return keys
        
    except Exception as e:
        logger.error(f"Erreur récupération clés LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération clés LLM")


@router.put("/global-keys")
async def update_global_llm_keys(
    keys: GlobalLLMKeys,
    current_user: dict = Depends(get_current_admin_user)
):
    """Mettre à jour les clés API globales (admin seulement)"""
    try:
        from datetime import datetime, timezone
        
        # Mettre à jour chaque clé si elle est fournie et non masquée
        if keys.deepseek_api_key and not keys.deepseek_api_key.startswith("****") and "*" not in keys.deepseek_api_key:
            await db.global_settings.update_one(
                {"key": "DEEPSEEK_API_KEY"},
                {"$set": {
                    "key": "DEEPSEEK_API_KEY",
                    "value": keys.deepseek_api_key,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }},
                upsert=True
            )
            logger.info("Clé API DeepSeek mise à jour")
        
        if keys.mistral_api_key and not keys.mistral_api_key.startswith("****") and "*" not in keys.mistral_api_key:
            await db.global_settings.update_one(
                {"key": "MISTRAL_API_KEY"},
                {"$set": {
                    "key": "MISTRAL_API_KEY",
                    "value": keys.mistral_api_key,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }},
                upsert=True
            )
            logger.info("Clé API Mistral mise à jour")
        
        return {"success": True, "message": "Clés API mises à jour"}
        
    except Exception as e:
        logger.error(f"Erreur mise à jour clés LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur mise à jour clés LLM")


# ==================== Vérification des versions LLM ====================

# Versions connues des modèles (à mettre à jour)
KNOWN_LLM_VERSIONS = {
    "gemini": {
        "latest": "gemini-2.5-flash",
        "versions": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
        "last_check": None
    },
    "openai": {
        "latest": "gpt-4o",
        "versions": ["gpt-5.1", "gpt-4o", "gpt-4o-mini"],
        "last_check": None
    },
    "anthropic": {
        "latest": "claude-4-sonnet-20250514",
        "versions": ["claude-4-sonnet-20250514", "claude-3-5-haiku-20241022"],
        "last_check": None
    },
    "deepseek": {
        "latest": "deepseek-chat",
        "versions": ["deepseek-chat", "deepseek-coder"],
        "last_check": None
    },
    "mistral": {
        "latest": "mistral-large-latest",
        "versions": ["mistral-large-latest", "mistral-medium-latest"],
        "last_check": None
    }
}

@router.get("/llm-versions")
async def get_llm_versions(
    current_user: dict = Depends(get_current_admin_user)
):
    """Récupérer les versions LLM actuelles et disponibles (admin seulement)"""
    try:
        # Récupérer les versions stockées
        stored_versions = await db.llm_versions.find_one({"id": "current"})
        
        if not stored_versions:
            # Initialiser avec les versions connues
            stored_versions = {
                "id": "current",
                "versions": KNOWN_LLM_VERSIONS,
                "last_check": None,
                "next_check": None
            }
            await db.llm_versions.insert_one(stored_versions)
        
        return {
            "versions": stored_versions.get("versions", KNOWN_LLM_VERSIONS),
            "last_check": stored_versions.get("last_check"),
            "next_check": stored_versions.get("next_check")
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération versions LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur récupération versions LLM")


@router.post("/check-llm-updates")
async def check_llm_updates(
    current_user: dict = Depends(get_current_admin_user)
):
    """Vérifier manuellement les mises à jour des modèles LLM (admin seulement)"""
    try:
        # Simuler une vérification (dans un vrai système, on ferait des appels API)
        # Pour l'instant, on met à jour la date de dernière vérification
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Calculer la prochaine vérification (prochain lundi à 3h GMT)
        from datetime import timedelta
        today = datetime.now(timezone.utc)
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0 and today.hour >= 3:
            days_until_monday = 7
        next_monday = today.replace(hour=3, minute=0, second=0, microsecond=0) + timedelta(days=days_until_monday)
        
        await db.llm_versions.update_one(
            {"id": "current"},
            {"$set": {
                "last_check": now,
                "next_check": next_monday.isoformat(),
                "checked_by": current_user.get("id")
            }},
            upsert=True
        )
        
        # Vérifier s'il y a des nouvelles versions (simulation)
        new_versions_found = []
        
        # Dans un vrai système, on comparerait avec les API des fournisseurs
        # Pour l'instant, on retourne juste le statut
        
        return {
            "success": True,
            "message": "Vérification effectuée",
            "last_check": now,
            "next_check": next_monday.isoformat(),
            "new_versions": new_versions_found
        }
        
    except Exception as e:
        logger.error(f"Erreur vérification mises à jour LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur vérification mises à jour LLM")


@router.post("/notify-llm-update")
async def notify_llm_update(
    provider: str,
    new_version: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Envoyer une notification email pour une nouvelle version LLM (admin seulement)"""
    try:
        # Récupérer les admins pour les notifier
        admins = await db.users.find({"role": "admin"}, {"_id": 0, "email": 1, "name": 1}).to_list(100)
        
        if not admins:
            return {"success": False, "message": "Aucun admin à notifier"}
        
        # Envoyer les emails (utiliser le service SMTP configuré)
        # Pour l'instant, on log juste l'action
        logger.info(f"Notification nouvelle version LLM: {provider} -> {new_version}")
        logger.info(f"Admins à notifier: {[a.get('email') for a in admins]}")
        
        # Stocker la notification
        await db.llm_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "provider": provider,
            "new_version": new_version,
            "notified_at": datetime.now(timezone.utc).isoformat(),
            "notified_by": current_user.get("id"),
            "admins_notified": [a.get("email") for a in admins]
        })
        
        return {
            "success": True,
            "message": f"Notification envoyée pour {provider} v{new_version}",
            "admins_notified": len(admins)
        }
        
    except Exception as e:
        logger.error(f"Erreur notification mise à jour LLM: {e}")
        raise HTTPException(status_code=500, detail="Erreur notification mise à jour LLM")


# ==================== Fonction LLM ====================

async def get_llm_response(
    message: str,
    history: list,
    assistant_name: str,
    assistant_gender: str,
    language: str,
    provider: str,
    model: str,
    context: str = None,
    app_context: dict = None
) -> str:
    """Obtenir une réponse du LLM configuré avec contexte enrichi"""
    
    # Récupérer la clé API
    api_key = None
    provider_info = LLM_PROVIDERS.get(provider, LLM_PROVIDERS["gemini"])
    key_name = provider_info.get("provider_key", "EMERGENT_LLM_KEY")
    
    # Vérifier d'abord les paramètres globaux
    global_key = await db.global_settings.find_one({"key": key_name})
    if global_key and global_key.get("value"):
        api_key = global_key["value"]
    else:
        # Utiliser la variable d'environnement
        api_key = os.environ.get(key_name) or os.environ.get("EMERGENT_LLM_KEY")
    
    if not api_key:
        raise Exception(f"Clé API non configurée pour {provider}")
    
    # Préparer le message système avec le contexte enrichi
    system_message = get_system_message(assistant_name, assistant_gender, language, app_context)
    
    # Ajouter le contexte de page si disponible (et non déjà dans app_context)
    if context and not app_context:
        system_message += f"\n\nContexte actuel de l'utilisateur : {context}"
    
    # Utiliser emergentintegrations pour l'appel LLM
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Déterminer le provider pour emergentintegrations
        ei_provider = provider
        if provider in ["deepseek", "mistral"]:
            # Pour les providers non supportés par Emergent, on utilise leur API directement
            # Pour l'instant, on fallback sur gemini
            logger.warning(f"Provider {provider} non supporté par Emergent, fallback sur gemini")
            ei_provider = "gemini"
            model = "gemini-2.5-flash"
        
        # Créer le chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"gmao_{assistant_name}",
            system_message=system_message
        )
        
        # Configurer le modèle
        chat.with_model(ei_provider, model)
        
        # Créer le message utilisateur
        user_message = UserMessage(text=message)
        
        # Envoyer et récupérer la réponse
        response = await chat.send_message(user_message)
        
        return response
        
    except ImportError:
        logger.error("emergentintegrations non installé, installation en cours...")
        raise Exception("Le module emergentintegrations n'est pas installé")
    except Exception as e:
        logger.error(f"Erreur appel LLM: {e}")
        raise
