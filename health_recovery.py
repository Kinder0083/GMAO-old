#!/usr/bin/env python3
"""
FSAO Iris - Health Check & Auto-Recovery (4 niveaux)
=====================================================
Script de surveillance automatique de l'application.
Verifie la sante de l'application toutes les 5 minutes via cron.
En cas de dysfonctionnement, applique une recuperation graduelle.

Niveaux de recuperation :
  1. SOFT      - Redemarrage des services (supervisorctl + nginx reload)
  2. ROLLBACK  - Retour au commit Git precedent + rebuild
  3. MEDIUM    - Reinstallation complete des dependances + rebuild
  4. HARD      - Reset Git complet depuis GitHub (nuclear option)

Usage :
  python3 health_recovery.py              # Health check + auto-recovery
  python3 health_recovery.py --status     # Afficher le statut actuel
  python3 health_recovery.py --reset      # Reset le compteur d'echecs
  python3 health_recovery.py --maintenance on   # Activer la page maintenance
  python3 health_recovery.py --maintenance off  # Desactiver la page maintenance
"""

import os
import sys
import json
import time
import subprocess
import logging
import urllib.request
from datetime import datetime
from pathlib import Path

# ─── Configuration ───────────────────────────────────────────────

APP_ROOT = os.environ.get("GMAO_APP_ROOT", "/opt/gmao-iris")
HEALTH_URL = os.environ.get("GMAO_HEALTH_URL", "http://localhost:8001/api/version")
FRONTEND_URL = os.environ.get("GMAO_FRONTEND_URL", "http://localhost:80")
LOG_FILE = os.path.join(APP_ROOT, "health_recovery.log")
STATE_FILE = os.path.join(APP_ROOT, "health_state.json")
MAINTENANCE_FLAG = os.path.join(APP_ROOT, "maintenance.flag")
MAINTENANCE_HTML = os.path.join(APP_ROOT, "maintenance.html")
NGINX_CONF_DIR = "/etc/nginx"
GITHUB_USER = os.environ.get("GITHUB_USER", "Kinder0083")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "GMAO")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

MAX_CONSECUTIVE_FAILURES = 4  # Apres 4 echecs consecutifs, on passe au niveau Hard
HEALTH_TIMEOUT = 10  # Timeout HTTP en secondes
ALERT_HISTORY_FILE = os.path.join(APP_ROOT, "health_alert_history.json")
ALERT_CONFIG_FILE = os.path.join(APP_ROOT, "health_alert_config_cache.json")

# ─── Logging ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("health_recovery")


# ─── State Management ────────────────────────────────────────────

def load_state():
    """Charge l'etat persistant du health check."""
    default = {
        "consecutive_failures": 0,
        "last_check": None,
        "last_success": None,
        "last_failure": None,
        "last_recovery_level": 0,
        "total_recoveries": 0,
        "maintenance_active": False
    }
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, "r") as f:
                state = json.load(f)
            # Merge with defaults for any missing keys
            for k, v in default.items():
                if k not in state:
                    state[k] = v
            return state
    except Exception:
        pass
    return default


def save_state(state):
    """Sauvegarde l'etat persistant."""
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        log.error(f"Impossible de sauvegarder l'etat: {e}")


HISTORY_FILE = os.path.join(APP_ROOT, "health_recovery_history.json")


def append_recovery_event(level, success, details=""):
    """Ajoute un evenement de recuperation dans l'historique JSON."""
    try:
        history = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)
        level_names = {1: "SOFT", 2: "ROLLBACK", 3: "MEDIUM", 4: "HARD"}
        event = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "level_name": level_names.get(level, f"NIVEAU {level}"),
            "success": success,
            "details": details
        }
        history.append(event)
        # Garder les 100 derniers evenements
        history = history[-100:]
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        log.error(f"Impossible d'ecrire l'historique: {e}")


# ─── Email Alerts ─────────────────────────────────────────────────

