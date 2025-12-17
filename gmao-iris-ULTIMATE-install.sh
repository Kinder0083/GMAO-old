#!/bin/bash
#============================================================================
# GMAO IRIS - INSTALLATION ULTIME v2.0
# Installation COMPLÈTE en 1 seul script : App + Tailscale
# Compatible Proxmox 8.x et 9.x
# Même un enfant peut l'utiliser ! 🚀
#============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

msg() { echo -e "${BLUE}▶${NC} $1"; }
ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

clear
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║       GMAO IRIS v2.0 - INSTALLATION ULTIME & SIMPLE           ║
╠════════════════════════════════════════════════════════════════╣
║  ✅ Installation complète automatique                          ║
║  ✅ Tailscale intégré pour accès à distance                   ║
║  ✅ Configuration automatique des URLs                         ║
║  ✅ Prêt en 10-15 minutes !                                    ║
╚════════════════════════════════════════════════════════════════╝
EOF

echo ""
msg "🔍 Détection de Proxmox..."
pveversion || error "Proxmox non détecté. Ce script doit être exécuté sur Proxmox"

# ============== CONFIGURATION ==============

msg "📋 Configuration de l'installation..."
echo ""

# Template
TEMPLATE=$(pveam available | grep "debian-12-standard" | tail -1 | awk '{print $2}')
if [ -z "$TEMPLATE" ]; then
    msg "Téléchargement du template Debian 12..."
    pveam update
    pveam download local debian-12-standard_12.7-1_amd64.tar.zst
    TEMPLATE="debian-12-standard_12.7-1_amd64.tar.zst"
fi
ok "Template: $TEMPLATE"

# Storage
STORAGE=$(pvesm status | grep -E "lvm|dir" | grep "active" | head -1 | awk '{print $1}')
ok "Storage: $STORAGE"

# Bridge réseau
BRIDGE=$(ip -br link show | grep -E "^vmbr" | head -1 | awk '{print $1}')
ok "Bridge: $BRIDGE"

# GitHub
echo ""
warn "Configuration GitHub"
echo "1. Allez sur: https://github.com/settings/tokens"
echo "2. Générez un token avec scope 'repo'"
echo ""
read -sp "GitHub Token: " GITHUB_TOKEN
echo ""
read -p "Username GitHub [Kinder0083]: " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-Kinder0083}
read -p "Nom du dépôt [GMAO]: " GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-GMAO}
read -p "Branche [main]: " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

# Container
echo ""
msg "Configuration du container"
read -p "ID container [105]: " CTID
CTID=${CTID:-105}
read -p "RAM (Mo) [4096]: " RAM
RAM=${RAM:-4096}
read -p "CPU cores [4]: " CORES
CORES=${CORES:-4}
read -p "Disque (Go) [20]: " DISK
DISK=${DISK:-20}

# Admin
echo ""
msg "Configuration administrateur"
read -p "Email admin: " ADMIN_EMAIL
read -sp "Mot de passe admin: " ADMIN_PASS
echo ""
read -sp "Mot de passe root container: " ROOT_PASS
echo ""

# Tailscale
echo ""
msg "Configuration Tailscale (accès à distance)"
echo "Pour obtenir votre clé d'authentification:"
echo "1. Allez sur: https://login.tailscale.com/admin/settings/keys"
echo "2. Cliquez 'Generate auth key'"
echo "3. Cochez 'Reusable' et 'Ephemeral'"
echo ""
read -p "Activer Tailscale ? (y/n) [y]: " ENABLE_TAILSCALE
ENABLE_TAILSCALE=${ENABLE_TAILSCALE:-y}

if [[ "$ENABLE_TAILSCALE" == "y" ]]; then
    read -p "Clé d'authentification Tailscale: " TAILSCALE_KEY
fi

# Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Résumé:"
echo "  Container: $CTID ($RAM Mo, $CORES cores, ${DISK}Go)"
echo "  Storage: $STORAGE"
echo "  Bridge: $BRIDGE"
echo "  GitHub: $GITHUB_USER/$GITHUB_REPO (branche: $GITHUB_BRANCH)"
echo "  Admin: $ADMIN_EMAIL"
echo "  Tailscale: $ENABLE_TAILSCALE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Confirmer l'installation ? (y/n): " CONFIRM
[[ "$CONFIRM" != "y" ]] && exit 0

# ============== CRÉATION CONTAINER ==============

msg "Création du container..."
pct create $CTID local:vztmpl/$TEMPLATE \
  --arch amd64 \
  --cores $CORES \
  --hostname gmao-iris \
  --memory $RAM \
  --net0 name=eth0,bridge=$BRIDGE,ip=dhcp \
  --onboot 1 \
  --ostype debian \
  --rootfs $STORAGE:$DISK \
  --unprivileged 1 \
  --features nesting=1 \
  --password "$ROOT_PASS"

pct start $CTID
sleep 10
ok "Container $CTID créé et démarré"

# Récupérer l'IP
CONTAINER_IP=$(pct exec $CTID -- hostname -I | awk '{print $1}')
ok "IP du container: $CONTAINER_IP"

# ============== INSTALLATION SYSTÈME ==============

msg "Installation des dépendances système..."
pct exec $CTID -- bash -c '
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl wget git sudo \
  python3 python3-pip python3-venv \
  nodejs npm \
  mongodb-server \
  supervisor \
  nginx
