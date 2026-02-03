"""
Routes API pour la gestion des caméras RTSP/ONVIF
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import logging
import os
from pathlib import Path

from dependencies import get_current_user
from camera_service import (
    discover_onvif_cameras,
    get_onvif_camera_info,
    capture_snapshot,
    capture_snapshot_base64,
    test_camera_connection,
    start_hls_stream,
    stop_hls_stream,
    get_active_streams_count,
    cleanup_old_snapshots,
    get_latest_snapshot_path,
    encrypt_password,
    decrypt_password,
    SNAPSHOTS_BASE_PATH,
    HLS_BASE_PATH
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cameras", tags=["cameras"])

# Variable globale pour la base de données (sera injectée)
db = None


def set_database(database):
    """Injecte la connexion à la base de données"""
    global db
    db = database


# ========================
# Modèles Pydantic
# ========================

class CameraCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    rtsp_url: str = Field(..., min_length=10)
    username: Optional[str] = ""
    password: Optional[str] = ""
    brand: Optional[str] = "generic"
    location: Optional[str] = ""
    zone_id: Optional[str] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    brand: Optional[str] = None
    location: Optional[str] = None
    zone_id: Optional[str] = None
    # Champs pour les alertes
    alert_enabled: Optional[bool] = None
    alert_email: Optional[str] = None
    alert_delay_minutes: Optional[int] = None  # Délai avant envoi d'alerte (défaut: 5 min)


class CameraResponse(BaseModel):
    id: str
    name: str
    rtsp_url: str
    username: Optional[str] = ""
    brand: Optional[str] = "generic"
    location: Optional[str] = ""
    zone_id: Optional[str] = None
    is_online: bool = False
    last_snapshot: Optional[str] = None
    last_check: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None
    # Champs pour les alertes
    alert_enabled: bool = False
    alert_email: Optional[str] = None
    alert_delay_minutes: int = 5
    last_alert_sent: Optional[str] = None
    offline_since: Optional[str] = None


class CameraAlertUpdate(BaseModel):
    """Modèle pour mise à jour des paramètres d'alerte d'une caméra"""
    alert_enabled: bool
    alert_email: Optional[str] = None
    alert_delay_minutes: int = 5


class CameraSettingsUpdate(BaseModel):
    snapshot_frequency_seconds: Optional[int] = Field(None, ge=10, le=300)
    retention_days: Optional[int] = Field(None, ge=1, le=90)
    retention_max_count: Optional[int] = Field(None, ge=100, le=10000)


class OnvifDiscoveredCamera(BaseModel):
    xaddr: str
    ip: Optional[str]
    brand: str
    scopes: List[str] = []


class OnvifCameraAdd(BaseModel):
    xaddr: str
    name: str
    username: str = ""
    password: str = ""
    location: str = ""


# ========================
# Helpers
# ========================

def serialize_camera(camera: dict) -> dict:
    """Sérialise une caméra pour la réponse API"""
    return {
        "id": str(camera["_id"]),
        "name": camera.get("name", ""),
        "rtsp_url": camera.get("rtsp_url", ""),
        "username": camera.get("username", ""),
        "brand": camera.get("brand", "generic"),
        "location": camera.get("location", ""),
        "zone_id": str(camera["zone_id"]) if camera.get("zone_id") else None,
        "is_online": camera.get("is_online", False),
        "last_snapshot": camera.get("last_snapshot"),
        "last_check": camera.get("last_check"),
        "created_at": camera.get("created_at", datetime.now(timezone.utc).isoformat()),
        "created_by": str(camera["created_by"]) if camera.get("created_by") else None,
        # Champs alertes
        "alert_enabled": camera.get("alert_enabled", False),
        "alert_email": camera.get("alert_email"),
        "alert_delay_minutes": camera.get("alert_delay_minutes", 5),
        "last_alert_sent": camera.get("last_alert_sent"),
        "offline_since": camera.get("offline_since")
    }


async def check_camera_permission(current_user: dict, require_edit: bool = False):
    """Vérifie les permissions caméras"""
    role = current_user.get("role", "")
    permissions = current_user.get("permissions", {})
    camera_perms = permissions.get("cameras", {})
    
    # Admin a toujours accès
    if role == "ADMIN":
        return True
    
    # Vérifier si responsable de service (peut visualiser)
    is_service_manager = current_user.get("is_service_manager", False)
    
    if require_edit:
        # Seuls les admins peuvent éditer
        if camera_perms.get("edit", False):
            return True
        raise HTTPException(status_code=403, detail="Permission refusée - Administration requise")
    else:
        # View: admin ou responsable de service
        if camera_perms.get("view", False) or is_service_manager:
            return True
        raise HTTPException(status_code=403, detail="Permission refusée")


# ========================
# Routes CRUD Caméras
# ========================

@router.get("", response_model=List[CameraResponse])
async def list_cameras(current_user: dict = Depends(get_current_user)):
    """Liste toutes les caméras"""
    try:
        cameras = []
        async for camera in db.cameras.find().sort("name", 1):
            cameras.append(serialize_camera(camera))
        return cameras
    except Exception as e:
        logger.error(f"Erreur liste caméras: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count")
async def get_cameras_count(current_user: dict = Depends(get_current_user)):
    """Retourne le nombre de caméras et stats"""
    try:
        total = await db.cameras.count_documents({})
        online = await db.cameras.count_documents({"is_online": True})
        active_streams = get_active_streams_count()
        
        return {
            "total": total,
            "online": online,
            "offline": total - online,
            "active_streams": active_streams,
            "max_streams": 3
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Paramètres (AVANT les routes dynamiques /{camera_id})
# ========================

@router.get("/settings/snapshot")
async def get_snapshot_settings(current_user: dict = Depends(get_current_user)):
    """Récupère les paramètres de snapshot"""
    try:
        settings = await db.camera_settings.find_one({"type": "snapshot"})
        if not settings:
            # Paramètres par défaut
            settings = {
                "type": "snapshot",
                "snapshot_frequency_seconds": 30,
                "retention_days": 7,
                "retention_max_count": 1000,
                "storage_path": str(SNAPSHOTS_BASE_PATH)
            }
            await db.camera_settings.insert_one(settings)
        
        return {
            "snapshot_frequency_seconds": settings.get("snapshot_frequency_seconds", 30),
            "retention_days": settings.get("retention_days", 7),
            "retention_max_count": settings.get("retention_max_count", 1000),
            "storage_path": settings.get("storage_path", str(SNAPSHOTS_BASE_PATH))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings/snapshot")
async def update_snapshot_settings(
    settings_data: CameraSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour les paramètres de snapshot"""
    try:
        update_data = {}
        if settings_data.snapshot_frequency_seconds is not None:
            update_data["snapshot_frequency_seconds"] = settings_data.snapshot_frequency_seconds
        if settings_data.retention_days is not None:
            update_data["retention_days"] = settings_data.retention_days
        if settings_data.retention_max_count is not None:
            update_data["retention_max_count"] = settings_data.retention_max_count
        
        if update_data:
            await db.camera_settings.update_one(
                {"type": "snapshot"},
                {"$set": update_data},
                upsert=True
            )
        
        return await get_snapshot_settings(current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Découverte ONVIF (AVANT les routes dynamiques /{camera_id})
# ========================

@router.get("/discover/onvif")
async def discover_onvif(
    timeout: int = Query(10, ge=5, le=30),
    current_user: dict = Depends(get_current_user)
):
    """Découvre les caméras ONVIF sur le réseau"""
    try:
        discovered = await discover_onvif_cameras(timeout)
        
        # Filtrer les caméras déjà enregistrées
        existing_urls = set()
        async for camera in db.cameras.find({}, {"rtsp_url": 1}):
            existing_urls.add(camera.get("rtsp_url", "").split("@")[-1])  # Enlever credentials
        
        for cam in discovered:
            cam["already_added"] = any(
                cam.get("ip", "") in url for url in existing_urls
            )
        
        return {
            "count": len(discovered),
            "cameras": discovered
        }
        
    except Exception as e:
        logger.error(f"Erreur découverte ONVIF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discover/onvif/add")
async def add_discovered_camera(
    camera_data: OnvifCameraAdd,
    current_user: dict = Depends(get_current_user)
):
    """Ajoute une caméra découverte par ONVIF"""
    try:
        # Récupérer les infos de la caméra
        info = await get_onvif_camera_info(
            camera_data.xaddr,
            camera_data.username,
            camera_data.password
        )
        
        if not info:
            raise HTTPException(status_code=400, detail="Impossible de récupérer les infos de la caméra")
        
        # Créer la caméra
        camera_doc = {
            "name": camera_data.name,
            "rtsp_url": info.get("stream_uri", camera_data.xaddr),
            "username": camera_data.username,
            "password": encrypt_password(camera_data.password) if camera_data.password else "",
            "brand": info.get("manufacturer", "onvif").lower(),
            "location": camera_data.location,
            "zone_id": None,
            "is_online": True,
            "onvif_info": {
                "manufacturer": info.get("manufacturer"),
                "model": info.get("model"),
                "firmware": info.get("firmware"),
                "serial": info.get("serial")
            },
            "last_snapshot": None,
            "last_check": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": ObjectId(current_user.get("id")) if current_user.get("id") else None
        }
        
        result = await db.cameras.insert_one(camera_doc)
        camera_doc["_id"] = result.inserted_id
        
        logger.info(f"Caméra ONVIF ajoutée: {camera_data.name}")
        return serialize_camera(camera_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur ajout caméra ONVIF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Route Nettoyage (AVANT les routes dynamiques /{camera_id})
# ========================

@router.post("/cleanup/snapshots")
async def cleanup_all_snapshots(current_user: dict = Depends(get_current_user)):
    """Lance le nettoyage des snapshots pour toutes les caméras"""
    try:
        settings = await db.camera_settings.find_one({"type": "snapshot"})
        retention_days = settings.get("retention_days", 7) if settings else 7
        max_count = settings.get("retention_max_count", 1000) if settings else 1000
        
        cleaned_count = 0
        async for camera in db.cameras.find({}, {"_id": 1}):
            camera_id = str(camera["_id"])
            await cleanup_old_snapshots(camera_id, retention_days, max_count)
            cleaned_count += 1
        
        return {
            "success": True,
            "message": f"Nettoyage effectué pour {cleaned_count} caméras",
            "retention_days": retention_days,
            "max_count": max_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Route Test URL (AVANT les routes dynamiques /{camera_id})
# ========================

@router.post("/test-url")
async def test_camera_url(
    rtsp_url: str = Query(...),
    username: str = Query(""),
    password: str = Query(""),
    current_user: dict = Depends(get_current_user)
):
    """Teste une URL RTSP sans créer de caméra"""
    result = await test_camera_connection(rtsp_url, username, password)
    return result


# ========================
# Routes HLS (AVANT les routes dynamiques /{camera_id})
# ========================

@router.get("/hls/{camera_id}/{filename}")
async def serve_hls_file(camera_id: str, filename: str):
    """Sert les fichiers HLS (m3u8 et segments ts)"""
    filepath = HLS_BASE_PATH / camera_id / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    if filename.endswith(".m3u8"):
        media_type = "application/vnd.apple.mpegurl"
    elif filename.endswith(".ts"):
        media_type = "video/mp2t"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(filepath, media_type=media_type)


# ========================
# Routes dynamiques avec {camera_id} (APRÈS les routes statiques)
# ========================

@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Récupère une caméra par ID"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        return serialize_camera(camera)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CameraResponse)
async def create_camera(camera_data: CameraCreate, current_user: dict = Depends(get_current_user)):
    """Crée une nouvelle caméra"""
    try:
        # Vérifier si le nom existe déjà
        existing = await db.cameras.find_one({"name": camera_data.name})
        if existing:
            raise HTTPException(status_code=400, detail="Une caméra avec ce nom existe déjà")
        
        camera_doc = {
            "name": camera_data.name,
            "rtsp_url": camera_data.rtsp_url,
            "username": camera_data.username or "",
            "password": encrypt_password(camera_data.password) if camera_data.password else "",
            "brand": camera_data.brand or "generic",
            "location": camera_data.location or "",
            "zone_id": ObjectId(camera_data.zone_id) if camera_data.zone_id else None,
            "is_online": False,
            "last_snapshot": None,
            "last_check": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": ObjectId(current_user.get("id")) if current_user.get("id") else None
        }
        
        result = await db.cameras.insert_one(camera_doc)
        camera_doc["_id"] = result.inserted_id
        
        logger.info(f"Caméra créée: {camera_data.name}")
        return serialize_camera(camera_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création caméra: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, camera_data: CameraUpdate, current_user: dict = Depends(get_current_user)):
    """Met à jour une caméra"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        update_data = {}
        if camera_data.name is not None:
            update_data["name"] = camera_data.name
        if camera_data.rtsp_url is not None:
            update_data["rtsp_url"] = camera_data.rtsp_url
        if camera_data.username is not None:
            update_data["username"] = camera_data.username
        if camera_data.password is not None:
            update_data["password"] = encrypt_password(camera_data.password) if camera_data.password else ""
        if camera_data.brand is not None:
            update_data["brand"] = camera_data.brand
        if camera_data.location is not None:
            update_data["location"] = camera_data.location
        if camera_data.zone_id is not None:
            update_data["zone_id"] = ObjectId(camera_data.zone_id) if camera_data.zone_id else None
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.cameras.update_one(
                {"_id": ObjectId(camera_id)},
                {"$set": update_data}
            )
        
        updated = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        return serialize_camera(updated)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Supprime une caméra"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        # Arrêter le stream si actif
        stop_hls_stream(camera_id)
        
        # Supprimer
        await db.cameras.delete_one({"_id": ObjectId(camera_id)})
        
        logger.info(f"Caméra supprimée: {camera.get('name')}")
        return {"success": True, "message": "Caméra supprimée"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Test & Snapshot
# ========================

@router.post("/{camera_id}/test")
async def test_camera(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Teste la connexion à une caméra"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        password = decrypt_password(camera.get("password", ""))
        result = await test_camera_connection(
            camera.get("rtsp_url"),
            camera.get("username", ""),
            password
        )
        
        # Mettre à jour le statut
        await db.cameras.update_one(
            {"_id": ObjectId(camera_id)},
            {"$set": {
                "is_online": result["success"],
                "last_check": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Test & Snapshot
# ========================

@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Capture et retourne un snapshot en base64"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        # Capture le snapshot
        snapshot_base64 = await capture_snapshot_base64(camera)
        
        if snapshot_base64:
            # Mettre à jour le statut
            await db.cameras.update_one(
                {"_id": ObjectId(camera_id)},
                {"$set": {
                    "is_online": True,
                    "last_snapshot": datetime.now(timezone.utc).isoformat(),
                    "last_check": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {
                "success": True,
                "snapshot": snapshot_base64,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            await db.cameras.update_one(
                {"_id": ObjectId(camera_id)},
                {"$set": {
                    "is_online": False,
                    "last_check": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": False, "message": "Impossible de capturer le snapshot"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{camera_id}/snapshot/latest")
async def get_latest_snapshot_file(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Retourne le dernier snapshot sauvegardé (fichier)"""
    try:
        filepath = get_latest_snapshot_path(camera_id)
        if filepath and os.path.exists(filepath):
            return FileResponse(filepath, media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Aucun snapshot disponible")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Streaming HLS
# ========================

@router.post("/{camera_id}/stream/start")
async def start_camera_stream(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Démarre le streaming HLS pour une caméra"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        password = decrypt_password(camera.get("password", ""))
        stream_url = start_hls_stream(
            camera_id,
            camera.get("rtsp_url"),
            camera.get("username", ""),
            password
        )
        
        if stream_url:
            return {
                "success": True,
                "stream_url": stream_url,
                "active_streams": get_active_streams_count()
            }
        else:
            return {
                "success": False,
                "message": f"Limite de 3 streams simultanés atteinte",
                "active_streams": get_active_streams_count()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{camera_id}/stream/stop")
async def stop_camera_stream(camera_id: str, current_user: dict = Depends(get_current_user)):
    """Arrête le streaming HLS pour une caméra"""
    stopped = stop_hls_stream(camera_id)
    return {
        "success": stopped,
        "active_streams": get_active_streams_count()
    }


# ========================
# Route Streaming MJPEG (TEMPS RÉEL)
# ========================

@router.get("/{camera_id}/mjpeg")
async def stream_mjpeg(camera_id: str, token: str = None):
    """
    Stream MJPEG temps réel pour une caméra
    Utilise un générateur qui envoie des frames JPEG en continu
    """
    import cv2
    
    # Vérifier le token
    if not token:
        raise HTTPException(status_code=401, detail="Token requis")
    
    try:
        # Vérifier le token (simplifié)
        from jose import jwt
        payload = jwt.decode(token, os.environ.get('SECRET_KEY', ''), algorithms=["HS256"])
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        rtsp_url = camera.get("rtsp_url")
        username = camera.get("username", "")
        password = decrypt_password(camera.get("password", ""))
        
        # Construire l'URL avec auth
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        async def generate_frames():
            """Générateur de frames MJPEG"""
            cap = None
            try:
                cap = cv2.VideoCapture(full_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Buffer minimal
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
                
                if not cap.isOpened():
                    logger.error(f"Impossible d'ouvrir le flux RTSP pour {camera_id}")
                    return
                
                logger.info(f"MJPEG stream démarré pour caméra {camera_id}")
                
                frame_count = 0
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        # Tentative de reconnexion
                        cap.release()
                        await asyncio.sleep(1)
                        cap = cv2.VideoCapture(full_url, cv2.CAP_FFMPEG)
                        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        continue
                    
                    # Encoder en JPEG avec qualité réduite pour la performance
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    ret, buffer = cv2.imencode('.jpg', frame, encode_param)
                    
                    if ret:
                        frame_bytes = buffer.tobytes()
                        # Format MJPEG multipart
                        yield (
                            b'--frame\r\n'
                            b'Content-Type: image/jpeg\r\n'
                            b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n'
                            b'\r\n' + frame_bytes + b'\r\n'
                        )
                    
                    frame_count += 1
                    # Limiter à ~15 fps pour ne pas surcharger
                    await asyncio.sleep(0.066)
                    
            except Exception as e:
                logger.error(f"Erreur MJPEG stream: {e}")
            finally:
                if cap:
                    cap.release()
                logger.info(f"MJPEG stream terminé pour caméra {camera_id}")
        
        return StreamingResponse(
            generate_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur démarrage MJPEG: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================
# Routes Alertes Caméras
# ========================

@router.put("/{camera_id}/alert")
async def update_camera_alert(
    camera_id: str, 
    alert_data: CameraAlertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Configure les paramètres d'alerte d'une caméra"""
    try:
        camera = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        if not camera:
            raise HTTPException(status_code=404, detail="Caméra non trouvée")
        
        update_data = {
            "alert_enabled": alert_data.alert_enabled,
            "alert_email": alert_data.alert_email if alert_data.alert_enabled else None,
            "alert_delay_minutes": alert_data.alert_delay_minutes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.cameras.update_one(
            {"_id": ObjectId(camera_id)},
            {"$set": update_data}
        )
        
        logger.info(f"Alerte caméra {camera.get('name')} mise à jour: enabled={alert_data.alert_enabled}")
        
        updated = await db.cameras.find_one({"_id": ObjectId(camera_id)})
        return serialize_camera(updated)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur mise à jour alerte caméra: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/history")
async def get_camera_alerts_history(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Récupère l'historique des alertes caméras"""
    try:
        alerts = []
        async for alert in db.camera_alerts.find().sort("created_at", -1).limit(limit):
            alerts.append({
                "id": str(alert["_id"]),
                "camera_id": str(alert.get("camera_id")),
                "camera_name": alert.get("camera_name"),
                "alert_type": alert.get("alert_type", "offline"),
                "message": alert.get("message"),
                "email_sent_to": alert.get("email_sent_to"),
                "created_at": alert.get("created_at"),
                "resolved_at": alert.get("resolved_at"),
                "is_resolved": alert.get("is_resolved", False)
            })
        return alerts
    except Exception as e:
        logger.error(f"Erreur récupération historique alertes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/active")
async def get_active_camera_alerts(current_user: dict = Depends(get_current_user)):
    """Récupère les alertes actives (non résolues)"""
    try:
        alerts = []
        async for alert in db.camera_alerts.find({"is_resolved": False}).sort("created_at", -1):
            alerts.append({
                "id": str(alert["_id"]),
                "camera_id": str(alert.get("camera_id")),
                "camera_name": alert.get("camera_name"),
                "alert_type": alert.get("alert_type", "offline"),
                "message": alert.get("message"),
                "email_sent_to": alert.get("email_sent_to"),
                "created_at": alert.get("created_at"),
                "offline_duration_minutes": alert.get("offline_duration_minutes", 0)
            })
        return {
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Erreur récupération alertes actives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/resolve")
async def resolve_camera_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marque une alerte comme résolue"""
    try:
        result = await db.camera_alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "is_resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": current_user.get("id")
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Alerte non trouvée")
        
        return {"success": True, "message": "Alerte résolue"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
