#!/bin/bash
#
# Redémarrage COMPLET avec vérifications
#

echo "════════════════════════════════════════════════════════════"
echo "  REDÉMARRAGE COMPLET GMAO IRIS"
echo "════════════════════════════════════════════════════════════"
echo ""

# Arrêter tout
echo "1. Arrêt de tous les services..."
supervisorctl stop all 2>/dev/null
pkill -f "python.*server.py" 2>/dev/null
pkill -f "uvicorn.*server" 2>/dev/null
pkill -f "node.*react" 2>/dev/null
sleep 2
echo "✓ Services arrêtés"
echo ""

# Nettoyer les logs
echo "2. Nettoyage des logs..."
> /var/log/gmao-iris-backend.err.log 2>/dev/null
> /var/log/gmao-iris-backend.out.log 2>/dev/null
> /var/log/gmao-iris-frontend.err.log 2>/dev/null
> /var/log/gmao-iris-frontend.out.log 2>/dev/null
echo "✓ Logs nettoyés"
echo ""

# Redémarrer supervisor
echo "3. Redémarrage supervisor..."
service supervisor restart
sleep 3
echo "✓ Supervisor redémarré"
echo ""

# Attendre que les services démarrent
echo "4. Attente démarrage des services (10 secondes)..."
sleep 10
echo ""

# Status
echo "5. Status des services:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

# Processus
echo "6. Processus actifs:"
echo "─────────────────────────────────────────────────────────────"
ps aux | grep -E "uvicorn|node.*react" | grep -v grep
echo ""

# Ports
echo "7. Ports en écoute:"
echo "─────────────────────────────────────────────────────────────"
netstat -tlnp 2>/dev/null | grep -E "8001|3000"
echo ""

# Logs backend
echo "8. Logs backend (dernières lignes):"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/gmao-iris-backend.err.log ]; then
    tail -20 /var/log/gmao-iris-backend.err.log
else
    echo "Pas encore de logs"
fi
echo ""

# Test API
echo "9. Test API backend:"
echo "─────────────────────────────────────────────────────────────"
sleep 2
curl -s http://localhost:8001/api/health 2>&1 | head -5
echo ""
echo ""

# Résumé
echo "════════════════════════════════════════════════════════════"
BACKEND=$(supervisorctl status gmao-iris-backend 2>/dev/null | awk '{print $2}')
FRONTEND=$(supervisorctl status gmao-iris-frontend 2>/dev/null | awk '{print $2}')

echo "RÉSUMÉ:"
if [[ "$BACKEND" == "RUNNING" ]]; then
    echo "✓ Backend: RUNNING"
else
    echo "✗ Backend: $BACKEND"
fi

if [[ "$FRONTEND" == "RUNNING" ]]; then
    echo "✓ Frontend: RUNNING"  
else
    echo "✗ Frontend: $FRONTEND"
fi

echo ""
echo "Pour surveiller MQTT en temps réel:"
echo "  tail -f /var/log/gmao-iris-backend.err.log | grep '\[MQTT\]'"
echo ""
echo "════════════════════════════════════════════════════════════"
