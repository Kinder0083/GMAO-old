"""
Routes pour la configuration du fuseau horaire et serveur NTP
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
import ntplib
import socket
from models import TimezoneConfig, TimezoneConfigUpdate, NTPTestResult
from dependencies import get_current_admin_user

router = APIRouter(prefix="/timezone", tags=["Timezone"])

# Base de données - initialisée depuis server.py
db = None

def init_timezone_routes(database):
    """Initialiser les routes timezone avec la base de données"""
    global db
    db = database

# Liste des fuseaux horaires populaires
POPULAR_TIMEZONES = [
    {"offset": -12, "name": "GMT-12", "cities": "Baker Island"},
    {"offset": -11, "name": "GMT-11", "cities": "Pago Pago, Midway"},
    {"offset": -10, "name": "GMT-10", "cities": "Honolulu, Tahiti"},
    {"offset": -9, "name": "GMT-9", "cities": "Anchorage"},
    {"offset": -8, "name": "GMT-8", "cities": "Los Angeles, Vancouver"},
    {"offset": -7, "name": "GMT-7", "cities": "Denver, Phoenix"},
    {"offset": -6, "name": "GMT-6", "cities": "Chicago, Mexico City"},
    {"offset": -5, "name": "GMT-5", "cities": "New York, Toronto"},
    {"offset": -4, "name": "GMT-4", "cities": "Santiago, Caracas"},
    {"offset": -3, "name": "GMT-3", "cities": "São Paulo, Buenos Aires"},
    {"offset": -2, "name": "GMT-2", "cities": "Fernando de Noronha"},
    {"offset": -1, "name": "GMT-1", "cities": "Açores, Cap-Vert"},
    {"offset": 0, "name": "GMT+0", "cities": "Londres, Lisbonne, Casablanca"},
    {"offset": 1, "name": "GMT+1", "cities": "Paris, Berlin, Madrid, Rome"},
    {"offset": 2, "name": "GMT+2", "cities": "Le Caire, Athènes, Johannesburg"},
    {"offset": 3, "name": "GMT+3", "cities": "Moscou, Istanbul, Riyad"},
    {"offset": 4, "name": "GMT+4", "cities": "Dubaï, Bakou"},
    {"offset": 5, "name": "GMT+5", "cities": "Karachi, Tachkent"},
    {"offset": 5.5, "name": "GMT+5:30", "cities": "New Delhi, Mumbai"},
    {"offset": 6, "name": "GMT+6", "cities": "Dacca, Almaty"},
    {"offset": 7, "name": "GMT+7", "cities": "Bangkok, Hanoï, Jakarta"},
    {"offset": 8, "name": "GMT+8", "cities": "Pékin, Singapour, Hong Kong"},
    {"offset": 9, "name": "GMT+9", "cities": "Tokyo, Séoul"},
    {"offset": 9.5, "name": "GMT+9:30", "cities": "Adélaïde, Darwin"},
    {"offset": 10, "name": "GMT+10", "cities": "Sydney, Melbourne"},
    {"offset": 11, "name": "GMT+11", "cities": "Nouméa, Îles Salomon"},
    {"offset": 12, "name": "GMT+12", "cities": "Auckland, Fidji"},
    {"offset": 13, "name": "GMT+13", "cities": "Tonga, Samoa"},
    {"offset": 14, "name": "GMT+14", "cities": "Îles de la Ligne"}
]

# Liste des serveurs NTP populaires
POPULAR_NTP_SERVERS = [
    {"server": "pool.ntp.org", "description": "Pool NTP mondial (recommandé)"},
    {"server": "europe.pool.ntp.org", "description": "Pool NTP Europe"},
    {"server": "fr.pool.ntp.org", "description": "Pool NTP France"},
    {"server": "time.google.com", "description": "Google Time"},
    {"server": "time.cloudflare.com", "description": "Cloudflare Time"},
    {"server": "time.windows.com", "description": "Microsoft Time"},
    {"server": "time.apple.com", "description": "Apple Time"},
    {"server": "ntp.ubuntu.com", "description": "Ubuntu NTP"},
    {"server": "0.fr.pool.ntp.org", "description": "Pool NTP France #0"},
    {"server": "1.fr.pool.ntp.org", "description": "Pool NTP France #1"}
]


@router.get("/config")
async def get_timezone_config(current_user: dict = Depends(get_current_admin_user)):
    """Récupérer la configuration du fuseau horaire"""
    settings = await db.system_settings.find_one({"_id": "default"})
    
    if not settings:
        # Valeurs par défaut (France)
        return TimezoneConfig(
            timezone_offset=1,
            timezone_name="Europe/Paris",
            ntp_server="pool.ntp.org"
        )
    
    return TimezoneConfig(
        timezone_offset=settings.get("timezone_offset", 1),
        timezone_name=settings.get("timezone_name", "Europe/Paris"),
        ntp_server=settings.get("ntp_server", "pool.ntp.org")
    )


@router.put("/config")
async def update_timezone_config(
    config: TimezoneConfigUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Mettre à jour la configuration du fuseau horaire"""
    update_data = {}
    
    if config.timezone_offset is not None:
        if config.timezone_offset < -12 or config.timezone_offset > 14:
            raise HTTPException(status_code=400, detail="Le décalage GMT doit être entre -12 et +14")
        update_data["timezone_offset"] = config.timezone_offset
    
    if config.timezone_name is not None:
        update_data["timezone_name"] = config.timezone_name
    
    if config.ntp_server is not None:
        update_data["ntp_server"] = config.ntp_server
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Vérifier si les settings existent déjà
    settings = await db.system_settings.find_one({"_id": "default"})
    
    if settings:
        await db.system_settings.update_one(
            {"_id": "default"},
            {"$set": update_data}
        )
    else:
        # Créer avec les valeurs par défaut + update
        default_settings = {
            "_id": "default",
            "inactivity_timeout_minutes": 15,
            "timezone_offset": 1,
            "timezone_name": "Europe/Paris",
            "ntp_server": "pool.ntp.org"
        }
        default_settings.update(update_data)
        await db.system_settings.insert_one(default_settings)
    
    # Récupérer les settings mis à jour
    updated_settings = await db.system_settings.find_one({"_id": "default"})
    
    return {
        "success": True,
        "message": "Configuration du fuseau horaire mise à jour",
        "config": TimezoneConfig(
            timezone_offset=updated_settings.get("timezone_offset", 1),
            timezone_name=updated_settings.get("timezone_name", "Europe/Paris"),
            ntp_server=updated_settings.get("ntp_server", "pool.ntp.org")
        )
    }


