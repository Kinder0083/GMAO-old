#!/bin/bash
# ============================================
# Script de diagnostic complet - Notifications Push FSAO
# A executer sur le serveur Proxmox en tant que root
# ============================================

echo "================================================"
echo "  DIAGNOSTIC NOTIFICATIONS PUSH FSAO"
echo "  $(date)"
echo "================================================"
echo ""

# --- CONFIG ---
# Remplacez par vos identifiants
EMAIL="buenogy@gmail.com"
PASSWORD="Admin2024!"
SERVER_URL="http://82.66.41.98"

echo "[1/8] LOGIN"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','ECHEC'))" 2>/dev/null)
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id','ECHEC'))" 2>/dev/null)

if [ "$TOKEN" = "ECHEC" ] || [ -z "$TOKEN" ]; then
    echo "ERREUR: Login echoue!"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo "OK - User ID: $USER_ID"
echo "OK - Token: ${TOKEN:0:20}..."
echo ""

echo "[2/8] APPAREILS ENREGISTRES"
echo "-------------------------------------------"
DEVICES=$(curl -s "$SERVER_URL/api/notifications/devices" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEVICES" | python3 -m json.tool 2>/dev/null || echo "$DEVICES"
echo ""

echo "[3/8] TOUS LES TOKENS EN BASE (via mongosh)"
echo "-------------------------------------------"
mongosh gmao_iris --quiet --eval "
  var tokens = db.device_tokens.find().toArray();
  print('Total tokens en base: ' + tokens.length);
  tokens.forEach(function(t) {
    print('  user_id: ' + t.user_id);
    print('  push_token: ' + (t.push_token || '').substring(0, 40) + '...');
    print('  is_active: ' + t.is_active);
    print('  device_name: ' + t.device_name);
    print('  platform: ' + t.platform);
    print('  updated_at: ' + t.updated_at);
    print('  ---');
  });
" 2>/dev/null || echo "mongosh non disponible, essai avec mongo..." && \
mongo gmao_iris --quiet --eval "
  var tokens = db.device_tokens.find().toArray();
  print('Total tokens en base: ' + tokens.length);
  tokens.forEach(function(t) {
    print('  user_id: ' + t.user_id);
    print('  push_token: ' + (t.push_token || '').substring(0, 40) + '...');
    print('  is_active: ' + t.is_active);
    print('  device_name: ' + t.device_name);
    print('  platform: ' + t.platform);
    print('  updated_at: ' + t.updated_at);
    print('  ---');
  });
" 2>/dev/null
echo ""

echo "[4/8] INDEX SUR device_tokens"
echo "-------------------------------------------"
mongosh gmao_iris --quiet --eval "db.device_tokens.getIndexes().forEach(function(i){printjson(i)})" 2>/dev/null || \
mongo gmao_iris --quiet --eval "db.device_tokens.getIndexes().forEach(function(i){printjson(i)})" 2>/dev/null
echo ""

echo "[5/8] PUSH RECEIPTS EN ATTENTE"
echo "-------------------------------------------"
mongosh gmao_iris --quiet --eval "
  var count = db.push_receipts.countDocuments({checked: false});
  var total = db.push_receipts.countDocuments({});
  print('Total receipts: ' + total + ' (non verifies: ' + count + ')');
" 2>/dev/null || \
mongo gmao_iris --quiet --eval "
  var count = db.push_receipts.count({checked: false});
  var total = db.push_receipts.count({});
  print('Total receipts: ' + total + ' (non verifies: ' + count + ')');
" 2>/dev/null
echo ""

echo "[6/8] TEST ENVOI NOTIFICATION"
echo "-------------------------------------------"
echo "Envoi vers user $USER_ID..."
TEST_RESULT=$(curl -s -X POST "$SERVER_URL/api/push-notifications/test/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$TEST_RESULT" | python3 -m json.tool 2>/dev/null || echo "$TEST_RESULT"
echo ""

echo "[7/8] LOGS PUSH RECENTS (derniere heure)"
echo "-------------------------------------------"
grep -E "PUSH|notif|receipt|invalide|Supprime|DeviceNotRegistered" /var/log/gmao-iris-backend.err.log 2>/dev/null | tail -30
echo ""

echo "[8/8] VERIFICATION CODE BACKEND"
echo "-------------------------------------------"
echo -n "notifications.py present: "
test -f /opt/gmao-iris/backend/notifications.py && echo "OUI" || echo "NON"
echo -n "check_push_receipts dans server.py: "
grep -c "check_push_receipts" /opt/gmao-iris/backend/server.py 2>/dev/null
echo -n "set_notifications_db dans server.py: "
grep -c "set_notifications_db" /opt/gmao-iris/backend/server.py 2>/dev/null
echo -n "realtime_manager DateTimeEncoder: "
grep -c "DateTimeEncoder" /opt/gmao-iris/backend/realtime_manager.py 2>/dev/null
echo ""

echo "================================================"
echo "  FIN DU DIAGNOSTIC"
echo "  Copiez-collez toute la sortie ci-dessus"
echo "  et partagez-la pour analyse."
echo "================================================"
