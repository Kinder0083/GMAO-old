#!/bin/bash
#
# Diagnostic MQTT simplifié (sans mosquitto-clients)
# Usage: ./mqtt-check.sh
#

echo "════════════════════════════════════════════════════════════"
echo "  DIAGNOSTIC MQTT RAPIDE"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📊 1. STATUT BACKEND"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status backend
echo ""

echo "📡 2. CONFIGURATION MQTT"
echo "─────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db = client.gmao_iris
        
        config = await db.mqtt_config.find_one({"id": "default"})
        if config:
            print(f"✓ Configuration MQTT trouvée:")
            print(f"  • Host: {config.get('host')}")
            print(f"  • Port: {config.get('port')}")
            print(f"  • Username: {config.get('username', 'N/A')}")
            print(f"  • Client ID: {config.get('client_id', 'gmao_iris')}")
        else:
            print("✗ AUCUNE configuration MQTT trouvée!")
            print("  → Allez dans Administration > Paramètres Spéciaux > Configuration MQTT")
        
        client.close()
    except Exception as e:
        print(f"✗ Erreur: {e}")

asyncio.run(check())
PYEOF
echo ""

echo "📋 3. ABONNEMENTS ACTIFS"
echo "─────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db = client.gmao_iris
        
        subs = await db.mqtt_subscriptions.find({"active": True}).to_list(100)
        if subs:
            print(f"✓ {len(subs)} abonnement(s) actif(s):")
            for sub in subs:
                print(f"  • {sub.get('topic')} (QoS: {sub.get('qos', 0)})")
        else:
            print("✗ Aucun abonnement actif")
            print("  → Allez dans P/L MQTT et abonnez-vous à '#'")
        
        client.close()
    except Exception as e:
        print(f"✗ Erreur: {e}")

asyncio.run(check())
PYEOF
echo ""

echo "💾 4. MESSAGES MQTT DANS LA BASE"
echo "─────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os

async def check():
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db = client.gmao_iris
        
        # Total
        total = await db.mqtt_messages.count_documents({})
        print(f"Total de messages: {total}")
        
        # Messages récents (10 dernières minutes)
        ten_min_ago = (datetime.utcnow() - timedelta(minutes=10)).isoformat()
        recent = await db.mqtt_messages.find({
            "received_at": {"$gte": ten_min_ago}
        }).sort("received_at", -1).to_list(10)
        
        if recent:
            print(f"\n✓ {len(recent)} message(s) reçu(s) dans les 10 dernières minutes:")
            for i, msg in enumerate(recent, 1):
                print(f"\n  {i}. Topic: {msg.get('topic')}")
                print(f"     Payload: {msg.get('payload', '')[:60]}...")
                print(f"     Reçu: {msg.get('received_at')}")
        else:
            print("\n✗ Aucun message récent (10 dernières minutes)")
            print("  → Testez en publiant un message depuis votre broker MQTT")
        
        client.close()
    except Exception as e:
        print(f"✗ Erreur: {e}")

asyncio.run(check())
PYEOF
echo ""

echo "🔍 5. LOGS BACKEND (50 dernières lignes avec MQTT)"
echo "─────────────────────────────────────────────────────────────"
tail -n 100 /var/log/supervisor/backend.err.log | grep -i "\[mqtt\]" | tail -30
echo ""

echo "════════════════════════════════════════════════════════════"
echo "DIAGNOSTIC TERMINÉ"
echo ""
echo "📌 Points à vérifier:"
echo "   1. Configuration MQTT doit être présente"
echo "   2. Au moins 1 abonnement actif (ex: '#')"
echo "   3. Si vous publiez un message, il doit apparaître dans les logs"
echo "   4. Le message doit être sauvegardé dans la base de données"
echo ""
echo "🔧 Pour voir les logs en temps réel:"
echo "   tail -f /var/log/supervisor/backend.err.log | grep --line-buffered -i mqtt"
echo ""
echo "════════════════════════════════════════════════════════════"
