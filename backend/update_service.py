"""
Service de gestion des mises à jour FSAO Iris
VERSION CORRIGÉE - Détection automatique des chemins
"""
import os
import json
import asyncio
import logging
import aiohttp
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict
import shutil
import uuid

logger = logging.getLogger(__name__)


class MaintenanceMode:
    """Gestionnaire du mode maintenance NGINX pour les mises à jour."""

    def __init__(self, app_root):
        self.app_root = Path(app_root)
        self.maintenance_flag = self.app_root / "maintenance.flag"
        self.maintenance_html = self.app_root / "maintenance.html"

    def _find_nginx_conf(self):
        """Trouve le fichier de config NGINX actif. Résout les symlinks."""
        candidates = [
            "/etc/nginx/sites-enabled/gmao-iris",
            "/etc/nginx/sites-enabled/fsao-iris",
            "/etc/nginx/sites-enabled/default",
            "/etc/nginx/sites-available/gmao-iris",
            "/etc/nginx/sites-available/default",
            "/etc/nginx/conf.d/gmao-iris.conf",
            "/etc/nginx/conf.d/default.conf",
        ]
        for path in candidates:
            if os.path.exists(path):
                return path
        return None

    def _find_backup(self, nginx_conf):
        """Cherche le backup de la config NGINX dans tous les emplacements possibles."""
        # Chercher le backup au même endroit que le fichier conf
        backup = nginx_conf + ".backup_pre_maintenance"
        if os.path.exists(backup):
            return backup
        # Si le conf est un symlink, chercher aussi au chemin résolu
        if os.path.islink(nginx_conf):
            real_path = os.path.realpath(nginx_conf)
            backup_real = real_path + ".backup_pre_maintenance"
            if os.path.exists(backup_real):
                return backup_real
        # Chercher dans tous les emplacements possibles
        for d in ["/etc/nginx/sites-enabled", "/etc/nginx/sites-available", "/etc/nginx/conf.d"]:
            if os.path.isdir(d):
                for f in os.listdir(d):
                    if f.endswith(".backup_pre_maintenance"):
                        return os.path.join(d, f)
        return None

    def activate(self):
        """Active la page de maintenance."""
        try:
            self.maintenance_flag.touch()
            nginx_conf = self._find_nginx_conf()
            if nginx_conf:
                # Résoudre le symlink pour écrire dans le vrai fichier
                real_conf = os.path.realpath(nginx_conf)
                backup = real_conf + ".backup_pre_maintenance"
                if not os.path.exists(backup):
                    shutil.copy2(real_conf, backup)
                    logger.info(f"[Maintenance] Config NGINX sauvegardée: {backup}")
                # Écrire la config maintenance dans le fichier réel
                maint_conf = f"""# FSAO Iris - MODE MAINTENANCE
server {{
    listen 80;
    server_name _;
    location /logo-iris.png {{
        alias {self.app_root}/frontend/public/logo-iris.png;
        access_log off;
    }}
    location /api/ {{
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}
    location / {{
        root {self.app_root};
        try_files /maintenance.html =503;
    }}
    error_page 503 @maintenance;
    location @maintenance {{
        root {self.app_root};
        rewrite ^(.*)$ /maintenance.html break;
    }}
}}
"""
                with open(real_conf, "w") as f:
                    f.write(maint_conf)
                # Recharger NGINX
                subprocess.run(["nginx", "-t"], capture_output=True, timeout=10)
                for cmd in [["nginx", "-s", "reload"], ["systemctl", "reload", "nginx"]]:
                    try:
                        r = subprocess.run(cmd, capture_output=True, timeout=10)
                        if r.returncode == 0:
                            break
                    except Exception:
                        continue
                logger.info("[Maintenance] Page de maintenance ACTIVÉE")
            return True
        except Exception as e:
            logger.error(f"[Maintenance] Erreur activation: {e}")
            return False

    def deactivate(self):
        """Désactive la page de maintenance et restaure NGINX."""
        try:
            if self.maintenance_flag.exists():
                self.maintenance_flag.unlink()
            nginx_conf = self._find_nginx_conf()
            if nginx_conf:
                real_conf = os.path.realpath(nginx_conf)
                backup = self._find_backup(nginx_conf)
                if backup:
                    shutil.copy2(backup, real_conf)
                    logger.info(f"[Maintenance] Config NGINX restaurée: {backup} -> {real_conf}")
                else:
                    logger.warning("[Maintenance] Aucun backup trouvé pour restaurer NGINX")
                for cmd in [["nginx", "-s", "reload"], ["systemctl", "reload", "nginx"]]:
                    try:
                        r = subprocess.run(cmd, capture_output=True, timeout=10)
                        if r.returncode == 0:
                            break
                    except Exception:
                        continue
                logger.info("[Maintenance] Page de maintenance DÉSACTIVÉE")
            return True
        except Exception as e:
            logger.error(f"[Maintenance] Erreur désactivation: {e}")
            return False


