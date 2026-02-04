"""
Service de gestion des caméras RTSP/ONVIF
- Découverte ONVIF automatique
- Capture de snapshots
- Gestion du streaming HLS
- Cache de frames en mémoire pour le live
"""
import os
import asyncio
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path
import cv2
import base64
from cryptography.fernet import Fernet
import threading
import time
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Clé de chiffrement pour les mots de passe (générée une fois)
ENCRYPTION_KEY = os.environ.get('CAMERA_ENCRYPTION_KEY', Fernet.generate_key().decode())
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

# Chemins de stockage
SNAPSHOTS_BASE_PATH = Path("/app/data/cameras/snapshots")
HLS_BASE_PATH = Path("/app/data/cameras/hls")

# Créer les dossiers s'ils n'existent pas
SNAPSHOTS_BASE_PATH.mkdir(parents=True, exist_ok=True)
HLS_BASE_PATH.mkdir(parents=True, exist_ok=True)

# Cache des processus FFmpeg actifs (max 3)
active_streams: Dict[str, subprocess.Popen] = {}
stream_lock = threading.Lock()
MAX_ACTIVE_STREAMS = 3

# ============================================
# SYSTÈME DE CACHE DE FRAMES POUR LE LIVE
# ============================================

# Cache des frames en mémoire (camera_id -> {frame_base64, timestamp, capturing})
frame_cache: Dict[str, Dict[str, Any]] = {}
frame_cache_lock = threading.Lock()

# Workers de capture actifs
capture_workers: Dict[str, threading.Thread] = {}
capture_workers_lock = threading.Lock()

# Thread pool pour les captures parallèles
capture_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="cam_capture_")


def start_frame_capture_worker(camera_id: str, rtsp_url: str, username: str = "", password: str = ""):
    """
    Démarre un worker qui capture des frames en continu pour une caméra.
    Les frames sont stockées en mémoire pour un accès instantané.
    """
    with capture_workers_lock:
        # Vérifier si déjà actif
        if camera_id in capture_workers and capture_workers[camera_id].is_alive():
            logger.debug(f"Worker déjà actif pour {camera_id}")
            return True
        
        # Initialiser le cache
        with frame_cache_lock:
            frame_cache[camera_id] = {
                "frame_base64": None,
                "timestamp": None,
                "capturing": True,
                "error": None
            }
        
        # Construire l'URL avec auth
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        # Créer et démarrer le thread worker
        worker = threading.Thread(
            target=_frame_capture_loop,
            args=(camera_id, full_url),
            daemon=True,
            name=f"capture_{camera_id[:8]}"
        )
        capture_workers[camera_id] = worker
        worker.start()
        
        logger.info(f"Worker de capture démarré pour {camera_id}")
        return True


def _frame_capture_loop(camera_id: str, rtsp_url: str):
    """
    Boucle de capture des frames (exécutée dans un thread séparé).
    Capture ~10 frames par seconde.
    """
    cap = None
    reconnect_delay = 1
    max_reconnect_delay = 10
    
    try:
        while True:
            # Vérifier si on doit continuer
            with frame_cache_lock:
                if camera_id not in frame_cache or not frame_cache[camera_id].get("capturing", False):
                    logger.info(f"Arrêt du worker de capture pour {camera_id}")
                    break
            
            try:
                # Ouvrir la connexion si nécessaire
                if cap is None or not cap.isOpened():
                    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
                    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 3000)
                    
                    if not cap.isOpened():
                        raise Exception("Impossible d'ouvrir le flux RTSP")
                    
                    reconnect_delay = 1  # Reset delay on success
                    logger.info(f"Connexion RTSP établie pour {camera_id}")
                
                # Lire une frame
                ret, frame = cap.read()
                
                if ret and frame is not None:
                    # Encoder en JPEG
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 75]
                    ret_enc, buffer = cv2.imencode('.jpg', frame, encode_param)
                    
                    if ret_enc:
                        frame_base64 = base64.b64encode(buffer).decode('utf-8')
                        
                        # Mettre à jour le cache
                        with frame_cache_lock:
                            if camera_id in frame_cache:
                                frame_cache[camera_id]["frame_base64"] = frame_base64
                                frame_cache[camera_id]["timestamp"] = datetime.now(timezone.utc).isoformat()
                                frame_cache[camera_id]["error"] = None
                else:
                    raise Exception("Impossible de lire la frame")
                
                # Limiter à 15 fps (1/15 = 0.067 secondes entre chaque frame)
                time.sleep(0.067)
                
            except Exception as e:
                logger.warning(f"Erreur capture {camera_id}: {e}")
                
                with frame_cache_lock:
                    if camera_id in frame_cache:
                        frame_cache[camera_id]["error"] = str(e)
                
                # Fermer et réessayer
                if cap:
                    cap.release()
                    cap = None
                
                time.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, max_reconnect_delay)
                
    finally:
        if cap:
            cap.release()
        logger.info(f"Worker de capture terminé pour {camera_id}")


