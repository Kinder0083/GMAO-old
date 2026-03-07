"""
Script de migration pour ajouter les permissions documentations à tous les utilisateurs existants
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import get_default_permissions_by_role

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/cmms")

async def migrate_permissions():
    """Ajoute les permissions documentations à tous les utilisateurs existants"""
    client = AsyncIOMotorClient(MONGO_URL)
    db_name = MONGO_URL.split('/')[-1].split('?')[0]
    db = client[db_name]
    
    print("🚀 Début de la migration des permissions documentations...")
    
    try:
        users = await db.users.find().to_list(length=None)
        print(f"📊 {len(users)} utilisateurs trouvés")
        
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            if user.get("permissions", {}).get("documentations"):
                print(f"⏭️  Utilisateur {user['email']} a déjà les permissions documentations")
                skipped_count += 1
                continue
            
            role = user.get("role", "VISUALISEUR")
            default_permissions = get_default_permissions_by_role(role)
            
            documentations_perms = {
                "view": default_permissions.documentations.view,
                "edit": default_permissions.documentations.edit,
                "delete": default_permissions.documentations.delete
            }
            
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"permissions.documentations": documentations_perms}}
            )
            
            print(f"✅ {user['email']} (rôle: {role}) - permissions ajoutées")
            updated_count += 1
        
        print(f"\n✨ Migration terminée !")
        print(f"   - {updated_count} utilisateurs mis à jour")
        print(f"   - {skipped_count} utilisateurs déjà à jour")
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration : {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_permissions())
