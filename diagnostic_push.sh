#!/bin/bash
# =============================================================
# SCRIPT DE DIAGNOSTIC NOTIFICATIONS PUSH - FSAO Iris
# Exécuter sur le serveur Proxmox : bash diagnostic_push.sh
# =============================================================

set -e

# Configuration
API_BASE="http://localhost:8001/api"
ADMIN_EMAIL="admin@test.com"
ADMIN_PASS="Admin123!"

echo "============================================="
echo "  DIAGNOSTIC NOTIFICATIONS PUSH - FSAO Iris"
echo "============================================="
echo ""

# 1. Login
echo "[1/6] Connexion admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  ERREUR: Impossible de se connecter. Verifiez les credentials."
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
fi
echo "  OK - Connecte"
echo ""

# 2. Lister les tokens
echo "[2/6] Tokens enregistres en base..."
DEVICES=$(curl -s "$API_BASE/notifications/devices" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEVICES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
total = d.get('total', 0)
devices = d.get('devices', [])
print(f'  Total: {total} token(s)')
for dev in devices:
    status = 'ACTIF' if dev.get('is_active') else 'INACTIF'
    token = dev.get('push_token', '?')[:40] + '...'
    user = dev.get('user_id', '?')
    device = dev.get('device_name', '?')
    updated = dev.get('updated_at', '?')
    print(f'  [{status}] User: {user} | Device: {device} | Token: {token} | MAJ: {updated}')
"
echo ""

# 3. Diagnostic complet via l'endpoint
echo "[3/6] Diagnostic complet (test envoi Expo)..."
echo "  (peut prendre ~10 secondes...)"
DIAG=$(curl -s --max-time 30 "$API_BASE/notifications/diagnostic" \
  -H "Authorization: Bearer $TOKEN")

echo "$DIAG" | python3 -c "
import sys, json
d = json.load(sys.stdin)

# Etapes
for etape in d.get('etapes', []):
    print(f'  {etape[\"etape\"]}: {etape[\"resultat\"]} [{etape[\"statut\"]}]')

# Tests envoi
tests = d.get('test_envoi', [])
if tests:
    print()
    print('  --- Resultats par token ---')
    for t in tests:
        print(f'  Token: {t.get(\"token\",\"?\")}')
        print(f'    Device: {t.get(\"device_name\",\"?\")} ({t.get(\"platform\",\"?\")})')
        print(f'    Verdict: {t.get(\"verdict\",\"?\")}')
        if t.get('explication'):
            print(f'    Explication: {t[\"explication\"]}')
        if t.get('receipt_verification'):
            print(f'    Receipt: {t[\"receipt_verification\"]}')
        print()

# Conclusion
print(f'  CONCLUSION: {d.get(\"conclusion\",\"?\")}')
print()
if d.get('actions_recommandees'):
    print('  ACTIONS RECOMMANDEES:')
    for a in d['actions_recommandees']:
        print(f'    {a}')
"
echo ""

# 4. Verifier la connectivite vers Expo
echo "[4/6] Test connectivite vers Expo Push API..."
EXPO_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://exp.host/--/api/v2/push/send" \
  -H "Content-Type: application/json" \
  -d '[{"to":"ExponentPushToken[test_invalid]","title":"test","body":"test"}]' \
  --max-time 10)
if [ "$EXPO_TEST" = "200" ]; then
  echo "  OK - Serveur Expo accessible (HTTP $EXPO_TEST)"
else
  echo "  ERREUR - Serveur Expo inaccessible (HTTP $EXPO_TEST)"
  echo "  Verifiez que le serveur peut acceder a internet (DNS, firewall, proxy)"
fi
echo ""

# 5. Verifier les receipts en base
echo "[5/6] Receipts push recents..."
RECEIPTS=$(curl -s "$API_BASE/notifications/diagnostic" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
receipts = d.get('receipts_recents', [])
print(f'  {len(receipts)} receipt(s) recent(s)')
for r in receipts[:5]:
    print(f'  Ticket: {r.get(\"ticket_id\",\"?\")[:20]}... | Status: {r.get(\"status\",\"?\")} | Checked: {r.get(\"checked\",\"?\")} | Date: {r.get(\"created_at\",\"?\")}')
" 2>/dev/null)
echo "$RECEIPTS"
echo ""

# 6. Verifier les logs backend recents
echo "[6/6] Derniers logs push du backend..."
if [ -f /var/log/supervisor/gmao-iris-backend.out.log ]; then
  grep -i "PUSH\|push_token\|DeviceNotRegistered\|notification" /var/log/supervisor/gmao-iris-backend.out.log 2>/dev/null | tail -15
elif [ -f /var/log/supervisor/gmao-iris-backend.err.log ]; then
  grep -i "PUSH\|push_token\|DeviceNotRegistered\|notification" /var/log/supervisor/gmao-iris-backend.err.log 2>/dev/null | tail -15
else
  echo "  Fichier de log non trouve. Essayez: journalctl -u gmao-iris-backend | grep -i push | tail -15"
fi
echo ""

echo "============================================="
echo "  DIAGNOSTIC TERMINE"
echo "============================================="
echo ""
echo "Si le probleme persiste, copiez-collez la sortie complete"
echo "de ce script et envoyez-la a l'agent Emergent."
