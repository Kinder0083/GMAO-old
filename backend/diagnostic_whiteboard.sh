#!/bin/bash

# Script de diagnostic pour le tableau d'affichage GMAO Iris
# Ce script vérifie que les événements WebSocket sont correctement traités

echo "========================================"
echo "DIAGNOSTIC TABLEAU D'AFFICHAGE"
echo "========================================"
echo ""

# Vérifier les logs du backend pour les événements WebSocket
echo "📋 Derniers événements WebSocket du whiteboard:"
echo "------------------------------------------------"

if [ -f /var/log/gmao-iris-backend.out.log ]; then
    grep -i "whiteboard\|object_removed\|object_added" /var/log/gmao-iris-backend.out.log | tail -20
elif [ -f /var/log/supervisor/gmao-iris-backend.out.log ]; then
    grep -i "whiteboard\|object_removed\|object_added" /var/log/supervisor/gmao-iris-backend.out.log | tail -20
elif [ -f /opt/gmao-iris/logs/backend.log ]; then
    grep -i "whiteboard\|object_removed\|object_added" /opt/gmao-iris/logs/backend.log | tail -20
else
    echo "⚠️ Fichier de log non trouvé"
    echo "   Cherchez dans /var/log/ ou /opt/gmao-iris/logs/"
fi

echo ""
echo "📊 Connexions WebSocket actives:"
echo "--------------------------------"

# Compter les connexions WebSocket
netstat -an 2>/dev/null | grep -c ":8001.*ESTABLISHED" || echo "0 connexions"

echo ""
echo "🔍 Vérification de la base de données:"
echo "---------------------------------------"

# Trouver le répertoire backend
BACKEND_DIR=""
for dir in /opt/gmao-iris/backend /opt/gmao-iris /app/backend; do
    if [ -d "$dir" ] && [ -f "$dir/.env" ]; then
        BACKEND_DIR="$dir"
        break
    fi
done

if [ -n "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    python3 << 'PYEOF'
import os
import sys
from pathlib import Path

# Charger .env
env_file = Path('.env')
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip())

try:
    from pymongo import MongoClient
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gmao_iris')
    
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    
    # Vérifier les tableaux
    for board_id in ['board_1', 'board_2']:
        board = db.whiteboards.find_one({"board_id": board_id})
        if board:
            objects = board.get('objects', [])
            with_id = sum(1 for o in objects if o.get('id'))
            without_id = sum(1 for o in objects if not o.get('id'))
            print(f"  {board_id}: {len(objects)} objets ({with_id} avec ID, {without_id} sans ID)")
        else:
            print(f"  {board_id}: Non trouvé")
    
    # Vérifier l'historique des suppressions
    print("")
    print("  Dernières suppressions:")
    history = list(db.whiteboard_history.find(
        {"action": "remove"},
        {"_id": 0, "board_id": 1, "object_id": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(5))
    
    if history:
        for h in history:
            print(f"    - {h.get('board_id')}: objet {h.get('object_id')} à {h.get('timestamp')}")
    else:
        print("    Aucune suppression enregistrée")
        
except Exception as e:
    print(f"  ❌ Erreur: {e}")
PYEOF
else
    echo "⚠️ Répertoire backend non trouvé"
fi

echo ""
echo "========================================"
echo "FIN DU DIAGNOSTIC"
echo "========================================"
echo ""
echo "Si la suppression ne fonctionne pas:"
echo "1. Vérifiez que les WebSockets sont connectés (points verts)"
echo "2. Ouvrez la console du navigateur (F12) et cherchez les messages [WS]"
echo "3. Vérifiez que les objets ont un ID (nécessaire pour la suppression)"
