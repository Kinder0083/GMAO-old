#!/bin/bash
# ============================================================
# FSAO Iris - Patch NGINX Anti-Cache
# ============================================================
# Ajoute les headers anti-cache pour index.html et sw.js
# dans la config NGINX de production.
# Cela elimine le besoin de Ctrl+Shift+F5 apres chaque MAJ.
#
# Usage : sudo bash patch_nginx_cache.sh
# ============================================================

set -e

NGINX_CONF=""
for conf in /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-available/default /etc/nginx/conf.d/gmao-iris.conf; do
    if [ -f "$conf" ]; then
        NGINX_CONF="$conf"
        break
    fi
done

if [ -z "$NGINX_CONF" ]; then
    echo "ERREUR: Config NGINX non trouvee"
    exit 1
fi

echo "Config trouvee: $NGINX_CONF"

# Verifier si les regles anti-cache sont deja presentes
if grep -q "no-cache, no-store, must-revalidate" "$NGINX_CONF"; then
    echo "Les regles anti-cache sont deja presentes. Rien a faire."
    exit 0
fi

# Sauvegarder la config actuelle
cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "Backup cree"

# Trouver le root du frontend
FRONTEND_ROOT=$(grep -oP 'root\s+\K[^;]+' "$NGINX_CONF" | head -1 | tr -d ' ')
if [ -z "$FRONTEND_ROOT" ]; then
    FRONTEND_ROOT="/opt/gmao-iris/frontend/build"
fi
echo "Frontend root: $FRONTEND_ROOT"

# Inserer les regles anti-cache AVANT le premier "location /"
# On utilise sed pour inserer avant la premiere occurrence de "location / {"
CACHE_RULES="
    # === ANTI-CACHE : index.html et sw.js (ajout automatique) ===
    location = /index.html {
        root $FRONTEND_ROOT;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        add_header Pragma \"no-cache\" always;
        add_header Expires \"0\" always;
    }

    location = /sw.js {
        root $FRONTEND_ROOT;
        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;
        add_header Pragma \"no-cache\" always;
        add_header Expires \"0\" always;
    }
    # === FIN ANTI-CACHE ==="

# Trouver la ligne avec "location / {" et inserer avant
LINE_NUM=$(grep -n "location / {" "$NGINX_CONF" | head -1 | cut -d: -f1)
if [ -n "$LINE_NUM" ]; then
    # Inserer les regles avant cette ligne
    head -n $((LINE_NUM - 1)) "$NGINX_CONF" > /tmp/nginx_patched.conf
    echo "$CACHE_RULES" >> /tmp/nginx_patched.conf
    echo "" >> /tmp/nginx_patched.conf
    tail -n +"$LINE_NUM" "$NGINX_CONF" >> /tmp/nginx_patched.conf
    cp /tmp/nginx_patched.conf "$NGINX_CONF"
    rm /tmp/nginx_patched.conf
else
    echo "ATTENTION: 'location / {' non trouve, ajout en fin de bloc server"
    # Ajouter avant la derniere accolade fermante
    sed -i "/^}/i\\$CACHE_RULES" "$NGINX_CONF"
fi

# Tester et recharger
echo ""
echo "Test de la configuration..."
nginx -t
if [ $? -eq 0 ]; then
    nginx -s reload
    echo ""
    echo "=================================================="
    echo "  SUCCES ! Regles anti-cache ajoutees."
    echo "  index.html et sw.js ne seront plus mis en cache."
    echo "  Plus besoin de Ctrl+Shift+F5 apres les MAJ !"
    echo "=================================================="
else
    echo "ERREUR: La config NGINX est invalide. Restauration du backup..."
    LATEST_BACKUP=$(ls -t ${NGINX_CONF}.backup.* | head -1)
    cp "$LATEST_BACKUP" "$NGINX_CONF"
    nginx -s reload
    echo "Config restauree depuis $LATEST_BACKUP"
    exit 1
fi
