"""
Service de gestion des mises à jour GMAO Iris
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

class UpdateService:
    def __init__(self, db):
        self.db = db
        self.github_user = "Kinder0083"
        self.github_repo = "GMAO"
        self.github_branch = "main"
        self.version_file_url = f"https://raw.githubusercontent.com/{self.github_user}/{self.github_repo}/{self.github_branch}/updates/version.json"
        
        # Détection automatique du répertoire racine
        self.backend_dir = Path(__file__).parent.resolve()
        # Le répertoire racine est le parent du backend
        self.app_root = self.backend_dir.parent
        # Déduire le répertoire frontend
        self.frontend_dir = self.app_root / "frontend"
        # Répertoire pour les backups
        self.backup_dir = self.app_root / "backups"
        
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

    
    def check_git_conflicts(self) -> Dict:
        """
        Vérifie s'il y a des modifications locales non commitées qui pourraient créer des conflits
        Retourne un dictionnaire avec le statut et la liste des fichiers modifiés
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
            
            # Exécuter git status --porcelain pour obtenir les fichiers modifiés
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
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
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    # Format: XY filename
                    status = line[:2]
                    filename = line[3:].strip()
                    modified_files.append({
                        "file": filename,
                        "status": status.strip()
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
        Applique une mise à jour système.
        Chaque commande et son résultat sont enregistrés dans le journal détaillé.
        """
        # Créer l'entrée d'historique avec journal structuré
        update_history = {
            "id": str(uuid.uuid4()),
            "version_before": self.current_version,
            "version_after": version,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "status": "in_progress",
            "success": False,
            "files_modified": [],
            "files_added": [],
            "files_deleted": [],
            "total_files_changed": 0,
            "logs": [],
            "warnings": [],
            "errors": [],
            "triggered_by": "manual",
            "backup_created": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            logger.info(f"🚀 Début de l'application de la mise à jour vers {version}")
            self._log_step(update_history, "DÉBUT", f"Mise à jour {self.current_version} → {version}", status="success")
            
            # 1. Créer un backup de la base de données
            logger.info("📦 Étape 1/5: Création du backup de la base de données...")
            backup_path = self.backup_dir / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Obtenir l'URL MongoDB
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/cmms')
            
            # Exécuter mongodump
            success, stdout, stderr = await self._run_command(
                update_history, "1/6 - Backup MongoDB (mongodump)",
                ["mongodump", f"--uri={mongo_url}", f"--out={backup_path}"],
                timeout=120
            )
            update_history["backup_created"] = success
            if success:
                update_history["backup_path"] = str(backup_path)
            else:
                self._log_step(update_history, "1/6 - Backup MongoDB", "mongodump",
                              stderr="Backup échoué (non bloquant, on continue)", status="warning")
            
            # 2. Export des données (placeholder)
            logger.info("📊 Étape 2/5: Export des données...")
            self._log_step(update_history, "2/6 - Export données", "N/A (placeholder)", status="success")
            
            # 3. Télécharger la mise à jour depuis GitHub
            logger.info(f"📥 Étape 3/5: Téléchargement de la version {version}...")
            
            git_dir = self.app_root
            git_available = False
            
            # Vérifier si Git est disponible
            success, _, _ = await self._run_command(
                update_history, "3/6 - Vérification Git",
                ["git", "--version"]
            )
            git_available = success
            
            if git_available:
                try:
                    # CRITIQUE: Désactiver le git hook post-merge AVANT le pull
                    post_merge_hook = git_dir / ".git" / "hooks" / "post-merge"
                    post_merge_disabled = git_dir / ".git" / "hooks" / "post-merge.disabled"
                    hook_was_disabled = False
                    if post_merge_hook.exists():
                        try:
                            os.rename(str(post_merge_hook), str(post_merge_disabled))
                            hook_was_disabled = True
                            self._log_step(update_history, "3/6 - Désactivation hook post-merge", 
                                          "mv post-merge post-merge.disabled", status="success")
                        except Exception as e:
                            self._log_step(update_history, "3/6 - Désactivation hook post-merge", 
                                          "mv post-merge post-merge.disabled",
                                          stderr=str(e), status="warning")
                    
                    # Vérifier les modifications locales
                    success, stdout, stderr = await self._run_command(
                        update_history, "3/6 - Git status (modifications locales)",
                        ["git", "status", "--porcelain"],
                        cwd=str(git_dir)
                    )
                    
                    if not success:
                        git_available = False
                    elif stdout.strip():
                        # Stash les modifications locales
                        await self._run_command(
                            update_history, "3/6 - Git stash (sauvegarde modifications locales)",
                            ["git", "stash"],
                            cwd=str(git_dir)
                        )
                    
                    if git_available:
                        # Git pull — l'opération principale
                        success, stdout, stderr = await self._run_command(
                            update_history, "3/6 - Git pull (téléchargement code)",
                            ["git", "pull", "origin", self.github_branch],
                            cwd=str(git_dir), timeout=120
                        )
                        
                        if not success:
                            if any(msg in stderr for msg in [
                                "No remote", "no remote", "not a git repository",
                                "does not appear to be a git repository",
                                "'origin' does not appear", "Could not resolve host"
                            ]):
                                git_available = False
                            else:
                                # Réactiver le hook avant de quitter
                                if hook_was_disabled and post_merge_disabled.exists():
                                    try:
                                        os.rename(str(post_merge_disabled), str(post_merge_hook))
                                    except Exception:
                                        pass
                                
                                # Collecter les erreurs dans le résumé
                                update_history["errors"].append(f"Git pull échoué: {stderr[:300]}")
                                
                                return {
                                    "success": False,
                                    "message": "Échec du téléchargement de la mise à jour",
                                    "error": stderr,
                                    "history_id": update_history["id"]
                                }
                        else:
                            # Récupérer la liste des fichiers modifiés par le pull
                            diff_success, diff_out, _ = await self._run_command(
                                update_history, "3/6 - Git diff (fichiers modifiés)",
                                ["git", "diff", "--name-status", "HEAD~1", "HEAD"],
                                cwd=str(git_dir), timeout=10
                            )
                            if diff_success and diff_out.strip():
                                for line in diff_out.strip().split('\n'):
                                    parts = line.split('\t', 1)
                                    if len(parts) == 2:
                                        status_code, filename = parts
                                        if status_code.startswith('M'):
                                            update_history["files_modified"].append(filename)
                                        elif status_code.startswith('A'):
                                            update_history["files_added"].append(filename)
                                        elif status_code.startswith('D'):
                                            update_history["files_deleted"].append(filename)
                                update_history["total_files_changed"] = (
                                    len(update_history["files_modified"]) + 
                                    len(update_history["files_added"]) + 
                                    len(update_history["files_deleted"])
                                )
                    
                    # Réactiver le git hook post-merge
                    if hook_was_disabled and post_merge_disabled.exists():
                        try:
                            os.rename(str(post_merge_disabled), str(post_merge_hook))
                            self._log_step(update_history, "3/6 - Réactivation hook post-merge",
                                          "mv post-merge.disabled post-merge", status="success")
                        except Exception:
                            pass
                    
                except Exception as e:
                    self._log_step(update_history, "3/6 - Erreur Git inattendue", str(e),
                                  stderr=str(e), status="warning")
                    git_available = False
            
            if not git_available:
                update_history["warnings"].append("Git non disponible - code non mis à jour")
                self._log_step(update_history, "3/6 - Git indisponible", 
                              "Les dépendances seront réinstallées et les services redémarrés",
                              status="warning")
            
            # 4. Installer les dépendances
            logger.info("📦 Étape 4/5: Installation des dépendances...")
            
            # Backend dependencies
            backend_req = self.backend_dir / "requirements.txt"
            if backend_req.exists():
                # Chercher le venv Python (backend/venv OU racine/venv)
                venv_pip_backend = self.backend_dir / "venv" / "bin" / "pip"
                venv_pip_root = self.app_root / "venv" / "bin" / "pip"
                if venv_pip_backend.exists():
                    venv_pip = venv_pip_backend
                elif venv_pip_root.exists():
                    venv_pip = venv_pip_root
                else:
                    venv_pip = None
                pip_cmd = str(venv_pip) if venv_pip else "pip3"
                
                logger.info(f"🐍 Installation backend avec: {pip_cmd}")
                
                pip_process = await asyncio.create_subprocess_exec(
                    pip_cmd, "install", "-r", str(backend_req),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                pip_stdout, pip_stderr = await asyncio.wait_for(pip_process.communicate(), timeout=300)
                
                if pip_process.returncode != 0:
                    logger.warning(f"⚠️ Certaines dépendances n'ont pas pu être installées: {pip_stderr.decode()[:200]}")
                else:
                    logger.info("✅ Dépendances backend installées")
            
            # Frontend dependencies
            frontend_package = self.frontend_dir / "package.json"
            if frontend_package.exists():
                # SAUVEGARDER le build existant avant yarn build
                # car react-scripts supprime build/ avant de recréer
                build_dir = self.frontend_dir / "build"
                build_backup = self.frontend_dir / "build_backup"
                if build_dir.exists():
                    try:
                        if build_backup.exists():
                            shutil.rmtree(str(build_backup))
                        shutil.copytree(str(build_dir), str(build_backup))
                        logger.info("📁 Backup du build frontend créé")
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de backup build/: {e}")
                
                logger.info("⚛️  Installation des dépendances frontend...")
                
                # Construire l'environnement pour yarn (PATH complet + CI=false)
                build_env = os.environ.copy()
                build_env["CI"] = "false"
                build_env["NODE_OPTIONS"] = "--max_old_space_size=1024"
                # S'assurer que node/yarn sont dans le PATH
                for extra_path in ["/usr/local/bin", "/usr/bin"]:
                    if extra_path not in build_env.get("PATH", ""):
                        build_env["PATH"] = extra_path + ":" + build_env.get("PATH", "")
                
                yarn_process = await asyncio.create_subprocess_exec(
                    "yarn", "install",
                    cwd=self.frontend_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=build_env
                )
                yarn_stdout, yarn_stderr = await asyncio.wait_for(yarn_process.communicate(), timeout=300)
                
                if yarn_process.returncode != 0:
                    logger.warning(f"⚠️ yarn install a échoué: {yarn_stderr.decode()[:200]}")
                else:
                    logger.info("✅ Dépendances frontend installées")
                
                # Recompiler le frontend
                logger.info("🔧 Compilation du frontend React (yarn build)...")
                build_process = await asyncio.create_subprocess_exec(
                    "yarn", "build",
                    cwd=self.frontend_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=build_env
                )
                build_stdout, build_stderr = await asyncio.wait_for(build_process.communicate(), timeout=600)
                
                if build_process.returncode != 0:
                    logger.error(f"❌ Échec de la compilation frontend: {build_stderr.decode()[:500]}")
                    # RESTAURER le backup du build
                    if build_backup.exists():
                        try:
                            if build_dir.exists():
                                shutil.rmtree(str(build_dir))
                            shutil.copytree(str(build_backup), str(build_dir))
                            logger.info("📁 Build frontend restauré depuis le backup")
                        except Exception as e:
                            logger.error(f"❌ Impossible de restaurer le build: {e}")
                    # Ne PAS bloquer la mise à jour — le code backend est déjà mis à jour
                    logger.warning("⚠️ Le frontend n'a pas été recompilé, l'ancienne version est conservée")
                else:
                    # Vérifier que index.html existe
                    index_html = build_dir / "index.html"
                    if index_html.exists():
                        logger.info("✅ Frontend compilé avec succès (index.html vérifié)")
                    else:
                        logger.error("❌ index.html manquant après le build!")
                        # Restaurer le backup
                        if build_backup.exists():
                            try:
                                shutil.copytree(str(build_backup), str(build_dir))
                                logger.info("📁 Build restauré car index.html manquant")
                            except Exception:
                                pass
                
                # Nettoyer le backup
                if build_backup.exists():
                    try:
                        shutil.rmtree(str(build_backup))
                    except Exception:
                        pass
            
            logger.info("✅ Dépendances installées et frontend compilé")
            
            # 5. Mettre à jour version.json avec la nouvelle version
            logger.info("📝 Étape 5/6: Mise à jour du fichier version.json...")
            try:
                version_file = self.app_root / "updates" / "version.json"
                if version_file.exists():
                    import json as json_mod
                    with open(version_file, 'r') as f:
                        version_data = json_mod.load(f)
                    version_data["version"] = version
                    version_data["lastUpdate"] = datetime.now(timezone.utc).isoformat()
                    with open(version_file, 'w') as f:
                        json_mod.dump(version_data, f, indent=2, ensure_ascii=False)
                    self.current_version = version
                    logger.info(f"✅ version.json mis à jour: {version}")
            except Exception as e:
                logger.warning(f"⚠️ Impossible de mettre à jour version.json: {str(e)}")
            
            # 6. Planifier le redémarrage des services (APRÈS l'envoi de la réponse HTTP)
            # CRITIQUE: On ne doit PAS restart le backend de manière synchrone
            # car ça tuerait le processus avant que la réponse HTTP ne soit envoyée.
            # On utilise un script détaché qui attend 3 secondes.
            logger.info("🔄 Étape 6/6: Planification du redémarrage des services...")
            
            try:
                import tempfile
                import subprocess as sp
                
                restart_script = tempfile.NamedTemporaryFile(
                    mode='w', suffix='.sh', prefix='gmao_restart_', dir='/tmp', delete=False
                )
                restart_script.write(f"""#!/bin/bash
# Redémarrage post-mise-à-jour GMAO Iris
# Attend que la réponse HTTP soit envoyée au frontend

sleep 3

# Redémarrer le backend uniquement (pas all, pour éviter de tuer nginx)
supervisorctl restart gmao-iris-backend 2>/dev/null || \\
/usr/bin/supervisorctl restart gmao-iris-backend 2>/dev/null || \\
sudo supervisorctl restart gmao-iris-backend 2>/dev/null || \\
supervisorctl restart all 2>/dev/null || \\
sudo supervisorctl restart all 2>/dev/null

# Attendre que le backend redémarre
sleep 5

# Recharger nginx pour servir les nouveaux fichiers frontend
nginx -s reload 2>/dev/null || \\
sudo nginx -s reload 2>/dev/null || \\
sudo systemctl reload nginx 2>/dev/null || \\
sudo service nginx reload 2>/dev/null

# Nettoyage
rm -f {restart_script.name}
""")
                restart_script.close()
                os.chmod(restart_script.name, 0o755)
                
                # Lancer le script en arrière-plan (détaché)
                sp.Popen(
                    ['/bin/bash', restart_script.name],
                    stdout=sp.DEVNULL,
                    stderr=sp.DEVNULL,
                    start_new_session=True
                )
                
                logger.info(f"✅ Redémarrage planifié dans 3 secondes")
                    
            except Exception as e:
                logger.warning(f"⚠️ Impossible de planifier le redémarrage: {str(e)}")
                logger.info("ℹ️ Veuillez redémarrer manuellement: supervisorctl restart gmao-iris-backend && sudo nginx -s reload")
            
            # Mise à jour réussie
            logger.info(f"✨ Mise à jour vers {version} terminée avec succès")
            
            # Enregistrer le succès dans l'historique
            update_history["completed_at"] = datetime.now(timezone.utc).isoformat()
            update_history["status"] = "success"
            update_history["success"] = True
            update_history["backup_path"] = str(backup_path)
            update_history["backup_created"] = True
            update_history["logs"].append(f"Mise à jour vers {version} terminée avec succès")
            
            # Calculer la durée
            start_time = datetime.fromisoformat(update_history["started_at"])
            end_time = datetime.fromisoformat(update_history["completed_at"])
            update_history["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Sauvegarder dans la base de données
            try:
                await self.db.system_update_history.insert_one(update_history)
                logger.info("✅ Historique de mise à jour enregistré")
            except Exception as e:
                logger.error(f"❌ Erreur lors de l'enregistrement de l'historique: {str(e)}")
            
            return {
                "success": True,
                "message": f"Mise à jour vers {version} appliquée avec succès",
                "version": version,
                "backup_path": str(backup_path),
                "timestamp": datetime.now().isoformat(),
                "history_id": update_history["id"]
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'application de la mise à jour: {str(e)}")
            
            # Enregistrer l'échec dans l'historique
            update_history["completed_at"] = datetime.now(timezone.utc).isoformat()
            update_history["status"] = "failed"
            update_history["success"] = False
            update_history["error_message"] = str(e)
            update_history["logs"].append(f"Erreur: {str(e)}")
            
            # Calculer la durée
            start_time = datetime.fromisoformat(update_history["started_at"])
            end_time = datetime.fromisoformat(update_history["completed_at"])
            update_history["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Sauvegarder dans la base de données
            try:
                await self.db.system_update_history.insert_one(update_history)
                logger.info("✅ Historique d'échec de mise à jour enregistré")
            except Exception as db_error:
                logger.error(f"❌ Erreur lors de l'enregistrement de l'historique: {str(db_error)}")
            
            return {
                "success": False,
                "message": "Erreur lors de l'application de la mise à jour",
                "error": str(e),
                "history_id": update_history["id"]
            }

