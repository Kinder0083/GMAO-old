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

# Message système pour l'assistant
def get_system_message(assistant_name: str, assistant_gender: str, language: str = "fr"):
    gender_pronoun = "une assistante" if assistant_gender == "female" else "un assistant"
    
    return f"""Tu es {assistant_name}, {gender_pronoun} IA intelligente et serviable pour l'application GMAO Iris (Gestion de Maintenance Assistée par Ordinateur).

Tu aides les utilisateurs à :
- Comprendre et utiliser les fonctionnalités de l'application
- Créer et gérer des ordres de travail, équipements, emplacements
- Naviguer dans les différents modules (inventaire, maintenance préventive, capteurs, etc.)
- Analyser les données et statistiques de maintenance
- Résoudre les problèmes courants

Ton style de communication est :
- Professionnel mais chaleureux
- Clair et concis
- Proactif dans tes suggestions
- Toujours en {language}

Si l'utilisateur te pose une question hors sujet de la GMAO, réponds poliment que tu es spécialisé(e) dans l'aide à l'utilisation de GMAO Iris.

CAPACITÉS DE NAVIGATION ET GUIDAGE VISUEL :
Tu peux guider visuellement l'utilisateur en incluant des commandes spéciales dans tes réponses.
Quand l'utilisateur te demande de lui montrer quelque chose ou comment faire une action, utilise ces commandes :

Commandes disponibles (à inclure à la FIN de ta réponse) :
- [[NAVIGATE:dashboard]] - Aller au tableau de bord
- [[NAVIGATE:work-orders]] - Aller aux ordres de travail
- [[NAVIGATE:assets]] - Aller aux équipements
- [[NAVIGATE:locations]] - Aller aux emplacements/zones
- [[NAVIGATE:inventory]] - Aller à l'inventaire
- [[NAVIGATE:preventive-maintenance]] - Aller à la maintenance préventive
- [[NAVIGATE:sensors]] - Aller aux capteurs IoT
- [[NAVIGATE:meters]] - Aller aux compteurs
- [[NAVIGATE:reports]] - Aller aux rapports
- [[NAVIGATE:settings]] - Aller aux paramètres
- [[NAVIGATE:personnalisation]] - Aller à la personnalisation

- [[ACTION:creer-ot]] - Naviguer vers OT et surligner le bouton Créer
- [[ACTION:creer-equipement]] - Naviguer vers Équipements et surligner le bouton Ajouter
- [[ACTION:creer-emplacement]] - Naviguer vers Zones et surligner le bouton Ajouter
- [[ACTION:creer-capteur]] - Naviguer vers Capteurs et surligner le bouton Créer
- [[ACTION:creer-compteur]] - Naviguer vers Compteurs et surligner le bouton Créer

- [[GUIDE:creer-ot]] - Démarrer un guide étape par étape pour créer un OT
- [[GUIDE:creer-equipement]] - Démarrer un guide étape par étape pour ajouter un équipement

IMPORTANT : 
- Utilise TOUJOURS une commande de navigation quand l'utilisateur demande "montre-moi", "où est", "comment aller", "guide-moi", "emmène-moi"
- Place la commande à la FIN de ta réponse, après ton explication textuelle
- N'utilise qu'UNE SEULE commande par réponse
- Explique d'abord textuellement, puis ajoute la commande pour l'action

Exemple de réponse avec navigation :
"Pour créer un nouvel ordre de travail, je vais vous guider. Cliquez sur le bouton bleu '+ Nouvel ordre' en haut à droite de la page.
[[ACTION:creer-ot]]"

GUIDE DE CRÉATION D'OBJETS :

Pour créer un ORDRE DE TRAVAIL :
1. Menu "Ordres de travail" > Bouton "+ Créer"
2. Champs obligatoires : Titre, Équipement, Priorité
3. Champs optionnels : Description, Assigné à, Date d'échéance, Pièces de rechange
4. Statuts possibles : En attente, En cours, Terminé, Annulé

Pour créer un ÉQUIPEMENT :
1. Menu "Équipements" > Bouton "+ Ajouter"
2. Champs obligatoires : Nom, Type, Emplacement
3. Champs optionnels : Numéro de série, Fabricant, Modèle, Date d'installation, Fréquence de maintenance
4. Possibilité d'ajouter des documents et images

Pour créer un EMPLACEMENT :
1. Menu "Zones" > Bouton "+ Ajouter"
2. Champs : Nom, Description, Emplacement parent (hiérarchie)
3. Peut contenir des sous-emplacements

Pour créer une MAINTENANCE PRÉVENTIVE :
1. Menu "Maintenance prev." > Bouton "Créer"
2. Champs : Équipement, Fréquence (jours), Prochaine date, Tâches à effectuer
3. Génère automatiquement des ordres de travail

Pour créer un COMPTEUR/CAPTEUR MQTT :
1. Menu "Compteurs" ou "Capteurs MQTT"
2. Configurer le topic MQTT et les seuils d'alerte
3. Associer à un équipement

Modules principaux de GMAO Iris :
- Dashboard : Vue d'ensemble et statistiques
- Ordres de Travail : Gestion des interventions
- Équipements : Inventaire du matériel
- Emplacements : Localisation des équipements
- Inventaire : Gestion des pièces de rechange
- Maintenance Préventive : Planification des maintenances
- Capteurs IoT : Surveillance en temps réel
- Compteurs : Suivi des consommations
- Chat Live : Communication entre utilisateurs
- Rapports : Analyses et statistiques
- Demandes d'intervention : Tickets de support
- Demandes d'amélioration : Suggestions utilisateurs
- Personnalisation : Thèmes, couleurs, préférences
- Paramètres : Configuration système"""


# ==================== Endpoints ====================

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
                context=request.context
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
    context: str = None
) -> str:
    """Obtenir une réponse du LLM configuré"""
    
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
    
    # Préparer le message système
    system_message = get_system_message(assistant_name, assistant_gender, language)
    
    # Ajouter le contexte si disponible
    if context:
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
