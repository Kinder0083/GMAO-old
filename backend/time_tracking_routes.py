"""
Routes API pour le pointage (Time Tracking)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import logging
import io
import csv

from models import (
    TimeEntry, TimeEntryCreate, TimeEntryManual, TimeEntryStatus, TimeEntrySource,
    Absence, AbsenceCreate, AbsenceType, MemberType, MessageResponse
)
from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/time-tracking", tags=["Time Tracking"])

# Variable globale pour la base de données
db = None

def set_database(database):
    """Initialise la connexion à la base de données"""
    global db
    db = database


def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    if "_id" in doc:
        del doc["_id"]
    return doc


# Import des fonctions utilitaires du module team
from team_management_routes import (
    get_user_service, check_team_access, calculate_worked_hours, 
    get_work_rhythm_config, DEFAULT_WORK_RHYTHMS
)


async def get_member_info(member_id: str, member_type: str = None) -> dict:
    """Récupère les informations d'un membre (user ou temporaire)
    
    Si member_type n'est pas spécifié, cherche d'abord dans users puis dans team_members
    """
    # Si type explicitement spécifié comme temporary, chercher uniquement dans team_members
    if member_type == "temporary":
        member = await db.team_members.find_one({"id": member_id})
        if member:
            return {
                "member_id": member_id,
                "member_type": "temporary",
                "member_name": f"{member.get('prenom', '')} {member.get('nom', '')}".strip(),
                "service": member.get("service", ""),
                "work_rhythm": member.get("work_rhythm", "journee"),
                "work_rhythm_config": member.get("work_rhythm_config", get_work_rhythm_config("journee"))
            }
        return None
    
    # Chercher dans users d'abord
    user = await db.users.find_one({"id": member_id})
    if not user:
        try:
            user = await db.users.find_one({"_id": ObjectId(member_id)})
        except:
            pass
    
    if user:
        return {
            "member_id": member_id,
            "member_type": "user",
            "member_name": f"{user.get('prenom', '')} {user.get('nom', '')}".strip(),
            "service": user.get("service", ""),
            "work_rhythm": user.get("work_rhythm", "journee"),
            "work_rhythm_config": get_work_rhythm_config(user.get("work_rhythm", "journee"))
        }
    
    # Si pas trouvé dans users, chercher dans team_members (temporaires)
    member = await db.team_members.find_one({"id": member_id})
    if member:
        return {
            "member_id": member_id,
            "member_type": "temporary",
            "member_name": f"{member.get('prenom', '')} {member.get('nom', '')}".strip(),
            "service": member.get("service", ""),
            "work_rhythm": member.get("work_rhythm", "journee"),
            "work_rhythm_config": member.get("work_rhythm_config", get_work_rhythm_config("journee"))
        }
    
    return None


async def get_or_create_time_entry(member_id: str, date: str, member_info: dict) -> dict:
    """Récupère ou crée une entrée de pointage pour un membre et une date"""
    existing = await db.time_entries.find_one({"member_id": member_id, "date": date})
    
    if existing:
        return serialize_doc(existing)
    
    # Créer une nouvelle entrée
    rhythm_config = member_info.get("work_rhythm_config", {})
    theoretical_hours = (rhythm_config.get("weekly_hours", 35) / 5)  # Heures théoriques par jour
    
    new_entry = {
        "id": str(uuid.uuid4()),
        "member_id": member_id,
        "member_type": member_info.get("member_type", "user"),
        "member_name": member_info.get("member_name", ""),
        "service": member_info.get("service", ""),
        "date": date,
        "clock_in": None,
        "clock_out": None,
        "break_duration_minutes": rhythm_config.get("break_duration_minutes", 60),
        "worked_hours": 0,
        "theoretical_hours": theoretical_hours,
        "overtime_hours": 0,
        "status": TimeEntryStatus.PARTIAL.value,
        "absence_type": None,
        "absence_reason": None,
        "source": TimeEntrySource.MANUAL_BUTTON.value,
        "badge_id": None,
        "validated": True,
        "validated_by": None,
        "validated_at": None,
        "notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.time_entries.insert_one(new_entry)
    
    return serialize_doc(new_entry)


def update_time_entry_calculations(entry: dict) -> dict:
    """Met à jour les calculs d'une entrée de pointage"""
    clock_in = entry.get("clock_in")
    clock_out = entry.get("clock_out")
    break_duration = entry.get("break_duration_minutes", 60)
    theoretical = entry.get("theoretical_hours", 7)
    
    if clock_in and clock_out:
        worked = calculate_worked_hours(clock_in, clock_out, break_duration)
        entry["worked_hours"] = worked
        entry["overtime_hours"] = round(max(0, worked - theoretical), 2)
        entry["status"] = TimeEntryStatus.COMPLETE.value
    elif clock_in or clock_out:
        entry["status"] = TimeEntryStatus.PARTIAL.value
    
    entry["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return entry


# ==================== CLOCK IN/OUT ====================

@router.post("/clock-in")
async def clock_in(
    member_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Pointer l'arrivée (bouton temps réel)"""
    # Si pas de member_id, utiliser l'utilisateur courant
    if not member_id:
        member_id = current_user.get("id")
    
    member_info = await get_member_info(member_id)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Vérifier l'accès si on pointe pour quelqu'un d'autre
    if member_id != current_user.get("id"):
        await check_team_access(current_user, service=member_info.get("service"))
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    entry = await get_or_create_time_entry(member_id, today, member_info)
    
    if entry.get("clock_in"):
        raise HTTPException(
            status_code=400, 
            detail=f"Arrivée déjà pointée à {entry.get('clock_in')}"
        )
    
    entry["clock_in"] = now_time
    entry["source"] = TimeEntrySource.MANUAL_BUTTON.value
    entry = update_time_entry_calculations(entry)
    
    await db.time_entries.update_one(
        {"id": entry["id"]},
        {"$set": entry}
    )
    
    logger.info(f"⏱️ Arrivée pointée: {member_info.get('member_name')} à {now_time}")
    
    return {
        "success": True,
        "message": f"Arrivée pointée à {now_time}",
        "time_entry": entry
    }


@router.post("/clock-out")
async def clock_out(
    member_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Pointer le départ (bouton temps réel)"""
    if not member_id:
        member_id = current_user.get("id")
    
    member_info = await get_member_info(member_id)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    if member_id != current_user.get("id"):
        await check_team_access(current_user, service=member_info.get("service"))
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    entry = await get_or_create_time_entry(member_id, today, member_info)
    
    if entry.get("clock_out"):
        raise HTTPException(
            status_code=400,
            detail=f"Départ déjà pointé à {entry.get('clock_out')}"
        )
    
    entry["clock_out"] = now_time
    entry["source"] = TimeEntrySource.MANUAL_BUTTON.value
    entry = update_time_entry_calculations(entry)
    
    await db.time_entries.update_one(
        {"id": entry["id"]},
        {"$set": entry}
    )
    
    logger.info(f"⏱️ Départ pointé: {member_info.get('member_name')} à {now_time}")
    
    return {
        "success": True,
        "message": f"Départ pointé à {now_time}",
        "time_entry": entry
    }


# ==================== PRESENT AT POST ====================

@router.post("/present-at-post")
async def present_at_post(
    member_id: str,
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Marquer un membre comme présent à son poste (horaires du rythme)"""
    member_info = await get_member_info(member_id)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    await check_team_access(current_user, service=member_info.get("service"))
    
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    rhythm_config = member_info.get("work_rhythm_config", {})
    clock_in = rhythm_config.get("default_start", "08:00")
    clock_out = rhythm_config.get("default_end", "17:00")
    break_duration = rhythm_config.get("break_duration_minutes", 60)
    theoretical = rhythm_config.get("weekly_hours", 35) / 5
    
    # Calculer les heures
    worked = calculate_worked_hours(clock_in, clock_out, break_duration)
    overtime = round(max(0, worked - theoretical), 2)
    
    # Vérifier si entrée existe
    existing = await db.time_entries.find_one({"member_id": member_id, "date": date})
    
    entry_data = {
        "member_id": member_id,
        "member_type": member_info.get("member_type", "user"),
        "member_name": member_info.get("member_name", ""),
        "service": member_info.get("service", ""),
        "date": date,
        "clock_in": clock_in,
        "clock_out": clock_out,
        "break_duration_minutes": break_duration,
        "worked_hours": worked,
        "theoretical_hours": theoretical,
        "overtime_hours": overtime,
        "status": TimeEntryStatus.COMPLETE.value,
        "source": TimeEntrySource.PRESENT_AT_POST.value,
        "validated": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.time_entries.update_one(
            {"id": existing["id"]},
            {"$set": entry_data}
        )
        entry_data["id"] = existing["id"]
    else:
        entry_data["id"] = str(uuid.uuid4())
        entry_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.time_entries.insert_one(entry_data)
    
    logger.info(f"✅ Présent à poste: {member_info.get('member_name')} ({date})")
    
    return {
        "success": True,
        "message": f"Présence enregistrée ({clock_in} - {clock_out})",
        "time_entry": serialize_doc(entry_data)
    }


@router.post("/present-at-post-bulk")
async def present_at_post_bulk(
    member_ids: List[str],
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Marquer plusieurs membres comme présents à leur poste"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    results = []
    errors = []
    
    for member_id in member_ids:
        try:
            result = await present_at_post(member_id, date, current_user)
            results.append(result)
        except HTTPException as e:
            errors.append({"member_id": member_id, "error": e.detail})
        except Exception as e:
            errors.append({"member_id": member_id, "error": str(e)})
    
    return {
        "success": len(errors) == 0,
        "processed": len(results),
        "errors": errors,
        "date": date
    }


# ==================== MANUAL ENTRY ====================

@router.post("/manual-entry")
async def manual_time_entry(
    entry: TimeEntryManual,
    current_user: dict = Depends(get_current_user)
):
    """Saisie manuelle d'un pointage"""
    member_info = await get_member_info(entry.member_id)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    await check_team_access(current_user, service=member_info.get("service"))
    
    rhythm_config = member_info.get("work_rhythm_config", {})
    break_duration = rhythm_config.get("break_duration_minutes", 60)
    theoretical = rhythm_config.get("weekly_hours", 35) / 5
    
    worked = calculate_worked_hours(entry.clock_in, entry.clock_out, break_duration)
    overtime = round(max(0, worked - theoretical), 2)
    
    # Vérifier si entrée existe
    existing = await db.time_entries.find_one({
        "member_id": entry.member_id, 
        "date": entry.date
    })
    
    entry_data = {
        "member_id": entry.member_id,
        "member_type": member_info.get("member_type", "user"),
        "member_name": member_info.get("member_name", ""),
        "service": member_info.get("service", ""),
        "date": entry.date,
        "clock_in": entry.clock_in,
        "clock_out": entry.clock_out,
        "break_duration_minutes": break_duration,
        "worked_hours": worked,
        "theoretical_hours": theoretical,
        "overtime_hours": overtime,
        "status": TimeEntryStatus.COMPLETE.value,
        "source": TimeEntrySource.MANUAL_ENTRY.value,
        "notes": f"{entry.reason or 'Saisie manuelle'}. {entry.notes or ''}".strip(),
        "validated": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.time_entries.update_one(
            {"id": existing["id"]},
            {"$set": entry_data}
        )
        entry_data["id"] = existing["id"]
    else:
        entry_data["id"] = str(uuid.uuid4())
        entry_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.time_entries.insert_one(entry_data)
    
    logger.info(f"✏️ Saisie manuelle: {member_info.get('member_name')} ({entry.date}: {entry.clock_in}-{entry.clock_out})")
    
    return {
        "success": True,
        "message": "Pointage enregistré",
        "time_entry": serialize_doc(entry_data)
    }


# ==================== NFC BADGE (préparation future) ====================

@router.post("/clock-in-nfc")
async def clock_in_nfc(
    badge_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Pointage par badge NFC (préparé pour le futur)"""
    # Chercher le membre par badge_id
    member = await db.team_members.find_one({"badge_id": badge_id})
    if not member:
        user = await db.users.find_one({"badge_id": badge_id})
        if user:
            member_id = str(user.get("_id", "")) if user.get("_id") else user.get("id")
            member_type = "user"
        else:
            raise HTTPException(status_code=404, detail="Badge non reconnu")
    else:
        member_id = member.get("id")
        member_type = "temporary"
    
    member_info = await get_member_info(member_id, member_type)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    entry = await get_or_create_time_entry(member_id, today, member_info)
    
    # Déterminer si c'est une arrivée ou un départ
    if not entry.get("clock_in"):
        entry["clock_in"] = now_time
        action = "Arrivée"
    elif not entry.get("clock_out"):
        entry["clock_out"] = now_time
        action = "Départ"
    else:
        raise HTTPException(
            status_code=400,
            detail="Pointage déjà complet pour aujourd'hui"
        )
    
    entry["source"] = TimeEntrySource.NFC_BADGE.value
    entry["badge_id"] = badge_id
    entry = update_time_entry_calculations(entry)
    
    await db.time_entries.update_one(
        {"id": entry["id"]},
        {"$set": entry}
    )
    
    logger.info(f"🔖 NFC {action}: {member_info.get('member_name')} ({badge_id}) à {now_time}")
    
    return {
        "success": True,
        "action": action.lower(),
        "message": f"{action} pointé(e) à {now_time}",
        "member_name": member_info.get("member_name"),
        "time_entry": entry
    }


# ==================== QUERIES ====================

@router.get("/today")
async def get_today_entry(
    member_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le pointage du jour pour un membre"""
    if not member_id:
        member_id = current_user.get("id")
    
    member_info = await get_member_info(member_id)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    # Vérifier accès si pas soi-même
    if member_id != current_user.get("id"):
        await check_team_access(current_user, service=member_info.get("service"))
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    entry = await db.time_entries.find_one({
        "member_id": member_id,
        "date": today
    })
    
    # Vérifier les absences
    absence = await db.absences.find_one({
        "member_id": member_id,
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    })
    
    rhythm_config = member_info.get("work_rhythm_config", {})
    
    return {
        "date": today,
        "member": member_info,
        "time_entry": serialize_doc(entry) if entry else None,
        "absence": serialize_doc(absence) if absence else None,
        "work_rhythm": {
            "code": member_info.get("work_rhythm"),
            "config": rhythm_config
        }
    }


@router.get("/history")
async def get_time_history(
    member_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 31,
    current_user: dict = Depends(get_current_user)
):
    """Historique des pointages"""
    user_service = None
    
    if member_id:
        member_info = await get_member_info(member_id)
        if member_info and member_id != current_user.get("id"):
            await check_team_access(current_user, service=member_info.get("service"))
    else:
        user_service = await get_user_service(current_user)
        if user_service is None and current_user.get("role") != "ADMIN":
            member_id = current_user.get("id")
    
    # Dates par défaut: 30 derniers jours
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not start_date:
        start = datetime.now(timezone.utc) - timedelta(days=30)
        start_date = start.strftime("%Y-%m-%d")
    
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if member_id:
        query["member_id"] = member_id
    elif user_service:
        query["service"] = user_service
    
    entries = await db.time_entries.find(query).sort("date", -1).limit(limit).to_list(limit)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "count": len(entries),
        "entries": [serialize_doc(e) for e in entries]
    }


@router.get("/export")
async def export_time_entries(
    start_date: str,
    end_date: str,
    member_id: Optional[str] = None,
    format: str = "csv",
    current_user: dict = Depends(get_current_user)
):
    """Exporter les pointages en CSV"""
    user_service = await get_user_service(current_user)
    
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    
    if member_id:
        member_info = await get_member_info(member_id)
        if member_info:
            await check_team_access(current_user, service=member_info.get("service"))
        query["member_id"] = member_id
    elif user_service:
        query["service"] = user_service
    
    entries = await db.time_entries.find(query).sort("date", 1).to_list(1000)
    
    # Générer le CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # En-têtes
    writer.writerow([
        "Date", "Nom", "Service", "Arrivée", "Départ", 
        "Pause (min)", "Heures travaillées", "Heures théoriques",
        "Heures sup", "Statut", "Source", "Notes"
    ])
    
    for entry in entries:
        writer.writerow([
            entry.get("date", ""),
            entry.get("member_name", ""),
            entry.get("service", ""),
            entry.get("clock_in", ""),
            entry.get("clock_out", ""),
            entry.get("break_duration_minutes", ""),
            entry.get("worked_hours", ""),
            entry.get("theoretical_hours", ""),
            entry.get("overtime_hours", ""),
            entry.get("status", ""),
            entry.get("source", ""),
            entry.get("notes", "")
        ])
    
    output.seek(0)
    
    filename = f"pointages_{start_date}_{end_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== ABSENCES ====================

@router.post("/absences")
async def create_absence(
    absence: AbsenceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Déclarer une absence"""
    member_info = await get_member_info(absence.member_id, absence.member_type.value if hasattr(absence.member_type, 'value') else absence.member_type)
    if not member_info:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    
    await check_team_access(current_user, service=member_info.get("service"))
    
    # Calculer le nombre de jours
    start = datetime.strptime(absence.start_date, "%Y-%m-%d")
    end = datetime.strptime(absence.end_date, "%Y-%m-%d")
    days_count = (end - start).days + 1
    
    absence_data = {
        "id": str(uuid.uuid4()),
        "member_id": absence.member_id,
        "member_type": absence.member_type.value if hasattr(absence.member_type, 'value') else absence.member_type,
        "member_name": member_info.get("member_name", ""),
        "service": member_info.get("service", ""),
        "absence_type": absence.absence_type.value if hasattr(absence.absence_type, 'value') else absence.absence_type,
        "start_date": absence.start_date,
        "end_date": absence.end_date,
        "days_count": days_count,
        "reason": absence.reason,
        "notes": absence.notes,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.absences.insert_one(absence_data)
    
    # Créer des entrées de pointage "absent" pour chaque jour
    current_date = start
    while current_date <= end:
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Vérifier s'il existe déjà une entrée
        existing = await db.time_entries.find_one({
            "member_id": absence.member_id,
            "date": date_str
        })
        
        if not existing:
            await db.time_entries.insert_one({
                "id": str(uuid.uuid4()),
                "member_id": absence.member_id,
                "member_type": absence_data["member_type"],
                "member_name": absence_data["member_name"],
                "service": absence_data["service"],
                "date": date_str,
                "clock_in": None,
                "clock_out": None,
                "worked_hours": 0,
                "theoretical_hours": 0,
                "overtime_hours": 0,
                "status": TimeEntryStatus.ABSENT.value,
                "absence_type": absence_data["absence_type"],
                "absence_reason": absence.reason,
                "validated": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        current_date += timedelta(days=1)
    
    logger.info(f"📅 Absence déclarée: {member_info.get('member_name')} - {absence.absence_type} ({absence.start_date} au {absence.end_date})")
    
    return {
        "success": True,
        "message": f"Absence enregistrée ({days_count} jour(s))",
        "absence": serialize_doc(absence_data)
    }


@router.get("/absences")
async def get_absences(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    member_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Liste des absences"""
    user_service = await get_user_service(current_user)
    
    query = {}
    
    if member_id:
        query["member_id"] = member_id
    elif user_service:
        query["service"] = user_service
    
    if start_date and end_date:
        query["$or"] = [
            {"start_date": {"$gte": start_date, "$lte": end_date}},
            {"end_date": {"$gte": start_date, "$lte": end_date}},
            {"start_date": {"$lte": start_date}, "end_date": {"$gte": end_date}}
        ]
    
    absences = await db.absences.find(query).sort("start_date", -1).to_list(100)
    
    return [serialize_doc(a) for a in absences]


@router.delete("/absences/{absence_id}")
async def delete_absence(
    absence_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Annuler/supprimer une absence"""
    absence = await db.absences.find_one({"id": absence_id})
    if not absence:
        raise HTTPException(status_code=404, detail="Absence non trouvée")
    
    await check_team_access(current_user, service=absence.get("service"))
    
    # Supprimer les entrées de pointage associées
    await db.time_entries.delete_many({
        "member_id": absence.get("member_id"),
        "date": {"$gte": absence.get("start_date"), "$lte": absence.get("end_date")},
        "status": TimeEntryStatus.ABSENT.value
    })
    
    await db.absences.delete_one({"id": absence_id})
    
    logger.info(f"📅 Absence supprimée: {absence_id}")
    
    return {"message": "Absence supprimée"}


# ==================== ABSENCE TYPES ====================

@router.get("/absence-types")
async def get_absence_types():
    """Liste des types d'absences disponibles"""
    return [
        {"code": "CP", "label": "Congés payés", "color": "#22c55e"},
        {"code": "RTT", "label": "RTT", "color": "#3b82f6"},
        {"code": "MALADIE", "label": "Maladie", "color": "#ef4444"},
        {"code": "FORMATION", "label": "Formation", "color": "#a855f7"},
        {"code": "RQP", "label": "RQP", "color": "#f97316"},
        {"code": "TT", "label": "Télétravail", "color": "#6b7280"}
    ]