'
ok "Système installé"

# ============== INSTALLATION TAILSCALE ==============

if [[ "$ENABLE_TAILSCALE" == "y" ]]; then
    msg "Installation de Tailscale..."
    pct exec $CTID -- bash -c "
        curl -fsSL https://tailscale.com/install.sh | sh
        tailscale up --authkey=$TAILSCALE_KEY --hostname=gmao-iris-$CTID
    "
    
    sleep 5
    TAILSCALE_IP=$(pct exec $CTID -- tailscale ip -4)
    ok "Tailscale installé - IP: $TAILSCALE_IP"
    
    # Utiliser l'IP Tailscale comme URL
    APP_URL="http://$TAILSCALE_IP"
else
    APP_URL="http://$CONTAINER_IP"
fi

ok "URL de l'application: $APP_URL"

# ============== INSTALLATION APPLICATION ==============

msg "Clonage de l'application..."
pct exec $CTID -- bash -c "
cd /opt
git clone https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$GITHUB_REPO.git gmao-iris
cd gmao-iris
git checkout $GITHUB_BRANCH
"
ok "Application clonée"

msg "Installation Backend..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/backend
python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Créer .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=gmao_iris
SECRET_KEY=$(openssl rand -hex 32)
FRONTEND_URL=$APP_URL
BACKEND_URL=$APP_URL
APP_URL=$APP_URL
EOF
"
ok "Backend installé"

msg "Création de l'administrateur..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/backend
source venv/bin/activate

cat > /tmp/create_admin.py << 'PEOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import sys

pwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")

async def create_admin():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['gmao_iris']
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    admin = {
        'id': 'admin-1',
        'nom': 'Admin',
        'prenom': 'GMAO',
        'email': email,
        'motDePasse': pwd_context.hash(password),
        'role': 'admin',
        'actif': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.delete_many({'email': email})
    await db.users.insert_one(admin)
    print(f'Admin créé: {email}')

asyncio.run(create_admin())
PEOF

python3 /tmp/create_admin.py '$ADMIN_EMAIL' '$ADMIN_PASS'
rm /tmp/create_admin.py
"
ok "Administrateur créé"

msg "Installation Frontend..."
pct exec $CTID -- bash -c "
cd /opt/gmao-iris/frontend
npm install -g yarn serve
yarn install
cat > .env << EOF
REACT_APP_BACKEND_URL=$APP_URL
PORT=3000
EOF
CI=false yarn build
"
ok "Frontend installé"

# ============== CONFIGURATION SERVICES ==============

msg "Configuration des services..."
pct exec $CTID -- bash -c '
# Backend
cat > /etc/supervisor/conf.d/gmao-iris-backend.conf << EOF
[program:gmao-iris-backend]
directory=/opt/gmao-iris/backend
command=/opt/gmao-iris/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=root
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/backend.log
stderr_logfile=/var/log/supervisor/backend.err.log
EOF

# Frontend
cat > /etc/supervisor/conf.d/gmao-iris-frontend.conf << EOF
[program:gmao-iris-frontend]
directory=/opt/gmao-iris/frontend
command=/usr/local/bin/serve -s build -l 3000
user=root
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.log
stderr_logfile=/var/log/supervisor/frontend.err.log
EOF

# MongoDB
cat > /etc/supervisor/conf.d/gmao-iris-mongodb.conf << EOF
[program:gmao-iris-mongodb]
command=/usr/bin/mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --bind_ip_all
user=mongodb
autostart=true
autorestart=true
EOF

# Nginx
cat > /etc/nginx/sites-available/gmao-iris << EOF
server {
    listen 80;
    server_name _;
    
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Démarrer les services
supervisorctl reread
supervisorctl update
supervisorctl start all
systemctl restart nginx
'
ok "Services configurés et démarrés"

# ============== FIN ==============

sleep 5

clear
cat << EOF

╔════════════════════════════════════════════════════════════════╗
║              🎉 INSTALLATION TERMINÉE AVEC SUCCÈS ! 🎉         ║
╚════════════════════════════════════════════════════════════════╝

📍 INFORMATIONS D'ACCÈS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 URL de l'application: $APP_URL
📧 Email admin: $ADMIN_EMAIL
🔑 Mot de passe: [celui que vous avez entré]

EOF

if [[ "$ENABLE_TAILSCALE" == "y" ]]; then
    cat << EOF
🔐 ACCÈS À DISTANCE AVEC TAILSCALE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tailscale est configuré
✅ IP Tailscale: $TAILSCALE_IP
✅ Accédez depuis n'importe où via: $APP_URL

📱 Installation Tailscale sur vos appareils:
   - Windows/Mac/Linux: https://tailscale.com/download
   - iOS/Android: App Store / Play Store
   
   Une fois Tailscale installé sur votre appareil, vous pourrez
   accéder à GMAO Iris depuis n'importe où, en toute sécurité !

EOF
fi

cat << EOF
🔧 COMMANDES UTILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Se connecter au container:
  pct enter $CTID

• Voir les logs:
  pct exec $CTID -- supervisorctl status
  pct exec $CTID -- tail -f /var/log/supervisor/backend.log

• Redémarrer les services:
  pct exec $CTID -- supervisorctl restart all

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Votre GMAO est prête à l'emploi !
EOF

exit 0
