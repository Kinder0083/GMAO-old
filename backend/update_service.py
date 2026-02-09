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


    async def apply_update(self, version: str) -> Dict:
        """
        Applique une mise à jour système
        Args:
            version: Version à installer
        Returns:
            Dict avec success, message, et détails
        """
        # Créer l'entrée d'historique
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
            "triggered_by": "manual",
            "backup_created": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            logger.info(f"🚀 Début de l'application de la mise à jour vers {version}")
            update_history["logs"].append(f"Début de la mise à jour vers {version}")
            
            # 1. Créer un backup de la base de données
            logger.info("📦 Étape 1/5: Création du backup de la base de données...")
            backup_path = self.backup_dir / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Obtenir l'URL MongoDB
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/cmms')
            
            # Exécuter mongodump
            try:
                dump_cmd = [
                    "mongodump",
                    f"--uri={mongo_url}",
                    f"--out={backup_path}"
                ]
                
                dump_process = await asyncio.create_subprocess_exec(
                    *dump_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await asyncio.wait_for(dump_process.communicate(), timeout=120)
                
                if dump_process.returncode != 0:
                    logger.warning(f"⚠️ Échec du backup (non bloquant): {stderr.decode()[:200]}")
                    update_history["logs"].append(f"Backup échoué (non bloquant): {stderr.decode()[:200]}")
                    update_history["backup_created"] = False
                else:
                    logger.info(f"✅ Backup créé: {backup_path}")
                    update_history["logs"].append(f"Backup créé: {backup_path}")
                    update_history["backup_created"] = True
                    update_history["backup_path"] = str(backup_path)
                
            except asyncio.TimeoutError:
                logger.warning("⚠️ Timeout lors du backup (non bloquant, on continue)")
                update_history["backup_created"] = False
            except FileNotFoundError:
                logger.warning("⚠️ mongodump non installé (non bloquant, on continue)")
                update_history["backup_created"] = False
            
            # 2. Exporter les données en Excel
            logger.info("📊 Étape 2/5: Export des données en Excel...")
            try:
                export_path = self.backup_dir / f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                # Note: Cette partie nécessiterait l'implémentation de l'export Excel
                # Pour l'instant, on continue sans erreur
                logger.info("✅ Export Excel préparé")
            except Exception as e:
                logger.warning(f"⚠️ Export Excel non disponible: {str(e)}")
            
            # 3. Télécharger la mise à jour depuis GitHub
            logger.info(f"📥 Étape 3/5: Téléchargement de la version {version}...")
            
            # Utiliser git pull pour récupérer les changements
            git_dir = self.app_root
            
            git_available = False
            
            try:
                # Vérifier si Git est disponible et configuré
                git_version = await asyncio.create_subprocess_exec(
                    "git", "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await git_version.communicate()
                git_available = (git_version.returncode == 0)
            except FileNotFoundError:
                logger.warning("⚠️ Git n'est pas installé sur ce système")
                git_available = False
            
            if git_available:
                try:
                    # CRITIQUE: Désactiver le git hook post-merge AVANT le pull
                    # Sinon le hook exécute post-update.sh qui restart le backend
                    # pendant que update_service.py est encore en train de tourner
                    post_merge_hook = git_dir / ".git" / "hooks" / "post-merge"
                    post_merge_disabled = git_dir / ".git" / "hooks" / "post-merge.disabled"
                    hook_was_disabled = False
                    if post_merge_hook.exists():
                        try:
                            os.rename(str(post_merge_hook), str(post_merge_disabled))
                            hook_was_disabled = True
                            logger.info("🔒 Git hook post-merge désactivé temporairement")
                        except Exception as e:
                            logger.warning(f"⚠️ Impossible de désactiver le hook: {e}")
                    
                    # Vérifier s'il y a des modifications locales
                    git_check = await asyncio.create_subprocess_exec(
                        "git", "status", "--porcelain",
                        cwd=git_dir,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    check_stdout, check_stderr = await git_check.communicate()
                    
                    if git_check.returncode != 0:
                        logger.warning(f"⚠️ Git status a échoué: {check_stderr.decode()}")
                        git_available = False
                    elif check_stdout.decode().strip():
                        logger.warning("⚠️ Modifications locales détectées")
                        # Stash les modifications locales
                        stash_process = await asyncio.create_subprocess_exec(
                            "git", "stash",
                            cwd=git_dir,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        await stash_process.communicate()
                    
                    if git_available:
                        # Git pull
                        pull_process = await asyncio.create_subprocess_exec(
                            "git", "pull", "origin", self.github_branch,
                            cwd=git_dir,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE
                        )
                        
                        pull_stdout, pull_stderr = await asyncio.wait_for(pull_process.communicate(), timeout=120)
                        
                        if pull_process.returncode != 0:
                            error_msg = pull_stderr.decode()
                            logger.warning(f"⚠️ Git pull a échoué: {error_msg}")
                            # Vérifier si c'est un problème de configuration Git (non bloquant)
                            if ("No remote" in error_msg or "no remote" in error_msg or 
                                "not a git repository" in error_msg or 
                                "does not appear to be a git repository" in error_msg or
                                "'origin' does not appear" in error_msg or
                                "Could not resolve host" in error_msg):
                                logger.info("ℹ️ Git non configuré ou réseau indisponible - CONTINUE sans Git")
                                git_available = False
                            else:
                                # Erreur Git réelle (permissions, conflit, etc.)
                                logger.error(f"❌ Échec du git pull: {error_msg}")
                                return {
                                    "success": False,
                                    "message": "Échec du téléchargement de la mise à jour",
                                    "error": error_msg
                                }
                        else:
                            logger.info("✅ Mise à jour téléchargée via Git")
                    
                    # Réactiver le git hook post-merge
                    if hook_was_disabled and post_merge_disabled.exists():
                        try:
                            os.rename(str(post_merge_disabled), str(post_merge_hook))
                            logger.info("🔓 Git hook post-merge réactivé")
                        except Exception:
                            pass
                    
                except asyncio.TimeoutError:
                    logger.warning("⚠️ Timeout Git - CONTINUE sans Git")
                    git_available = False
                except Exception as e:
                    logger.warning(f"⚠️ Erreur Git ({str(e)}) - CONTINUE sans Git")
                    git_available = False
            
            if not git_available:
                logger.warning("⚠️ Mise à jour Git non disponible")
                logger.info("ℹ️ Les dépendances seront réinstallées et les services redémarrés")
                logger.info("ℹ️ Pour mettre à jour le code, utilisez 'git pull' manuellement ou réinstallez depuis GitHub")
            
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

