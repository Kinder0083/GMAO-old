"""
Routes API M.E.S (Manufacturing Execution System)
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user

router = APIRouter(prefix="/mes", tags=["MES"])

# Service will be initialized from server.py
mes_service = None

def init_mes_routes(db, mqtt_manager=None):
    global mes_service
    from mes_service import MESService
    mes_service = MESService(db, mqtt_manager)


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


# ==================== TOOLS ====================

@router.post("/machines/{machine_id}/ping")
async def ping_sensor(machine_id: str, current_user: dict = Depends(get_current_user)):
    return await mes_service.ping_sensor(machine_id)

@router.post("/machines/{machine_id}/simulate-pulse")
async def simulate_pulse(machine_id: str, current_user: dict = Depends(get_current_user)):
    """Simuler une impulsion pour tester"""
    await mes_service.record_pulse(machine_id, 1)
    return {"success": True, "message": "Impulsion simulée"}
