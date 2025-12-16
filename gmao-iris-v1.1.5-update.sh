#!/bin/bash
# ============================================================
# GMAO IRIS - Script de mise à jour v1.1.5
# Inclut: Correction du bouton Réinitialiser + autres fixes
# ============================================================

set -e
INSTALL_DIR="/opt/gmao-iris"

echo "============================================"
echo "   GMAO IRIS - Mise à jour v1.1.5"
echo "============================================"
echo ""

# Vérifier que le dossier existe
if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Erreur: $INSTALL_DIR n'existe pas"
    echo "   Installez d'abord GMAO IRIS"
    exit 1
fi

cd $INSTALL_DIR

# 1. Correction des valeurs order décimales dans MenuOrganizationSection.jsx
echo "[1/3] Correction du bug 'Réinitialiser'..."
MENU_FILE="frontend/src/components/Personnalisation/MenuOrganizationSection.jsx"
if [ -f "$MENU_FILE" ]; then
    sed -i 's/order: 0\.5/order: 1/g' "$MENU_FILE"
    sed -i 's/order: 8\.5/order: 10/g' "$MENU_FILE"
    echo "   ✅ MenuOrganizationSection.jsx corrigé"
else
    echo "   ⚠️ Fichier non trouvé: $MENU_FILE"
fi

# 2. Reconstruire le frontend
echo "[2/3] Reconstruction du frontend..."
cd $INSTALL_DIR/frontend
yarn build
echo "   ✅ Frontend reconstruit"

# 3. Redémarrer les services
echo "[3/3] Redémarrage des services..."
cd $INSTALL_DIR

# Trouver le bon nom du service frontend
if supervisorctl status gmao-frontend >/dev/null 2>&1; then
    sudo supervisorctl restart gmao-frontend
elif supervisorctl status frontend >/dev/null 2>&1; then
    sudo supervisorctl restart frontend
else
    echo "   ⚠️ Service frontend non trouvé, redémarrage manuel requis"
    echo "   Exécutez: sudo supervisorctl status"
fi

echo ""
echo "============================================"
echo "   ✅ MISE À JOUR v1.1.5 TERMINÉE !"
echo "============================================"
echo ""
echo "Rafraîchissez votre navigateur (Ctrl+Shift+R)"
echo ""
