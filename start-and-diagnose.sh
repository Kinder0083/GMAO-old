#!/bin/bash
#
# Script rapide pour démarrer les services et diagnostiquer
#

echo "════════════════════════════════════════════════════════════"
echo "  DÉMARRAGE ET DIAGNOSTIC DES SERVICES"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. Vérification supervisor"
echo "─────────────────────────────────────────────────────────────"
if ! command -v supervisorctl &> /dev/null; then
    echo "✗ Supervisor n'est pas installé !"
    exit 1
fi
echo "✓ Supervisor installé"
echo ""

echo "2. Status supervisor"
echo "─────────────────────────────────────────────────────────────"
service supervisor status 2>&1 | head -3
echo ""

echo "3. Redémarrage de supervisor"
echo "─────────────────────────────────────────────────────────────"
service supervisor restart
sleep 2
echo "✓ Supervisor redémarré"
echo ""

echo "4. Rechargement de la configuration"
echo "─────────────────────────────────────────────────────────────"
supervisorctl reread
supervisorctl update
echo ""

echo "5. Démarrage des services"
echo "─────────────────────────────────────────────────────────────"
echo "Démarrage backend..."
supervisorctl start backend 2>&1
sleep 3

echo "Démarrage frontend..."
supervisorctl start frontend 2>&1
sleep 2
echo ""

echo "6. Status final"
echo "─────────────────────────────────────────────────────────────"
supervisorctl status
echo ""

echo "7. Vérification des processus"
echo "─────────────────────────────────────────────────────────────"
echo "Backend (Python):"
ps aux | grep "python.*server.py" | grep -v grep || echo "✗ Aucun processus backend"
echo ""
echo "Frontend (Node):"
ps aux | grep "node.*react" | grep -v grep || echo "✗ Aucun processus frontend"
echo ""

echo "8. Ports en écoute"
echo "─────────────────────────────────────────────────────────────"
netstat -tlnp 2>/dev/null | grep -E "8001|3000" || echo "✗ Aucun port backend/frontend"
echo ""

echo "9. Dernières erreurs backend"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/supervisor/backend.err.log ]; then
    echo "30 dernières lignes:"
    tail -30 /var/log/supervisor/backend.err.log
else
    echo "✗ Pas de fichier de log"
fi
echo ""

echo "10. Dernières erreurs frontend"
echo "─────────────────────────────────────────────────────────────"
if [ -f /var/log/supervisor/frontend.err.log ]; then
    echo "20 dernières lignes:"
    tail -20 /var/log/supervisor/frontend.err.log
else
    echo "✗ Pas de fichier de log"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo "DIAGNOSTIC TERMINÉ"
echo ""
BACKEND_STATUS=$(supervisorctl status backend 2>/dev/null | awk '{print $2}')
FRONTEND_STATUS=$(supervisorctl status frontend 2>/dev/null | awk '{print $2}')

if [[ "$BACKEND_STATUS" == "RUNNING" && "$FRONTEND_STATUS" == "RUNNING" ]]; then
    echo "✓ SUCCÈS : Les services fonctionnent !"
else
    echo "✗ ÉCHEC : Les services ne démarrent pas"
    echo ""
    echo "Causes possibles:"
    echo "  • Configuration supervisor manquante ou incorrecte"
    echo "  • Erreur dans le code backend/frontend"
    echo "  • Dépendances manquantes"
    echo "  • Problème de permissions"
    echo ""
    echo "Regardez les logs ci-dessus pour identifier le problème."
fi
echo "════════════════════════════════════════════════════════════"
