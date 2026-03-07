"""
Route IA pour l'analyse prédictive des capteurs.
Détecte des anomalies et patterns de dégradation dans les données IoT.
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from datetime import datetime, timezone, timedelta
import logging
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-sensors", tags=["IA Capteurs"])

db = None


def init_ai_sensor_routes(database):
    global db
    db = database


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


@router.post("/analyze")
async def analyze_sensor(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyse les données d'un capteur pour détecter des anomalies
    et prédire des tendances de dégradation.
    """
    try:
        sensor_id = data.get("sensor_id")
        if not sensor_id:
            raise HTTPException(status_code=400, detail="sensor_id requis")

        # Récupérer le capteur
        sensor = await db.sensors.find_one({"id": sensor_id}, {"_id": 0})
        if not sensor:
            raise HTTPException(status_code=404, detail="Capteur introuvable")

        # Récupérer les lectures récentes (dernières 48h)
        now = datetime.now(timezone.utc)
        since = now - timedelta(hours=48)
        readings = await db.sensor_readings.find(
            {"sensor_id": sensor_id, "timestamp": {"$gte": since}},
            {"_id": 0, "value": 1, "timestamp": 1}
        ).sort("timestamp", -1).to_list(length=500)

        # Aussi chercher les alertes récentes de ce capteur
        recent_alerts = await db.alerts.find(
            {"sensor_id": sensor_id},
            {"_id": 0, "title": 1, "message": 1, "severity": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(length=10)

        # Statistiques des lectures
        values = [r.get("value", 0) for r in readings if r.get("value") is not None]
        stats = {}
        if values:
            stats = {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "last": values[0] if values else None,
                "first": values[-1] if values else None,
            }
            # Tendance (est-ce que la valeur augmente ou diminue ?)
            if len(values) >= 10:
                first_half = sum(values[len(values)//2:]) / (len(values) // 2)
                second_half = sum(values[:len(values)//2]) / (len(values) // 2)
                stats["trend_direction"] = "hausse" if second_half > first_half * 1.02 else "baisse" if second_half < first_half * 0.98 else "stable"

        # Échantillon de valeurs pour le LLM (30 points répartis)
        sample_values = []
        if readings:
            step = max(1, len(readings) // 30)
            for i in range(0, len(readings), step):
                r = readings[i]
                ts = r.get("timestamp")
                ts_str = ts.strftime("%d/%m %H:%M") if hasattr(ts, "strftime") else str(ts)[:16]
                sample_values.append(f"{ts_str}: {r.get('value', '?')}{sensor.get('unit', '')}")

        alerts_text = "\n".join([f"  - [{a.get('severity','')}] {a.get('title','')} - {a.get('message','')}" for a in recent_alerts[:5]])

        prompt = f"""Tu es un expert en maintenance predictive IoT. Analyse les donnees de ce capteur.

CAPTEUR :
  Nom : {sensor.get('name', 'N/A')}
  Type : {sensor.get('type', 'N/A')}
  Unite : {sensor.get('unit', 'N/A')}
  Seuils : min={sensor.get('min_threshold', 'N/A')}, max={sensor.get('max_threshold', 'N/A')}
  Statut actuel : {sensor.get('status', 'N/A')}
  Derniere valeur : {sensor.get('last_value', 'N/A')}{sensor.get('unit', '')}
  Alerte activee : {'Oui' if sensor.get('alert_enabled') else 'Non'}

STATISTIQUES 48H : {json.dumps(stats, default=str) if stats else 'Aucune donnee'}

ECHANTILLON DE VALEURS (chronologique) :
{chr(10).join(sample_values) if sample_values else 'Aucune lecture disponible'}

ALERTES RECENTES :
{alerts_text or 'Aucune alerte'}

Analyse et reponds en JSON :
{{
  "etat_general": "normal|attention|critique",
  "anomalies_detectees": [
    {{
      "type": "pic|derive|oscillation|valeur_hors_seuil",
      "description": "Description de l'anomalie",
      "severite": "basse|moyenne|haute"
    }}
  ],
  "prediction": {{
    "tendance": "stable|degradation|amelioration",
    "risque_panne": "faible|moyen|eleve",
    "estimation_delai": "ex: 5-10 jours si degradation, ou N/A",
    "explication": "Explication de la prediction"
  }},
  "recommandations": [
    {{
      "action": "Description de l'action",
      "urgence": "immediate|court_terme|preventif",
      "justification": "Pourquoi cette action"
    }}
  ],
  "seuils_suggeres": {{
    "min": null,
    "max": null,
    "commentaire": "Suggestion d'ajustement des seuils si necessaire"
  }}
}}"""

        LlmChat, UserMessage, key = await _get_llm()
        chat = LlmChat(api_key=key, session_id=f"ai_sensor_{sensor_id}", system_message="Tu es un expert maintenance predictive IoT. Reponds UNIQUEMENT en JSON valide.")
        chat.with_model("gemini", "gemini-2.5-flash")
        response = await chat.send_message(UserMessage(text=prompt))
        result = json.loads(clean_json_response(response))

        return {
            "success": True,
            "analysis": result,
            "sensor_name": sensor.get("name"),
            "readings_count": len(readings),
            "stats": stats
        }

    except json.JSONDecodeError:
        return {"success": True, "analysis": {"etat_general": "inconnu", "commentaire": response}, "sensor_name": sensor.get("name", "?"), "readings_count": len(readings)}
    except Exception as e:
        logger.error(f"Erreur analyse IA capteur: {e}")
        raise HTTPException(status_code=500, detail=str(e))
