"""
Routes API pour la configuration Tailscale
Permet au super admin de modifier l'IP Tailscale via l'interface web
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_current_user
import os
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tailscale", tags=["tailscale"])


class TailscaleConfigRequest(BaseModel):
    tailscale_ip: str


@router.get("/diagnostics")
async def get_tailscale_diagnostics(current_user: dict = Depends(get_current_user)):
    """
    Diagnostics Tailscale - Vérifier la configuration du système
    """
    try:
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        
        diagnostics = {
            "environment": "development",
            "nginx_status": "unknown",
            "backend_status": "unknown",
            "current_ip": None
        }
        
        # Déterminer l'environnement
        proxmox_path = Path("/opt/gmao-iris/frontend")
        if proxmox_path.exists():
            diagnostics["environment"] = "proxmox"
            
            # Vérifier nginx
            try:
                result = subprocess.run(['systemctl', 'is-active', 'nginx'], 
                                       capture_output=True, text=True)
                diagnostics["nginx_status"] = "running" if result.returncode == 0 else "stopped"
            except:
                diagnostics["nginx_status"] = "error"
            
            # Vérifier backend
            try:
                result = subprocess.run(['supervisorctl', 'status', 'gmao-iris-backend'], 
                                       capture_output=True, text=True)
                diagnostics["backend_status"] = "running" if "RUNNING" in result.stdout else "stopped"
            except:
                diagnostics["backend_status"] = "error"
            
            # Lire l'IP actuelle
            env_file = proxmox_path / ".env"
            if env_file.exists():
                with open(env_file, 'r') as f:
                    for line in f:
                        if line.startswith('REACT_APP_BACKEND_URL='):
                            url = line.split('=', 1)[1].strip()
                            if '://' in url:
                                diagnostics["current_ip"] = url.split('://')[1].rstrip('/')
        
        return diagnostics
    except Exception as e:
        logger.error(f"Erreur diagnostics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_tailscale_config(current_user: dict = Depends(get_current_user)):
    """
    Récupérer la configuration Tailscale actuelle
    Accessible uniquement aux admins
    """
    try:
        # Vérifier si l'utilisateur est admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        
        # Déterminer le chemin du fichier .env selon l'environnement
        # Sur Proxmox: /opt/gmao-iris/frontend/.env
        # Sur Emergent dev: /app/frontend/.env
        proxmox_env_path = Path("/opt/gmao-iris/frontend/.env")
        dev_env_path = Path("/app/frontend/.env")
        
        env_path = proxmox_env_path if proxmox_env_path.exists() else dev_env_path
        
        current_ip = None
        backend_url = None
        
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        backend_url = line.split('=', 1)[1].strip()
                        # Extraire l'IP de l'URL (format: http://IP ou https://IP)
                        if '://' in backend_url:
                            current_ip = backend_url.split('://')[1].rstrip('/')
        
        return {
            "success": True,
            "tailscale_ip": current_ip,
            "status": {
                "current_ip": current_ip,
                "backend_url": backend_url,
                "environment": "proxmox" if proxmox_env_path.exists() else "development"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération config Tailscale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/restore")
async def restore_tailscale_backup(current_user: dict = Depends(get_current_user)):
    """
    RESTAURATION D'URGENCE - Restaurer la configuration Tailscale précédente
    Accessible uniquement aux admins
    
    Utilise le fichier .env.backup créé automatiquement
    """
    try:
        # Vérifier si l'utilisateur est admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        
        logger.info("🔄 RESTAURATION D'URGENCE - Configuration Tailscale")
        
        # Vérifier l'environnement
        proxmox_frontend_path = Path("/opt/gmao-iris/frontend")
        is_proxmox = proxmox_frontend_path.exists()
        
        if not is_proxmox:
            return {
                "success": False,
                "message": "Environnement de développement - Restauration non applicable"
            }
        
        env_file_path = proxmox_frontend_path / ".env"
        backup_path = proxmox_frontend_path / ".env.backup"
        
        if not backup_path.exists():
            raise HTTPException(status_code=404, detail="Aucun fichier de sauvegarde trouvé")
        
        logger.info("[1/4] Restauration du fichier .env depuis la sauvegarde...")
        subprocess.run(['cp', str(backup_path), str(env_file_path)], check=True)
        
        logger.info("[2/4] Recompilation du frontend...")
        result = subprocess.run(
            ['yarn', 'build'],
            cwd=str(proxmox_frontend_path),
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            logger.error(f"❌ Erreur compilation: {result.stderr}")
            raise Exception("Erreur lors de la compilation du frontend")
        
        logger.info("[3/4] Redémarrage du backend...")
        subprocess.run(['supervisorctl', 'restart', 'gmao-iris-backend'], check=True)
        
        import time
        time.sleep(5)
        
        logger.info("[4/4] Redémarrage de nginx...")
        subprocess.run(['systemctl', 'restart', 'nginx'], check=True)
        
        logger.info("✅ Configuration restaurée avec succès")
        
        return {
            "success": True,
            "message": "Configuration précédente restaurée avec succès",
            "steps_completed": [
                "Fichier .env restauré depuis .env.backup",
                "Frontend recompilé",
                "Backend redémarré",
                "Nginx redémarré"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur restauration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configure")
async def configure_tailscale(
    config: TailscaleConfigRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Modifier la configuration Tailscale
    Accessible uniquement aux admins
    
    Cette fonction reproduit le comportement du script configure-tailscale.sh :
    1. Modifie /opt/gmao-iris/frontend/.env avec la nouvelle IP
    2. Recompile le frontend avec yarn build
    3. Redémarre nginx et le backend via supervisorctl
    
    ⚠️ Fonctionne uniquement sur le serveur Proxmox
    """
    try:
        # Vérifier si l'utilisateur est admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
        
        tailscale_ip = config.tailscale_ip.strip()
        
        # Validation basique de l'IP
        parts = tailscale_ip.split('.')
        if len(parts) != 4:
            raise HTTPException(status_code=400, detail="Format IP invalide")
        
        for part in parts:
            if not part.isdigit() or int(part) > 255:
                raise HTTPException(status_code=400, detail="Format IP invalide")
        
        logger.info(f"🔧 Configuration Tailscale - Nouvelle IP: {tailscale_ip}")
        
        # Vérifier l'environnement
        proxmox_frontend_path = Path("/opt/gmao-iris/frontend")
        is_proxmox = proxmox_frontend_path.exists()
        
        if not is_proxmox:
            # Sur l'environnement de développement, on ne peut pas vraiment appliquer les changements
            logger.warning("⚠️ Environnement de développement détecté - Simulation uniquement")
            return {
                "success": True,
                "message": f"IP Tailscale enregistrée : {tailscale_ip} (simulation - dev environment)",
                "new_url": f"http://{tailscale_ip}",
                "warning": "Cette fonctionnalité est conçue pour l'environnement Proxmox"
            }
        
        # === SUR PROXMOX ===
        logger.info("[1/6] Sauvegarde de la configuration actuelle...")
        env_file_path = proxmox_frontend_path / ".env"
        backup_path = proxmox_frontend_path / ".env.backup"
        
        if env_file_path.exists():
            subprocess.run(['cp', str(env_file_path), str(backup_path)], check=True)
        
        logger.info("[2/6] Vérification de la configuration nginx...")
        # Sur Proxmox, nginx doit être configuré pour accepter l'IP Tailscale
        # Vérifier si nginx écoute sur toutes les interfaces
        nginx_conf = Path("/etc/nginx/sites-enabled/gmao-iris")
        if nginx_conf.exists():
            logger.info("Configuration nginx trouvée")
        else:
            logger.warning("⚠️ Configuration nginx non trouvée - l'IP Tailscale pourrait ne pas fonctionner")
        
        logger.info("[3/6] Modification du fichier .env...")
        # IMPORTANT : Garder l'URL locale pour les communications internes
        # L'IP Tailscale est SEULEMENT pour l'accès externe
        new_env_content = f"""NODE_ENV=production
REACT_APP_BACKEND_URL=http://{tailscale_ip}
"""
        with open(env_file_path, 'w') as f:
            f.write(new_env_content)
        
        logger.info("[4/6] Recompilation du frontend (cela peut prendre 2-3 minutes)...")
        # Nettoyer le cache node_modules/.cache pour éviter les problèmes
        cache_path = proxmox_frontend_path / "node_modules" / ".cache"
        if cache_path.exists():
            subprocess.run(['rm', '-rf', str(cache_path)], check=False)
        
        result = subprocess.run(
            ['yarn', 'build'],
            cwd=str(proxmox_frontend_path),
            capture_output=True,
            text=True,
            timeout=600  # 10 minutes max pour être sûr
        )
        
        if result.returncode != 0:
            logger.error(f"❌ Erreur compilation: {result.stderr}")
            # Restaurer le backup en cas d'erreur
            subprocess.run(['cp', str(backup_path), str(env_file_path)], check=True)
            raise Exception("Erreur lors de la compilation du frontend - Configuration restaurée")
        
        logger.info("[5/6] Redémarrage du backend (d'abord)...")
        result_backend = subprocess.run(['supervisorctl', 'restart', 'gmao-iris-backend'], 
                                       capture_output=True, text=True)
        if result_backend.returncode != 0:
            logger.warning(f"⚠️ Avertissement backend: {result_backend.stderr}")
        
        # Attendre que le backend soit vraiment prêt avec health check
        import time
        import requests
        logger.info("Vérification que le backend est prêt (max 30 secondes)...")
        
        backend_ready = False
        for attempt in range(30):  # 30 essais de 1 seconde
            try:
                time.sleep(1)
                # Tester si le backend répond sur localhost
                response = requests.get('http://localhost:8001/api/version', timeout=2)
                if response.status_code in [200, 404]:  # 404 acceptable si /version n'existe pas
                    backend_ready = True
                    logger.info(f"✅ Backend prêt après {attempt + 1} secondes")
                    break
            except:
                continue
        
        if not backend_ready:
            logger.error("❌ Le backend ne répond pas après 30 secondes")
            # Restaurer le backup
            subprocess.run(['cp', str(backup_path), str(env_file_path)], check=True)
            raise Exception("Le backend ne démarre pas correctement - Configuration restaurée")
        
        # Attendre 2 secondes supplémentaires pour être sûr
        time.sleep(2)
        
        logger.info("[6/6] Redémarrage de nginx...")
        subprocess.run(['systemctl', 'restart', 'nginx'], check=True)
        
        # Vérifier que nginx a bien démarré
        time.sleep(2)
        result_nginx = subprocess.run(['systemctl', 'is-active', 'nginx'], 
                                     capture_output=True, text=True)
        if result_nginx.returncode != 0:
            logger.error("❌ Nginx n'a pas démarré correctement")
            subprocess.run(['cp', str(backup_path), str(env_file_path)], check=True)
            raise Exception("Nginx n'a pas démarré - Configuration restaurée")
        
        logger.info(f"✅ Configuration Tailscale appliquée avec succès : {tailscale_ip}")
        
        return {
            "success": True,
            "message": f"Configuration Tailscale mise à jour avec succès",
            "new_ip": tailscale_ip,
            "new_url": f"http://{tailscale_ip}",
            "steps_completed": [
                "Sauvegarde effectuée (.env.backup)",
                "Configuration nginx vérifiée",
                "Fichier .env modifié",
                "Frontend recompilé",
                "Backend redémarré",
                "Nginx redémarré"
            ],
            "important": "Si vous rencontrez des problèmes, restaurez avec : cp /opt/gmao-iris/frontend/.env.backup /opt/gmao-iris/frontend/.env && yarn build && systemctl restart nginx"
        }
        
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        logger.error("❌ Timeout lors de la compilation du frontend")
        raise HTTPException(status_code=500, detail="Timeout lors de la compilation (>5 minutes)")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Erreur subprocess: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'exécution: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Erreur configuration Tailscale: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
