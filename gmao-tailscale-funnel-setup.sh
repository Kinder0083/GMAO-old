#!/usr/bin/env bash
###############################################################################
# GMAO Iris - Installation Tailscale Funnel
#
# Remplace la configuration SSL (Let's Encrypt/DuckDNS) par Tailscale Funnel
# pour un acces HTTPS public sans pare-feu ni redirection de ports.
#
# Usage : sudo bash gmao-tailscale-funnel-setup.sh
# Prerequis : Executer DANS le container LXC apres l'installation GMAO
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

msg()  { echo -e "${BLUE}>>>${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERREUR]${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[ATTENTION]${NC} $1"; }
ask()  { echo -en "${CYAN}?${NC} $1 "; }

BACKEND_ENV="/opt/gmao-iris/backend/.env"
NGINX_CONF="/etc/nginx/sites-available/gmao-iris"
LOG_FILE="/tmp/gmao-tailscale-setup-$(date +%Y%m%d_%H%M%S).log"

exec > >(tee -a "$LOG_FILE") 2>&1

###############################################################################
# VERIFICATIONS PREALABLES
###############################################################################

clear
echo ""
echo "=================================================================="
echo "   GMAO IRIS - Installation Tailscale Funnel"
echo "=================================================================="
echo ""
echo "  Tailscale Funnel permet d'acceder a votre GMAO depuis"
echo "  n'importe ou via HTTPS, sans ouvrir de ports ni configurer"
echo "  de pare-feu. Tailscale gere le certificat SSL automatiquement."
echo ""
echo "  Log de cette session : $LOG_FILE"
echo ""

if [ "$(id -u)" -ne 0 ]; then
    err "Ce script doit etre execute en tant que root (sudo bash $0)"
fi

if [ ! -d "/opt/gmao-iris" ]; then
    err "GMAO Iris non trouve dans /opt/gmao-iris."
fi

if [ ! -f "$BACKEND_ENV" ]; then
    err "Fichier $BACKEND_ENV introuvable."
fi

if ! command -v nginx &> /dev/null; then
    err "Nginx n'est pas installe."
fi

ok "Verifications prealables passees"
echo ""

###############################################################################
# ETAPE 1 : Detection LXC + verification TUN device
###############################################################################

echo "------------------------------------------------------------------"
echo "  Etape 1/8 : Verification de l'environnement"
echo "------------------------------------------------------------------"
echo ""

IS_LXC=false
if grep -qa "container=lxc" /proc/1/environ 2>/dev/null || [ -f /proc/1/environ ] && tr '\0' '\n' < /proc/1/environ 2>/dev/null | grep -q "container=lxc"; then
    IS_LXC=true
fi

if [ "$IS_LXC" = true ]; then
    msg "Container LXC detecte"

    # Verifier si le peripherique TUN existe
    if [ ! -c /dev/net/tun ]; then
        echo ""
        echo -e "${RED}=================================================================="
        echo "  PERIPHERIQUE TUN MANQUANT"
        echo "==================================================================${NC}"
        echo ""
        echo "  Tailscale necessite le peripherique /dev/net/tun qui n'existe"
        echo "  pas dans ce container LXC."
        echo ""
        echo "  Executez ces commandes sur le HOST PROXMOX (pas ici) :"
        echo ""
        echo "  -------------------------------------------------------"

        # Essayer de detecter le CTID
        CTID=""
        if [ -f /etc/hostname ]; then
            HOSTNAME_LXC=$(cat /etc/hostname)
            echo "  # Container detecte : $HOSTNAME_LXC"
        fi

        echo ""
        echo "  # Remplacez CTID par l'ID de votre container (ex: 100)"
        echo "  # Pour le trouver : pct list"
        echo ""
        echo "  pct stop CTID"
        echo ""
        echo '  echo "lxc.cgroup2.devices.allow: c 10:200 rwm" >> /etc/pve/lxc/CTID.conf'
        echo '  echo "lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file" >> /etc/pve/lxc/CTID.conf'
        echo ""
        echo "  pct start CTID"
        echo "  -------------------------------------------------------"
        echo ""
        echo "  Puis relancez ce script dans le container."
        echo ""
        exit 1
    else
        ok "Peripherique TUN present (/dev/net/tun)"
    fi
