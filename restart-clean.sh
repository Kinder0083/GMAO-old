#!/bin/bash
#
# Vérifie les VRAIS logs et redémarre les services
#

echo "════════════════════════════════════════════════════════════"
echo "  VRAIS LOGS ET REDÉMARRAGE"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. Logs backend (50 dernières lignes):"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/gmao-iris-backend.err.log ]; then
    tail -50 /var/log/gmao-iris-backend.err.log
else
    echo "✗ Fichier introuvable"
fi
echo ""

echo "2. Logs frontend (30 dernières lignes):"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/gmao-iris-frontend.err.log ]; then
    tail -30 /var/log/gmao-iris-frontend.err.log
else
    echo "✗ Fichier introuvable"
fi
echo ""

echo "3. Arrêt de tous les services:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl stop all
sleep 2
echo ""

echo "4. Nettoyage des logs:"
echo "─────────────────────────────────────────────────────────────"
> /var/log/gmao-iris-backend.err.log
> /var/log/gmao-iris-backend.out.log
> /var/log/gmao-iris-frontend.err.log 2>/dev/null || true
> /var/log/gmao-iris-frontend.out.log 2>/dev/null || true
echo "✓ Logs nettoyés"
echo ""

echo "5. Redémarrage supervisor:"
echo "─────────────────────────────────────────────────────────────"
service supervisor restart
sleep 3
echo ""

echo "6. Status final:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

echo "7. Vérification des processus:"
echo "─────────────────────────────────────────────────────────────"
sleep 3
ps aux | grep -E "python.*server|node.*react|uvicorn" | grep -v grep
echo ""

echo "8. Ports en écoute:"
echo "─────────────────────────────────────────────────────────────"
netstat -tlnp 2>/dev/null | grep -E "8001|3000"
echo ""

echo "9. Nouveaux logs backend (après redémarrage):"
echo "─────────────────────────────────────────────────────────────"
sleep 2
tail -30 /var/log/gmao-iris-backend.err.log 2>/dev/null || echo "Pas encore de logs"
echo ""

echo "10. Test API backend:"
echo "─────────────────────────────────────────────────────────────"
sleep 2
curl -s http://localhost:8001/api/health 2>/dev/null || echo "✗ API non accessible"
echo ""

echo "════════════════════════════════════════════════════════════"
BACKEND_STATUS=$(supervisorctl status gmao-iris-backend 2>/dev/null | awk '{print $2}')
FRONTEND_STATUS=$(supervisorctl status gmao-iris-frontend 2>/dev/null | awk '{print $2}')

if [[ "$BACKEND_STATUS" == "RUNNING" ]]; then
    echo "✓ Backend: RUNNING"
else
    echo "✗ Backend: $BACKEND_STATUS"
fi

if [[ "$FRONTEND_STATUS" == "RUNNING" ]]; then
    echo "✓ Frontend: RUNNING"
else
    echo "✗ Frontend: $FRONTEND_STATUS"
fi
echo "════════════════════════════════════════════════════════════"
