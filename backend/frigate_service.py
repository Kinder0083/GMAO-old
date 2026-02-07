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
            
            # Tester go2rtc (intégré dans Frigate)
            go2rtc_ok = False
            go2rtc_streams = []
            try:
                # go2rtc est accessible via /api/go2rtc/streams dans Frigate
                go2rtc_resp = await client.get(f"{self.base_url}/api/go2rtc/streams")
                logger.info(f"[FRIGATE] go2rtc test: {go2rtc_resp.status_code}")
                if go2rtc_resp.status_code == 200:
                    go2rtc_ok = True
                    go2rtc_data = go2rtc_resp.json()
                    go2rtc_streams = [{"name": name, "active": len(producers) > 0 if isinstance(producers, list) else False}
                                      for name, producers in go2rtc_data.items()]
                    logger.info(f"[FRIGATE] go2rtc streams disponibles: {[s['name'] for s in go2rtc_streams]}")
            except Exception as e:
                logger.warning(f"[FRIGATE] Erreur test go2rtc: {e}")
            
            # Récupérer les caméras
            cameras = []
            try:
                cameras_resp = await client.get(f"{self.base_url}/api/config")
                logger.info(f"[FRIGATE] cameras config: {cameras_resp.status_code}")
                if cameras_resp.status_code == 200:
                    config = cameras_resp.json()
                    cameras = [{"name": name, "enabled": cfg.get("enabled", True)} 
                               for name, cfg in config.get("cameras", {}).items()]
                    logger.info(f"[FRIGATE] Caméras trouvées: {[c['name'] for c in cameras]}")
            except Exception as e:
                logger.warning(f"[FRIGATE] Erreur récup caméras: {e}")
            
            await client.aclose()
            return {
                "success": True,
                "version": version,
                "go2rtc_available": go2rtc_ok,
                "streams": go2rtc_streams,  # Inclure les streams dans le résultat
                "cameras": cameras,  # Inclure les caméras dans le résultat
                "message": f"Connecté à Frigate {version}" + (" (go2rtc OK)" if go2rtc_ok else ""),
                "details": {"host": self.host, "api_port": self.api_port, "go2rtc_port": self.webrtc_port}
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
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return []
            response = await client.get(f"{self.base_url}/api/config")
            await client.aclose()
            if response.status_code == 200:
                config = response.json()
                return [{"name": name, "enabled": cfg.get("enabled", True)} 
                        for name, cfg in config.get("cameras", {}).items()]
            return []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur get_cameras: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return []
    
    async def get_go2rtc_streams(self) -> List[Dict[str, Any]]:
        """Récupère la liste des streams go2rtc (intégré dans Frigate)"""
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return []
            
            # go2rtc est intégré dans Frigate, endpoint: /api/go2rtc/streams
            response = await client.get(f"{self.base_url}/api/go2rtc/streams")
            await client.aclose()
            logger.info(f"[FRIGATE] go2rtc streams response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"[FRIGATE] go2rtc streams data: {list(data.keys()) if isinstance(data, dict) else data}")
                return [{"name": name, "active": len(producers) > 0 if isinstance(producers, list) else False}
                        for name, producers in data.items()]
            return []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur get_go2rtc_streams: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return []
    
    async def get_camera_snapshot(self, camera_name: str, quality: int = 70) -> Optional[bytes]:
        """Récupère le snapshot d'une caméra"""
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return None
            url = f"{self.base_url}/api/{camera_name}/latest.jpg"
            response = await client.get(url, params={"quality": quality})
            await client.aclose()
            return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur snapshot: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return None
    
    async def get_camera_thumbnail(self, camera_name: str, height: int = 180) -> Optional[bytes]:
        """Récupère une vignette via l'API Frigate authentifiée"""
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return None
            
            # Essayer go2rtc via l'API Frigate (pas de connexion directe au port 1984)
            go2rtc_url = f"{self.base_url}/api/go2rtc/frame.jpeg?src={camera_name}"
            logger.info(f"[FRIGATE] Thumbnail via go2rtc: {go2rtc_url}")
            response = await client.get(go2rtc_url)
            if response.status_code == 200:
                await client.aclose()
                return response.content
            
            # Fallback: snapshot Frigate classique
            base_name = camera_name.replace('_hq', '').replace('_lq', '').replace('_sub', '').replace('_h264', '').replace('_H264', '')
            url = f"{self.base_url}/api/{base_name}/latest.jpg"
            logger.info(f"[FRIGATE] Thumbnail fallback: {url}")
            response = await client.get(url, params={"h": height, "quality": 60})
            await client.aclose()
            return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur thumbnail: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return None
    
    async def get_camera_events(self, camera_name: str = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Récupère les événements de détection"""
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return []
            params = {"limit": limit}
            if camera_name:
                params["camera"] = camera_name
            response = await client.get(f"{self.base_url}/api/events", params=params)
            await client.aclose()
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur events: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return []
    
    async def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques Frigate"""
        client = None
        try:
            client, login_ok = await self._create_authenticated_client()
            if not login_ok:
                if client:
                    await client.aclose()
                return {}
            response = await client.get(f"{self.base_url}/api/stats")
            await client.aclose()
            return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur stats: {e}")
            if client:
                try:
                    await client.aclose()
                except:
                    pass
            return {}
    
    def get_webrtc_url(self, stream_name: str) -> str:
        """URL WebSocket pour WebRTC (port 8555 par défaut)"""
        protocol = "wss" if self.use_https else "ws"
        return f"{protocol}://{self.host}:{self.webrtc_port}/api/ws?src={stream_name}"
    
    def get_webrtc_offer_url(self, stream_name: str) -> str:
        """URL HTTP pour l'offre WebRTC via Frigate"""
        return f"{self.base_url}/api/go2rtc/webrtc?src={stream_name}"
    
    def get_mse_url(self, stream_name: str) -> str:
        """URL MSE pour streaming via Frigate (alternative à WebRTC)"""
        return f"{self.base_url}/api/go2rtc/stream.mp4?src={stream_name}"
    
    def get_mjpeg_url(self, camera_name: str) -> str:
        return f"{self.base_url}/api/{camera_name}"
    
    async def stream_mjpeg(self, stream_name: str):
        """
        Génère un flux MJPEG CONTINU en se connectant au vrai endpoint MJPEG de Frigate.
        Utilise l'endpoint /<camera_name> qui fournit un flux multipart continu.
        """
        import asyncio
        
        # Extraire le nom de base de la caméra (sans _hq/_lq suffix)
        camera_name = stream_name.split('_')[0] if '_' in stream_name else stream_name
        
        # URL du flux MJPEG continu de Frigate (endpoint natif)
        mjpeg_url = f"{self.base_url}/{camera_name}"
        
        logger.info(f"[FRIGATE] Connexion flux MJPEG continu: {mjpeg_url}")
        
        # Client authentifié
        client, login_ok = await self._create_authenticated_client()
        if not login_ok:
            logger.error(f"[FRIGATE] Authentification échouée pour stream MJPEG {stream_name}")
            if client:
                await client.aclose()
            return
        
        try:
            # Connexion streaming au flux MJPEG
            async with client.stream('GET', mjpeg_url, timeout=None) as response:
                if response.status_code != 200:
                    logger.error(f"[FRIGATE] Erreur connexion MJPEG: {response.status_code}")
                    return
                
                logger.info(f"[FRIGATE] Flux MJPEG connecté pour {camera_name}")
                frame_count = 0
                buffer = b""
                
                # Lire le stream en continu
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    buffer += chunk
                    
                    # Chercher les frames JPEG dans le buffer
                    while True:
                        # Chercher le début d'une frame JPEG (FFD8)
                        start = buffer.find(b'\xff\xd8')
                        if start == -1:
                            break
                        
                        # Chercher la fin de la frame JPEG (FFD9)
                        end = buffer.find(b'\xff\xd9', start + 2)
                        if end == -1:
                            break
                        
                        # Extraire la frame complète
                        frame = buffer[start:end + 2]
                        buffer = buffer[end + 2:]
                        
                        frame_count += 1
                        if frame_count == 1:
                            logger.info(f"[FRIGATE] Première frame reçue ({len(frame)} bytes)")
                        
                        # Envoyer la frame au client
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n"
                            b"Content-Length: " + str(len(frame)).encode() + b"\r\n"
                            b"\r\n" + frame + b"\r\n"
                        )
                        
        except httpx.ReadTimeout:
            logger.warning(f"[FRIGATE] Timeout flux MJPEG {stream_name}")
        except Exception as e:
            logger.error(f"[FRIGATE] Erreur stream MJPEG: {type(e).__name__}: {e}")
        finally:
            await client.aclose()
            logger.info(f"[FRIGATE] Stream MJPEG terminé pour {stream_name}")


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
