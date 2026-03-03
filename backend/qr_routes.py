"""
Routes pour la gestion des QR codes équipements
- Génération de QR codes (auth)
- Page publique d'actions rapides (sans auth)
- Configuration des actions (admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from dependencies import get_current_user, get_current_admin_user
from datetime import datetime, timezone
import io
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/qr", tags=["qr-codes"])

from server import db

ACTIONS_COLLECTION = "qr_actions_config"

# Actions par défaut
DEFAULT_ACTIONS = [
    {"id": "last-wo", "label": "Dernier ordre de travail", "icon": "ClipboardList", "type": "link", "enabled": True, "order": 1, "requires_auth": False},
    {"id": "wo-history", "label": "Historique des OT", "icon": "History", "type": "link", "enabled": True, "order": 2, "requires_auth": False},
    {"id": "kpi", "label": "KPI de l'équipement", "icon": "BarChart3", "type": "link", "enabled": True, "order": 3, "requires_auth": False},
    {"id": "create-intervention", "label": "Créer une demande d'intervention", "icon": "PlusCircle", "type": "action", "enabled": True, "order": 4, "requires_auth": True},
    {"id": "report-breakdown", "label": "Signaler une panne", "icon": "AlertTriangle", "type": "action", "enabled": True, "order": 5, "requires_auth": True},
    {"id": "preventive-plan", "label": "Plan de maintenance préventive", "icon": "Calendar", "type": "link", "enabled": True, "order": 6, "requires_auth": False},
]


async def ensure_default_actions():
    """S'assurer que les actions par défaut existent."""
    count = await db[ACTIONS_COLLECTION].count_documents({})
    if count == 0:
        await db[ACTIONS_COLLECTION].insert_one({
            "config_id": "default",
            "actions": DEFAULT_ACTIONS,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })


# ========== ROUTES PUBLIQUES (SANS AUTH) ==========

@router.get("/public/equipment/{eq_id}")
async def get_equipment_public(eq_id: str):
    """Récupérer les infos publiques d'un équipement (sans auth)."""
    from bson import ObjectId
    try:
        eq = await db.equipments.find_one({"_id": ObjectId(eq_id)}, {"_id": 0})
    except Exception:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    if not eq:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    # Récupérer l'emplacement
    location_name = None
    if eq.get("emplacement_id"):
        try:
            loc = await db.locations.find_one({"_id": ObjectId(eq["emplacement_id"])})
            if loc:
                location_name = loc.get("nom")
        except Exception:
            pass

    # Retourner les infos publiques
    return {
        "id": eq_id,
        "nom": eq.get("nom", ""),
        "type": eq.get("type", ""),
        "marque": eq.get("marque", ""),
        "modele": eq.get("modele", ""),
        "numero_serie": eq.get("numero_serie", ""),
        "statut": eq.get("statut", ""),
        "emplacement": location_name,
        "photo": eq.get("photo"),
        "service": eq.get("service", ""),
    }


@router.get("/public/equipment/{eq_id}/last-wo")
async def get_last_work_order_public(eq_id: str):
    """Récupérer le dernier OT d'un équipement (sans auth)."""
    from bson import ObjectId
    wo = await db.work_orders.find(
        {"equipement_id": eq_id},
        {"_id": 0, "id": 1, "numero": 1, "titre": 1, "statut": 1, "priorite": 1, "date_creation": 1, "assignee_name": 1}
    ).sort("date_creation", -1).limit(1).to_list(1)

    return wo[0] if wo else None


@router.get("/public/equipment/{eq_id}/wo-history")
async def get_wo_history_public(eq_id: str):
    """Récupérer l'historique des OT d'un équipement (sans auth, limité)."""
    wos = await db.work_orders.find(
        {"equipement_id": eq_id},
        {"_id": 0, "id": 1, "numero": 1, "titre": 1, "statut": 1, "priorite": 1, "date_creation": 1, "assignee_name": 1}
    ).sort("date_creation", -1).limit(20).to_list(20)

    return wos


@router.get("/public/equipment/{eq_id}/kpi")
async def get_equipment_kpi_public(eq_id: str):
    """Récupérer les KPI d'un équipement (sans auth)."""
    # Total OTs
    total_wos = await db.work_orders.count_documents({"equipement_id": eq_id})
    open_wos = await db.work_orders.count_documents({"equipement_id": eq_id, "statut": {"$nin": ["TERMINE", "ANNULE"]}})
    closed_wos = await db.work_orders.count_documents({"equipement_id": eq_id, "statut": "TERMINE"})

    # Temps moyen de résolution (OT terminés)
    pipeline = [
        {"$match": {"equipement_id": eq_id, "statut": "TERMINE", "temps_reel": {"$gt": 0}}},
        {"$group": {"_id": None, "avg_time": {"$avg": "$temps_reel"}}}
    ]
    avg_result = await db.work_orders.aggregate(pipeline).to_list(1)
    avg_resolution_time = round(avg_result[0]["avg_time"], 1) if avg_result else 0

    # Maintenances préventives
    total_preventive = await db.preventive_checklists.count_documents({"equipement_id": eq_id})

    return {
        "total_work_orders": total_wos,
        "open_work_orders": open_wos,
        "closed_work_orders": closed_wos,
        "avg_resolution_time_hours": avg_resolution_time,
        "total_preventive_plans": total_preventive,
    }


