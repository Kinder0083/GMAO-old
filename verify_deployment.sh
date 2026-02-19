#!/bin/bash
# ============================================================
# Script de vérification du déploiement GMAO IRIS
# Exécutez ce script depuis la RACINE de votre projet sur le Proxmox
# Usage: bash verify_deployment.sh
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ERRORS=0
WARNINGS=0

echo ""
echo "============================================================"
echo "   VÉRIFICATION DU DÉPLOIEMENT GMAO IRIS"
echo "   $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ============================================================
# 1. VÉRIFICATION GIT
# ============================================================
echo -e "${BOLD}[1/6] VÉRIFICATION GIT${NC}"
echo "------------------------------------------------------------"

if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC} Dépôt Git trouvé"
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
    echo "  Branche actuelle : $CURRENT_BRANCH"
    LAST_COMMIT=$(git log -1 --format="%H %s" 2>/dev/null)
    echo "  Dernier commit   : $LAST_COMMIT"
    LAST_COMMIT_DATE=$(git log -1 --format="%ci" 2>/dev/null)
    echo "  Date du commit   : $LAST_COMMIT_DATE"
    
    # Vérifier s'il y a des modifications locales
    CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$CHANGES" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC}  $CHANGES fichier(s) modifié(s) localement"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} Pas de dépôt Git trouvé"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================
# 2. VÉRIFICATION FRONTEND - FICHIERS SOURCE
# ============================================================
echo -e "${BOLD}[2/6] VÉRIFICATION FRONTEND - CODE SOURCE${NC}"
echo "------------------------------------------------------------"

# Test 2a: Colonne "Date du contrôle" dans ListViewGrouped
if [ -f "frontend/src/components/Surveillance/ListViewGrouped.jsx" ]; then
    if grep -q "Date du contrôle" frontend/src/components/Surveillance/ListViewGrouped.jsx; then
        echo -e "${GREEN}✓${NC} ListViewGrouped.jsx : 'Date du contrôle' ✓"
    elif grep -q "Prochain contrôle" frontend/src/components/Surveillance/ListViewGrouped.jsx; then
        echo -e "${RED}✗${NC} ListViewGrouped.jsx : ENCORE 'Prochain contrôle' → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${YELLOW}⚠${NC} ListViewGrouped.jsx : ni 'Date du contrôle' ni 'Prochain contrôle' trouvé"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} ListViewGrouped.jsx NON TROUVÉ"
    ERRORS=$((ERRORS + 1))
fi

# Test 2b: Colonne dans ListView
if [ -f "frontend/src/components/Surveillance/ListView.jsx" ]; then
    if grep -q "Date du contrôle" frontend/src/components/Surveillance/ListView.jsx; then
        echo -e "${GREEN}✓${NC} ListView.jsx : 'Date du contrôle' ✓"
    elif grep -q "Prochain contrôle" frontend/src/components/Surveillance/ListView.jsx; then
        echo -e "${RED}✗${NC} ListView.jsx : ENCORE 'Prochain contrôle' → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} ListView.jsx NON TROUVÉ"
    ERRORS=$((ERRORS + 1))
fi

# Test 2c: Colonne dans GridView
if [ -f "frontend/src/components/Surveillance/GridView.jsx" ]; then
    if grep -q "Date du contrôle" frontend/src/components/Surveillance/GridView.jsx; then
        echo -e "${GREEN}✓${NC} GridView.jsx : 'Date du contrôle' ✓"
    elif grep -q "Prochain" frontend/src/components/Surveillance/GridView.jsx; then
        echo -e "${RED}✗${NC} GridView.jsx : ENCORE 'Prochain' → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} GridView.jsx NON TROUVÉ"
    ERRORS=$((ERRORS + 1))
fi

# Test 2d: Logique d'affichage conditionnel (derniere_visite pour REALISE)
if [ -f "frontend/src/components/Surveillance/ListViewGrouped.jsx" ]; then
    if grep -q "derniere_visite" frontend/src/components/Surveillance/ListViewGrouped.jsx; then
        echo -e "${GREEN}✓${NC} ListViewGrouped.jsx : logique derniere_visite présente ✓"
    else
        echo -e "${RED}✗${NC} ListViewGrouped.jsx : PAS de logique derniere_visite → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Test 2e: WebSocket dans SurveillancePlan
if [ -f "frontend/src/pages/SurveillancePlan.jsx" ]; then
    if grep -q "useSurveillancePlan" frontend/src/pages/SurveillancePlan.jsx; then
        echo -e "${GREEN}✓${NC} SurveillancePlan.jsx : hook WebSocket useSurveillancePlan ✓"
    else
        echo -e "${RED}✗${NC} SurveillancePlan.jsx : PAS de hook WebSocket → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# ============================================================
