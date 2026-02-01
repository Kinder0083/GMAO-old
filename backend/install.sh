#!/bin/bash
#
# Script d'installation GMAO Iris
# Ce script installe toutes les dépendances système et Python nécessaires
#
# Usage: sudo bash install.sh
#

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Installation GMAO Iris              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Vérifier qu'on est root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Erreur: Ce script doit être exécuté en tant que root (sudo)${NC}"
  exit 1
fi

# Répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}📁 Répertoire de l'application: $APP_DIR${NC}"
echo ""

# ============================================
# 1. Mise à jour du système
# ============================================
echo -e "${GREEN}[1/5] Mise à jour du système...${NC}"
apt update -qq
echo -e "${GREEN}✅ Système mis à jour${NC}"
echo ""

# ============================================
# 2. Installation des paquets système
# ============================================
echo -e "${GREEN}[2/5] Installation des paquets système...${NC}"

SYSTEM_PACKAGES="python3 python3-pip python3-venv python3-full ffmpeg libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender1 libxml2-dev libxslt1-dev smbclient curl wget"

apt install -y $SYSTEM_PACKAGES > /dev/null 2>&1

echo -e "${GREEN}✅ Paquets système installés${NC}"
echo ""

# ============================================
# 3. Création/Mise à jour du virtualenv
# ============================================
echo -e "${GREEN}[3/5] Configuration de l'environnement Python...${NC}"

VENV_DIR="$SCRIPT_DIR/venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "   Création du virtualenv..."
    python3 -m venv "$VENV_DIR"
fi

# Activer le virtualenv
source "$VENV_DIR/bin/activate"

# Mettre à jour pip
pip install --upgrade pip -q

echo -e "${GREEN}✅ Environnement Python configuré${NC}"
echo ""

# ============================================
# 4. Installation des dépendances Python
# ============================================
echo -e "${GREEN}[4/5] Installation des dépendances Python...${NC}"

# Installer les dépendances standards
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    pip install -r "$SCRIPT_DIR/requirements.txt" -q
fi

# Installer emergentintegrations (index personnalisé)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -q 2>/dev/null || true

echo -e "${GREEN}✅ Dépendances Python installées${NC}"
echo ""

# ============================================
# 5. Création des répertoires nécessaires
# ============================================
echo -e "${GREEN}[5/5] Création des répertoires...${NC}"

# Répertoires pour les caméras
mkdir -p /app/data/cameras/snapshots
mkdir -p /app/data/cameras/hls

# Permissions
chown -R www-data:www-data /app/data 2>/dev/null || true

echo -e "${GREEN}✅ Répertoires créés${NC}"
echo ""

# ============================================
# Résumé
# ============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Installation terminée !             ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Pour démarrer l'application:"
echo -e "  ${YELLOW}cd $SCRIPT_DIR${NC}"
echo -e "  ${YELLOW}source venv/bin/activate${NC}"
echo -e "  ${YELLOW}uvicorn server:app --host 0.0.0.0 --port 8001${NC}"
echo ""
echo -e "Ou avec supervisor:"
echo -e "  ${YELLOW}supervisorctl restart backend${NC}"
echo ""
