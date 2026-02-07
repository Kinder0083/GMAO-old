#!/usr/bin/env python3
"""
Script de diagnostic pour le backend GMAO IRIS.
Exécuter avec: python3 diagnose_backend.py

Ce script vérifie:
1. Les variables d'environnement requises
2. Les imports Python critiques
3. La connexion MongoDB
4. Les dépendances manquantes
"""

import sys
import os

print("=" * 60)
print("🔍 DIAGNOSTIC BACKEND GMAO IRIS")
print("=" * 60)

# 1. Vérifier la version Python
print(f"\n📌 Python version: {sys.version}")

# 2. Vérifier les variables d'environnement
print("\n📌 Variables d'environnement:")
required_vars = ['MONGO_URL', 'DB_NAME']
optional_vars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD']

for var in required_vars:
    value = os.environ.get(var)
    if value:
        # Masquer les valeurs sensibles
        if 'password' in var.lower() or 'url' in var.lower():
            print(f"  ✅ {var}: [DÉFINI - masqué]")
        else:
            print(f"  ✅ {var}: {value}")
    else:
        print(f"  ❌ {var}: NON DÉFINI - CRITIQUE!")

for var in optional_vars:
    value = os.environ.get(var)
    if value:
        print(f"  ✅ {var}: [DÉFINI]")
    else:
        print(f"  ⚠️  {var}: non défini (optionnel)")

# 3. Vérifier les imports critiques
print("\n📌 Imports Python critiques:")
critical_imports = [
    ('fastapi', 'FastAPI'),
    ('motor.motor_asyncio', 'AsyncIOMotorClient'),
    ('pydantic', 'BaseModel'),
    ('bcrypt', None),
    ('python_jose', 'jwt'),
    ('apscheduler.schedulers.asyncio', 'AsyncIOScheduler'),
    ('httpx', None),
    ('aiofiles', None),
    ('pandas', None),
    ('bson', 'ObjectId'),
]

failed_imports = []
for module_name, submodule in critical_imports:
    try:
        if submodule:
            exec(f"from {module_name} import {submodule}")
        else:
            __import__(module_name)
        print(f"  ✅ {module_name}")
    except ImportError as e:
        print(f"  ❌ {module_name}: {e}")
        failed_imports.append(module_name)

if failed_imports:
    print(f"\n⚠️  Packages manquants: {', '.join(failed_imports)}")
    print("   Installez avec: pip install " + " ".join(failed_imports))

# 4. Vérifier la connexion MongoDB
print("\n📌 Test connexion MongoDB:")
mongo_url = os.environ.get('MONGO_URL')
if mongo_url:
    try:
        from pymongo import MongoClient
        from pymongo.errors import ConnectionFailure
        
        # Test synchrone rapide
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print(f"  ✅ MongoDB accessible")
        
        db_name = os.environ.get('DB_NAME', 'gmao_iris')
        db = client[db_name]
        collections = db.list_collection_names()
        print(f"  ✅ Base de données '{db_name}': {len(collections)} collections")
        client.close()
        
    except ImportError:
        print("  ⚠️  pymongo non installé - test ignoré")
    except ConnectionFailure as e:
        print(f"  ❌ Connexion MongoDB échouée: {e}")
    except Exception as e:
        print(f"  ❌ Erreur MongoDB: {type(e).__name__}: {e}")
else:
    print("  ❌ MONGO_URL non défini - impossible de tester")

# 5. Vérifier le fichier .env
print("\n📌 Fichier .env:")
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    print(f"  ✅ Fichier .env trouvé: {env_path}")
    with open(env_path, 'r') as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith('#')]
        print(f"  ✅ {len(lines)} variable(s) définies")
else:
    print(f"  ❌ Fichier .env NON TROUVÉ à {env_path}")

# 6. Tester l'import du serveur principal
print("\n📌 Import du serveur principal:")
try:
    # Charger d'abord le .env si présent
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(env_path)
    
    # Importer le module server (sans démarrer)
    import server
    print("  ✅ server.py importé avec succès")
except Exception as e:
    import traceback
    print(f"  ❌ Erreur import server.py:")
    print(f"     {type(e).__name__}: {e}")
    print("\n📋 Traceback complet:")
    traceback.print_exc()

print("\n" + "=" * 60)
print("🏁 FIN DU DIAGNOSTIC")
print("=" * 60)
