#!/bin/bash
#
# Script de mise à jour automatique pour GMAO Iris sur Proxmox
# Usage: ./update-gmao-proxmox.sh <CTID>
# Exemple: ./update-gmao-proxmox.sh 104
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
msg() { echo -e "${BLUE}▶${NC} $1"; }

# Vérifier les arguments
if [ -z "$1" ]; then
    error "Usage: $0 <Container_ID>"
fi

CTID=$1

# Vérifier que le container existe
if ! pct status $CTID >/dev/null 2>&1; then
    error "Container $CTID introuvable"
fi

# Vérifier que le container est démarré
STATUS=$(pct status $CTID | awk '{print $2}')
if [ "$STATUS" != "running" ]; then
    error "Container $CTID n'est pas démarré (status: $STATUS)"
fi

echo "════════════════════════════════════════════════════════"
echo "  Mise à jour GMAO Iris - Container $CTID"
echo "════════════════════════════════════════════════════════"
echo ""

msg "Vérification de l'installation..."
pct exec $CTID -- bash -c "test -d /opt/gmao-iris" || error "Application non trouvée dans /opt/gmao-iris"
ok "Application trouvée"

msg "Arrêt des services..."
pct exec $CTID -- bash -c "cd /opt/gmao-iris && supervisorctl stop backend frontend" 2>/dev/null || warn "Services déjà arrêtés"

msg "Sauvegarde de la configuration..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris
cp backend/.env backend/.env.backup
cp frontend/.env frontend/.env.backup
" || warn "Pas de fichiers .env à sauvegarder"
ok "Configuration sauvegardée"

msg "Mise à jour du code depuis GitHub..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris
git fetch origin
git reset --hard origin/main
git pull origin main
" || error "Échec de la mise à jour Git"
ok "Code mis à jour"

msg "Restauration de la configuration..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris
if [ -f backend/.env.backup ]; then
    cp backend/.env.backup backend/.env
    rm backend/.env.backup
fi
if [ -f frontend/.env.backup ]; then
    cp frontend/.env.backup frontend/.env
    rm frontend/.env.backup
fi
" || warn "Pas de sauvegarde à restaurer"
ok "Configuration restaurée"

msg "Installation des dépendances backend..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/backend
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
" || warn "Problème lors de l'installation des dépendances backend"
ok "Dépendances backend installées"

msg "Installation des dépendances frontend..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn install --silent --frozen-lockfile 2>/dev/null || yarn install --silent
" || warn "Problème lors de l'installation des dépendances frontend"
ok "Dépendances frontend installées"

msg "Build du frontend..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn build
" || error "Échec du build frontend"
ok "Frontend buildé"

msg "Redémarrage des services..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris
supervisorctl restart backend
supervisorctl restart frontend
sleep 3
"
ok "Services redémarrés"

msg "Vérification des services..."
BACKEND_STATUS=$(pct exec $CTID -- supervisorctl status backend | awk '{print $2}')
FRONTEND_STATUS=$(pct exec $CTID -- supervisorctl status frontend | awk '{print $2}')

if [[ "$BACKEND_STATUS" == "RUNNING" ]]; then
    ok "Backend: RUNNING"
else
    warn "Backend: $BACKEND_STATUS (vérifier les logs)"
fi

if [[ "$FRONTEND_STATUS" == "RUNNING" ]]; then
    ok "Frontend: RUNNING"
else
    warn "Frontend: $FRONTEND_STATUS (vérifier les logs)"
fi

# Obtenir l'IP du container
CONTAINER_IP=$(pct exec $CTID -- hostname -I | awk '{print $1}')

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Mise à jour terminée avec succès !${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Accès à l'application:"
echo "  • http://$CONTAINER_IP:3000"
echo ""
echo "Pour voir les logs:"
echo "  • Backend:  pct exec $CTID -- tail -f /var/log/supervisor/backend.err.log"
echo "  • Frontend: pct exec $CTID -- tail -f /var/log/supervisor/frontend.err.log"
echo ""
