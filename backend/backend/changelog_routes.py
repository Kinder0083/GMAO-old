"""
Routes pour le changelog (Quoi de neuf ?)
"""
from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user, get_current_admin_user
from datetime import datetime, timezone
import uuid
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/releases", tags=["releases"])

from server import db

COLLECTION = "releases"
USER_SEEN_COLLECTION = "releases_user_seen"
FEEDBACK_COLLECTION = "releases_feedback"


async def ensure_default_content():
    """Charge le contenu par défaut si la collection est vide."""
    count = await db[COLLECTION].count_documents({})
    if count == 0:
        default_file = Path(__file__).parent / "changelog_default_content.json"
        if default_file.exists():
            with open(default_file, "r", encoding="utf-8") as f:
                releases = json.load(f)
            for release in releases:
                release["created_at"] = datetime.now(timezone.utc).isoformat()
                release["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db[COLLECTION].insert_many(releases)
            logger.info(f"Changelog: {len(releases)} versions par défaut chargées")


@router.get("")
async def get_changelog(current_user: dict = Depends(get_current_user)):
    """Récupérer toutes les entrées du changelog, triées par date décroissante."""
    await ensure_default_content()

    releases = await db[COLLECTION].find({}, {"_id": 0}).sort("date", -1).to_list(None)

    # Récupérer la dernière version vue par l'utilisateur
    user_id = current_user.get("id", "")
    seen_doc = await db[USER_SEEN_COLLECTION].find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    last_seen_version = seen_doc.get("last_seen_version", "") if seen_doc else ""

    return {
        "releases": releases,
        "last_seen_version": last_seen_version,
        "latest_version": releases[0]["version"] if releases else ""
    }


@router.post("/mark-read")
async def mark_changelog_read(current_user: dict = Depends(get_current_user)):
    """Marquer le changelog comme lu (masquer le badge NEW)."""
    await ensure_default_content()

    user_id = current_user.get("id", "")
    releases = await db[COLLECTION].find({}, {"_id": 0}).sort("date", -1).limit(1).to_list(1)
    latest_version = releases[0]["version"] if releases else ""

    await db[USER_SEEN_COLLECTION].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "last_seen_version": latest_version,
                "read_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {"message": "Changelog marqué comme lu", "version": latest_version}


@router.post("")
async def create_release(data: dict, current_user: dict = Depends(get_current_admin_user)):
    """Créer une nouvelle version dans le changelog (admin uniquement)."""
    release = {
        "id": f"cl-{uuid.uuid4().hex[:6]}",
        "version": data.get("version", ""),
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "entries": data.get("entries", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if not release["version"]:
        raise HTTPException(status_code=400, detail="Le numéro de version est requis")
    if not release["entries"]:
        raise HTTPException(status_code=400, detail="Au moins une entrée est requise")

    # Vérifier qu'une version avec ce numéro n'existe pas déjà
    existing = await db[COLLECTION].find_one({"version": release["version"]})
    if existing:
        raise HTTPException(status_code=409, detail=f"La version {release['version']} existe déjà")

    await db[COLLECTION].insert_one(release)
    result = await db[COLLECTION].find_one({"id": release["id"]}, {"_id": 0})
    return result


@router.put("/{release_id}")
async def update_release(release_id: str, data: dict, current_user: dict = Depends(get_current_admin_user)):
    """Modifier une version existante du changelog (admin uniquement)."""
    existing = await db[COLLECTION].find_one({"id": release_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Version non trouvée")

    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if "version" in data:
        update_data["version"] = data["version"]
    if "date" in data:
        update_data["date"] = data["date"]
    if "entries" in data:
        update_data["entries"] = data["entries"]

    await db[COLLECTION].update_one({"id": release_id}, {"$set": update_data})
    result = await db[COLLECTION].find_one({"id": release_id}, {"_id": 0})
    return result


@router.delete("/{release_id}")
async def delete_release(release_id: str, current_user: dict = Depends(get_current_admin_user)):
    """Supprimer une version du changelog (admin uniquement)."""
    existing = await db[COLLECTION].find_one({"id": release_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Version non trouvée")

    await db[COLLECTION].delete_one({"id": release_id})
    return {"message": "Version supprimée"}


@router.post("/feedback")
async def submit_feedback(data: dict, current_user: dict = Depends(get_current_user)):
    """Soumettre un vote (up/down) pour une entrée du changelog. Re-voter annule."""
    version = data.get("version", "")
    entry_index = data.get("entry_index")
    vote = data.get("vote", "")  # "up" ou "down"
    user_id = current_user.get("id", "")

    if not version or entry_index is None or vote not in ("up", "down"):
        raise HTTPException(status_code=400, detail="version, entry_index et vote (up/down) requis")

    doc_filter = {
        "user_id": user_id,
        "version": version,
        "entry_index": entry_index
    }

    existing = await db[FEEDBACK_COLLECTION].find_one(doc_filter)

    if existing and existing.get("vote") == vote:
        # Même vote → annuler (toggle off)
        await db[FEEDBACK_COLLECTION].delete_one(doc_filter)
        return {"status": "removed", "vote": None}
    else:
        # Nouveau vote ou changement de vote
        await db[FEEDBACK_COLLECTION].update_one(
            doc_filter,
            {"$set": {
                **doc_filter,
                "vote": vote,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        return {"status": "saved", "vote": vote}


@router.get("/feedback/{version}")
async def get_feedback_stats(version: str, current_user: dict = Depends(get_current_user)):
    """Récupérer les stats de feedback + le vote de l'utilisateur pour une version."""
    user_id = current_user.get("id", "")

    # Tous les votes pour cette version
    all_votes = await db[FEEDBACK_COLLECTION].find(
        {"version": version}, {"_id": 0}
    ).to_list(None)

    # Agréger par entry_index
    stats = {}
    user_votes = {}
    for v in all_votes:
        idx = v["entry_index"]
        if idx not in stats:
            stats[idx] = {"up": 0, "down": 0}
        stats[idx][v["vote"]] += 1
        if v["user_id"] == user_id:
            user_votes[idx] = v["vote"]

    return {"stats": stats, "user_votes": user_votes}


@router.get("/feedback-summary")
async def get_feedback_summary(current_user: dict = Depends(get_current_admin_user)):
    """Récupérer un résumé global des feedbacks par version (admin)."""
    all_votes = await db[FEEDBACK_COLLECTION].find({}, {"_id": 0}).to_list(None)

    summary = {}
    for v in all_votes:
        ver = v["version"]
        if ver not in summary:
            summary[ver] = {"up": 0, "down": 0}
        summary[ver][v["vote"]] += 1

    return {"summary": summary}
