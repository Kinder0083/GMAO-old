"""
Routes API pour le Plan de Surveillance
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging

from models import (
    SurveillanceItem,
    SurveillanceItemCreate,
    SurveillanceItemUpdate,
    SurveillanceItemStatus,
    SurveillanceResponsible,
    AIAnalysisHistory,
    ActionType,
    EntityType,
    SuccessResponse
)
from dependencies import get_current_user, get_current_admin_user
from audit_service import AuditService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/surveillance", tags=["surveillance"])

# Variables globales (seront injectées depuis server.py)
db = None
audit_service = None
realtime_manager = None

def init_surveillance_routes(database, audit_svc, realtime_mgr=None):
    """Initialise les routes avec la connexion DB et audit service"""
    global db, audit_service, realtime_manager
    db = database
    audit_service = audit_svc
    realtime_manager = realtime_mgr


# ==================== Utilitaires récurrence ====================

def parse_periodicite_to_months(periodicite: str) -> int:
    """Convertit une périodicité texte en nombre de mois.
    Ex: '1 an' -> 12, '6 mois' -> 6, '3 mois' -> 3, '1 mois' -> 1, '2 ans' -> 24
    """
    p = periodicite.lower().strip()
    import re
    # Patterns: "X an(s)", "X mois", "trimestriel", "semestriel", "annuel", "mensuel"
    if "trimestriel" in p:
        return 3
    if "semestriel" in p:
        return 6
    if "annuel" in p:
        return 12
    if "mensuel" in p:
        return 1
    
    m = re.match(r'(\d+)\s*(an|ans|année|années)', p)
    if m:
        return int(m.group(1)) * 12
    
    m = re.match(r'(\d+)\s*(mois)', p)
    if m:
        return int(m.group(1))
    
    # Fallback: essayer de trouver un nombre
    m = re.search(r'(\d+)', p)
    if m:
        num = int(m.group(1))
        if "an" in p:
            return num * 12
        return num
    
    return 12  # Défaut: annuel


def add_months_to_date(date: datetime, months: int) -> datetime:
    """Ajoute N mois à une date."""
    month = date.month - 1 + months
    year = date.year + month // 12
    month = month % 12 + 1
    day = min(date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date.replace(year=year, month=month, day=day)


def get_year_from_date_str(date_str: str) -> Optional[int]:
    """Extrait l'année d'une date ISO string."""
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).year
    except:
        try:
            return int(date_str[:4])
        except:
            return None


def generate_recurring_controls(base_item_dict: dict, start_date_str: str, periodicite: str) -> list:
    """Génère tous les contrôles récurrents de start_date jusqu'à fin N+1.
    Retourne une liste de dicts prêts à être insérés en DB.
    """
    months = parse_periodicite_to_months(periodicite)
    if months <= 0:
        return []
    
    try:
        start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
    except:
        try:
            start_date = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
        except:
            return []
    
    current_year = datetime.now().year
    end_year = current_year + 1
    end_date = datetime(end_year, 12, 31, 23, 59, 59)
    
    groupe_id = base_item_dict.get("groupe_controle_id") or str(uuid.uuid4())
    
    recurring = []
    next_date = add_months_to_date(start_date, months)
    
    while next_date <= end_date:
        new_item = {
            **base_item_dict,
            "id": str(uuid.uuid4()),
            "prochain_controle": next_date.strftime("%Y-%m-%d"),
            "annee": next_date.year,
            "groupe_controle_id": groupe_id,
            "status": "a_planifier",
            "date_realisation": None,
            "derniere_visite": None,
            "alerte_envoyee": False,
            "email_rappel_envoye": False,
            "numero_rapport": None,
            "resultat_controle": None,
            "commentaire": None,
            "attachments": [],
            # Reset des mois
            "janvier": False, "fevrier": False, "mars": False,
            "avril": False, "mai": False, "juin": False,
            "juillet": False, "aout": False, "septembre": False,
            "octobre": False, "novembre": False, "decembre": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Nettoyer _id si présent
        new_item.pop("_id", None)
        recurring.append(new_item)
        next_date = add_months_to_date(next_date, months)
    
    return recurring


# ==================== CRUD Routes ====================

@router.get("/items", response_model=List[dict])
async def get_surveillance_items(
    category: Optional[str] = None,
    responsable: Optional[str] = None,
    batiment: Optional[str] = None,
    status: Optional[str] = None,
    annee: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les items du plan de surveillance avec filtres"""
    try:
        query = {}
        
        if category:
            query["category"] = category
        if responsable:
            query["responsable"] = responsable
        if batiment:
            query["batiment"] = batiment
        if status:
            query["status"] = status
        if annee:
            query["annee"] = annee
        
        items = await db.surveillance_items.find(query).to_list(length=None)
        
        # Convertir _id en string
        for item in items:
            if "_id" in item:
                del item["_id"]
        
        return items
    except Exception as e:
        logger.error(f"Erreur récupération items surveillance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/{item_id}")
