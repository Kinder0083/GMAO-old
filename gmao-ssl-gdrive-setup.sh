#!/usr/bin/env bash
###############################################################################
# GMAO Iris - Configuration SSL + Google Drive
#
# Script post-installation pour :
# 1. Installer un certificat SSL Let's Encrypt via Certbot
# 2. Configurer Nginx avec HTTPS automatiquement
# 3. Configurer la connexion Google Drive pour les sauvegardes
# 4. Mettre a jour le fichier .env du backend
# 5. Redemarrer les services et tester la connexion
#
# Usage : sudo bash gmao-ssl-gdrive-setup.sh
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
LOG_FILE="/tmp/gmao-ssl-setup-$(date +%Y%m%d_%H%M%S).log"

# Rediriger aussi vers le fichier log
exec > >(tee -a "$LOG_FILE") 2>&1

###############################################################################
# VERIFICATIONS PREALABLES
###############################################################################

clear
echo ""
echo "=================================================================="
echo "   GMAO IRIS - Configuration SSL + Google Drive"
echo "=================================================================="
echo ""
echo "  Log de cette session : $LOG_FILE"
echo ""

# Verifier les privileges root
if [ "$(id -u)" -ne 0 ]; then
    err "Ce script doit etre execute en tant que root (sudo bash $0)"
fi

# Verifier que GMAO Iris est installe
if [ ! -d "/opt/gmao-iris" ]; then
    err "GMAO Iris non trouve dans /opt/gmao-iris. Executez d'abord le script d'installation principal."
fi

if [ ! -f "$BACKEND_ENV" ]; then
    err "Fichier $BACKEND_ENV introuvable."
fi

# Verifier que Nginx est installe
if ! command -v nginx &> /dev/null; then
    err "Nginx n'est pas installe. Executez d'abord le script d'installation principal."
fi

# Verifier que Supervisor est present
if ! command -v supervisorctl &> /dev/null; then
    err "Supervisor n'est pas installe. Executez d'abord le script d'installation principal."
fi

ok "Verifications prealables passees"
echo ""

###############################################################################
# ETAPE 1 : Collecte des informations
###############################################################################

echo "------------------------------------------------------------------"
echo "  Etape 1/5 : Informations requises"
echo "------------------------------------------------------------------"
echo ""

# --- Domaine ---
ask "Entrez votre nom de domaine (ex: gmaoiris.duckdns.org) :"
read -r DOMAIN
if [ -z "$DOMAIN" ]; then
    err "Le nom de domaine est obligatoire."
fi

# Verifier la resolution DNS
msg "Verification DNS de $DOMAIN..."
DNS_OK=false
if command -v host &> /dev/null; then
    host "$DOMAIN" > /dev/null 2>&1 && DNS_OK=true
elif command -v nslookup &> /dev/null; then
    nslookup "$DOMAIN" > /dev/null 2>&1 && DNS_OK=true
elif command -v getent &> /dev/null; then
    getent hosts "$DOMAIN" > /dev/null 2>&1 && DNS_OK=true
elif command -v dig &> /dev/null; then
    dig +short "$DOMAIN" 2>/dev/null | grep -q '.' && DNS_OK=true
fi

if [ "$DNS_OK" = true ]; then
    ok "DNS OK pour $DOMAIN"
else
    warn "Impossible de resoudre $DOMAIN. Verifiez que le DNS pointe vers ce serveur."
    ask "Continuer quand meme ? (o/n) [n] :"
    read -r CONTINUE_DNS
    if [[ ! "$CONTINUE_DNS" =~ ^[OoYy]$ ]]; then
        err "Installation annulee."
    fi
fi
echo ""

# --- Email pour Certbot (optionnel) ---
ask "Email pour les notifications SSL (laisser vide pour ignorer) :"
read -r CERTBOT_EMAIL
echo ""