else
    ok "Environnement standard (non-LXC)"
fi

echo ""

###############################################################################
# ETAPE 2 : Prerequis Tailscale (instructions admin console)
###############################################################################

echo "------------------------------------------------------------------"
echo "  Etape 2/8 : Prerequis console d'administration Tailscale"
echo "------------------------------------------------------------------"
echo ""
echo "  AVANT de continuer, assurez-vous d'avoir fait ceci dans la"
echo "  console d'administration Tailscale (https://login.tailscale.com/admin) :"
echo ""
echo "  1. Creer un compte Tailscale (si pas deja fait)"
echo "     https://login.tailscale.com/start"
echo ""
echo "  2. Activer MagicDNS :"
echo "     Admin Console > DNS > activer MagicDNS"
echo ""
echo "  3. Activer les certificats HTTPS :"
echo "     Admin Console > DNS > HTTPS Certificates > Enable"
echo ""
echo "  4. Activer Funnel dans les ACL :"
echo "     Admin Console > Access Controls"
echo "     (https://login.tailscale.com/admin/acls/file)"
echo ""
echo "     Ajoutez ce bloc APRES le bloc \"acls\" existant :"
echo ""
echo '     "nodeAttrs": ['
echo '       {'
echo '         "target": ["autogroup:member"],'
echo '         "attr": ["funnel"]'
echo '       }'
echo '     ]'
echo ""
echo "     Puis cliquez sur Save."
echo ""
warn "Si vous n'avez pas encore fait ces etapes, faites-les maintenant."
echo ""
ask "Les prerequis sont-ils configures ? (o/n) [o] :"
read -r PREREQS_OK
PREREQS_OK=${PREREQS_OK:-o}
if [[ ! "$PREREQS_OK" =~ ^[OoYy]$ ]]; then
    echo ""
    echo "  Configurez les prerequis puis relancez ce script."
    exit 0
fi

###############################################################################
# ETAPE 3 : Installation de Tailscale
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 3/8 : Installation de Tailscale"
echo "------------------------------------------------------------------"
echo ""

if command -v tailscale &> /dev/null; then
    TS_VERSION=$(tailscale version 2>/dev/null | head -1)
    ok "Tailscale deja installe (version: $TS_VERSION)"
else
    msg "Installation de Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
    if command -v tailscale &> /dev/null; then
        ok "Tailscale installe avec succes"
    else
        err "Echec de l'installation de Tailscale"
    fi
fi

# S'assurer que tailscaled tourne
if ! systemctl is-active --quiet tailscaled 2>/dev/null; then
    msg "Demarrage du service tailscaled..."
    systemctl enable --now tailscaled
    sleep 3
fi

# Verifier que le socket existe (probleme LXC courant)
if [ ! -S /var/run/tailscale/tailscaled.sock ]; then
    warn "Le socket tailscaled n'existe pas. Redemarrage du service..."
    systemctl restart tailscaled
    sleep 5
    if [ ! -S /var/run/tailscale/tailscaled.sock ]; then
        echo ""
        echo -e "${RED}  Le service tailscaled ne demarre pas correctement.${NC}"
        echo ""
        if [ "$IS_LXC" = true ]; then
            echo "  C'est probablement un probleme de peripherique TUN."
            echo "  Verifiez que /dev/net/tun existe : ls -la /dev/net/tun"
            echo "  Si ce n'est pas le cas, suivez les instructions de l'etape 1."
        fi
        echo ""
        echo "  Logs du service :"
        journalctl -u tailscaled --no-pager -n 20 2>/dev/null || true
        err "Impossible de demarrer tailscaled."
    fi
fi

ok "Service tailscaled actif"

