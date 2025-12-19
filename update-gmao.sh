#!/bin/bash
#
# Script de mise à jour automatique GMAO Iris sur Proxmox
# Auteur: GMAO Iris
# Version: 2.0
#
# Usage:
#   ./update-gmao.sh <CONTAINER_ID>
#   Exemple: ./update-gmao.sh 104
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Fonctions d'affichage
ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
msg() { echo -e "${BLUE}▶${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC} $1"; }

# Bannière
banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         GMAO IRIS - Mise à Jour Automatique               ║"
    echo "║                  Version 2.0                               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Vérifier les arguments
if [ -z "$1" ]; then
    banner
    error "Usage: $0 <Container_ID>\n   Exemple: $0 104"
fi

CTID=$1
APP_DIR="/opt/gmao-iris"

banner

msg "Vérification du container $CTID..."

# Vérifier que le container existe
if ! pct status $CTID >/dev/null 2>&1; then
    error "Container $CTID introuvable"
fi

# Vérifier l'état du container
STATUS=$(pct status $CTID | awk '{print $2}')
if [ "$STATUS" != "running" ]; then
    error "Container $CTID n'est pas démarré (état: $STATUS)"
fi
ok "Container $CTID actif"

# Vérifier l'installation
msg "Vérification de l'installation..."
if ! pct exec $CTID -- test -d "$APP_DIR"; then
    error "Application non trouvée dans $APP_DIR"
fi
if ! pct exec $CTID -- test -f "$APP_DIR/backend/server.py"; then
    error "Fichiers backend manquants"
fi
ok "Installation trouvée dans $APP_DIR"

# Sauvegarder la configuration
msg "Sauvegarde de la configuration..."
pct exec $CTID -- bash <<'BACKUP'
cd /opt/gmao-iris
mkdir -p /tmp/gmao-backup
cp -f backend/.env /tmp/gmao-backup/backend.env 2>/dev/null || true
cp -f frontend/.env /tmp/gmao-backup/frontend.env 2>/dev/null || true
BACKUP
ok "Configuration sauvegardée dans /tmp/gmao-backup"

# Arrêt des services
msg "Arrêt des services..."
pct exec $CTID -- bash <<'STOP'
cd /opt/gmao-iris
supervisorctl stop backend 2>/dev/null || true
supervisorctl stop frontend 2>/dev/null || true
sleep 1
STOP
ok "Services arrêtés"

# Mise à jour du code
msg "Mise à jour du code depuis GitHub..."
pct exec $CTID -- bash <<'UPDATE'
cd /opt/gmao-iris
echo "  • Fetch des modifications..."
git fetch origin --quiet
echo "  • Reset du dépôt local..."
git reset --hard origin/main --quiet
echo "  • Pull des dernières modifications..."
git pull origin main --quiet
UPDATE

if [ $? -eq 0 ]; then
    ok "Code mis à jour depuis GitHub"
else
    error "Échec de la mise à jour Git"
fi

# Restaurer la configuration
msg "Restauration de la configuration..."
pct exec $CTID -- bash <<'RESTORE'
cd /opt/gmao-iris
if [ -f /tmp/gmao-backup/backend.env ]; then
    cp -f /tmp/gmao-backup/backend.env backend/.env
    echo "  • backend/.env restauré"
fi
if [ -f /tmp/gmao-backup/frontend.env ]; then
    cp -f /tmp/gmao-backup/frontend.env frontend/.env
    echo "  • frontend/.env restauré"
fi
rm -rf /tmp/gmao-backup
RESTORE
ok "Configuration restaurée"

# Mise à jour des dépendances backend
msg "Mise à jour des dépendances backend..."
pct exec $CTID -- bash <<'BACKEND_DEPS'
cd /opt/gmao-iris/backend
source venv/bin/activate
pip install --quiet --upgrade pip 2>/dev/null
pip install --quiet -r requirements.txt
deactivate
BACKEND_DEPS

if [ $? -eq 0 ]; then
    ok "Dépendances backend installées"
else
    warn "Problème avec les dépendances backend (peut être non bloquant)"
fi

# Mise à jour des dépendances frontend
msg "Mise à jour des dépendances frontend..."
pct exec $CTID -- bash <<'FRONTEND_DEPS'
cd /opt/gmao-iris/frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn install --silent --frozen-lockfile 2>/dev/null || yarn install --silent 2>/dev/null
FRONTEND_DEPS

if [ $? -eq 0 ]; then
    ok "Dépendances frontend installées"
else
    warn "Problème avec les dépendances frontend"
fi

# Build du frontend
msg "Build du frontend (peut prendre 1-2 minutes)..."
pct exec $CTID -- bash <<'BUILD'
cd /opt/gmao-iris/frontend
export NODE_OPTIONS='--max_old_space_size=2048'
yarn build 2>&1 | grep -i "compiled\|error\|warning" || true
BUILD

if [ $? -eq 0 ]; then
    ok "Frontend buildé avec succès"
else
    error "Échec du build frontend"
fi

# Redémarrage des services
msg "Redémarrage des services..."
pct exec $CTID -- bash <<'RESTART'
cd /opt/gmao-iris
supervisorctl restart backend
sleep 2
supervisorctl restart frontend
sleep 2
RESTART
ok "Services redémarrés"

# Vérification finale
msg "Vérification finale..."
sleep 3

BACKEND_STATUS=$(pct exec $CTID -- supervisorctl status backend 2>/dev/null | awk '{print $2}')
FRONTEND_STATUS=$(pct exec $CTID -- supervisorctl status frontend 2>/dev/null | awk '{print $2}')

echo ""
if [[ "$BACKEND_STATUS" == "RUNNING" ]]; then
    ok "Backend: RUNNING"
else
    warn "Backend: $BACKEND_STATUS"
    info "Vérifier les logs: pct exec $CTID -- tail -50 /var/log/supervisor/backend.err.log"
fi

if [[ "$FRONTEND_STATUS" == "RUNNING" ]]; then
    ok "Frontend: RUNNING"
else
    warn "Frontend: $FRONTEND_STATUS"
    info "Vérifier les logs: pct exec $CTID -- tail -50 /var/log/supervisor/frontend.err.log"
fi

# Obtenir l'IP
CONTAINER_IP=$(pct exec $CTID -- hostname -I 2>/dev/null | awk '{print $1}')

# Résumé final
echo ""
echo "════════════════════════════════════════════════════════════"
if [[ "$BACKEND_STATUS" == "RUNNING" && "$FRONTEND_STATUS" == "RUNNING" ]]; then
    echo -e "${GREEN}✓ Mise à jour terminée avec succès !${NC}"
else
    echo -e "${YELLOW}⚠ Mise à jour terminée avec avertissements${NC}"
fi
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Accès à l'application:"
echo "   • Local:  http://$CONTAINER_IP:3000"
echo "   • Direct: http://$CONTAINER_IP"
echo ""
echo "📊 Commandes utiles:"
echo "   • Entrer dans le container: pct enter $CTID"
echo "   • Logs backend:  pct exec $CTID -- tail -f /var/log/supervisor/backend.err.log"
echo "   • Logs frontend: pct exec $CTID -- tail -f /var/log/supervisor/frontend.err.log"
echo "   • Status:        pct exec $CTID -- supervisorctl status"
echo ""
