"""
Scheduler pour l'exécution automatique des rapports périodiques
Utilise APScheduler pour planifier les envois hebdomadaires, mensuels et annuels
"""
from datetime import datetime, timezone
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

logger = logging.getLogger(__name__)

# Scheduler global
report_scheduler = None
db_reference = None


def get_cron_trigger(schedule: dict) -> CronTrigger:
    """
    Convertit la configuration de planification en CronTrigger APScheduler
    """
    frequency = schedule.get("frequency", "weekly")
    day_of_week = schedule.get("day_of_week", "monday")
    day_of_month = schedule.get("day_of_month", 1)
    month_of_year = schedule.get("month_of_year", 1)
    time_str = schedule.get("time", "07:00")
    tz = schedule.get("timezone", "Europe/Paris")
    
    hour, minute = map(int, time_str.split(":"))
    
    # Mapping des jours de la semaine
    day_map = {
        "monday": "mon", "tuesday": "tue", "wednesday": "wed",
        "thursday": "thu", "friday": "fri", "saturday": "sat", "sunday": "sun"
    }
    
    if frequency == "weekly":
        return CronTrigger(
            day_of_week=day_map.get(day_of_week, "mon"),
            hour=hour,
            minute=minute,
            timezone=pytz.timezone(tz)
        )
    elif frequency == "monthly":
        return CronTrigger(
            day=day_of_month,
            hour=hour,
            minute=minute,
            timezone=pytz.timezone(tz)
        )
    elif frequency == "annual":
        return CronTrigger(
            month=month_of_year,
            day=day_of_month,
            hour=hour,
            minute=minute,
            timezone=pytz.timezone(tz)
        )
    else:
        # Par défaut: hebdomadaire le lundi à 7h
        return CronTrigger(
            day_of_week="mon",
            hour=7,
            minute=0,
            timezone=pytz.timezone(tz)
        )


async def execute_scheduled_report(template_id: str):
    """
    Exécute l'envoi d'un rapport planifié
    """
    global db_reference
    
    if not db_reference:
        logger.error("❌ Base de données non initialisée pour les rapports planifiés")
        return
    
    try:
        # Récupérer le template
        template = await db_reference.weekly_report_templates.find_one({"id": template_id})
        
        if not template:
            logger.warning(f"⚠️ Template de rapport non trouvé: {template_id}")
            return
        
        if not template.get("is_active", False):
            logger.info(f"ℹ️ Rapport désactivé, pas d'envoi: {template.get('name')}")
            return
        
        # Vérifier les paramètres globaux
        settings = await db_reference.weekly_report_settings.find_one({})
        if settings and not settings.get("enabled", True):
            logger.info("ℹ️ Rapports désactivés globalement")
            return
        
        logger.info(f"📊 Exécution du rapport planifié: {template.get('name')}")
        
        # Générer et envoyer le rapport
        from weekly_report_service import generate_and_send_report
        result = await generate_and_send_report(template, db_reference)
        
        if result.get("success"):
            logger.info(f"✅ Rapport envoyé avec succès: {template.get('name')} ({result.get('sent_count')} destinataires)")
        else:
            logger.error(f"❌ Échec de l'envoi du rapport: {template.get('name')} - {result.get('errors')}")
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'exécution du rapport planifié {template_id}: {e}")


def schedule_report(template: dict):
    """
    Planifie un rapport dans le scheduler
    """
    global report_scheduler
    
    if not report_scheduler:
        logger.warning("⚠️ Scheduler non initialisé")
        return False
    
    template_id = template.get("id")
    job_id = f"report_{template_id}"
    
    # Supprimer le job existant s'il existe
    existing_job = report_scheduler.get_job(job_id)
    if existing_job:
        report_scheduler.remove_job(job_id)
        logger.info(f"🔄 Mise à jour du job de rapport: {template.get('name')}")
    
    # Ne pas planifier si désactivé
    if not template.get("is_active", False):
        logger.info(f"ℹ️ Rapport désactivé, pas de planification: {template.get('name')}")
        return True
    
    # Créer le trigger
    schedule_config = template.get("schedule", {})
    trigger = get_cron_trigger(schedule_config)
    
    # Ajouter le job
    report_scheduler.add_job(
        execute_scheduled_report,
        trigger=trigger,
        args=[template_id],
        id=job_id,
        name=f"Report: {template.get('name')}",
        replace_existing=True
    )
    
    # Calculer la prochaine exécution
    next_run = trigger.get_next_fire_time(None, datetime.now(timezone.utc))
    logger.info(f"📅 Rapport planifié: {template.get('name')} - Prochaine exécution: {next_run}")
    
    return True


def unschedule_report(template_id: str):
    """
    Supprime un rapport du scheduler
    """
    global report_scheduler
    
    if not report_scheduler:
        return False
    
    job_id = f"report_{template_id}"
    
    existing_job = report_scheduler.get_job(job_id)
    if existing_job:
        report_scheduler.remove_job(job_id)
        logger.info(f"🗑️ Rapport retiré du scheduler: {job_id}")
        return True
    
    return False


async def load_all_report_schedules(db):
    """
    Charge tous les rapports actifs et les planifie
    """
    global db_reference
    db_reference = db
    
    try:
        templates = await db.weekly_report_templates.find({"is_active": True}).to_list(100)
        
        scheduled_count = 0
        for template in templates:
            if schedule_report(template):
                scheduled_count += 1
        
        logger.info(f"📊 {scheduled_count} rapport(s) planifié(s)")
        return scheduled_count
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du chargement des rapports planifiés: {e}")
        return 0


def init_report_scheduler(scheduler: AsyncIOScheduler, db):
    """
    Initialise le scheduler de rapports
    """
    global report_scheduler, db_reference
    
    report_scheduler = scheduler
    db_reference = db
    
    logger.info("📊 Scheduler de rapports initialisé")


def get_scheduled_reports_info() -> list:
    """
    Retourne la liste des rapports planifiés avec leurs prochaines exécutions
    """
    global report_scheduler
    
    if not report_scheduler:
        return []
    
    jobs_info = []
    for job in report_scheduler.get_jobs():
        if job.id.startswith("report_"):
            jobs_info.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None
            })
    
    return jobs_info
