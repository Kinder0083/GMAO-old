#!/bin/bash
# Script de réparation des dépendances GMAO IRIS
# Exécuter en root: bash fix_dependencies.sh

set -e

echo "=============================================="
echo "🔧 RÉPARATION DÉPENDANCES GMAO IRIS"
echo "=============================================="

INSTALL_DIR="/opt/gmao-iris"
VENV_DIR="$INSTALL_DIR/venv"

# 1. Vérifier/Créer l'environnement virtuel
echo ""
echo "📌 Étape 1: Vérification environnement virtuel..."
if [ ! -d "$VENV_DIR" ]; then
    echo "   Création de l'environnement virtuel..."
    python3 -m venv "$VENV_DIR"
    echo "   ✅ Environnement virtuel créé"
else
    echo "   ✅ Environnement virtuel existant"
fi

# 2. Activer l'environnement virtuel
echo ""
echo "📌 Étape 2: Activation environnement virtuel..."
source "$VENV_DIR/bin/activate"
echo "   ✅ Environnement activé: $(which python3)"

# 3. Mettre à jour pip
echo ""
echo "📌 Étape 3: Mise à jour pip..."
pip install --upgrade pip wheel setuptools

# 4. Installer les dépendances
echo ""
echo "📌 Étape 4: Installation des dépendances..."
if [ -f "$INSTALL_DIR/backend/requirements.txt" ]; then
    pip install -r "$INSTALL_DIR/backend/requirements.txt"
    echo "   ✅ Dépendances installées depuis requirements.txt"
else
    echo "   ⚠️  requirements.txt non trouvé, installation manuelle..."
    pip install fastapi uvicorn motor pymongo pydantic bcrypt python-jose \
        apscheduler httpx aiofiles pandas python-dotenv python-multipart \
        aiohttp websockets passlib cryptography email-validator pytz
fi

# 5. Installer emergentintegrations si nécessaire
echo ""
echo "📌 Étape 5: Installation emergentintegrations..."
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ || true

# 6. Vérifier la configuration supervisor
echo ""
echo "📌 Étape 6: Vérification configuration Supervisor..."
SUPERVISOR_CONF="/etc/supervisor/conf.d/gmao-iris.conf"
if [ -f "$SUPERVISOR_CONF" ]; then
    # Vérifier que le bon python est utilisé
    if grep -q "$VENV_DIR/bin" "$SUPERVISOR_CONF"; then
        echo "   ✅ Supervisor utilise le bon environnement virtuel"
    else
        echo "   ⚠️  Correction du chemin Python dans Supervisor..."
        sed -i "s|command=uvicorn|command=$VENV_DIR/bin/uvicorn|g" "$SUPERVISOR_CONF"
        sed -i "s|command=python3|command=$VENV_DIR/bin/python3|g" "$SUPERVISOR_CONF"
        echo "   ✅ Configuration Supervisor corrigée"
    fi
else
    echo "   ❌ Fichier supervisor non trouvé: $SUPERVISOR_CONF"
fi

# 7. Redémarrer les services
echo ""
echo "📌 Étape 7: Redémarrage des services..."
supervisorctl reread
supervisorctl update
supervisorctl restart gmao-iris-backend
sleep 3
supervisorctl status

echo ""
echo "=============================================="
echo "✅ RÉPARATION TERMINÉE"
echo "=============================================="
echo ""
echo "Vérifiez le statut avec: supervisorctl status"
echo "Vérifiez les logs avec: tail -f /var/log/supervisor/gmao-iris-backend.err.log"
