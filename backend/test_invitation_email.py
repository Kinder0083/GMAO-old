#!/usr/bin/env python3
"""
Script de test complet pour l'envoi d'emails d'invitation
"""
import os
import sys
from pathlib import Path

# Charger l'environnement
sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / '.env')

from email_service import send_invitation_email, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, APP_URL

print("=" * 60)
print("TEST ENVOI EMAIL D'INVITATION - GMAO IRIS")
print("=" * 60)
print()
print("Configuration actuelle:")
print(f"  SMTP_SERVER: {SMTP_SERVER}")
print(f"  SMTP_PORT: {SMTP_PORT}")
print(f"  SMTP_USERNAME: {SMTP_USERNAME if SMTP_USERNAME else '(non configuré)'}")
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
print(f"   Token: {test_token[:20]}...")
print()

try:
    result = send_invitation_email(to_email, test_token, test_role)
    
    if result:
        print("✅ Email d'invitation envoyé avec succès!")
        print()
        print(f"Le lien d'invitation sera: {APP_URL}/inscription?token={test_token}")
    else:
        print("❌ Échec de l'envoi de l'email")
        print()
        print("Vérifiez les logs backend pour plus de détails:")
        print("  tail -n 100 /var/log/supervisor/backend.*.log")
        
except Exception as e:
    print(f"❌ Erreur: {type(e).__name__}: {e}")
    import traceback
    print(traceback.format_exc())

print()
print("=" * 60)
print("FIN DU TEST")
print("=" * 60)
