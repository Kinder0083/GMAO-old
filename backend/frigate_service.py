"""
Service d'intégration Frigate NVR
- Connexion à l'API Frigate avec authentification JWT
- Proxy pour snapshots et streams
- Configuration WebRTC via go2rtc
"""
import os
import httpx
import logging
import traceback
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

FRIGATE_TIMEOUT = 15.0


class FrigateService:
    """Service de connexion à Frigate NVR avec authentification JWT"""
    
    def __init__(self, host: str, api_port: int = 5000, go2rtc_port: int = 1984, use_https: bool = False, username: str = "", password: str = ""):
        self.host = host
        self.api_port = api_port
        self.go2rtc_port = go2rtc_port
        self.use_https = use_https
        self.username = username
        self.password = password
        
        protocol = "https" if use_https else "http"
        self.base_url = f"{protocol}://{host}:{api_port}"
        
        # go2rtc est intégré dans Frigate et accessible via le même port
        # Les endpoints go2rtc sont sous /api/go2rtc/ dans Frigate
        self.go2rtc_url = f"{protocol}://{host}:{api_port}/api/go2rtc"
        
        # Port WebRTC séparé (8555 par défaut)
        self.webrtc_port = go2rtc_port if go2rtc_port != 1984 else 8555
        
        logger.info(f"[FRIGATE] Service initialisé: API={self.base_url}, go2rtc={self.go2rtc_url}, webrtc_port={self.webrtc_port}, user={username}")
    
    async def _create_authenticated_client(self) -> tuple[httpx.AsyncClient, bool]:
        """
        Crée un client HTTP et effectue l'authentification si nécessaire
        Returns: (client, login_success)
        """
        client = httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False)
        
        if not self.username or not self.password:
            return client, True
        
        try:
            login_url = f"{self.base_url}/api/login"
            logger.info(f"[FRIGATE] Login: POST {login_url} (user={self.username}, pass_len={len(self.password)})")
            
            # IMPORTANT: Frigate attend du JSON, pas du form-data !
            login_payload = {
                "user": self.username,
                "password": self.password
            }
            
            response = await client.post(
                login_url,
                json=login_payload,  # JSON, pas data=
                headers={"Content-Type": "application/json"},
                follow_redirects=True
            )
            
            logger.info(f"[FRIGATE] Login response: {response.status_code}")
            logger.info(f"[FRIGATE] Login cookies: {list(response.cookies.keys())}")
            
            if response.status_code == 200:
                logger.info("[FRIGATE] Login réussi!")
                return client, True
            elif response.status_code == 401:
                logger.error(f"[FRIGATE] Login échoué: Identifiants incorrects")
                await client.aclose()
                return httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False), False
            elif response.status_code == 422:
                logger.error(f"[FRIGATE] Login échoué: Erreur de validation - {response.text}")
                await client.aclose()
                return httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False), False
            else:
                logger.error(f"[FRIGATE] Login échoué: {response.status_code} - {response.text[:500]}")
                await client.aclose()
                return httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False), False
                
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur login: {type(e).__name__}: {e}")
            await client.aclose()
            return httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False), False
    
    async def test_connection(self) -> Dict[str, Any]:
        """Teste la connexion à Frigate"""
        logger.info(f"[FRIGATE] Test connexion vers {self.base_url}")
        
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            
            if not login_ok:
                if client:
                    await client.aclose()
                return {
                    "success": False,
                    "message": "Échec d'authentification - Vérifiez votre identifiant et mot de passe Frigate",
                    "details": {"host": self.host, "api_port": self.api_port, "username": self.username}
                }
            
            # Tester les endpoints API
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
                    logger.info(f"[FRIGATE] GET {url}")
                    response = await client.get(url)
                    logger.info(f"[FRIGATE] Réponse: {response.status_code}")
                    
                    if response.status_code == 200:
                        api_success = True
                        if 'version' in url:
                            version = response.text.strip().strip('"')
                        else:
                            data = response.json()
                            version = data.get('service', {}).get('version', 'connected')
                        break
                    elif response.status_code == 401:
                        last_error = "Session expirée ou authentification requise"
                    else:
                        last_error = f"HTTP {response.status_code}"
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"[FRIGATE] Erreur {url}: {e}")
            
            if not api_success:
                await client.aclose()
                return {
                    "success": False,
                    "message": f"Impossible de se connecter à Frigate. Erreur: {last_error}",
                    "details": {"host": self.host, "api_port": self.api_port, "last_error": last_error}
                }
            
            # Tester go2rtc
            go2rtc_ok = False
            try:
                go2rtc_resp = await client.get(f"{self.go2rtc_url}/api/streams")
                go2rtc_ok = go2rtc_resp.status_code == 200
            except:
                pass
            
            await client.aclose()
            return {
                "success": True,
                "version": version,
                "go2rtc_available": go2rtc_ok,
                "message": f"Connecté à Frigate {version}" + (" (go2rtc OK)" if go2rtc_ok else ""),
                "details": {"host": self.host, "api_port": self.api_port, "go2rtc_port": self.go2rtc_port}
            }
                
        except httpx.ConnectError as e:
            if client:
                await client.aclose()
            return {"success": False, "message": f"Connexion refusée: {self.host}:{self.api_port}", "details": {"error": str(e)}}
        except httpx.TimeoutException:
            if client:
                await client.aclose()
            return {"success": False, "message": f"Timeout: Frigate ne répond pas", "details": {"host": self.host}}
        except Exception as e:
            if client:
                await client.aclose()
            return {"success": False, "message": f"Erreur: {e}", "details": {"traceback": traceback.format_exc()}}
    
    async def get_cameras(self) -> List[Dict[str, Any]]:
        """Récupère la liste des caméras Frigate"""
        try:
            client, login_ok = await self._create_authenticated_client()
            async with client:
                if not login_ok:
                    return []
                response = await client.get(f"{self.base_url}/api/config")
                if response.status_code == 200:
                    config = response.json()
                    return [{"name": name, "enabled": cfg.get("enabled", True)} 
                            for name, cfg in config.get("cameras", {}).items()]
                return []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur get_cameras: {e}")
            return []
    
    async def get_go2rtc_streams(self) -> List[Dict[str, Any]]:
        """Récupère la liste des streams go2rtc"""
        try:
            async with httpx.AsyncClient(timeout=FRIGATE_TIMEOUT, verify=False) as client:
                response = await client.get(f"{self.go2rtc_url}/api/streams")
                if response.status_code == 200:
                    data = response.json()
                    return [{"name": name, "active": len(producers) > 0 if isinstance(producers, list) else False}
                            for name, producers in data.items()]
                return []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur get_go2rtc_streams: {e}")
            return []
    
    async def get_camera_snapshot(self, camera_name: str, quality: int = 70) -> Optional[bytes]:
        """Récupère le snapshot d'une caméra"""
        try:
            client, login_ok = await self._create_authenticated_client()
            async with client:
                if not login_ok:
                    return None
                url = f"{self.base_url}/api/{camera_name}/latest.jpg"
                response = await client.get(url, params={"quality": quality})
                return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur snapshot: {e}")
            return None
    
    async def get_camera_thumbnail(self, camera_name: str, height: int = 180) -> Optional[bytes]:
        """Récupère une vignette"""
        try:
            client, login_ok = await self._create_authenticated_client()
            async with client:
                if not login_ok:
                    return None
                url = f"{self.base_url}/api/{camera_name}/latest.jpg"
                response = await client.get(url, params={"h": height, "quality": 60})
                return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur thumbnail: {e}")
            return None
    
    async def get_camera_events(self, camera_name: str = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Récupère les événements de détection"""
        try:
            client, login_ok = await self._create_authenticated_client()
            async with client:
                if not login_ok:
                    return []
                params = {"limit": limit}
                if camera_name:
                    params["camera"] = camera_name
                response = await client.get(f"{self.base_url}/api/events", params=params)
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur events: {e}")
            return []
    
    async def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques Frigate"""
        try:
            client, login_ok = await self._create_authenticated_client()
            async with client:
                if not login_ok:
                    return {}
                response = await client.get(f"{self.base_url}/api/stats")
                return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur stats: {e}")
            return {}
    
    def get_webrtc_url(self, stream_name: str) -> str:
        return f"ws://{self.host}:{self.go2rtc_port}/api/ws?src={stream_name}"
    
    def get_webrtc_offer_url(self, stream_name: str) -> str:
        return f"{self.go2rtc_url}/api/webrtc?src={stream_name}"
    
    def get_mjpeg_url(self, camera_name: str) -> str:
        return f"{self.base_url}/api/{camera_name}"


# Instance globale
_frigate_service: Optional[FrigateService] = None


def get_frigate_service() -> Optional[FrigateService]:
    return _frigate_service


def init_frigate_service(host: str, api_port: int = 5000, go2rtc_port: int = 1984, use_https: bool = False, username: str = "", password: str = "") -> FrigateService:
    global _frigate_service
    _frigate_service = FrigateService(host, api_port, go2rtc_port, use_https, username, password)
    return _frigate_service


def reset_frigate_service():
    global _frigate_service
    _frigate_service = None