class UpdateService:
    def __init__(self, db):
        self.db = db
        self.github_user = os.environ.get("GITHUB_USER", "Kinder0083")
        self.github_repo = os.environ.get("GITHUB_REPO", "GMAO")
        self.github_branch = os.environ.get("GITHUB_BRANCH", "main")
        self.version_file_url = f"https://raw.githubusercontent.com/{self.github_user}/{self.github_repo}/{self.github_branch}/updates/version.json"
        
        # Détection automatique du répertoire racine
        self.backend_dir = Path(__file__).parent.resolve()
        self.app_root = self.backend_dir.parent
        self.frontend_dir = self.app_root / "frontend"
        self.backup_dir = self.app_root / "backups"
        
        # Gestionnaire de maintenance
        self.maintenance = MaintenanceMode(self.app_root)
        
        logger.info(f"📂 Chemins détectés automatiquement:")
        logger.info(f"   - App root: {self.app_root}")
        logger.info(f"   - Backend: {self.backend_dir}")
        logger.info(f"   - Frontend: {self.frontend_dir}")
        logger.info(f"   - Backups: {self.backup_dir}")
        
        # Charger la version depuis version.json
        self._load_version()
    
    def _load_version(self):
        """Charge la version depuis updates/version.json"""
        try:
            vf = self.app_root / "updates" / "version.json"
            if vf.exists():
                import json as json_mod
                with open(vf) as f:
                    data = json_mod.load(f)
                self.current_version = data.get("version", "1.5.0")
                return
        except Exception:
            pass
        self.current_version = "1.5.0"
        
    def parse_version(self, version_str: str) -> tuple:
        """Parse une version string en tuple (major, minor, patch)"""
        try:
            parts = version_str.split('.')
            return tuple(int(p) for p in parts)
        except:
            return (0, 0, 0)
    
    def compare_versions(self, v1: str, v2: str) -> int:
        """
        Compare deux versions
        Retourne: 1 si v1 > v2, -1 si v1 < v2, 0 si égales
        """
        v1_tuple = self.parse_version(v1)
        v2_tuple = self.parse_version(v2)
        
        if v1_tuple > v2_tuple:
            return 1
        elif v1_tuple < v2_tuple:
            return -1
        else:
            return 0
    
    async def check_for_updates(self) -> Optional[Dict]:
        """
        Vérifie si une mise à jour est disponible sur GitHub
        Retourne les informations de mise à jour si disponible, None sinon
        """
        try:
            logger.info(f"🔍 Vérification des mises à jour depuis {self.version_file_url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.version_file_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        remote_version_info = await response.json()
                        remote_version = remote_version_info.get("version", "0.0.0")
                        
                        # Comparer les versions
                        comparison = self.compare_versions(remote_version, self.current_version)
                        
                        if comparison > 0:
                            # Une nouvelle version est disponible
                            logger.info(f"✅ Nouvelle version disponible: {remote_version} (actuelle: {self.current_version})")
                            
                            # Enregistrer la notification dans la DB
                            await self._save_update_notification(remote_version_info)
                            
                            return {
                                "available": True,
                                "current_version": self.current_version,
                                "new_version": remote_version,
                                "version_name": remote_version_info.get("versionName", ""),
                                "release_date": remote_version_info.get("releaseDate", ""),
                                "description": remote_version_info.get("description", ""),
                                "changes": remote_version_info.get("changes", []),
                                "breaking": remote_version_info.get("breaking", False),
                                "download_url": remote_version_info.get("downloadUrl", "")
                            }
                        else:
                            logger.info(f"✅ Application à jour (version: {self.current_version})")
                            return {
                                "available": False,
                                "current_version": self.current_version,
                                "new_version": self.current_version,
                                "message": "Vous utilisez la dernière version"
                            }
                    else:
                        logger.error(f"❌ Erreur HTTP lors de la vérification des mises à jour: {response.status}")
                        return None
                        
        except asyncio.TimeoutError:
            logger.error("⏱️ Timeout lors de la vérification des mises à jour")
            return None
        except Exception as e:
            logger.error(f"❌ Erreur lors de la vérification des mises à jour: {str(e)}")
            return None
    
    async def _save_update_notification(self, version_info: Dict):
        """Enregistre une notification de mise à jour dans la base de données"""
        try:
            notification = {
                "type": "update_available",
                "version": version_info.get("version"),
                "version_name": version_info.get("versionName"),
                "description": version_info.get("description"),
                "changes": version_info.get("changes", []),
                "release_date": version_info.get("releaseDate"),
                "created_at": datetime.now().isoformat(),
                "read": False
            }
            
            # Vérifier si cette notification existe déjà
            existing = await self.db.update_notifications.find_one({
                "version": version_info.get("version")
            })
            
            if not existing:
                await self.db.update_notifications.insert_one(notification)
                logger.info(f"📝 Notification de mise à jour enregistrée: {version_info.get('version')}")
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'enregistrement de la notification: {str(e)}")
    
    async def get_update_notifications(self, user_id: str = None) -> list:
        """Récupère les notifications de mises à jour non lues"""
        try:
            notifications = await self.db.update_notifications.find(
                {"read": False}
            ).sort("created_at", -1).to_list(length=10)
            
            # Nettoyer les _id MongoDB
            for notif in notifications:
                if "_id" in notif:
                    del notif["_id"]
            
            return notifications
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération des notifications: {str(e)}")
            return []
    
    async def mark_notification_read(self, version: str):
        """Marque une notification comme lue"""
        try:
            await self.db.update_notifications.update_one(
                {"version": version},
                {"$set": {"read": True}}
            )
            logger.info(f"✅ Notification marquée comme lue: {version}")
        except Exception as e:
            logger.error(f"❌ Erreur lors du marquage de la notification: {str(e)}")


    async def get_recent_updates_info(self, days: int = 7) -> Dict:
        """
        Récupère les informations des mises à jour récentes
        Args:
            days: Nombre de jours à regarder en arrière
        Returns:
            Dict avec les infos des mises à jour récentes
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Récupérer les notifications récentes non lues
            notifications = await self.db.update_notifications.find({
                "created_at": {"$gte": cutoff_date.isoformat()},
                "read": False
            }).sort("created_at", -1).to_list(10)
            
            recent_updates = []
            for notif in notifications:
                recent_updates.append({
                    "version": notif.get("version"),
                    "date": notif.get("created_at"),
                    "features": notif.get("features", []),
                    "fixes": notif.get("fixes", []),
                    "breaking_changes": notif.get("breaking_changes", [])
                })
            
            return {
                "has_recent_updates": len(recent_updates) > 0,
                "count": len(recent_updates),
                "updates": recent_updates,
                "current_version": self.current_version
            }
        except Exception as e:
            logger.error(f"❌ Erreur récupération info MAJ récentes: {str(e)}")
            return {
                "has_recent_updates": False,
                "count": 0,
                "updates": [],
                "current_version": self.current_version
            }

    
    def _ensure_gitignore(self):
        """S'assure qu'un .gitignore existe avec les exclusions nécessaires"""
        gitignore_path = self.app_root / ".gitignore"
        required_patterns = [
            "venv/", "backend/uploads/", "backend/tests/", 
            "*.pyc", "__pycache__/", "node_modules/",
            "frontend/build/", ".env", "*.log",
            "backups/", "post-update.sh", "update.sh",
            "health_state.json", "health_recovery_history.json",
            "health_alert_history.json", "maintenance.flag"
        ]
        
        existing_patterns = set()
        if gitignore_path.exists():
            try:
                existing_patterns = set(gitignore_path.read_text().strip().split('\n'))
            except Exception:
                pass
        
        missing = [p for p in required_patterns if p not in existing_patterns]
        if missing:
            try:
                with open(gitignore_path, 'a') as f:
                    if existing_patterns:
                        f.write('\n')
                    f.write('\n'.join(missing) + '\n')
            except Exception:
                pass

    def check_git_conflicts(self) -> Dict:
        """
        Vérifie s'il y a des modifications locales non commitées qui pourraient créer des conflits
        Retourne un dictionnaire avec le statut et la liste des fichiers modifiés
        Ne considère QUE les fichiers suivis par Git (ignore les untracked)
        """
        try:
            # Vérifier que nous sommes dans un dépôt git
            if not (self.app_root / ".git").exists():
                return {
                    "success": True,
                    "has_conflicts": False,
                    "modified_files": [],
                    "message": "Pas de dépôt Git détecté (normal en environnement de production)"
                }
            
            # S'assurer que .gitignore est à jour
            self._ensure_gitignore()
            
            # Utiliser git diff pour ne voir que les fichiers SUIVIS modifiés
            # (pas les fichiers untracked comme uploads/, venv/, etc.)
            result = subprocess.run(
                ['git', 'diff', '--name-status', 'HEAD'],
                cwd=str(self.app_root),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                # Fallback : git status sans les untracked
                result = subprocess.run(
                    ['git', 'status', '--porcelain', '-uno'],
                    cwd=str(self.app_root),
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode != 0:
                    logger.error(f"Erreur git status: {result.stderr}")
                    return {
                        "success": False,
                        "error": "Impossible d'exécuter git status",
                        "details": result.stderr
                    }
            
            # Parser la sortie
            modified_files = []
            # Fichiers à ignorer dans la détection de conflits
            ignored_files = {
                '.gitignore', 'frontend/yarn.lock', 'package-lock.json', 'yarn.lock',
                'health_state.json', 'health_recovery_history.json', 'health_alert_history.json',
                'maintenance.flag', 'maintenance.html'
            }
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    status = line[:2].strip()
                    filename = line[2:].strip() if '\t' not in line else line.split('\t', 1)[1].strip()
                    # Ignorer les fichiers non importants
                    if (filename and 
                        not filename.startswith('backend/uploads/') and 
                        filename != 'venv/' and
                        filename not in ignored_files):
                        modified_files.append({
                            "file": filename,
                            "status": status
                        })
            
            has_conflicts = len(modified_files) > 0
            
            return {
                "success": True,
                "has_conflicts": has_conflicts,
                "modified_files": modified_files,
                "message": f"{len(modified_files)} fichier(s) modifié(s) localement" if has_conflicts else "Aucune modification locale"
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout lors de l'exécution de git status")
            return {
                "success": False,
                "error": "Timeout lors de la vérification Git"
            }
        except FileNotFoundError:
            logger.error("Git n'est pas installé sur le système")
            return {
                "success": True,
                "has_conflicts": False,
                "modified_files": [],
                "message": "Git non disponible (normal en production)"
            }
        except Exception as e:
            logger.error(f"Erreur inattendue lors de la vérification Git: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def resolve_git_conflicts(self, strategy: str) -> Dict:
        """
        Résout les conflits Git selon la stratégie choisie
        strategy: "reset" (écraser les modifications locales), "stash" (sauvegarder), ou "abort" (annuler)
        """
        try:
            if not (self.app_root / ".git").exists():
                return {
                    "success": True,
                    "message": "Pas de dépôt Git (environnement de production)"
                }
            
            if strategy == "reset":
                # Écraser les modifications locales
                result = subprocess.run(
                    ['git', 'reset', '--hard', 'HEAD'],
                    cwd=str(self.app_root),
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    return {
                        "success": True,
                        "message": "Modifications locales écrasées (git reset --hard)"
                    }
                else:
                    return {
                        "success": False,
                        "error": result.stderr
                    }
            
            elif strategy == "stash":
                # Sauvegarder les modifications dans le stash
                result = subprocess.run(
                    ['git', 'stash', 'save', f'Auto-stash avant mise à jour {datetime.now().isoformat()}'],
                    cwd=str(self.app_root),
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    return {
                        "success": True,
                        "message": "Modifications sauvegardées dans le stash Git"
                    }
                else:
                    return {
                        "success": False,
                        "error": result.stderr
                    }
            
            elif strategy == "abort":
                return {
                    "success": True,
                    "message": "Mise à jour annulée (aucune action effectuée)"
                }
            
            else:
                return {
                    "success": False,
                    "error": f"Stratégie invalide: {strategy}"
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Timeout lors de la résolution des conflits"
            }
        except FileNotFoundError:
            return {
                "success": True,
                "message": "Git non disponible (normal en production)"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


    def _log_step(self, update_history: Dict, step_name: str, command: str, 
                  stdout: str = "", stderr: str = "", return_code: int = 0,
                  status: str = "success", duration_ms: int = 0):
        """
        Enregistre une étape détaillée dans le journal de mise à jour.
        Chaque entrée contient : commande, sortie, erreurs, code retour, durée.
        """
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "step": step_name,
            "command": command,
            "stdout": stdout[-5000:] if len(stdout) > 5000 else stdout,
            "stderr": stderr[-5000:] if len(stderr) > 5000 else stderr,
            "return_code": return_code,
            "status": status,
            "duration_ms": duration_ms
        }
        update_history["logs"].append(log_entry)
        
        # Log aussi dans le logger serveur
        if status == "error":
            logger.error(f"[MAJ] {step_name}: ERREUR (code {return_code}) - {stderr[:200]}")
        elif status == "warning":
            logger.warning(f"[MAJ] {step_name}: AVERTISSEMENT - {stderr[:200] if stderr else stdout[:200]}")
        else:
            logger.info(f"[MAJ] {step_name}: OK ({duration_ms}ms)")

    async def _run_command(self, update_history: Dict, step_name: str, 
                           cmd: list, cwd: str = None, env: dict = None,
                           timeout: int = 300) -> tuple:
        """
        Exécute une commande et enregistre automatiquement le résultat dans le journal.
        Retourne (success: bool, stdout: str, stderr: str)
        """
        import time
        cmd_str = " ".join(str(c) for c in cmd)
        start = time.time()
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )
            
            duration_ms = int((time.time() - start) * 1000)
            stdout_str = stdout_bytes.decode(errors='replace')
            stderr_str = stderr_bytes.decode(errors='replace')
            
            status = "success" if process.returncode == 0 else "error"
            self._log_step(
                update_history, step_name, cmd_str,
                stdout=stdout_str, stderr=stderr_str,
                return_code=process.returncode, status=status,
                duration_ms=duration_ms
            )
            
            return (process.returncode == 0, stdout_str, stderr_str)
            
        except asyncio.TimeoutError:
            duration_ms = int((time.time() - start) * 1000)
            self._log_step(
                update_history, step_name, cmd_str,
                stderr=f"TIMEOUT après {timeout}s", return_code=-1,
                status="error", duration_ms=duration_ms
            )
            return (False, "", f"TIMEOUT après {timeout}s")
            
        except FileNotFoundError as e:
            duration_ms = int((time.time() - start) * 1000)
            self._log_step(
                update_history, step_name, cmd_str,
                stderr=f"Commande introuvable: {str(e)}", return_code=-2,
                status="warning", duration_ms=duration_ms
            )
            return (False, "", f"Commande introuvable: {str(e)}")
            
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            self._log_step(
                update_history, step_name, cmd_str,
                stderr=str(e), return_code=-3,
                status="error", duration_ms=duration_ms
            )
            return (False, "", str(e))

    async def apply_update(self, version: str) -> Dict:
        """
        Applique une mise à jour via un script bash autonome.
        Le script reproduit EXACTEMENT les commandes SSH manuelles de l'administrateur.
        """
        import subprocess as sp
        
        update_id = str(uuid.uuid4())
        result_file = f"/tmp/gmao_update_result_{update_id}.json"
        script_path = f"/tmp/gmao_update_{update_id}.sh"
        log_path = f"/tmp/gmao_update_{update_id}.log"
        
        # Log les chemins pour diagnostic
        logger.info(f"[MAJ] === DIAGNOSTIC CHEMINS ===")
        logger.info(f"[MAJ] APP_ROOT: {self.app_root} (exists: {self.app_root.exists()})")
        logger.info(f"[MAJ] BACKEND_DIR: {self.backend_dir} (exists: {self.backend_dir.exists()})")
        logger.info(f"[MAJ] FRONTEND_DIR: {self.frontend_dir} (exists: {self.frontend_dir.exists()})")
        logger.info(f"[MAJ] Version: {self.current_version} -> {version}")
        logger.info(f"[MAJ] GitHub: {self.github_user}/{self.github_repo} branch:{self.github_branch}")
        logger.info(f"[MAJ] Script: {script_path}")
        logger.info(f"[MAJ] Log: {log_path}")
        logger.info(f"[MAJ] Result: {result_file}")
        
        # Sauvegarder le statut in_progress dans la DB
        # IMPORTANT: log_path dans /var/log/ car git reset écrase APP_ROOT
        try:
            await self.db.system_settings.update_one(
                {"key": "last_update_result"},
                {"$set": {
                    "key": "last_update_result",
                    "in_progress": True,
                    "success": False,
                    "code_updated": False,
                    "version_before": self.current_version,
                    "version_after": version,
                    "history_id": update_id,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "log_path": "/var/log/gmao-iris-update.log",
                    "errors": [],
                    "warnings": [],
                    "completed_at": None
                }},
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MAJ] Erreur sauvegarde statut: {e}")
        
        # Activer la maintenance
        maintenance_activated = self.maintenance.activate()
        logger.info(f"[MAJ] Maintenance {'activée' if maintenance_activated else 'non activée'}")
        
        # Détecter le venv
        venv_activate = ""
        for venv_path in [self.app_root / "venv" / "bin" / "activate", self.backend_dir / "venv" / "bin" / "activate"]:
            if venv_path.exists():
                venv_activate = str(venv_path)
                break
        logger.info(f"[MAJ] venv: {venv_activate if venv_activate else 'NON TROUVÉ'}")
        
        # Variables d'environnement frontend pour le build
        frontend_env_exports = ""
        frontend_env_file = self.frontend_dir / ".env"
        if frontend_env_file.exists():
            try:
                for line in frontend_env_file.read_text().strip().split('\n'):
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        frontend_env_exports += f"export {line}\n"
            except Exception:
                pass
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/cmms')
        
        # ============================================================
        # SCRIPT BASH - Reproduit EXACTEMENT les commandes SSH manuelles
        # LOGS dans /var/log/ car git reset --hard ECRASE tout dans APP_ROOT
        # ============================================================
        # Chemins HORS du dépôt git (ne sont pas écrasés par git reset)
        persistent_log = "/var/log/gmao-iris-update.log"
        persistent_result = "/var/log/gmao-iris-update-result.json"
        
        script_content = f"""#!/bin/bash
#
# FSAO Iris - Script de mise à jour autonome
# {self.current_version} -> {version}
# ID: {update_id}
#
# REPRODUIT EXACTEMENT les commandes SSH manuelles de l'administrateur
# LOGS dans /var/log/ (hors du depot git, survivent au git reset ET au reboot)
#

set -o pipefail

APP_ROOT="{self.app_root}"
BACKEND_DIR="{self.backend_dir}"
FRONTEND_DIR="{self.frontend_dir}"
BACKUP_DIR="{self.backup_dir}"
GITHUB_URL="https://github.com/{self.github_user}/{self.github_repo}.git"
GITHUB_BRANCH="{self.github_branch}"
VENV_ACTIVATE="{venv_activate}"
MONGO_URL="{mongo_url}"

# Fichiers de log HORS du depot git (survivent au git reset + reboot)
PERSISTENT_LOG="{persistent_log}"
PERSISTENT_RESULT="{persistent_result}"

# Fichiers temporaires
TMP_LOG="{log_path}"
TMP_RESULT="{result_file}"

# S'assurer que /var/log est accessible en ecriture
touch "$PERSISTENT_LOG" 2>/dev/null || PERSISTENT_LOG="/tmp/gmao-iris-update.log"
touch "$PERSISTENT_RESULT" 2>/dev/null || PERSISTENT_RESULT="/tmp/gmao-iris-update-result.json"

# Vider le log pour ne garder que la derniere mise a jour
echo "" > "$PERSISTENT_LOG"

# Tout rediriger dans le log persistant + tmp
exec > >(tee "$PERSISTENT_LOG" "$TMP_LOG") 2>&1

echo "========================================================"
echo "DEBUT MISE A JOUR: {self.current_version} -> {version}"
echo "Date: $(date)"
echo "ID: {update_id}"
echo "APP_ROOT: $APP_ROOT"
echo "VENV: $VENV_ACTIVATE"
echo "GITHUB: $GITHUB_URL branch $GITHUB_BRANCH"
echo "LOG: $PERSISTENT_LOG"
echo "========================================================"

export PATH="/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/usr/local/share/.config/yarn/global/node_modules/.bin:$HOME/.yarn/bin:$PATH"
ERRORS=0
CODE_UPDATED=false
START_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---- ETAPE 1/7: Backup MongoDB ----
echo ""
echo "[ETAPE 1/7] Backup MongoDB..."
BACKUP_PATH="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_PATH" 2>/dev/null
if command -v mongodump >/dev/null 2>&1; then
    if mongodump --uri="$MONGO_URL" --out="$BACKUP_PATH" 2>&1; then
        echo "[OK] Backup MongoDB: $BACKUP_PATH"
    else
        echo "[WARN] mongodump echoue (non bloquant)"
    fi
else
    echo "[WARN] mongodump non disponible (non bloquant)"
fi

# ---- ETAPE 2/7: Sauvegarde .env ----
echo ""
echo "[ETAPE 2/7] Sauvegarde des fichiers .env..."
cp "$BACKEND_DIR/.env" /tmp/backend.env 2>/dev/null && echo "[OK] backend/.env sauvegarde" || echo "[WARN] backend/.env non trouve"
cp "$FRONTEND_DIR/.env" /tmp/frontend.env 2>/dev/null && echo "[OK] frontend/.env sauvegarde" || echo "[WARN] frontend/.env non trouve"

# ---- ETAPE 3/7: Synchronisation Git (identique SSH) ----
echo ""
echo "[ETAPE 3/7] Synchronisation Git..."
cd "$APP_ROOT" || {{ echo "[ERR] Impossible de cd $APP_ROOT"; ERRORS=1; }}

echo "  -> rm -rf .git"
rm -rf "$APP_ROOT/.git" 2>/dev/null

echo "  -> git init"
if ! git init 2>&1; then
    echo "[ERR] git init echoue"
    ERRORS=1
fi

echo "  -> git remote add origin $GITHUB_URL"
if ! git remote add origin "$GITHUB_URL" 2>&1; then
    echo "[ERR] git remote add echoue"
    ERRORS=1
fi

echo "  -> git fetch origin $GITHUB_BRANCH"
if ! git fetch origin "$GITHUB_BRANCH" 2>&1; then
    echo "[ERR] git fetch echoue - VERIFIEZ LA CONNEXION INTERNET ET L'ACCES GITHUB"
    ERRORS=1
fi

echo "  -> git reset --hard origin/$GITHUB_BRANCH"
if git reset --hard "origin/$GITHUB_BRANCH" 2>&1; then
    echo "[OK] Code synchronise avec origin/$GITHUB_BRANCH"
    CODE_UPDATED=true
else
    echo "[ERR] git reset --hard echoue"
    CODE_UPDATED=false
    ERRORS=1
fi

# ---- ETAPE 4/7: Restauration .env ----
echo ""
echo "[ETAPE 4/7] Restauration des fichiers .env..."
if [ -f /tmp/backend.env ]; then
    cp /tmp/backend.env "$BACKEND_DIR/.env" && echo "[OK] backend/.env restaure" || echo "[ERR] Restauration backend/.env echouee"
fi
if [ -f /tmp/frontend.env ]; then
    cp /tmp/frontend.env "$FRONTEND_DIR/.env" && echo "[OK] frontend/.env restaure" || echo "[ERR] Restauration frontend/.env echouee"
fi

# ---- ETAPE 5/7: Dependances backend (identique SSH) ----
echo ""
echo "[ETAPE 5/7] Installation dependances backend..."
if [ -n "$VENV_ACTIVATE" ] && [ -f "$VENV_ACTIVATE" ]; then
    echo "  -> source $VENV_ACTIVATE"
    source "$VENV_ACTIVATE"
    echo "  -> pip install -r $BACKEND_DIR/requirements.txt"
    if pip install -r "$BACKEND_DIR/requirements.txt" 2>&1; then
        echo "[OK] pip install termine"
    else
        echo "[WARN] pip install a rencontre des erreurs (non bloquant)"
    fi
    echo "  -> deactivate"
    deactivate 2>/dev/null || true
else
    echo "  -> pip3 install -r $BACKEND_DIR/requirements.txt (pas de venv)"
    if pip3 install -r "$BACKEND_DIR/requirements.txt" 2>&1; then
        echo "[OK] pip3 install termine"
    else
        echo "[WARN] pip3 install a rencontre des erreurs"
    fi
fi

# ---- ETAPE 6/7: Frontend (identique SSH: cd frontend && yarn install && yarn build) ----
echo ""
echo "[ETAPE 6/7] Installation et build frontend..."
if [ -f "$FRONTEND_DIR/package.json" ]; then
    cd "$FRONTEND_DIR" || echo "[ERR] Impossible de cd $FRONTEND_DIR"
    
    export CI=false
    export NODE_OPTIONS="--max_old_space_size=2048"
    {frontend_env_exports}
    
    echo "  -> yarn install"
    if yarn install 2>&1; then
        echo "[OK] yarn install termine"
    else
        echo "[WARN] yarn install a rencontre des erreurs"
    fi
    
    echo "  -> yarn build"
    if yarn build 2>&1; then
        if [ -f "build/index.html" ]; then
            echo "[OK] yarn build termine (index.html present)"
        else
            echo "[ERR] yarn build termine mais index.html absent!"
            ERRORS=1
        fi
    else
        echo "[ERR] yarn build echoue"
        ERRORS=1
    fi
    
    cd "$APP_ROOT"
else
    echo "[WARN] package.json introuvable dans $FRONTEND_DIR"
fi

# ---- ETAPE 7/7: Ecriture du resultat et reboot ----
echo ""
echo "[ETAPE 7/7] Finalisation..."

if [ "$CODE_UPDATED" = true ] && [ "$ERRORS" -eq 0 ]; then
    SUCCESS=true
    MSG="Mise a jour vers {version} terminee avec succes"
elif [ "$CODE_UPDATED" = true ]; then
    SUCCESS=true
    MSG="Mise a jour partielle - code synchronise mais erreurs pendant l installation"
else
    SUCCESS=false
    MSG="Echec - code source non mis a jour depuis GitHub"
fi

END_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Ecriture du resultat en JSON pur bash
cat > "$PERSISTENT_RESULT" << EOFRESULT
{{
  "update_id": "{update_id}",
  "success": $SUCCESS,
  "code_updated": $CODE_UPDATED,
  "version_before": "{self.current_version}",
  "version_after": "{version}",
  "message": "$MSG",
  "started_at": "$START_TIME",
  "completed_at": "$END_TIME",
  "errors_count": $ERRORS,
  "log_path": "$PERSISTENT_LOG"
}}
EOFRESULT

# Copier aussi dans /tmp pour compatibilite
cp "$PERSISTENT_RESULT" "$TMP_RESULT" 2>/dev/null

echo ""
echo "========================================================"
echo "FIN MISE A JOUR"
echo "Date: $(date)"
echo "Succes: $SUCCESS | Code mis a jour: $CODE_UPDATED | Erreurs: $ERRORS"
echo "Log: $PERSISTENT_LOG"
echo "Resultat: $PERSISTENT_RESULT"
echo "========================================================"
echo ""
echo ">>> REBOOT DU SERVEUR DANS 5 SECONDES <<<"

sleep 5

# Desactiver la maintenance avant le reboot
rm -f "$APP_ROOT/maintenance.flag" 2>/dev/null
for conf in /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-enabled/gmao-iris /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/gmao-iris.conf; do
    if [ -f "$conf.backup_pre_maintenance" ]; then
        REAL_CONF=$(readlink -f "$conf" 2>/dev/null || echo "$conf")
        cp "$conf.backup_pre_maintenance" "$REAL_CONF" 2>/dev/null
        break
    fi
done

# Reboot (avec sudo si necessaire)
reboot 2>/dev/null || sudo reboot 2>/dev/null || shutdown -r now 2>/dev/null || sudo shutdown -r now 2>/dev/null || echo "[ERR] Impossible de rebooter - redemarrez manuellement"
"""
        
        # Écrire et lancer le script
        try:
            with open(script_path, 'w') as f:
                f.write(script_content)
            os.chmod(script_path, 0o755)
            
            logger.info(f"[MAJ] Script écrit: {script_path} ({os.path.getsize(script_path)} octets)")
            
            # Lancer avec nohup, complètement détaché
            process = sp.Popen(
                ['nohup', '/bin/bash', script_path],
                stdout=open(log_path, 'a'),
                stderr=sp.STDOUT,
                start_new_session=True,
                close_fds=True
            )
            
            logger.info(f"[MAJ] Script lancé avec PID: {process.pid}")
            
            return {
                "success": True,
                "accepted": True,
                "message": f"Mise à jour vers {version} lancée en arrière-plan. Consultez les logs pour suivre la progression.",
                "update_id": update_id,
                "log_path": log_path,
                "result_file": result_file,
                "script_path": script_path,
                "version": version,
                "pid": process.pid,
                "diagnostic": {
                    "app_root": str(self.app_root),
                    "backend_dir": str(self.backend_dir),
                    "frontend_dir": str(self.frontend_dir),
                    "venv": venv_activate or "NON TROUVÉ",
                    "github": f"{self.github_user}/{self.github_repo}:{self.github_branch}"
                }
            }
        except Exception as e:
            logger.error(f"[MAJ] ERREUR lancement script: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.maintenance.deactivate()
            return {
                "success": False,
                "message": f"Impossible de lancer le script: {str(e)}",
                "error": str(e)
            }
    
    async def check_and_save_update_result(self):
        """
        Vérifie s'il existe un fichier de résultat de mise à jour
        et le sauvegarde dans la base de données.
        Appelée au démarrage du serveur.
        Cherche dans /var/log/ (prioritaire), puis APP_ROOT, puis /tmp.
        """
        import glob as glob_mod
        
        result_files = []
        # 1) Fichier dans /var/log/ (emplacement principal, survit à git reset + reboot)
        if os.path.exists("/var/log/gmao-iris-update-result.json"):
            result_files.append("/var/log/gmao-iris-update-result.json")
        # 2) Fichier persistant dans APP_ROOT (ancien emplacement, compat)
        persistent_result = self.app_root / "last_update_result.json"
        if persistent_result.exists():
            result_files.append(str(persistent_result))
        # 3) Fichiers temporaires dans /tmp
        result_files.extend(glob_mod.glob("/tmp/gmao_update_result_*.json"))
        
        for rf in result_files:
            try:
                with open(rf, 'r') as f:
                    result = json.load(f)
                
                update_id = result.get("update_id", "unknown")
                logger.info(f"[MAJ] Résultat de mise à jour trouvé: {update_id}")
                
                log_file = rf.replace("_result_", "_update_").replace(".json", ".log")
                log_content = ""
                # Chercher le log dans /var/log/ d'abord (principal)
                for log_candidate in [
                    "/var/log/gmao-iris-update.log",
                    str(self.app_root / "update_log.txt"),
                    log_file
                ]:
                    if os.path.exists(log_candidate) and os.path.getsize(log_candidate) > 10:
                        try:
                            with open(log_candidate, 'r', errors='replace') as lf:
                                log_content = lf.read()[-10000:]
                            break
                        except Exception:
                            pass
                
                history_entry = {
                    "id": update_id,
                    "version_before": result.get("version_before", ""),
                    "version_after": result.get("version_after", ""),
                    "started_at": result.get("started_at", ""),
                    "completed_at": result.get("completed_at", ""),
                    "status": "success" if result.get("success") else "failed",
                    "success": result.get("success", False),
                    "code_updated": result.get("code_updated", False),
                    "errors": result.get("errors", []),
                    "warnings": result.get("warnings", []),
                    "logs": [{"step": "Script complet", "stdout": log_content, "status": "success" if result.get("success") else "error"}],
                    "summary": {
                        "total_steps": result.get("steps_ok", 0) + result.get("steps_warn", 0) + result.get("steps_err", 0),
                        "successful_steps": result.get("steps_ok", 0),
                        "warning_steps": result.get("steps_warn", 0),
                        "error_steps": result.get("steps_err", 0),
                        "errors": result.get("errors", []),
                        "warnings": result.get("warnings", [])
                    },
                    "triggered_by": "manual",
                    "created_at": result.get("started_at", "")
                }
                
                try:
                    start = datetime.fromisoformat(result["started_at"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(result["completed_at"].replace("Z", "+00:00"))
                    history_entry["duration_seconds"] = (end - start).total_seconds()
                except Exception:
                    history_entry["duration_seconds"] = 0
                
                await self.db.system_update_history.insert_one(history_entry)
                
                await self.db.system_settings.update_one(
                    {"key": "last_update_result"},
                    {"$set": {
                        "key": "last_update_result",
                        "in_progress": False,
                        "success": result.get("success", False),
                        "code_updated": result.get("code_updated", False),
                        "version_before": result.get("version_before", ""),
                        "version_after": result.get("version_after", ""),
                        "history_id": update_id,
                        "errors": result.get("errors", []),
                        "warnings": result.get("warnings", []),
                        "completed_at": result.get("completed_at", "")
                    }},
                    upsert=True
                )
                
                self._load_version()
                logger.info(f"[MAJ] Résultat sauvegardé. Succès: {result.get('success')}")
                
                os.remove(rf)
                if os.path.exists(log_file):
                    try:
                        os.rename(log_file, f"/tmp/gmao_update_{update_id}_archived.log")
                    except Exception:
                        pass
                        
            except Exception as e:
                logger.error(f"[MAJ] Erreur lecture résultat {rf}: {e}")

