#!/bin/bash
# ============================================================
# FSAO Iris - Installation du Health Check automatique
# ============================================================
# Ce script installe :
# 1. Le cron job de health check (toutes les 5 minutes)
# 2. Le cron job au reboot du container
# 3. Copie les fichiers necessaires
#
# Usage : sudo bash setup_health_check.sh
# ============================================================

set -e

APP_ROOT="${GMAO_APP_ROOT:-/opt/gmao-iris}"
CRON_LOG="/var/log/gmao-iris-health.log"

echo "=================================================="
echo "  FSAO Iris - Installation Health Check"
echo "=================================================="
echo ""

# 1. Verifier que les fichiers existent
echo "[1/4] Verification des fichiers..."

if [ ! -f "$APP_ROOT/health_recovery.py" ]; then
    echo "ERREUR: $APP_ROOT/health_recovery.py introuvable"
    exit 1
fi

if [ ! -f "$APP_ROOT/maintenance.html" ]; then
    echo "ERREUR: $APP_ROOT/maintenance.html introuvable"
    exit 1
fi

echo "  health_recovery.py : OK"
echo "  maintenance.html   : OK"

# 2. Rendre le script executable
echo ""
echo "[2/4] Configuration des permissions..."
chmod +x "$APP_ROOT/health_recovery.py"
echo "  Permissions OK"

# 3. Creer le fichier de log
echo ""
echo "[3/4] Creation du fichier de log..."
touch "$CRON_LOG"
chmod 644 "$CRON_LOG"
echo "  Log: $CRON_LOG"

# 4. Installer le cron job
echo ""
echo "[4/4] Installation du cron job..."

# Supprimer les anciens crons GMAO health check s'ils existent
crontab -l 2>/dev/null | grep -v "health_recovery" | grep -v "gmao.*health" > /tmp/crontab_clean 2>/dev/null || true

# Ajouter les nouveaux crons
cat >> /tmp/crontab_clean << EOF

# FSAO Iris - Health Check automatique (toutes les 5 minutes)
*/5 * * * * cd $APP_ROOT && /usr/bin/python3 $APP_ROOT/health_recovery.py >> $CRON_LOG 2>&1

# FSAO Iris - Health Check au demarrage du container (apres 60s)
@reboot sleep 60 && cd $APP_ROOT && /usr/bin/python3 $APP_ROOT/health_recovery.py >> $CRON_LOG 2>&1
EOF

crontab /tmp/crontab_clean
rm -f /tmp/crontab_clean

echo "  Cron installe :"
echo "    - Toutes les 5 minutes : health check + auto-recovery"
echo "    - Au reboot : health check apres 60 secondes"

echo ""
echo "=================================================="
echo "  Installation terminee !"
echo "=================================================="
echo ""
echo "Commandes utiles :"
echo "  python3 $APP_ROOT/health_recovery.py --status       # Voir le statut"
echo "  python3 $APP_ROOT/health_recovery.py --reset        # Reset compteur echecs"
echo "  python3 $APP_ROOT/health_recovery.py --maintenance on   # Activer maintenance"
echo "  python3 $APP_ROOT/health_recovery.py --maintenance off  # Desactiver maintenance"
echo "  tail -f $CRON_LOG                                   # Voir les logs"
echo "  crontab -l                                          # Voir les crons"
echo ""
