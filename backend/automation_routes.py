"""
Module d'automatisation IA - Permet a Adria de configurer des automatisations
a partir de commandes en langage naturel.

Types d'automatisations supportees :
1. Alertes capteurs (seuils + actions email/OT/notification)
2. Rappels maintenance
3. Regles d'escalade OT
4. Seuils inventaire
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging
import json
import uuid
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/automations", tags=["Automatisations"])

db = None


def init_automation_routes(database):
    global db
    db = database


def clean_json(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t[3:]
    if t.endswith("```"):
        t = t[:-3]
    return t.strip()


async def _get_llm():
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        gk = await db.global_settings.find_one({"key": "EMERGENT_LLM_KEY"})
        if gk and gk.get("value"):
            key = gk["value"]
    if not key:
        raise HTTPException(status_code=500, detail="Cle LLM non configuree")
    return LlmChat, UserMessage, key


@router.post("/parse")
async def parse_automation_request(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Prend une commande en langage naturel et la traduit en configuration d'automatisation.
    Retourne un apercu de ce qui sera configure pour validation par l'utilisateur.
    """
    try:
        message = data.get("message", "")
        if not message:
            raise HTTPException(status_code=400, detail="Message requis")

        # Collecter le contexte disponible
        sensors = await db.sensors.find({}, {"_id": 0, "id": 1, "name": 1, "type": 1, "unit": 1, "min_threshold": 1, "max_threshold": 1, "alert_enabled": 1}).to_list(50)
        equipments = await db.equipments.find({}, {"_id": 0, "id": 1, "nom": 1, "reference": 1, "type": 1}).to_list(50)
        users = await db.users.find({}, {"_id": 0, "id": 1, "email": 1, "nom": 1, "prenom": 1, "role": 1, "service": 1}).to_list(50)
        
        sensors_text = "\n".join([f"  - id:{s.get('id','?')} | {s.get('name','')} | type:{s.get('type','')} | unite:{s.get('unit','')} | seuils:[{s.get('min_threshold','?')}, {s.get('max_threshold','?')}]" for s in sensors]) or "  Aucun capteur"
        equip_text = "\n".join([f"  - id:{e.get('id','?')} | {e.get('nom','')} ({e.get('reference','')})" for e in equipments[:20]]) or "  Aucun equipement"
        users_text = "\n".join([f"  - id:{u.get('id','?')} | {u.get('prenom','')} {u.get('nom','')} | {u.get('email','')} | service:{u.get('service','')}" for u in users]) or "  Aucun utilisateur"

        prompt = f"""Tu es un systeme d'automatisation GMAO. L'utilisateur demande de configurer une automatisation en langage naturel. Analyse sa demande et traduis-la en configuration structuree.

DEMANDE DE L'UTILISATEUR : "{message}"

CAPTEURS DISPONIBLES :
{sensors_text}

EQUIPEMENTS DISPONIBLES :
{equip_text}

UTILISATEURS DISPONIBLES :
{users_text}

Traduis cette demande en JSON avec cette structure :
{{
  "type": "sensor_alert|maintenance_reminder|escalation_rule|inventory_threshold",
  "name": "Nom descriptif de l'automatisation",
  "description": "Description en francais de ce qui sera configure",
  "config": {{
    // Pour sensor_alert :
    "sensor_id": "id du capteur",
    "sensor_name": "nom du capteur",
    "condition": "above|below|range",
    "threshold_value": 32.5,
    "threshold_unit": "C",
    "actions": [
      {{
        "type": "email",
        "recipients": ["email@exemple.com"],
        "recipient_names": ["Nom Prenom"]
      }},
      {{
        "type": "create_workorder",
        "title": "Titre OT auto",
        "priority": "HAUTE"
      }},
      {{
        "type": "notification",
        "message": "Message de notification"
      }}
    ],
    // Pour maintenance_reminder :
    "equipment_id": "id equipement",
    "equipment_name": "nom",
    "interval_days": 14,
    "reminder_message": "Message de rappel",
    "notify_emails": ["email"],
    // Pour escalation_rule :
    "delay_hours": 4,
    "condition": "OT urgent non pris en charge",
    "escalate_to_emails": ["chef@entreprise.com"],
    // Pour inventory_threshold :
    "item_name": "Filtres",
    "min_quantity": 5,
    "notify_emails": ["magasinier@entreprise.com"]
  }},
  "confirmation_message": "Message de confirmation pour l'utilisateur en francais",
  "understood": true,
  "needs_clarification": false,
  "clarification_question": null
}}

Si tu ne comprends pas la demande ou s'il manque des infos, mets understood=false et pose une question dans clarification_question.
Si un capteur/equipement n'est pas trouve, indique-le dans la description.
"""

        LlmChat, UserMessage, key = await _get_llm()
        chat = LlmChat(api_key=key, session_id=f"automation_parse_{uuid.uuid4().hex[:6]}", system_message="Tu es un moteur d'automatisation GMAO. Reponds UNIQUEMENT en JSON valide.")
        chat.with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=prompt))
        result = json.loads(clean_json(response))

        return {"success": True, "automation": result}

    except json.JSONDecodeError:
        return {"success": False, "error": "Impossible de parser la reponse IA", "raw": response[:500]}
    except Exception as e:
        logger.error(f"Erreur parse automatisation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply")
