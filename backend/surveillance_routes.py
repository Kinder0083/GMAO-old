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
    ActionType,
    EntityType
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


# ==================== CRUD Routes ====================

@router.get("/items", response_model=List[dict])
async def get_surveillance_items(
    category: Optional[str] = None,
    responsable: Optional[str] = None,
    batiment: Optional[str] = None,
    status: Optional[str] = None,
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
    """Créer un nouvel item de surveillance"""
    try:
        item = SurveillanceItem(
            **item_data.model_dump(),
            created_by=current_user.get("id"),
            updated_by=current_user.get("id")
        )
        
        item_dict = item.model_dump()
        await db.surveillance_items.insert_one(item_dict)
        
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


@router.delete("/items/{item_id}")
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
async def get_surveillance_stats(current_user: dict = Depends(get_current_user)):
    """Récupérer les statistiques globales du plan de surveillance"""
    try:
        items = await db.surveillance_items.find().to_list(length=None)
        
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


# ==================== Upload de pièces jointes ====================

@router.post("/items/{item_id}/upload")
async def upload_piece_jointe(
    item_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload une pièce jointe pour un item"""
    try:
        # Vérifier que l'item existe
        item = await db.surveillance_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Item non trouvé")
        
        # Créer le répertoire uploads/surveillance si nécessaire
        upload_dir = Path("uploads/surveillance")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Générer un nom de fichier unique
        file_ext = Path(file.filename).suffix
        unique_filename = f"{item_id}_{uuid.uuid4()}{file_ext}"
        file_path = upload_dir / unique_filename
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Mettre à jour l'item avec l'URL du fichier
        file_url = f"/uploads/surveillance/{unique_filename}"
        await db.surveillance_items.update_one(
            {"id": item_id},
            {
                "$set": {
                    "piece_jointe_url": file_url,
                    "piece_jointe_nom": file.filename,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": current_user.get("id")
                }
            }
        )
        
        return {
            "success": True,
            "file_url": file_url,
            "file_name": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur upload pièce jointe: {str(e)}")
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
