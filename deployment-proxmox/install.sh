#!/bin/bash
#===============================================================================
#
#          FILE: install.sh
#
#         USAGE: ./install.sh [OPTIONS]
#
#   DESCRIPTION: Script d'installation automatique de GMAO Iris sur Proxmox
#                Installe Docker, configure l'application et initialise le manuel
#
#       OPTIONS:
#           -h, --help          Affiche l'aide
#           -i, --ip IP         Spécifie l'IP publique (obligatoire)
#           -p, --password PWD  Mot de passe MongoDB (défaut: généré)
#           -s, --secret KEY    Clé secrète JWT (défaut: générée)
#           --skip-docker       Ne pas installer Docker (déjà installé)
#           --skip-manual       Ne pas initialiser le manuel
#
#        AUTHOR: GMAO Iris Team
#       VERSION: 2.0
#===============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables par défaut
INSTALL_DIR="/opt/gmao-iris"
PUBLIC_IP=""
MONGO_PASSWORD=""
JWT_SECRET=""
SKIP_DOCKER=false
SKIP_MANUAL=false

#===============================================================================
# Fonctions utilitaires
#===============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                      ║"
    echo "║                    🔧 GMAO IRIS - Installation                       ║"
    echo "║                                                                      ║"
    echo "║           Système de Gestion de Maintenance Assistée                 ║"
    echo "║                                                                      ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}📦 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

generate_random_string() {
    local length=${1:-32}
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Affiche cette aide"
    echo "  -i, --ip IP         IP publique du serveur (OBLIGATOIRE)"
    echo "  -p, --password PWD  Mot de passe MongoDB (défaut: généré automatiquement)"
    echo "  -s, --secret KEY    Clé secrète JWT (défaut: générée automatiquement)"
    echo "  --skip-docker       Ne pas installer Docker (si déjà installé)"
    echo "  --skip-manual       Ne pas initialiser le manuel utilisateur"
    echo ""
    echo "Exemple:"
    echo "  $0 -i 192.168.1.100"
    echo "  $0 --ip 192.168.1.100 --password MonMotDePasse123"
    echo ""
}

#===============================================================================
# Parsing des arguments
#===============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--ip)
            PUBLIC_IP="$2"
            shift 2
            ;;
        -p|--password)
            MONGO_PASSWORD="$2"
            shift 2
            ;;
        -s|--secret)
            JWT_SECRET="$2"
            shift 2
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-manual)
            SKIP_MANUAL=true
            shift
            ;;
        *)
            print_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

#===============================================================================
# Vérifications préliminaires
#===============================================================================

print_banner

# Vérifier que l'IP est fournie
if [ -z "$PUBLIC_IP" ]; then
    print_error "L'IP publique est obligatoire !"
    echo ""
    echo "Utilisez: $0 -i VOTRE_IP_PUBLIQUE"
    echo ""
    echo "Pour trouver votre IP:"
    echo "  - IP locale: hostname -I | awk '{print \$1}'"
    echo "  - IP publique: curl -s ifconfig.me"
    exit 1
fi

# Vérifier les droits root
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root"
    echo "Utilisez: sudo $0 $@"
    exit 1
fi

# Générer les valeurs par défaut si non fournies
if [ -z "$MONGO_PASSWORD" ]; then
    MONGO_PASSWORD=$(generate_random_string 24)
    print_info "Mot de passe MongoDB généré automatiquement"
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_random_string 64)
    print_info "Clé secrète JWT générée automatiquement"
fi

#===============================================================================
# Installation de Docker
#===============================================================================

if [ "$SKIP_DOCKER" = false ]; then
    print_step "Installation de Docker"
    
    if command -v docker &> /dev/null; then
        print_warning "Docker est déjà installé"
        docker --version
    else
        print_info "Installation de Docker..."
        apt-get update
        apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        
        print_success "Docker installé"
        docker --version
    fi
    
    # Docker Compose
    if command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose est déjà installé"
    else
        print_info "Installation de Docker Compose..."
        apt-get install -y docker-compose
        print_success "Docker Compose installé"
    fi
    
    docker-compose --version
else
    print_info "Installation de Docker ignorée (--skip-docker)"
fi

#===============================================================================
# Préparation des fichiers
#===============================================================================

print_step "Préparation de l'application"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "deployment-proxmox/docker-compose.proxmox.yml" ]; then
    print_error "Ce script doit être exécuté depuis la racine du projet GMAO Iris"
    print_info "Utilisez: cd /chemin/vers/gmao-iris && ./deployment-proxmox/install.sh -i VOTRE_IP"
    exit 1
fi

# Créer le docker-compose.yml configuré
print_info "Configuration de docker-compose.yml..."

