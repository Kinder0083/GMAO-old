#!/bin/bash
#
# Diagnostic avec les BONS noms de services
#

echo "════════════════════════════════════════════════════════════"
echo "  DIAGNOSTIC COMPLET (bons noms)"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. Status de TOUS les services:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

echo "2. Arrêt de tous les services:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl stop all
sleep 2
echo ""

echo "3. Redémarrage supervisor:"
echo "─────────────────────────────────────────────────────────────"
service supervisor restart
sleep 3
echo ""

echo "4. Status après redémarrage:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

echo "5. Démarrage gmao-iris-backend:"
echo "─────────────────────────────────────────────────────────────"
supervisorctl start gmao-iris-backend
sleep 5
supervisorctl status gmao-iris-backend
echo ""

echo "6. LOGS BACKEND (stderr):"
echo "─────────────────────────────────────────────────────────────"
ls -la /var/log/supervisor/ | grep gmao
echo ""
echo "Contenu du dernier log backend stderr:"
BACKEND_LOG=$(ls -t /var/log/supervisor/gmao-iris-backend-stderr*.log 2>/dev/null | head -1)
if [ -n "$BACKEND_LOG" ]; then
    echo "Fichier: $BACKEND_LOG"
    tail -50 "$BACKEND_LOG"
else
    echo "✗ Aucun log stderr trouvé"
fi
echo ""

echo "7. LOGS BACKEND (stdout):"
echo "─────────────────────────────────────────────────────────────"
BACKEND_LOG_OUT=$(ls -t /var/log/supervisor/gmao-iris-backend-stdout*.log 2>/dev/null | head -1)
if [ -n "$BACKEND_LOG_OUT" ]; then
    echo "Fichier: $BACKEND_LOG_OUT"
    tail -30 "$BACKEND_LOG_OUT"
else
    echo "✗ Aucun log stdout trouvé"
fi
echo ""

echo "8. TEST MANUEL DU BACKEND:"
echo "─────────────────────────────────────────────────────────────"
echo "Tentative de lancement manuel pour voir l'erreur..."
cd /opt/gmao-iris/backend
source venv/bin/activate
echo "Lancement de server.py..."
timeout 10 python server.py 2>&1 | head -100
RESULT=$?
deactivate
cd ..
echo ""
echo "Code retour: $RESULT"
if [ $RESULT -eq 124 ]; then
    echo "✓ Le backend démarre (timeout atteint = normal)"
else
    echo "✗ Le backend a crashé (code: $RESULT)"
fi
echo ""

echo "9. Vérification des ports:"
echo "─────────────────────────────────────────────────────────────"
netstat -tlnp 2>/dev/null | grep -E "8001|3000"
echo ""

echo "10. Processus Python/Node:"
echo "─────────────────────────────────────────────────────────────"
ps aux | grep -E "python.*server.py|node.*react" | grep -v grep
echo ""

echo "════════════════════════════════════════════════════════════"
echo "FIN DU DIAGNOSTIC"
echo "════════════════════════════════════════════════════════════"
