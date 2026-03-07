from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import logging
import uuid
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user, db
import os
import shutil

router = APIRouter(prefix="/surveillance-history", tags=["Surveillance History"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = "/app/backend/uploads/surveillance_history"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class HistoryEntry(BaseModel):
    id: Optional[str] = None
    control_id: str
    date_realisation: str
    commentaires: Optional[str] = None
    fichiers: Optional[List[dict]] = []
    validated_by: Optional[str] = None
    duree_intervention: Optional[str] = None
    resultat: Optional[str] = None  # "CONFORME" ou "NON_CONFORME"
    created_at: Optional[str] = None

@router.get("/{control_id}")
async def get_control_history(
    control_id: str,
    limit: int = 18,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupérer l'historique des 18 derniers contrôles réalisés
    """
    try:
        history = await db.surveillance_history.find(
            {"control_id": control_id}
        ).sort("date_realisation", -1).limit(limit).to_list(length=limit)
        
        for entry in history:
            if "_id" in entry:
                del entry["_id"]
        
        return {"history": history, "count": len(history)}
    
    except Exception as e:
        logger.error(f"Erreur récupération historique: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_history_entry(
    control_id: str = Form(...),
    date_realisation: str = Form(...),
    commentaires: Optional[str] = Form(None),
    validated_by: Optional[str] = Form(None),
    duree_intervention: Optional[str] = Form(None),
    resultat: Optional[str] = Form(None),
    fichiers: List[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Créer une nouvelle entrée d'historique avec fichiers
    """
    try:
        entry_id = str(uuid.uuid4())
        saved_files = []
        
        # Sauvegarder les fichiers uploadés
        if fichiers:
            for file in fichiers:
                if file.filename:
                    file_id = str(uuid.uuid4())
                    file_ext = os.path.splitext(file.filename)[1]
                    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
                    
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    
                    saved_files.append({
                        "id": file_id,
                        "nom": file.filename,
                        "chemin": file_path,
                        "taille": os.path.getsize(file_path),
                        "type": file.content_type
                    })
        
        new_entry = {
            "id": entry_id,
            "control_id": control_id,
            "date_realisation": date_realisation,
            "commentaires": commentaires,
            "fichiers": saved_files,
            "validated_by": validated_by or f"{current_user.get('prenom')} {current_user.get('nom')}",
            "duree_intervention": duree_intervention,
            "resultat": resultat,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id")
        }
        
        await db.surveillance_history.insert_one(new_entry)
        
        if "_id" in new_entry:
            del new_entry["_id"]
        
        return {"success": True, "entry": new_entry}
    
    except Exception as e:
        logger.error(f"Erreur création historique: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{control_id}/stats")
async def get_control_stats(
    control_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtenir des statistiques sur l'historique d'un contrôle
    """
    try:
        history = await db.surveillance_history.find(
            {"control_id": control_id}
        ).to_list(length=None)
        
        total = len(history)
        conformes = len([h for h in history if h.get("resultat") == "CONFORME"])
        non_conformes = len([h for h in history if h.get("resultat") == "NON_CONFORME"])
        
        # Calculer les délais moyens entre contrôles
        if len(history) > 1:
            dates = sorted([datetime.fromisoformat(h["date_realisation"]) for h in history])
            delais = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            delai_moyen = sum(delais) / len(delais) if delais else 0
        else:
            delai_moyen = 0
        
        return {
            "total": total,
            "conformes": conformes,
            "non_conformes": non_conformes,
            "taux_conformite": (conformes / total * 100) if total > 0 else 0,
            "delai_moyen_jours": round(delai_moyen, 1)
        }
    
    except Exception as e:
        logger.error(f"Erreur stats historique: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/file/{file_id}")
async def download_history_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Télécharger un fichier de l'historique
    """
    try:
        # Trouver le fichier dans l'historique
        history_entry = await db.surveillance_history.find_one(
            {"fichiers.id": file_id}
        )
        
        if not history_entry:
            raise HTTPException(status_code=404, detail="Fichier non trouvé")
        
        file_info = next((f for f in history_entry["fichiers"] if f["id"] == file_id), None)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="Fichier non trouvé")
        
        file_path = file_info["chemin"]
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Fichier physique non trouvé")
        
        from fastapi.responses import FileResponse
        return FileResponse(
            file_path,
            media_type=file_info.get("type", "application/octet-stream"),
            filename=file_info["nom"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur téléchargement fichier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_next_control_date(current_date: datetime, periodicite: str) -> datetime:
    """
    Calculer la prochaine date de contrôle selon la périodicité
    """
    periodicite_lower = periodicite.lower()
    
    if "mensuel" in periodicite_lower or "mois" in periodicite_lower:
        # Extraire le nombre de mois
        if "6" in periodicite_lower:
            months = 6
        elif "3" in periodicite_lower or "trimestriel" in periodicite_lower:
            months = 3
        else:
            months = 1
        
        # Ajouter les mois
        new_month = current_date.month + months
        new_year = current_date.year
        
        while new_month > 12:
            new_month -= 12
            new_year += 1
        
        # Gérer les jours invalides (ex: 31 février)
        try:
            next_date = current_date.replace(year=new_year, month=new_month)
        except ValueError:
            # Si le jour n'existe pas dans le nouveau mois, prendre le dernier jour du mois
            import calendar
            last_day = calendar.monthrange(new_year, new_month)[1]
            next_date = current_date.replace(year=new_year, month=new_month, day=last_day)
        
        return next_date
    
    elif "annuel" in periodicite_lower or "an" in periodicite_lower:
        # Ajouter 1 an
        return current_date.replace(year=current_date.year + 1)
    
    elif "semaine" in periodicite_lower or "hebdo" in periodicite_lower:
        # Ajouter 7 jours
        return current_date + timedelta(days=7)
    
    elif "jour" in periodicite_lower or "quotidien" in periodicite_lower:
        # Ajouter 1 jour
        return current_date + timedelta(days=1)
    
    else:
        # Par défaut, ajouter 30 jours
        return current_date + timedelta(days=30)
