"""
SSH Terminal - WebSocket + Paramiko
Fournit une vraie connexion SSH interactive via WebSocket,
compatible avec xterm.js côté frontend (comme PuTTY).
"""
import asyncio
import logging
import threading
import paramiko
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
    """Vérifier que la connexion SSH est possible (test avant WebSocket)."""
    user_role = current_user.get("role", "").upper()
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")

    try:
        transport = paramiko.Transport((request.host, request.port))
        transport.connect()

        auth_success = False
        try:
            transport.auth_password(request.username, request.password)
            auth_success = True
        except paramiko.AuthenticationException:
            pass

        if not auth_success:
            try:
                def kbd_handler(title, instructions, prompt_list):
                    return [request.password] * len(prompt_list)
                transport.auth_interactive(request.username, kbd_handler)
                auth_success = True
            except paramiko.AuthenticationException:
                pass

        transport.close()

        if not auth_success:
            raise HTTPException(status_code=401, detail="Authentification échouée. Vérifiez l'identifiant et le mot de passe.")

        return {"status": "ok", "message": f"Connexion SSH réussie vers {request.username}@{request.host}:{request.port}"}
    except paramiko.AuthenticationException:
        raise HTTPException(status_code=401, detail="Authentification échouée. Vérifiez l'identifiant et le mot de passe.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connexion impossible: {str(e)}")


@router.websocket("/ws")
async def ssh_websocket(websocket: WebSocket):
    """
    WebSocket pour terminal SSH interactif.
    Le client envoie d'abord un message JSON d'authentification:
    { "type": "auth", "token": "...", "host": "localhost", "port": 22, "username": "root", "password": "..." }
    Puis envoie les données clavier brutes, et reçoit la sortie du terminal.
    """
    await websocket.accept()
    ssh_client = None
    channel = None

    try:
        # 1. Attendre le message d'authentification
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=30)

        if auth_data.get("type") != "auth":
            await websocket.send_json({"type": "error", "data": "Message d'authentification attendu"})
            await websocket.close()
            return

        # 2. Vérifier le token JWT et le rôle admin
        from auth import SECRET_KEY, ALGORITHM
        from jose import jwt as jose_jwt
        from bson import ObjectId
        token = auth_data.get("token", "")
        try:
            payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError("sub manquant")
            # Récupérer le rôle depuis la base de données
            user = await db.users.find_one({"_id": ObjectId(user_id)}, {"role": 1})
            if not user:
                raise ValueError("Utilisateur introuvable")
            user_role = user.get("role", "").upper()
            if user_role != "ADMIN":
                await websocket.send_json({"type": "error", "data": "Accès réservé aux administrateurs"})
                await websocket.close()
                return
        except Exception as e:
            await websocket.send_json({"type": "error", "data": f"Token invalide ou expiré: {str(e)}"})
            await websocket.close()
            return

        # 3. Connexion SSH avec diagnostic détaillé
        host = auth_data.get("host", "localhost")
        port = auth_data.get("port", 22)
        username = auth_data.get("username", "root")
        password = auth_data.get("password", "")

        try:
            transport = paramiko.Transport((host, port))
            transport.connect()

            # Déterminer les méthodes d'auth autorisées par le serveur
            allowed_methods = []
            try:
                transport.auth_none(username)
            except paramiko.BadAuthenticationType as e:
                allowed_methods = list(e.allowed_types)
            except paramiko.AuthenticationException:
                pass

            logger.info(f"SSH auth methods for {username}@{host}: {allowed_methods}")

            auth_success = False
            auth_errors = []

            # Méthode 1: password
            if not auth_success:
                try:
                    transport.auth_password(username, password)
                    auth_success = True
                    logger.info("SSH auth via password: OK")
                except paramiko.AuthenticationException as e:
                    auth_errors.append(f"password: {e}")

            # Méthode 2: keyboard-interactive
            if not auth_success:
                try:
                    def kbd_handler(title, instructions, prompt_list):
                        return [password] * len(prompt_list)
                    transport.auth_interactive(username, kbd_handler)
                    auth_success = True
                    logger.info("SSH auth via keyboard-interactive: OK")
                except paramiko.AuthenticationException as e:
                    auth_errors.append(f"keyboard-interactive: {e}")

            if not auth_success:
                transport.close()
                # Message d'erreur détaillé pour aider l'utilisateur
                msg = "Authentification SSH échouée."
                if allowed_methods:
                    msg += f" Méthodes autorisées par le serveur: {', '.join(allowed_methods)}."
                if 'publickey' in allowed_methods and 'password' not in allowed_methods and 'keyboard-interactive' not in allowed_methods:
                    msg += " Le serveur n'accepte QUE les clés SSH (pas de mot de passe). Modifiez /etc/ssh/sshd_config: PermitRootLogin yes, puis: systemctl restart sshd"
                elif allowed_methods:
                    msg += " Vérifiez l'identifiant et le mot de passe."
                else:
                    msg += " Impossible de déterminer les méthodes d'authentification."
                logger.warning(f"SSH auth failed for {username}@{host}. Methods: {allowed_methods}. Errors: {auth_errors}")
                await websocket.send_json({"type": "error", "data": msg})
                await websocket.close()
                return

        except paramiko.AuthenticationException as e:
            await websocket.send_json({"type": "error", "data": f"Authentification SSH échouée: {str(e)}"})
            await websocket.close()
            return
        except Exception as e:
            await websocket.send_json({"type": "error", "data": f"Connexion SSH impossible: {str(e)}"})
            await websocket.close()
            return

        # 4. Ouvrir un canal avec PTY via le transport
        channel = transport.open_session()
        channel.get_pty(term="xterm-256color", width=120, height=40)
        channel.invoke_shell()
        channel.settimeout(0.1)

        await websocket.send_json({"type": "connected", "data": f"Connecté à {username}@{host}:{port}"})

        # 5. Boucle bidirectionnelle
        loop = asyncio.get_event_loop()

        async def read_ssh():
            """Lire la sortie SSH et l'envoyer au WebSocket."""
            while True:
                try:
                    if channel.recv_ready():
                        data = channel.recv(4096)
                        if data:
                            await websocket.send_bytes(data)
                        else:
                            break
                    elif channel.closed:
                        break
                    else:
                        await asyncio.sleep(0.02)
                except Exception:
                    break

        async def write_ssh():
            """Lire le WebSocket et envoyer au canal SSH."""
            while True:
                try:
                    message = await websocket.receive()
                    if message.get("type") == "websocket.disconnect":
                        break
                    if "bytes" in message:
                        channel.send(message["bytes"])
                    elif "text" in message:
                        text = message["text"]
                        # Check for resize messages
                        try:
                            import json
                            msg = json.loads(text)
                            if msg.get("type") == "resize":
                                channel.resize_pty(
                                    width=msg.get("cols", 120),
                                    height=msg.get("rows", 40)
                                )
                                continue
                        except (json.JSONDecodeError, ValueError):
                            pass
                        channel.send(text.encode("utf-8"))
                except WebSocketDisconnect:
                    break
                except Exception:
                    break

        # Exécuter les deux tâches en parallèle
        read_task = asyncio.create_task(read_ssh())
        write_task = asyncio.create_task(write_ssh())

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
        logger.error(f"SSH WebSocket erreur: {e}")
    finally:
        if channel:
            try:
                channel.close()
            except Exception:
                pass
        try:
            if 'transport' in dir() and transport:
                transport.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