###############################################################################
# ETAPE 4 : Connexion a Tailscale
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 4/8 : Connexion a votre compte Tailscale"
echo "------------------------------------------------------------------"
echo ""

# Verifier si deja connecte
TS_STATUS=$(tailscale status --json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('BackendState',''))" 2>/dev/null || echo "")

if [ "$TS_STATUS" = "Running" ]; then
    ok "Deja connecte a Tailscale"
else
    msg "Connexion a Tailscale..."
    echo ""
    echo "  Un lien va s'afficher ci-dessous."
    echo "  Ouvrez-le dans votre navigateur pour autoriser ce serveur."
    echo ""
    tailscale up
    echo ""

    # Verifier la connexion
    sleep 3
    TS_STATUS=$(tailscale status --json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('BackendState',''))" 2>/dev/null || echo "")
    if [ "$TS_STATUS" != "Running" ]; then
        err "Tailscale n'est pas connecte. Verifiez que vous avez autorise ce serveur."
    fi
    ok "Connecte a Tailscale"
fi

# Recuperer le nom DNS Tailscale
TS_HOSTNAME=$(tailscale status --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
self_key = data.get('Self', {}).get('DNSName', '')
# Supprimer le point final
print(self_key.rstrip('.'))
" 2>/dev/null || echo "")

if [ -z "$TS_HOSTNAME" ]; then
    err "Impossible de recuperer le nom DNS Tailscale. Verifiez avec : tailscale status"
fi

TS_URL="https://$TS_HOSTNAME"
echo ""
ok "Nom DNS Tailscale : $TS_HOSTNAME"
ok "URL publique      : $TS_URL"

###############################################################################
# ETAPE 5 : Generation du certificat SSL
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 5/8 : Generation du certificat SSL Tailscale"
echo "------------------------------------------------------------------"
echo ""

msg "Generation du certificat pour $TS_HOSTNAME..."

CERT_DIR="/opt/gmao-iris/certs"
mkdir -p "$CERT_DIR"

if tailscale cert --cert-file "$CERT_DIR/$TS_HOSTNAME.crt" --key-file "$CERT_DIR/$TS_HOSTNAME.key" "$TS_HOSTNAME" 2>&1; then
    ok "Certificat SSL genere dans $CERT_DIR/"
else
    warn "Impossible de generer le certificat. Verifiez que les certificats HTTPS sont actives dans Admin Console > DNS."
    echo "  Tailscale Funnel fonctionnera quand meme (il gere son propre SSL)."
fi

###############################################################################
# ETAPE 6 : Configuration Nginx (HTTP simple, sans SSL)
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 6/8 : Reconfiguration Nginx"
echo "------------------------------------------------------------------"
echo ""

msg "Tailscale Funnel gere le SSL. Nginx n'a besoin que du HTTP."

# Backup
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    ok "Backup de la configuration Nginx"
fi

# Recuperer l'IP locale pour l'acces reseau local
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

# Nouvelle config Nginx simplifiee (HTTP uniquement)
cat > "$NGINX_CONF" << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 25M;

    # Frontend (fichiers statiques)
    location / {
        root /opt/gmao-iris/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # WebSocket - Chat Live
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

    # WebSocket - Tableau d'affichage
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
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx reconfigure (HTTP uniquement, SSL gere par Tailscale)"
else
    err "Erreur dans la configuration Nginx."
fi

###############################################################################
# ETAPE 7 : Activation de Tailscale Funnel + mise a jour .env
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 7/8 : Activation de Tailscale Funnel + configuration"
echo "------------------------------------------------------------------"
echo ""

msg "Activation de Funnel sur le port 80..."

# Arreter tout serve/funnel existant
tailscale serve reset 2>/dev/null || true

# Activer Funnel en arriere-plan (HTTPS public -> HTTP local port 80)
if tailscale funnel --bg 80 2>&1; then
    ok "Tailscale Funnel actif !"
    echo ""
    echo "  Votre GMAO est maintenant accessible publiquement a :"
    echo "  $TS_URL"
    echo ""
else
    err "Echec de l'activation de Funnel.\n  Verifiez que :\n  - Funnel est active dans les ACL (Admin Console > Access Controls)\n  - Les certificats HTTPS sont actives (Admin Console > DNS)\n  - MagicDNS est active"
fi

# Statut
msg "Statut Tailscale Funnel :"
tailscale funnel status 2>&1 || true

echo ""

# --- Mise a jour .env ---

msg "Mise a jour de la configuration backend..."

cp "$BACKEND_ENV" "${BACKEND_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
ok "Backup du fichier .env"

# Mettre a jour FRONTEND_URL
if grep -q "^FRONTEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$TS_URL|" "$BACKEND_ENV"
else
    echo "FRONTEND_URL=$TS_URL" >> "$BACKEND_ENV"
fi
ok "FRONTEND_URL = $TS_URL"

# Mettre a jour BACKEND_URL
if grep -q "^BACKEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=$TS_URL|" "$BACKEND_ENV"
else
    echo "BACKEND_URL=$TS_URL" >> "$BACKEND_ENV"
fi
ok "BACKEND_URL = $TS_URL"

# Mettre a jour APP_URL
if grep -q "^APP_URL=" "$BACKEND_ENV"; then
    sed -i "s|^APP_URL=.*|APP_URL=$TS_URL|" "$BACKEND_ENV"
else
    echo "APP_URL=$TS_URL" >> "$BACKEND_ENV"
fi
ok "APP_URL = $TS_URL"

# Mettre a jour Google Drive redirect URI si configure
if grep -q "^GOOGLE_DRIVE_REDIRECT_URI=" "$BACKEND_ENV"; then
    NEW_REDIRECT="$TS_URL/api/backup/drive/callback"
    sed -i "s|^GOOGLE_DRIVE_REDIRECT_URI=.*|GOOGLE_DRIVE_REDIRECT_URI=$NEW_REDIRECT|" "$BACKEND_ENV"
    ok "GOOGLE_DRIVE_REDIRECT_URI = $NEW_REDIRECT"
    echo ""
    warn "IMPORTANT : Mettez a jour l'URI de redirection dans Google Cloud Console :"
    echo "  Nouvelle : $NEW_REDIRECT"
    echo ""
fi

# Redemarrer le backend
msg "Redemarrage du backend..."
supervisorctl restart gmao-iris-backend
sleep 5

BACKEND_STATUS=$(supervisorctl status gmao-iris-backend 2>/dev/null | grep -c "RUNNING" || echo "0")
if [ "$BACKEND_STATUS" -ge 1 ]; then
    ok "Backend demarre"
else
    warn "Le backend ne semble pas demarre. Verifiez : tail -f /var/log/gmao-iris-backend.err.log"
fi

###############################################################################
# ETAPE 8 : Tests + nettoyage
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 8/8 : Tests et finalisation"
echo "------------------------------------------------------------------"
echo ""

# Test local
msg "Test local Nginx..."
LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
if [ "$LOCAL_CODE" = "200" ]; then
    ok "Nginx repond en local (code: $LOCAL_CODE)"
else
    warn "Nginx local retourne le code $LOCAL_CODE"
fi

# Test HTTPS via Tailscale Funnel
msg "Test HTTPS via Tailscale Funnel..."
sleep 2
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$TS_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    ok "HTTPS Funnel fonctionne ! (code: $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    warn "Impossible de se connecter depuis le serveur. Le Funnel peut prendre quelques secondes."
    echo "  Reessayez dans 30 secondes : curl -sk $TS_URL"
else
    warn "HTTPS retourne le code $HTTP_CODE"
fi

# Test API
msg "Test de l'API..."
API_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$TS_URL/api/version" 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    ok "API accessible (code: $API_CODE)"
else
    warn "API retourne le code $API_CODE"
fi

# Nettoyage Let's Encrypt
echo ""
ask "Voulez-vous desactiver l'ancien certificat Let's Encrypt ? (o/n) [o] :"
read -r CLEANUP_LE
CLEANUP_LE=${CLEANUP_LE:-o}

if [[ "$CLEANUP_LE" =~ ^[OoYy]$ ]]; then
    systemctl disable --now certbot.timer 2>/dev/null || true
    rm -f /etc/cron.d/certbot-renew 2>/dev/null || true
    ok "Renouvellement Let's Encrypt desactive"
    echo "  Les certificats existants restent dans /etc/letsencrypt/ (non supprimes)"
fi

###############################################################################
# RESUME FINAL
###############################################################################

echo ""
echo "=================================================================="
echo "              CONFIGURATION TERMINEE !"
echo "=================================================================="
echo ""
echo "------------------------------------------------------------------"
echo "  Acces a votre GMAO"
echo "------------------------------------------------------------------"
echo ""
echo "  URL publique HTTPS : $TS_URL"
echo "  SSL                : Automatique (Tailscale)"
echo "  Pare-feu           : Aucun port a ouvrir"
if [ -n "$LOCAL_IP" ]; then
    echo "  Acces reseau local : http://$LOCAL_IP"
fi
echo ""

if grep -q "^GOOGLE_DRIVE_REDIRECT_URI=" "$BACKEND_ENV"; then
    echo "------------------------------------------------------------------"
    echo "  Google Drive"
    echo "------------------------------------------------------------------"
    echo ""
    echo "  RAPPEL : Mettez a jour l'URI de redirection dans"
    echo "  Google Cloud Console :"
    echo "  $TS_URL/api/backup/drive/callback"
    echo ""
fi

echo "------------------------------------------------------------------"
echo "  Acces depuis votre reseau local (WiFi)"
echo "------------------------------------------------------------------"
echo ""
echo "  Si l'URL Tailscale ne fonctionne pas depuis votre WiFi"
echo "  (erreur DNS_PROBE_POSSIBLE), c'est parce que votre box"
echo "  internet ne resout pas les domaines *.ts.net."
echo ""
echo "  Solutions :"
echo ""
echo "  SOLUTION 1 : Changer les DNS de votre PC (recommande)"
echo ""
echo "    Windows :"
echo "    1. Parametres > Reseau et Internet > WiFi > Proprietes du materiel"
echo "    2. Attribution du serveur DNS > Modifier"
echo "    3. Selectionner Manuel, activer IPv4"
echo "    4. DNS prefere  : 8.8.8.8"
echo "       DNS auxiliaire : 1.1.1.1"
echo "    5. Enregistrer"
echo ""
echo "    macOS :"
echo "    1. Preferences Systeme > Reseau > WiFi > Details > DNS"
echo "    2. Ajouter : 8.8.8.8 et 1.1.1.1"
echo ""
echo "    Linux :"
echo "    Editez /etc/resolv.conf ou utilisez systemd-resolved :"
echo "      sudo resolvectl dns wlan0 8.8.8.8 1.1.1.1"
echo ""
echo "    Android / iPhone :"
echo "    Parametres WiFi du reseau > DNS > Manuel"
echo "    DNS 1 : 8.8.8.8  /  DNS 2 : 1.1.1.1"
echo ""
echo "  SOLUTION 2 : Acces direct par IP locale"
if [ -n "$LOCAL_IP" ]; then
    echo "    Ouvrez : http://$LOCAL_IP"
else
    echo "    Ouvrez : http://<IP_DU_CONTAINER>"
fi
echo "    (sans HTTPS, uniquement depuis le reseau local)"
echo ""

echo "------------------------------------------------------------------"
echo "  Commandes utiles"
echo "------------------------------------------------------------------"
echo ""
echo "  Statut Tailscale     : tailscale status"
echo "  Statut Funnel        : tailscale funnel status"
echo "  Desactiver Funnel    : tailscale funnel off"
echo "  Reactiver Funnel     : tailscale funnel --bg 80"
echo "  Logs backend         : tail -f /var/log/gmao-iris-backend.err.log"
echo "  Log de cette session : cat $LOG_FILE"
echo ""