@router.get("/timezones")
async def get_available_timezones():
    """Récupérer la liste des fuseaux horaires disponibles"""
    return POPULAR_TIMEZONES


@router.get("/ntp-servers")
async def get_ntp_servers():
    """Récupérer la liste des serveurs NTP populaires"""
    return POPULAR_NTP_SERVERS


@router.post("/test-ntp")
async def test_ntp_connection(
    server: str,
    current_user: dict = Depends(get_current_admin_user)
) -> NTPTestResult:
    """Tester la connexion à un serveur NTP"""
    if not server or not server.strip():
        raise HTTPException(status_code=400, detail="Adresse du serveur NTP requise")
    
    server = server.strip()
    
    try:
        # Créer le client NTP
        ntp_client = ntplib.NTPClient()
        
        # Interroger le serveur NTP avec un timeout de 5 secondes
        response = ntp_client.request(server, version=3, timeout=5)
        
        # Calculer l'heure du serveur
        server_time = datetime.fromtimestamp(response.tx_time, tz=timezone.utc)
        local_time = datetime.now(timezone.utc)
        
        # Calculer l'offset en millisecondes
        offset_ms = response.offset * 1000
        
        return NTPTestResult(
            success=True,
            server=server,
            server_time=server_time.isoformat(),
            local_time=local_time.isoformat(),
            offset_ms=round(offset_ms, 2),
            message=f"Connexion réussie. Décalage: {offset_ms:.2f}ms"
        )
        
    except ntplib.NTPException as e:
        return NTPTestResult(
            success=False,
            server=server,
            message=f"Erreur NTP: {str(e)}"
        )
    except socket.timeout:
        return NTPTestResult(
            success=False,
            server=server,
            message=f"Timeout: Le serveur {server} ne répond pas (délai > 5s)"
        )
    except socket.gaierror as e:
        return NTPTestResult(
            success=False,
            server=server,
            message=f"Erreur DNS: Impossible de résoudre {server}"
        )
    except Exception as e:
        return NTPTestResult(
            success=False,
            server=server,
            message=f"Erreur: {str(e)}"
        )


@router.get("/current-time")
async def get_current_server_time():
    """Récupérer l'heure actuelle du serveur avec le fuseau configuré"""
    settings = await db.system_settings.find_one({"_id": "default"})
    
    offset = settings.get("timezone_offset", 1) if settings else 1
    timezone_name = settings.get("timezone_name", "Europe/Paris") if settings else "Europe/Paris"
    
    # Créer le timezone avec l'offset
    tz = timezone(timedelta(hours=offset))
    
    # Heure UTC
    utc_now = datetime.now(timezone.utc)
    
    # Heure avec l'offset configuré
    local_now = utc_now.astimezone(tz)
    
    return {
        "utc_time": utc_now.isoformat(),
        "local_time": local_now.isoformat(),
        "timezone_offset": offset,
        "timezone_name": timezone_name,
        "formatted_local": local_now.strftime("%d/%m/%Y %H:%M:%S"),
        "formatted_utc": utc_now.strftime("%d/%m/%Y %H:%M:%S")
    }
