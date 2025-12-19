#!/bin/bash
#
# Trouve et affiche les VRAIS logs
#

echo "════════════════════════════════════════════════════════════"
echo "  RECHERCHE DES LOGS"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. TOUS les fichiers de logs supervisor:"
echo "─────────────────────────────────────────────────────────────"
ls -lah /var/log/supervisor/ 2>/dev/null || echo "Dossier introuvable"
echo ""

echo "2. Configuration supervisor:"
echo "─────────────────────────────────────────────────────────────"
cat /etc/supervisor/conf.d/*.conf 2>/dev/null || echo "Pas de configuration"
echo ""

echo "3. Logs gmao-iris-backend (si existe):"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/supervisor/gmao-iris-backend-stderr*.log ]; then
    echo "Fichier trouvé !"
    tail -50 /var/log/supervisor/gmao-iris-backend-stderr*.log
elif [ -f /var/log/supervisor/gmao-iris-backend.err.log ]; then
    echo "Fichier trouvé !"
    tail -50 /var/log/supervisor/gmao-iris-backend.err.log
else
    echo "Pas de log gmao-iris-backend"
fi
echo ""

echo "4. Logs gmao-iris-frontend (si existe):"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/supervisor/gmao-iris-frontend-stderr*.log ]; then
    echo "Fichier trouvé !"
    tail -50 /var/log/supervisor/gmao-iris-frontend-stderr*.log
elif [ -f /var/log/supervisor/gmao-iris-frontend.err.log ]; then
    echo "Fichier trouvé !"
    tail -50 /var/log/supervisor/gmao-iris-frontend.err.log
else
    echo "Pas de log gmao-iris-frontend"
fi
echo ""

echo "5. Test manuel du backend:"
echo "─────────────────────────────────────────────────────────────"
cd /opt/gmao-iris/backend
echo "Activation venv..."
source venv/bin/activate
echo "Lancement server.py..."
timeout 5 python server.py 2>&1 || echo "Backend s'est arrêté"
deactivate
cd ..
echo ""

echo "════════════════════════════════════════════════════════════"
