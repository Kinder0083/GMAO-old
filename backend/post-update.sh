#!/bin/bash
#===============================================================================
# GMAO IRIS - Script de post-mise à jour
# Ce script est exécuté automatiquement après chaque git pull
# Il garantit que les dépendances sont correctement installées
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/venv"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           GMAO IRIS - Post-Update Hook                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Répertoires:"
echo "   App root: $APP_ROOT"
echo "   Backend:  $BACKEND_DIR"
echo "   Frontend: $FRONTEND_DIR"
echo "   Venv:     $VENV_DIR"
echo ""

# 1. Vérifier/Créer l'environnement virtuel Python
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Étape 1: Environnement virtuel Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "$VENV_DIR" ]; then
    echo "⚠️  Environnement virtuel non trouvé, création..."
    python3 -m venv "$VENV_DIR"
    echo "✅ Environnement virtuel créé"
else
    echo "✅ Environnement virtuel existant"
fi

# 2. Installer/Mettre à jour les dépendances backend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐍 Étape 2: Dépendances Backend Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

"$VENV_DIR/bin/pip" install --upgrade pip wheel setuptools --quiet

if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    echo "📥 Installation des dépendances depuis requirements.txt..."
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt" --quiet
    echo "✅ Dépendances backend installées"
else
    echo "⚠️  requirements.txt non trouvé"
fi

# Installer emergentintegrations (si nécessaire)
echo "📥 Vérification emergentintegrations..."
"$VENV_DIR/bin/pip" install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ --quiet 2>/dev/null || true
echo "✅ emergentintegrations vérifié"

# 3. Mettre à jour le frontend
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚛️  Étape 3: Frontend React"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$FRONTEND_DIR/package.json" ]; then
    cd "$FRONTEND_DIR"
    
    # Utiliser yarn si disponible, sinon npm
    if command -v yarn &> /dev/null; then
        echo "📥 Installation des dépendances frontend (yarn)..."
        yarn install --silent 2>/dev/null
        echo "✅ Dépendances frontend installées"
        
        echo "🔧 Compilation du frontend..."
        CI=false yarn build --silent 2>/dev/null || yarn build
        echo "✅ Frontend compilé"
    else
        echo "📥 Installation des dépendances frontend (npm)..."
        npm install --silent 2>/dev/null
        echo "✅ Dépendances frontend installées"
        
        echo "🔧 Compilation du frontend..."
        CI=false npm run build 2>/dev/null || npm run build
        echo "✅ Frontend compilé"
    fi
else
    echo "⚠️  package.json non trouvé"
fi

# 4. Vérifier la configuration Supervisor
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Étape 4: Configuration Supervisor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SUPERVISOR_CONF="/etc/supervisor/conf.d/gmao-iris-backend.conf"
EXPECTED_UVICORN="$VENV_DIR/bin/uvicorn"

if [ -f "$SUPERVISOR_CONF" ]; then
    # Vérifier si le chemin uvicorn est correct
    if grep -q "$EXPECTED_UVICORN" "$SUPERVISOR_CONF"; then
        echo "✅ Supervisor utilise le bon environnement virtuel"
    else
        echo "⚠️  Correction de la configuration Supervisor..."
        
        # Backup
        cp "$SUPERVISOR_CONF" "${SUPERVISOR_CONF}.backup"
        
        # Créer la nouvelle config
        cat > "$SUPERVISOR_CONF" << EOF
[program:gmao-iris-backend]
directory=$BACKEND_DIR
command=$EXPECTED_UVICORN server:app --host 0.0.0.0 --port 8001
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/gmao-iris-backend.err.log
stdout_logfile=/var/log/gmao-iris-backend.out.log
environment=PYTHONUNBUFFERED=1
EOF
        
        echo "✅ Configuration Supervisor corrigée"
    fi
else
    echo "ℹ️  Création de la configuration Supervisor..."
    cat > "$SUPERVISOR_CONF" << EOF
[program:gmao-iris-backend]
directory=$BACKEND_DIR
command=$EXPECTED_UVICORN server:app --host 0.0.0.0 --port 8001
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/gmao-iris-backend.err.log
stdout_logfile=/var/log/gmao-iris-backend.out.log
environment=PYTHONUNBUFFERED=1
EOF
    echo "✅ Configuration Supervisor créée"
fi

# 5. Redémarrer les services
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Étape 5: Redémarrage des services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v supervisorctl &> /dev/null; then
    supervisorctl reread
    supervisorctl update
    supervisorctl restart gmao-iris-backend
    sleep 3
    supervisorctl status gmao-iris-backend
    echo "✅ Services redémarrés"
else
    echo "⚠️  supervisorctl non disponible"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ MISE À JOUR TERMINÉE                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
