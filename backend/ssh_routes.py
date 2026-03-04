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
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=request.host,
            port=request.port,
            username=request.username,
            password=request.password,
            timeout=10,
            allow_agent=False,
            look_for_keys=False
        )
        client.close()
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

        # 2. Vérifier le token JWT
        from jose import jwt as jose_jwt
        import os
        token = auth_data.get("token", "")
        try:
            secret = os.environ.get("JWT_SECRET", os.environ.get("SECRET_KEY", ""))
            payload = jose_jwt.decode(token, secret, algorithms=["HS256"])
            user_role = payload.get("role", "").upper()
            if user_role != "ADMIN":
                await websocket.send_json({"type": "error", "data": "Accès réservé aux administrateurs"})
                await websocket.close()
                return
        except Exception:
            await websocket.send_json({"type": "error", "data": "Token invalide ou expiré"})
            await websocket.close()
            return

        # 3. Connexion SSH
        host = auth_data.get("host", "localhost")
        port = auth_data.get("port", 22)
        username = auth_data.get("username", "root")
        password = auth_data.get("password", "")

        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            ssh_client.connect(
                hostname=host, port=port,
                username=username, password=password,
                timeout=10, allow_agent=False, look_for_keys=False
            )
        except paramiko.AuthenticationException:
            await websocket.send_json({"type": "error", "data": "Authentification SSH échouée"})
            await websocket.close()
            return
        except Exception as e:
            await websocket.send_json({"type": "error", "data": f"Connexion SSH impossible: {str(e)}"})
            await websocket.close()
            return

        # 4. Ouvrir un canal avec PTY
        channel = ssh_client.invoke_shell(term="xterm-256color", width=120, height=40)
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
        if ssh_client:
            try:
                ssh_client.close()
            except Exception:
                pass
        try:
            await websocket.close()
        except Exception:
            pass
