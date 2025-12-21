#!/bin/bash
# =============================================================================
# Script de mise à jour Nginx pour les WebSockets
# GMAO Iris - Correction Chat Live et Tableau d'affichage
# =============================================================================

set -e

echo "🔧 Mise à jour de la configuration Nginx pour les WebSockets..."

# Sauvegarder la config actuelle
if [ -f /etc/nginx/sites-available/gmao-iris ]; then
    cp /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-available/gmao-iris.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Sauvegarde créée"
fi

# Créer la nouvelle configuration
cat > /etc/nginx/sites-available/gmao-iris <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 25M;
    
    # Frontend React (fichiers statiques)
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
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    # WebSocket pour le Tableau d'affichage
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
EOF

echo "✓ Configuration Nginx mise à jour"

# Tester la configuration
echo "🔍 Test de la configuration Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✓ Configuration valide"
    
    # Recharger Nginx
    systemctl reload nginx
    echo "✓ Nginx rechargé"
    
    echo ""
    echo "============================================"
    echo "✅ Mise à jour terminée avec succès !"
    echo "============================================"
    echo ""
    echo "Les WebSockets sont maintenant configurés pour :"
    echo "  - Chat Live:          /ws/chat/"
    echo "  - Tableau d'affichage: /ws/whiteboard/"
    echo ""
    echo "Testez en ouvrant votre navigateur et en vérifiant"
    echo "que le Chat Live affiche 'Connecté' (point vert)"
    echo "au lieu de 'Mode REST'."
else
    echo "❌ Erreur dans la configuration Nginx"
    echo "Restauration de la sauvegarde..."
    
    # Restaurer la dernière sauvegarde
    BACKUP=$(ls -t /etc/nginx/sites-available/gmao-iris.backup.* 2>/dev/null | head -1)
    if [ -n "$BACKUP" ]; then
        cp "$BACKUP" /etc/nginx/sites-available/gmao-iris
        echo "✓ Sauvegarde restaurée"
    fi
    
    exit 1
fi
