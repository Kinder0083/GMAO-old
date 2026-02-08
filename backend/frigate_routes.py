"""
Routes API pour l'intégration Frigate NVR
Ces routes doivent être enregistrées AVANT les routes dynamiques /{camera_id}
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import traceback
import base64

from auth import decode_access_token
from dependencies import get_current_user, get_database
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
    go2rtc_port: int = Field(1984, ge=1, le=65535)  # Port go2rtc pour accès direct aux streams
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
                "go2rtc_port": 1984,  # Port go2rtc par défaut
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
        # Récupérer l'ancien mot de passe si nécessaire
        existing_settings = await db.camera_settings.find_one({"type": "frigate"})
        saved_password = existing_settings.get("password", "") if existing_settings else ""
        
        # Supprimer l'ancien document pour éviter la fusion des champs (notamment stream_mapping)
        await db.camera_settings.delete_one({"type": "frigate"})
        
        # Préparer les nouvelles données
        update_data = {
            "type": "frigate",
            "enabled": settings_data.enabled,
            "host": settings_data.host,
            "api_port": settings_data.api_port,
            "go2rtc_port": settings_data.go2rtc_port,
            "use_https": settings_data.use_https,
            "username": settings_data.username,
            "password": settings_data.password if settings_data.password else saved_password,
            "stream_mapping": settings_data.stream_mapping or {},  # Remplace complètement
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insérer le nouveau document
        await db.camera_settings.insert_one(update_data)
        
        # Réinitialiser le service Frigate
        password_to_use = settings_data.password if settings_data.password else saved_password
        if settings_data.enabled and settings_data.host:
            init_frigate_service(
                settings_data.host,
                settings_data.api_port,
                settings_data.go2rtc_port,
                settings_data.use_https,
                settings_data.username,
                password_to_use
            )
        else:
            reset_frigate_service()
        
        logger.info(f"Paramètres Frigate mis à jour: enabled={settings_data.enabled}, host={settings_data.host}, https={settings_data.use_https}, user={settings_data.username}, mappings={len(settings_data.stream_mapping or {})}")
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
    
    # Si pas de mot de passe fourni, utiliser celui sauvegardé en DB
    if not password and username:
        existing_settings = await db.camera_settings.find_one({"type": "frigate"})
        if existing_settings:
            password = existing_settings.get("password", "")
            logger.info(f"[FRIGATE API] Utilisation du mot de passe sauvegardé (len={len(password)})")
    
    logger.info(f"[FRIGATE API] Test connexion demandé: host={host}, api_port={api_port}, go2rtc_port={go2rtc_port}, https={use_https}, user={username}, pass_len={len(password)}")
    
    if not host:
        return {"success": False, "message": "Adresse IP requise"}
    
    try:
        service = FrigateService(host, api_port, go2rtc_port, use_https, username, password)
        result = await service.test_connection()
        
        logger.info(f"[FRIGATE API] Résultat test: success={result.get('success')}, message={result.get('message')}")
        
        if result.get("success"):
            # Les streams et cameras sont déjà inclus dans le résultat de test_connection
            streams = result.get("streams", [])
            cameras = result.get("cameras", [])
            logger.info(f"[FRIGATE API] Streams: {len(streams)}, Caméras: {len(cameras)}")
        
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
    stream: str = Query(None, description="Nom du stream go2rtc (optionnel)"),
    current_user: dict = Depends(get_current_user)
):
    """Récupère une vignette d'une caméra Frigate"""
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        thumbnail = await service.get_camera_thumbnail(camera_name, height, stream_name=stream)
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


