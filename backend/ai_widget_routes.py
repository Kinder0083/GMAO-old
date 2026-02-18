"""
Routes IA pour la generation de widgets personnalises via Adria.
Permet de creer des widgets sur le Dashboard Service a partir de demandes en langage naturel.
"""
import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/widgets", tags=["AI Widgets"])
db = None


def init_ai_widget_routes(database):
    global db
    db = database


class WidgetGenerateRequest(BaseModel):
    description: str
    sensor_id: Optional[str] = None
    meter_id: Optional[str] = None


async def _get_llm_key():
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        gk = await db.global_settings.find_one({"key": "EMERGENT_LLM_KEY"})
        if gk and gk.get("value"):
            key = gk["value"]
    if not key:
        raise HTTPException(status_code=500, detail="Cle LLM non configuree")
    return key


WIDGET_GENERATION_PROMPT = """Tu es un expert en creation de widgets pour un dashboard de GMAO (Gestion de Maintenance Assistee par Ordinateur).

L'utilisateur te decrit un widget qu'il souhaite creer. Tu dois generer la configuration JSON exacte pour le creer.

=== TYPES DE VISUALISATION ===
- "value" : Valeur simple (grand chiffre, ex: nombre d'OT)
- "gauge" : Jauge avec pourcentage (ex: taux de completion)
- "line_chart" : Graphique en lignes (ex: evolution dans le temps)
- "bar_chart" : Graphique en barres (ex: repartition par categorie)
- "pie_chart" : Camembert (ex: repartition par statut)
- "donut" : Donut (comme pie_chart mais avec trou central)
- "table" : Tableau de donnees

=== SOURCES DE DONNEES GMAO DISPONIBLES ===
Chaque source a un "data_type" parmi:

Interventions (OT):
- work_orders_count → nombre total (number)
- work_orders_by_status → repartition par statut (dict) → ideal pour pie/bar
- work_orders_by_priority → repartition par priorite (dict) → ideal pour pie/bar
- work_orders_completion_rate → taux completion % (number) → ideal pour gauge/value
- work_orders_avg_duration → duree moyenne en heures (number)

Equipements:
- assets_count → nombre total (number)
- assets_by_status → par statut (dict) → ideal pour pie/bar
- assets_by_type → par type (dict)
- assets_availability_rate → taux disponibilite % (number) → ideal pour gauge

Maintenance preventive:
- preventive_completion_rate → taux realisation % (number) → ideal pour gauge
- preventive_overdue_count → nombre en retard (number)
- preventive_upcoming_count → a venir 7j (number)

Demandes:
- intervention_requests_count → nombre DI (number)
- improvement_requests_count → nombre DA (number)
- purchase_requests_count → nombre demandes achat (number)

QHSE:
- near_miss_count → nombre presqu'accidents (number)
- near_miss_by_severity → par severite (dict)

Capteurs MQTT (necessite sensor_id):
- sensor_value → derniere valeur capteur (number)
- sensor_history → historique capteur (list) → ideal pour line_chart

Compteurs (necessite meter_id):
- meter_value → dernier releve (number)
- meter_history → historique compteur (list) → ideal pour line_chart

Inventaire:
- inventory_count → articles en stock (number)
- inventory_low_stock → articles en rupture (number)
- inventory_value → valeur stock en euros (number)

Surveillance:
- surveillance_compliance_rate → taux conformite % (number) → ideal pour gauge
- surveillance_overdue → controles en retard (number)

=== FORMULES MATHEMATIQUES ===
Tu peux creer des sources de type "formula" qui referencent d'autres sources par leur nom avec le prefixe $.
Syntaxe: $nom_source pour referencer une valeur.
Operateurs: +, -, *, /, %, ^ (puissance)
Fonctions: SUM(), AVG(), MIN(), MAX(), COUNT(), ABS(), ROUND(), IF(cond, then, else)

Exemple formule: "$ot_termines / $ot_total * 100"

=== FILTRES TEMPORELS ===
- date_from: "-7d" (7 derniers jours), "-1m" (dernier mois), "-3m", "-1y" (derniere annee)
- date_to: "now" (maintenant)
- service_filter: nom du service (optionnel)
- status_filter: liste de statuts (optionnel, ex: ["OUVERT", "EN_COURS"])

=== PALETTES DE COULEURS ===
blue, green, red, purple, orange, cyan, pink, yellow, indigo, teal

=== FORMAT DE REPONSE ===
Reponds UNIQUEMENT avec un JSON valide (sans backticks, sans texte avant/apres):

{
  "name": "Nom court du widget",
  "description": "Description du widget",
  "data_sources": [
    {
      "id": "source-1",
      "name": "nom_reference",
      "type": "gmao",
      "gmao_config": {
        "data_type": "work_orders_count",
        "date_from": "-1m",
        "date_to": "now",
        "service_filter": null,
        "status_filter": null,
        "group_by": null,
        "sensor_id": null
      }
    }
  ],
  "primary_source_id": "source-1",
  "visualization": {
    "title": "Titre affiche",
    "subtitle": "Sous-titre optionnel",
    "type": "value",
    "unit": "",
    "prefix": "",
    "suffix": "",
    "decimal_places": 0,
    "min_value": 0,
    "max_value": 100,
    "show_legend": true,
    "color_scheme": "blue",
    "icon": "Wrench",
    "size": "medium"
  },
  "refresh_interval": 5,
  "is_shared": true
}

Pour une formule, ajoute une source supplementaire:
{
  "id": "source-formula",
  "name": "resultat_calcul",
  "type": "formula",
  "formula": "$source_a / $source_b * 100"
}

IMPORTANT:
- Chaque source dans data_sources doit avoir un "id" unique (utilise "source-1", "source-2", etc.)
- primary_source_id doit correspondre a l'id de la source principale affichee
- Pour les formules, primary_source_id doit pointer vers la source formule
- Choisis le type de visualisation le plus adapte a la donnee
- Pour les pourcentages, utilise "gauge" avec unit="%"
- Pour les repartitions (dict), utilise "pie_chart" ou "bar_chart"
- Pour les historiques (list), utilise "line_chart"
- Icones disponibles: Wrench, Package, Calendar, Activity, Euro, Users, AlertCircle, CheckCircle, Gauge, TrendingUp, BarChart2, PieChart, Clock, ShoppingCart, MessageSquare
"""