def stop_frame_capture_worker(camera_id: str):
    """Arrête le worker de capture pour une caméra."""
    with frame_cache_lock:
        if camera_id in frame_cache:
            frame_cache[camera_id]["capturing"] = False
    
    # Attendre un peu que le thread s'arrête
    with capture_workers_lock:
        if camera_id in capture_workers:
            worker = capture_workers[camera_id]
            worker.join(timeout=2)
            del capture_workers[camera_id]
    
    # Nettoyer le cache
    with frame_cache_lock:
        if camera_id in frame_cache:
            del frame_cache[camera_id]
    
    logger.info(f"Worker de capture arrêté pour {camera_id}")


def get_cached_frame(camera_id: str) -> Optional[Dict[str, Any]]:
    """Récupère la dernière frame en cache pour une caméra."""
    with frame_cache_lock:
        if camera_id in frame_cache:
            data = frame_cache[camera_id]
            if data.get("frame_base64"):
                return {
                    "frame_base64": data["frame_base64"],
                    "timestamp": data["timestamp"],
                    "error": data.get("error")
                }
            elif data.get("error"):
                return {"error": data["error"]}
    return None


def is_capture_active(camera_id: str) -> bool:
    """Vérifie si la capture est active pour une caméra."""
    with capture_workers_lock:
        return camera_id in capture_workers and capture_workers[camera_id].is_alive()


def get_active_capture_count() -> int:
    """Retourne le nombre de captures actives."""
    with capture_workers_lock:
        return sum(1 for w in capture_workers.values() if w.is_alive())


def encrypt_password(password: str) -> str:
    """Chiffre un mot de passe"""
    if not password:
        return ""
    return cipher_suite.encrypt(password.encode()).decode()


def decrypt_password(encrypted_password: str) -> str:
    """Déchiffre un mot de passe"""
    if not encrypted_password:
        return ""
    try:
        return cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception:
        return encrypted_password  # Retourne tel quel si non chiffré


def build_rtsp_url_with_auth(rtsp_url: str, username: str, password: str) -> str:
    """Construit l'URL RTSP avec authentification intégrée"""
    if not username:
        return rtsp_url
    
    # Parse l'URL pour insérer les credentials
    if "://" in rtsp_url:
        protocol, rest = rtsp_url.split("://", 1)
        if "@" not in rest:
            return f"{protocol}://{username}:{password}@{rest}"
    return rtsp_url