async def apply_automation(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Applique une automatisation validee par l'utilisateur.
    Cree la configuration dans la DB.
    """
    try:
        automation = data.get("automation")
        if not automation:
            raise HTTPException(status_code=400, detail="Configuration d'automatisation requise")

        auto_type = automation.get("type")
        config = automation.get("config", {})
        
        now = datetime.now(timezone.utc)
        auto_id = str(uuid.uuid4())

        if auto_type == "sensor_alert":
            # Configurer le seuil du capteur et l'action
            sensor_id = config.get("sensor_id")
            if sensor_id:
                update = {}
                if config.get("condition") == "above":
                    update["max_threshold"] = config.get("threshold_value")
                elif config.get("condition") == "below":
                    update["min_threshold"] = config.get("threshold_value")
                update["alert_enabled"] = True
                
                await db.sensors.update_one(
                    {"id": sensor_id},
                    {"$set": update}
                )
                
                # Créer/mettre à jour la config d'action d'alerte
                alert_config = {
                    "id": auto_id,
                    "source_type": "sensor",
                    "source_id": sensor_id,
                    "enabled": True,
                    "actions": [a["type"].upper().replace("EMAIL", "SEND_EMAIL").replace("CREATE_WORKORDER", "CREATE_WORKORDER").replace("NOTIFICATION", "NOTIFICATION_ONLY") for a in config.get("actions", [])],
                    "email_recipients": [],
                    "workorder_template": {},
                    "created_at": now,
                    "created_by": current_user.get("id"),
                    "automation_name": automation.get("name", "")
                }
                
                for action in config.get("actions", []):
                    if action["type"] == "email":
                        alert_config["email_recipients"] = action.get("recipients", [])
                    elif action["type"] == "create_workorder":
                        alert_config["workorder_template"] = {
                            "titre": action.get("title", f"Alerte automatique capteur"),
                            "priorite": action.get("priority", "HAUTE")
                        }
                
                await db.alert_action_configs.update_one(
                    {"source_type": "sensor", "source_id": sensor_id},
                    {"$set": alert_config},
                    upsert=True
                )

        # Sauvegarder l'automatisation dans la collection
        automation_doc = {
            "id": auto_id,
            "type": auto_type,
            "name": automation.get("name", ""),
            "description": automation.get("description", ""),
            "config": config,
            "enabled": True,
            "created_at": now,
            "created_by": current_user.get("id"),
            "created_by_name": f"{current_user.get('prenom','')} {current_user.get('nom','')}".strip(),
            "last_triggered": None,
            "trigger_count": 0
        }
        await db.automations.insert_one(automation_doc)

        return {
            "success": True,
            "automation_id": auto_id,
            "message": automation.get("confirmation_message", "Automatisation configuree avec succes")
        }

    except Exception as e:
        logger.error(f"Erreur application automatisation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_automations(
    current_user: dict = Depends(get_current_user)
):
    """Liste toutes les automatisations actives."""
    try:
        automations = await db.automations.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return {"success": True, "automations": automations, "total": len(automations)}
    except Exception as e:
        logger.error(f"Erreur liste automatisations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{automation_id}")
async def delete_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime une automatisation."""
    try:
        result = await db.automations.delete_one({"id": automation_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Automatisation introuvable")
        return {"success": True, "message": "Automatisation supprimee"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression automatisation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{automation_id}/toggle")
async def toggle_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Active/désactive une automatisation."""
    try:
        auto = await db.automations.find_one({"id": automation_id})
        if not auto:
            raise HTTPException(status_code=404, detail="Automatisation introuvable")
        
        new_state = not auto.get("enabled", True)
        await db.automations.update_one(
            {"id": automation_id},
            {"$set": {"enabled": new_state}}
        )
        return {"success": True, "enabled": new_state}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/test-trigger/{automation_id}")
async def test_trigger_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Simule le declenchement d'une automatisation pour tester les notifications push.
    Cree une notification pour l'utilisateur connecte sans modifier les capteurs.
    """
    try:
        auto = await db.automations.find_one({"id": automation_id}, {"_id": 0})
        if not auto:
            raise HTTPException(status_code=404, detail="Automatisation introuvable")

        now = datetime.now(timezone.utc)
        config = auto.get("config", {})

        # Creer une notification de test pour l'utilisateur courant
        notification = {
            "id": str(uuid.uuid4()),
            "type": "automation_trigger",
            "title": f"Automatisation declenchee : {auto.get('name', 'Sans nom')}",
            "message": f"[TEST] {auto.get('description', '')} - Valeur simulee: {config.get('threshold_value', '?')} {config.get('threshold_unit', '')}",
            "priority": "high",
            "user_id": current_user.get("id"),
            "link": "/surveillance-ai-dashboard",
            "metadata": {
                "source_type": "sensor",
                "source_id": config.get("sensor_id", ""),
                "source_name": config.get("sensor_name", ""),
                "automation_name": auto.get("name", ""),
                "automation_id": automation_id,
                "is_automation_notification": True,
                "is_test": True
            },
            "read": False,
            "created_at": now.isoformat(),
            "read_at": None
        }
        await db.notifications.insert_one(notification)

        # Mettre a jour le compteur
        await db.automations.update_one(
            {"id": automation_id},
            {"$inc": {"trigger_count": 1}, "$set": {"last_triggered": now.isoformat()}}
        )

        return {
            "success": True,
            "message": f"Notification de test envoyee pour '{auto.get('name')}'",
            "notification_id": notification["id"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur test trigger: {e}")
        raise HTTPException(status_code=500, detail=str(e))
