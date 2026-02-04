"""
Service d'intégration Frigate NVR
- Connexion à l'API Frigate
- Proxy pour snapshots et streams
- Configuration WebRTC via go2rtc
"""
import os
import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Timeout pour les requêtes HTTP vers Frigate
FRIGATE_TIMEOUT = 10.0


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
    
    async def test_connection(self) -> Dict[str, Any]:
        """Teste la connexion à Frigate"""
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT) as client:
                # Tester l'API Frigate
                response = await client.get(f"{self.base_url}/api/version")
                if response.status_code == 200:
                    version = response.text.strip().strip('"')
                    
                    # Tester go2rtc
                    go2rtc_ok = False
                    try:
                        go2rtc_resp = await client.get(f"{self.go2rtc_url}/api/streams")
                        go2rtc_ok = go2rtc_resp.status_code == 200
                    except:
                        pass
                    
                    return {
                        "success": True,
                        "version": version,
                        "go2rtc_available": go2rtc_ok,
                        "message": f"Connecté à Frigate {version}"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Erreur API Frigate: {response.status_code}"
                    }
        except httpx.ConnectError:
            return {
                "success": False,
                "message": f"Impossible de se connecter à {self.host}:{self.api_port}"
            }
        except Exception as e:
            logger.error(f"Erreur test connexion Frigate: {e}")
            return {
                "success": False,
                "message": str(e)
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
