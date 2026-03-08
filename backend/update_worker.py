#!/usr/bin/env python3
"""
Script de mise a jour FSAO Iris - Processus INDEPENDANT
Ce script s'execute HORS du serveur FastAPI pour ne pas etre affecte
par les rechargements de code (hot reload / git reset).
Chaque etape est sauvegardee dans MongoDB en temps reel.
"""
import os
import sys
import asyncio
import subprocess
import shutil
import uuid
import json
import glob
from datetime import datetime, timezone
from pathlib import Path

# Parametres passes en arguments
if len(sys.argv) < 6:
    print("Usage: update_worker.py <version> <app_root> <github_user> <github_repo> <github_branch> [mongo_url] [db_name]")
    sys.exit(1)

VERSION = sys.argv[1]
APP_ROOT = sys.argv[2]
GITHUB_USER = sys.argv[3]
GITHUB_REPO = sys.argv[4]
GITHUB_BRANCH = sys.argv[5]
MONGO_URL = sys.argv[6] if len(sys.argv) > 6 else os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = sys.argv[7] if len(sys.argv) > 7 else os.environ.get('DB_NAME', 'gmao_iris')

UPDATE_ID = str(uuid.uuid4())
GITHUB_URL = f"https://github.com/{GITHUB_USER}/{GITHUB_REPO}.git"

full_log = ""
errors = []


def log(msg):
    global full_log
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    full_log += line + "\n"
    print(line, flush=True)


