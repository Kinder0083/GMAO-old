"""
Routes IA pour les Ordres de Travail
- Feature 1: Diagnostic IA (analyse équipement + historique → pistes de diagnostic)
- Feature 2: Résumé intelligent de clôture d'OT
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-work-orders", tags=["IA Ordres de Travail"])

db = None
audit_service = None


def init_ai_wo_routes(database, audit_svc):
    global db, audit_service
    db = database
    audit_service = audit_svc


def clean_json_response(text: str) -> str:
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
        global_key = await db.global_settings.find_one({"key": "EMERGENT_LLM_KEY"})
        if global_key and global_key.get("value"):
            key = global_key["value"]
    if not key:
        raise HTTPException(status_code=500, detail="Cle LLM non configuree")
    return LlmChat, UserMessage, key


@router.post("/diagnostic")
async def ai_diagnostic(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyse l'équipement concerné par l'OT, son historique de pannes,
    et propose un diagnostic avec pistes de résolution et pièces nécessaires.
    """
    try:
        work_order_id = data.get("work_order_id")
        if not work_order_id:
            raise HTTPException(status_code=400, detail="work_order_id requis")

        # Récupérer l'OT (id string ou ObjectId)
        wo = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
        if not wo:
            try:
                wo = await db.work_orders.find_one({"_id": ObjectId(work_order_id)})
                if wo:
                    wo["id"] = str(wo.pop("_id"))
            except Exception:
                pass
        if not wo:
            raise HTTPException(status_code=404, detail="OT introuvable")

        # Récupérer l'équipement
        equipment = None
        eq_id = wo.get("equipement_id") or (wo.get("equipement") or {}).get("id")
        if eq_id:
            equipment = await db.equipments.find_one({"id": eq_id}, {"_id": 0})

        # Historique des OT sur cet équipement
        history = []
        if eq_id:
            history = await db.work_orders.find(
                {"equipement_id": eq_id, "id": {"$ne": work_order_id}},
                {"_id": 0, "titre": 1, "description": 1, "statut": 1, "priorite": 1, "categorie": 1, "dateCreation": 1, "comments": 1, "parts_used": 1}
            ).sort("dateCreation", -1).to_list(length=15)

        # Historique des pièces utilisées
        all_parts = []
        for h in history:
            for p in h.get("parts_used", []):
                all_parts.append(f"{p.get('nom', p.get('name', '?'))} (x{p.get('quantity', 1)})")

        # Inventaire disponible
        inventory = await db.inventory.find(
            {}, {"_id": 0, "nom": 1, "reference": 1, "quantite": 1, "categorie": 1}
        ).to_list(length=50)
        inv_text = "\n".join([f"- {i.get('nom','')} ({i.get('reference','')}) : {i.get('quantite',0)} en stock" for i in inventory[:30]])

        # Construire le prompt
        eq_info = ""
        if equipment:
            eq_info = f"""
EQUIPEMENT CONCERNE :
- Nom : {equipment.get('nom', 'N/A')}
- Reference : {equipment.get('reference', 'N/A')}
- Type : {equipment.get('type', 'N/A')}
- Fabricant : {equipment.get('fabricant', 'N/A')}
- Modele : {equipment.get('modele', 'N/A')}
- Emplacement : {equipment.get('emplacement', 'N/A')}
- Statut : {equipment.get('statut', 'N/A')}
- Date mise en service : {equipment.get('dateMiseEnService', 'N/A')}
"""

        history_text = ""
        if history:
            lines = []
            for h in history[:10]:
                comments = "; ".join([c.get("text", "") for c in h.get("comments", [])[:3]])
                parts = ", ".join([p.get("nom", p.get("name", "?")) for p in h.get("parts_used", [])])
                lines.append(f"- [{h.get('dateCreation','?')[:10]}] {h.get('titre','')} | {h.get('categorie','')} | {h.get('statut','')} | Pieces: {parts or 'aucune'} | Commentaires: {comments[:100] or 'aucun'}")
            history_text = "\n".join(lines)

        prompt = f"""Tu es un expert en maintenance industrielle. Analyse cet ordre de travail et fournis un diagnostic structure.

ORDRE DE TRAVAIL :
- Titre : {wo.get('titre', 'N/A')}
- Description : {wo.get('description', 'N/A')}
- Categorie : {wo.get('categorie', 'N/A')}
- Priorite : {wo.get('priorite', 'N/A')}
{eq_info}
HISTORIQUE DE PANNES DE CET EQUIPEMENT ({len(history)} OT precedents) :
{history_text or 'Aucun historique'}

PIECES PRECEDEMMENT UTILISEES : {', '.join(all_parts) if all_parts else 'Aucune'}

INVENTAIRE DISPONIBLE :
{inv_text or 'Non disponible'}

Reponds en JSON avec cette structure exacte :
{{
  "diagnostic": {{
    "cause_probable": "Description de la cause la plus probable",
    "causes_secondaires": ["cause 2", "cause 3"],
    "niveau_confiance": "haute|moyenne|basse"
  }},
  "pistes_resolution": [
    {{
      "etape": 1,
      "action": "Description de l'action",
      "duree_estimee": "ex: 30 min",
      "competence_requise": "ex: Electricien"
    }}
  ],
  "pieces_necessaires": [
    {{
      "nom": "Nom de la piece",
      "quantite": 1,
      "en_stock": true,
      "critique": true
    }}
  ],
  "risques": ["Risque 1 a surveiller"],
  "recommendation_priorite": "maintenir|augmenter|diminuer",
  "pannes_recurrentes": true,
  "commentaire_expert": "Synthese et recommandation globale en 2-3 phrases"
}}"""

        LlmChat, UserMessage, key = await _get_llm()
        chat = LlmChat(api_key=key, session_id=f"ai_wo_diagnostic_{work_order_id}", system_message="Tu es un expert en maintenance industrielle GMAO. Reponds UNIQUEMENT en JSON valide.")
        chat.with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=prompt))
        result = json.loads(clean_json_response(response))

        return {"success": True, "diagnostic": result, "equipment_history_count": len(history)}

    except json.JSONDecodeError:
        return {"success": True, "diagnostic": {"commentaire_expert": response, "cause_probable": "Analyse en texte libre"}, "equipment_history_count": len(history)}
    except Exception as e:
        logger.error(f"Erreur diagnostic IA OT: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summary")
