#!/usr/bin/env python3
"""
Script de diagnostic SMTP pour tester l'envoi d'emails
Usage: python3 test_smtp.py [email@destinataire.com]
"""
import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# Configuration SMTP
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'localhost')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 25))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_SENDER_EMAIL') or os.environ.get('SMTP_FROM_EMAIL', 'noreply@gmao-iris.local')
SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'false').lower() == 'true'
SMTP_USE_SSL = os.environ.get('SMTP_USE_SSL', 'false').lower() == 'true'

print("=" * 60)
print("DIAGNOSTIC SMTP - GMAO IRIS")
print("=" * 60)
print()
print("Configuration actuelle:")
print(f"  SMTP_SERVER: {SMTP_SERVER}")
print(f"  SMTP_PORT: {SMTP_PORT}")
print(f"  SMTP_USERNAME: {'***' if SMTP_USERNAME else '(non configuré)'}")
print(f"  SMTP_PASSWORD: {'***' if SMTP_PASSWORD else '(non configuré)'}")
print(f"  SMTP_FROM_EMAIL: {SMTP_FROM_EMAIL}")
print(f"  SMTP_USE_TLS: {SMTP_USE_TLS}")
print(f"  SMTP_USE_SSL: {SMTP_USE_SSL}")
print()

def test_smtp_connection():
    """Test la connexion SMTP"""
    print("Test 1: Connexion au serveur SMTP...")
    try:
        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        
        print(f"  ✅ Connexion réussie à {SMTP_SERVER}:{SMTP_PORT}")
        
        # EHLO
        server.ehlo()
        print("  ✅ EHLO accepté")
        
        # STARTTLS si nécessaire
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            server.starttls()
            server.ehlo()
            print("  ✅ STARTTLS activé")
        
        # Authentification si configurée
        if SMTP_USERNAME and SMTP_PASSWORD:
            try:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                print("  ✅ Authentification réussie")
            except smtplib.SMTPAuthenticationError as e:
                print(f"  ❌ Erreur d'authentification: {e}")
                return False
        else:
            print("  ⚠️ Pas d'authentification configurée (mode local)")
        
        server.quit()
        return True
        
    except smtplib.SMTPConnectError as e:
        print(f"  ❌ Impossible de se connecter: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Erreur: {type(e).__name__}: {e}")
        return False

def test_send_email(to_email):
    """Test l'envoi d'un email"""
    print(f"\nTest 2: Envoi d'un email de test à {to_email}...")
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = '[GMAO IRIS] Test SMTP - Diagnostic'
        
        body = f"""
Ceci est un email de test envoyé depuis GMAO IRIS.

Si vous recevez cet email, la configuration SMTP fonctionne correctement.

Configuration utilisée:
- Serveur: {SMTP_SERVER}
- Port: {SMTP_PORT}
- TLS: {SMTP_USE_TLS}
- SSL: {SMTP_USE_SSL}
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        
        server.ehlo()
        
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            server.starttls()
            server.ehlo()
        
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        
        print(f"  ✅ Email envoyé avec succès à {to_email}")
        return True
        
    except Exception as e:
        print(f"  ❌ Erreur d'envoi: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    # Test de connexion
    if test_smtp_connection():
        # Si un email est fourni, tester l'envoi
        if len(sys.argv) > 1:
            test_send_email(sys.argv[1])
        else:
            print("\nPour tester l'envoi: python3 test_smtp.py votre@email.com")
    
    print()
    print("=" * 60)
    print("FIN DU DIAGNOSTIC")
    print("=" * 60)