def _load_alert_config():
    """Charge la config des alertes. Essaie d'abord l'API, puis le cache local."""
    # Essayer de lire depuis l'API backend (si le backend tourne)
    try:
        req = urllib.request.Request(
            HEALTH_URL.replace("/version", "/health/alerts-config"),
            method="GET"
        )
        # On a besoin d'un token admin - on utilise le cache s'il existe
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                config = json.loads(resp.read())
                # Mettre en cache
                with open(ALERT_CONFIG_FILE, "w") as f:
                    json.dump(config, f, indent=2)
                return config
    except Exception:
        pass
    # Fallback: lire le cache local
    try:
        if os.path.exists(ALERT_CONFIG_FILE):
            with open(ALERT_CONFIG_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return None


def _can_send_alert(alert_type, cooldown_hours=24):
    """Verifie le cooldown pour un type d'alerte."""
    try:
        history = {}
        if os.path.exists(ALERT_HISTORY_FILE):
            with open(ALERT_HISTORY_FILE) as f:
                history = json.load(f)
        last_sent = history.get(alert_type)
        if not last_sent:
            return True
        from datetime import timedelta
        last_dt = datetime.fromisoformat(last_sent)
        return (datetime.now() - last_dt) > timedelta(hours=cooldown_hours)
    except Exception:
        return True


def _mark_alert_sent(alert_type):
    """Marque une alerte comme envoyee."""
    try:
        history = {}
        if os.path.exists(ALERT_HISTORY_FILE):
            with open(ALERT_HISTORY_FILE) as f:
                history = json.load(f)
        history[alert_type] = datetime.now().isoformat()
        with open(ALERT_HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass


def send_alert_via_backend(alert_type, extra_data=None):
    """
    Envoie une alerte email via le service backend (health_alert_service.py).
    Utilise l'API interne ou importe directement le module si possible.
    """
    config = _load_alert_config()
    if not config or not config.get("enabled"):
        return
    recipients = config.get("recipients", [])
    if not recipients:
        return
    # Verifier si ce type d'alerte est active
    alert_conf = config.get("alerts", {}).get(alert_type, {})
    if not alert_conf.get("enabled", True):
        return
    cooldown = config.get("cooldown_hours", 24)
    if not _can_send_alert(alert_type, cooldown):
        log.info(f"[Alert] Cooldown actif pour {alert_type}")
        return

    # Tenter d'importer le service directement
    try:
        sys.path.insert(0, os.path.join(APP_ROOT, "backend"))
        from health_alert_service import send_health_alert
        ok = send_health_alert(alert_type, recipients, extra_data, cooldown)
        if ok:
            log.info(f"[Alert] Email {alert_type} envoye")
            _mark_alert_sent(alert_type)
        return
    except ImportError:
        log.warning("[Alert] Impossible d'importer health_alert_service, envoi direct")
    except Exception as e:
        log.error(f"[Alert] Erreur envoi alerte: {e}")

    # Fallback: envoi direct via smtplib
    try:
        import smtplib
        from email.mime.text import MIMEText
        env_file = os.path.join(APP_ROOT, "backend", ".env")
        smtp_host = "localhost"
        smtp_port = 25
        smtp_from = "noreply@gmao-iris.com"
        if os.path.exists(env_file):
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("SMTP_HOST=") or line.startswith("SMTP_SERVER="):
                        smtp_host = line.split("=", 1)[1].strip().strip('"')
                    elif line.startswith("SMTP_PORT="):
                        smtp_port = int(line.split("=", 1)[1].strip())
                    elif line.startswith("SMTP_FROM=") or line.startswith("SMTP_SENDER_EMAIL="):
                        smtp_from = line.split("=", 1)[1].strip().strip('"')

        level_names = {1: "SOFT", 2: "ROLLBACK", 3: "MEDIUM", 4: "HARD"}
        subject = f"[ALERTE] FSAO Iris - {alert_type}"
        body = f"Alerte systeme: {alert_type}\nDetails: {json.dumps(extra_data or {}, indent=2)}"

        for email in recipients:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = f"FSAO Iris <{smtp_from}>"
            msg["To"] = email
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.send_message(msg)
            server.quit()
            log.info(f"[Alert] Email direct envoye a {email}")
        _mark_alert_sent(alert_type)
    except Exception as e:
        log.error(f"[Alert] Echec envoi direct: {e}")


# ─── Health Check ─────────────────────────────────────────────────

def check_backend_health():
    """Verifie si le backend repond correctement."""
    try:
        req = urllib.request.Request(HEALTH_URL, method="GET")
        with urllib.request.urlopen(req, timeout=HEALTH_TIMEOUT) as resp:
            if resp.status == 200:
                return True, "Backend OK"
    except urllib.error.URLError as e:
        return False, f"Backend inaccessible: {e.reason}"
    except Exception as e:
        return False, f"Erreur health check backend: {e}"
    return False, "Backend a repondu avec un code non-200"


def check_nginx_health():
    """Verifie si NGINX repond (meme en mode maintenance)."""
    try:
        req = urllib.request.Request(FRONTEND_URL, method="GET")
        with urllib.request.urlopen(req, timeout=HEALTH_TIMEOUT) as resp:
            return resp.status in (200, 503), f"NGINX status: {resp.status}"
    except urllib.error.URLError as e:
        return False, f"NGINX inaccessible: {e.reason}"
    except Exception as e:
        return False, f"Erreur health check NGINX: {e}"


def check_supervisor_services():
    """Verifie l'etat des services supervisord."""
    try:
        result = subprocess.run(
            ["supervisorctl", "status"],
            capture_output=True, text=True, timeout=10
        )
        running = 0
        total = 0
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                total += 1
                if "RUNNING" in line:
                    running += 1
        return running, total, result.stdout.strip()
    except Exception as e:
        return 0, 0, str(e)


def full_health_check():
    """Effectue un health check complet. Retourne (healthy, details)."""
    details = []

    # 1. Backend API
    backend_ok, backend_msg = check_backend_health()
    details.append(f"Backend: {'OK' if backend_ok else 'ERREUR'} - {backend_msg}")

    # 2. NGINX
    nginx_ok, nginx_msg = check_nginx_health()
    details.append(f"NGINX: {'OK' if nginx_ok else 'ERREUR'} - {nginx_msg}")

    # 3. Supervisor services
    running, total, svc_detail = check_supervisor_services()
    svc_ok = running > 0 and running == total
    details.append(f"Services: {running}/{total} running")

    # 4. Verifier disque et memoire pour alertes
    _check_resource_alerts()

    # Overall health: backend must respond
    healthy = backend_ok
    return healthy, details


def _check_resource_alerts():
    """Verifie les seuils disque et memoire et envoie des alertes si necessaire."""
    config = _load_alert_config()
    if not config or not config.get("enabled"):
        return

    alerts = config.get("alerts", {})

    # Disque
    disk_conf = alerts.get("disk_warning", {})
    if disk_conf.get("enabled", True):
        threshold = disk_conf.get("threshold", 80)
        try:
            import shutil
            usage = shutil.disk_usage("/")
            used_pct = round((usage.used / usage.total) * 100, 1)
            free_gb = round(usage.free / (1024**3), 1)
            if used_pct >= threshold:
                send_alert_via_backend("disk_warning", {"used_pct": used_pct, "free_gb": free_gb})
        except Exception:
            pass

    # Memoire
    mem_conf = alerts.get("memory_warning", {})
    if mem_conf.get("enabled", True):
        threshold = mem_conf.get("threshold", 85)
        try:
            with open("/proc/meminfo") as f:
                meminfo = f.read()
            total = int([l for l in meminfo.split('\n') if 'MemTotal' in l][0].split()[1])
            available = int([l for l in meminfo.split('\n') if 'MemAvailable' in l][0].split()[1])
            used_pct = round(((total - available) / total) * 100, 1)
            if used_pct >= threshold:
                send_alert_via_backend("memory_warning", {"used_pct": used_pct})
        except Exception:
            pass


# ─── Maintenance Mode ────────────────────────────────────────────

def activate_maintenance():
    """Active la page de maintenance NGINX."""
    log.info(">>> Activation de la page de maintenance")
    try:
        # Creer le flag
        Path(MAINTENANCE_FLAG).touch()

        # Verifier que la page maintenance existe
        if not os.path.exists(MAINTENANCE_HTML):
            log.warning(f"Page maintenance introuvable: {MAINTENANCE_HTML}")

        # Generer une config NGINX temporaire pour la maintenance
        _write_maintenance_nginx_conf()

        # Recharger NGINX
        _reload_nginx()
        log.info("Page de maintenance activee")
        return True
    except Exception as e:
        log.error(f"Erreur activation maintenance: {e}")
        return False


def deactivate_maintenance():
    """Desactive la page de maintenance et restaure NGINX."""
    log.info("<<< Desactivation de la page de maintenance")
    try:
        # Supprimer le flag
        if os.path.exists(MAINTENANCE_FLAG):
            os.remove(MAINTENANCE_FLAG)

        # Restaurer la config NGINX normale
        _restore_normal_nginx_conf()

        # Recharger NGINX
        _reload_nginx()
        log.info("Page de maintenance desactivee")
        return True
    except Exception as e:
        log.error(f"Erreur desactivation maintenance: {e}")
        return False


def _write_maintenance_nginx_conf():
    """Ecrit la configuration NGINX pour le mode maintenance."""
    nginx_conf_path = _find_nginx_site_conf()
    if not nginx_conf_path:
        log.warning("Config NGINX non trouvee, tentative avec config par defaut")
        return

    # Resoudre le symlink pour trouver le vrai fichier
    real_conf = os.path.realpath(nginx_conf_path)

    # Sauvegarder la config actuelle si pas deja fait
    backup_path = real_conf + ".backup_pre_maintenance"
    if not os.path.exists(backup_path):
        try:
            import shutil
            shutil.copy2(real_conf, backup_path)
            log.info(f"Config NGINX sauvegardee: {backup_path}")
        except Exception as e:
            log.error(f"Impossible de sauvegarder la config NGINX: {e}")

    maintenance_conf = f"""# FSAO Iris - MODE MAINTENANCE (genere automatiquement)
# Ne pas modifier - sera restaure automatiquement apres la maintenance
server {{
    listen 80;
    server_name _;

    location /logo-iris.png {{
        alias {APP_ROOT}/frontend/public/logo-iris.png;
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
        root {APP_ROOT};
        try_files /maintenance.html =503;
    }}

    error_page 503 @maintenance;
    location @maintenance {{
        root {APP_ROOT};
        rewrite ^(.*)$ /maintenance.html break;
    }}
}}
"""
    try:
        with open(real_conf, "w") as f:
            f.write(maintenance_conf)
        log.info(f"Config NGINX maintenance ecrite: {real_conf}")
    except Exception as e:
        log.error(f"Impossible d'ecrire la config NGINX maintenance: {e}")


def _restore_normal_nginx_conf():
    """Restaure la configuration NGINX normale."""
    nginx_conf_path = _find_nginx_site_conf()
    if not nginx_conf_path:
        return

    real_conf = os.path.realpath(nginx_conf_path)

    # Chercher le backup dans tous les emplacements possibles
    backup_candidates = [
        real_conf + ".backup_pre_maintenance",
        nginx_conf_path + ".backup_pre_maintenance",
    ]
    # Chercher aussi dans sites-enabled et sites-available
    for d in ["/etc/nginx/sites-enabled", "/etc/nginx/sites-available", "/etc/nginx/conf.d"]:
        if os.path.isdir(d):
            for f in os.listdir(d):
                if f.endswith(".backup_pre_maintenance"):
                    backup_candidates.append(os.path.join(d, f))

    backup_path = None
    for bp in backup_candidates:
        if os.path.exists(bp):
            backup_path = bp
            break

    if backup_path:
        try:
            import shutil
            shutil.copy2(backup_path, real_conf)
            log.info(f"Config NGINX restauree: {backup_path} -> {real_conf}")
        except Exception as e:
            log.error(f"Impossible de restaurer la config NGINX: {e}")
    else:
        log.warning("Pas de backup NGINX trouve, config non restauree")


def _find_nginx_site_conf():
    """Trouve le fichier de configuration NGINX du site."""
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


def _reload_nginx():
    """Recharge la configuration NGINX."""
    # Tester la config d'abord
    test = subprocess.run(["nginx", "-t"], capture_output=True, text=True, timeout=10)
    if test.returncode != 0:
        log.error(f"Config NGINX invalide: {test.stderr}")
        return False

    for cmd in [
        ["nginx", "-s", "reload"],
        ["systemctl", "reload", "nginx"],
        ["service", "nginx", "reload"],
    ]:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                log.info(f"NGINX recharge avec: {' '.join(cmd)}")
                return True
        except Exception:
            continue
    log.error("Impossible de recharger NGINX")
    return False


# ─── Recovery Levels ──────────────────────────────────────────────

def run_cmd(cmd, cwd=None, timeout=300, env=None):
    """Execute une commande et retourne (success, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True,
            timeout=timeout, env=env
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", f"Timeout apres {timeout}s"
    except Exception as e:
        return False, "", str(e)


def recovery_level_1_soft():
    """
    Niveau 1 - SOFT : Redemarrage des services
    Le plus rapide, suffit dans 90% des cas.
    """
    log.info("=" * 50)
    log.info("NIVEAU 1 - SOFT : Redemarrage des services")
    log.info("=" * 50)

    steps = [
        (["supervisorctl", "restart", "all"], "Restart supervisorctl"),
        (["systemctl", "restart", "nginx"], "Restart NGINX"),
    ]

    for cmd, desc in steps:
        ok, stdout, stderr = run_cmd(cmd, timeout=30)
        log.info(f"  {desc}: {'OK' if ok else 'ECHEC'}")
        if stderr and not ok:
            log.warning(f"    {stderr[:200]}")

    # Attendre que les services demarrent
    time.sleep(8)

    # Verifier
    healthy, details = full_health_check()
    log.info(f"  Resultat: {'SAIN' if healthy else 'ENCORE EN PANNE'}")
    return healthy


def recovery_level_2_rollback():
    """
    Niveau 2 - ROLLBACK : Retour au commit Git precedent
    Utile quand une mise a jour a casse l'application.
    """
    log.info("=" * 50)
    log.info("NIVEAU 2 - ROLLBACK : Retour version precedente")
    log.info("=" * 50)

    git_dir = APP_ROOT

    # Verifier que c'est un depot Git
    if not os.path.exists(os.path.join(git_dir, ".git")):
        log.warning("Pas de depot Git, rollback impossible. Passage au niveau suivant.")
        return False

    # Sauvegarder les .env
    _backup_env_files()

    # Rollback au commit precedent
    ok, stdout, stderr = run_cmd(
        ["git", "checkout", "HEAD~1"],
        cwd=git_dir, timeout=30
    )
    if not ok:
        # Essayer reset --hard
        ok, stdout, stderr = run_cmd(
            ["git", "reset", "--hard", "HEAD~1"],
            cwd=git_dir, timeout=30
        )
    log.info(f"  Git rollback: {'OK' if ok else 'ECHEC'}")

    # Restaurer les .env
    _restore_env_files()

    if ok:
        # Rebuild frontend
        _rebuild_frontend()

        # Redemarrer les services
        run_cmd(["supervisorctl", "restart", "all"], timeout=30)
        time.sleep(8)
        run_cmd(["systemctl", "reload", "nginx"], timeout=10)

    time.sleep(5)
    healthy, details = full_health_check()
    log.info(f"  Resultat: {'SAIN' if healthy else 'ENCORE EN PANNE'}")
    return healthy


def recovery_level_3_medium():
    """
    Niveau 3 - MEDIUM : Reinstallation des dependances + rebuild
    """
    log.info("=" * 50)
    log.info("NIVEAU 3 - MEDIUM : Reinstallation dependances")
    log.info("=" * 50)

    # Backend dependencies
    venv_pip = _find_pip()
    req_file = os.path.join(APP_ROOT, "backend", "requirements.txt")

    if os.path.exists(req_file):
        log.info("  Installation dependances backend...")
        ok, stdout, stderr = run_cmd(
            [venv_pip, "install", "-r", req_file],
            timeout=300
        )
        log.info(f"  pip install: {'OK' if ok else 'ECHEC'}")

        # emergentintegrations
        run_cmd(
            [venv_pip, "install", "emergentintegrations",
             "--extra-index-url", "https://d33sy5i8bnduwe.cloudfront.net/simple/"],
            timeout=120
        )

    # Frontend rebuild
    _rebuild_frontend()

    # Redemarrer tout
    run_cmd(["supervisorctl", "restart", "all"], timeout=30)
    time.sleep(8)
    run_cmd(["systemctl", "reload", "nginx"], timeout=10)

    time.sleep(5)
    healthy, details = full_health_check()
    log.info(f"  Resultat: {'SAIN' if healthy else 'ENCORE EN PANNE'}")
    return healthy


def recovery_level_4_hard():
    """
    Niveau 4 - HARD : Reset Git complet depuis GitHub (nuclear option)
    Reinitialise completement le code depuis le depot distant.
    """
    log.info("=" * 50)
    log.info("NIVEAU 4 - HARD : Reset complet depuis GitHub")
    log.info("=" * 50)

    git_dir = APP_ROOT

    # Sauvegarder les .env
    _backup_env_files()

    # Sauvegarder les uploads
    uploads_dir = os.path.join(APP_ROOT, "backend", "uploads")
    uploads_backup = "/tmp/gmao_uploads_backup"
    if os.path.exists(uploads_dir):
        log.info("  Sauvegarde des fichiers uploades...")
        run_cmd(["cp", "-r", uploads_dir, uploads_backup], timeout=60)

    # Reset Git complet
    git_path = os.path.join(git_dir, ".git")
    if os.path.exists(git_path):
        import shutil
        shutil.rmtree(git_path)
        log.info("  Suppression .git: OK")

    ok, _, _ = run_cmd(["git", "init"], cwd=git_dir, timeout=10)
    log.info(f"  git init: {'OK' if ok else 'ECHEC'}")

    github_url = f"https://github.com/{GITHUB_USER}/{GITHUB_REPO}.git"
    ok, _, _ = run_cmd(
        ["git", "remote", "add", "origin", github_url],
        cwd=git_dir, timeout=10
    )
    log.info(f"  git remote add: {'OK' if ok else 'ECHEC'}")

    ok, _, stderr = run_cmd(
        ["git", "fetch", "--depth=1", "origin", GITHUB_BRANCH],
        cwd=git_dir, timeout=300
    )
    log.info(f"  git fetch: {'OK' if ok else 'ECHEC'}")
    if not ok:
        log.error(f"  Erreur fetch: {stderr[:300]}")
        _restore_env_files()
        return False

    ok, _, _ = run_cmd(
        ["git", "reset", "--hard", f"origin/{GITHUB_BRANCH}"],
        cwd=git_dir, timeout=30
    )
    log.info(f"  git reset --hard: {'OK' if ok else 'ECHEC'}")

    # Restaurer les .env
    _restore_env_files()

    # Restaurer les uploads
    if os.path.exists(uploads_backup):
        log.info("  Restauration des fichiers uploades...")
        restored_uploads = os.path.join(APP_ROOT, "backend", "uploads")
        if not os.path.exists(restored_uploads):
            os.makedirs(restored_uploads, exist_ok=True)
        run_cmd(["cp", "-r", uploads_backup + "/.", restored_uploads], timeout=60)
        run_cmd(["rm", "-rf", uploads_backup], timeout=30)

    # Reinstaller tout
    venv_pip = _find_pip()
    req_file = os.path.join(APP_ROOT, "backend", "requirements.txt")
    if os.path.exists(req_file):
        run_cmd([venv_pip, "install", "-r", req_file], timeout=300)
        run_cmd(
            [venv_pip, "install", "emergentintegrations",
             "--extra-index-url", "https://d33sy5i8bnduwe.cloudfront.net/simple/"],
            timeout=120
        )

    # Frontend rebuild
    _rebuild_frontend()

    # Redemarrer tout
    run_cmd(["supervisorctl", "restart", "all"], timeout=30)
    time.sleep(10)
    run_cmd(["systemctl", "reload", "nginx"], timeout=10)

    time.sleep(5)
    healthy, details = full_health_check()
    log.info(f"  Resultat: {'SAIN' if healthy else 'ENCORE EN PANNE'}")
    return healthy


# ─── Helpers ──────────────────────────────────────────────────────

def _backup_env_files():
    """Sauvegarde les fichiers .env dans /tmp."""
    for src, dst in [
        (os.path.join(APP_ROOT, "backend", ".env"), "/tmp/gmao_backend.env"),
        (os.path.join(APP_ROOT, "frontend", ".env"), "/tmp/gmao_frontend.env"),
    ]:
        if os.path.exists(src):
            try:
                import shutil
                shutil.copy2(src, dst)
                log.info(f"  Sauvegarde {src} -> {dst}")
            except Exception as e:
                log.error(f"  Erreur sauvegarde {src}: {e}")


def _restore_env_files():
    """Restaure les fichiers .env depuis /tmp."""
    for src, dst in [
        ("/tmp/gmao_backend.env", os.path.join(APP_ROOT, "backend", ".env")),
        ("/tmp/gmao_frontend.env", os.path.join(APP_ROOT, "frontend", ".env")),
    ]:
        if os.path.exists(src):
            try:
                import shutil
                shutil.copy2(src, dst)
                log.info(f"  Restauration {src} -> {dst}")
            except Exception as e:
                log.error(f"  Erreur restauration {dst}: {e}")


def _find_pip():
    """Trouve le chemin vers pip dans le venv."""
    candidates = [
        os.path.join(APP_ROOT, "venv", "bin", "pip"),
        os.path.join(APP_ROOT, "backend", "venv", "bin", "pip"),
        "pip3",
    ]
    for pip_path in candidates:
        if os.path.exists(pip_path) or pip_path == "pip3":
            return pip_path
    return "pip3"


def _rebuild_frontend():
    """Reconstruit le frontend (yarn install + yarn build)."""
    frontend_dir = os.path.join(APP_ROOT, "frontend")
    if not os.path.exists(os.path.join(frontend_dir, "package.json")):
        log.warning("  package.json non trouve, skip rebuild frontend")
        return

    env = os.environ.copy()
    env["CI"] = "false"
    env["NODE_OPTIONS"] = "--max_old_space_size=2048"

    # Charger les variables du frontend/.env
    env_file = os.path.join(frontend_dir, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        env[key.strip()] = value.strip()
        except Exception:
            pass

    log.info("  yarn install...")
    ok, _, stderr = run_cmd(
        ["yarn", "install", "--production=false"],
        cwd=frontend_dir, env=env, timeout=300
    )
    log.info(f"  yarn install: {'OK' if ok else 'ECHEC'}")

    log.info("  yarn build...")
    ok, _, stderr = run_cmd(
        ["yarn", "build"],
        cwd=frontend_dir, env=env, timeout=600
    )
    log.info(f"  yarn build: {'OK' if ok else 'ECHEC'}")
    if not ok:
        log.error(f"  Erreur build: {stderr[:300]}")


# ─── Main Logic ───────────────────────────────────────────────────

def run_health_check_and_recovery():
    """Point d'entree principal : health check + recovery automatique."""
    state = load_state()
    now = datetime.now().isoformat()
    state["last_check"] = now

    log.info("-" * 60)
    log.info(f"Health check demarre ({now})")

    # Health check
    healthy, details = full_health_check()
    for d in details:
        log.info(f"  {d}")

    if healthy:
        # Tout va bien
        if state["consecutive_failures"] > 0:
            log.info(f"Application retablie apres {state['consecutive_failures']} echec(s)")
        state["consecutive_failures"] = 0
        state["last_success"] = now
        state["last_recovery_level"] = 0

        # Desactiver la maintenance si elle est active
        if state.get("maintenance_active") or os.path.exists(MAINTENANCE_FLAG):
            deactivate_maintenance()
            state["maintenance_active"] = False

        save_state(state)
        log.info("Resultat: SAIN")
        return True

    # L'application est en panne
    state["consecutive_failures"] += 1
    state["last_failure"] = now
    failures = state["consecutive_failures"]
    log.warning(f"APPLICATION EN PANNE (echec consecutif #{failures})")

    # Envoyer alerte email "app_down"
    send_alert_via_backend("app_down", {"failures": failures, "details": details})

    # Activer la page de maintenance si pas deja fait
    if not state.get("maintenance_active"):
        if activate_maintenance():
            state["maintenance_active"] = True
        save_state(state)

    # Determiner le niveau de recovery
    if failures == 1:
        level = 1
    elif failures == 2:
        level = 2
    elif failures == 3:
        level = 3
    elif failures >= 4:
        level = 4
    else:
        level = 1

    log.info(f"Lancement recovery niveau {level}")
    state["last_recovery_level"] = level

    # Executer le niveau de recovery
    recovery_functions = {
        1: recovery_level_1_soft,
        2: recovery_level_2_rollback,
        3: recovery_level_3_medium,
        4: recovery_level_4_hard,
    }

    recovered = recovery_functions[level]()
    state["total_recoveries"] += 1

    if recovered:
        log.info(f"RECUPERATION REUSSIE (niveau {level})")
        state["consecutive_failures"] = 0
        state["last_success"] = datetime.now().isoformat()
        # Desactiver maintenance
        deactivate_maintenance()
        state["maintenance_active"] = False
        append_recovery_event(level, True, f"Recuperation reussie apres {failures} echec(s)")
        send_alert_via_backend("recovery_success", {"level": level, "failures": failures})
    else:
        log.error(f"ECHEC recovery niveau {level}")
        append_recovery_event(level, False, f"Echec recovery niveau {level}")
        send_alert_via_backend("recovery_failed", {"level": level, "failures": failures})
        if failures >= MAX_CONSECUTIVE_FAILURES:
            log.critical(
                f"ALERTE: {MAX_CONSECUTIVE_FAILURES} echecs consecutifs. "
                "Intervention manuelle requise."
            )

    save_state(state)
    return recovered


def show_status():
    """Affiche le statut actuel du health check."""
    state = load_state()
    healthy, details = full_health_check()

    print("\n" + "=" * 50)
    print("  FSAO Iris - Health Status")
    print("=" * 50)
    print(f"  Etat:              {'SAIN' if healthy else 'EN PANNE'}")
    print(f"  Echecs consecutifs: {state['consecutive_failures']}")
    print(f"  Dernier check:      {state.get('last_check', 'jamais')}")
    print(f"  Dernier succes:     {state.get('last_success', 'jamais')}")
    print(f"  Dernier echec:      {state.get('last_failure', 'jamais')}")
    print(f"  Dernier recovery:   niveau {state.get('last_recovery_level', 0)}")
    print(f"  Total recoveries:   {state.get('total_recoveries', 0)}")
    print(f"  Maintenance active: {'OUI' if state.get('maintenance_active') else 'NON'}")
    print()
    for d in details:
        print(f"  {d}")
    print("=" * 50 + "\n")


def reset_state():
    """Reset le compteur d'echecs."""
    state = load_state()
    state["consecutive_failures"] = 0
    state["last_recovery_level"] = 0
    save_state(state)
    print("Compteur d'echecs remis a zero.")


# ─── CLI ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--status" in args:
        show_status()
    elif "--reset" in args:
        reset_state()
    elif "--maintenance" in args:
        idx = args.index("--maintenance")
        if idx + 1 < len(args):
            mode = args[idx + 1].lower()
            if mode == "on":
                activate_maintenance()
                state = load_state()
                state["maintenance_active"] = True
                save_state(state)
                print("Page de maintenance ACTIVEE")
            elif mode == "off":
                deactivate_maintenance()
                state = load_state()
                state["maintenance_active"] = False
                save_state(state)
                print("Page de maintenance DESACTIVEE")
            else:
                print("Usage: --maintenance on|off")
        else:
            print("Usage: --maintenance on|off")
    else:
        run_health_check_and_recovery()