# --- Google Drive ---
ask "Souhaitez-vous configurer Google Drive pour les sauvegardes ? (o/n) [o] :"
read -r SETUP_GDRIVE
SETUP_GDRIVE=${SETUP_GDRIVE:-o}

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
    echo ""
    echo "  Pour obtenir les identifiants Google Drive :"
    echo "  1. Allez sur https://console.cloud.google.com"
    echo "  2. Creez un projet > Activez l'API Google Drive"
    echo "  3. Creez des identifiants OAuth 2.0 (Application Web)"
    echo "  4. Ajoutez cette URI de redirection autorisee :"
    echo ""
    echo "     https://$DOMAIN/api/backup/drive/callback"
    echo ""

    ask "Client ID Google (ex: xxxx.apps.googleusercontent.com) :"
    read -r GOOGLE_CLIENT_ID
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        warn "Client ID vide. Google Drive ne sera pas configure."
        SETUP_GDRIVE="n"
    fi

    if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
        ask "Client Secret Google (ex: GOCSPX-xxxx) :"
        read -r GOOGLE_CLIENT_SECRET
        if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
            warn "Client Secret vide. Google Drive ne sera pas configure."
            SETUP_GDRIVE="n"
        fi
    fi
fi

echo ""
echo "------------------------------------------------------------------"
echo "  Recapitulatif"
echo "------------------------------------------------------------------"
echo ""
echo "  Domaine         : $DOMAIN"
echo "  SSL             : Let's Encrypt (Certbot)"
if [ -n "$CERTBOT_EMAIL" ]; then
    echo "  Email SSL       : $CERTBOT_EMAIL"
else
    echo "  Email SSL       : (aucun)"
fi
if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
    echo "  Google Drive    : Oui (Client ID: ${GOOGLE_CLIENT_ID:0:25}...)"
else
    echo "  Google Drive    : Non"
fi
echo ""
ask "Confirmer et lancer l'installation ? (o/n) [o] :"
read -r CONFIRM
CONFIRM=${CONFIRM:-o}
if [[ ! "$CONFIRM" =~ ^[OoYy]$ ]]; then
    err "Installation annulee."
fi

###############################################################################
# ETAPE 2 : Installation Certbot + Certificat SSL
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 2/5 : Installation du certificat SSL"
echo "------------------------------------------------------------------"
echo ""

# Installer certbot si necessaire
if ! command -v certbot &> /dev/null; then
    msg "Installation de Certbot..."
    apt-get update -qq
    apt-get install -y -qq certbot python3-certbot-nginx
    ok "Certbot installe"
else
    ok "Certbot deja installe"
fi

# Preparer les arguments email pour Certbot
CERTBOT_EMAIL_ARG=""
if [ -n "$CERTBOT_EMAIL" ]; then
    CERTBOT_EMAIL_ARG="--email $CERTBOT_EMAIL"
else
    CERTBOT_EMAIL_ARG="--register-unsafely-without-email"
fi