# 3. VÉRIFICATION FRONTEND - BUILD COMPILÉ
# ============================================================
echo -e "${BOLD}[3/6] VÉRIFICATION FRONTEND - BUILD COMPILÉ${NC}"
echo "------------------------------------------------------------"

BUILD_DIR=""
if [ -d "frontend/build" ]; then
    BUILD_DIR="frontend/build"
elif [ -d "frontend/dist" ]; then
    BUILD_DIR="frontend/dist"
fi

if [ -n "$BUILD_DIR" ]; then
    echo "  Dossier build trouvé : $BUILD_DIR"
    BUILD_DATE=$(stat -c %Y "$BUILD_DIR/index.html" 2>/dev/null || stat -f %m "$BUILD_DIR/index.html" 2>/dev/null)
    if [ -n "$BUILD_DATE" ]; then
        BUILD_DATE_HR=$(date -d @$BUILD_DATE '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $BUILD_DATE '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
        echo "  Date du build     : $BUILD_DATE_HR"
    fi
    
    # Vérifier dans les fichiers JS compilés
    JS_FILES=$(find "$BUILD_DIR/static/js" -name "*.js" 2>/dev/null)
    if [ -n "$JS_FILES" ]; then
        if grep -rl "Date du contr" $BUILD_DIR/static/js/ >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Build JS : 'Date du contrôle' trouvé dans le build compilé ✓"
        elif grep -rl "Prochain contr" $BUILD_DIR/static/js/ >/dev/null 2>&1; then
            echo -e "${RED}✗${NC} Build JS : 'Prochain contrôle' trouvé → LE BUILD EST OBSOLÈTE !"
            echo -e "${RED}  → Vous devez REBUILDER le frontend : cd frontend && yarn build${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}⚠${NC} Impossible de vérifier le contenu du build JS"
            WARNINGS=$((WARNINGS + 1))
        fi
        
        if grep -rl "derniere_visite" $BUILD_DIR/static/js/ >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Build JS : logique 'derniere_visite' présente ✓"
        else
            echo -e "${RED}✗${NC} Build JS : PAS de 'derniere_visite' → LE BUILD EST OBSOLÈTE !"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Aucun fichier JS trouvé dans $BUILD_DIR/static/js/"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Aucun dossier build trouvé (frontend/build ou frontend/dist)"
    echo "  Si vous utilisez un serveur de dev (yarn start), le build n'est pas nécessaire"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================
# 4. VÉRIFICATION BACKEND - CODE SOURCE
# ============================================================
echo -e "${BOLD}[4/6] VÉRIFICATION BACKEND - CODE SOURCE${NC}"
echo "------------------------------------------------------------"

SURV_ROUTES=""
if [ -f "backend/surveillance_routes.py" ]; then
    SURV_ROUTES="backend/surveillance_routes.py"
elif [ -f "backend/api/surveillance_routes.py" ]; then
    SURV_ROUTES="backend/api/surveillance_routes.py"
fi

if [ -n "$SURV_ROUTES" ]; then
    echo "  Fichier trouvé : $SURV_ROUTES"
    
    # Test 4a: check-due-dates ne doit PAS changer de statut
    if grep -A 5 "check.due.dates" "$SURV_ROUTES" | grep -q "update_one\|PLANIFIER"; then
        echo -e "${RED}✗${NC} check-due-dates : CONTIENT encore un changement de statut → code NON à jour !"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} check-due-dates : pas de changement de statut ✓"
    fi
    
    # Test 4b: check-due-dates doit filtrer les non-REALISE
    if grep -q '"status": {"\$ne": SurveillanceItemStatus.REALISE' "$SURV_ROUTES" || grep -q 'ne.*REALISE' "$SURV_ROUTES"; then
        echo -e "${GREEN}✓${NC} check-due-dates : filtre correctement les non-REALISE ✓"
    else
        echo -e "${YELLOW}⚠${NC} check-due-dates : vérifier manuellement le filtre de statut"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Test 4c: create-batch doit mettre prochain_controle=prochain_controle (calculé)
    # On vérifie qu'il n'y a PAS prochain_controle=derniere_visite dans la section de création
    if grep -B2 -A2 "prochain_controle=derniere_visite" "$SURV_ROUTES" | grep -v "#" | grep -q "prochain_controle=derniere_visite"; then
        echo -e "${RED}✗${NC} create-batch : prochain_controle=derniere_visite (MAUVAIS) → doit être prochain_controle=prochain_controle"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} create-batch : prochain_controle correctement calculé ✓"
    fi
else
    echo -e "${RED}✗${NC} surveillance_routes.py NON TROUVÉ"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================
