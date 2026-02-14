"""
Routes API M.E.S (Manufacturing Execution System)
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user, get_current_admin_user, get_database

router = APIRouter(prefix="/mes", tags=["MES"])

# Service will be initialized from server.py
mes_service = None
audit_service_ref = None

def init_mes_routes(db, mqtt_manager=None):
    global mes_service, audit_service_ref
    from mes_service import MESService
    from audit_service import AuditService
    mes_service = MESService(db, mqtt_manager)
    audit_service_ref = AuditService(db)


# ==================== MACHINES ====================

@router.get("/machines")
async def list_machines(current_user: dict = Depends(get_current_user)):
    return await mes_service.get_machines()

@router.get("/machines/{machine_id}")
async def get_machine(machine_id: str, current_user: dict = Depends(get_current_user)):
    m = await mes_service.get_machine(machine_id)
    if not m:
        raise HTTPException(404, "Machine non trouvée")
    return m

@router.post("/machines")
async def create_machine(data: dict, current_user: dict = Depends(get_current_user)):
    return await mes_service.create_machine(data)

@router.put("/machines/{machine_id}")
async def update_machine(machine_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    m = await mes_service.update_machine(machine_id, data)
    if not m:
        raise HTTPException(404, "Machine non trouvée")
    return m

@router.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str, current_user: dict = Depends(get_current_user)):
    await mes_service.delete_machine(machine_id)
    return {"success": True}


# ==================== METRICS ====================

@router.get("/machines/{machine_id}/metrics")
async def get_metrics(machine_id: str, current_user: dict = Depends(get_current_user)):
    return await mes_service.get_realtime_metrics(machine_id)

@router.get("/machines/{machine_id}/history")
async def get_history(machine_id: str, period: str = "6h",
                      date_from: str = None, date_to: str = None,
                      current_user: dict = Depends(get_current_user)):
    return await mes_service.get_cadence_history(machine_id, period, date_from, date_to)


# ==================== ALERTS ====================

@router.get("/alerts")
async def list_alerts(unread_only: bool = False, limit: int = 50,
                      current_user: dict = Depends(get_current_user)):
    return await mes_service.get_alerts(unread_only, limit)

@router.get("/alerts/count")
async def alert_count(current_user: dict = Depends(get_current_user)):
    count = await mes_service.get_unread_alert_count()
    return {"count": count}

@router.put("/alerts/{alert_id}/read")
async def mark_read(alert_id: str, current_user: dict = Depends(get_current_user)):
    await mes_service.mark_alert_read(alert_id)
    return {"success": True}

@router.put("/alerts/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await mes_service.mark_all_alerts_read()
    return {"success": True}

@router.delete("/alerts/all")
async def delete_all_alerts(current_user: dict = Depends(get_current_user)):
    """Supprimer toutes les alertes M.E.S."""
    await mes_service.delete_all_alerts()
    return {"success": True}


# ==================== TOOLS ====================

@router.post("/machines/{machine_id}/ping")
async def ping_sensor(machine_id: str, current_user: dict = Depends(get_current_user)):
    return await mes_service.ping_sensor(machine_id)

@router.post("/machines/{machine_id}/simulate-pulse")
async def simulate_pulse(machine_id: str, current_user: dict = Depends(get_current_user)):
    """Simuler une impulsion pour tester"""
    await mes_service.record_pulse(machine_id, 1)
    return {"success": True, "message": "Impulsion simulée"}


# ==================== REJECT REASONS (Admin) ====================

@router.get("/reject-reasons")
async def list_reject_reasons(current_user: dict = Depends(get_current_user)):
    return await mes_service.get_reject_reasons()

@router.post("/reject-reasons")
async def create_reject_reason(data: dict, current_user: dict = Depends(get_current_user)):
    if not data.get("label"):
        raise HTTPException(400, "Le libellé est requis")
    return await mes_service.create_reject_reason(data)

@router.put("/reject-reasons/{reason_id}")
async def update_reject_reason(reason_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    result = await mes_service.update_reject_reason(reason_id, data)
    if not result:
        raise HTTPException(404, "Motif non trouvé")
    return result

@router.delete("/reject-reasons/{reason_id}")
async def delete_reject_reason(reason_id: str, current_user: dict = Depends(get_current_user)):
    await mes_service.delete_reject_reason(reason_id)
    return {"success": True}


# ==================== REJECTS (Operator) ====================

@router.post("/machines/{machine_id}/rejects")
async def declare_reject(machine_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not data.get("quantity") or int(data["quantity"]) <= 0:
        raise HTTPException(400, "La quantité doit être supérieure à 0")
    data["operator"] = current_user.get("name", current_user.get("email", ""))
    return await mes_service.declare_reject(machine_id, data)

@router.get("/machines/{machine_id}/rejects")
async def list_rejects(machine_id: str, date_from: str = None, date_to: str = None,
                       current_user: dict = Depends(get_current_user)):
    return await mes_service.get_rejects(machine_id, date_from, date_to)

@router.delete("/rejects/{reject_id}")
async def delete_reject(reject_id: str, current_user: dict = Depends(get_current_user)):
    await mes_service.delete_reject(reject_id)
    return {"success": True}


# ==================== PRODUCT REFERENCES ====================

@router.get("/product-references")
async def list_product_references(current_user: dict = Depends(get_current_user)):
    return await mes_service.get_product_references()

@router.post("/product-references")
async def create_product_reference(data: dict, current_user: dict = Depends(get_current_admin_user)):
    if not data.get("name"):
        raise HTTPException(400, "Le nom de la reference est requis")
    ref = await mes_service.create_product_reference(data)
    from models import ActionType, EntityType
    await audit_service_ref.log_action(
        user_id=str(current_user.get("id", "")),
        user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
        user_email=current_user.get("email", ""),
        action=ActionType.CREATE,
        entity_type=EntityType.MES_PRODUCT_REFERENCE,
        entity_id=ref.get("id"),
        entity_name=ref.get("name"),
        details=f"Creation reference produite: {ref.get('name')}"
    )
    return ref

@router.put("/product-references/{ref_id}")
async def update_product_reference(ref_id: str, data: dict, current_user: dict = Depends(get_current_admin_user)):
    result = await mes_service.update_product_reference(ref_id, data)
    if not result:
        raise HTTPException(404, "Reference non trouvee")
    from models import ActionType, EntityType
    await audit_service_ref.log_action(
        user_id=str(current_user.get("id", "")),
        user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
        user_email=current_user.get("email", ""),
        action=ActionType.UPDATE,
        entity_type=EntityType.MES_PRODUCT_REFERENCE,
        entity_id=ref_id,
        entity_name=result.get("name"),
        details=f"Modification reference produite: {result.get('name')}"
    )
    return result

@router.delete("/product-references/{ref_id}")
async def delete_product_reference(ref_id: str, current_user: dict = Depends(get_current_admin_user)):
    await mes_service.delete_product_reference(ref_id)
    from models import ActionType, EntityType
    await audit_service_ref.log_action(
        user_id=str(current_user.get("id", "")),
        user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
        user_email=current_user.get("email", ""),
        action=ActionType.DELETE,
        entity_type=EntityType.MES_PRODUCT_REFERENCE,
        entity_id=ref_id,
        details=f"Suppression reference produite"
    )
    return {"success": True}

@router.post("/machines/{machine_id}/select-reference")
async def select_reference(machine_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    ref_id = data.get("reference_id")
    if not ref_id:
        raise HTTPException(400, "reference_id requis")
    result = await mes_service.select_reference_for_machine(machine_id, ref_id)
    if not result:
        raise HTTPException(404, "Reference non trouvee")
    from models import ActionType, EntityType
    await audit_service_ref.log_action(
        user_id=str(current_user.get("id", "")),
        user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
        user_email=current_user.get("email", ""),
        action=ActionType.UPDATE,
        entity_type=EntityType.MES_PRODUCT_REFERENCE,
        entity_id=ref_id,
        entity_name=result.get("equipment_name"),
        details=f"Changement reference produite sur machine {result.get('equipment_name')}"
    )
    return result


# ==================== TRS HISTORY ====================

@router.get("/machines/{machine_id}/trs-history")
async def get_trs_history(machine_id: str, days: int = 7,
                          current_user: dict = Depends(get_current_user)):
    return await mes_service.get_trs_daily_history(machine_id, days)
