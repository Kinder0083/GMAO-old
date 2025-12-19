#!/bin/bash
#
# Script de diagnostic MQTT - Logs de connexion, publication et réception
# Usage: ./mqtt-debug.sh
#

echo "════════════════════════════════════════════════════════════"
echo "  DIAGNOSTIC MQTT - GMAO Iris"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📊 1. STATUT DES SERVICES"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status backend frontend
echo ""

echo "📡 2. CONFIGURATION MQTT"
echo "─────────────────────────────────────────────────────────────"
echo "Vérification de la configuration MQTT dans la base..."
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_config():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.gmao_iris
    
    config = await db.mqtt_config.find_one({"id": "default"})
    if config:
        print(f"✓ Configuration trouvée:")
        print(f"  • Host: {config.get('host')}")
        print(f"  • Port: {config.get('port')}")
        print(f"  • Username: {config.get('username', 'N/A')}")
        print(f"  • SSL: {config.get('use_ssl', False)}")
    else:
        print("✗ Aucune configuration MQTT trouvée")
    
    client.close()

asyncio.run(check_config())
PYEOF
echo ""

echo "🔌 3. LOGS DE CONNEXION MQTT (20 dernières lignes)"
echo "─────────────────────────────────────────────────────────────"
tail -n 100 /var/log/supervisor/backend.err.log | grep -i "mqtt.*connect\|mqtt.*broker" | tail -20
echo ""

echo "📤 4. LOGS DE PUBLICATION (20 dernières)"
echo "─────────────────────────────────────────────────────────────"
tail -n 100 /var/log/supervisor/backend.err.log | grep -i "publish\|publié" | tail -20
echo ""

echo "📥 5. LOGS DE RÉCEPTION (20 dernières)"
echo "─────────────────────────────────────────────────────────────"
tail -n 100 /var/log/supervisor/backend.err.log | grep -i "reçu\|received\|message.*mqtt" | tail -20
echo ""

echo "💾 6. MESSAGES MQTT DANS LA BASE DE DONNÉES"
echo "─────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_messages():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.gmao_iris
    
    count = await db.mqtt_messages.count_documents({})
    print(f"Nombre total de messages: {count}")
    
    if count > 0:
        print("\n5 derniers messages:")
        messages = await db.mqtt_messages.find({}).sort("received_at", -1).limit(5).to_list(5)
        for i, msg in enumerate(messages, 1):
            print(f"\n  {i}. Topic: {msg.get('topic')}")
            print(f"     Payload: {msg.get('payload', '')[:80]}...")
            print(f"     Reçu: {msg.get('received_at')}")
    else:
        print("✗ Aucun message dans la base de données")
    
    client.close()

asyncio.run(check_messages())
PYEOF
echo ""

echo "📋 7. ABONNEMENTS ACTIFS"
echo "─────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_subs():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.gmao_iris
    
    subs = await db.mqtt_subscriptions.find({"active": True}).to_list(100)
    if subs:
        print(f"Abonnements actifs: {len(subs)}")
        for sub in subs:
            print(f"  • {sub.get('topic')} (QoS: {sub.get('qos', 0)})")
    else:
        print("✗ Aucun abonnement actif")
    
    client.close()

asyncio.run(check_subs())
PYEOF
echo ""

echo "🔍 8. LOGS BACKEND EN TEMPS RÉEL (Ctrl+C pour arrêter)"
echo "─────────────────────────────────────────────────────────────"
echo "Surveillance des logs backend (filtré MQTT)..."
echo ""
tail -f /var/log/supervisor/backend.err.log | grep --line-buffered -i "mqtt"