# Verifier si un certificat existe deja
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    ok "Certificat SSL deja existant pour $DOMAIN"
else
    msg "Generation du certificat SSL pour $DOMAIN..."

    # S'assurer que Nginx ecoute sur le port 80 avec le bon server_name pour la validation
    # Ecrire une config temporaire minimale pour la validation Certbot
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" "${NGINX_CONF}.pre-certbot.backup"
    fi

    # Ecrire config temporaire pour validation HTTP
    cat > "$NGINX_CONF" << TMPNGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 25M;

    location / {
        root /opt/gmao-iris/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
TMPNGINX
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t 2>/dev/null && systemctl reload nginx

    # Tentative 1 : mode nginx
    msg "Tentative avec le plugin Nginx..."
    if certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos $CERTBOT_EMAIL_ARG 2>&1; then
        ok "Certificat obtenu via le plugin Nginx"
    else
        # Tentative 2 : mode standalone (arret temporaire de Nginx)
        warn "Plugin Nginx echoue. Tentative en mode standalone..."
        systemctl stop nginx
        if certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos $CERTBOT_EMAIL_ARG 2>&1; then
            ok "Certificat obtenu en mode standalone"
        else
            systemctl start nginx
            err "Impossible d'obtenir le certificat SSL.\n  Verifiez que :\n  - Le port 80 est accessible depuis Internet\n  - Le DNS de $DOMAIN pointe vers ce serveur\n  - Votre routeur redirige le port 80 vers ce container\n  Logs : /var/log/letsencrypt/letsencrypt.log"
        fi
        systemctl start nginx
    fi

    # Verification finale
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        err "Le certificat n'a pas ete cree. Consultez : /var/log/letsencrypt/letsencrypt.log"
    fi

    ok "Certificat SSL obtenu avec succes !"
fi

###############################################################################
# ETAPE 3 : Configuration Nginx avec SSL
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 3/5 : Configuration Nginx HTTPS"
echo "------------------------------------------------------------------"
echo ""

# Backup de la config actuelle
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    ok "Backup de la configuration Nginx"
fi

# Ecrire la configuration definitive avec SSL
cat > "$NGINX_CONF" << NGINXEOF
# Redirection HTTP -> HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

# Serveur HTTPS principal
server {
    listen 443 ssl;
    server_name $DOMAIN;
    client_max_body_size 25M;

    # Certificats SSL Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Parametres SSL recommandes
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Frontend (fichiers statiques)
    location / {
        root /opt/gmao-iris/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket - Chat Live
    location /ws/chat/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # WebSocket - Tableau d'affichage
    location /ws/whiteboard/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
NGINXEOF

# Activer le site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger Nginx
if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx configure avec SSL"
else
    # Restaurer le backup en cas d'erreur
    LATEST_BACKUP=$(find "$(dirname "$NGINX_CONF")" -name "$(basename "$NGINX_CONF").backup.*" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$NGINX_CONF"
        nginx -t 2>/dev/null && systemctl reload nginx
    fi
    err "Erreur dans la configuration Nginx. Le backup a ete restaure."
fi

# Verifier que le port 443 repond
sleep 2
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    ok "HTTPS fonctionne ! (code: $HTTP_CODE)"
elif [ "$HTTP_CODE" = "000" ]; then
    warn "Impossible de se connecter en HTTPS."
    echo "  Verifiez que le port 443 est ouvert sur votre routeur/firewall."
else
    warn "HTTPS retourne le code $HTTP_CODE (peut etre normal si le frontend n'est pas encore build)"
fi

###############################################################################
# ETAPE 4 : Mise a jour du .env + Google Drive
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 4/5 : Mise a jour de la configuration backend"
echo "------------------------------------------------------------------"
echo ""

# Backup du .env
cp "$BACKEND_ENV" "${BACKEND_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
ok "Backup du fichier .env"

# --- Mettre a jour FRONTEND_URL ---
if grep -q "^FRONTEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$BACKEND_ENV"
else
    echo "FRONTEND_URL=https://$DOMAIN" >> "$BACKEND_ENV"
fi
ok "FRONTEND_URL = https://$DOMAIN"

# --- Mettre a jour BACKEND_URL ---
if grep -q "^BACKEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=https://$DOMAIN|" "$BACKEND_ENV"
else
    echo "BACKEND_URL=https://$DOMAIN" >> "$BACKEND_ENV"
fi
ok "BACKEND_URL = https://$DOMAIN"

# --- Mettre a jour APP_URL ---
if grep -q "^APP_URL=" "$BACKEND_ENV"; then
    sed -i "s|^APP_URL=.*|APP_URL=https://$DOMAIN|" "$BACKEND_ENV"
else
    echo "APP_URL=https://$DOMAIN" >> "$BACKEND_ENV"
fi
ok "APP_URL = https://$DOMAIN"

# --- Remplacer toute reference http://DOMAIN par https:// ---
if grep -q "http://$DOMAIN" "$BACKEND_ENV" 2>/dev/null; then
    sed -i "s|http://$DOMAIN|https://$DOMAIN|g" "$BACKEND_ENV"
    ok "Toutes les references HTTP mises a jour vers HTTPS"
fi

# --- Google Drive ---
if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
    REDIRECT_URI="https://$DOMAIN/api/backup/drive/callback"

    # Supprimer les anciennes entrees Google si elles existent
    sed -i '/^GOOGLE_CLIENT_ID=/d' "$BACKEND_ENV"
    sed -i '/^GOOGLE_CLIENT_SECRET=/d' "$BACKEND_ENV"
    sed -i '/^GOOGLE_DRIVE_REDIRECT_URI=/d' "$BACKEND_ENV"

    # Ajouter les nouvelles
    {
        echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
        echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
        echo "GOOGLE_DRIVE_REDIRECT_URI=$REDIRECT_URI"
    } >> "$BACKEND_ENV"

    ok "Identifiants Google Drive configures"
    echo ""
    echo "  URI de redirection a ajouter dans Google Cloud Console :"
    echo "  $REDIRECT_URI"
    echo ""
else
    ok "Google Drive ignore"
fi

###############################################################################
# ETAPE 5 : Redemarrage et tests
###############################################################################

echo ""
echo "------------------------------------------------------------------"
echo "  Etape 5/5 : Redemarrage et verification"
echo "------------------------------------------------------------------"
echo ""

msg "Redemarrage du backend..."
supervisorctl restart gmao-iris-backend
sleep 5

# Verifier que le backend tourne
BACKEND_STATUS=$(supervisorctl status gmao-iris-backend 2>/dev/null | grep -c "RUNNING" || echo "0")
if [ "$BACKEND_STATUS" -ge 1 ]; then
    ok "Backend demarre"
else
    warn "Le backend ne semble pas demarre. Verifiez les logs :"
    echo "  tail -f /var/log/gmao-iris-backend.err.log"
fi

# Test API
msg "Test de l'API..."
API_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/version" 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    ok "API accessible en HTTPS (code: $API_CODE)"
else
    warn "API retourne le code $API_CODE (verifiez les logs backend)"
fi

# Test Google Drive si configure
if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
    msg "Test de la configuration Google Drive..."

    DRIVE_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/backup/drive/status" 2>/dev/null || echo "000")

    if [ "$DRIVE_CODE" = "200" ] || [ "$DRIVE_CODE" = "401" ] || [ "$DRIVE_CODE" = "403" ]; then
        ok "Endpoint Google Drive accessible (code: $DRIVE_CODE)"
    else
        warn "Endpoint Google Drive retourne le code $DRIVE_CODE"
    fi
fi

# Verifier le renouvellement automatique Certbot
msg "Verification du timer de renouvellement Certbot..."
if systemctl is-active --quiet certbot.timer 2>/dev/null; then
    ok "Renouvellement automatique SSL actif (certbot.timer)"
elif [ -f "/etc/cron.d/certbot" ]; then
    ok "Renouvellement automatique SSL actif (cron)"
else
    warn "Aucun renouvellement automatique detecte."
    msg "Ajout d'une tache cron pour le renouvellement..."
    echo "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew
    chmod 644 /etc/cron.d/certbot-renew
    ok "Tache cron de renouvellement creee (tous les jours a 3h)"
fi

# Ouvrir le port 443 dans le firewall si UFW est actif
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "active"; then
        ufw allow 443/tcp > /dev/null 2>&1
        ufw allow 80/tcp > /dev/null 2>&1
        ok "Ports 80 et 443 ouverts dans le firewall (UFW)"
    fi
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
echo "  Resume"
echo "------------------------------------------------------------------"
echo ""
echo "  SSL             : https://$DOMAIN"
echo "  Certificat      : /etc/letsencrypt/live/$DOMAIN/"
echo "  Renouvellement  : Automatique"

if [[ "$SETUP_GDRIVE" =~ ^[OoYy]$ ]]; then
    echo ""
    echo "  Google Drive    : Configure"
    echo "  URI callback    : https://$DOMAIN/api/backup/drive/callback"
    echo ""
    echo "  IMPORTANT : Assurez-vous d'avoir ajoute cette URI"
    echo "  de redirection dans la Google Cloud Console :"
    echo "  https://$DOMAIN/api/backup/drive/callback"
    echo ""
    echo "  Pour connecter Google Drive :"
    echo "  1. Connectez-vous a https://$DOMAIN"
    echo "  2. Allez dans Import/Export > onglet Sauvegardes Automatiques"
    echo "  3. Cliquez sur 'Connecter Google Drive'"
fi

echo ""
echo "------------------------------------------------------------------"
echo "  Commandes utiles"
echo "------------------------------------------------------------------"
echo ""
echo "  Verifier le certificat SSL :"
echo "    certbot certificates"
echo ""
echo "  Renouveler manuellement le SSL :"
echo "    certbot renew"
echo ""
echo "  Verifier les logs backend :"
echo "    tail -f /var/log/gmao-iris-backend.err.log"
echo ""
echo "  Tester la configuration Nginx :"
echo "    nginx -t && systemctl reload nginx"
echo ""
echo "  Voir le .env actuel :"
echo "    cat $BACKEND_ENV"
echo ""
echo "  Log de cette session :"
echo "    cat $LOG_FILE"
echo ""