@router.get("/public/equipment/{eq_id}/preventive")
async def get_preventive_plan_public(eq_id: str):
    """Récupérer le plan de maintenance préventive (sans auth)."""
    checklists = await db.preventive_checklists.find(
        {"equipement_id": eq_id},
        {"_id": 0, "id": 1, "titre": 1, "frequence": 1, "derniere_execution": 1, "prochaine_execution": 1, "statut": 1}
    ).to_list(20)
    return checklists


@router.get("/public/actions")
async def get_qr_actions_public():
    """Récupérer la liste des actions configurées (sans auth)."""
    await ensure_default_actions()
    config = await db[ACTIONS_COLLECTION].find_one({"config_id": "default"}, {"_id": 0})
    actions = config.get("actions", []) if config else DEFAULT_ACTIONS
    return [a for a in actions if a.get("enabled", True)]


# ========== ROUTES AUTHENTIFIÉES ==========

@router.get("/equipment/{eq_id}/image")
async def generate_qr_image(eq_id: str, current_user: dict = Depends(get_current_user)):
    """Générer le QR code d'un équipement (PNG)."""
    try:
        import qrcode
    except ImportError:
        raise HTTPException(status_code=500, detail="Module qrcode non installé. Exécutez: pip install qrcode[pil]")
    from bson import ObjectId
    eq = await db.equipments.find_one({"_id": ObjectId(eq_id)})
    if not eq:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    qr_url = f"{frontend_url}/qr/{eq_id}"

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png", headers={
        "Content-Disposition": f"inline; filename=qr_{eq.get('nom', eq_id)}.png"
    })


@router.get("/equipment/{eq_id}/label")
async def generate_qr_label(eq_id: str, current_user: dict = Depends(get_current_user)):
    """Générer une étiquette QR (PNG avec nom de l'équipement)."""
    try:
        import qrcode
    except ImportError:
        raise HTTPException(status_code=500, detail="Module qrcode non installé. Exécutez: pip install qrcode[pil]")
    from bson import ObjectId
    from PIL import Image, ImageDraw, ImageFont

    eq = await db.equipments.find_one({"_id": ObjectId(eq_id)})
    if not eq:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")

    equipment_name = eq.get("nom", "Équipement")
    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    qr_url = f"{frontend_url}/qr/{eq_id}"

    # Générer le QR code
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=3)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    qr_width, qr_height = qr_img.size

    # Créer l'étiquette avec le nom en dessous
    label_padding = 20
    text_height = 40
    label_width = max(qr_width + label_padding * 2, 300)
    label_height = qr_height + label_padding * 2 + text_height

    label = Image.new("RGB", (label_width, label_height), "white")
    draw = ImageDraw.Draw(label)

    # Centrer le QR code
    qr_x = (label_width - qr_width) // 2
    label.paste(qr_img, (qr_x, label_padding))

    # Ajouter le texte
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except Exception:
        font = ImageFont.load_default()

    text_bbox = draw.textbbox((0, 0), equipment_name, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (label_width - text_width) // 2
    text_y = qr_height + label_padding + 8
    draw.text((text_x, text_y), equipment_name, fill="black", font=font)

    # Ajouter un cadre
    draw.rectangle([(0, 0), (label_width - 1, label_height - 1)], outline="#cccccc", width=2)

    buf = io.BytesIO()
    label.save(buf, format="PNG")
    buf.seek(0)

    safe_name = equipment_name.replace(" ", "_").replace("/", "-")
    return StreamingResponse(buf, media_type="image/png", headers={
        "Content-Disposition": f"attachment; filename=etiquette_qr_{safe_name}.png"
    })


# ========== ADMIN : GESTION DES ACTIONS ==========

@router.get("/actions")
async def get_qr_actions(current_user: dict = Depends(get_current_user)):
    """Récupérer la configuration des actions QR (auth)."""
    await ensure_default_actions()
    config = await db[ACTIONS_COLLECTION].find_one({"config_id": "default"}, {"_id": 0})
    return config.get("actions", []) if config else DEFAULT_ACTIONS


@router.put("/actions")
async def update_qr_actions(data: dict, current_user: dict = Depends(get_current_admin_user)):
    """Mettre à jour la configuration des actions QR (admin uniquement)."""
    actions = data.get("actions", [])
    if not actions:
        raise HTTPException(status_code=400, detail="Au moins une action est requise")

    await db[ACTIONS_COLLECTION].update_one(
        {"config_id": "default"},
        {"$set": {
            "actions": actions,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("id", "")
        }},
        upsert=True
    )
    return {"message": "Actions mises à jour", "actions": actions}
