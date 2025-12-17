#!/bin/bash
#============================================================================
# GMAO IRIS - Réactivation de la recherche intuitive du manuel
# À exécuter sur les installations existantes
#============================================================================

echo "🔧 Réactivation de la recherche intuitive du manuel..."

cd /opt/gmao-iris

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "frontend/src/components/Common/ManualButton.jsx" ]; then
    echo "❌ Erreur: Fichier ManualButton.jsx non trouvé"
    echo "   Êtes-vous dans le bon répertoire ?"
    exit 1
fi

echo "✓ Fichiers trouvés"

# Rebuilder le frontend pour appliquer les changements
echo "📦 Rebuild du frontend..."
cd frontend
CI=false yarn build

if [ $? -eq 0 ]; then
    echo "✅ Frontend rebuild avec succès"
    
    # Redémarrer le frontend
    echo "🔄 Redémarrage du service frontend..."
    sudo supervisorctl restart gmao-frontend || supervisorctl restart frontend
    
    echo ""
    echo "✅ Recherche intuitive réactivée avec succès !"
    echo ""
    echo "La recherche dans le manuel devrait maintenant fonctionner."
    echo "Actualisez votre navigateur (Ctrl+F5) pour voir les changements."
else
    echo "❌ Erreur lors du rebuild du frontend"
    exit 1
fi
