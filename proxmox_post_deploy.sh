#!/bin/bash

# Script de post-déploiement pour Proxmox
# À exécuter après chaque mise à jour du code

set -e  # Arrêter en cas d'erreur

echo "=================================================="
echo "   Post-déploiement GMAO Iris - Proxmox"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier que les fichiers critiques existent
echo "1️⃣ Vérification des fichiers critiques..."
if [ ! -f "/app/backend/category_mapping.py" ]; then
    echo -e "${RED}❌ ERREUR: category_mapping.py manquant${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Fichiers présents${NC}"
echo ""

# 2. Tester l'import Python
echo "2️⃣ Test de l'import Python..."
cd /app/backend
if ! python3 -c "from category_mapping import get_category_from_article_dm6; print('Import OK')" 2>/dev/null; then
    echo -e "${RED}❌ ERREUR: Impossible d'importer category_mapping${NC}"
    echo "Vérifier les erreurs de syntaxe dans category_mapping.py"
    exit 1
fi
echo -e "${GREEN}✅ Import réussi${NC}"
echo ""

# 3. Redémarrer les services
echo "3️⃣ Redémarrage des services..."
sudo supervisorctl restart backend
sleep 3
sudo supervisorctl restart frontend
sleep 2
echo -e "${GREEN}✅ Services redémarrés${NC}"
echo ""

# 4. Vérifier que les services tournent
echo "4️⃣ Vérification des services..."
BACKEND_STATUS=$(sudo supervisorctl status backend | grep -c "RUNNING" || echo "0")
FRONTEND_STATUS=$(sudo supervisorctl status frontend | grep -c "RUNNING" || echo "0")

if [ "$BACKEND_STATUS" -eq "0" ]; then
    echo -e "${RED}❌ ERREUR: Backend ne tourne pas${NC}"
    echo "Logs backend:"
    tail -n 20 /var/log/supervisor/backend.err.log
    exit 1
fi

if [ "$FRONTEND_STATUS" -eq "0" ]; then
    echo -e "${RED}❌ ERREUR: Frontend ne tourne pas${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend et Frontend en cours d'exécution${NC}"
echo ""

# 5. Attendre que le backend soit vraiment prêt
echo "5️⃣ Attente du démarrage complet du backend..."
for i in {1..30}; do
    if tail -n 50 /var/log/supervisor/backend.err.log | grep -q "Application startup complete"; then
        echo -e "${GREEN}✅ Backend prêt${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend met du temps à démarrer, vérifier les logs${NC}"
        tail -n 30 /var/log/supervisor/backend.err.log
    fi
    sleep 1
done
echo ""

# 6. Test de l'API (optionnel, nécessite les credentials)
echo "6️⃣ Test de l'API (optionnel)..."
echo -e "${YELLOW}⚠️  Vous pouvez tester manuellement l'API avec:${NC}"
echo "curl -X POST 'http://localhost:8001/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"admin@gmao-iris.local\",\"password\":\"YOUR_PASSWORD\"}'"
echo ""

# 7. Résumé
echo "=================================================="
echo -e "${GREEN}✅ DÉPLOIEMENT RÉUSSI${NC}"
echo "=================================================="
echo ""
echo "Services:"
sudo supervisorctl status backend frontend
echo ""
echo "Vérifications à faire manuellement:"
echo "  1. Ouvrir l'application web"
echo "  2. Aller sur 'Historique Achat'"
echo "  3. Vérifier la section '📊 Détail par Catégorie (DM6)'"
echo "  4. Sélectionner un mois et vérifier le tableau"
echo ""
echo "En cas de problème, voir: /app/PROXMOX_DEPLOYMENT_FIX.md"