async def get_surveillance_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un item spécifique"""
    try:
        item = await db.surveillance_items.find_one({"id": item_id})
        
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        if "_id" in item:
            del item["_id"]
        
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items")
async def create_surveillance_item(
    item_data: SurveillanceItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouvel item de surveillance + contrôles récurrents jusqu'à N+1"""
    try:
        # Déterminer l'année du contrôle
        annee = get_year_from_date_str(item_data.prochain_controle) if item_data.prochain_controle else datetime.now().year
        groupe_id = item_data.groupe_controle_id if hasattr(item_data, 'groupe_controle_id') and item_data.groupe_controle_id else str(uuid.uuid4())
        
        item = SurveillanceItem(
            **item_data.model_dump(),
            annee=annee,
            groupe_controle_id=groupe_id,
            created_by=current_user.get("id"),
            updated_by=current_user.get("id")
        )
        
        item_dict = item.model_dump()
        await db.surveillance_items.insert_one(item_dict)
        
        # Générer les contrôles récurrents futurs jusqu'à fin N+1
        recurring_count = 0
        if item_data.prochain_controle and item_data.periodicite:
            recurring = generate_recurring_controls(item_dict, item_data.prochain_controle, item_data.periodicite)
            if recurring:
                for r in recurring:
                    r["created_by"] = current_user.get("id")
                    r["updated_by"] = current_user.get("id")
                await db.surveillance_items.insert_many(recurring)
                recurring_count = len(recurring)
                logger.info(f"✅ {recurring_count} contrôle(s) récurrent(s) créé(s) pour {item.classe_type}")
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.SURVEILLANCE,
            entity_id=item.id,
            entity_name=f"Plan surveillance: {item.classe_type}"
        )
        
        if "_id" in item_dict:
            del item_dict["_id"]
        
        item_dict["recurring_count"] = recurring_count
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "surveillance_plans",
                "created",
                item_dict,
                user_id=current_user["id"]
            )
        
        return item_dict
    except Exception as e:
        logger.error(f"Erreur création item surveillance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_surveillance_item(
    item_id: str,
    item_update: SurveillanceItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un item de surveillance"""
    try:
        logger.info(f"🔍 UPDATE REQUEST - Item ID: {item_id}")
        logger.info(f"📦 Données reçues: {item_update.model_dump()}")
        
        # Vérifier que l'item existe
        existing = await db.surveillance_items.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        # Préparer les mises à jour
        update_data = {
            k: v for k, v in item_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        # Mettre à jour
        await db.surveillance_items.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        
        # Récupérer l'item mis à jour
        updated_item = await db.surveillance_items.find_one({"id": item_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.SURVEILLANCE,
            entity_id=item_id,
            entity_name=f"Plan surveillance: {existing.get('classe_type')}"
        )
        
        if "_id" in updated_item:
            del updated_item["_id"]
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "surveillance_plans",
                "updated",
                updated_item,
                user_id=current_user["id"]
            )
        
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur mise à jour item {item_id}: {str(e)}")
        logger.error(f"❌ Type erreur: {type(e).__name__}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}", response_model=SuccessResponse)
async def delete_surveillance_item(
    item_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un item de surveillance (Admin uniquement)"""
    try:
        item = await db.surveillance_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        await db.surveillance_items.delete_one({"id": item_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.DELETE,
            entity_type=EntityType.SURVEILLANCE,
            entity_id=item_id,
            entity_name=f"Plan surveillance: {item.get('classe_type')}"
        )
        
        # Broadcast WebSocket pour la synchronisation temps réel
        if realtime_manager:
            await realtime_manager.emit_event(
                "surveillance_plans",
                "deleted",
                {"id": item_id},
                user_id=current_user["id"]
            )
        
        return {"success": True, "message": "Item supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression item {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Statistiques et Indicateurs ====================

@router.get("/stats")
async def get_surveillance_stats(
    annee: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les statistiques du plan de surveillance (filtrables par année)"""
    try:
        query = {}
        if annee:
            query["annee"] = annee
        
        items = await db.surveillance_items.find(query).to_list(length=None)
        
        total = len(items)
        realises = len([i for i in items if i.get("status") == SurveillanceItemStatus.REALISE.value])
        planifies = len([i for i in items if i.get("status") == SurveillanceItemStatus.PLANIFIE.value])
        a_planifier = len([i for i in items if i.get("status") == SurveillanceItemStatus.PLANIFIER.value])
        
        # Par catégorie (dynamique - récupère toutes les catégories existantes)
        by_category = {}
        categories = list(set([i.get("category") for i in items if i.get("category")]))
        for cat in categories:
            cat_items = [i for i in items if i.get("category") == cat]
            cat_realises = len([i for i in cat_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_category[cat] = {
                "total": len(cat_items),
                "realises": cat_realises,
                "pourcentage": round((cat_realises / len(cat_items) * 100) if cat_items else 0, 1)
            }
        
        # Par responsable
        by_responsable = {}
        for resp in SurveillanceResponsible:
            resp_items = [i for i in items if i.get("responsable") == resp.value]
            resp_realises = len([i for i in resp_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_responsable[resp.value] = {
                "total": len(resp_items),
                "realises": resp_realises,
                "pourcentage": round((resp_realises / len(resp_items) * 100) if resp_items else 0, 1)
            }
        
        return {
            "global": {
                "total": total,
                "realises": realises,
                "planifies": planifies,
                "a_planifier": a_planifier,
                "pourcentage_realisation": round((realises / total * 100) if total > 0 else 0, 1)
            },
            "by_category": by_category,
            "by_responsable": by_responsable
        }
    except Exception as e:
        logger.error(f"Erreur récupération statistiques: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Alertes et Notifications ====================

@router.get("/alerts")
async def get_surveillance_alerts(current_user: dict = Depends(get_current_user)):
    """Récupérer les items nécessitant une alerte (échéance proche)"""
    try:
        items = await db.surveillance_items.find().to_list(length=None)
        
        alerts = []
        today = datetime.now(timezone.utc).date()
        
        for item in items:
            if item.get("prochain_controle") and item.get("status") != SurveillanceItemStatus.REALISE.value:
                try:
                    prochain_controle = datetime.fromisoformat(item["prochain_controle"]).date()
                    days_until = (prochain_controle - today).days
                    duree_rappel = item.get("duree_rappel_echeance", 30)
                    
                    # Alerte si moins de la durée de rappel configurée
                    if days_until <= duree_rappel:
                        if "_id" in item:
                            del item["_id"]
                        item["days_until"] = days_until
                        item["urgence"] = "critique" if days_until <= 7 else "important" if days_until <= 14 else "normal"
                        alerts.append(item)
                except:
                    pass
        
        # Trier par urgence (plus proche en premier)
        alerts.sort(key=lambda x: x.get("days_until", 999))
        
        return {
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Erreur récupération alertes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/badge-stats")
async def get_badge_stats(current_user: dict = Depends(get_current_user)):
    """
    Récupérer les statistiques pour le badge de notification du header
    - Nombre de contrôles à échéance proche (selon duree_rappel_echeance de chaque item)
    - Pourcentage de réalisation global
    """
    try:
        items = await db.surveillance_items.find().to_list(length=None)
        
        total = len(items)
        if total == 0:
            return {
                "echeances_proches": 0,
                "pourcentage_realisation": 0
            }
        
        # Compter les items réalisés
        realises = len([i for i in items if i.get("status") == SurveillanceItemStatus.REALISE.value])
        pourcentage_realisation = round((realises / total * 100), 1)
        
        # Compter les échéances proches (selon la durée de rappel de chaque item)
        echeances_proches = 0
        today = datetime.now(timezone.utc).date()
        
        for item in items:
            # Ignorer les items déjà réalisés
            if item.get("status") == SurveillanceItemStatus.REALISE.value:
                continue
                
            if item.get("prochain_controle"):
                try:
                    prochain_controle = datetime.fromisoformat(item["prochain_controle"]).date()
                    days_until = (prochain_controle - today).days
                    duree_rappel = item.get("duree_rappel_echeance", 30)
                    
                    # Compter si l'échéance est proche selon la durée de rappel
                    if days_until <= duree_rappel:
                        echeances_proches += 1
                except Exception as e:
                    logger.warning(f"Erreur parsing date pour item {item.get('id')}: {str(e)}")
                    pass
        
        return {
            "echeances_proches": echeances_proches,
            "pourcentage_realisation": pourcentage_realisation
        }
    except Exception as e:
        logger.error(f"Erreur récupération badge stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rapport-stats")
async def get_rapport_stats(current_user: dict = Depends(get_current_user)):
    """
    Récupérer les statistiques complètes pour la page Rapport
    Inclut tous les KPIs : taux de réalisation par catégorie, bâtiment, périodicité, etc.
    """
    try:
        items = await db.surveillance_items.find().to_list(length=None)
        
        total = len(items)
        if total == 0:
            return {
                "global": {
                    "total": 0,
                    "realises": 0,
                    "planifies": 0,
                    "a_planifier": 0,
                    "pourcentage_realisation": 0,
                    "en_retard": 0,
                    "a_temps": 0
                },
                "by_category": {},
                "by_batiment": {},
                "by_periodicite": {},
                "by_responsable": {},
                "anomalies": 0
            }
        
        today = datetime.now(timezone.utc).date()
        
        # Statistiques globales
        realises = [i for i in items if i.get("status") == SurveillanceItemStatus.REALISE.value]
        planifies = [i for i in items if i.get("status") == SurveillanceItemStatus.PLANIFIE.value]
        a_planifier = [i for i in items if i.get("status") == SurveillanceItemStatus.PLANIFIER.value]
        
        # Calculer les items en retard et à temps
        en_retard = 0
        a_temps = 0
        for item in items:
            if item.get("status") != SurveillanceItemStatus.REALISE.value and item.get("prochain_controle"):
                try:
                    prochain_controle = datetime.fromisoformat(item["prochain_controle"]).date()
                    if prochain_controle < today:
                        en_retard += 1
                    else:
                        a_temps += 1
                except:
                    pass
        
        # Compter les anomalies (items avec commentaires mentionnant des problèmes)
        anomalies = 0
        for item in items:
            commentaire = item.get("commentaire", "") or ""
            commentaire = commentaire.lower()
            if any(keyword in commentaire for keyword in ["anomalie", "problème", "défaut", "dysfonctionnement", "intervention", "réparation"]):
                anomalies += 1
        
        # Par catégorie (dynamique - récupère toutes les catégories existantes)
        by_category = {}
        categories = list(set([i.get("category") for i in items if i.get("category")]))
        for cat in categories:
            cat_items = [i for i in items if i.get("category") == cat]
            cat_realises = len([i for i in cat_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_category[cat] = {
                "total": len(cat_items),
                "realises": cat_realises,
                "pourcentage": round((cat_realises / len(cat_items) * 100) if cat_items else 0, 1)
            }
        
        # Par bâtiment
        by_batiment = {}
        batiments = set([i.get("batiment", "Non spécifié") for i in items])
        for bat in batiments:
            bat_items = [i for i in items if i.get("batiment") == bat]
            bat_realises = len([i for i in bat_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_batiment[bat] = {
                "total": len(bat_items),
                "realises": bat_realises,
                "pourcentage": round((bat_realises / len(bat_items) * 100) if bat_items else 0, 1)
            }
        
        # Par périodicité
        by_periodicite = {}
        periodicites = set([i.get("periodicite", "Non spécifié") for i in items])
        for per in periodicites:
            per_items = [i for i in items if i.get("periodicite") == per]
            per_realises = len([i for i in per_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_periodicite[per] = {
                "total": len(per_items),
                "realises": per_realises,
                "pourcentage": round((per_realises / len(per_items) * 100) if per_items else 0, 1)
            }
        
        # Par responsable
        by_responsable = {}
        for resp in SurveillanceResponsible:
            resp_items = [i for i in items if i.get("responsable") == resp.value]
            resp_realises = len([i for i in resp_items if i.get("status") == SurveillanceItemStatus.REALISE.value])
            by_responsable[resp.value] = {
                "total": len(resp_items),
                "realises": resp_realises,
                "pourcentage": round((resp_realises / len(resp_items) * 100) if resp_items else 0, 1)
            }
        
        return {
            "global": {
                "total": total,
                "realises": len(realises),
                "planifies": len(planifies),
                "a_planifier": len(a_planifier),
                "pourcentage_realisation": round((len(realises) / total * 100), 1),
                "en_retard": en_retard,
                "a_temps": a_temps
            },
            "by_category": by_category,
            "by_batiment": by_batiment,
            "by_periodicite": by_periodicite,
            "by_responsable": by_responsable,
            "anomalies": anomalies
        }
    except Exception as e:
        logger.error(f"Erreur récupération rapport stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Envoi manuel d'email de rappel ====================

@router.post("/items/{item_id}/send-reminder")
async def send_manual_reminder(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Envoyer manuellement un email de rappel pour un contrôle"""
    try:
        # Récupérer l'item
        item = await db.surveillance_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Contrôle non trouvé")
        
        # Vérifier qu'un responsable est défini
        responsable_id = item.get("responsable_notification_id")
        if not responsable_id:
            raise HTTPException(status_code=400, detail="Aucun responsable de notification défini pour ce contrôle")
        
        # Récupérer l'utilisateur
        from bson import ObjectId
        user = await db.users.find_one({"id": responsable_id})
        if not user:
            try:
                user = await db.users.find_one({"_id": ObjectId(responsable_id)})
            except:
                pass
        
        if not user:
            raise HTTPException(status_code=404, detail="Responsable non trouvé")
        
        if not user.get("email"):
            raise HTTPException(status_code=400, detail="Le responsable n'a pas d'adresse email")
        
        # Envoyer l'email
        user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email")
        success = await send_surveillance_reminder_email(
            user_email=user.get("email"),
            user_name=user_name,
            item=item
        )
        
        if success:
            # Optionnel: marquer l'email comme envoyé
            await db.surveillance_items.update_one(
                {"id": item_id},
                {"$set": {
                    "email_rappel_envoye": True,
                    "alerte_date": datetime.now(timezone.utc).isoformat(),
                    "rappel_manuel_par": current_user.get("id"),
                    "rappel_manuel_date": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "message": f"Email de rappel envoyé à {user.get('email')}"
            }
        else:
            raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email. Vérifiez la configuration SMTP.")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur envoi manuel rappel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Upload de pièces jointes ====================

@router.post("/items/{item_id}/upload")
async def upload_piece_jointe(
    item_id: str,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload une ou plusieurs pièces jointes pour un item"""
    try:
        item = await db.surveillance_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        upload_dir = Path("uploads/surveillance")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        existing_attachments = item.get("attachments", [])
        new_attachments = []
        
        for file in files:
            file_ext = Path(file.filename).suffix
            file_id = str(uuid.uuid4())
            unique_filename = f"{item_id}_{file_id}{file_ext}"
            file_path = upload_dir / unique_filename
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            attachment = {
                "id": file_id,
                "filename": file.filename,
                "url": f"/uploads/surveillance/{unique_filename}",
                "size": len(content),
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            new_attachments.append(attachment)
        
        all_attachments = existing_attachments + new_attachments
        
        await db.surveillance_items.update_one(
            {"id": item_id},
            {
                "$set": {
                    "attachments": all_attachments,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }
            }
        )
        
        return {
            "success": True,
            "attachments": new_attachments,
            "total_attachments": len(all_attachments)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur upload pièce jointe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}/attachments/{attachment_id}")
async def delete_attachment(
    item_id: str,
    attachment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprimer une pièce jointe"""
    try:
        item = await db.surveillance_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        attachments = item.get("attachments", [])
        attachment = next((a for a in attachments if a.get("id") == attachment_id), None)
        if not attachment:
            raise HTTPException(status_code=404, detail="Pièce jointe non trouvée")
        
        # Supprimer le fichier physique
        file_path = Path(attachment["url"].lstrip("/"))
        if file_path.exists():
            file_path.unlink()
        
        # Retirer de la liste
        new_attachments = [a for a in attachments if a.get("id") != attachment_id]
        await db.surveillance_items.update_one(
            {"id": item_id},
            {
                "$set": {
                    "attachments": new_attachments,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }
            }
        )
        
        return {"success": True, "message": "Pièce jointe supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression pièce jointe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Recherche ====================

@router.post("/search")
async def search_surveillance_items(
    search_request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Recherche dans les contrôles du plan de surveillance (style Manuel)"""
    try:
        query = search_request.get("query", "").lower().strip()
        if not query:
            return {"results": []}
        
        items = await db.surveillance_items.find({}, {"_id": 0}).to_list(length=None)
        
        results = []
        for item in items:
            score = 0.0
            
            # Champs à rechercher avec pondération
            fields = {
                "classe_type": 3.0,
                "category": 2.5,
                "executant": 2.0,
                "organisme_controle": 2.0,
                "batiment": 1.5,
                "description": 1.0,
                "commentaire": 1.0,
                "reference_reglementaire": 1.5,
                "numero_rapport": 2.0,
                "periodicite": 1.0,
                "resultat_controle": 1.0
            }
            
            matched_fields = []
            for field, weight in fields.items():
                value = str(item.get(field, "") or "").lower()
                if query in value:
                    score += weight
                    matched_fields.append(field)
            
            if score > 0:
                # Construire un extrait pertinent
                excerpt_parts = []
                if item.get("classe_type"):
                    excerpt_parts.append(item["classe_type"])
                if item.get("description"):
                    desc = item["description"]
                    idx = desc.lower().find(query)
                    if idx >= 0:
                        start = max(0, idx - 40)
                        excerpt_parts.append("..." + desc[start:start + 120] + "...")
                    else:
                        excerpt_parts.append(desc[:120])
                
                results.append({
                    "id": item.get("id"),
                    "classe_type": item.get("classe_type", ""),
                    "category": item.get("category", ""),
                    "batiment": item.get("batiment", ""),
                    "executant": item.get("executant", ""),
                    "periodicite": item.get("periodicite", ""),
                    "resultat_controle": item.get("resultat_controle"),
                    "derniere_visite": item.get("derniere_visite"),
                    "prochain_controle": item.get("prochain_controle"),
                    "status": item.get("status"),
                    "excerpt": " | ".join(excerpt_parts),
                    "matched_fields": matched_fields,
                    "relevance_score": score
                })
        
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return {"results": results[:20]}
    
    except Exception as e:
        logger.error(f"Erreur recherche surveillance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Import/Export ====================

@router.post("/import")
async def import_surveillance_data(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_admin_user)
):
    """Importer des données depuis un fichier CSV/Excel"""
    try:
        import pandas as pd
        from io import BytesIO
        
        content = await file.read()
        
        # Lire le fichier selon l'extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Format de fichier non supporté")
        
        # Mapper les colonnes
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                item = SurveillanceItem(
                    classe_type=str(row.get('classe_type', '')),
                    category=str(row.get('category', 'AUTRE')),
                    batiment=str(row.get('batiment', '')),
                    periodicite=str(row.get('periodicite', '')),
                    responsable=str(row.get('responsable', 'MAINT')),
                    executant=str(row.get('executant', '')),
                    description=str(row.get('description', '')) if pd.notna(row.get('description')) else None,
                    derniere_visite=str(row.get('derniere_visite', '')) if pd.notna(row.get('derniere_visite')) else None,
                    prochain_controle=str(row.get('prochain_controle', '')) if pd.notna(row.get('prochain_controle')) else None,
                    commentaire=str(row.get('commentaire', '')) if pd.notna(row.get('commentaire')) else None,
                    created_by=current_user.get("id"),
                    updated_by=current_user.get("id")
                )
                
                await db.surveillance_items.insert_one(item.model_dump())
                imported_count += 1
            except Exception as e:
                errors.append(f"Ligne {index + 2}: {str(e)}")
        
        return {
            "success": True,
            "imported_count": imported_count,
            "errors": errors[:10]  # Limiter à 10 erreurs
        }
    except Exception as e:
        logger.error(f"Erreur import données: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/template")
async def export_template(current_user: dict = Depends(get_current_user)):
    """Télécharger un template CSV pour l'import"""
    try:
        import pandas as pd
        from io import BytesIO
        from fastapi.responses import StreamingResponse
        
        # Créer un DataFrame avec les colonnes attendues
        template_data = {
            "classe_type": ["Protection incendie", "Installations électriques"],
            "category": ["INCENDIE", "ELECTRIQUE"],
            "batiment": ["BATIMENT 1", "BATIMENT 2"],
            "periodicite": ["6 mois", "1 an"],
            "responsable": ["MAINT", "PROD"],
            "executant": ["DESAUTEL", "APAVE"],
            "description": ["Contrôle des liaisons, zones, batterie", "Contrôle réglementaire"],
            "derniere_visite": ["2024-01-15", "2024-02-20"],
            "prochain_controle": ["2024-07-15", "2025-02-20"],
            "commentaire": ["RAS", "À planifier"]
        }
        
        df = pd.DataFrame(template_data)
        
        # Créer un buffer
        buffer = BytesIO()
        df.to_csv(buffer, index=False, encoding='utf-8-sig')
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=template_plan_surveillance.csv"
            }
        )
    except Exception as e:
        logger.error(f"Erreur export template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Vérification automatique des échéances ====================

@router.post("/check-due-dates")
async def check_due_dates(current_user: dict = Depends(get_current_user)):
    """
    Vérifier les dates d'échéance et mettre à jour automatiquement les statuts.
    
    Logique:
    - Pour chaque item avec statut "REALISE"
    - Si la date actuelle est dans la période de rappel (duree_rappel_echeance jours avant prochain_controle)
    - Alors changer le statut de "REALISE" à "PLANIFIER"
    
    Cet endpoint est appelé automatiquement au chargement de la page de surveillance.
    """
    try:
        today = datetime.now(timezone.utc).date()
        updated_count = 0
        
        # Récupérer tous les items avec statut REALISE
        items = await db.surveillance_items.find({
            "status": SurveillanceItemStatus.REALISE.value
        }).to_list(length=None)
        
        for item in items:
            # Vérifier si l'item a une date de prochain contrôle
            if not item.get("prochain_controle"):
                continue
            
            try:
                prochain_controle = datetime.fromisoformat(item["prochain_controle"]).date()
                duree_rappel = item.get("duree_rappel_echeance", 30)
                
                # Calculer la date de début de la période de rappel
                date_rappel = prochain_controle - timedelta(days=duree_rappel)
                
                # Si nous sommes dans la période de rappel ou après
                if today >= date_rappel:
                    # Mettre à jour le statut vers PLANIFIER
                    await db.surveillance_items.update_one(
                        {"id": item["id"]},
                        {
                            "$set": {
                                "status": SurveillanceItemStatus.PLANIFIER.value,
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                                "updated_by": "system_auto_check"
                            }
                        }
                    )
                    updated_count += 1
                    
                    logger.info(f"Item {item['id']} ({item.get('classe_type')}) statut changé de REALISE à PLANIFIER (échéance: {prochain_controle})")
            except Exception as e:
                logger.warning(f"Erreur traitement item {item.get('id')}: {str(e)}")
                continue
        
        return {
            "success": True,
            "updated_count": updated_count,
            "message": f"{updated_count} contrôle(s) mis à jour automatiquement"
        }
    except Exception as e:
        logger.error(f"Erreur vérification échéances: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ==================== Extraction IA de documents de contrôle ====================

@router.post("/ai/extract")
async def extract_surveillance_from_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyse un document de contrôle (PDF) via IA et extrait les informations
    pour créer un ou plusieurs contrôles dans le plan de surveillance.
    L'IA recherche aussi la périodicité réglementaire.
    """
    import tempfile
    import os
    import json

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé LLM non configurée")

        # Sauvegarder temporairement le fichier ET de façon permanente
        ext = os.path.splitext(file.filename)[1].lower()
        
        # Sauvegarde permanente pour rattachement aux contrôles
        upload_dir = Path("uploads/surveillance")
        upload_dir.mkdir(parents=True, exist_ok=True)
        permanent_file_id = str(uuid.uuid4())
        permanent_filename = f"ai_source_{permanent_file_id}{ext}"
        permanent_path = upload_dir / permanent_filename
        permanent_url = f"/uploads/surveillance/{permanent_filename}"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Sauvegarder aussi de façon permanente
        with open(permanent_path, "wb") as f:
            f.write(content)

        mime_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp"
        }
        mime_type = mime_map.get(ext, "application/pdf")

        # Étape 1 : Extraction des informations du document
        chat = LlmChat(
            api_key=api_key,
            session_id=f"surveillance_extract_{uuid.uuid4().hex[:8]}",
            system_message="""Tu es un expert en réglementation française de sécurité au travail et en contrôles réglementaires.
Analyse le document de contrôle/vérification fourni et extrais TOUS les types de contrôles distincts qu'il contient.

Un même document peut contenir plusieurs types de contrôles réglementaires différents (ex: levage, portes automatiques, EPI, installations électriques, etc.).
Pour CHAQUE type de contrôle distinct, crée une entrée séparée.

Réponds UNIQUEMENT avec un JSON valide, sans texte autour ni backticks.

Format attendu:
{
  "document_info": {
    "numero_rapport": "string - numéro du rapport ou null",
    "organisme_controle": "string - nom de l'organisme (APAVE, SOCOTEC, DEKRA, BUREAU VERITAS, etc.)",
    "date_intervention": "YYYY-MM-DD - date du contrôle",
    "site_controle": "string - nom/adresse du site contrôlé"
  },
  "controles": [
    {
      "classe_type": "string - type précis du contrôle (ex: 'Vérification périodique des chariots élévateurs', 'Thermographie infrarouge installations électriques', 'Vérification portes automatiques')",
      "category": "string parmi: ELECTRIQUE, INCENDIE, MANUTENTION, SECURITE_ENVIRONNEMENT, MMRI, EXTRACTION, AUTRE",
      "batiment": "string - bâtiment ou zone concernée",
      "executant": "string - nom de l'organisme qui a réalisé le contrôle",
      "description": "string - description détaillée de ce qui a été contrôlé, liste des équipements principaux",
      "derniere_visite": "YYYY-MM-DD - date de la visite/contrôle",
      "references_reglementaires": "string - toutes les références légales trouvées (articles Code du Travail, arrêtés, normes, etc.)",
      "resultat": "CONFORME|NON_CONFORME|AVEC_RESERVES",
      "anomalies": "string - description détaillée des anomalies/non-conformités trouvées ou null si aucune",
      "periodicite_detectee": "string - périodicité si explicitement mentionnée dans le document (ex: '1 an', '6 mois') ou null si non trouvée",
      "equipements_concernes": "string - liste résumée des équipements inspectés"
    }
  ]
}

IMPORTANT:
- Sépare bien les différents types de contrôles (levage ≠ portes automatiques ≠ EPI ≠ installations électriques)
- Pour la catégorie, utilise les valeurs exactes fournies
- Extrais TOUTES les références réglementaires mentionnées
- Si un contrôle montre des anomalies, mets le résultat à NON_CONFORME ou AVEC_RESERVES et détaille dans anomalies"""
        ).with_model("gemini", "gemini-2.5-flash")

        file_content = FileContentWithMimeType(
            file_path=tmp_path,
            mime_type=mime_type
        )

        response = await chat.send_message(UserMessage(
            text="Analyse ce document de contrôle réglementaire et extrais toutes les informations pour chaque type de contrôle distinct.",
            file_contents=[file_content]
        ))

        # Nettoyer le fichier temporaire
        os.unlink(tmp_path)

        # Parser la réponse JSON
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        extracted = json.loads(response_text)

        # Étape 2 : Pour chaque contrôle sans périodicité, rechercher via IA + connaissances réglementaires
        controles = extracted.get("controles", [])
        for ctrl in controles:
            if not ctrl.get("periodicite_detectee"):
                # Utiliser une seconde requête IA pour rechercher la périodicité réglementaire
                refs = ctrl.get("references_reglementaires", "")
                classe = ctrl.get("classe_type", "")
                category = ctrl.get("category", "")
                
                periodicity_chat = LlmChat(
                    api_key=api_key,
                    session_id=f"periodicity_search_{uuid.uuid4().hex[:8]}",
                    system_message="""Tu es un expert en réglementation française de sécurité au travail.
On te donne un type de contrôle et ses références réglementaires.
Tu dois déterminer la périodicité réglementaire obligatoire en France pour ce type de contrôle.

Réponds UNIQUEMENT avec un JSON valide, sans texte ni backticks:
{
  "periodicite": "string - la périodicité (ex: '1 an', '6 mois', '3 mois', '5 ans') ou null si introuvable",
  "source_reglementaire": "string - le texte de loi qui impose cette périodicité ou null",
  "confiance": "HAUTE|MOYENNE|BASSE - ton niveau de confiance dans cette réponse",
  "explication": "string - brève explication de la réglementation applicable"
}

Voici les principales périodicités réglementaires françaises:
- Installations électriques (vérification initiale + périodique): 1 an (Arrêté du 26/12/2011, Art. R4226-14 Code du Travail)
- Thermographie infrarouge APSAD D19: 1 an (recommandation APSAD)
- Appareils de levage (chariots élévateurs, ponts roulants): 1 an pour la VGP (Arrêté du 01/03/2004)
- Ascenseurs/monte-charges: 1 an (Arrêté du 29/12/2010)
- Portes et portails automatiques: 6 mois (Arrêté du 21/12/1993)
- Échafaudages roulants: 3 mois ou avant chaque utilisation (Arrêté du 21/12/2004)
- EPI contre les chutes: 12 mois (Arrêté du 19/03/1993)
- Extincteurs: 1 an (Arrêté du 20/05/1963, R4227-39 Code du Travail)
- SSI/détection incendie: 1 an (MS 73, PE 4)
- Installations de gaz: 1 an (Arrêté du 21/12/1993)
- Appareils à pression: selon catégorie (Arrêté du 20/11/2017)"""
                ).with_model("gemini", "gemini-2.5-flash")

                period_response = await periodicity_chat.send_message(UserMessage(
                    text=f"""Détermine la périodicité réglementaire pour ce contrôle:
- Type: {classe}
- Catégorie: {category}
- Références réglementaires trouvées dans le document: {refs}
- Équipements: {ctrl.get('equipements_concernes', 'Non précisé')}"""
                ))

                period_text = period_response.strip()
                if period_text.startswith("```"):
                    period_text = period_text.split("\n", 1)[1] if "\n" in period_text else period_text[3:]
                if period_text.endswith("```"):
                    period_text = period_text[:-3]
                period_text = period_text.strip()

                try:
                    period_data = json.loads(period_text)
                    ctrl["periodicite_detectee"] = period_data.get("periodicite")
                    ctrl["periodicite_source"] = period_data.get("source_reglementaire")
                    ctrl["periodicite_confiance"] = period_data.get("confiance", "BASSE")
                    ctrl["periodicite_explication"] = period_data.get("explication")
                except json.JSONDecodeError:
                    ctrl["periodicite_detectee"] = None
                    ctrl["periodicite_confiance"] = "BASSE"
                    ctrl["periodicite_explication"] = "Impossible de déterminer automatiquement"
            else:
                ctrl["periodicite_confiance"] = "HAUTE"
                ctrl["periodicite_source"] = ctrl.get("references_reglementaires")
                ctrl["periodicite_explication"] = "Périodicité trouvée directement dans le document"

        extracted["controles"] = controles
        return {
            "success": True, 
            "data": extracted,
            "source_file": {
                "id": permanent_file_id,
                "filename": file.filename,
                "url": permanent_url,
                "size": len(content)
            }
        }

    except json.JSONDecodeError:
        logger.error(f"Erreur parsing JSON de l'IA: {response_text[:300] if 'response_text' in dir() else 'N/A'}")
        return {"success": False, "error": "L'IA n'a pas pu extraire les informations correctement. Veuillez réessayer."}
    except ImportError:
        raise HTTPException(status_code=500, detail="Module emergentintegrations non installé")
    except Exception as e:
        logger.error(f"Erreur extraction IA surveillance: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {"success": False, "error": f"Erreur lors de l'extraction: {str(e)}"}


@router.post("/ai/create-batch")
async def create_batch_from_ai(
    items_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Crée plusieurs contrôles de surveillance à partir des données extraites par l'IA.
    Crée automatiquement un bon de travail curatif pour chaque non-conformité.
    """
    try:
        controles = items_data.get("controles", [])
        document_info = items_data.get("document_info", {})
        
        # Préparer la pièce jointe source si fournie
        source_file = items_data.get("source_file")
        source_attachment = None
        if source_file and source_file.get("url"):
            source_attachment = {
                "id": source_file.get("id", str(uuid.uuid4())),
                "filename": source_file.get("filename", "document.pdf"),
                "url": source_file.get("url"),
                "size": source_file.get("size", 0),
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
        
        created_items = []
        created_work_orders = []
        
        for ctrl in controles:
            # Calculer prochain_controle si on a periodicite + derniere_visite
            prochain_controle = None
            derniere_visite = ctrl.get("derniere_visite")
            periodicite = ctrl.get("periodicite")
            
            if derniere_visite and periodicite:
                try:
                    from dateutil.relativedelta import relativedelta
                    base_date = datetime.fromisoformat(derniere_visite)
                    period_lower = periodicite.lower().strip()
                    
                    import re
                    num_match = re.search(r'(\d+)', period_lower)
                    num = int(num_match.group(1)) if num_match else 1
                    
                    if 'an' in period_lower:
                        next_date = base_date + relativedelta(years=num)
                    elif 'mois' in period_lower:
                        next_date = base_date + relativedelta(months=num)
                    elif 'semaine' in period_lower:
                        next_date = base_date + timedelta(weeks=num)
                    elif 'jour' in period_lower:
                        next_date = base_date + timedelta(days=num)
                    else:
                        next_date = None
                    
                    if next_date:
                        prochain_controle = next_date.strftime("%Y-%m-%d")
                except Exception as e:
                    logger.warning(f"Erreur calcul prochain contrôle: {e}")
            
            # Construire le commentaire avec anomalies
            commentaire_parts = []
            if ctrl.get("anomalies"):
                commentaire_parts.append(f"ANOMALIES DÉTECTÉES:\n{ctrl['anomalies']}")
            if ctrl.get("equipements_concernes"):
                commentaire_parts.append(f"Équipements: {ctrl['equipements_concernes']}")
            commentaire = "\n\n".join(commentaire_parts) if commentaire_parts else None
            
            # Déterminer le résultat
            resultat_map = {
                "CONFORME": "Conforme",
                "NON_CONFORME": "Non conforme",
                "AVEC_RESERVES": "Avec réserves"
            }
            resultat = resultat_map.get(ctrl.get("resultat"), ctrl.get("resultat"))
            
            # Créer l'item de surveillance
            item = SurveillanceItem(
                classe_type=ctrl.get("classe_type", ""),
                category=ctrl.get("category", "AUTRE"),
                batiment=ctrl.get("batiment", ""),
                periodicite=ctrl.get("periodicite", "Non déterminée"),
                responsable=SurveillanceResponsible.EXTERNE,
                executant=ctrl.get("executant", document_info.get("organisme_controle", "")),
                description=ctrl.get("description"),
                derniere_visite=derniere_visite,
                prochain_controle=prochain_controle,
                status=SurveillanceItemStatus.REALISE,
                date_realisation=derniere_visite,
                commentaire=commentaire,
                reference_reglementaire=ctrl.get("references_reglementaires"),
                numero_rapport=document_info.get("numero_rapport"),
                organisme_controle=document_info.get("organisme_controle"),
                resultat_controle=resultat,
                attachments=[source_attachment] if source_attachment else [],
                created_by=current_user.get("id"),
                updated_by=current_user.get("id")
            )
            
            item_dict = item.model_dump()
            await db.surveillance_items.insert_one(item_dict)
            
            if "_id" in item_dict:
                del item_dict["_id"]
            
            created_items.append(item_dict)
            
            # Audit
            await audit_service.log_action(
                user_id=current_user["id"],
                user_name=f"{current_user['prenom']} {current_user['nom']}",
                user_email=current_user["email"],
                action=ActionType.CREATE,
                entity_type=EntityType.SURVEILLANCE,
                entity_id=item.id,
                entity_name=f"Plan surveillance (IA): {item.classe_type}"
            )
            
            # Si non-conformité, créer automatiquement un bon de travail curatif
            if ctrl.get("resultat") in ("NON_CONFORME", "AVEC_RESERVES") and ctrl.get("anomalies"):
                from bson import ObjectId as BsonObjectId
                
                wo_count = await db.work_orders.count_documents({})
                wo_numero = str(5800 + wo_count + 1)
                
                wo_dict = {
                    "_id": BsonObjectId(),
                    "titre": f"[Curatif] {ctrl.get('classe_type', 'Contrôle')} - Non-conformité",
                    "description": f"Non-conformité détectée lors du contrôle réglementaire.\n\n"
                                   f"Organisme: {document_info.get('organisme_controle', 'N/A')}\n"
                                   f"Date du contrôle: {ctrl.get('derniere_visite', 'N/A')}\n"
                                   f"Rapport: {document_info.get('numero_rapport', 'N/A')}\n\n"
                                   f"ANOMALIES:\n{ctrl.get('anomalies', '')}",
                    "statut": "OUVERT",
                    "priorite": "HAUTE",
                    "categorie": "TRAVAUX_CURATIF",
                    "equipement_id": None,
                    "assigne_a_id": None,
                    "emplacement_id": None,
                    "dateLimite": None,
                    "tempsEstime": None,
                    "tempsReel": None,
                    "createdBy": current_user.get("id"),
                    "numero": wo_numero,
                    "dateCreation": datetime.now(timezone.utc),
                    "dateTermine": None,
                    "attachments": [],
                    "comments": [],
                    "parts_used": [],
                    "service": None,
                    "surveillance_item_id": item.id
                }
                wo_dict["id"] = str(wo_dict["_id"])
                
                await db.work_orders.insert_one(wo_dict)
                
                # Audit du bon de travail
                await audit_service.log_action(
                    user_id=current_user["id"],
                    user_name=f"{current_user['prenom']} {current_user['nom']}",
                    user_email=current_user["email"],
                    action=ActionType.CREATE,
                    entity_type=EntityType.WORK_ORDER,
                    entity_id=wo_dict["id"],
                    entity_name=wo_dict["titre"],
                    details=f"BT curatif #{wo_numero} créé auto depuis contrôle IA"
                )
                
                created_work_orders.append({
                    "id": wo_dict["id"],
                    "numero": wo_numero,
                    "titre": wo_dict["titre"],
                    "anomalies": ctrl.get("anomalies")
                })
            
            # Broadcast WebSocket
            if realtime_manager:
                await realtime_manager.emit_event(
                    "surveillance_plans",
                    "created",
                    item_dict,
                    user_id=current_user["id"]
                )
        
        # Archiver automatiquement l'analyse IA (Phase 1)
        result_counts = {"CONFORME": 0, "NON_CONFORME": 0, "AVEC_RESERVES": 0}
        categories_set = set()
        for ctrl in controles:
            r = ctrl.get("resultat", "")
            if r in result_counts:
                result_counts[r] += 1
            cat = ctrl.get("category")
            if cat:
                categories_set.add(cat)
        
        history_entry = AIAnalysisHistory(
            filename=items_data.get("filename", "document.pdf"),
            file_size=items_data.get("file_size"),
            organisme_controle=document_info.get("organisme_controle"),
            date_intervention=document_info.get("date_intervention"),
            numero_rapport=document_info.get("numero_rapport"),
            site_controle=document_info.get("site_controle"),
            controles_count=len(created_items),
            conformes_count=result_counts["CONFORME"],
            non_conformes_count=result_counts["NON_CONFORME"],
            avec_reserves_count=result_counts["AVEC_RESERVES"],
            created_item_ids=[item["id"] for item in created_items],
            created_work_order_ids=[wo["id"] for wo in created_work_orders],
            raw_extracted_data=items_data,
            categories=list(categories_set),
            analyzed_by=current_user.get("id"),
            analyzed_by_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
        )
        
        history_dict = history_entry.model_dump()
        await db.ai_analysis_history.insert_one(history_dict)
        if "_id" in history_dict:
            del history_dict["_id"]
        
        return {
            "success": True,
            "created_count": len(created_items),
            "created_items": created_items,
            "work_orders_created": created_work_orders,
            "analysis_id": history_entry.id,
            "message": f"{len(created_items)} contrôle(s) créé(s)" + 
                       (f", {len(created_work_orders)} bon(s) de travail curatif(s) créé(s)" if created_work_orders else "")
        }
    
    except Exception as e:
        logger.error(f"Erreur création batch surveillance: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Historique des analyses IA (Phase 1 & 2) ====================

@router.get("/ai/history")
async def get_ai_analysis_history(
    limit: int = 50,
    skip: int = 0,
    organisme: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer l'historique des analyses IA"""
    try:
        query = {}
        if organisme:
            query["organisme_controle"] = {"$regex": organisme, "$options": "i"}
        if category:
            query["categories"] = category
        
        total = await db.ai_analysis_history.count_documents(query)
        items = await db.ai_analysis_history.find(
            query, {"_id": 0, "raw_extracted_data": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
        
        return {
            "total": total,
            "items": items
        }
    except Exception as e:
        logger.error(f"Erreur récupération historique IA: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai/history/{analysis_id}")
async def get_ai_analysis_detail(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le détail d'une analyse IA"""
    try:
        item = await db.ai_analysis_history.find_one({"id": analysis_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Analyse non trouvée")
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération détail analyse: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Tableau de bord & Tendances IA (Phase 3) ====================

@router.get("/ai/analytics")
async def get_ai_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Statistiques et tendances des analyses IA"""
    try:
        all_analyses = await db.ai_analysis_history.find(
            {}, {"_id": 0, "raw_extracted_data": 0}
        ).sort("created_at", -1).to_list(length=None)
        
        total_analyses = len(all_analyses)
        if total_analyses == 0:
            return {
                "kpis": {
                    "total_analyses": 0,
                    "total_controles": 0,
                    "taux_conformite": 0,
                    "total_non_conformites": 0,
                    "total_work_orders": 0
                },
                "evolution_mensuelle": [],
                "par_organisme": [],
                "par_categorie": [],
                "par_resultat": [],
                "tendances_degradation": []
            }
        
        # KPIs globaux
        total_controles = sum(a.get("controles_count", 0) for a in all_analyses)
        total_conformes = sum(a.get("conformes_count", 0) for a in all_analyses)
        total_non_conformes = sum(a.get("non_conformes_count", 0) for a in all_analyses)
        total_avec_reserves = sum(a.get("avec_reserves_count", 0) for a in all_analyses)
        total_wo = sum(len(a.get("created_work_order_ids", [])) for a in all_analyses)
        
        taux_conformite = round((total_conformes / total_controles * 100) if total_controles > 0 else 0, 1)
        
        # Évolution mensuelle (12 derniers mois)
        evolution = {}
        now = datetime.now(timezone.utc)
        for i in range(11, -1, -1):
            month_date = now - timedelta(days=i * 30)
            key = month_date.strftime("%Y-%m")
            evolution[key] = {"mois": key, "analyses": 0, "controles": 0, "conformes": 0, "non_conformes": 0}
        
        for a in all_analyses:
            try:
                date_str = a.get("created_at", "")
                if date_str:
                    month_key = date_str[:7]  # YYYY-MM
                    if month_key in evolution:
                        evolution[month_key]["analyses"] += 1
                        evolution[month_key]["controles"] += a.get("controles_count", 0)
                        evolution[month_key]["conformes"] += a.get("conformes_count", 0)
                        evolution[month_key]["non_conformes"] += a.get("non_conformes_count", 0)
            except Exception:
                pass
        
        evolution_list = list(evolution.values())
        # Calculer taux conformité mensuel
        for e in evolution_list:
            total_m = e["conformes"] + e["non_conformes"]
            e["taux_conformite"] = round((e["conformes"] / total_m * 100) if total_m > 0 else 0, 1)
        
        # Par organisme
        organismes = {}
        for a in all_analyses:
            org = a.get("organisme_controle") or "Non précisé"
            if org not in organismes:
                organismes[org] = {"organisme": org, "analyses": 0, "controles": 0, "non_conformites": 0}
            organismes[org]["analyses"] += 1
            organismes[org]["controles"] += a.get("controles_count", 0)
            organismes[org]["non_conformites"] += a.get("non_conformes_count", 0)
        
        # Par catégorie
        categories = {}
        for a in all_analyses:
            for cat in a.get("categories", []):
                if cat not in categories:
                    categories[cat] = {"categorie": cat, "analyses": 0, "conformes": 0, "non_conformes": 0, "avec_reserves": 0}
                categories[cat]["analyses"] += 1
            for cat in a.get("categories", []):
                categories[cat]["conformes"] += a.get("conformes_count", 0)
                categories[cat]["non_conformes"] += a.get("non_conformes_count", 0)
                categories[cat]["avec_reserves"] += a.get("avec_reserves_count", 0)
        
        # Par résultat (pour pie chart)
        par_resultat = [
            {"id": "Conforme", "label": "Conforme", "value": total_conformes, "color": "#10b981"},
            {"id": "Non conforme", "label": "Non conforme", "value": total_non_conformes, "color": "#ef4444"},
            {"id": "Avec réserves", "label": "Avec réserves", "value": total_avec_reserves, "color": "#f59e0b"}
        ]
        
        # Phase 4: Détection de tendances de dégradation
        tendances = await _detect_degradation_trends(all_analyses)
        
        return {
            "kpis": {
                "total_analyses": total_analyses,
                "total_controles": total_controles,
                "taux_conformite": taux_conformite,
                "total_non_conformites": total_non_conformes + total_avec_reserves,
                "total_work_orders": total_wo
            },
            "evolution_mensuelle": evolution_list,
            "par_organisme": list(organismes.values()),
            "par_categorie": list(categories.values()),
            "par_resultat": [r for r in par_resultat if r["value"] > 0],
            "tendances_degradation": tendances
        }
    except Exception as e:
        logger.error(f"Erreur analytics IA: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Alertes intelligentes (Phase 4) ====================

async def _detect_degradation_trends(all_analyses):
    """Détecte les tendances de dégradation à partir de l'historique"""
    trends = []
    
    # Regrouper par catégorie + organisme pour voir les évolutions
    type_history = {}
    for a in sorted(all_analyses, key=lambda x: x.get("created_at", "")):
        for cat in a.get("categories", []):
            key = cat
            if key not in type_history:
                type_history[key] = []
            type_history[key].append({
                "date": a.get("created_at", "")[:10],
                "conformes": a.get("conformes_count", 0),
                "non_conformes": a.get("non_conformes_count", 0),
                "avec_reserves": a.get("avec_reserves_count", 0),
                "organisme": a.get("organisme_controle")
            })
    
    for cat, history in type_history.items():
        if len(history) < 2:
            continue
        
        # Vérifier les 2 dernières analyses
        recent = history[-2:]
        last_nc = recent[-1]["non_conformes"] + recent[-1]["avec_reserves"]
        prev_nc = recent[-2]["non_conformes"] + recent[-2]["avec_reserves"]
        
        if last_nc > 0 and prev_nc > 0:
            trends.append({
                "type": "degradation_consecutive",
                "severity": "HAUTE",
                "categorie": cat,
                "message": f"Non-conformités consécutives sur {cat} ({recent[-2]['date']} et {recent[-1]['date']})",
                "details": f"Dernière analyse: {last_nc} NC, Précédente: {prev_nc} NC",
                "last_date": recent[-1]["date"]
            })
        elif last_nc > prev_nc and last_nc > 0:
            trends.append({
                "type": "degradation_increase",
                "severity": "MOYENNE",
                "categorie": cat,
                "message": f"Augmentation des non-conformités sur {cat}",
                "details": f"Passage de {prev_nc} à {last_nc} non-conformité(s)",
                "last_date": recent[-1]["date"]
            })
    
    return trends


@router.get("/ai/alerts")
async def get_ai_smart_alerts(
    current_user: dict = Depends(get_current_user)
):
    """Récupérer les alertes intelligentes basées sur l'historique IA"""
    try:
        all_analyses = await db.ai_analysis_history.find(
            {}, {"_id": 0, "raw_extracted_data": 0}
        ).sort("created_at", -1).to_list(length=None)
        
        alerts = []
        
        # 1. Tendances de dégradation
        tendances = await _detect_degradation_trends(all_analyses)
        for t in tendances:
            alerts.append({
                "type": "degradation",
                "severity": t["severity"],
                "title": t["message"],
                "details": t["details"],
                "categorie": t["categorie"],
                "date": t["last_date"]
            })
        
        # 2. Catégories avec taux de conformité bas
        cat_stats = {}
        for a in all_analyses:
            for cat in a.get("categories", []):
                if cat not in cat_stats:
                    cat_stats[cat] = {"conformes": 0, "total": 0}
                cat_stats[cat]["conformes"] += a.get("conformes_count", 0)
                cat_stats[cat]["total"] += a.get("controles_count", 0)
        
        for cat, stats in cat_stats.items():
            if stats["total"] >= 2:
                taux = (stats["conformes"] / stats["total"] * 100) if stats["total"] > 0 else 0
                if taux < 70:
                    alerts.append({
                        "type": "low_conformity",
                        "severity": "HAUTE" if taux < 50 else "MOYENNE",
                        "title": f"Taux de conformité bas: {cat} ({round(taux, 1)}%)",
                        "details": f"{stats['conformes']}/{stats['total']} contrôles conformes",
                        "categorie": cat,
                        "date": None
                    })
        
        # 3. Vérifier les contrôles non-conformes sans BT curatif
        recent_nc = [a for a in all_analyses if a.get("non_conformes_count", 0) > 0 and not a.get("created_work_order_ids")]
        for a in recent_nc[:5]:
            alerts.append({
                "type": "missing_wo",
                "severity": "HAUTE",
                "title": "Non-conformité sans bon de travail curatif",
                "details": f"Analyse du {a.get('created_at', '')[:10]} - {a.get('organisme_controle', 'N/A')}",
                "categorie": ", ".join(a.get("categories", [])),
                "date": a.get("created_at", "")[:10]
            })
        
        # Trier par sévérité
        severity_order = {"HAUTE": 0, "MOYENNE": 1, "BASSE": 2}
        alerts.sort(key=lambda x: severity_order.get(x["severity"], 3))
        
        return {
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Erreur alertes intelligentes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def send_surveillance_reminder_email(user_email: str, user_name: str, item: dict):
    """
    Envoie un email de rappel d'échéance pour un contrôle de surveillance.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os
    
    try:
        # Configuration SMTP
        smtp_server = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        if not smtp_user or not smtp_password:
            logger.warning("Configuration SMTP manquante pour l'envoi d'email de rappel surveillance")
            return False
        
        # Extraire les informations du contrôle
        classe_type = item.get("classe_type", "Contrôle")
        batiment = item.get("batiment", "Non spécifié")
        prochain_controle = item.get("prochain_controle", "Non spécifié")
        
        # Formater la date
        if prochain_controle and prochain_controle != "Non spécifié":
            try:
                date_obj = datetime.fromisoformat(prochain_controle)
                prochain_controle_formatted = date_obj.strftime("%d/%m/%Y")
            except:
                prochain_controle_formatted = prochain_controle
        else:
            prochain_controle_formatted = "Non spécifié"
        
        # Créer le message
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = user_email
        msg['Subject'] = f"[GMAO] Rappel - Contrôle à venir : {classe_type}"
        
        # Corps du message HTML
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">📋 Rappel de Contrôle</h1>
                </div>
                
                <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                    <p>Bonjour {user_name},</p>
                    
                    <p>Ce message vous est envoyé pour vous informer qu'un contrôle du plan de surveillance arrive à échéance prochainement.</p>
                    
                    <div style="background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 10px 0; color: #1e40af;">📌 Détails du contrôle</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold; width: 150px;">Nom du contrôle :</td>
                                <td style="padding: 5px 0;">{classe_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Équipement/Bâtiment :</td>
                                <td style="padding: 5px 0;">{batiment}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Date d'échéance :</td>
                                <td style="padding: 5px 0; color: #dc2626; font-weight: bold;">{prochain_controle_formatted}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p>Merci de prendre les dispositions nécessaires pour planifier ce contrôle dans les délais.</p>
                    
                    <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
                        Ce message est généré automatiquement par le système GMAO.<br>
                        Merci de ne pas répondre à cet email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Envoyer l'email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"✅ Email de rappel surveillance envoyé à {user_email} pour le contrôle {classe_type}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur envoi email rappel surveillance: {str(e)}")
        return False


async def check_surveillance_reminders():
    """
    Vérifie les contrôles de surveillance et envoie des emails de rappel.
    Cette fonction est appelée quotidiennement par le scheduler.
    
    Logique:
    - Pour chaque item avec un responsable_notification_id et un prochain_controle
    - Si la date actuelle = prochain_controle - duree_rappel_echeance
    - Et que l'email n'a pas déjà été envoyé (email_rappel_envoye = False)
    - Alors envoyer l'email et marquer email_rappel_envoye = True
    """
    try:
        logger.info("🔔 Vérification des rappels de surveillance...")
        today = datetime.now(timezone.utc).date()
        emails_sent = 0
        
        # Récupérer tous les items avec un responsable de notification
        items = await db.surveillance_items.find({
            "responsable_notification_id": {"$ne": None, "$exists": True},
            "email_rappel_envoye": {"$ne": True},
            "prochain_controle": {"$ne": None, "$exists": True}
        }).to_list(length=None)
        
        for item in items:
            try:
                # Vérifier si l'item a une date de prochain contrôle
                prochain_controle_str = item.get("prochain_controle")
                if not prochain_controle_str:
                    continue
                
                prochain_controle = datetime.fromisoformat(prochain_controle_str).date()
                duree_rappel = item.get("duree_rappel_echeance", 30)
                
                # Calculer la date de rappel
                date_rappel = prochain_controle - timedelta(days=duree_rappel)
                
                # Si aujourd'hui est le jour du rappel
                if today == date_rappel:
                    # Récupérer les informations de l'utilisateur
                    user_id = item.get("responsable_notification_id")
                    user = await db.users.find_one({"id": user_id})
                    
                    if not user:
                        # Essayer avec _id
                        from bson import ObjectId
                        try:
                            user = await db.users.find_one({"_id": ObjectId(user_id)})
                        except:
                            pass
                    
                    if user and user.get("email"):
                        user_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or user.get("email")
                        
                        # Envoyer l'email
                        success = await send_surveillance_reminder_email(
                            user_email=user.get("email"),
                            user_name=user_name,
                            item=item
                        )
                        
                        if success:
                            # Marquer l'email comme envoyé
                            await db.surveillance_items.update_one(
                                {"id": item["id"]},
                                {"$set": {
                                    "email_rappel_envoye": True,
                                    "alerte_date": datetime.now(timezone.utc).isoformat()
                                }}
                            )
                            emails_sent += 1
                    else:
                        logger.warning(f"Utilisateur {user_id} non trouvé ou sans email pour le contrôle {item.get('id')}")
                
            except Exception as e:
                logger.warning(f"Erreur traitement rappel item {item.get('id')}: {str(e)}")
                continue
        
        logger.info(f"🔔 {emails_sent} email(s) de rappel de surveillance envoyé(s)")
        return emails_sent
        
    except Exception as e:
        logger.error(f"❌ Erreur vérification rappels surveillance: {str(e)}")
        return 0
