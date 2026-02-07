#!/bin/bash
#===============================================================================
# GMAO IRIS - Script de mise à jour manuelle
# Usage: ./update.sh
#
# Ce script effectue:
# 1. git pull pour récupérer le nouveau code
# 2. Installation des dépendances Python
# 3. Compilation du frontend
# 4. Redémarrage du backend
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              GMAO IRIS - Mise à Jour Manuelle                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Récupérer le nouveau code
echo "📥 Récupération du code depuis GitHub..."
git fetch origin main

# Vérifier s'il y a des modifications locales
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Modifications locales détectées, stash temporaire..."
    git stash
    STASHED=true
fi

# Pull les changements
git pull origin main --allow-unrelated-histories || git reset --hard origin/main

# Restaurer les modifications locales si nécessaire
if [ "$STASHED" = true ]; then
    echo "🔄 Restauration des modifications locales..."
    git stash pop || true
fi

echo "✅ Code mis à jour"
echo ""

# 2. Exécuter le script post-update
if [ -f "backend/post-update.sh" ]; then
    echo "🔄 Exécution du post-update..."
    bash backend/post-update.sh
else
    # Fallback si post-update.sh n'existe pas
    echo "⚠️  Script post-update.sh non trouvé, installation manuelle..."
    
    # Backend
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        pip install -r requirements.txt --quiet
        deactivate
    fi
    
    # Frontend
    cd ../frontend
    if command -v yarn &> /dev/null; then
        yarn install --silent
        CI=false yarn build
    else
        npm install --silent
        CI=false npm run build
    fi
    
    # Redémarrer
    supervisorctl restart gmao-iris-backend
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              ✅ MISE À JOUR TERMINÉE !                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
