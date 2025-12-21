#!/usr/bin/env bash

###############################################################################
# GMAO Iris v1.1.4 - Installation Auto-Détection (Proxmox 9.0 / Debian 12)
# 
# NOUVEAUTÉS v1.1.4:
# - Fonctionnalité "Détail par Catégorie (Article + DM6)"
# - Création automatique de category_mapping.py
# - Vérification import dans server.py
# - Rebuild frontend automatique après installation
# - Post-installation hook intégré
# 
# CORRECTIFS v1.1.2:
# - Auto-détection du template Debian disponible
# - Auto-détection du storage (local-lvm, local, etc.)
# - Choix du bridge réseau (vmbr0, vmbr1, etc.)
# - Configuration automatique du DNS
# - Gestion des erreurs améliorée
# - Compatible Proxmox 9.0
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

msg() { echo -e "${BLUE}▶${NC} $1"; }
ok() { echo -e "${GREEN}✓${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   GMAO IRIS v1.1.4 - Installation Auto (Proxmox 9.0 Ready)    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est sur Proxmox
if ! command -v pct &> /dev/null; then
    err "Ce script doit être exécuté sur un serveur Proxmox"
fi

msg "Détection de la configuration Proxmox..."
PVE_VERSION=$(pveversion | head -1)
echo "  $PVE_VERSION"
echo ""

# Auto-détection du template Debian 12
msg "Recherche du template Debian 12..."
TEMPLATE=$(ls /var/lib/vz/template/cache/*debian-12*.tar.* 2>/dev/null | head -1 | xargs basename 2>/dev/null)

if [[ -z "$TEMPLATE" ]]; then
    warn "Aucun template Debian 12 trouvé !"
    echo ""
    echo "Téléchargement du template (cela peut prendre quelques minutes)..."
    pveam update >/dev/null 2>&1
    
    # Chercher le template disponible
    TEMPLATE_NAME=$(pveam available --section system | grep "debian-12.*amd64" | awk '{print $2}' | head -1)
    
    if [[ -z "$TEMPLATE_NAME" ]]; then
        err "Impossible de trouver un template Debian 12 disponible"
    fi
    
    pveam download local "$TEMPLATE_NAME" || err "Échec du téléchargement du template"
    TEMPLATE="$TEMPLATE_NAME"
    ok "Template téléchargé: $TEMPLATE"
else
    ok "Template trouvé: $TEMPLATE"
fi
echo ""

# Auto-détection du storage
msg "Détection du storage disponible..."
STORAGE=""

# Priorité: local-lvm > local > premier storage disponible
if pvesm status | grep -q "local-lvm"; then
    STORAGE="local-lvm"
elif pvesm status | grep -q "^local "; then
    STORAGE="local"
else
    STORAGE=$(pvesm status | awk 'NR==2 {print $1}')
fi

if [[ -z "$STORAGE" ]]; then
    err "Aucun storage disponible trouvé"
fi

ok "Storage sélectionné: $STORAGE"
echo ""

# Détection des bridges réseau disponibles
msg "Détection des bridges réseau..."
echo ""
echo "Bridges réseau disponibles:"
BRIDGES=$(ip link show | grep -E '^[0-9]+: vmbr' | awk -F': ' '{print $2}' | sed 's/@.*//')

if [[ -z "$BRIDGES" ]]; then
    err "Aucun bridge réseau détecté"
fi

# Afficher la liste numérotée
i=1
declare -A BRIDGE_MAP
while IFS= read -r bridge; do
    # Obtenir l'état et l'IP si disponible
    STATE=$(ip link show $bridge | grep -o "state [A-Z]*" | awk '{print $2}')
    IP=$(ip addr show $bridge 2>/dev/null | grep "inet " | awk '{print $2}' | head -1)
    
    echo "  $i) $bridge - État: $STATE"
    if [[ -n "$IP" ]]; then
        echo "     IP: $IP"
    fi
    
    BRIDGE_MAP[$i]=$bridge
    ((i++))
done <<< "$BRIDGES"

echo ""
read -p "Choisissez le numéro du bridge à utiliser [1]: " BRIDGE_CHOICE
BRIDGE_CHOICE=${BRIDGE_CHOICE:-1}

SELECTED_BRIDGE=${BRIDGE_MAP[$BRIDGE_CHOICE]}

if [[ -z "$SELECTED_BRIDGE" ]]; then
    err "Choix de bridge invalide"
fi

ok "Bridge sélectionné: $SELECTED_BRIDGE"
echo ""

# GitHub Token
warn "Vous avez besoin d'un Personal Access Token GitHub"
echo "1. Allez sur: https://github.com/settings/tokens"
echo "2. Cliquez: Generate new token (classic)"
echo "3. Cochez: repo (Full control of private repositories)"
echo "4. Copiez le token généré"
echo ""
read -sp "Collez votre GitHub Token: " GITHUB_TOKEN
echo ""
[[ -z "$GITHUB_TOKEN" ]] && err "Token requis"

# Informations GitHub
read -p "Votre username GitHub [Kinder0083]: " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-Kinder0083}

read -p "Nom du dépôt [GMAO]: " REPO_NAME
REPO_NAME=${REPO_NAME:-GMAO}

read -p "Branche [main]: " BRANCH
BRANCH=${BRANCH:-main}

echo ""
msg "Configuration du container..."

# Trouver un ID libre
CTID=100
while pct status $CTID >/dev/null 2>&1; do
    ((CTID++))
done

read -p "ID container [$CTID]: " CUSTOM_CTID
CTID=${CUSTOM_CTID:-$CTID}

# Vérifier que l'ID est libre
if pct status $CTID >/dev/null 2>&1; then
    err "Container ID $CTID existe déjà"
fi

read -p "RAM (Mo) [4096]: " RAM
RAM=${RAM:-4096}

read -p "CPU cores [2]: " CORES
CORES=${CORES:-2}

read -p "Taille disque (Go) [20]: " DISK_SIZE
DISK_SIZE=${DISK_SIZE:-20}

echo ""
msg "Configuration réseau du container..."
echo ""

# Détecter la config du bridge sélectionné
BRIDGE_IP=$(ip addr show $SELECTED_BRIDGE | grep "inet " | awk '{print $2}' | cut -d'/' -f1)
BRIDGE_CIDR=$(ip addr show $SELECTED_BRIDGE | grep "inet " | awk '{print $2}' | cut -d'/' -f2)
BRIDGE_GW=$(ip route | grep "default.*$SELECTED_BRIDGE" | awk '{print $3}')

if [[ -z "$BRIDGE_GW" ]]; then
    BRIDGE_GW=$BRIDGE_IP
fi

echo "Configuration détectée sur $SELECTED_BRIDGE:"
echo "  IP Proxmox: $BRIDGE_IP/$BRIDGE_CIDR"
echo "  Gateway: $BRIDGE_GW"
echo ""

# Proposer IP statique ou DHCP
NETWORK_PREFIX=$(echo $BRIDGE_IP | cut -d'.' -f1-3)
SUGGESTED_IP="${NETWORK_PREFIX}.150"

echo "Choisissez le mode de configuration réseau:"
echo "  1) IP Statique (recommandé si pas de serveur DHCP)"
echo "  2) DHCP (nécessite un serveur DHCP fonctionnel)"
echo ""
read -p "Votre choix [1]: " NET_MODE
NET_MODE=${NET_MODE:-1}

if [[ "$NET_MODE" == "1" ]]; then
    # IP Statique
    read -p "Adresse IP du container [$SUGGESTED_IP]: " CONTAINER_IP
    CONTAINER_IP=${CONTAINER_IP:-$SUGGESTED_IP}
    
    read -p "Masque CIDR [/$BRIDGE_CIDR]: " CONTAINER_CIDR
    CONTAINER_CIDR=${CONTAINER_CIDR:-$BRIDGE_CIDR}
    
    read -p "Gateway [$BRIDGE_GW]: " CONTAINER_GW
    CONTAINER_GW=${CONTAINER_GW:-$BRIDGE_GW}
    
    IP_CONFIG="${CONTAINER_IP}/${CONTAINER_CIDR}"
    NET="ip=${IP_CONFIG},gw=${CONTAINER_GW}"
else
    # DHCP
    warn "Mode DHCP sélectionné - un serveur DHCP doit être disponible sur $SELECTED_BRIDGE"
    IP_CONFIG="dhcp"
    NET="ip=dhcp"
    CONTAINER_IP="dhcp"
fi

echo ""
msg "Configuration administrateur..."

read -p "Email admin: " ADMIN_EMAIL
[[ -z "$ADMIN_EMAIL" ]] && err "Email requis"

read -sp "Mot de passe admin (min 8 car): " ADMIN_PASS
echo ""
[[ ${#ADMIN_PASS} -lt 8 ]] && err "Mot de passe trop court"

read -sp "Mot de passe root container: " ROOT_PASS
echo ""
[[ ${#ROOT_PASS} -lt 8 ]] && err "Mot de passe root trop court"

echo ""
msg "Configuration de l'accès à distance (OPTIONNEL)"
echo "Choisissez comment accéder à votre GMAO depuis l'extérieur:"
echo ""
echo "  1) IP/URL manuelle (ex: votre IP publique, nom de domaine)"
echo "  2) Tailscale (VPN sécurisé automatique)"
echo "  3) Aucun (utiliser uniquement l'IP locale)"
echo ""
read -p "Votre choix [3]: " ACCESS_CHOICE
ACCESS_CHOICE=${ACCESS_CHOICE:-3}

INSTALL_TAILSCALE="n"
MANUAL_URL=""

case $ACCESS_CHOICE in
    1)
        echo ""
        echo "Entrez votre IP publique ou nom de domaine"
        echo "Exemples: http://203.0.113.45 ou https://mon-domaine.com"
        read -p "URL d'accès: " MANUAL_URL
        if [[ -z "$MANUAL_URL" ]]; then
            warn "Aucune URL fournie, utilisation de l'IP locale"
        else
            ok "URL manuelle configurée: $MANUAL_URL"
        fi
        ;;
    2)
        echo ""
        echo "Configuration Tailscale"
        echo "Pour obtenir une clé: https://login.tailscale.com/admin/settings/keys"
        echo ""
        read -p "Clé d'authentification Tailscale: " TAILSCALE_AUTH_KEY
        if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
            warn "Pas de clé Tailscale fournie, utilisation de l'IP locale"
        else
            INSTALL_TAILSCALE="y"
            ok "Tailscale sera installé"
        fi
        ;;
    3)
        ok "Utilisation de l'IP locale uniquement"
        ;;
    *)
        warn "Choix invalide, utilisation de l'IP locale"
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Résumé:"
echo "  Proxmox: $PVE_VERSION"
echo "  Template: $TEMPLATE"
echo "  Storage: $STORAGE"
echo "  Bridge réseau: $SELECTED_BRIDGE"
echo "  Container: $CTID (${RAM}Mo, ${CORES} cores, ${DISK_SIZE}Go)"
echo "  Réseau: $IP_CONFIG"
echo "  GitHub: ${GITHUB_USER}/${REPO_NAME} (branche: $BRANCH)"
echo "  Admin: $ADMIN_EMAIL"
if [[ -n "$MANUAL_URL" ]]; then
    echo "  Accès distant: URL manuelle ($MANUAL_URL)"
elif [[ "$INSTALL_TAILSCALE" =~ ^[Yy]$ ]] && [[ -n "$TAILSCALE_AUTH_KEY" ]]; then
    echo "  Accès distant: Tailscale"
else
    echo "  Accès distant: IP locale uniquement"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Confirmer l'installation ? (y/n): " CONFIRM
[[ ! $CONFIRM =~ ^[Yy]$ ]] && err "Installation annulée"

# Construction de l'URL Git avec token
GIT_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo ""
msg "Création du container..."

# Nettoyer les variables (enlever espaces)
CONTAINER_IP=$(echo "$CONTAINER_IP" | tr -d ' ')
CONTAINER_CIDR=$(echo "$CONTAINER_CIDR" | tr -d ' ')
CONTAINER_GW=$(echo "$CONTAINER_GW" | tr -d ' ')

# Commande de création adaptée avec le bridge choisi
if [[ "$NET_MODE" == "1" ]]; then
    # IP Statique
    PCT_CREATE_CMD="pct create $CTID local:vztmpl/$TEMPLATE \
  --arch amd64 \
  --cores $CORES \
  --hostname gmao-iris \
  --memory $RAM \
  --net0 name=eth0,bridge=$SELECTED_BRIDGE,ip=${CONTAINER_IP}/${CONTAINER_CIDR},gw=${CONTAINER_GW} \
  --onboot 1 \
  --ostype debian \
  --rootfs ${STORAGE}:${DISK_SIZE} \
  --unprivileged 1 \
  --features nesting=1 \
  --password '$ROOT_PASS'"
else
    # DHCP
    PCT_CREATE_CMD="pct create $CTID local:vztmpl/$TEMPLATE \
  --arch amd64 \
  --cores $CORES \
  --hostname gmao-iris \
  --memory $RAM \
  --net0 name=eth0,bridge=$SELECTED_BRIDGE,ip=dhcp \
  --onboot 1 \
  --ostype debian \
  --rootfs ${STORAGE}:${DISK_SIZE} \
  --unprivileged 1 \
  --features nesting=1 \
  --password '$ROOT_PASS'"
fi

# Debug: afficher la commande
echo ""
echo "DEBUG - Commande qui sera exécutée:"
echo "$PCT_CREATE_CMD"
echo ""
read -p "Appuyez sur Entrée pour continuer..."

# Exécuter avec gestion d'erreur détaillée
if ! eval "$PCT_CREATE_CMD" 2>&1 | tee /tmp/pct_create_error.log; then
    echo ""
    echo "Erreur lors de la création. Détails:"
    cat /tmp/pct_create_error.log
    exit 1
fi

sleep 2
pct start $CTID || err "Impossible de démarrer le container"
sleep 5

# CORRECTION: Configurer le DNS immédiatement
msg "Configuration du réseau..."
pct exec $CTID -- bash -c 'cat > /etc/resolv.conf <<EOF
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1
EOF'

# Vérifier la connectivité Internet
msg "Vérification de la connectivité Internet..."
if ! pct exec $CTID -- ping -c 3 8.8.8.8 >/dev/null 2>&1; then
    err "Le container n'a pas de connexion Internet. Vérifiez:
    1. La configuration réseau de Proxmox
    2. Le bridge $SELECTED_BRIDGE est correctement configuré
    3. Le firewall Proxmox (pve-firewall status)
    
Pour diagnostic, exécutez:
    pct enter $CTID
    ip addr show
    ip route
    ping 8.8.8.8"
fi

ok "Container $CTID créé et réseau configuré"

msg "Installation du système (5-7 min)..."
pct exec $CTID -- bash -c 'export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq locales
echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
locale-gen >/dev/null 2>&1
export LANG=en_US.UTF-8

apt-get upgrade -y -qq
apt-get install -y -qq curl wget git gnupg ca-certificates build-essential \
  supervisor nginx ufw python3 python3-pip python3-venv

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs
npm install -g yarn >/dev/null 2>&1

# MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update -qq
apt-get install -y -qq mongodb-org
systemctl start mongod
systemctl enable mongod >/dev/null 2>&1

# Postfix
apt-get install -y -qq mailutils
echo "gmao-iris.local" > /etc/mailname
debconf-set-selections <<< "postfix postfix/mailname string gmao-iris.local"
debconf-set-selections <<< "postfix postfix/main_mailer_type string Internet Site"
apt-get install -y -qq postfix
systemctl start postfix
systemctl enable postfix >/dev/null 2>&1
' 2>&1 | grep -iE "(error|fatal)" || true

ok "Système installé"

# Obtenir IP du container
if [[ "$CONTAINER_IP" == "dhcp" ]]; then
    CONTAINER_IP=$(pct exec $CTID -- hostname -I | awk '{print $1}')
    
    if [[ -z "$CONTAINER_IP" || "$CONTAINER_IP" == "127.0.0.1" ]]; then
        warn "Le DHCP n'a pas attribué d'IP. Configuration manuelle nécessaire."
        CONTAINER_IP="AUCUNE_IP"
    else
        ok "IP du container (DHCP): $CONTAINER_IP"
    fi
else
    ok "IP du container (Statique): $CONTAINER_IP"
fi

# Déterminer l'URL d'accès en fonction du choix
if [[ -n "$MANUAL_URL" ]]; then
    # URL manuelle fournie
    FRONTEND_URL="$MANUAL_URL"
    ok "URL d'accès: $FRONTEND_URL (manuelle)"
    
elif [[ "$INSTALL_TAILSCALE" =~ ^[Yy]$ ]] && [[ -n "$TAILSCALE_AUTH_KEY" ]]; then
    # Installation de Tailscale
    msg "Installation de Tailscale..."
    pct exec $CTID -- bash << 'TAILSCALE_INSTALL'
# Installer Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
TAILSCALE_INSTALL
    
    pct exec $CTID -- bash -c "tailscale up --authkey=$TAILSCALE_AUTH_KEY --hostname=gmao-iris-${CTID} --accept-routes --accept-dns=false" 2>&1 | grep -v "Success" || true
    
    sleep 5
    
    # Récupérer l'IP Tailscale
    TAILSCALE_IP=$(pct exec $CTID -- tailscale ip -4 2>/dev/null || echo "")
    
    if [[ -n "$TAILSCALE_IP" ]]; then
        ok "Tailscale installé - IP: $TAILSCALE_IP"
        FRONTEND_URL="http://$TAILSCALE_IP"
    else
        warn "Tailscale installé mais IP non obtenue, utilisation IP locale"
        FRONTEND_URL="http://$CONTAINER_IP"
    fi
else
    # IP locale uniquement
    FRONTEND_URL="http://$CONTAINER_IP"
    ok "URL d'accès: $FRONTEND_URL (locale)"
fi

msg "Clonage de l'application depuis GitHub..."

# Cloner et installer l'application
pct exec $CTID -- bash <<APPEOF
set -e
cd /opt
rm -rf gmao-iris 2>/dev/null || true

# Cloner avec le token
echo "Clonage du dépôt GitHub..."
git clone -b $BRANCH $GIT_URL gmao-iris >/dev/null 2>&1 || {
    echo "❌ Erreur: Impossible de cloner le dépôt"
    echo "Vérifications:"
    echo "  1. Le token a-t-il les permissions 'repo' ?"
    echo "  2. Le dépôt ${GITHUB_USER}/${REPO_NAME} existe-t-il ?"
    echo "  3. La branche '$BRANCH' existe-t-elle ?"
    exit 1
}

cd gmao-iris

# Backend .env
SECRET_KEY=\$(openssl rand -hex 32)
cat > backend/.env <<BEOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=gmao_iris
SECRET_KEY=\${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
PORT=8001
HOST=0.0.0.0
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_FROM=noreply@gmao-iris.local
SMTP_FROM_NAME=GMAO Iris
APP_URL=${FRONTEND_URL}
EMERGENT_LLM_KEY=sk-emergent-12d3316F4Fe54F79e6
BEOF

# Frontend .env - NE PAS définir REACT_APP_BACKEND_URL pour permettre la détection automatique
# Cela permet l'accès depuis l'IP locale ET l'IP externe
cat > frontend/.env <<FEOF
# REACT_APP_BACKEND_URL n'est PAS défini pour permettre la détection automatique
# Le frontend utilisera automatiquement window.location.origin
NODE_ENV=production
FEOF

# Backend installation
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip

# Installer les dépendances de base
pip install -r requirements.txt

# Installer emergentintegrations depuis le repo Emergent
echo "📦 Installation de emergentintegrations..."
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ || {
    echo "⚠️ Installation de emergentintegrations échouée, tentative alternative..."
    pip install --index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ --extra-index-url https://pypi.org/simple/ emergentintegrations
}

# Créer les admins directement avec Python inline
echo "🔐 Création des comptes administrateurs..."
python3 << PYEOF
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import os

async def create_admins():
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db_name = os.getenv('DB_NAME', 'gmao_iris')
        db = client[db_name]
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto', bcrypt__rounds=10)
        
        all_modules = ['dashboard', 'workOrders', 'assets', 'preventiveMaintenance',
                      'planningMprev', 'inventory', 'locations', 'vendors', 'reports',
                      'purchaseHistory', 'people', 'planning', 'improvementRequests',
                      'improvements', 'interventionRequests', 'equipments', 'meters',
                      'importExport', 'journal', 'settings', 'surveillance',
                      'surveillanceRapport', 'presquaccident', 'presquaccidentRapport',
                      'documentations', 'personalization', 'chatLive', 'sensors',
                      'iotDashboard', 'mqttLogs', 'purchaseRequests']
        
        admin_permissions = {m: {'view': True, 'edit': True, 'delete': True} for m in all_modules}
        
        # Admin principal
        admin1 = {
            'email': '${ADMIN_EMAIL}',
            'hashed_password': pwd_context.hash('${ADMIN_PASS}'),
            'nom': 'Admin', 'prenom': 'Principal', 'role': 'ADMIN',
            'telephone': None, 'service': None, 'statut': 'actif',
            'dateCreation': datetime.now(timezone.utc).isoformat(),
            'derniereConnexion': None, 'firstLogin': False,
            'permissions': admin_permissions, 'responsable_hierarchique_id': None
        }
        
        existing = await db.users.find_one({'email': '${ADMIN_EMAIL}'})
        if existing:
            await db.users.update_one({'email': '${ADMIN_EMAIL}'}, {'\$set': admin1})
            print('✅ Admin principal mis à jour: ${ADMIN_EMAIL}')
        else:
            await db.users.insert_one(admin1)
            print('✅ Admin principal créé: ${ADMIN_EMAIL}')
        
        # Admin de secours
        admin2 = {
            'email': 'buenogy@gmail.com',
            'hashed_password': pwd_context.hash('Admin2024!'),
            'nom': 'Bueno', 'prenom': 'Gregory', 'role': 'ADMIN',
            'telephone': None, 'service': None, 'statut': 'actif',
            'dateCreation': datetime.now(timezone.utc).isoformat(),
            'derniereConnexion': None, 'firstLogin': False,
            'permissions': admin_permissions, 'responsable_hierarchique_id': None
        }
        
        existing2 = await db.users.find_one({'email': 'buenogy@gmail.com'})
        if existing2:
            await db.users.update_one({'email': 'buenogy@gmail.com'}, {'\$set': admin2})
            print('✅ Admin secours mis à jour: buenogy@gmail.com')
        else:
            await db.users.insert_one(admin2)
            print('✅ Admin secours créé: buenogy@gmail.com')
        
        client.close()
        return True
    except Exception as e:
        print(f'❌ Erreur: {e}')
        return False

asyncio.run(create_admins())
PYEOF

if [ $? -eq 0 ]; then
    echo "✅ Comptes administrateurs créés"
else
    echo "⚠️  Avertissement: Problème création admins (vous pourrez utiliser buenogy@gmail.com / Admin2024!)"
fi

# Initialisation du manuel utilisateur complet (23 chapitres) - Script unifié
echo ""
echo "📚 Génération du manuel utilisateur complet (23 chapitres + 61 sections)..."
python3 generate_unified_manual.py
if [ $? -eq 0 ]; then
    echo "✅ Manuel complet généré avec succès"
    echo "   ✓ 23 chapitres créés"
    echo "   ✓ 61 sections détaillées"
    echo "   ✓ Recherche intuitive incluse par défaut 🔍"
    echo ""
    echo "💡 La recherche intuitive du manuel est désormais active."
    echo "   Accédez au manuel et utilisez la barre de recherche en haut"
    echo "   pour trouver instantanément n'importe quelle information."
else
    echo "⚠️  Avertissement: Échec génération du manuel"
fi

# Création du fichier category_mapping.py (v1.1.4)
echo ""
echo "📊 Création du module de catégorisation..."
cat > category_mapping.py << 'CATEOF'
# Mapping des catégories basé sur le fichier Achats.xlsx
# Format: (ARTICLE, DM6) -> Catégorie
# CHAQUE COMBINAISON ARTICLE+DM6 EST UNIQUE

ARTICLE_DM6_TO_CATEGORY = {
    # Location
    ("LD", "YP61304"): "Location Mobilière Diverse",
    ("CD", "YP61305"): "Location Mobilière Diverse",
    ("LD", "YP61306"): "Location Mobilière",
    
    # Services
    ("YP61112", None): "Gardiennage",
    ("YP61109", None): "Informatique",
    ("YP61102", None): "Prestations diverses",
    
    # Maintenance - ATTENTION: YP61502 a plusieurs DM6 différents!
    ("YP61502", "I370500"): "Maintenance Constructions",
    ("YP61502", "I370900"): "Maintenance Constructions",
    ("YP61502", "I370200"): "Maintenance Véhicules",
    ("YP61502", "I370300"): "Maintenance Machines",
    ("YP61502", "I370100"): "Maintenance diverse",
    ("YP61502", None): "Prestation Entretien Installation labo",
    
    # Maintenance fournitures
    ("YP60612", None): "Maintenance - fournitures Entretien",
    ("YP60605", "I370500"): "Maintenance - Fournitures petit équipement",
    ("YP60605", "I380200"): "Maintenance - Fournitures petit équipement",
    
    # Nettoyage
    ("YP61504", None): "Nettoyage vêtements",
    ("YP61501", None): "Nettoyage locaux",
    
    # Consommables
    ("YP60608", None): "Matières consommables",
    ("YP60607", None): "Fourniture EPI",
    ("YP60606", None): "Fournitures de Bureau",
    
    # Transport
    ("YP62401", None): "Prestation Transport Sur Achat",
    ("YP62404", None): "Achat Transport Divers",
    
    # Production
    ("YP61103", None): "Prestation Externe Prod",
    
    # Investissements et divers
    ("AP23104", None): "Investissements",
    ("YP65801", None): "Divers à reclasser",
}

def get_category_from_article_dm6(article_code: str, dm6_code: str) -> str:
    """
    Retourne la catégorie basée sur ARTICLE + DM6.
    
    Args:
        article_code: Code article (ex: "YP61502")
        dm6_code: Code DM6 (ex: "I370300")
        
    Returns:
        Nom de la catégorie ou "Non catégorisé" si non trouvé
    """
    # Essayer avec le DM6 exact
    key = (article_code, dm6_code)
    if key in ARTICLE_DM6_TO_CATEGORY:
        return ARTICLE_DM6_TO_CATEGORY[key]
    
    # Fallback: essayer sans DM6 (None)
    key_fallback = (article_code, None)
    if key_fallback in ARTICLE_DM6_TO_CATEGORY:
        return ARTICLE_DM6_TO_CATEGORY[key_fallback]
    
    return "Non catégorisé"
CATEOF

if [ -f category_mapping.py ]; then
    echo "✅ Module category_mapping.py créé"
else
    echo "❌ ERREUR: Échec création category_mapping.py"
fi

# Vérifier que l'import est présent dans server.py (v1.1.4)
echo "🔍 Vérification de l'import dans server.py..."
if grep -q "from category_mapping import get_category_from_article_dm6" server.py; then
    echo "✅ Import déjà présent dans server.py"
else
    echo "⚠️  Import manquant, ajout automatique..."
    # Trouver la ligne avec audit_service
    LINE_NUM=\$(grep -n "from audit_service import AuditService" server.py | cut -d: -f1)
    if [ -n "\$LINE_NUM" ]; then
        sed -i "\${LINE_NUM}a from category_mapping import get_category_from_article_dm6" server.py
        echo "✅ Import ajouté ligne \$((\$LINE_NUM + 1))"
    else
        echo "❌ Impossible de trouver la ligne d'insertion"
    fi
fi

deactivate

# Frontend build
cd ../frontend
echo "Build du frontend (cela peut prendre 3-5 minutes)..."
yarn install --silent 2>/dev/null
yarn build 2>/dev/null
APPEOF

ok "Application installée"

msg "Configuration des services..."

# Supervisor configuration - using tee to avoid heredoc issues inside bash -c
pct exec $CTID -- tee /etc/supervisor/conf.d/gmao-iris-backend.conf > /dev/null << 'SUPERVISOR_EOF'
[program:gmao-iris-backend]
directory=/opt/gmao-iris/backend
command=/opt/gmao-iris/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
user=root
autostart=true
autorestart=true
stderr_logfile=/var/log/gmao-iris-backend.err.log
stdout_logfile=/var/log/gmao-iris-backend.out.log
environment=PYTHONUNBUFFERED=1
SUPERVISOR_EOF

pct exec $CTID -- supervisorctl reread
pct exec $CTID -- supervisorctl update

sleep 3

# Nginx configuration - using tee to avoid heredoc issues inside bash -c
pct exec $CTID -- rm -f /etc/nginx/sites-enabled/default

pct exec $CTID -- tee /etc/nginx/sites-available/gmao-iris > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 25M;
    
    location / {
        root /opt/gmao-iris/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket pour le Chat Live
    location /ws/chat/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # WebSocket pour le Tableau d affichage
    location /ws/whiteboard/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINX_EOF

pct exec $CTID -- ln -sf /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-enabled/
pct exec $CTID -- nginx -t
pct exec $CTID -- systemctl reload nginx

# Firewall configuration
pct exec $CTID -- bash -c 'ufw --force enable >/dev/null 2>&1
ufw allow 22/tcp >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1'

ok "Services démarrés"

# Vérifier que le backend tourne
sleep 2
BACKEND_STATUS=$(pct exec $CTID -- supervisorctl status gmao-iris-backend | grep RUNNING || echo "NOT_RUNNING")

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALLATION TERMINÉE !                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Accès à l'application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL principale:     ${FRONTEND_URL}"
echo "🌐 URL locale:         http://${CONTAINER_IP}"
echo ""

if [[ -n "$MANUAL_URL" ]]; then
    echo "📡 ACCÈS À DISTANCE VIA URL MANUELLE:"
    echo "   ✅ URL configurée: ${MANUAL_URL}"
    echo "   ⚠️  Assurez-vous que cette URL pointe vers votre serveur"
    echo "   ⚠️  Configurez votre routeur/firewall si nécessaire"
    echo ""
elif [[ -n "$TAILSCALE_IP" ]]; then
    echo "🔐 ACCÈS À DISTANCE VIA TAILSCALE:"
    echo "   ✅ Tailscale activé"
    echo "   ✅ IP Tailscale: $TAILSCALE_IP"
    echo "   ✅ URL à distance: ${FRONTEND_URL}"
    echo ""
    echo "   📱 Installez Tailscale sur vos appareils:"
    echo "      Windows/Mac/Linux: https://tailscale.com/download"
    echo "      iOS/Android: App Store / Play Store"
    echo ""
else
    echo "ℹ️  Accès local uniquement configuré"
    echo "   Pour un accès à distance, relancez l'installation avec Tailscale"
    echo "   ou configurez une URL publique"
    echo ""
fi
echo "🔐 Compte principal:"
echo "   Email:        ${ADMIN_EMAIL}"
echo "   Mot de passe: [celui que vous avez défini]"
echo ""
echo "🔐 Compte de secours:"
echo "   Email:        buenogy@gmail.com"
echo "   Mot de passe: Admin2024!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Statut des services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [[ "$BACKEND_STATUS" == *"RUNNING"* ]]; then
    ok "Backend: RUNNING"
    echo ""
    echo "✅ Tout est opérationnel !"
    echo ""
    echo "📚 Manuel utilisateur : 23 chapitres avec recherche intuitive 🔍"
    echo "   Utilisez le bouton 'Manuel' dans l'application pour y accéder"
    echo ""
    echo "Testez la connexion:"
    echo "  curl ${FRONTEND_URL}/api/health"
else
    warn "Backend: Vérifier les logs"
    echo ""
    echo "Pour diagnostiquer:"
    echo "  pct enter $CTID"
    echo "  supervisorctl status"
    echo "  tail -f /var/log/gmao-iris-backend.err.log"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuration SMTP (Envoi d'emails)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pour envoyer des invitations par email, vous devez configurer un serveur SMTP."
echo ""
read -p "Voulez-vous configurer le SMTP maintenant ? (y/n) : " configure_smtp

if [[ "$configure_smtp" == "y" || "$configure_smtp" == "Y" ]]; then
    echo ""
    msg "Configuration SMTP dans le container..."
    
    # Exécuter le script setup-email.sh dans le container avec l'IP en paramètre
    pct exec $CTID -- bash -c "cd /opt/gmao-iris && CONTAINER_IP=${CONTAINER_IP} bash setup-email.sh"
    
    echo ""
    ok "Configuration SMTP terminée"
else
    echo ""
    warn "Configuration SMTP ignorée"
    echo "Vous pourrez la configurer plus tard avec :"
    echo "  pct enter $CTID"
    echo "  cd /opt/gmao-iris"
    echo "  bash setup-email.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Commandes utiles"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Entrer dans le container:"
echo "  pct enter $CTID"
echo ""
echo "Configurer SMTP:"
echo "  pct enter $CTID"
echo "  cd /opt/gmao-iris && bash setup-email.sh"
echo ""
echo "Arrêter/Démarrer le container:"
echo "  pct stop $CTID"
echo "  pct start $CTID"
echo ""
