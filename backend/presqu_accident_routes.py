"""
Routes API pour les Presqu'accidents (Near Miss)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging

from models import (
    PresquAccidentItem,
    PresquAccidentItemCreate,
    PresquAccidentItemUpdate,
    PresquAccidentStatus,
    PresquAccidentService,
    PresquAccidentSeverity,
    ActionType,
    EntityType
)
from dependencies import get_current_user, get_current_admin_user
from audit_service import AuditService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/presqu-accident", tags=["presqu-accident"])

# Variables globales (seront injectées depuis server.py)
db = None
audit_service = None
realtime_manager = None

def init_presqu_accident_routes(database, audit_svc, realtime_mgr=None):
    """Initialise les routes avec la connexion DB, audit service et realtime manager"""
    global db, audit_service, realtime_manager
    db = database
    audit_service = audit_svc
    realtime_manager = realtime_mgr


# ==================== CRUD Routes ====================

@router.get("/items", response_model=List[dict])
async def get_presqu_accident_items(
    service: Optional[str] = None,
    status: Optional[str] = None,
    severite: Optional[str] = None,
    lieu: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer tous les presqu'accidents avec filtres"""
    try:
        query = {}
        
        if service:
            query["service"] = service
        if status:
            query["status"] = status
        if severite:
            query["severite"] = severite
        if lieu:
            query["lieu"] = {"$regex": lieu, "$options": "i"}
        
        items = await db.presqu_accident_items.find(query).to_list(length=None)
        
        # Convertir _id en string
        for item in items:
            if "_id" in item:
                del item["_id"]
        
        return items
    except Exception as e:
        logger.error(f"Erreur récupération presqu'accidents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/{item_id}")
async def get_presqu_accident_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer un presqu'accident spécifique"""
    try:
        item = await db.presqu_accident_items.find_one({"id": item_id})
        
        if not item:
            raise HTTPException(status_code=404, detail="Presqu'accident non trouvé")
        
        if "_id" in item:
            del item["_id"]
        
        return item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération presqu'accident {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items")
