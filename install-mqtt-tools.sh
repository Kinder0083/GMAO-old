#!/bin/bash
#
# Installation des outils MQTT + diagnostic
#

echo "════════════════════════════════════════════════════════════"
echo "  Installation des outils MQTT"
echo "════════════════════════════════════════════════════════════"
echo ""

# Installer mosquitto-clients
apt-get update -qq
apt-get install -y mosquitto-clients

echo ""
echo "✓ Outils MQTT installés"
echo ""
echo "Vous pouvez maintenant utiliser:"
echo "  • mosquitto_pub - Pour publier"
echo "  • mosquitto_sub - Pour s'abonner"
echo ""
