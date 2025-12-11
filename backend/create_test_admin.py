"""Créer ou mettre à jour un utilisateur admin pour les tests"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_admin():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db_name = os.environ.get('DB_NAME', 'gmao_iris')
    db = client[db_name]
    
    email = "admin@test.com"
    password = "admin123"
    
    print(f"🔧 Création/Mise à jour de l'utilisateur: {email}")
    print(f"   Mot de passe: {password}")
    
    # Vérifier si l'utilisateur existe
    existing = await db.users.find_one({"email": email})
    
    hashed_password = pwd_context.hash(password)
    
    if existing:
        # Mettre à jour le mot de passe
        await db.users.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}}
        )
        print(f"✅ Mot de passe mis à jour pour {email}")
    else:
        # Créer l'utilisateur
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password": hashed_password,
            "nom": "Test",
            "prenom": "Admin",
            "role": "ADMIN",
            "permissions": {
                "users": {"view": True, "create": True, "edit": True, "delete": True},
                "workOrders": {"view": True, "create": True, "edit": True, "delete": True},
                "equipment": {"view": True, "create": True, "edit": True, "delete": True},
                "preventive": {"view": True, "create": True, "edit": True, "delete": True},
                "inventory": {"view": True, "create": True, "edit": True, "delete": True},
                "requests": {"view": True, "create": True, "edit": True, "delete": True},
                "improvements": {"view": True, "create": True, "edit": True, "delete": True},
                "projects": {"view": True, "create": True, "edit": True, "delete": True},
                "reports": {"view": True, "create": True, "edit": True, "delete": True},
                "settings": {"view": True, "edit": True},
                "chat": {"view": True, "send": True, "delete": True},
                "sensors": {"view": True, "create": True, "edit": True, "delete": True},
                "iotDashboard": {"view": True},
                "mqtt": {"view": True, "create": True, "edit": True, "delete": True},
                "mqttLogs": {"view": True}
            },
            "displayPreferences": {
                "defaultHomePage": "/dashboard"
            }
        }
        await db.users.insert_one(user)
        print(f"✅ Utilisateur créé: {email}")
    
    print(f"\n🔑 Identifiants de test:")
    print(f"   Email: {email}")
    print(f"   Mot de passe: {password}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_admin())
