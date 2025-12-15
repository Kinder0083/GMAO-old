#!/usr/bin/env bash
#
# Script de vérification du manuel utilisateur
# À exécuter sur le serveur Proxmox après installation
#
# Usage: bash verify_manual_installation.sh
#

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Vérification du Manuel Utilisateur GMAO Iris v1.1.3      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier si on est sur Proxmox dans le bon répertoire
if [ ! -d "/opt/gmao-iris" ]; then
    echo -e "${YELLOW}⚠️  Ce script doit être exécuté sur le serveur Proxmox${NC}"
    echo ""
    echo "Répertoire attendu : /opt/gmao-iris"
    echo "Si vous êtes dans /app (environnement de dev), utilisez:"
    echo "  cd /app/backend && python3 generate_full_manual_23ch.py"
    exit 1
fi

cd /opt/gmao-iris/backend || exit 1

# Activer le virtualenv
echo -e "${BLUE}▶${NC} Activation du virtualenv..."
source venv/bin/activate || {
    echo -e "${RED}✗${NC} Impossible d'activer le virtualenv"
    exit 1
}
echo -e "${GREEN}✓${NC} Virtualenv activé"
echo ""

# Vérifier la connexion MongoDB
echo -e "${BLUE}▶${NC} Vérification de la connexion MongoDB..."
if command -v mongo &> /dev/null; then
    mongo --eval "db.runCommand({ ping: 1 })" --quiet > /dev/null 2>&1 || {
        echo -e "${RED}✗${NC} Impossible de se connecter à MongoDB"
        exit 1
    }
    echo -e "${GREEN}✓${NC} MongoDB accessible"
else
    echo -e "${YELLOW}⚠️${NC}  Commande 'mongo' non trouvée, impossible de vérifier"
fi
echo ""

# Compter les chapitres
echo -e "${BLUE}▶${NC} Vérification des chapitres du manuel..."
if command -v mongo &> /dev/null; then
    CHAPTER_COUNT=$(mongo gmao_iris --eval "db.manual_chapters.count()" --quiet 2>/dev/null || echo "0")
    
    if [ "$CHAPTER_COUNT" -eq 23 ]; then
        echo -e "${GREEN}✓${NC} Chapitres trouvés : ${GREEN}${CHAPTER_COUNT}/23${NC} ✅"
    elif [ "$CHAPTER_COUNT" -eq 12 ]; then
        echo -e "${YELLOW}⚠️${NC}  Chapitres trouvés : ${YELLOW}${CHAPTER_COUNT}/23${NC}"
        echo -e "${YELLOW}   Le manuel n'est pas complet. 11 chapitres manquants.${NC}"
        NEED_REINIT=1
    elif [ "$CHAPTER_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️${NC}  Chapitres trouvés : ${YELLOW}${CHAPTER_COUNT}/23${NC}"
        echo -e "${YELLOW}   Nombre de chapitres inattendu.${NC}"
        NEED_REINIT=1
    else
        echo -e "${RED}✗${NC} Aucun chapitre trouvé"
        NEED_REINIT=1
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Impossible de vérifier (mongo CLI non disponible)"
fi
echo ""

# Compter les sections
echo -e "${BLUE}▶${NC} Vérification des sections du manuel..."
if command -v mongo &> /dev/null; then
    SECTION_COUNT=$(mongo gmao_iris --eval "db.manual_sections.count()" --quiet 2>/dev/null || echo "0")
    
    if [ "$SECTION_COUNT" -ge 61 ]; then
        echo -e "${GREEN}✓${NC} Sections trouvées : ${GREEN}${SECTION_COUNT}${NC} ✅"
    elif [ "$SECTION_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️${NC}  Sections trouvées : ${YELLOW}${SECTION_COUNT}${NC}"
        echo -e "${YELLOW}   Le manuel semble incomplet (attendu : 61+).${NC}"
        NEED_REINIT=1
    else
        echo -e "${RED}✗${NC} Aucune section trouvée"
        NEED_REINIT=1
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Impossible de vérifier (mongo CLI non disponible)"
fi
echo ""

# Vérifier que le script de génération existe
echo -e "${BLUE}▶${NC} Vérification des scripts de génération..."
if [ -f "generate_full_manual_23ch.py" ]; then
    echo -e "${GREEN}✓${NC} Script generate_full_manual_23ch.py trouvé"
else
    echo -e "${RED}✗${NC} Script generate_full_manual_23ch.py manquant"
    echo "   Vérifiez que vous avez la dernière version de GMAO Iris v1.1.3"
    exit 1
fi
echo ""

# Afficher le résumé et les actions recommandées
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  RÉSUMÉ DE LA VÉRIFICATION                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -z "$NEED_REINIT" ]; then
    echo -e "${GREEN}✅ Le manuel utilisateur est complet et opérationnel !${NC}"
    echo ""
    echo -e "Chapitres : ${GREEN}23/23${NC}"
    echo -e "Sections  : ${GREEN}${SECTION_COUNT}+${NC}"
    echo ""
    echo -e "${GREEN}Aucune action nécessaire.${NC}"
else
    echo -e "${YELLOW}⚠️  Le manuel utilisateur nécessite une réinitialisation${NC}"
    echo ""
    echo -e "Chapitres : ${YELLOW}${CHAPTER_COUNT:-?}/23${NC}"
    echo -e "Sections  : ${YELLOW}${SECTION_COUNT:-?}/61+${NC}"
    echo ""
    echo -e "${BLUE}Actions recommandées :${NC}"
    echo ""
    echo "1. Réinitialiser le manuel manuellement :"
    echo -e "   ${YELLOW}cd /opt/gmao-iris/backend${NC}"
    echo -e "   ${YELLOW}source venv/bin/activate${NC}"
    echo -e "   ${YELLOW}python3 generate_full_manual_23ch.py${NC}"
    echo ""
    echo "2. Vérifier les logs :"
    echo -e "   ${YELLOW}tail -f /var/log/supervisor/backend.*.log${NC}"
    echo ""
    echo "3. Redémarrer les services après réinitialisation :"
    echo -e "   ${YELLOW}sudo supervisorctl restart backend frontend${NC}"
    echo ""
    
    # Proposer de lancer la réinitialisation
    read -p "Voulez-vous réinitialiser le manuel maintenant ? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        echo ""
        echo -e "${BLUE}▶${NC} Réinitialisation du manuel en cours..."
        python3 generate_full_manual_23ch.py
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ Manuel réinitialisé avec succès !${NC}"
            echo ""
            echo "Redémarrage des services..."
            sudo supervisorctl restart backend frontend
            echo -e "${GREEN}✓${NC} Services redémarrés"
        else
            echo ""
            echo -e "${RED}✗${NC} Échec de la réinitialisation"
            echo "Consultez les logs pour plus d'informations"
        fi
    fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

deactivate
