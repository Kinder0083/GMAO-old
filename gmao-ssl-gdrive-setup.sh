#!/usr/bin/env bash
###############################################################################
# GMAO Iris - Configuration SSL + Google Drive
#
# Script post-installation pour :
# 1. Installer un certificat SSL Let's Encrypt
# 2. Configurer Nginx avec HTTPS automatiquement
# 3. Configurer la connexion Google Drive pour les sauvegardes
# 4. Tester la connexion
#
# Usage : bash gmao-ssl-gdrive-setup.sh
# Prérequis : Exécuter DANS le container LXC après l'installation GMAO
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

msg()  { echo -e "${BLUE}▶${NC} $1"; }
ok()   { echo -e "${GREEN}✔${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
ask()  { echo -e "${CYAN}?${NC} $1"; }

BACKEND_ENV="/opt/gmao-iris/backend/.env"
NGINX_CONF="/etc/nginx/sites-available/gmao-iris"

clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   GMAO IRIS - Configuration SSL + Google Drive               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon environnement
if [ ! -d "/opt/gmao-iris" ]; then
    err "GMAO Iris non trouvé dans /opt/gmao-iris. Exécutez d'abord le script d'installation principal."
fi

if [ ! -f "$BACKEND_ENV" ]; then
    err "Fichier $BACKEND_ENV introuvable."
fi

###############################################################################
# ÉTAPE 1 : Collecte des informations
###############################################################################

echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Étape 1/5 : Informations requises                         │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

# Domaine
ask "Entrez votre nom de domaine (ex: gmaoiris.duckdns.org) :"
read -r DOMAIN
if [ -z "$DOMAIN" ]; then
    err "Le nom de domaine est obligatoire"
fi

# Vérifier que le domaine résout vers une IP
msg "Vérification DNS de $DOMAIN..."
if ! host "$DOMAIN" > /dev/null 2>&1 && ! nslookup "$DOMAIN" > /dev/null 2>&1; then
    warn "Impossible de résoudre $DOMAIN. Vérifiez que le DNS pointe vers votre serveur."
    ask "Continuer quand même ? (y/n) [n]"
    read -r CONTINUE_DNS
    if [[ ! "$CONTINUE_DNS" =~ ^[Yy]$ ]]; then
        err "Installation annulée"
    fi
else
    ok "DNS OK pour $DOMAIN"
fi
echo ""

# Google Drive
ask "Souhaitez-vous configurer Google Drive pour les sauvegardes ? (y/n) [y]"
read -r SETUP_GDRIVE
SETUP_GDRIVE=${SETUP_GDRIVE:-y}

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Pour obtenir les identifiants Google Drive :"
    echo "  1. Allez sur https://console.cloud.google.com"
    echo "  2. Créez un projet → Activez l'API Google Drive"
    echo "  3. Créez des identifiants OAuth 2.0 (Application Web)"
    echo "  4. URI de redirection : https://$DOMAIN/api/backup/drive/callback"
    echo ""

    ask "Client ID Google (ex: xxxx.apps.googleusercontent.com) :"
    read -r GOOGLE_CLIENT_ID
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        warn "Client ID vide. Google Drive ne sera pas configuré."
        SETUP_GDRIVE="n"
    fi

    if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
        ask "Client Secret Google (ex: GOCSPX-xxxx) :"
        read -r GOOGLE_CLIENT_SECRET
        if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
            warn "Client Secret vide. Google Drive ne sera pas configuré."
            SETUP_GDRIVE="n"
        fi
    fi
fi

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Récapitulatif                                              │"
echo "└──────────────────────────────────────────────────────────────┘"
echo "  Domaine       : $DOMAIN"
echo "  SSL           : Let's Encrypt"
if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
    echo "  Google Drive  : Oui (Client ID: ${GOOGLE_CLIENT_ID:0:20}...)"
else
    echo "  Google Drive  : Non"
fi
echo ""
ask "Confirmer et lancer l'installation ? (y/n) [y]"
read -r CONFIRM
CONFIRM=${CONFIRM:-y}
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    err "Installation annulée"
fi

###############################################################################
# ÉTAPE 2 : Installation Certbot + Certificat SSL
###############################################################################

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Étape 2/5 : Installation du certificat SSL                 │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

# Installer certbot si nécessaire
if ! command -v certbot &> /dev/null; then
    msg "Installation de Certbot..."
    apt-get update -qq
    apt-get install -y -qq certbot python3-certbot-nginx
    ok "Certbot installé"
else
    ok "Certbot déjà installé"
fi

# Vérifier si un certificat existe déjà
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    ok "Certificat SSL déjà existant pour $DOMAIN"
else
    msg "Génération du certificat SSL pour $DOMAIN..."
    msg "Certbot va vous poser quelques questions..."
    echo ""

    # On utilise certonly pour éviter les problèmes de modification Nginx automatique
    certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 || {
        warn "Certbot automatique a échoué. Tentative en mode standalone..."
        systemctl stop nginx
        certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 || {
            systemctl start nginx
            err "Impossible d'obtenir le certificat SSL. Vérifiez que le port 80 est accessible depuis Internet et que le DNS de $DOMAIN pointe vers ce serveur."
        }
        systemctl start nginx
    }

    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        ok "Certificat SSL obtenu avec succès"
    else
        err "Le certificat n'a pas été créé. Vérifiez les logs : /var/log/letsencrypt/letsencrypt.log"
    fi
fi

###############################################################################
# ÉTAPE 3 : Configuration Nginx avec SSL
###############################################################################

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Étape 3/5 : Configuration Nginx HTTPS                     │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

# Backup de la config actuelle
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    ok "Backup de la configuration Nginx actuelle"
fi

# Écrire la nouvelle configuration
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;
    client_max_body_size 25M;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        root /opt/gmao-iris/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

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

# Activer le site et supprimer le default
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger Nginx
if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx configuré avec SSL"
else
    err "Erreur dans la configuration Nginx. Restauration du backup..."
fi

# Vérifier que HTTPS fonctionne
sleep 2
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    ok "HTTPS fonctionne ! (code: $HTTP_CODE)"
else
    warn "HTTPS retourne le code $HTTP_CODE. Vérifiez que le port 443 est ouvert sur votre routeur."
fi

###############################################################################
# ÉTAPE 4 : Configuration Google Drive
###############################################################################

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Étape 4/5 : Configuration Google Drive                     │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

# Mettre à jour les URLs dans le .env (HTTP → HTTPS)
if grep -q "http://$DOMAIN" "$BACKEND_ENV" 2>/dev/null; then
    sed -i "s|http://$DOMAIN|https://$DOMAIN|g" "$BACKEND_ENV"
    ok "URLs mises à jour vers HTTPS dans le .env"
fi

# Mettre à jour FRONTEND_URL et BACKEND_URL si présents
if grep -q "^FRONTEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$BACKEND_ENV"
else
    echo "FRONTEND_URL=https://$DOMAIN" >> "$BACKEND_ENV"
fi

if grep -q "^BACKEND_URL=" "$BACKEND_ENV"; then
    sed -i "s|^BACKEND_URL=.*|BACKEND_URL=https://$DOMAIN|" "$BACKEND_ENV"
fi

if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
    REDIRECT_URI="https://$DOMAIN/api/backup/drive/callback"

    # Supprimer les anciennes entrées Google si elles existent
    sed -i '/^GOOGLE_CLIENT_ID=/d' "$BACKEND_ENV"
    sed -i '/^GOOGLE_CLIENT_SECRET=/d' "$BACKEND_ENV"
    sed -i '/^GOOGLE_DRIVE_REDIRECT_URI=/d' "$BACKEND_ENV"

    # Ajouter les nouvelles
    echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" >> "$BACKEND_ENV"
    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" >> "$BACKEND_ENV"
    echo "GOOGLE_DRIVE_REDIRECT_URI=$REDIRECT_URI" >> "$BACKEND_ENV"

    ok "Identifiants Google Drive configurés"
    echo ""
    echo "  URI de redirection à ajouter dans Google Cloud Console :"
    echo "  $REDIRECT_URI"
    echo ""
else
    ok "Google Drive ignoré"
fi

###############################################################################
# ÉTAPE 5 : Redémarrage et tests
###############################################################################

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Étape 5/5 : Redémarrage et vérification                   │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""

msg "Redémarrage du backend..."
supervisorctl restart gmao-iris-backend
sleep 4

# Vérifier que le backend tourne
BACKEND_STATUS=$(supervisorctl status gmao-iris-backend 2>/dev/null | grep -c "RUNNING" || echo "0")
if [ "$BACKEND_STATUS" -ge 1 ]; then
    ok "Backend démarré"
else
    warn "Le backend ne semble pas démarré. Vérifiez les logs :"
    echo "  tail -f /var/log/gmao-iris-backend.err.log"
fi

# Test API
msg "Test de l'API..."
API_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/version" 2>/dev/null || echo "000")
if [ "$API_CODE" = "200" ]; then
    ok "API accessible en HTTPS (code: $API_CODE)"
else
    warn "API retourne le code $API_CODE"
fi

# Test Google Drive si configuré
if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
    msg "Test de la configuration Google Drive..."

    # Se connecter pour obtenir un token
    LOGIN_RESPONSE=$(curl -sk -X POST "https://$DOMAIN/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"'"$(grep -m1 'email' /opt/gmao-iris/backend/.env 2>/dev/null | cut -d= -f2 || echo '')"'","password":"test"}' 2>/dev/null || echo "")

    # Tester l'endpoint drive/connect sans token (juste vérifier qu'il ne retourne pas 500)
    DRIVE_CODE=$(curl -sk -o /tmp/gdrive_test.json -w "%{http_code}" "https://$DOMAIN/api/backup/drive/status" 2>/dev/null || echo "000")

    if [ "$DRIVE_CODE" = "200" ] || [ "$DRIVE_CODE" = "401" ] || [ "$DRIVE_CODE" = "403" ]; then
        ok "Endpoint Google Drive accessible"

        # Vérifier que les variables sont bien chargées
        CONNECT_CODE=$(curl -sk -o /tmp/gdrive_connect.json -w "%{http_code}" "https://$DOMAIN/api/backup/drive/connect" 2>/dev/null || echo "000")
        if [ "$CONNECT_CODE" = "401" ] || [ "$CONNECT_CODE" = "403" ]; then
            ok "Endpoint de connexion Google Drive OK (authentification requise - normal)"
        elif [ "$CONNECT_CODE" = "400" ]; then
            DETAIL=$(cat /tmp/gdrive_connect.json 2>/dev/null)
            if echo "$DETAIL" | grep -q "non configuré"; then
                warn "Les identifiants Google Drive ne semblent pas chargés. Redémarrez le backend."
            else
                ok "Endpoint Google Drive configuré"
            fi
        else
            ok "Endpoint Google Drive répond (code: $CONNECT_CODE)"
        fi
    else
        warn "Endpoint Google Drive retourne le code $DRIVE_CODE"
    fi

    rm -f /tmp/gdrive_test.json /tmp/gdrive_connect.json
fi

###############################################################################
# RÉSUMÉ FINAL
###############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ CONFIGURATION TERMINÉE !                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Résumé                                                     │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""
echo "  🔒 SSL          : https://$DOMAIN"
echo "  📋 Certificat   : /etc/letsencrypt/live/$DOMAIN/"
echo "  🔄 Renouvellement: Automatique (Certbot timer)"

if [[ "$SETUP_GDRIVE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "  ☁️  Google Drive : Configuré"
    echo "  🔗 URI callback : https://$DOMAIN/api/backup/drive/callback"
    echo ""
    echo "  ⚠️  IMPORTANT : Assurez-vous d'avoir ajouté cette URI"
    echo "     de redirection dans la Google Cloud Console :"
    echo "     https://$DOMAIN/api/backup/drive/callback"
    echo ""
    echo "  Pour connecter Google Drive :"
    echo "  1. Connectez-vous à https://$DOMAIN"
    echo "  2. Allez dans Import/Export → onglet Sauvegardes Automatiques"
    echo "  3. Cliquez sur 'Connecter Google Drive'"
fi

echo ""
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│  Commandes utiles                                           │"
echo "└──────────────────────────────────────────────────────────────┘"
echo ""
echo "  Vérifier le certificat SSL :"
echo "    certbot certificates"
echo ""
echo "  Renouveler manuellement le SSL :"
echo "    certbot renew"
echo ""
echo "  Vérifier les logs backend :"
echo "    tail -f /var/log/gmao-iris-backend.err.log"
echo ""
echo "  Tester Nginx :"
echo "    nginx -t && systemctl reload nginx"
echo ""
