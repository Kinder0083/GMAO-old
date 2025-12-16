#!/usr/bin/env bash

###############################################################################
# GMAO Iris v1.1.5 - Script de Mise à Jour
# 
# Ce script met à jour une installation existante vers la v1.1.5
# À exécuter DANS le container LXC (pas sur Proxmox directement)
# 
# NOUVEAUTÉS v1.1.5:
# - Groupement personnalisé des menus par catégories
# - Flèches haut/bas pour réorganiser facilement les menus
# - Correction du service de mise à jour (yarn build automatique)
# - Manuel MQTT Phase 2 mis à jour
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

msg() { echo -e "${BLUE}▶${NC} $1"; }
ok() { echo -e "${GREEN}✓${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        GMAO IRIS v1.1.5 - Script de Mise à Jour               ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Nouveautés:                                                   ║"
echo "║  • Groupement personnalisé des menus par catégories           ║"
echo "║  • Flèches ↑↓ pour réorganiser les menus facilement           ║"
echo "║  • Mise à jour automatique avec rebuild frontend              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
APP_DIR="/opt/gmao-iris"
if [[ ! -d "$APP_DIR" ]]; then
    err "Répertoire $APP_DIR non trouvé. Êtes-vous dans le bon container ?"
fi

cd "$APP_DIR"

# Vérifier Git
if [[ ! -d ".git" ]]; then
    err "Ce n'est pas un dépôt Git. Mise à jour impossible."
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Étape 1/5 : Sauvegarde de la base de données"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_DIR="$APP_DIR/backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

msg "Création du backup MongoDB..."
if command -v mongodump &> /dev/null; then
    mongodump --uri="mongodb://localhost:27017" --db=gmao_iris --out="$BACKUP_DIR" 2>/dev/null
    ok "Backup créé: $BACKUP_DIR"
else
    warn "mongodump non disponible - backup ignoré"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Étape 2/5 : Téléchargement des mises à jour"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

msg "Récupération des dernières modifications depuis GitHub..."

# Stash des modifications locales si nécessaire
if [[ -n $(git status --porcelain) ]]; then
    warn "Modifications locales détectées - sauvegarde automatique"
    git stash save "Auto-stash avant mise à jour v1.1.5 $(date)" 2>/dev/null || true
fi

# Git pull
git pull origin main 2>&1 || {
    warn "Échec du git pull - tentative de reset"
    git fetch origin
    git reset --hard origin/main
}

ok "Code source mis à jour"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Étape 3/5 : Mise à jour des dépendances"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backend
msg "Mise à jour des dépendances Python..."
cd backend
source venv/bin/activate 2>/dev/null || {
    warn "Environnement virtuel non trouvé - création"
    python3 -m venv venv
    source venv/bin/activate
}

pip install -q --upgrade pip
pip install -q -r requirements.txt
ok "Dépendances Python installées"

# Mise à jour du manuel MQTT Phase 2
msg "Mise à jour du manuel MQTT Phase 2..."
if [[ -f "update_mqtt_manual_phase2.py" ]]; then
    python3 update_mqtt_manual_phase2.py 2>/dev/null && ok "Manuel MQTT mis à jour" || warn "Échec mise à jour manuel (non bloquant)"
fi

deactivate
cd ..

# Frontend
msg "Mise à jour des dépendances Node.js..."
cd frontend
yarn install --silent 2>/dev/null
ok "Dépendances Node.js installées"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Étape 4/5 : Compilation du frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

msg "Compilation du frontend React (cela peut prendre 2-3 minutes)..."
CI=false yarn build 2>/dev/null || {
    err "Échec de la compilation du frontend"
}
ok "Frontend compilé avec succès"
cd ..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Étape 5/5 : Redémarrage des services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

msg "Redémarrage du backend..."
supervisorctl restart gmao-iris-backend 2>/dev/null || sudo supervisorctl restart gmao-iris-backend 2>/dev/null || {
    warn "Impossible de redémarrer via supervisorctl"
}

msg "Rechargement de Nginx..."
systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx 2>/dev/null || {
    warn "Impossible de recharger Nginx"
}

sleep 3

# Vérifier le statut
BACKEND_STATUS=$(supervisorctl status gmao-iris-backend 2>/dev/null | grep RUNNING || echo "")

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ MISE À JOUR TERMINÉE !                         ║"
echo "║                    GMAO IRIS v1.1.5                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [[ -n "$BACKEND_STATUS" ]]; then
    ok "Backend: RUNNING"
else
    warn "Backend: Vérifiez les logs avec: tail -f /var/log/gmao-iris-backend.err.log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Nouveautés disponibles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Personnalisation → Organisation du Menu"
echo "   • Créez des catégories pour regrouper vos menus"
echo "   • Utilisez les flèches ↑↓ pour réorganiser l'ordre"
echo "   • Glissez-déposez les menus dans les catégories"
echo ""
echo "✨ Mise à jour automatique améliorée"
echo "   • Le bouton 'Mettre à jour' compile maintenant le frontend"
echo "   • Plus besoin de rebuild manuel après une mise à jour"
echo ""
echo "✨ Manuel MQTT Phase 2"
echo "   • Documentation mise à jour pour le Dashboard IoT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Rechargez votre navigateur (Ctrl+F5) pour voir les changements !"
echo ""
