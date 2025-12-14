#!/bin/bash

################################################################################
# Script d'installation robuste pour GMAO Iris
# Version: 1.0.0
# Ce script configure automatiquement l'environnement complet
################################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
LOG_FILE="/var/log/gmao-iris-setup.log"

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fonction pour vérifier la version minimale
version_gte() {
    test "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2"
}

################################################################################
# 1. Vérification des prérequis système
################################################################################

check_system_requirements() {
    log_info "======================================"
    log_info "Vérification des prérequis système..."
    log_info "======================================"
    
    local all_ok=true
    
    # Vérifier Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        if version_gte "${PYTHON_VERSION}" "3.8.0"; then
            log_success "Python ${PYTHON_VERSION} installé"
        else
            log_error "Python version >= 3.8 requis (trouvé: ${PYTHON_VERSION})"
            all_ok=false
        fi
    else
        log_error "Python 3 n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier pip
    if command_exists pip3; then
        log_success "pip3 installé"
    else
        log_error "pip3 n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        if version_gte "${NODE_VERSION}" "16.0.0"; then
            log_success "Node.js ${NODE_VERSION} installé"
        else
            log_error "Node.js version >= 16 requis (trouvé: ${NODE_VERSION})"
            all_ok=false
        fi
    else
        log_error "Node.js n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier yarn
    if command_exists yarn; then
        YARN_VERSION=$(yarn --version)
        log_success "Yarn ${YARN_VERSION} installé"
    else
        log_error "Yarn n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier MongoDB
    if command_exists mongod; then
        log_success "MongoDB installé"
    else
        log_warning "MongoDB n'est pas installé (requis si base de données locale)"
    fi
    
    # Vérifier Supervisor
    if command_exists supervisorctl; then
        log_success "Supervisor installé"
    else
        log_error "Supervisor n'est pas installé"
        all_ok=false
    fi
    
    # Vérifier Nginx
    if command_exists nginx; then
        log_success "Nginx installé"
    else
        log_warning "Nginx n'est pas installé (optionnel pour proxy)"
    fi
    
    if [ "$all_ok" = false ]; then
        log_error "Des prérequis sont manquants. Installation impossible."
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits ✓"
    echo ""
}

################################################################################
# 2. Configuration de l'environnement Python
################################################################################

setup_python_environment() {
    log_info "======================================"
    log_info "Configuration environnement Python..."
    log_info "======================================"
    
    cd "${BACKEND_DIR}"
    
    # Créer un environnement virtuel si nécessaire
    if [ ! -d "venv" ]; then
        log_info "Création de l'environnement virtuel Python..."
        python3 -m venv venv
        log_success "Environnement virtuel créé"
    else
        log_info "Environnement virtuel déjà existant"
    fi
    
    # Activer l'environnement virtuel
    source venv/bin/activate
    
    # Mettre à jour pip
    log_info "Mise à jour de pip..."
    pip install --upgrade pip --quiet
    
    # Installer les dépendances
    log_info "Installation des dépendances Python..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet
        log_success "Dépendances Python installées"
    else
        log_error "requirements.txt introuvable"
        exit 1
    fi
    
    # Vérifier paho-mqtt (dépendance critique)
    if pip show paho-mqtt >/dev/null 2>&1; then
        log_success "paho-mqtt installé ✓"
    else
        log_warning "paho-mqtt manquant, installation..."
        pip install paho-mqtt
    fi
    
    deactivate
    
    log_success "Environnement Python configuré ✓"
    echo ""
}

################################################################################
# 3. Configuration de l'environnement Node.js
################################################################################

setup_nodejs_environment() {
    log_info "======================================"
    log_info "Configuration environnement Node.js..."
    log_info "======================================"
    
    cd "${FRONTEND_DIR}"
    
    # Installer les dépendances
    log_info "Installation des dépendances Node.js (cela peut prendre quelques minutes)..."
    if [ -f "package.json" ]; then
        yarn install --silent
        log_success "Dépendances Node.js installées"
    else
        log_error "package.json introuvable"
        exit 1
    fi
    
    log_success "Environnement Node.js configuré ✓"
    echo ""
}

################################################################################
# 4. Configuration des fichiers .env
################################################################################

setup_environment_files() {
    log_info "======================================"
    log_info "Configuration des fichiers .env..."
    log_info "======================================"
    
    # Backend .env
    if [ ! -f "${BACKEND_DIR}/.env" ]; then
        log_warning "Backend .env manquant, création d'un template..."
        cat > "${BACKEND_DIR}/.env" <<EOF
# Configuration MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=gmao_iris

# Configuration JWT
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Configuration Email (optionnel)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=noreply@gmao-iris.com
EMAIL_PASSWORD=

# Configuration MQTT (optionnel)
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
EOF
        log_success "Template backend .env créé"
    else
        log_info "Backend .env déjà existant"
    fi
    
    # Frontend .env
    if [ ! -f "${FRONTEND_DIR}/.env" ]; then
        log_warning "Frontend .env manquant, création..."
        cat > "${FRONTEND_DIR}/.env" <<EOF
# URL du backend
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
        log_success "Frontend .env créé"
    else
        log_info "Frontend .env déjà existant"
    fi
    
    log_success "Fichiers .env configurés ✓"
    echo ""
}

################################################################################
# 5. Configuration Supervisor
################################################################################