async def create_presqu_accident_item(
    item_data: PresquAccidentItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Créer un nouveau presqu'accident"""
    try:
        item = PresquAccidentItem(
            **item_data.model_dump(),
            created_by=current_user.get("id"),
            updated_by=current_user.get("id")
        )
        
        item_dict = item.model_dump()
        await db.presqu_accident_items.insert_one(item_dict)
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.PRESQU_ACCIDENT,
            entity_id=item.id,
            entity_name=f"Presqu'accident: {item.titre}"
        )
        
        if "_id" in item_dict:
            del item_dict["_id"]
        
        return item_dict
    except Exception as e:
        logger.error(f"Erreur création presqu'accident: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_presqu_accident_item(
    item_id: str,
    item_update: PresquAccidentItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mettre à jour un presqu'accident"""
    try:
        # Vérifier que l'item existe
        existing = await db.presqu_accident_items.find_one({"id": item_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Presqu'accident non trouvé")
        
        # Préparer les mises à jour
        update_data = {
            k: v for k, v in item_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        # Si le statut passe à TERMINE, ajouter la date de clôture
        if update_data.get("status") == PresquAccidentStatus.TERMINE.value and not existing.get("date_cloture"):
            update_data["date_cloture"] = datetime.now(timezone.utc).isoformat()
        
        # Mettre à jour
        await db.presqu_accident_items.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        
        # Récupérer l'item mis à jour
        updated_item = await db.presqu_accident_items.find_one({"id": item_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.UPDATE,
            entity_type=EntityType.PRESQU_ACCIDENT,
            entity_id=item_id,
            entity_name=f"Presqu'accident: {existing.get('titre')}"
        )
        
        if "_id" in updated_item:
            del updated_item["_id"]
        
        return updated_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour presqu'accident {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}")
async def delete_presqu_accident_item(
    item_id: str,
    current_user: dict = Depends(get_current_admin_user)
):
    """Supprimer un presqu'accident (Admin/QHSE uniquement)"""
    try:
        item = await db.presqu_accident_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Presqu'accident non trouvé")
        
        await db.presqu_accident_items.delete_one({"id": item_id})
        
        # Audit
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user['prenom']} {current_user['nom']}",
            user_email=current_user["email"],
            action=ActionType.DELETE,
            entity_type=EntityType.PRESQU_ACCIDENT,
            entity_id=item_id,
            entity_name=f"Presqu'accident: {item.get('titre')}"
        )
        
        return {"success": True, "message": "Presqu'accident supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression presqu'accident {item_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Statistiques et Indicateurs ====================

@router.get("/stats")
async def get_presqu_accident_stats(current_user: dict = Depends(get_current_user)):
    """Récupérer les statistiques globales des presqu'accidents"""
    try:
        items = await db.presqu_accident_items.find().to_list(length=None)
        
        total = len(items)
        a_traiter = len([i for i in items if i.get("status") == PresquAccidentStatus.A_TRAITER.value])
        en_cours = len([i for i in items if i.get("status") == PresquAccidentStatus.EN_COURS.value])
        termine = len([i for i in items if i.get("status") == PresquAccidentStatus.TERMINE.value])
        archive = len([i for i in items if i.get("status") == PresquAccidentStatus.ARCHIVE.value])
        
        # Par service
        by_service = {}
        for svc in PresquAccidentService:
            svc_items = [i for i in items if i.get("service") == svc.value]
            svc_termine = len([i for i in svc_items if i.get("status") == PresquAccidentStatus.TERMINE.value])
            by_service[svc.value] = {
                "total": len(svc_items),
                "termine": svc_termine,
                "pourcentage": round((svc_termine / len(svc_items) * 100) if svc_items else 0, 1)
            }
        
        # Par sévérité
        by_severite = {}
        for sev in PresquAccidentSeverity:
            sev_items = [i for i in items if i.get("severite") == sev.value]
            by_severite[sev.value] = len(sev_items)
        
        return {
            "global": {
                "total": total,
                "a_traiter": a_traiter,
                "en_cours": en_cours,
                "termine": termine,
                "archive": archive,
                "pourcentage_traitement": round((termine / total * 100) if total > 0 else 0, 1)
            },
            "by_service": by_service,
            "by_severite": by_severite
        }
    except Exception as e:
        logger.error(f"Erreur récupération statistiques: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rapport-stats")
async def get_rapport_stats(current_user: dict = Depends(get_current_user)):
    """
    Récupérer les statistiques complètes pour la page Rapport
    Inclut tous les KPIs : taux de traitement par service, sévérité, lieu, etc.
    """
    try:
        items = await db.presqu_accident_items.find().to_list(length=None)
        
        total = len(items)
        if total == 0:
            return {
                "global": {
                    "total": 0,
                    "a_traiter": 0,
                    "en_cours": 0,
                    "termine": 0,
                    "archive": 0,
                    "pourcentage_traitement": 0,
                    "delai_moyen_traitement": 0,
                    "en_retard": 0
                },
                "by_service": {},
                "by_severite": {},
                "by_lieu": {},
                "by_month": {}
            }
        
        today = datetime.now(timezone.utc).date()
        
        # Statistiques globales
        a_traiter = [i for i in items if i.get("status") == PresquAccidentStatus.A_TRAITER.value]
        en_cours = [i for i in items if i.get("status") == PresquAccidentStatus.EN_COURS.value]
        termine = [i for i in items if i.get("status") == PresquAccidentStatus.TERMINE.value]
        archive = [i for i in items if i.get("status") == PresquAccidentStatus.ARCHIVE.value]
        
        # Calculer le délai moyen de traitement (en jours)
        delais = []
        for item in termine:
            if item.get("date_incident") and item.get("date_cloture"):
                try:
                    date_incident = datetime.fromisoformat(item["date_incident"]).date()
                    date_cloture = datetime.fromisoformat(item["date_cloture"]).date()
                    delais.append((date_cloture - date_incident).days)
                except:
                    pass
        delai_moyen = round(sum(delais) / len(delais)) if delais else 0
        
        # Compter les items en retard (actions avec échéance dépassée et non terminés)
        en_retard = 0
        for item in items:
            if item.get("status") not in [PresquAccidentStatus.TERMINE.value, PresquAccidentStatus.ARCHIVE.value]:
                if item.get("date_echeance_action"):
                    try:
                        echeance = datetime.fromisoformat(item["date_echeance_action"]).date()
                        if echeance < today:
                            en_retard += 1
                    except:
                        pass
        
        # Par service
        by_service = {}
        for svc in PresquAccidentService:
            svc_items = [i for i in items if i.get("service") == svc.value]
            svc_termine = len([i for i in svc_items if i.get("status") == PresquAccidentStatus.TERMINE.value])
            by_service[svc.value] = {
                "total": len(svc_items),
                "termine": svc_termine,
                "pourcentage": round((svc_termine / len(svc_items) * 100) if svc_items else 0, 1)
            }
        
        # Par sévérité
        by_severite = {}
        for sev in PresquAccidentSeverity:
            sev_items = [i for i in items if i.get("severite") == sev.value]
            sev_termine = len([i for i in sev_items if i.get("status") == PresquAccidentStatus.TERMINE.value])
            by_severite[sev.value] = {
                "total": len(sev_items),
                "termine": sev_termine,
                "pourcentage": round((sev_termine / len(sev_items) * 100) if sev_items else 0, 1)
            }
        
        # Par lieu (top 10)
        by_lieu = {}
        lieux = set([i.get("lieu", "Non spécifié") for i in items])
        for lieu in lieux:
            lieu_items = [i for i in items if i.get("lieu") == lieu]
            lieu_termine = len([i for i in lieu_items if i.get("status") == PresquAccidentStatus.TERMINE.value])
            by_lieu[lieu] = {
                "total": len(lieu_items),
                "termine": lieu_termine,
                "pourcentage": round((lieu_termine / len(lieu_items) * 100) if lieu_items else 0, 1)
            }
        
        # Par mois (12 derniers mois)
        by_month = {}
        for i in range(12):
            month_start = (datetime.now(timezone.utc) - timedelta(days=30*i)).replace(day=1)
            month_key = month_start.strftime("%Y-%m")
            month_items = []
            for item in items:
                if item.get("date_incident"):
                    try:
                        incident_date = datetime.fromisoformat(item["date_incident"])
                        if incident_date.strftime("%Y-%m") == month_key:
                            month_items.append(item)
                    except:
                        pass
            by_month[month_key] = len(month_items)
        
        return {
            "global": {
                "total": total,
                "a_traiter": len(a_traiter),
                "en_cours": len(en_cours),
                "termine": len(termine),
                "archive": len(archive),
                "pourcentage_traitement": round((len(termine) / total * 100), 1),
                "delai_moyen_traitement": delai_moyen,
                "en_retard": en_retard
            },
            "by_service": by_service,
            "by_severite": by_severite,
            "by_lieu": dict(sorted(by_lieu.items(), key=lambda x: x[1]["total"], reverse=True)[:10]),
            "by_month": dict(sorted(by_month.items()))
        }
    except Exception as e:
        logger.error(f"Erreur récupération rapport stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/badge-stats")
async def get_badge_stats(current_user: dict = Depends(get_current_user)):
    """
    Récupérer les statistiques pour le badge de notification du header
    - Nombre de presqu'accidents à traiter
    - Nombre d'actions en retard
    """
    try:
        items = await db.presqu_accident_items.find().to_list(length=None)
        
        total = len(items)
        if total == 0:
            return {
                "a_traiter": 0,
                "en_retard": 0
            }
        
        # Compter les items à traiter
        a_traiter = len([i for i in items if i.get("status") == PresquAccidentStatus.A_TRAITER.value])
        
        # Compter les items en retard
        en_retard = 0
        today = datetime.now(timezone.utc).date()
        
        for item in items:
            if item.get("status") not in [PresquAccidentStatus.TERMINE.value, PresquAccidentStatus.ARCHIVE.value]:
                if item.get("date_echeance_action"):
                    try:
                        echeance = datetime.fromisoformat(item["date_echeance_action"]).date()
                        if echeance < today:
                            en_retard += 1
                    except:
                        pass
        
        return {
            "a_traiter": a_traiter,
            "en_retard": en_retard
        }
    except Exception as e:
        logger.error(f"Erreur récupération badge stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_presqu_accident_alerts(current_user: dict = Depends(get_current_user)):
    """Récupérer les presqu'accidents nécessitant attention (à traiter, en retard)"""
    try:
        items = await db.presqu_accident_items.find().to_list(length=None)
        
        alerts = []
        today = datetime.now(timezone.utc).date()
        
        for item in items:
            alert_item = None
            urgence = "normal"
            
            # Items à traiter
            if item.get("status") == PresquAccidentStatus.A_TRAITER.value:
                alert_item = item
                urgence = "important"
            
            # Items en retard
            if item.get("status") not in [PresquAccidentStatus.TERMINE.value, PresquAccidentStatus.ARCHIVE.value]:
                if item.get("date_echeance_action"):
                    try:
                        echeance = datetime.fromisoformat(item["date_echeance_action"]).date()
                        days_until = (echeance - today).days
                        if days_until < 0:
                            alert_item = item
                            urgence = "critique"
                            item["days_overdue"] = abs(days_until)
                        elif days_until <= 7:
                            alert_item = item
                            urgence = "important"
                            item["days_until"] = days_until
                    except:
                        pass
            
            if alert_item:
                if "_id" in alert_item:
                    del alert_item["_id"]
                alert_item["urgence"] = urgence
                alerts.append(alert_item)
        
        # Trier par urgence (critique > important > normal)
        urgence_order = {"critique": 0, "important": 1, "normal": 2}
        alerts.sort(key=lambda x: urgence_order.get(x.get("urgence", "normal"), 2))
        
        return {
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Erreur récupération alertes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Upload de pièces jointes ====================

@router.post("/items/{item_id}/upload")
async def upload_piece_jointe(
    item_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload une pièce jointe pour un presqu'accident"""
    try:
        # Vérifier que l'item existe
        item = await db.presqu_accident_items.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail="Presqu'accident non trouvé")
        
        # Créer le répertoire uploads/presqu_accident si nécessaire
        upload_dir = Path("uploads/presqu_accident")
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
        file_url = f"/uploads/presqu_accident/{unique_filename}"
        await db.presqu_accident_items.update_one(
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
async def import_presqu_accident_data(
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
                item = PresquAccidentItem(
                    titre=str(row.get('titre', '')),
                    description=str(row.get('description', '')),
                    date_incident=str(row.get('date_incident', '')),
                    lieu=str(row.get('lieu', '')),
                    service=str(row.get('service', 'AUTRE')),
                    personnes_impliquees=str(row.get('personnes_impliquees', '')) if pd.notna(row.get('personnes_impliquees')) else None,
                    declarant=str(row.get('declarant', '')) if pd.notna(row.get('declarant')) else None,
                    contexte_cause=str(row.get('contexte_cause', '')) if pd.notna(row.get('contexte_cause')) else None,
                    severite=str(row.get('severite', 'MOYEN')),
                    actions_proposees=str(row.get('actions_proposees', '')) if pd.notna(row.get('actions_proposees')) else None,
                    commentaire=str(row.get('commentaire', '')) if pd.notna(row.get('commentaire')) else None,
                    created_by=current_user.get("id"),
                    updated_by=current_user.get("id")
                )
                
                await db.presqu_accident_items.insert_one(item.model_dump())
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
            "titre": ["Risque de chute", "Odeur suspecte"],
            "description": ["Risque de chute lors du chargement camion", "Odeur anormale lors préparation"],
            "date_incident": ["2025-03-26", "2025-03-27"],
            "lieu": ["Entrepôt", "Atelier B2"],
            "service": ["LOGISTIQUE", "PRODUCTION"],
            "personnes_impliquees": ["Jean DUPONT", "Marie MARTIN"],
            "declarant": ["Paul LEFEBVRE", "Sophie BERNARD"],
            "contexte_cause": ["Pas d'escalier adapté", "Ventilation insuffisante"],
            "severite": ["ELEVE", "MOYEN"],
            "actions_proposees": ["Installer escalier mobile", "Vérifier ventilation"],
            "commentaire": ["Urgent", "À surveiller"]
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
                "Content-Disposition": "attachment; filename=template_presqu_accidents.csv"
            }
        )
    except Exception as e:
        logger.error(f"Erreur export template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
