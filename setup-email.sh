#!/bin/bash

################################################################################
# Script de configuration SMTP pour GMAO Iris
# Configure Postfix pour l'envoi d'emails
################################################################################

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

msg() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERREUR]${NC} $1"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuration SMTP pour GMAO Iris"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    err "Ce script doit être exécuté en tant que root"
    exit 1
fi

# Récupérer l'IP du container (passée en variable d'environnement ou détectée)
if [ -z "$CONTAINER_IP" ]; then
    CONTAINER_IP=$(hostname -I | awk '{print $1}')
fi

msg "IP du container: $CONTAINER_IP"

# Installation de Postfix
msg "Installation de Postfix..."
export DEBIAN_FRONTEND=noninteractive

# Préconfiguration de Postfix
debconf-set-selections <<< "postfix postfix/mailname string gmao-iris.local"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"

apt-get update -qq
apt-get install -y -qq postfix mailutils libsasl2-modules >/dev/null 2>&1

if [ $? -eq 0 ]; then
    ok "Postfix installé"
else
    err "Échec de l'installation de Postfix"
    exit 1
fi

# Configuration du relais SMTP
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuration du relais SMTP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Exemples de serveurs SMTP :"
echo "  - Gmail: smtp.gmail.com:587"
echo "  - OVH: ssl0.ovh.net:587"
echo "  - Outlook: smtp.office365.com:587"
echo ""

read -p "Serveur SMTP (ex: smtp.gmail.com:587): " SMTP_SERVER
read -p "Email d'envoi (ex: votre-email@gmail.com): " SMTP_USER
read -s -p "Mot de passe (ou mot de passe d'application): " SMTP_PASS
echo ""

# Extraire le host et le port
SMTP_HOST=$(echo $SMTP_SERVER | cut -d: -f1)
SMTP_PORT=$(echo $SMTP_SERVER | cut -d: -f2)

if [ -z "$SMTP_PORT" ]; then
    SMTP_PORT=587
fi

msg "Configuration de Postfix..."

# Sauvegarder la configuration originale
cp /etc/postfix/main.cf /etc/postfix/main.cf.backup 2>/dev/null || true

# Configuration de Postfix
cat > /etc/postfix/main.cf << EOF
# Configuration Postfix pour GMAO Iris
smtpd_banner = \$myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no
compatibility_level = 2

# TLS parameters
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls=yes
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

# Hostname
myhostname = gmao-iris.local
mydomain = local
myorigin = \$myhostname

# Network
inet_interfaces = loopback-only
mydestination = \$myhostname, localhost.\$mydomain, localhost
mynetworks = 127.0.0.0/8

# Relay
relayhost = [$SMTP_HOST]:$SMTP_PORT

# SASL Authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_sasl_tls_security_options = noanonymous

# Mail size limit (25MB)
message_size_limit = 26214400
mailbox_size_limit = 0

# Alias
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
EOF

# Créer le fichier de mot de passe SASL
echo "[$SMTP_HOST]:$SMTP_PORT $SMTP_USER:$SMTP_PASS" > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd

ok "Configuration Postfix terminée"

# Redémarrer Postfix
msg "Redémarrage de Postfix..."
systemctl restart postfix
systemctl enable postfix >/dev/null 2>&1

if systemctl is-active --quiet postfix; then
    ok "Postfix démarré"
else
    err "Postfix n'a pas démarré correctement"
    exit 1
fi

# Mettre à jour le fichier .env du backend
BACKEND_ENV="/opt/gmao-iris/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    msg "Mise à jour de la configuration backend..."
    
    # Supprimer les anciennes configurations SMTP si présentes
    sed -i '/^SMTP_/d' "$BACKEND_ENV"
    sed -i '/^EMAIL_/d' "$BACKEND_ENV"
    sed -i '/^APP_URL/d' "$BACKEND_ENV"
    
    # Ajouter les nouvelles configurations (noms compatibles avec email_service.py)
    cat >> "$BACKEND_ENV" << EOF

# Configuration SMTP (Postfix local comme relais)
SMTP_SERVER=localhost
SMTP_PORT=25
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_SENDER_EMAIL=$SMTP_USER
SMTP_FROM_NAME=GMAO Iris
SMTP_USE_TLS=false
EMAIL_ENABLED=true
APP_URL=http://$CONTAINER_IP
EOF
    
    ok "Configuration backend mise à jour"
    
    # Redémarrer le backend
    msg "Redémarrage du backend..."
    supervisorctl restart gmao-iris-backend >/dev/null 2>&1 || true
fi

# Test d'envoi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test d'envoi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Voulez-vous envoyer un email de test? (o/n): " send_test

if [[ "$send_test" == "o" || "$send_test" == "O" ]]; then
    read -p "Adresse email de destination: " TEST_EMAIL
    
    msg "Envoi de l'email de test..."
    echo "Test GMAO Iris - Email envoyé depuis $CONTAINER_IP à $(date)" | mail -s "Test GMAO Iris" "$TEST_EMAIL"
    
    if [ $? -eq 0 ]; then
        ok "Email de test envoyé à $TEST_EMAIL"
        echo ""
        warn "Vérifiez votre boîte de réception (et les spams)"
    else
        err "Échec de l'envoi de l'email de test"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuration SMTP terminée"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
ok "SMTP configuré pour utiliser $SMTP_HOST:$SMTP_PORT"
echo ""