def clean_json_response(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        t = "\n".join(lines[1:]) if len(lines) > 1 else t[3:]
    if t.endswith("```"):
        t = t[:-3]
    return t.strip()


@router.post("/generate")
async def generate_widget(
    request: WidgetGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Genere et cree un widget a partir d'une description en langage naturel."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = await _get_llm_key()

        user_prompt = request.description
        if request.sensor_id:
            user_prompt += f"\n[Info: sensor_id disponible = {request.sensor_id}]"
        if request.meter_id:
            user_prompt += f"\n[Info: meter_id disponible = {request.meter_id}]"

        chat = LlmChat(
            api_key=api_key,
            session_id=f"widget_gen_{uuid.uuid4().hex[:6]}",
            system_message=WIDGET_GENERATION_PROMPT
        )
        chat.with_model("google", "gemini-2.0-flash")

        response = await chat.send_message_async(UserMessage(message=user_prompt))
        raw = clean_json_response(response.message)

        try:
            widget_config = json.loads(raw)
        except json.JSONDecodeError:
            logger.error(f"JSON invalide de l'IA: {raw[:500]}")
            raise HTTPException(status_code=422, detail="L'IA n'a pas genere un JSON valide. Reformulez votre demande.")

        # Generer les IDs manquants
        for i, ds in enumerate(widget_config.get("data_sources", [])):
            if not ds.get("id"):
                ds["id"] = f"source-{i+1}"

        if not widget_config.get("primary_source_id"):
            sources = widget_config.get("data_sources", [])
            if sources:
                widget_config["primary_source_id"] = sources[-1]["id"]

        user_id = current_user.get("id")
        user_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()

        widget = {
            "id": str(uuid.uuid4()),
            "name": widget_config.get("name", "Widget IA"),
            "description": widget_config.get("description", ""),
            "data_sources": widget_config.get("data_sources", []),
            "primary_source_id": widget_config.get("primary_source_id"),
            "visualization": widget_config.get("visualization", {}),
            "refresh_interval": widget_config.get("refresh_interval", 5),
            "is_shared": widget_config.get("is_shared", True),
            "shared_with_roles": widget_config.get("shared_with_roles", []),
            "service": current_user.get("service"),
            "created_by": user_id,
            "created_by_name": user_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "position": 0,
            "is_active": True
        }

        await db.custom_widgets.insert_one(widget)
        widget.pop("_id", None)

        # Rafraichir les donnees en arriere-plan
        from custom_widgets_routes import refresh_widget_data
        background_tasks.add_task(refresh_widget_data, widget["id"])

        logger.info(f"Widget IA cree: {widget['name']} par {user_name}")

        return {
            "success": True,
            "widget": widget,
            "message": f"Widget '{widget['name']}' cree avec succes"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur generation widget IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))
