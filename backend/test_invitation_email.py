#!/usr/bin/env python3
"""
Script de test pour l'envoi d'emails d'invitation
Usage: python3 test_invitation_email.py <email@destinataire.com>
"""
import os
import sys
from pathlib import Path

# Charger manuellement le fichier .env
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = value

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from email_service import send_invitation_email

# Récupérer les variables
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'localhost')
SMTP_PORT = os.environ.get('SMTP_PORT', '587')
APP_URL = os.environ.get('APP_URL', 'http://localhost:3000')

print("=" * 60)
print("TEST ENVOI EMAIL D'INVITATION - GMAO IRIS")
print("=" * 60)
print()
print("Configuration actuelle:")
print(f"  SMTP_SERVER: {SMTP_SERVER}")
print(f"  SMTP_PORT: {SMTP_PORT}")
print(f"  APP_URL: {APP_URL}")
print()

if len(sys.argv) < 2:
    print("Usage: python3 test_invitation_email.py <email@destinataire.com>")
    print()
    print("Exemple: python3 test_invitation_email.py test@example.com")
    sys.exit(1)

to_email = sys.argv[1]
test_token = "test_token_123456789"
test_role = "TECHNICIEN"

print(f"📧 Envoi d'un email d'invitation de test à: {to_email}")
print(f"   Rôle: {test_role}")
print()

try:
    result = send_invitation_email(to_email, test_token, test_role)
    
    if result:
        print("✅ Email d'invitation envoyé avec succès!")
        print()
        print(f"Le lien d'invitation sera: {APP_URL}/inscription?token={test_token[:20]}...")
    else:
        print("❌ Échec de l'envoi de l'email")
        print()
        print("Vérifiez les logs pour plus de détails:")
        print("  tail -n 50 /var/log/gmao-iris/backend.log")
        
except Exception as e:
    print(f"❌ Erreur: {type(e).__name__}: {e}")
    import traceback
    print(traceback.format_exc())

print()
print("=" * 60)
print("FIN DU TEST")
print("=" * 60)
