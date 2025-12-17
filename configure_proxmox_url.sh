#!/bin/bash
# Script de configuration automatique pour Proxmox
# Ce script configure automatiquement les URLs pour votre installation Proxmox

echo "=================================================="
echo "   Configuration Proxmox - GMAO Iris"
echo "=================================================="
echo ""

# Demander l'URL/IP publique
echo "🌐 Entrez l'URL ou l'IP publique de votre serveur Proxmox"
echo "   Exemples:"
echo "   - http://192.168.1.100"
echo "   - https://mon-domaine.com"
echo ""
read -p "URL/IP publique : " PUBLIC_URL

# Valider l'URL
if [[ ! $PUBLIC_URL =~ ^https?:// ]]; then
    echo "❌ Erreur : L'URL doit commencer par http:// ou https://"
    exit 1
fi

# Supprimer le slash final si présent
PUBLIC_URL=${PUBLIC_URL%/}

echo ""
echo "📝 Configuration en cours avec : $PUBLIC_URL"
echo ""

# Backup des fichiers existants
echo "💾 Création de backups..."
cp /app/frontend/.env /app/frontend/.env.backup.$(date +%Y%m%d_%H%M%S)
cp /app/backend/.env /app/backend/.env.backup.$(date +%Y%m%d_%H%M%S)

# Modifier frontend/.env
echo "🔧 Configuration du frontend..."
sed -i "s|^REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=$PUBLIC_URL|g" /app/frontend/.env

# Modifier backend/.env
echo "🔧 Configuration du backend..."
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=$PUBLIC_URL|g" /app/backend/.env
sed -i "s|^BACKEND_URL=.*|BACKEND_URL=$PUBLIC_URL|g" /app/backend/.env
sed -i "s|^APP_URL=.*|APP_URL=$PUBLIC_URL|g" /app/backend/.env

echo ""
echo "✅ Configuration terminée !"
echo ""

# Afficher les modifications
echo "📋 Fichiers modifiés :"
echo "   - /app/frontend/.env"
echo "   - /app/backend/.env"
echo ""

# Proposer de redémarrer les services
read -p "🔄 Voulez-vous redémarrer les services maintenant ? (o/n) : " RESTART

if [[ $RESTART == "o" || $RESTART == "O" ]]; then
    echo ""
    echo "🔄 Redémarrage des services..."
    sudo supervisorctl restart frontend backend
    
    echo ""
    echo "⏳ Attente du redémarrage (10 secondes)..."
    sleep 10
    
    echo ""
    echo "📊 Statut des services :"
    sudo supervisorctl status
    
    echo ""
    echo "✅ Services redémarrés !"
fi

echo ""
echo "=================================================="
echo "   Configuration terminée avec succès ! 🎉"
echo "=================================================="
echo ""
echo "🌐 Votre application est accessible à : $PUBLIC_URL"
echo ""
echo "⚠️  IMPORTANT : Videz le cache de votre navigateur et rechargez la page !"
echo ""
echo "🧪 Pour tester l'API :"
echo "   curl $PUBLIC_URL/api/updates/version"
echo ""
echo "📄 Logs disponibles :"
echo "   tail -50 /var/log/supervisor/backend.err.log"
echo "   tail -50 /var/log/supervisor/frontend.err.log"
echo ""