cat > docker-compose.yml << EOF
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: gmao-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - gmao-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend FastAPI
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: gmao-backend
    restart: unless-stopped
    environment:
      MONGO_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/gmao_db?authSource=admin
      SECRET_KEY: ${JWT_SECRET}
      SMTP_HOST: localhost
      SMTP_PORT: 25
      SMTP_FROM: no-reply@gmao-iris.local
      SMTP_FROM_NAME: GMAO Iris
      APP_URL: http://${PUBLIC_IP}:3000
    ports:
      - "8001:8001"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - gmao-network
    volumes:
      - backend_uploads:/app/backend/uploads
      - backend_backups:/app/backups

  # Frontend React
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_BACKEND_URL: http://${PUBLIC_IP}:8001
    container_name: gmao-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - gmao-network
    environment:
      - NODE_ENV=production

networks:
  gmao-network:
    driver: bridge

volumes:
  mongodb_data:
    driver: local
  backend_uploads:
    driver: local
  backend_backups:
    driver: local
EOF

print_success "docker-compose.yml créé"

#===============================================================================
# Création des Dockerfiles
#===============================================================================

print_step "Création des Dockerfiles"

# Backend Dockerfile
print_info "Création du Dockerfile backend..."
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app/backend

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p uploads /app/backups

# Exposer le port
EXPOSE 8001

# Commande de démarrage
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF
print_success "Dockerfile backend créé"

# Frontend Dockerfile
print_info "Création du Dockerfile frontend..."
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build

WORKDIR /app

# Copier package.json
COPY package*.json ./
COPY yarn.lock ./

# Installer les dépendances
RUN yarn install --frozen-lockfile

# Copier le code source
COPY . .

# Argument pour l'URL backend
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build l'application
RUN yarn build

# Stage de production avec Nginx
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
EOF
print_success "Dockerfile frontend créé"

# Nginx config
print_info "Création de la configuration Nginx..."
cat > frontend/nginx.conf << 'EOF'
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
print_success "Configuration Nginx créée"

#===============================================================================
# Build et démarrage
#===============================================================================

print_step "Build et démarrage des containers"

print_info "Build des images Docker (cela peut prendre quelques minutes)..."
docker-compose build --no-cache

print_info "Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
print_info "Attente du démarrage des services..."
sleep 15

# Vérifier l'état des services
echo ""
print_info "État des services:"
docker-compose ps

#===============================================================================
# Initialisation du manuel utilisateur
#===============================================================================

if [ "$SKIP_MANUAL" = false ]; then
    print_step "Initialisation du manuel utilisateur"
    
    print_info "Attente que le backend soit complètement démarré..."
    sleep 10
    
    # Exécuter le script d'initialisation du manuel
    print_info "Exécution du script d'initialisation du manuel..."
    
    if docker exec gmao-backend python3 /app/backend/init_manual_on_install.py; then
        print_success "Manuel utilisateur initialisé avec succès !"
        echo ""
        echo "Le manuel contient :"
        echo "  • 24 chapitres"
        echo "  • 70+ sections"
        echo "  • Documentation complète des nouvelles fonctionnalités"
    else
        print_warning "L'initialisation du manuel a échoué"
        print_info "Vous pouvez réessayer manuellement avec:"
        echo "  docker exec gmao-backend python3 /app/backend/init_manual_on_install.py"
    fi
else
    print_info "Initialisation du manuel ignorée (--skip-manual)"
fi

#===============================================================================
# Résumé final
#===============================================================================

print_step "Installation terminée !"

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║                    ✅ INSTALLATION RÉUSSIE !                         ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "📌 Informations de connexion :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐 URL Frontend:  http://${PUBLIC_IP}:3000"
echo "  🔧 URL Backend:   http://${PUBLIC_IP}:8001"
echo ""
echo "  👤 Compte Admin par défaut:"
echo "     Email:    admin@gmao-iris.local"
echo "     Password: Admin123!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sauvegarder les credentials dans un fichier
CREDENTIALS_FILE="credentials.txt"
cat > $CREDENTIALS_FILE << EOF
===========================================
GMAO IRIS - Informations de connexion
===========================================

Frontend URL: http://${PUBLIC_IP}:3000
Backend URL:  http://${PUBLIC_IP}:8001

Compte Admin:
  Email:    admin@gmao-iris.local
  Password: Admin123!

MongoDB:
  Password: ${MONGO_PASSWORD}

JWT Secret: ${JWT_SECRET}

===========================================
⚠️  CONSERVEZ CE FICHIER EN LIEU SÛR !
⚠️  CHANGEZ LE MOT DE PASSE ADMIN !
===========================================
EOF

print_warning "Les credentials ont été sauvegardés dans: $CREDENTIALS_FILE"
echo ""

echo "📝 Commandes utiles :"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "  • Voir les logs:        docker-compose logs -f"
echo "  • Redémarrer:           docker-compose restart"
echo "  • Arrêter:              docker-compose down"
echo "  • État des services:    docker-compose ps"
echo ""

print_success "GMAO Iris est maintenant accessible sur http://${PUBLIC_IP}:3000"
echo ""