async def discover_onvif_cameras(timeout: int = 10) -> List[Dict[str, Any]]:
    """
    Découvre les caméras ONVIF sur le réseau local
    Retourne une liste de caméras trouvées avec leurs informations
    """
    discovered = []
    
    try:
        from wsdiscovery.discovery import ThreadedWSDiscovery as WSDiscovery
        
        wsd = WSDiscovery()
        wsd.start()
        
        # Recherche des services ONVIF
        services = wsd.searchServices(
            types=["NetworkVideoTransmitter"],
            timeout=timeout
        )
        
        for service in services:
            try:
                xaddrs = service.getXAddrs()
                if xaddrs:
                    # Extraire l'IP de l'adresse
                    xaddr = xaddrs[0]
                    ip = None
                    if "://" in xaddr:
                        ip_part = xaddr.split("://")[1].split("/")[0].split(":")[0]
                        ip = ip_part
                    
                    discovered.append({
                        "xaddr": xaddr,
                        "ip": ip,
                        "scopes": [str(s) for s in service.getScopes()],
                        "types": [str(t) for t in service.getTypes()],
                        "brand": detect_brand_from_scopes(service.getScopes())
                    })
            except Exception as e:
                logger.warning(f"Erreur lors de l'analyse d'un service ONVIF: {e}")
        
        wsd.stop()
        
    except ImportError:
        logger.error("WSDiscovery non installé")
    except Exception as e:
        logger.error(f"Erreur découverte ONVIF: {e}")
    
    return discovered


def detect_brand_from_scopes(scopes) -> str:
    """Détecte la marque de la caméra à partir des scopes ONVIF"""
    scope_str = " ".join([str(s).lower() for s in scopes])
    
    if "hikvision" in scope_str:
        return "hikvision"
    elif "dahua" in scope_str:
        return "dahua"
    elif "axis" in scope_str:
        return "axis"
    elif "vivotek" in scope_str:
        return "vivotek"
    elif "hanwha" in scope_str or "samsung" in scope_str:
        return "hanwha"
    else:
        return "onvif"


