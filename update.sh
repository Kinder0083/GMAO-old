#!/bin/bash
#
# Script de mise à jour GMAO Iris (à exécuter DANS le container)
# Usage: cd /opt/gmao-iris && ./update.sh
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
msg() { echo -e "${BLUE}▶${NC} $1"; }

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         GMAO IRIS - Mise à Jour Locale                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "backend/server.py" ]; then
    error "Ce script doit être exécuté depuis /opt/gmao-iris"
fi

msg "Arrêt des services..."
supervisorctl stop backend frontend 2>/dev/null || warn "Services déjà arrêtés"
ok "Services arrêtés"

msg "Sauvegarde de la configuration..."
mkdir -p /tmp/gmao-backup
cp backend/.env /tmp/gmao-backup/backend.env 2>/dev/null || warn "Pas de backend/.env"
cp frontend/.env /tmp/gmao-backup/frontend.env 2>/dev/null || warn "Pas de frontend/.env"
ok "Configuration sauvegardée"

msg "Mise à jour du code depuis GitHub..."
echo "  • Fetch..."
git fetch origin --quiet
echo "  • Reset..."
git reset --hard origin/main --quiet
echo "  • Pull..."
git pull origin main --quiet
ok "Code mis à jour"

msg "Restauration de la configuration..."
if [ -f /tmp/gmao-backup/backend.env ]; then
    cp /tmp/gmao-backup/backend.env backend/.env
    ok "backend/.env restauré"
fi
if [ -f /tmp/gmao-backup/frontend.env ]; then
    cp /tmp/gmao-backup/frontend.env frontend/.env
    ok "frontend/.env restauré"
fi
rm -rf /tmp/gmao-backup

msg "Installation des dépendances backend..."
cd backend
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
deactivate
cd ..
ok "Dépendances backend installées"

msg "Installation des dépendances frontend..."
cd frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn install --silent --frozen-lockfile 2>/dev/null || yarn install --silent
ok "Dépendances frontend installées"

msg "Build du frontend (1-2 minutes)..."
yarn build
cd ..
ok "Frontend buildé"

msg "Redémarrage des services..."
supervisorctl restart backend
sleep 2
supervisorctl restart frontend
sleep 3
ok "Services redémarrés"

msg "Vérification finale..."
BACKEND_STATUS=$(supervisorctl status backend | awk '{print $2}')
FRONTEND_STATUS=$(supervisorctl status frontend | awk '{print $2}')

echo ""
if [[ "$BACKEND_STATUS" == "RUNNING" ]]; then
    ok "Backend: RUNNING"
else
    warn "Backend: $BACKEND_STATUS"
    echo "   Logs: tail -f /var/log/supervisor/backend.err.log"
fi

if [[ "$FRONTEND_STATUS" == "RUNNING" ]]; then
    ok "Frontend: RUNNING"
else
    warn "Frontend: $FRONTEND_STATUS"
    echo "   Logs: tail -f /var/log/supervisor/frontend.err.log"
fi

CONTAINER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "════════════════════════════════════════════════════════════"
if [[ "$BACKEND_STATUS" == "RUNNING" && "$FRONTEND_STATUS" == "RUNNING" ]]; then
    echo -e "${GREEN}✓ Mise à jour terminée avec succès !${NC}"
else
    echo -e "${YELLOW}⚠ Mise à jour terminée avec avertissements${NC}"
fi
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Accès: http://$CONTAINER_IP:3000"
echo ""
echo "📊 Commandes utiles:"
echo "   • Logs backend:  tail -f /var/log/supervisor/backend.err.log"
echo "   • Logs frontend: tail -f /var/log/supervisor/frontend.err.log"
echo "   • Status:        supervisorctl status"
echo ""
