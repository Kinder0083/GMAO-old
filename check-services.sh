#!/bin/bash
#
# Diagnostic complet des services
#

echo "════════════════════════════════════════════════════════════"
echo "  DIAGNOSTIC SERVICES"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. VÉRIFICATION SUPERVISOR"
echo "─────────────────────────────────────────────────────────────"
echo "Status supervisor:"
service supervisor status || systemctl status supervisor
echo ""

echo "2. CONFIGURATION SUPERVISOR"
echo "─────────────────────────────────────────────────────────────"
echo "Fichiers de configuration:"
ls -la /etc/supervisor/conf.d/ 2>/dev/null || echo "✗ Dossier conf.d introuvable"
echo ""

echo "3. PROGRAMMES SUPERVISÉS"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

echo "4. LOGS SUPERVISOR"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/supervisor/supervisord.log ]; then
    echo "Dernières lignes supervisord.log:"
    tail -20 /var/log/supervisor/supervisord.log
else
    echo "✗ Fichier supervisord.log introuvable"
fi
echo ""

echo "5. FICHIERS DE CONFIG BACKEND/FRONTEND"
echo "─────────────────────────────────────────────────────────────"
if [ -f /etc/supervisor/conf.d/gmao.conf ]; then
    echo "✓ /etc/supervisor/conf.d/gmao.conf existe"
    echo "Contenu:"
    cat /etc/supervisor/conf.d/gmao.conf
elif [ -f /etc/supervisor/conf.d/backend.conf ]; then
    echo "✓ /etc/supervisor/conf.d/backend.conf existe"
    cat /etc/supervisor/conf.d/backend.conf
else
    echo "✗ Aucun fichier de configuration trouvé"
    echo ""
    echo "⚠️  Les services ne sont PAS configurés dans supervisor !"
fi
echo ""

echo "6. VÉRIFICATION PROCESSUS PYTHON/NODE"
echo "─────────────────────────────────────────────────────────────"
echo "Processus Python (backend):"
ps aux | grep python | grep -v grep
echo ""
echo "Processus Node (frontend):"
ps aux | grep node | grep -v grep
echo ""

echo "7. PORTS EN ÉCOUTE"
echo "─────────────────────────────────────────────────────────────"
echo "Port 8001 (backend):"
netstat -tlnp | grep 8001 || echo "✗ Rien sur le port 8001"
echo ""
echo "Port 3000 (frontend):"
netstat -tlnp | grep 3000 || echo "✗ Rien sur le port 3000"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "FIN DU DIAGNOSTIC"
echo "════════════════════════════════════════════════════════════"