async def get_onvif_camera_info(xaddr: str, username: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Récupère les informations détaillées d'une caméra ONVIF
    """
    try:
        from onvif import ONVIFCamera
        
        # Extraire host et port de l'adresse
        if "://" in xaddr:
            host_port = xaddr.split("://")[1].split("/")[0]
            if ":" in host_port:
                host, port = host_port.split(":")
                port = int(port)
            else:
                host = host_port
                port = 80
        else:
            return None
        
        # Connexion à la caméra
        cam = ONVIFCamera(host, port, username, password)
        
        # Récupérer les infos du device
        device_info = cam.devicemgmt.GetDeviceInformation()
        
        # Récupérer les profils media
        media_service = cam.create_media_service()
        profiles = media_service.GetProfiles()
        
        # Récupérer l'URL du stream pour le premier profil
        stream_uri = None
        if profiles:
            stream_setup = {
                'Stream': 'RTP-Unicast',
                'Transport': {'Protocol': 'RTSP'}
            }
            uri_response = media_service.GetStreamUri(stream_setup, profiles[0].token)
            stream_uri = uri_response.Uri
        
        return {
            "manufacturer": device_info.Manufacturer,
            "model": device_info.Model,
            "firmware": device_info.FirmwareVersion,
            "serial": device_info.SerialNumber,
            "hardware_id": device_info.HardwareId,
            "stream_uri": stream_uri,
            "profiles_count": len(profiles)
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération infos ONVIF {xaddr}: {e}")
        return None


async def capture_snapshot(camera: Dict[str, Any]) -> Optional[str]:
    """
    Capture un snapshot d'une caméra
    Retourne le chemin du fichier ou None en cas d'erreur
    """
    try:
        rtsp_url = camera.get("rtsp_url")
        username = camera.get("username", "")
        password = decrypt_password(camera.get("password", ""))
        camera_id = str(camera.get("_id", camera.get("id", "unknown")))
        
        # Construire l'URL avec authentification
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        # Créer le dossier pour cette caméra
        camera_folder = SNAPSHOTS_BASE_PATH / camera_id
        camera_folder.mkdir(parents=True, exist_ok=True)
        
        # Nom du fichier
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"snapshot_{timestamp}.jpg"
        filepath = camera_folder / filename
        
        # Capture via OpenCV avec timeout court (5 secondes)
        cap = cv2.VideoCapture(full_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)  # 5 secondes max
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)  # 5 secondes max
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            cv2.imwrite(str(filepath), frame)
            logger.info(f"Snapshot capturé: {filepath}")
            return str(filepath)
        else:
            logger.warning(f"Impossible de capturer le snapshot pour {camera_id}")
            return None
            
    except Exception as e:
        logger.error(f"Erreur capture snapshot: {e}")
        return None


async def capture_snapshot_base64(camera: Dict[str, Any]) -> Optional[str]:
    """
    Capture un snapshot et retourne en base64 (pour affichage direct)
    """
    try:
        rtsp_url = camera.get("rtsp_url")
        username = camera.get("username", "")
        password = decrypt_password(camera.get("password", ""))
        
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        cap = cv2.VideoCapture(full_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)  # 5 secondes max
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)  # 5 secondes max
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            # Redimensionner pour la vignette (max 640px de large)
            height, width = frame.shape[:2]
            if width > 640:
                scale = 640 / width
                frame = cv2.resize(frame, (640, int(height * scale)))
            
            # Encoder en JPEG puis base64
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            return base64.b64encode(buffer).decode('utf-8')
        
        return None
        
    except Exception as e:
        logger.error(f"Erreur capture snapshot base64: {e}")
        return None


async def test_camera_connection(rtsp_url: str, username: str = "", password: str = "") -> Dict[str, Any]:
    """
    Teste la connexion à une caméra
    """
    try:
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        cap = cv2.VideoCapture(full_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)  # 5 secondes max
        cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)  # 5 secondes max
        
        ret, frame = cap.read()
        
        if ret and frame is not None:
            height, width = frame.shape[:2]
            cap.release()
            return {
                "success": True,
                "message": "Connexion réussie",
                "resolution": f"{width}x{height}"
            }
        else:
            cap.release()
            return {
                "success": False,
                "message": "Impossible de lire le flux vidéo"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Erreur de connexion: {str(e)}"
        }


def start_hls_stream(camera_id: str, rtsp_url: str, username: str = "", password: str = "") -> Optional[str]:
    """
    Démarre un stream HLS pour une caméra
    Retourne le chemin du fichier m3u8 ou None
    """
    with stream_lock:
        # Vérifier si déjà actif
        if camera_id in active_streams:
            proc = active_streams[camera_id]
            if proc.poll() is None:  # Encore en cours
                return f"/api/cameras/hls/{camera_id}/stream.m3u8"
            else:
                # Le processus est terminé, le supprimer
                del active_streams[camera_id]
        
        # Nettoyer les streams terminés
        for cid in list(active_streams.keys()):
            if active_streams[cid].poll() is not None:
                del active_streams[cid]
        
        # Vérifier la limite de streams
        if len(active_streams) >= MAX_ACTIVE_STREAMS:
            logger.warning(f"Limite de {MAX_ACTIVE_STREAMS} streams atteinte")
            return None
        
        # Créer le dossier HLS
        hls_folder = HLS_BASE_PATH / camera_id
        hls_folder.mkdir(parents=True, exist_ok=True)
        
        # IMPORTANT: Supprimer tous les anciens fichiers HLS pour éviter le cache
        for old_file in hls_folder.glob("*.ts"):
            try:
                old_file.unlink()
            except:
                pass
        for old_file in hls_folder.glob("*.m3u8"):
            try:
                old_file.unlink()
            except:
                pass
        
        # Construire l'URL avec auth
        full_url = build_rtsp_url_with_auth(rtsp_url, username, password)
        
        # Commande FFmpeg pour convertir RTSP en HLS en TEMPS RÉEL
        m3u8_path = hls_folder / "stream.m3u8"
        
        cmd = [
            "ffmpeg",
            "-fflags", "nobuffer",           # Pas de buffering
            "-flags", "low_delay",           # Faible latence
            "-rtsp_transport", "tcp",
            "-i", full_url,
            "-vsync", "0",                   # Pas de sync vidéo (temps réel)
            "-copyts",                       # Copier les timestamps
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-g", "30",                      # Keyframe toutes les 30 frames
            "-sc_threshold", "0",
            "-c:a", "aac",
            "-ac", "2",
            "-f", "hls",
            "-hls_time", "1",                # Segments de 1 seconde (plus court = moins de latence)
            "-hls_list_size", "3",           # Garder seulement 3 segments
            "-hls_flags", "delete_segments+omit_endlist",  # Supprimer les anciens segments, pas de #EXT-X-ENDLIST
            "-hls_segment_filename", str(hls_folder / "segment_%03d.ts"),
            "-start_number", "0",            # Toujours commencer à 0
            str(m3u8_path),
            "-y"                             # Écraser les fichiers existants
        ]
        
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE
            )
            active_streams[camera_id] = proc
            logger.info(f"Stream HLS démarré pour {camera_id} (PID: {proc.pid})")
            
            # Attendre que le fichier m3u8 soit créé (max 5 secondes)
            for _ in range(10):
                if m3u8_path.exists() and m3u8_path.stat().st_size > 0:
                    return f"/api/cameras/hls/{camera_id}/stream.m3u8"
                time.sleep(0.5)
            
            return f"/api/cameras/hls/{camera_id}/stream.m3u8"
            
        except Exception as e:
            logger.error(f"Erreur démarrage stream HLS: {e}")
            return None


def stop_hls_stream(camera_id: str) -> bool:
    """Arrête un stream HLS"""
    with stream_lock:
        if camera_id in active_streams:
            proc = active_streams[camera_id]
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
            del active_streams[camera_id]
            logger.info(f"Stream HLS arrêté pour {camera_id}")
            return True
        return False


def stop_all_streams():
    """Arrête tous les streams HLS actifs"""
    with stream_lock:
        for camera_id, proc in list(active_streams.items()):
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
        active_streams.clear()
        logger.info("Tous les streams HLS arrêtés")


def get_active_streams_count() -> int:
    """Retourne le nombre de streams actifs"""
    with stream_lock:
        # Nettoyer les streams terminés
        for cid in list(active_streams.keys()):
            if active_streams[cid].poll() is not None:
                del active_streams[cid]
        return len(active_streams)


async def cleanup_old_snapshots(camera_id: str, retention_days: int = 7, max_count: int = 1000):
    """
    Nettoie les anciens snapshots selon la rétention configurée
    """
    try:
        camera_folder = SNAPSHOTS_BASE_PATH / camera_id
        if not camera_folder.exists():
            return
        
        snapshots = sorted(camera_folder.glob("snapshot_*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
        
        # Supprimer par nombre
        if len(snapshots) > max_count:
            for old_snapshot in snapshots[max_count:]:
                old_snapshot.unlink()
                logger.debug(f"Snapshot supprimé (max count): {old_snapshot}")
        
        # Supprimer par date
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        for snapshot in snapshots:
            if datetime.fromtimestamp(snapshot.stat().st_mtime) < cutoff_date:
                snapshot.unlink()
                logger.debug(f"Snapshot supprimé (rétention): {snapshot}")
                
    except Exception as e:
        logger.error(f"Erreur nettoyage snapshots {camera_id}: {e}")


def get_latest_snapshot_path(camera_id: str) -> Optional[str]:
    """Retourne le chemin du dernier snapshot d'une caméra"""
    try:
        camera_folder = SNAPSHOTS_BASE_PATH / camera_id
        if not camera_folder.exists():
            return None
        
        snapshots = sorted(camera_folder.glob("snapshot_*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
        if snapshots:
            return str(snapshots[0])
        return None
    except Exception:
        return None
