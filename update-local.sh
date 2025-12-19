#!/bin/bash
#
# Script de mise à jour GMAO Iris (à exécuter DANS le container)
# Usage: cd /opt/gmao-iris && ./update-local.sh
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

echo "════════════════════════════════════════════════════════"
echo "  Mise à jour GMAO Iris (local)"
echo "════════════════════════════════════════════════════════"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "backend/server.py" ]; then
    error "Ce script doit être exécuté depuis /opt/gmao-iris"
fi

msg "Arrêt des services..."
supervisorctl stop backend frontend 2>/dev/null || warn "Services déjà arrêtés"

msg "Sauvegarde de la configuration..."
cp backend/.env backend/.env.backup 2>/dev/null || warn "Pas de backend/.env"
cp frontend/.env frontend/.env.backup 2>/dev/null || warn "Pas de frontend/.env"
ok "Configuration sauvegardée"

msg "Mise à jour du code depuis GitHub..."
git fetch origin
git reset --hard origin/main
git pull origin main
ok "Code mis à jour"

msg "Restauration de la configuration..."
if [ -f backend/.env.backup ]; then
    cp backend/.env.backup backend/.env
    rm backend/.env.backup
    ok "backend/.env restauré"
fi
if [ -f frontend/.env.backup ]; then
    cp frontend/.env.backup frontend/.env
    rm frontend/.env.backup
    ok "frontend/.env restauré"
fi

msg "Mise à jour des dépendances backend..."
cd backend
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
deactivate
cd ..
ok "Dépendances backend mises à jour"

msg "Mise à jour des dépendances frontend..."
cd frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn install --silent --frozen-lockfile 2>/dev/null || yarn install --silent
ok "Dépendances frontend mises à jour"

msg "Build du frontend..."
yarn build
cd ..
ok "Frontend buildé"

msg "Redémarrage des services..."
supervisorctl restart backend
supervisorctl restart frontend
sleep 3
ok "Services redémarrés"

msg "Vérification des services..."
BACKEND_STATUS=$(supervisorctl status backend | awk '{print $2}')
FRONTEND_STATUS=$(supervisorctl status frontend | awk '{print $2}')

if [[ "$BACKEND_STATUS" == "RUNNING" ]]; then
    ok "Backend: RUNNING"
else
    warn "Backend: $BACKEND_STATUS"
    echo "   Voir les logs: tail -f /var/log/supervisor/backend.err.log"
fi

if [[ "$FRONTEND_STATUS" == "RUNNING" ]]; then
    ok "Frontend: RUNNING"
else
    warn "Frontend: $FRONTEND_STATUS"
    echo "   Voir les logs: tail -f /var/log/supervisor/frontend.err.log"
fi

CONTAINER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Mise à jour terminée !${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Accès: http://$CONTAINER_IP:3000"
echo ""
