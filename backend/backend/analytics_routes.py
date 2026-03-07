"""
Routes API pour les analytics des checklists
Dashboard d'analyse des résultats des contrôles préventifs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional, List
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/checklists", tags=["Analytics Checklists"])

# Variable globale pour la base de données (injectée depuis server.py)
db = None

def set_database(database):
    """Injecte la connexion à la base de données"""
    global db
    db = database


# ========================
# Modèles de réponse
# ========================

class SummaryStats(BaseModel):
    """Statistiques globales"""
    total_executions: int
    total_items_checked: int
    conformity_rate: float
    non_conformity_count: int
    average_execution_time_minutes: float
    period_start: str
    period_end: str


class TrendPoint(BaseModel):
    """Point de données pour les tendances"""
    period: str  # Format: "2026-01" ou "2026-W05"
    total_executions: int
    conformity_rate: float
    non_conformity_count: int


class NonConformityItem(BaseModel):
    """Item non-conforme avec statistiques"""
    item_name: str
    checklist_name: str
    occurrence_count: int
    percentage: float


class EquipmentStats(BaseModel):
    """Statistiques par équipement"""
    equipment_id: str
    equipment_name: str
    total_executions: int
    conformity_rate: float
    non_conformity_count: int


class TechnicianStats(BaseModel):
    """Statistiques par technicien"""
    technician_id: str
    technician_name: str
    total_executions: int
    conformity_rate: float
    average_time_minutes: float


# ========================
# Helper pour les permissions
# ========================

async def get_current_user_from_db(token: str):
    """Récupère l'utilisateur depuis le token"""
    # Import ici pour éviter les imports circulaires
    from server import get_current_user
    return await get_current_user(token)


# ========================
# Routes API
# ========================