async def ai_summary(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Génère un résumé intelligent de clôture d'un OT :
    temps, pièces, commentaires, recommandations.
    """
    try:
        work_order_id = data.get("work_order_id")
        if not work_order_id:
            raise HTTPException(status_code=400, detail="work_order_id requis")

        wo = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
        if not wo:
            raise HTTPException(status_code=404, detail="OT introuvable")

        # Récupérer l'équipement
        equipment_name = "N/A"
        eq_id = wo.get("equipement_id") or (wo.get("equipement") or {}).get("id")
        if eq_id:
            eq = await db.equipments.find_one({"id": eq_id}, {"_id": 0, "nom": 1})
            if eq:
                equipment_name = eq.get("nom", "N/A")

        comments_text = "\n".join([f"- [{c.get('userName','?')}] {c.get('text','')}" for c in wo.get("comments", [])])
        parts_text = "\n".join([f"- {p.get('nom', p.get('name','?'))} x{p.get('quantity',1)}" for p in wo.get("parts_used", [])])

        prompt = f"""Genere un resume structure de cloture pour cet ordre de travail.

OT : {wo.get('titre', 'N/A')}
Description : {wo.get('description', 'N/A')}
Equipement : {equipment_name}
Categorie : {wo.get('categorie', 'N/A')}
Priorite : {wo.get('priorite', 'N/A')}
Statut : {wo.get('statut', 'N/A')}
Date creation : {wo.get('dateCreation', 'N/A')}
Date terminee : {wo.get('dateTermine', 'N/A')}
Temps estime : {wo.get('tempsEstime', 'N/A')}h
Temps reel : {wo.get('tempsReel', 'N/A')}h
Assigne a : {wo.get('assigneA', {}).get('prenom', '')} {wo.get('assigneA', {}).get('nom', '')}

COMMENTAIRES ({len(wo.get('comments', []))}) :
{comments_text or 'Aucun commentaire'}

PIECES UTILISEES :
{parts_text or 'Aucune piece'}

Reponds en JSON :
{{
  "resume": "Resume en 2-3 phrases de l'intervention",
  "performance": {{
    "respect_delai": true,
    "ecart_temps": "+15 min",
    "efficacite": "bonne|moyenne|faible"
  }},
  "actions_realisees": ["Action 1", "Action 2"],
  "recommandations": ["Recommandation preventive 1"],
  "maintenance_preventive_suggeree": {{
    "necessaire": true,
    "description": "Description de la maintenance preventive a planifier",
    "periodicite_suggeree": "ex: tous les 3 mois"
  }}
}}"""

        LlmChat, UserMessage, key = await _get_llm()
        chat = LlmChat(api_key=key, session_id=f"ai_wo_summary_{work_order_id}", system_message="Tu es un expert GMAO. Reponds UNIQUEMENT en JSON valide.")
        chat.with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=prompt))
        result = json.loads(clean_json_response(response))

        return {"success": True, "summary": result}

    except json.JSONDecodeError:
        return {"success": True, "summary": {"resume": response}}
    except Exception as e:
        logger.error(f"Erreur resume IA OT: {e}")
        raise HTTPException(status_code=500, detail=str(e))
