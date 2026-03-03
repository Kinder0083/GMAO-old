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

class UpdateService:
    def __init__(self, db):
        self.db = db
        self.github_user = os.environ.get("GITHUB_USER", "Kinder0083")
        self.github_repo = os.environ.get("GITHUB_REPO", "GMAO")
        self.github_branch = os.environ.get("GITHUB_BRANCH", "main")
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

    
    def _ensure_gitignore(self):
        """S'assure qu'un .gitignore existe avec les exclusions nécessaires"""
        gitignore_path = self.app_root / ".gitignore"
        required_patterns = [
            "venv/", "backend/uploads/", "backend/tests/", 
            "*.pyc", "__pycache__/", "node_modules/",
            "frontend/build/", ".env", "*.log",
            "backups/", "post-update.sh", "update.sh"
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
            ignored_files = {'.gitignore', 'frontend/yarn.lock', 'package-lock.json', 'yarn.lock'}
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
                    # S'assurer que .gitignore est à jour AVANT toute opération
                    self._ensure_gitignore()
                    
                    # APPROCHE NUCLÉAIRE : reproduire exactement le processus SSH qui fonctionne
                    # rm -rf .git && git init && git remote add && git fetch && git reset --hard
                    
                    # Enrichir le PATH pour s'assurer que git/yarn/node sont trouvés
                    git_env = os.environ.copy()
                    for extra_path in ["/usr/local/bin", "/usr/bin", "/usr/local/sbin", "/usr/sbin"]:
                        if extra_path not in git_env.get("PATH", ""):
                            git_env["PATH"] = extra_path + ":" + git_env.get("PATH", "")
                    
                    # CRITIQUE : Sauvegarder les fichiers .env AVANT toute opération
                    env_backups = {}
                    for env_path in [
                        git_dir / "backend" / ".env",
                        git_dir / "frontend" / ".env"
                    ]:
                        if env_path.exists():
                            try:
                                env_backups[str(env_path)] = env_path.read_text()
                                self._log_step(update_history, "3/6 - Sauvegarde .env",
                                              f"backup {env_path.name}", status="success")
                            except Exception as e:
                                self._log_step(update_history, "3/6 - Sauvegarde .env",
                                              f"backup {env_path.name}",
                                              stderr=str(e), status="warning")
                    
                    # Supprimer complètement le dossier .git
                    git_path = git_dir / ".git"
                    if git_path.exists():
                        shutil.rmtree(str(git_path))
                        self._log_step(update_history, "3/6 - Suppression .git",
                                      "rm -rf .git", status="success")
                    
                    # git init
                    success, stdout, stderr = await self._run_command(
                        update_history, "3/6 - git init",
                        ["git", "init"],
                        cwd=str(git_dir), env=git_env, timeout=10
                    )
                    if not success:
                        git_available = False
                    
                    # git remote add origin
                    if git_available:
                        github_url = f"https://github.com/{self.github_user}/{self.github_repo}.git"
                        success, stdout, stderr = await self._run_command(
                            update_history, "3/6 - git remote add",
                            ["git", "remote", "add", "origin", github_url],
                            cwd=str(git_dir), env=git_env, timeout=10
                        )
                        if not success:
                            git_available = False
                    
                    # git fetch origin main --depth=1 (télécharge uniquement le dernier commit)
                    if git_available:
                        success, stdout, stderr = await self._run_command(
                            update_history, "3/6 - git fetch origin main --depth=1",
                            ["git", "fetch", "--depth=1", "origin", self.github_branch],
                            cwd=str(git_dir), env=git_env, timeout=300
                        )
                        if not success:
                            git_available = False
                            update_history["errors"].append(f"CRITIQUE: Git fetch échoué - le code n'a PAS été mis à jour. Détail: {stderr[:300]}")
                    
                    # git reset --hard origin/main
                    if git_available:
                        success, stdout, stderr = await self._run_command(
                            update_history, "3/6 - git reset --hard (synchronisation forcée)",
                            ["git", "reset", "--hard", f"origin/{self.github_branch}"],
                            cwd=str(git_dir), env=git_env, timeout=30
                        )
                        if not success:
                            git_available = False
                            update_history["errors"].append(f"CRITIQUE: Git reset échoué - le code n'a PAS été mis à jour. Détail: {stderr[:300]}")
                        else:
                            self._log_step(update_history, "3/6 - Code synchronisé",
                                          f"Le code est maintenant à jour avec origin/{self.github_branch}",
                                          status="success")
                    
                    # RESTAURATION : Remettre les fichiers .env sauvegardés
                    for env_file_path, env_content in env_backups.items():
                        try:
                            Path(env_file_path).write_text(env_content)
                            self._log_step(update_history, "3/6 - Restauration .env",
                                          f"restore {Path(env_file_path).name}", status="success")
                        except Exception as e:
                            self._log_step(update_history, "3/6 - Restauration .env",
                                          f"restore {Path(env_file_path).name}",
                                          stderr=str(e), status="error")
                            update_history["errors"].append(f".env perdu: {env_file_path}")
                    
                    # Recréer .gitignore après le reset (peut avoir été écrasé)
                    self._ensure_gitignore()
                    
                except Exception as e:
                    self._log_step(update_history, "3/6 - Erreur Git inattendue", str(e),
                                  stderr=str(e), status="error")
                    git_available = False
                    update_history["errors"].append(f"CRITIQUE: Erreur Git - le code n'a PAS été mis à jour: {str(e)[:200]}")
            
            if not git_available:
                update_history["errors"].append("CRITIQUE: Le code source n'a pas pu être mis à jour depuis GitHub")
                self._log_step(update_history, "3/6 - ÉCHEC synchronisation code", 
                              "Le code n'a PAS été mis à jour. Les dépendances seront réinstallées mais les nouvelles fonctionnalités ne seront pas disponibles.",
                              status="error")
            
            # 4. Installer les dépendances
            logger.info("📦 Étape 4/5: Installation des dépendances...")
            
            # Backend dependencies
            backend_req = self.backend_dir / "requirements.txt"
            if backend_req.exists():
                # Chercher le venv Python
                venv_pip_backend = self.backend_dir / "venv" / "bin" / "pip"
                venv_pip_root = self.app_root / "venv" / "bin" / "pip"
                if venv_pip_backend.exists():
                    venv_pip = str(venv_pip_backend)
                elif venv_pip_root.exists():
                    venv_pip = str(venv_pip_root)
                else:
                    venv_pip = "pip3"
                
                success, stdout, stderr = await self._run_command(
                    update_history, "4/6 - pip install (dépendances backend)",
                    [venv_pip, "install", "-r", str(backend_req)],
                    timeout=300
                )
                if not success:
                    update_history["warnings"].append(f"pip install échoué: {stderr[:200]}")
            
            # Frontend dependencies
            frontend_package = self.frontend_dir / "package.json"
            if frontend_package.exists():
                # Sauvegarder le build existant
                build_dir = self.frontend_dir / "build"
                build_backup = self.frontend_dir / "build_backup"
                if build_dir.exists():
                    try:
                        if build_backup.exists():
                            shutil.rmtree(str(build_backup))
                        shutil.copytree(str(build_dir), str(build_backup))
                        self._log_step(update_history, "4/6 - Backup build frontend",
                                      f"cp -r build/ build_backup/", status="success")
                    except Exception as e:
                        self._log_step(update_history, "4/6 - Backup build frontend",
                                      f"cp -r build/ build_backup/",
                                      stderr=str(e), status="warning")
                
                # Construire l'environnement pour yarn
                build_env = os.environ.copy()
                build_env["CI"] = "false"
                build_env["NODE_OPTIONS"] = "--max_old_space_size=1024"
                for extra_path in ["/usr/local/bin", "/usr/bin", "/usr/local/sbin", "/usr/sbin"]:
                    if extra_path not in build_env.get("PATH", ""):
                        build_env["PATH"] = extra_path + ":" + build_env.get("PATH", "")
                
                # Charger les variables du frontend/.env dans l'environnement de build
                frontend_env = self.frontend_dir / ".env"
                if frontend_env.exists():
                    try:
                        for line in frontend_env.read_text().strip().split('\n'):
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                build_env[key.strip()] = value.strip()
                    except Exception:
                        pass
                
                # yarn install
                success, stdout, stderr = await self._run_command(
                    update_history, "4/6 - yarn install (dépendances frontend)",
                    ["yarn", "install"],
                    cwd=str(self.frontend_dir), env=build_env, timeout=300
                )
                if not success:
                    update_history["warnings"].append(f"yarn install échoué: {stderr[:200]}")
                
                # yarn build
                success, stdout, stderr = await self._run_command(
                    update_history, "4/6 - yarn build (compilation frontend)",
                    ["yarn", "build"],
                    cwd=str(self.frontend_dir), env=build_env, timeout=600
                )
                
                if not success:
                    update_history["errors"].append(f"yarn build échoué: {stderr[:300]}")
                    # Restaurer le backup du build
                    if build_backup.exists():
                        try:
                            if build_dir.exists():
                                shutil.rmtree(str(build_dir))
                            shutil.copytree(str(build_backup), str(build_dir))
                            self._log_step(update_history, "4/6 - Restauration build frontend",
                                          "cp -r build_backup/ build/", status="warning")
                        except Exception as e:
                            self._log_step(update_history, "4/6 - Restauration build frontend",
                                          "cp -r build_backup/ build/",
                                          stderr=str(e), status="error")
                else:
                    # Vérifier que index.html existe
                    index_html = build_dir / "index.html"
                    if index_html.exists():
                        self._log_step(update_history, "4/6 - Vérification build",
                                      "test -f build/index.html", status="success")
                    else:
                        self._log_step(update_history, "4/6 - Vérification build",
                                      "test -f build/index.html",
                                      stderr="index.html manquant après le build!", status="error")
                        update_history["errors"].append("index.html manquant après yarn build")
                        if build_backup.exists():
                            try:
                                shutil.copytree(str(build_backup), str(build_dir))
                            except Exception:
                                pass
                
                # Nettoyer le backup
                if build_backup.exists():
                    try:
                        shutil.rmtree(str(build_backup))
                    except Exception:
                        pass
            
            # 5. Mettre à jour version.json
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
                    self._log_step(update_history, "5/6 - Mise à jour version.json",
                                  f"version.json → {version}", status="success")
            except Exception as e:
                self._log_step(update_history, "5/6 - Mise à jour version.json",
                              f"Écriture version.json", stderr=str(e), status="warning")
            
            # 6. Planifier le redémarrage des services
            logger.info("🔄 Étape 6/6: Planification du redémarrage des services...")
            
            try:
                import tempfile
                import subprocess as sp
                
                restart_script = tempfile.NamedTemporaryFile(
                    mode='w', suffix='.sh', prefix='gmao_restart_', dir='/tmp', delete=False
                )
                restart_script.write(f"""#!/bin/bash
# Redémarrage post-mise-à-jour FSAO Iris
sleep 3

# Tenter supervisorctl
supervisorctl restart gmao-iris-backend 2>/dev/null && echo "supervisorctl OK" || \\
/usr/bin/supervisorctl restart gmao-iris-backend 2>/dev/null && echo "supervisorctl (abs) OK" || \\
sudo supervisorctl restart gmao-iris-backend 2>/dev/null && echo "sudo supervisorctl OK" || \\
supervisorctl restart all 2>/dev/null && echo "supervisorctl all OK" || \\
sudo supervisorctl restart all 2>/dev/null && echo "sudo supervisorctl all OK" || true

# Tenter systemctl
sudo systemctl restart gmao-iris-backend 2>/dev/null && echo "systemctl backend OK" || \\
sudo systemctl restart gmao-iris 2>/dev/null && echo "systemctl gmao-iris OK" || \\
sudo systemctl restart gmao 2>/dev/null && echo "systemctl gmao OK" || true

sleep 5

# Recharger nginx
nginx -s reload 2>/dev/null || \\
sudo nginx -s reload 2>/dev/null || \\
sudo systemctl reload nginx 2>/dev/null || \\
sudo service nginx reload 2>/dev/null || true

rm -f {restart_script.name}
""")
                restart_script.close()
                os.chmod(restart_script.name, 0o755)
                
                sp.Popen(
                    ['/bin/bash', restart_script.name],
                    stdout=sp.DEVNULL, stderr=sp.DEVNULL,
                    start_new_session=True
                )
                
                self._log_step(update_history, "6/6 - Redémarrage planifié",
                              f"bash {restart_script.name}", status="success")
                    
            except Exception as e:
                self._log_step(update_history, "6/6 - Redémarrage planifié",
                              "supervisorctl restart", stderr=str(e), status="warning")
                update_history["warnings"].append(f"Redémarrage auto échoué: {str(e)}")
            
            # RÉSUMÉ FINAL
            logger.info(f"✨ Mise à jour vers {version} terminée")
            
            # Compter les avertissements et erreurs
            warning_steps = [entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "warning"]
            error_steps = [entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "error"]
            
            # Déterminer le statut final
            has_critical_errors = len(update_history["errors"]) > 0
            code_updated = git_available  # Le code a-t-il été réellement mis à jour ?
            
            update_history["completed_at"] = datetime.now(timezone.utc).isoformat()
            update_history["code_updated"] = code_updated
            
            if has_critical_errors:
                update_history["status"] = "partial_failure"
            elif warning_steps or update_history["warnings"]:
                update_history["status"] = "success_with_warnings"
            else:
                update_history["status"] = "success"
                
            update_history["success"] = code_updated and not has_critical_errors
            update_history["backup_path"] = str(backup_path)
            
            # Résumé lisible
            update_history["summary"] = {
                "total_steps": len(update_history["logs"]),
                "successful_steps": len([entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "success"]),
                "warning_steps": len(warning_steps),
                "error_steps": len(error_steps),
                "warnings": update_history["warnings"],
                "errors": update_history["errors"],
                "files_changed": update_history["total_files_changed"]
            }
            
            # Calculer la durée
            start_time = datetime.fromisoformat(update_history["started_at"])
            end_time = datetime.fromisoformat(update_history["completed_at"])
            update_history["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Sauvegarder dans la base de données
            try:
                await self.db.system_update_history.insert_one(update_history)
                logger.info("✅ Journal de mise à jour complet enregistré en base de données")
            except Exception as e:
                logger.error(f"❌ Erreur lors de l'enregistrement du journal: {str(e)}")
            
            if code_updated and not has_critical_errors:
                result_msg = f"Mise à jour vers {version} terminée avec succès"
            elif not code_updated:
                result_msg = f"Mise à jour vers {version} ÉCHOUÉE - le code source n'a pas été mis à jour depuis GitHub"
            else:
                result_msg = f"Mise à jour vers {version} terminée avec des erreurs"

            return {
                "success": code_updated and not has_critical_errors,
                "code_updated": code_updated,
                "message": result_msg,
                "version": version,
                "backup_path": str(backup_path),
                "timestamp": datetime.now().isoformat(),
                "history_id": update_history["id"],
                "summary": update_history["summary"]
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'application de la mise à jour: {str(e)}")
            
            # Enregistrer l'échec dans l'historique avec journal complet
            update_history["completed_at"] = datetime.now(timezone.utc).isoformat()
            update_history["status"] = "failed"
            update_history["success"] = False
            update_history["error_message"] = str(e)
            update_history["errors"].append(f"Erreur fatale: {str(e)}")
            self._log_step(update_history, "ERREUR FATALE", "apply_update",
                          stderr=str(e), status="error")
            
            # Calculer la durée
            start_time = datetime.fromisoformat(update_history["started_at"])
            end_time = datetime.fromisoformat(update_history["completed_at"])
            update_history["duration_seconds"] = (end_time - start_time).total_seconds()
            
            # Résumé
            update_history["summary"] = {
                "total_steps": len(update_history["logs"]),
                "successful_steps": len([entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "success"]),
                "warning_steps": len([entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "warning"]),
                "error_steps": len([entry for entry in update_history["logs"] if isinstance(entry, dict) and entry.get("status") == "error"]),
                "warnings": update_history.get("warnings", []),
                "errors": update_history.get("errors", []),
                "files_changed": update_history.get("total_files_changed", 0)
            }
            
            # Sauvegarder dans la base de données (même en cas d'échec)
            try:
                await self.db.system_update_history.insert_one(update_history)
                logger.info("✅ Journal d'échec de mise à jour enregistré")
            except Exception as db_error:
                logger.error(f"❌ Erreur lors de l'enregistrement du journal: {str(db_error)}")
            
            return {
                "success": False,
                "message": "Erreur lors de l'application de la mise à jour",
                "error": str(e),
                "history_id": update_history["id"],
                "summary": update_history.get("summary")
            }