async def save_to_mongo(step, status="in_progress", success=False):
    """Sauvegarde le log dans MongoDB via pymongo (synchrone, pas besoin de motor)."""
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URL)
        db_conn = client[DB_NAME]
        db_conn.system_settings.update_one(
            {"key": "last_update_result"},
            {"$set": {
                "key": "last_update_result",
                "in_progress": status == "in_progress",
                "success": success,
                "code_updated": success,
                "history_id": UPDATE_ID,
                "current_step": step,
                "log_output": full_log[-10000:],
                "errors": errors,
                "status": status,
                "version_after": VERSION,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        client.close()
    except Exception as e:
        print(f"ERREUR MongoDB: {e}", flush=True)


async def run_step(step_name, cmd, cwd=None, timeout=300, critical=True):
    """Execute une commande et sauvegarde le resultat."""
    global errors
    log(f"\n--- {step_name} ---")
    log(f"$ {' '.join(cmd)}")

    env = os.environ.copy()
    env["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    home = env.get("HOME", "/root")
    for extra_pattern in [f"{home}/.yarn/bin", "/usr/share/yarn/bin",
                          f"{home}/.nvm/versions/node/*/bin",
                          "/usr/local/lib/nodejs/*/bin"]:
        for p in glob.glob(extra_pattern):
            env["PATH"] = p + ":" + env["PATH"]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd or APP_ROOT,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        stdout = stdout_b.decode(errors='replace')
        stderr = stderr_b.decode(errors='replace')

        if proc.returncode == 0:
            log(f"OK (code 0)")
            if stdout.strip():
                log(stdout[-500:])
        else:
            msg = f"ERREUR (code {proc.returncode}): {stderr[-500:]}"
            log(msg)
            if critical:
                errors.append(f"{step_name}: code {proc.returncode}")

        await save_to_mongo(step_name)
        return proc.returncode == 0

    except asyncio.TimeoutError:
        msg = f"TIMEOUT apres {timeout}s"
        log(msg)
        if critical:
            errors.append(f"{step_name}: {msg}")
        await save_to_mongo(step_name)
        return False
    except FileNotFoundError as e:
        msg = f"Commande introuvable: {e}"
        log(msg)
        if critical:
            errors.append(f"{step_name}: {msg}")
        await save_to_mongo(step_name)
        return False
    except Exception as e:
        msg = f"Exception: {e}"
        log(msg)
        if critical:
            errors.append(f"{step_name}: {msg}")
        await save_to_mongo(step_name)
        return False


async def main():
    global errors

    log("=" * 60)
    log(f"MISE A JOUR FSAO IRIS (worker independant)")
    log(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"Version cible: {VERSION}")
    log(f"APP_ROOT: {APP_ROOT}")
    log(f"GitHub: {GITHUB_URL}")
    log(f"Update ID: {UPDATE_ID}")
    log(f"PID: {os.getpid()}")
    log("=" * 60)

    # Diagnostic
    log("\n=== DIAGNOSTIC ===")
    for tool in ["git", "yarn", "node", "pip", "python3"]:
        try:
            r = subprocess.run(["which", tool], capture_output=True, text=True, timeout=5,
                               env={"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"})
            log(f"  {tool}: {r.stdout.strip() if r.returncode == 0 else 'NON TROUVE'}")
        except Exception:
            log(f"  {tool}: erreur")
    try:
        r = subprocess.run(["whoami"], capture_output=True, text=True, timeout=5)
        log(f"  utilisateur: {r.stdout.strip()}")
    except Exception:
        pass

    await save_to_mongo("Diagnostic")

    # ETAPE 1: Sauvegarde .env
    log("\n=== ETAPE 1/7: Sauvegarde .env ===")
    for f in ["backend/.env", "frontend/.env"]:
        src = os.path.join(APP_ROOT, f)
        dst = f"/tmp/{f.replace('/', '_')}"
        if os.path.exists(src):
            shutil.copy2(src, dst)
            log(f"  {src} -> {dst}")
    await save_to_mongo("1/7 Sauvegarde .env")

    # ETAPE 2: Suppression .git
    git_dir = os.path.join(APP_ROOT, ".git")
    if os.path.exists(git_dir):
        await run_step("2/7 Suppression .git", ["rm", "-rf", git_dir])
    else:
        log("\n--- 2/7 Pas de .git, OK ---")

    # ETAPE 3: git init + remote
    ok = await run_step("3/7 git init", ["git", "init"])
    if ok:
        await run_step("3/7 git remote add", ["git", "remote", "add", "origin", GITHUB_URL])

    # ETAPE 4: git fetch
    await run_step("4/7 git fetch", ["git", "fetch", "origin", GITHUB_BRANCH], timeout=120)

    # ETAPE 5: git reset --hard
    await run_step("5/7 git reset --hard", ["git", "reset", "--hard", f"origin/{GITHUB_BRANCH}"])

    # ETAPE 6: Restauration .env
    log("\n=== ETAPE 6/7: Restauration .env ===")
    for f in ["backend/.env", "frontend/.env"]:
        src = f"/tmp/{f.replace('/', '_')}"
        dst = os.path.join(APP_ROOT, f)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            log(f"  {src} -> {dst}")
    await save_to_mongo("6/7 Restauration .env")

    # ETAPE 7: Dependances
    # pip
    venv_pip = None
    for pip_path in [
        os.path.join(APP_ROOT, "venv", "bin", "pip"),
        os.path.join(APP_ROOT, "venv", "bin", "pip3"),
    ]:
        if os.path.exists(pip_path):
            venv_pip = pip_path
            break

    extra_index = "https://d33sy5i8bnduwe.cloudfront.net/simple/"
    if venv_pip:
        await run_step("7a/7 pip install", [venv_pip, "install", "-r", "backend/requirements.txt",
                       "--extra-index-url", extra_index],
                       timeout=300, critical=False)
    else:
        await run_step("7a/7 pip install (systeme)", ["pip", "install", "-r", "backend/requirements.txt",
                       "--extra-index-url", extra_index],
                       timeout=300, critical=False)

    # yarn
    frontend_dir = os.path.join(APP_ROOT, "frontend")
    if os.path.isdir(frontend_dir):
        await run_step("7b/7 yarn install", ["yarn", "install"], cwd=frontend_dir, timeout=300, critical=False)
        await run_step("7c/7 yarn build", ["yarn", "build"], cwd=frontend_dir, timeout=600, critical=False)

    # RESULTAT FINAL
    success = len(errors) == 0
    status = "success" if success else "failed"

    log(f"\n{'=' * 60}")
    if success:
        log(f"MISE A JOUR REUSSIE - {VERSION}")
    else:
        log(f"MISE A JOUR AVEC ERREURS:")
        for e in errors:
            log(f"  - {e}")
    log(f"{'=' * 60}")

    # Sauvegarder le resultat FINAL dans MongoDB
    completed_at = datetime.now(timezone.utc).isoformat()
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URL)
        db_conn = client[DB_NAME]
        db_conn.system_settings.update_one(
            {"key": "last_update_result"},
            {"$set": {
                "key": "last_update_result",
                "in_progress": False,
                "success": success,
                "code_updated": success,
                "history_id": UPDATE_ID,
                "current_step": "Termine",
                "log_output": full_log[-10000:],
                "errors": errors,
                "status": status,
                "completed_at": completed_at,
                "updated_at": completed_at
            }},
            upsert=True
        )
        # Historique
        db_conn.system_update_history.insert_one({
            "id": UPDATE_ID,
            "version_before": "",
            "version_after": VERSION,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": completed_at,
            "status": status,
            "success": success,
            "code_updated": success,
            "errors": errors,
            "logs": [{"step": "Log complet", "stdout": full_log, "status": status}],
            "triggered_by": "manual",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        client.close()
        log("Resultat sauvegarde dans MongoDB.")
    except Exception as e:
        log(f"ERREUR sauvegarde finale MongoDB: {e}")

    # Ecrire aussi sur disque en backup
    try:
        log_path = "/var/log/gmao-iris-update.log"
        with open(log_path, 'w') as f:
            f.write(full_log)
        log(f"Log ecrit: {log_path}")
    except Exception:
        pass

    # Reboot
    if success:
        log("Reboot dans 5 secondes...")
        await asyncio.sleep(5)
        os.system("reboot 2>/dev/null || sudo reboot 2>/dev/null || shutdown -r now 2>/dev/null")
    else:
        log("Pas de reboot (erreurs detectees).")


if __name__ == "__main__":
    asyncio.run(main())
