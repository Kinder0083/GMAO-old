"""
Routes API pour l'intégration Frigate NVR
Ces routes doivent être enregistrées AVANT les routes dynamiques /{camera_id}
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import traceback
import base64

from dependencies import get_current_user
from frigate_service import (
    FrigateService,
    get_frigate_service,
    init_frigate_service,
    reset_frigate_service
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/frigate", tags=["frigate"])

# Variable globale pour la base de données (sera injectée)
db = None


def set_database(database):
    """Injecte la connexion à la base de données"""
    global db
    db = database


# ========================
# Modèles Pydantic
# ========================

class FrigateSettingsUpdate(BaseModel):
    """Paramètres de connexion à Frigate NVR"""
    enabled: bool = False
    host: str = ""
    api_port: int = Field(5000, ge=1, le=65535)
    go2rtc_port: int = Field(1984, ge=1, le=65535)
    use_https: bool = False
    username: str = ""  # Auth Basic nginx
    password: str = ""  # Auth Basic nginx
    stream_mapping: Optional[Dict[str, str]] = None


# ========================
# Routes Frigate
# ========================

@router.get("/settings")
async def get_frigate_settings(current_user: dict = Depends(get_current_user)):
    """Récupère les paramètres Frigate"""
    try:
        settings = await db.camera_settings.find_one({"type": "frigate"})
        if not settings:
            return {
                "enabled": False,
                "host": "",
                "api_port": 5000,
                "go2rtc_port": 1984,
                "use_https": False,
                "username": "",
                "password": "",
                "stream_mapping": {},
                "connected": False,
                "frigate_version": None
            }
        
        # Vérifier la connexion si activé
        connected = False
        frigate_version = None
        if settings.get("enabled") and settings.get("host"):
            service = get_frigate_service()
            if service:
                result = await service.test_connection()
                connected = result.get("success", False)
                frigate_version = result.get("version")
        
        return {
            "enabled": settings.get("enabled", False),
            "host": settings.get("host", ""),
            "api_port": settings.get("api_port", 5000),
            "go2rtc_port": settings.get("go2rtc_port", 1984),
            "use_https": settings.get("use_https", False),
            "username": settings.get("username", ""),
            "password": "",  # Ne jamais renvoyer le mot de passe
            "has_password": bool(settings.get("password")),
            "stream_mapping": settings.get("stream_mapping", {}),
            "connected": connected,
            "frigate_version": frigate_version
        }
    except Exception as e:
        logger.error(f"Erreur récupération paramètres Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_frigate_settings(
    settings_data: FrigateSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour les paramètres Frigate"""
    try:
        update_data = {
            "type": "frigate",
            "enabled": settings_data.enabled,
            "host": settings_data.host,
            "api_port": settings_data.api_port,
            "go2rtc_port": settings_data.go2rtc_port,
            "use_https": settings_data.use_https,
            "username": settings_data.username,
            "stream_mapping": settings_data.stream_mapping or {},
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Ne mettre à jour le password que s'il est fourni
        if settings_data.password:
            update_data["password"] = settings_data.password
        
        await db.camera_settings.update_one(
            {"type": "frigate"},
            {"$set": update_data},
            upsert=True
        )
        
        # Récupérer le password depuis la DB pour init le service
        saved_settings = await db.camera_settings.find_one({"type": "frigate"})
        saved_password = saved_settings.get("password", "") if saved_settings else ""
        
        # Réinitialiser le service Frigate
        if settings_data.enabled and settings_data.host:
            init_frigate_service(
                settings_data.host,
                settings_data.api_port,
                settings_data.go2rtc_port,
                settings_data.use_https,
                settings_data.username,
                settings_data.password or saved_password
            )
        else:
            reset_frigate_service()
        
        logger.info(f"Paramètres Frigate mis à jour: enabled={settings_data.enabled}, host={settings_data.host}, https={settings_data.use_https}, user={settings_data.username}")
        return await get_frigate_settings(current_user)
        
    except Exception as e:
        logger.error(f"Erreur mise à jour paramètres Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_frigate_connection(
    request_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Teste la connexion à Frigate"""
    host = request_data.get("host", "")
    api_port = request_data.get("api_port", 5000)
    go2rtc_port = request_data.get("go2rtc_port", 1984)
    use_https = request_data.get("use_https", False)
    username = request_data.get("username", "")
    password = request_data.get("password", "")
    
    logger.info(f"[FRIGATE API] Test connexion demandé: host={host}, api_port={api_port}, go2rtc_port={go2rtc_port}, https={use_https}, user={username}, pass_len={len(password)}")
    
    if not host:
        return {"success": False, "message": "Adresse IP requise"}
    
    try:
        service = FrigateService(host, api_port, go2rtc_port, use_https, username, password)
        result = await service.test_connection()
        
        logger.info(f"[FRIGATE API] Résultat test: success={result.get('success')}, message={result.get('message')}")
        
        if result.get("success"):
            try:
                streams = await service.get_go2rtc_streams()
                cameras = await service.get_cameras()
                result["streams"] = streams
                result["cameras"] = cameras
                logger.info(f"[FRIGATE API] Streams trouvés: {len(streams)}, Caméras: {len(cameras)}")
            except Exception as e:
                logger.warning(f"[FRIGATE API] Erreur récup streams/cameras: {e}")
                result["streams"] = []
                result["cameras"] = []
                result["streams_error"] = str(e)
        
        return result
    except Exception as e:
        error_msg = f"Exception dans test_frigate_connection: {type(e).__name__}: {str(e)}"
        logger.error(f"[FRIGATE API] {error_msg}")
        logger.error(f"[FRIGATE API] Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "message": error_msg,
            "details": {
                "host": host,
                "api_port": api_port,
                "go2rtc_port": go2rtc_port,
                "use_https": use_https,
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc()
            }
        }


@router.get("/cameras")
async def get_frigate_cameras(current_user: dict = Depends(get_current_user)):
    """Récupère la liste des caméras configurées dans Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            return {"cameras": [], "message": "Frigate non configuré"}
        
        cameras = await service.get_cameras()
        return {"cameras": cameras}
    except Exception as e:
        logger.error(f"Erreur récupération caméras Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/streams")
async def get_frigate_streams(current_user: dict = Depends(get_current_user)):
    """Récupère la liste des streams go2rtc disponibles"""
    try:
        service = get_frigate_service()
        if not service:
            return {"streams": [], "message": "Frigate non configuré"}
        
        streams = await service.get_go2rtc_streams()
        return {"streams": streams}
    except Exception as e:
        logger.error(f"Erreur récupération streams go2rtc: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/snapshot/{camera_name}")
async def get_frigate_snapshot(
    camera_name: str,
    quality: int = Query(70, ge=10, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Récupère le snapshot d'une caméra Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        snapshot = await service.get_camera_snapshot(camera_name, quality)
        if snapshot:
            snapshot_b64 = base64.b64encode(snapshot).decode('utf-8')
            return {
                "success": True,
                "snapshot": snapshot_b64,
                "camera": camera_name,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            return {
                "success": False,
                "message": f"Snapshot non disponible pour {camera_name}"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération snapshot Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thumbnail/{camera_name}")
async def get_frigate_thumbnail(
    camera_name: str,
    height: int = Query(180, ge=60, le=480),
    current_user: dict = Depends(get_current_user)
):
    """Récupère une vignette d'une caméra Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        thumbnail = await service.get_camera_thumbnail(camera_name, height)
        if thumbnail:
            thumbnail_b64 = base64.b64encode(thumbnail).decode('utf-8')
            return {
                "success": True,
                "thumbnail": thumbnail_b64,
                "camera": camera_name
            }
        else:
            return {
                "success": False,
                "message": f"Thumbnail non disponible pour {camera_name}"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération thumbnail Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def get_frigate_events(
    camera: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les événements de détection Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            return {"events": [], "message": "Frigate non configuré"}
        
        events = await service.get_camera_events(camera, limit)
        return {"events": events}
    except Exception as e:
        logger.error(f"Erreur récupération événements Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_frigate_stats(current_user: dict = Depends(get_current_user)):
    """Récupère les statistiques Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            return {"stats": {}, "message": "Frigate non configuré"}
        
        stats = await service.get_stats()
        return {"stats": stats}
    except Exception as e:
        logger.error(f"Erreur récupération stats Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webrtc-info/{stream_name}")
async def get_frigate_webrtc_info(
    stream_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Retourne les informations pour établir une connexion WebRTC"""
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        return {
            "success": True,
            "stream_name": stream_name,
            "ws_url": service.get_webrtc_url(stream_name),
            "http_url": service.get_webrtc_offer_url(stream_name),
            "host": service.host,
            "go2rtc_port": service.go2rtc_port
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération info WebRTC: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Fonction d'initialisation au démarrage
async def init_frigate_from_db():
    """Initialise le service Frigate depuis les paramètres DB"""
    try:
        settings = await db.camera_settings.find_one({"type": "frigate"})
        if settings and settings.get("enabled") and settings.get("host"):
            init_frigate_service(
                settings.get("host"),
                settings.get("api_port", 5000),
                settings.get("go2rtc_port", 1984),
                settings.get("use_https", False),
                settings.get("username", ""),
                settings.get("password", "")
            )
            logger.info(f"Service Frigate initialisé: {settings.get('host')} (HTTPS: {settings.get('use_https', False)}, User: {settings.get('username', '')})")
    except Exception as e:
        logger.error(f"Erreur initialisation Frigate depuis DB: {e}")