setup_supervisor() {
    log_info "======================================"
    log_info "Configuration Supervisor..."
    log_info "======================================"
    
    # Créer le fichier de configuration Supervisor
    SUPERVISOR_CONF="/etc/supervisor/conf.d/gmao-iris.conf"
    
    log_info "Création du fichier de configuration Supervisor..."
    
    sudo tee "${SUPERVISOR_CONF}" > /dev/null <<EOF
[program:gmao-iris-backend]
directory=${BACKEND_DIR}
command=${BACKEND_DIR}/venv/bin/python server.py
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
user=${USER}
environment=PATH="${BACKEND_DIR}/venv/bin:%(ENV_PATH)s"

[program:gmao-iris-frontend]
directory=${FRONTEND_DIR}
command=/usr/bin/yarn start
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
user=${USER}
environment=PORT="3000"
EOF
    
    log_success "Configuration Supervisor créée"
    
    # Recharger Supervisor
    log_info "Rechargement de Supervisor..."
    sudo supervisorctl reread
    sudo supervisorctl update
    
    log_success "Supervisor configuré ✓"
    echo ""
}

################################################################################
# 6. Configuration Nginx (optionnel)
################################################################################

setup_nginx() {
    log_info "======================================"
    log_info "Configuration Nginx (optionnel)..."
    log_info "======================================"
    
    if ! command_exists nginx; then
        log_warning "Nginx non installé, configuration ignorée"
        return
    fi
    
    read -p "Voulez-vous configurer Nginx comme reverse proxy ? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Configuration Nginx ignorée"
        return
    fi
    
    read -p "Nom de domaine (ex: gmao.example.com): " DOMAIN_NAME
    
    NGINX_CONF="/etc/nginx/sites-available/gmao-iris"
    
    log_info "Création de la configuration Nginx..."
    
    sudo tee "${NGINX_CONF}" > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$host;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    client_max_body_size 50M;
}
EOF
    
    # Activer le site
    if [ ! -L "/etc/nginx/sites-enabled/gmao-iris" ]; then
        sudo ln -s "${NGINX_CONF}" /etc/nginx/sites-enabled/
        log_success "Site Nginx activé"
    fi
    
    # Tester la configuration
    sudo nginx -t
    
    # Recharger Nginx
    sudo systemctl reload nginx
    
    log_success "Nginx configuré ✓"
    echo ""
}

################################################################################
# 7. Initialisation de la base de données
################################################################################

init_database() {
    log_info "======================================"
    log_info "Initialisation de la base de données..."
    log_info "======================================"
    
    cd "${BACKEND_DIR}"
    source venv/bin/activate
    
    # Créer l'utilisateur admin de test
    if [ -f "create_test_admin.py" ]; then
        log_info "Création de l'utilisateur admin de test..."
        python3 create_test_admin.py
        log_success "Utilisateur admin créé (admin@test.com / testpassword)"
    fi
    
    deactivate
    
    log_success "Base de données initialisée ✓"
    echo ""
}

################################################################################
# 8. Démarrage des services
################################################################################

start_services() {
    log_info "======================================"
    log_info "Démarrage des services..."
    log_info "======================================"
    
    sudo supervisorctl restart gmao-iris-backend
    sudo supervisorctl restart gmao-iris-frontend
    
    sleep 3
    
    # Vérifier le statut
    sudo supervisorctl status gmao-iris-backend gmao-iris-frontend
    
    log_success "Services démarrés ✓"
    echo ""
}

################################################################################
# 9. Résumé final
################################################################################

print_summary() {
    echo ""
    echo "======================================"
    log_success "Installation terminée avec succès !"
    echo "======================================"
    echo ""
    echo "📋 Informations importantes:"
    echo ""
    echo "  🌐 URL Frontend:  http://localhost:3000"
    echo "  🔧 URL Backend:   http://localhost:8001"
    echo ""
    echo "  👤 Compte admin:"
    echo "     Email:    admin@test.com"
    echo "     Password: testpassword"
    echo ""
    echo "  📂 Répertoires:"
    echo "     Backend:  ${BACKEND_DIR}"
    echo "     Frontend: ${FRONTEND_DIR}"
    echo ""
    echo "  📝 Logs:"
    echo "     Backend:  /var/log/supervisor/backend.*.log"
    echo "     Frontend: /var/log/supervisor/frontend.*.log"
    echo "     Setup:    ${LOG_FILE}"
    echo ""
    echo "  🔄 Commandes utiles:"
    echo "     Status:   sudo supervisorctl status"
    echo "     Restart:  sudo supervisorctl restart gmao-iris-backend gmao-iris-frontend"
    echo "     Logs:     sudo tail -f /var/log/supervisor/backend.out.log"
    echo ""
    echo "======================================"
    echo ""
}

################################################################################
# Main
################################################################################

main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   GMAO Iris - Installation Robuste    ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Créer le fichier de log
    sudo touch "${LOG_FILE}"
    sudo chmod 666 "${LOG_FILE}"
    
    log_info "Début de l'installation - $(date)"
    echo ""
    
    # Exécuter les étapes
    check_system_requirements
    setup_python_environment
    setup_nodejs_environment
    setup_environment_files
    setup_supervisor
    setup_nginx
    init_database
    start_services
    print_summary
    
    log_info "Installation complétée - $(date)"
}

# Exécuter le script principal
main