# 5. VÉRIFICATION DÉPENDANCES
# ============================================================
echo -e "${BOLD}[5/6] VÉRIFICATION DÉPENDANCES${NC}"
echo "------------------------------------------------------------"

# Python
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif [ -f "venv/bin/python" ]; then
    PYTHON_CMD="venv/bin/python"
elif [ -f "venv/bin/python3" ]; then
    PYTHON_CMD="venv/bin/python3"
fi

if [ -n "$PYTHON_CMD" ]; then
    echo "  Python : $($PYTHON_CMD --version 2>&1)"
    
    # emergentintegrations
    if $PYTHON_CMD -c "import emergentintegrations" 2>/dev/null; then
        EI_VERSION=$($PYTHON_CMD -c "import emergentintegrations; print(emergentintegrations.__version__)" 2>/dev/null || echo "inconnu")
        echo -e "${GREEN}✓${NC} emergentintegrations installé (version: $EI_VERSION)"
    else
        echo -e "${YELLOW}⚠${NC} emergentintegrations NON installé"
        echo "    → Les fonctionnalités IA (Adria, analyse PDF) ne fonctionneront pas"
        echo "    → Pour l'installer: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Node
if command -v node &> /dev/null; then
    echo "  Node.js : $(node --version)"
fi
if command -v yarn &> /dev/null; then
    echo "  Yarn    : $(yarn --version)"
fi

# Vérifier requirements.txt pour emergentintegrations
if [ -f "backend/requirements.txt" ]; then
    if grep -q "emergentintegrations" backend/requirements.txt; then
        echo -e "${RED}✗${NC} requirements.txt contient 'emergentintegrations' → BLOQUE l'installation !"
        echo "    → Ce package n'est pas disponible sur PyPI standard"
        echo "    → Solution: retirez-le de requirements.txt et installez-le séparément"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} requirements.txt ne contient pas emergentintegrations ✓"
    fi
fi
echo ""

# ============================================================
# 6. VÉRIFICATION SERVICES
# ============================================================
echo -e "${BOLD}[6/6] VÉRIFICATION SERVICES${NC}"
echo "------------------------------------------------------------"

# Backend
BACKEND_PORT=${BACKEND_PORT:-8001}
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/api/health" 2>/dev/null | grep -q "200\|404"; then
    echo -e "${GREEN}✓${NC} Backend accessible sur port $BACKEND_PORT"
else
    echo -e "${RED}✗${NC} Backend NON accessible sur port $BACKEND_PORT"
    ERRORS=$((ERRORS + 1))
fi

# Frontend
FRONTEND_PORT=${FRONTEND_PORT:-3000}
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Frontend accessible sur port $FRONTEND_PORT"
else
    # Try port 80 or 443
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:80" 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}✓${NC} Frontend accessible sur port 80"
    else
        echo -e "${YELLOW}⚠${NC} Frontend non accessible sur port $FRONTEND_PORT (peut être sur un autre port)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# MongoDB
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.stats()" --quiet 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓${NC} MongoDB accessible"
    fi
elif command -v mongo &> /dev/null; then
    if mongo --eval "db.stats()" --quiet 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✓${NC} MongoDB accessible"
    fi
fi
echo ""

# ============================================================
# RÉSUMÉ
# ============================================================
echo "============================================================"
echo -e "${BOLD}RÉSUMÉ${NC}"
echo "============================================================"
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ $ERRORS ERREUR(S) TROUVÉE(S)${NC}"
    echo ""
    echo -e "${BOLD}ACTIONS CORRECTIVES RECOMMANDÉES :${NC}"
    echo ""
    echo "1. Assurez-vous que le code est à jour :"
    echo "   cd /chemin/vers/votre/projet"
    echo "   git fetch origin && git reset --hard origin/main"
    echo ""
    echo "2. Installez les dépendances backend (SANS emergentintegrations) :"
    echo "   source venv/bin/activate"
    echo "   pip install -r backend/requirements.txt"
    echo "   # Si vous avez besoin de l'IA :"
    echo "   pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/"
    echo ""
    echo "3. REBUILDER le frontend (CRUCIAL) :"
    echo "   cd frontend"
    echo "   rm -rf build node_modules/.cache"
    echo "   yarn install"
    echo "   yarn build"
    echo "   cd .."
    echo ""
    echo "4. Redémarrer les services :"
    echo "   # Adaptez selon votre configuration (systemctl, pm2, docker, etc.)"
    echo ""
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS AVERTISSEMENT(S)${NC} - Vérification manuelle recommandée"
else
    echo -e "${GREEN}✓ TOUT EST OK${NC} - Le déploiement semble à jour"
fi
echo "============================================================"
echo ""