@router.get("/frame/{camera_name}")
async def get_frigate_frame_image(
    camera_name: str,
    height: int = Query(480, ge=60, le=720),
    token: str = Query(None, description="JWT token pour l'authentification via URL"),
    stream: str = Query(None, description="Nom du stream go2rtc (optionnel)")
):
    """
    Récupère une image/frame d'une caméra Frigate et la retourne directement en binaire.
    Permet l'authentification via query param pour utilisation dans des balises <img>.
    """
    try:
        # Validation du token
        if not token:
            raise HTTPException(status_code=401, detail="Token manquant")
        
        try:
            payload = decode_access_token(token)
            if not payload:
                raise HTTPException(status_code=401, detail="Token invalide")
        except Exception as e:
            logger.error(f"[FRAME] Erreur validation token: {e}")
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        # Récupérer l'image
        image_data = await service.get_camera_thumbnail(camera_name, height, stream_name=stream)
        if image_data:
            return Response(
                content=image_data,
                media_type="image/jpeg",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Image non disponible")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération frame Frigate: {e}")
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


@router.get("/stream/{stream_name}")
async def stream_frigate_mjpeg(
    stream_name: str,
    token: str = Query(..., description="JWT token pour l'authentification")
):
    """
    Stream MJPEG d'un flux Frigate via proxy authentifié.
    stream_name: nom COMPLET du flux go2rtc (ex: "Ouest_hq", "Ouest_lq")
    Le backend récupère les frames depuis Frigate et les transmet au client.
    """
    # Valider le token manuellement
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré"
        )
    
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        logger.info(f"[FRIGATE] Démarrage stream MJPEG pour: {stream_name}")
        
        return StreamingResponse(
            service.stream_mjpeg(stream_name),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur streaming MJPEG Frigate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webrtc/{stream_name}")
async def get_webrtc_info(
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


class WebRTCOfferRequest(BaseModel):
    """Requête WebRTC offer"""
    sdp: str
    type: str = "offer"


@router.post("/webrtc/{stream_name}/offer")
async def proxy_webrtc_offer(
    stream_name: str,
    offer: WebRTCOfferRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Proxy WebRTC: reçoit l'offre SDP du frontend et la transmet à go2rtc via l'API Frigate.
    Retourne la réponse SDP de go2rtc.
    C'est la même méthode que Home Assistant utilise.
    """
    try:
        service = get_frigate_service()
        if not service:
            raise HTTPException(status_code=503, detail="Frigate non configuré")
        
        # URL go2rtc via l'API Frigate authentifiée (pas d'accès direct au port 1984)
        go2rtc_url = f"{service.base_url}/api/go2rtc/webrtc?src={stream_name}"
        
        logger.info(f"[WEBRTC PROXY] POST vers: {go2rtc_url}")
        
        # Utiliser le client authentifié du service Frigate
        client, login_ok = await service._create_authenticated_client()
        if not login_ok:
            raise HTTPException(status_code=502, detail="Authentification Frigate échouée")
        
        try:
            # Envoyer l'offre SDP en tant que texte brut (méthode Home Assistant)
            response = await client.post(
                go2rtc_url,
                content=offer.sdp,
                headers={"Content-Type": "application/sdp"}
            )
            
            logger.info(f"[WEBRTC PROXY] Response status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'unknown')}")
            
            # go2rtc retourne 201 Created pour WebRTC (pas 200)
            if response.status_code in (200, 201):
                content_type = response.headers.get('content-type', '')
                
                if 'application/sdp' in content_type or 'text/plain' in content_type or not content_type.startswith('application/json'):
                    # Réponse en texte brut (SDP answer)
                    answer_sdp = response.text
                    logger.info(f"[WEBRTC PROXY] Answer SDP reçue ({len(answer_sdp)} chars)")
                    return {"type": "answer", "sdp": answer_sdp}
                else:
                    # Réponse JSON
                    answer = response.json()
                    logger.info(f"[WEBRTC PROXY] Answer JSON reçue, type: {answer.get('type')}")
                    return answer
            else:
                error_text = response.text[:500]
                logger.error(f"[WEBRTC PROXY] Erreur: {response.status_code} - {error_text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"go2rtc error: {error_text}"
                )
        finally:
            await client.aclose()
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[WEBRTC PROXY] Erreur: {type(e).__name__}: {e}")
        logger.error(f"[WEBRTC PROXY] Traceback: {traceback.format_exc()}")
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
