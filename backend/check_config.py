#!/usr/bin/env python3
"""
Script de vérification de la configuration GMAO Iris
À exécuter après l'installation pour vérifier que tout est correct
"""
import os
import sys
from pathlib import Path

# Charger l'environnement
sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / '.env')

print("=" * 70)
print("VÉRIFICATION DE LA CONFIGURATION - GMAO IRIS")
print("=" * 70)
print()

# 1. Vérifier les variables critiques
print("📋 VARIABLES D'ENVIRONNEMENT")
print("-" * 50)

critical_vars = {
    'SMTP_SERVER': os.environ.get('SMTP_SERVER'),
    'SMTP_PORT': os.environ.get('SMTP_PORT'),
    'SMTP_USERNAME': os.environ.get('SMTP_USERNAME'),
    'SMTP_PASSWORD': os.environ.get('SMTP_PASSWORD'),
    'SMTP_SENDER_EMAIL': os.environ.get('SMTP_SENDER_EMAIL'),
    'APP_URL': os.environ.get('APP_URL'),
    'MONGO_URL': os.environ.get('MONGO_URL'),
    'SECRET_KEY': os.environ.get('SECRET_KEY'),
}

all_ok = True
for var, value in critical_vars.items():
    if value:
        if 'PASSWORD' in var or 'SECRET' in var:
            display_value = '*' * len(value)
        else:
            display_value = value
        print(f"  ✅ {var}: {display_value}")
    else:
        print(f"  ❌ {var}: NON CONFIGURÉ")
        all_ok = False

print()

# 2. Tester la connexion MongoDB
print("🗃️ CONNEXION MONGODB")
print("-" * 50)
try:
    from pymongo import MongoClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print(f"  ✅ Connexion MongoDB réussie: {mongo_url}")
except Exception as e:
    print(f"  ❌ Erreur MongoDB: {e}")
    all_ok = False

print()

# 3. Tester la connexion SMTP
print("📧 CONNEXION SMTP")
print("-" * 50)
try:
    import smtplib
    smtp_server = os.environ.get('SMTP_SERVER', 'localhost')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USERNAME', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD', '')
    smtp_use_tls = os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true'
    
    if smtp_server in ['localhost', '127.0.0.1']:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.quit()
        print(f"  ✅ Connexion SMTP locale réussie: {smtp_server}:{smtp_port}")
    else:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.ehlo()
        if smtp_use_tls:
            server.starttls()
            server.ehlo()
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
            print(f"  ✅ Authentification SMTP réussie: {smtp_user}")
        server.quit()
        print(f"  ✅ Connexion SMTP réussie: {smtp_server}:{smtp_port}")
except smtplib.SMTPAuthenticationError as e:
    print(f"  ❌ Erreur d'authentification SMTP: {e}")
    all_ok = False
except Exception as e:
    print(f"  ❌ Erreur SMTP: {e}")
    all_ok = False

print()

# 4. Résumé
print("=" * 70)
if all_ok:
    print("✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES")
else:
    print("⚠️ CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ - Vérifiez le fichier .env")
print("=" * 70)
