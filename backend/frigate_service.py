"""
Service d'intégration Frigate NVR
- Connexion à l'API Frigate
- Proxy pour snapshots et streams
- Configuration WebRTC via go2rtc
"""
import os
import httpx
import logging
import traceback
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

# Configurer le logging pour être plus verbeux
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Timeout pour les requêtes HTTP vers Frigate
FRIGATE_TIMEOUT = 15.0


class FrigateService:
    """Service de connexion à Frigate NVR"""
    
    def __init__(self, host: str, api_port: int = 5000, go2rtc_port: int = 1984):
        """
        Initialise le service Frigate
        
        Args:
            host: Adresse IP ou hostname de Frigate
            api_port: Port de l'API Frigate (défaut: 5000)
            go2rtc_port: Port de go2rtc pour WebRTC (défaut: 1984)
        """
        self.host = host
        self.api_port = api_port
        self.go2rtc_port = go2rtc_port
        self.base_url = f"http://{host}:{api_port}"
        self.go2rtc_url = f"http://{host}:{go2rtc_port}"
        logger.info(f"[FRIGATE] Service initialisé: API={self.base_url}, go2rtc={self.go2rtc_url}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Teste la connexion à Frigate"""
        logger.info(f"[FRIGATE] Test connexion vers {self.base_url}")
        
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False) as client:
                # Tester l'API Frigate - essayer plusieurs endpoints
                test_urls = [
                    f"{self.base_url}/api/version",
                    f"{self.base_url}/api/stats",
                    f"{self.base_url}/api/config",
                ]
                
                version = None
                api_success = False
                last_error = None
                
                for url in test_urls:
                    try:
                        logger.info(f"[FRIGATE] Tentative: GET {url}")
                        response = await client.get(url)
                        logger.info(f"[FRIGATE] Réponse {url}: status={response.status_code}")
                        
                        if response.status_code == 200:
                            api_success = True
                            if 'version' in url:
                                version = response.text.strip().strip('"')
                            elif 'stats' in url or 'config' in url:
                                data = response.json()
                                version = data.get('service', {}).get('version', 'unknown')
                            logger.info(f"[FRIGATE] API OK! Version: {version}")
                            break
                        else:
                            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                            logger.warning(f"[FRIGATE] {url} retourné: {last_error}")
                    except httpx.ConnectError as ce:
                        last_error = f"ConnectError sur {url}: {str(ce)}"
                        logger.warning(f"[FRIGATE] {last_error}")
                    except httpx.TimeoutException as te:
                        last_error = f"Timeout sur {url}: {str(te)}"
                        logger.warning(f"[FRIGATE] {last_error}")
                    except Exception as e:
                        last_error = f"Exception sur {url}: {str(e)}"
                        logger.warning(f"[FRIGATE] {last_error}")
                
                if not api_success:
                    error_msg = f"Impossible de se connecter à Frigate sur {self.host}:{self.api_port}. Dernière erreur: {last_error}"
                    logger.error(f"[FRIGATE] {error_msg}")
                    return {
                        "success": False,
                        "message": error_msg,
                        "details": {
                            "host": self.host,
                            "api_port": self.api_port,
                            "last_error": last_error
                        }
                    }
                
                # Tester go2rtc
                go2rtc_ok = False
                go2rtc_error = None
                try:
                    go2rtc_test_url = f"{self.go2rtc_url}/api/streams"
                    logger.info(f"[FRIGATE] Test go2rtc: GET {go2rtc_test_url}")
                    go2rtc_resp = await client.get(go2rtc_test_url)
                    logger.info(f"[FRIGATE] go2rtc réponse: status={go2rtc_resp.status_code}")
                    go2rtc_ok = go2rtc_resp.status_code == 200
                    if not go2rtc_ok:
                        go2rtc_error = f"HTTP {go2rtc_resp.status_code}"
                except Exception as e:
                    go2rtc_error = str(e)
                    logger.warning(f"[FRIGATE] Erreur go2rtc: {go2rtc_error}")
                
                result = {
                    "success": True,
                    "version": version or "unknown",
                    "go2rtc_available": go2rtc_ok,
                    "message": f"Connecté à Frigate {version}" + (" (go2rtc OK)" if go2rtc_ok else f" (go2rtc: {go2rtc_error})"),
                    "details": {
                        "host": self.host,
                        "api_port": self.api_port,
                        "go2rtc_port": self.go2rtc_port,
                        "go2rtc_error": go2rtc_error
                    }
                }
                logger.info(f"[FRIGATE] Test réussi: {result}")
                return result
                
        except httpx.ConnectError as e:
            error_msg = f"Connexion refusée vers {self.host}:{self.api_port} - Vérifiez que Frigate est accessible"
            logger.error(f"[FRIGATE] ConnectError: {e}")
            logger.error(f"[FRIGATE] {error_msg}")
            return {
                "success": False,
                "message": error_msg,
                "details": {"error_type": "ConnectError", "raw_error": str(e)}
            }
        except httpx.TimeoutException as e:
            error_msg = f"Timeout après {FRIGATE_TIMEOUT}s - Frigate ne répond pas sur {self.host}:{self.api_port}"
            logger.error(f"[FRIGATE] TimeoutException: {e}")
            return {
                "success": False,
                "message": error_msg,
                "details": {"error_type": "Timeout", "timeout_seconds": FRIGATE_TIMEOUT}
            }
        except Exception as e:
            error_msg = f"Erreur inattendue: {type(e).__name__}: {str(e)}"
            logger.error(f"[FRIGATE] Exception: {e}")
            logger.error(f"[FRIGATE] Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "message": error_msg,
                "details": {"error_type": type(e).__name__, "traceback": traceback.format_exc()}
            }
    
    async def get_cameras(self) -> List[Dict[str, Any]]:
        """Récupère la liste des caméras configurées dans Frigate"""
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                response = await client.get(f"{self.base_url}/api/config")
                if response.status_code == 200:
                    config = response.json()
                    cameras = []
                    
                    for name, cam_config in config.get("cameras", {}).items():
                        # Récupérer le dernier snapshot si disponible
                        cameras.append({
                            "name": name,
                            "enabled": cam_config.get("enabled", True),
                            "detect": cam_config.get("detect", {}),
                            "record": cam_config.get("record", {}),
                            "snapshots": cam_config.get("snapshots", {}),
                        })
                    
                    return cameras
                return []
        except Exception as e:
            logger.error(f"Erreur récupération caméras Frigate: {e}")
            return []
    
    async def get_go2rtc_streams(self) -> List[Dict[str, Any]]:
        """Récupère la liste des streams go2rtc disponibles"""
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                response = await client.get(f"{self.go2rtc_url}/api/streams")
                if response.status_code == 200:
                    streams_data = response.json()
                    streams = []
                    
                    for name, producers in streams_data.items():
                        streams.append({
                            "name": name,
                            "producers": len(producers) if isinstance(producers, list) else 0,
                            "active": len(producers) > 0 if isinstance(producers, list) else False
                        })
                    
                    return streams
                return []
        except Exception as e:
            logger.error(f"Erreur récupération streams go2rtc: {e}")
            return []
    
    async def get_camera_snapshot(self, camera_name: str, quality: int = 70) -> Optional[bytes]:
        """
        Récupère le dernier snapshot d'une caméra
        
        Args:
            camera_name: Nom de la caméra dans Frigate
            quality: Qualité JPEG (1-100)
        
        Returns:
            Bytes de l'image JPEG ou None
        """
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                # Endpoint Frigate pour le dernier snapshot
                url = f"{self.base_url}/api/{camera_name}/latest.jpg"
                params = {"quality": quality}
                
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.content
                
                logger.warning(f"Snapshot non disponible pour {camera_name}: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Erreur récupération snapshot {camera_name}: {e}")
            return None
    
    async def get_camera_thumbnail(self, camera_name: str, height: int = 180) -> Optional[bytes]:
        """
        Récupère une vignette de la caméra (plus légère que le snapshot)
        
        Args:
            camera_name: Nom de la caméra
            height: Hauteur de la vignette
        
        Returns:
            Bytes de l'image ou None
        """
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                url = f"{self.base_url}/api/{camera_name}/latest.jpg"
                params = {"h": height, "quality": 60}
                
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.content
                return None
        except Exception as e:
            logger.error(f"Erreur récupération thumbnail {camera_name}: {e}")
            return None
    
    async def get_camera_events(self, camera_name: str = None, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Récupère les événements de détection récents
        
        Args:
            camera_name: Filtrer par caméra (optionnel)
            limit: Nombre max d'événements
        
        Returns:
            Liste des événements
        """
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                url = f"{self.base_url}/api/events"
                params = {"limit": limit}
                if camera_name:
                    params["camera"] = camera_name
                
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                return []
        except Exception as e:
            logger.error(f"Erreur récupération événements: {e}")
            return []
    
    async def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques de Frigate"""
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                response = await client.get(f"{self.base_url}/api/stats")
                if response.status_code == 200:
                    return response.json()
                return {}
        except Exception as e:
            logger.error(f"Erreur récupération stats Frigate: {e}")
            return {}
    
    def get_webrtc_url(self, stream_name: str) -> str:
        """
        Retourne l'URL WebRTC pour un stream go2rtc
        
        Args:
            stream_name: Nom du stream (ex: "Ouest_hq")
        
        Returns:
            URL WebSocket pour la connexion WebRTC
        """
        return f"ws://{self.host}:{self.go2rtc_port}/api/ws?src={stream_name}"
    
    def get_webrtc_offer_url(self, stream_name: str) -> str:
        """
        Retourne l'URL HTTP pour récupérer l'offer SDP WebRTC
        
        Args:
            stream_name: Nom du stream
        
        Returns:
            URL pour l'API WebRTC
        """
        return f"{self.go2rtc_url}/api/webrtc?src={stream_name}"
    
    def get_mjpeg_url(self, camera_name: str) -> str:
        """
        Retourne l'URL du stream MJPEG pour une caméra
        
        Args:
            camera_name: Nom de la caméra
        
        Returns:
            URL du stream MJPEG
        """
        return f"{self.base_url}/api/{camera_name}"


# Instance globale (sera initialisée avec les paramètres de la DB)
_frigate_service: Optional[FrigateService] = None


def get_frigate_service() -> Optional[FrigateService]:
    """Retourne l'instance du service Frigate"""
    return _frigate_service


def init_frigate_service(host: str, api_port: int = 5000, go2rtc_port: int = 1984) -> FrigateService:
    """Initialise le service Frigate avec les paramètres donnés"""
    global _frigate_service
    _frigate_service = FrigateService(host, api_port, go2rtc_port)
    return _frigate_service


def reset_frigate_service():
    """Réinitialise le service Frigate"""
    global _frigate_service
    _frigate_service = None
