"""
Scheduler pour la capture automatique des snapshots des caméras
"""
import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from camera_service import capture_snapshot, cleanup_old_snapshots

logger = logging.getLogger(__name__)

# Scheduler global
snapshot_scheduler: AsyncIOScheduler = None
db = None


def set_database(database):
    """Injecte la connexion à la base de données"""
    global db
    db = database


async def capture_all_snapshots():
    """Capture un snapshot pour toutes les caméras actives"""
    if not db:
        logger.warning("Database non initialisée pour les snapshots")
        return
    
    try:
        captured = 0
        failed = 0
        
        async for camera in db.cameras.find({"is_online": True}):
            try:
                filepath = await capture_snapshot(camera)
                if filepath:
                    captured += 1
                    # Mettre à jour last_snapshot
                    await db.cameras.update_one(
                        {"_id": camera["_id"]},
                        {"$set": {"last_snapshot": datetime.now(timezone.utc).isoformat()}}
                    )
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Erreur capture snapshot {camera.get('name')}: {e}")
                failed += 1
        
        if captured > 0 or failed > 0:
            logger.info(f"Snapshots capturés: {captured} réussis, {failed} échecs")
            
    except Exception as e:
        logger.error(f"Erreur capture_all_snapshots: {e}")


async def cleanup_all_camera_snapshots():
    """Nettoie les anciens snapshots selon la rétention"""
    if not db:
        return
    
    try:
        settings = await db.camera_settings.find_one({"type": "snapshot"})
        retention_days = settings.get("retention_days", 7) if settings else 7
        max_count = settings.get("retention_max_count", 1000) if settings else 1000
        
        async for camera in db.cameras.find({}, {"_id": 1}):
            camera_id = str(camera["_id"])
            await cleanup_old_snapshots(camera_id, retention_days, max_count)
            
    except Exception as e:
        logger.error(f"Erreur cleanup_all_camera_snapshots: {e}")


def init_snapshot_scheduler():
    """Initialise le scheduler de capture de snapshots"""
    global snapshot_scheduler
    
    if snapshot_scheduler:
        return snapshot_scheduler
    
    snapshot_scheduler = AsyncIOScheduler()
    
    # Job de capture toutes les 30 secondes (sera ajusté selon les paramètres)
    snapshot_scheduler.add_job(
        capture_all_snapshots,
        IntervalTrigger(seconds=30),
        id="capture_snapshots",
        name="Capture automatique des snapshots",
        replace_existing=True,
        max_instances=1
    )
    
    # Job de nettoyage toutes les heures
    snapshot_scheduler.add_job(
        cleanup_all_camera_snapshots,
        IntervalTrigger(hours=1),
        id="cleanup_snapshots",
        name="Nettoyage des anciens snapshots",
        replace_existing=True,
        max_instances=1
    )
    
    return snapshot_scheduler


async def update_snapshot_frequency(frequency_seconds: int):
    """Met à jour la fréquence de capture des snapshots"""
    global snapshot_scheduler
    
    if not snapshot_scheduler:
        return
    
    try:
        # Supprimer l'ancien job
        if snapshot_scheduler.get_job("capture_snapshots"):
            snapshot_scheduler.remove_job("capture_snapshots")
        
        # Ajouter le nouveau job avec la nouvelle fréquence
        snapshot_scheduler.add_job(
            capture_all_snapshots,
            IntervalTrigger(seconds=frequency_seconds),
            id="capture_snapshots",
            name="Capture automatique des snapshots",
            replace_existing=True,
            max_instances=1
        )
        
        logger.info(f"Fréquence de capture mise à jour: {frequency_seconds}s")
        
    except Exception as e:
        logger.error(f"Erreur mise à jour fréquence: {e}")


def start_snapshot_scheduler():
    """Démarre le scheduler"""
    global snapshot_scheduler
    
    if not snapshot_scheduler:
        init_snapshot_scheduler()
    
    if not snapshot_scheduler.running:
        snapshot_scheduler.start()
        logger.info("Scheduler de snapshots démarré")


def stop_snapshot_scheduler():
    """Arrête le scheduler"""
    global snapshot_scheduler
    
    if snapshot_scheduler and snapshot_scheduler.running:
        snapshot_scheduler.shutdown(wait=False)
        logger.info("Scheduler de snapshots arrêté")
