#!/bin/bash
#
# Script de test MQTT complet
# Usage: ./mqtt-test.sh
#

echo "════════════════════════════════════════════════════════════"
echo "  TEST MQTT COMPLET"
echo "════════════════════════════════════════════════════════════"
echo ""

# Demander les informations MQTT
read -p "Broker MQTT (ex: 192.168.1.135): " BROKER
read -p "Port MQTT (défaut 1883): " PORT
PORT=${PORT:-1883}
read -p "Username MQTT: " USERNAME
read -s -p "Password MQTT: " PASSWORD
echo ""
echo ""

echo "🔌 Test 1: Connexion au broker..."
mosquitto_pub -h $BROKER -p $PORT -u $USERNAME -P $PASSWORD -t "test/connection" -m "Test connexion" 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Connexion OK"
else
    echo "✗ Échec de connexion"
    exit 1
fi
echo ""

echo "📤 Test 2: Publication d'un message de test..."
mosquitto_pub -h $BROKER -p $PORT -u $USERNAME -P $PASSWORD -t "test/gmao/debug" -m "Message de test $(date +%H:%M:%S)"
echo "✓ Message publié sur 'test/gmao/debug'"
echo ""

echo "📥 Test 3: Écoute pendant 10 secondes..."
echo "Publier un message depuis votre application maintenant..."
timeout 10 mosquitto_sub -h $BROKER -p $PORT -u $USERNAME -P $PASSWORD -t "#" -v | head -10
echo ""
echo "✓ Test d'écoute terminé"
echo ""

echo "💾 Test 4: Vérification des messages dans la base..."
python3 << 'PYEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta

async def check():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.gmao_iris
    
    # Messages des 2 dernières minutes
    two_min_ago = (datetime.utcnow() - timedelta(minutes=2)).isoformat()
    recent = await db.mqtt_messages.find({
        "received_at": {"$gte": two_min_ago}
    }).to_list(10)
    
    if recent:
        print(f"✓ {len(recent)} message(s) reçu(s) dans les 2 dernières minutes:")
        for msg in recent:
            print(f"  • {msg.get('topic')}: {msg.get('payload', '')[:50]}")
    else:
        print("✗ Aucun message récent dans la base")
    
    client.close()

asyncio.run(check())
PYEOF
echo ""

echo "════════════════════════════════════════════════════════════"
echo "Test terminé"
echo "════════════════════════════════════════════════════════════"