@router.get("/stats/summary")
async def get_summary_stats(
    start_date: Optional[str] = Query(None, description="Date début (ISO format)"),
    end_date: Optional[str] = Query(None, description="Date fin (ISO format)"),
    equipment_id: Optional[str] = Query(None, description="Filtrer par équipement")
):
    """
    Récupère les statistiques globales des checklists
    """
    try:
        # Définir la période par défaut (30 derniers jours)
        if not end_date:
            end_dt = datetime.now(timezone.utc)
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if not start_date:
            start_dt = end_dt - timedelta(days=30)
        else:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Construire la requête
        query = {
            "status": "completed",
            "completed_at": {
                "$gte": start_dt.isoformat(),
                "$lte": end_dt.isoformat()
            }
        }
        
        if equipment_id:
            query["equipment_id"] = equipment_id
        
        # Récupérer les exécutions
        executions = await db.checklist_executions.find(query).to_list(10000)
        
        total_executions = len(executions)
        total_items = 0
        total_conforming = 0
        total_non_conforming = 0
        total_time_minutes = 0
        executions_with_time = 0
        
        for exec in executions:
            responses = exec.get("responses", [])
            for response in responses:
                total_items += 1
                is_conforming = response.get("is_conforming", True)
                if is_conforming:
                    total_conforming += 1
                else:
                    total_non_conforming += 1
            
            # Calculer le temps d'exécution
            started = exec.get("started_at")
            completed = exec.get("completed_at")
            if started and completed:
                try:
                    start_time = datetime.fromisoformat(started.replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(completed.replace('Z', '+00:00'))
                    duration = (end_time - start_time).total_seconds() / 60
                    if duration > 0 and duration < 480:  # Max 8h raisonnable
                        total_time_minutes += duration
                        executions_with_time += 1
                except:
                    pass
        
        conformity_rate = (total_conforming / total_items * 100) if total_items > 0 else 100.0
        avg_time = (total_time_minutes / executions_with_time) if executions_with_time > 0 else 0
        
        return {
            "total_executions": total_executions,
            "total_items_checked": total_items,
            "conformity_rate": round(conformity_rate, 1),
            "non_conformity_count": total_non_conforming,
            "average_execution_time_minutes": round(avg_time, 1),
            "period_start": start_dt.isoformat(),
            "period_end": end_dt.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erreur stats summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/trends")
async def get_trends(
    period_type: str = Query("weekly", enum=["weekly", "monthly"]),
    periods_count: int = Query(12, ge=4, le=52),
    equipment_id: Optional[str] = Query(None)
):
    """
    Récupère l'évolution du taux de conformité par période
    """
    try:
        now = datetime.now(timezone.utc)
        trends = []
        
        for i in range(periods_count - 1, -1, -1):
            if period_type == "weekly":
                period_end = now - timedelta(weeks=i)
                period_start = period_end - timedelta(weeks=1)
                period_label = period_start.strftime("%d/%m")
            else:  # monthly
                # Calculer le mois
                month_offset = i
                year = now.year
                month = now.month - month_offset
                while month <= 0:
                    month += 12
                    year -= 1
                period_start = datetime(year, month, 1, tzinfo=timezone.utc)
                if month == 12:
                    period_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
                else:
                    period_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
                period_label = period_start.strftime("%b %Y")
            
            # Requête pour cette période
            query = {
                "status": "completed",
                "completed_at": {
                    "$gte": period_start.isoformat(),
                    "$lt": period_end.isoformat()
                }
            }
            
            if equipment_id:
                query["equipment_id"] = equipment_id
            
            executions = await db.checklist_executions.find(query).to_list(10000)
            
            total_items = 0
            conforming_items = 0
            non_conforming = 0
            
            for exec in executions:
                for response in exec.get("responses", []):
                    total_items += 1
                    if response.get("is_conforming", True):
                        conforming_items += 1
                    else:
                        non_conforming += 1
            
            conformity_rate = (conforming_items / total_items * 100) if total_items > 0 else 100.0
            
            trends.append({
                "period": period_label,
                "total_executions": len(executions),
                "conformity_rate": round(conformity_rate, 1),
                "non_conformity_count": non_conforming
            })
        
        return trends
        
    except Exception as e:
        logger.error(f"Erreur trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/non-conformities")
async def get_top_non_conformities(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(10, ge=5, le=50)
):
    """
    Récupère le top des items non-conformes
    """
    try:
        # Période par défaut: 90 jours
        if not end_date:
            end_dt = datetime.now(timezone.utc)
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if not start_date:
            start_dt = end_dt - timedelta(days=90)
        else:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        query = {
            "status": "completed",
            "completed_at": {
                "$gte": start_dt.isoformat(),
                "$lte": end_dt.isoformat()
            }
        }
        
        executions = await db.checklist_executions.find(query).to_list(10000)
        
        # Compter les non-conformités par item
        non_conformities = {}
        total_non_conf = 0
        
        for exec in executions:
            checklist_name = exec.get("checklist_name", "Checklist inconnue")
            for response in exec.get("responses", []):
                if not response.get("is_conforming", True):
                    item_name = response.get("item_name", "Item inconnu")
                    key = f"{checklist_name}|{item_name}"
                    if key not in non_conformities:
                        non_conformities[key] = {
                            "item_name": item_name,
                            "checklist_name": checklist_name,
                            "count": 0
                        }
                    non_conformities[key]["count"] += 1
                    total_non_conf += 1
        
        # Trier par occurrence décroissante
        sorted_items = sorted(non_conformities.values(), key=lambda x: x["count"], reverse=True)[:limit]
        
        # Ajouter le pourcentage
        result = []
        for item in sorted_items:
            result.append({
                "item_name": item["item_name"],
                "checklist_name": item["checklist_name"],
                "occurrence_count": item["count"],
                "percentage": round((item["count"] / total_non_conf * 100) if total_non_conf > 0 else 0, 1)
            })
        
        return {
            "total_non_conformities": total_non_conf,
            "items": result
        }
        
    except Exception as e:
        logger.error(f"Erreur non-conformities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/by-equipment")
async def get_stats_by_equipment(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(10, ge=5, le=50)
):
    """
    Statistiques par équipement
    """
    try:
        # Période par défaut: 90 jours
        if not end_date:
            end_dt = datetime.now(timezone.utc)
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if not start_date:
            start_dt = end_dt - timedelta(days=90)
        else:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        query = {
            "status": "completed",
            "completed_at": {
                "$gte": start_dt.isoformat(),
                "$lte": end_dt.isoformat()
            }
        }
        
        executions = await db.checklist_executions.find(query).to_list(10000)
        
        # Grouper par équipement
        equipment_stats = {}
        
        for exec in executions:
            eq_id = exec.get("equipment_id", "unknown")
            eq_name = exec.get("equipment_name", "Équipement inconnu")
            
            if eq_id not in equipment_stats:
                equipment_stats[eq_id] = {
                    "equipment_id": eq_id,
                    "equipment_name": eq_name,
                    "total_executions": 0,
                    "total_items": 0,
                    "conforming_items": 0,
                    "non_conforming": 0
                }
            
            equipment_stats[eq_id]["total_executions"] += 1
            
            for response in exec.get("responses", []):
                equipment_stats[eq_id]["total_items"] += 1
                if response.get("is_conforming", True):
                    equipment_stats[eq_id]["conforming_items"] += 1
                else:
                    equipment_stats[eq_id]["non_conforming"] += 1
        
        # Calculer les taux et trier
        result = []
        for eq in equipment_stats.values():
            if eq["total_items"] > 0:
                conformity_rate = (eq["conforming_items"] / eq["total_items"]) * 100
            else:
                conformity_rate = 100.0
            
            result.append({
                "equipment_id": eq["equipment_id"],
                "equipment_name": eq["equipment_name"],
                "total_executions": eq["total_executions"],
                "conformity_rate": round(conformity_rate, 1),
                "non_conformity_count": eq["non_conforming"]
            })
        
        # Trier par nombre d'exécutions décroissant
        result.sort(key=lambda x: x["total_executions"], reverse=True)
        
        return result[:limit]
        
    except Exception as e:
        logger.error(f"Erreur stats by equipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/by-technician")
async def get_stats_by_technician(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(10, ge=5, le=50)
):
    """
    Statistiques par technicien
    """
    try:
        # Période par défaut: 90 jours
        if not end_date:
            end_dt = datetime.now(timezone.utc)
        else:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if not start_date:
            start_dt = end_dt - timedelta(days=90)
        else:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        query = {
            "status": "completed",
            "completed_at": {
                "$gte": start_dt.isoformat(),
                "$lte": end_dt.isoformat()
            }
        }
        
        executions = await db.checklist_executions.find(query).to_list(10000)
        
        # Grouper par technicien
        tech_stats = {}
        
        for exec in executions:
            tech_id = exec.get("executed_by", "unknown")
            tech_name = exec.get("executed_by_name", "Technicien inconnu")
            
            if tech_id not in tech_stats:
                tech_stats[tech_id] = {
                    "technician_id": tech_id,
                    "technician_name": tech_name,
                    "total_executions": 0,
                    "total_items": 0,
                    "conforming_items": 0,
                    "total_time_minutes": 0,
                    "executions_with_time": 0
                }
            
            tech_stats[tech_id]["total_executions"] += 1
            
            for response in exec.get("responses", []):
                tech_stats[tech_id]["total_items"] += 1
                if response.get("is_conforming", True):
                    tech_stats[tech_id]["conforming_items"] += 1
            
            # Temps d'exécution
            started = exec.get("started_at")
            completed = exec.get("completed_at")
            if started and completed:
                try:
                    start_time = datetime.fromisoformat(started.replace('Z', '+00:00'))
                    end_time = datetime.fromisoformat(completed.replace('Z', '+00:00'))
                    duration = (end_time - start_time).total_seconds() / 60
                    if duration > 0 and duration < 480:
                        tech_stats[tech_id]["total_time_minutes"] += duration
                        tech_stats[tech_id]["executions_with_time"] += 1
                except:
                    pass
        
        # Calculer les moyennes et trier
        result = []
        for tech in tech_stats.values():
            if tech["total_items"] > 0:
                conformity_rate = (tech["conforming_items"] / tech["total_items"]) * 100
            else:
                conformity_rate = 100.0
            
            if tech["executions_with_time"] > 0:
                avg_time = tech["total_time_minutes"] / tech["executions_with_time"]
            else:
                avg_time = 0
            
            result.append({
                "technician_id": tech["technician_id"],
                "technician_name": tech["technician_name"],
                "total_executions": tech["total_executions"],
                "conformity_rate": round(conformity_rate, 1),
                "average_time_minutes": round(avg_time, 1)
            })
        
        # Trier par nombre d'exécutions décroissant
        result.sort(key=lambda x: x["total_executions"], reverse=True)
        
        return result[:limit]
        
    except Exception as e:
        logger.error(f"Erreur stats by technician: {e}")
        raise HTTPException(status_code=500, detail=str(e))
