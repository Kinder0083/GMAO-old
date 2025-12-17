#!/bin/bash
#============================================================================
# GMAO IRIS - Réactivation de la recherche intuitive du manuel
# À exécuter sur les installations existantes
# Détecte automatiquement le répertoire d'installation
#============================================================================

echo "🔧 Réactivation de la recherche intuitive du manuel..."
echo ""

# Détecter le répertoire d'installation
if [ -d "/opt/gmao-iris" ]; then
    APP_DIR="/opt/gmao-iris"
elif [ -d "/opt/GMAO" ]; then
    APP_DIR="/opt/GMAO"
elif [ -d "$HOME/gmao-iris" ]; then
    APP_DIR="$HOME/gmao-iris"
elif [ -d "$HOME/GMAO" ]; then
    APP_DIR="$HOME/GMAO"
else
    echo "❌ Répertoire GMAO non trouvé"
    echo "   Chemins recherchés:"
    echo "   - /opt/gmao-iris"
    echo "   - /opt/GMAO"
    echo "   - $HOME/gmao-iris"
    echo "   - $HOME/GMAO"
    echo ""
    read -p "Entrez le chemin complet de votre installation GMAO: " APP_DIR
    
    if [ ! -d "$APP_DIR" ]; then
        echo "❌ Répertoire introuvable: $APP_DIR"
        exit 1
    fi
fi

echo "📂 Répertoire détecté: $APP_DIR"

cd "$APP_DIR"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "frontend/src/components/Common/ManualButton.jsx" ]; then
    echo "❌ Erreur: Fichier ManualButton.jsx non trouvé dans $APP_DIR"
    echo "   Le répertoire ne semble pas contenir une installation GMAO valide"
    exit 1
fi

echo "✓ Fichiers trouvés"

# Rebuilder le frontend pour appliquer les changements
echo "📦 Rebuild du frontend..."
cd frontend

# Vérifier que yarn est installé
if ! command -v yarn &> /dev/null; then
    echo "⚠️  Yarn non trouvé, installation..."
    npm install -g yarn
fi

CI=false yarn build

if [ $? -eq 0 ]; then
    echo "✅ Frontend rebuild avec succès"
    
    # Redémarrer le frontend
    echo "🔄 Redémarrage du service frontend..."
    supervisorctl restart gmao-frontend 2>/dev/null || \
    supervisorctl restart frontend 2>/dev/null || \
    sudo supervisorctl restart gmao-frontend 2>/dev/null || \
    sudo supervisorctl restart frontend 2>/dev/null || \
    echo "⚠️  Impossible de redémarrer automatiquement. Redémarrez manuellement avec: supervisorctl restart frontend"
    
    echo ""
    echo "✅ Recherche intuitive réactivée avec succès !"
    echo ""
    echo "📍 Installation: $APP_DIR"
    echo "🌐 Actualisez votre navigateur (Ctrl+F5) pour voir les changements."
else
    echo "❌ Erreur lors du rebuild du frontend"
    exit 1
fi
