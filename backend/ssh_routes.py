"""
SSH Terminal - WebSocket + PTY
Utilise le binaire SSH du système pour une compatibilité maximale.
Fonctionne exactement comme PuTTY.
"""
import asyncio
import os
import pty
import select
import struct
import fcntl
import termios
import signal
import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel
from dependencies import get_current_user
from server import db

router = APIRouter(prefix="/ssh", tags=["SSH Terminal"])
logger = logging.getLogger(__name__)


class SSHConnectRequest(BaseModel):
    host: str = "localhost"
    port: int = 22
    username: str = "root"
    password: str = ""


@router.post("/connect")
async def ssh_connect_check(
    request: SSHConnectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Vérifier que la connexion SSH est possible."""
    user_role = current_user.get("role", "").upper()
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return {"status": "ok", "message": "Prêt à connecter"}


async def _verify_token_admin(token_str):
    """Vérifie le token JWT et retourne True si admin."""
    from auth import SECRET_KEY, ALGORITHM
    from jose import jwt as jose_jwt
    from bson import ObjectId
    payload = jose_jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("sub")
    if not user_id:
        return False
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
    if not user:
        return False
    return user.get("role", "").upper() == "ADMIN"


@router.websocket("/ws")
async def ssh_websocket(websocket: WebSocket):
    """
    WebSocket pour terminal SSH interactif via PTY + binaire ssh système.
    """
    await websocket.accept()
    child_pid = None
    master_fd = None

    try:
        # 1. Authentification applicative
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
        if auth_data.get("type") != "auth":
            await websocket.send_json({"type": "error", "data": "Message d'authentification attendu"})
            return

        token = auth_data.get("token", "")
        try:
            is_admin = await _verify_token_admin(token)
            if not is_admin:
                await websocket.send_json({"type": "error", "data": "Accès réservé aux administrateurs"})
                return
        except Exception as e:
            await websocket.send_json({"type": "error", "data": f"Token invalide: {str(e)}"})
            return

        host = auth_data.get("host", "localhost")
        port = int(auth_data.get("port", 22))
        username = auth_data.get("username", "root")
        password = auth_data.get("password", "")

        # 2. Créer un PTY et lancer le processus SSH système
        (child_pid, master_fd) = pty.fork()

        if child_pid == 0:
            # === Processus enfant ===
            env = os.environ.copy()
            env["TERM"] = "xterm-256color"
            env["LANG"] = "en_US.UTF-8"

            if host in ("localhost", "127.0.0.1", "::1"):
                # Connexion locale: utiliser /bin/login directement
                os.execvpe("/bin/login", [
                    "login", "-f", username
                ], env)
            else:
                # Connexion distante: utiliser ssh
                os.execvpe("/usr/bin/ssh", [
                    "ssh",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    "-p", str(port),
                    f"{username}@{host}"
                ], env)
            os._exit(1)

        # === Processus parent ===
        logger.info(f"SSH PTY started: pid={child_pid}, fd={master_fd}, target={username}@{host}:{port}")

        # Taille initiale du terminal
        winsize = struct.pack("HHHH", 40, 120, 0, 0)
        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)

        await websocket.send_json({"type": "connected", "data": f"Connecté à {username}@{host}:{port}"})

        # Pour les connexions distantes, il faudra envoyer le mot de passe
        # quand ssh le demande. Pour localhost avec login -f, pas besoin.
        if host not in ("localhost", "127.0.0.1", "::1"):
            # Attendre le prompt de mot de passe SSH
            password_sent = False
            for _ in range(50):  # max 5 secondes
                await asyncio.sleep(0.1)
                try:
                    r, _, _ = select.select([master_fd], [], [], 0)
                    if r:
                        data = os.read(master_fd, 4096)
                        if data:
                            text = data.decode("utf-8", errors="replace").lower()
                            await websocket.send_bytes(data)
                            if "password" in text and not password_sent:
                                os.write(master_fd, (password + "\n").encode("utf-8"))
                                password_sent = True
                                break
                except Exception:
                    break

        # 3. Boucle bidirectionnelle PTY <-> WebSocket
        async def read_pty():
            """Lire la sortie du PTY et l'envoyer au WebSocket."""
            while True:
                try:
                    await asyncio.sleep(0.01)
                    r, _, _ = select.select([master_fd], [], [], 0.02)
                    if r:
                        data = os.read(master_fd, 4096)
                        if data:
                            await websocket.send_bytes(data)
                        else:
                            break
                except (OSError, IOError):
                    break
                except Exception:
                    break

        async def write_pty():
            """Lire le WebSocket et écrire dans le PTY."""
            while True:
                try:
                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        break

                    if "bytes" in message:
                        os.write(master_fd, message["bytes"])
                    elif "text" in message:
                        text = message["text"]
                        # Vérifier si c'est un message de resize
                        try:
                            msg = json.loads(text)
                            if msg.get("type") == "resize":
                                cols = msg.get("cols", 120)
                                rows = msg.get("rows", 40)
                                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                                # Envoyer SIGWINCH au processus enfant
                                os.kill(child_pid, signal.SIGWINCH)
                                continue
                        except (json.JSONDecodeError, ValueError):
                            pass
                        os.write(master_fd, text.encode("utf-8"))
                except WebSocketDisconnect:
                    break
                except Exception:
                    break

        read_task = asyncio.create_task(read_pty())
        write_task = asyncio.create_task(write_pty())

        done, pending = await asyncio.wait(
            [read_task, write_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.info("SSH WebSocket déconnecté par le client")
    except asyncio.TimeoutError:
        logger.warning("SSH WebSocket timeout d'authentification")
    except Exception as e:
        logger.error(f"SSH WebSocket erreur: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except:
            pass
    finally:
        if master_fd is not None:
            try:
                os.close(master_fd)
            except:
                pass
        if child_pid and child_pid > 0:
            try:
                os.kill(child_pid, signal.SIGTERM)
                os.waitpid(child_pid, os.WNOHANG)
            except:
                pass
        try:
            await websocket.close()
        except:
            pass
