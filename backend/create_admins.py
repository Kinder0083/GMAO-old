#!/usr/bin/env python3
"""
Script pour créer les comptes administrateurs lors de l'installation
Usage: python3 create_admins.py <email> <password>
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import sys
import os

async def create_admins(admin_email, admin_pass):
    """Créer les comptes administrateurs"""
    try:
        # Connexion MongoDB
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        db_name = os.getenv('DB_NAME', 'gmao_iris')
        db = client[db_name]
        
        # Configuration du hash de mot de passe
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto', bcrypt__rounds=10)
        
        print("🔐 Création des comptes administrateurs...")
        
        # Liste complète des modules pour les permissions admin
        all_modules = [
            'dashboard', 'workOrders', 'assets', 'preventiveMaintenance',
            'planningMprev', 'inventory', 'locations', 'vendors', 'reports',
            'purchaseHistory', 'people', 'planning', 'improvementRequests',
            'improvements', 'interventionRequests', 'equipments', 'meters',
            'importExport', 'journal', 'settings', 'surveillance',
            'surveillanceRapport', 'presquaccident', 'presquaccidentRapport',
            'documentations', 'personalization', 'chatLive', 'sensors',
            'iotDashboard', 'mqttLogs', 'purchaseRequests'
        ]
        
        # Permissions complètes pour admin
        admin_permissions = {
            module: {'view': True, 'edit': True, 'delete': True}
            for module in all_modules
        }
        
        # Admin principal
        admin1 = {
            'email': admin_email,
            'hashed_password': pwd_context.hash(admin_pass),
            'nom': 'Admin',
            'prenom': 'Principal',
            'role': 'ADMIN',
            'telephone': None,
            'service': None,
            'statut': 'actif',
            'dateCreation': datetime.now(timezone.utc).isoformat(),
            'derniereConnexion': None,
            'firstLogin': False,
            'permissions': admin_permissions,
            'responsable_hierarchique_id': None
        }
        
        # Vérifier si l'email existe déjà
        existing = await db.users.find_one({'email': admin_email})
        if existing:
            await db.users.update_one({'email': admin_email}, {'$set': admin1})
            print(f'✅ Admin principal mis à jour: {admin_email}')
        else:
            await db.users.insert_one(admin1)
            print(f'✅ Admin principal créé: {admin_email}')
        
        # Admin de secours (TOUJOURS créé/mis à jour)
        admin2 = {
            'email': 'buenogy@gmail.com',
            'hashed_password': pwd_context.hash('Admin2024!'),
            'nom': 'Bueno',
            'prenom': 'Gregory',
            'role': 'ADMIN',
            'telephone': None,
            'service': None,
            'statut': 'actif',
            'dateCreation': datetime.now(timezone.utc).isoformat(),
            'derniereConnexion': None,
            'firstLogin': False,
            'permissions': admin_permissions,
            'responsable_hierarchique_id': None
        }
        
        existing_backup = await db.users.find_one({'email': 'buenogy@gmail.com'})
        if existing_backup:
            await db.users.update_one({'email': 'buenogy@gmail.com'}, {'$set': admin2})
            print('✅ Admin de secours mis à jour: buenogy@gmail.com')
        else:
            await db.users.insert_one(admin2)
            print('✅ Admin de secours créé: buenogy@gmail.com')
        
        print("\n🎉 Comptes administrateurs créés avec succès !")
        print(f"   📧 Admin principal: {admin_email}")
        print(f"   📧 Admin de secours: buenogy@gmail.com")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ ERREUR lors de la création des admins: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 create_admins.py <email> <password>")
        sys.exit(1)
    
    admin_email = sys.argv[1]
    admin_pass = sys.argv[2]
    
    success = asyncio.run(create_admins(admin_email, admin_pass))
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
