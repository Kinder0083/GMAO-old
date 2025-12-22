#!/usr/bin/env python3
"""
Script de vérification de la configuration GMAO Iris
À exécuter après l'installation pour vérifier que tout est correct
"""
import os
import sys
from pathlib import Path

# Charger manuellement le fichier .env (sans dépendance externe)
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

print("=" * 70)
print("VÉRIFICATION DE LA CONFIGURATION - GMAO IRIS")
print("=" * 70)
print()

# 1. Vérifier les variables critiques (compatible avec les deux formats)
print("📋 VARIABLES D'ENVIRONNEMENT")
print("-" * 50)

# Récupérer les variables avec fallback
smtp_server = os.environ.get('SMTP_SERVER') or os.environ.get('SMTP_HOST')
smtp_port = os.environ.get('SMTP_PORT')
smtp_user = os.environ.get('SMTP_USERNAME') or os.environ.get('SMTP_USER')
smtp_pass = os.environ.get('SMTP_PASSWORD')
smtp_from = os.environ.get('SMTP_SENDER_EMAIL') or os.environ.get('SMTP_FROM')
app_url = os.environ.get('APP_URL')
mongo_url = os.environ.get('MONGO_URL')
secret_key = os.environ.get('SECRET_KEY')

all_ok = True

def check_var(name, value, required=True, mask=False):
    global all_ok
    if value:
        display = '*' * min(len(value), 20) if mask else value
        print(f"  ✅ {name}: {display}")
        return True
    else:
        if required:
            print(f"  ❌ {name}: NON CONFIGURÉ")
            all_ok = False
        else:
            print(f"  ⚠️ {name}: non configuré (optionnel)")
        return False

check_var("SMTP_SERVER/SMTP_HOST", smtp_server)
check_var("SMTP_PORT", smtp_port)
check_var("SMTP_USERNAME/SMTP_USER", smtp_user, required=False)
check_var("SMTP_PASSWORD", smtp_pass, required=False, mask=True)
check_var("SMTP_SENDER_EMAIL/SMTP_FROM", smtp_from)
check_var("APP_URL", app_url)
check_var("MONGO_URL", mongo_url)
check_var("SECRET_KEY", secret_key, mask=True)

print()

# 2. Tester la connexion MongoDB
print("🗃️ CONNEXION MONGODB")
print("-" * 50)
try:
    from pymongo import MongoClient
    mongo_url = mongo_url or 'mongodb://localhost:27017'
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print(f"  ✅ Connexion MongoDB réussie")
except ImportError:
    print("  ⚠️ Module pymongo non installé - test ignoré")
except Exception as e:
    print(f"  ❌ Erreur MongoDB: {e}")
    all_ok = False

print()

# 3. Tester la connexion SMTP
print("📧 CONNEXION SMTP")
print("-" * 50)
try:
    import smtplib
    smtp_server = smtp_server or 'localhost'
    smtp_port = int(smtp_port or 25)
    smtp_use_tls = (os.environ.get('SMTP_USE_TLS') or os.environ.get('SMTP_TLS', 'false')).lower() == 'true'
    
    print(f"  Tentative de connexion à {smtp_server}:{smtp_port}...")
    
    server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
    server.ehlo()
    
    if smtp_use_tls:
        server.starttls()
        server.ehlo()
        print(f"  ✅ STARTTLS activé")
    
    if smtp_user and smtp_pass:
        server.login(smtp_user, smtp_pass)
        print(f"  ✅ Authentification réussie: {smtp_user}")
    
    server.quit()
    print(f"  ✅ Connexion SMTP réussie: {smtp_server}:{smtp_port}")
    
except smtplib.SMTPAuthenticationError as e:
    print(f"  ❌ Erreur d'authentification SMTP: {e}")
    all_ok = False
except smtplib.SMTPConnectError as e:
    print(f"  ❌ Impossible de se connecter au serveur SMTP: {e}")
    all_ok = False
except Exception as e:
    print(f"  ❌ Erreur SMTP: {type(e).__name__}: {e}")
    all_ok = False

print()

# 4. Vérifier APP_URL
print("🌐 URL DE L'APPLICATION")
print("-" * 50)
if app_url:
    if 'localhost' in app_url or '127.0.0.1' in app_url:
        print(f"  ⚠️ APP_URL contient localhost: {app_url}")
        print("     Les emails d'invitation auront des liens non fonctionnels!")
        print("     Modifiez APP_URL avec l'URL externe de votre serveur.")
    else:
        print(f"  ✅ APP_URL: {app_url}")
else:
    print("  ❌ APP_URL non configuré")
    all_ok = False

print()

# 5. Résumé
print("=" * 70)
if all_ok:
    print("✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES")
else:
    print("⚠️ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ")
    print()
    print("Pour corriger, éditez le fichier .env:")
    print(f"  nano {env_file}")
print("=" * 70)
