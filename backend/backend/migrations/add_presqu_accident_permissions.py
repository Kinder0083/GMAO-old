"""
Script de migration pour ajouter les permissions presquaccident à tous les utilisateurs existants
À exécuter une seule fois après le déploiement du module Presqu'accident
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import ModulePermission, get_default_permissions_by_role

# Load environment variables
load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/cmms")

async def migrate_permissions():
    """Ajoute les permissions presquaccident à tous les utilisateurs existants"""
    client = AsyncIOMotorClient(MONGO_URL)
    # Extraire le nom de la base de données de l'URL
    db_name = MONGO_URL.split('/')[-1].split('?')[0]
    db = client[db_name]
    
    print("🚀 Début de la migration des permissions presquaccident...")
    
    try:
        users = await db.users.find().to_list(length=None)
        print(f"📊 {len(users)} utilisateurs trouvés")
        
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            # Vérifier si l'utilisateur a déjà les permissions presquaccident
            if user.get("permissions", {}).get("presquaccident"):
                print(f"⏭️  Utilisateur {user['email']} a déjà les permissions presquaccident, on passe")
                skipped_count += 1
                continue
            
            # Obtenir le rôle de l'utilisateur
            role = user.get("role", "VISUALISEUR")
            
            # Obtenir les permissions par défaut pour ce rôle
            default_permissions = get_default_permissions_by_role(role)
            
            # Extraire les permissions presquaccident
            presquaccident_perms = {
                "view": default_permissions.presquaccident.view,
                "edit": default_permissions.presquaccident.edit,
                "delete": default_permissions.presquaccident.delete
            }
            
            # Mettre à jour l'utilisateur
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"permissions.presquaccident": presquaccident_perms}}
            )
            
            print(f"✅ Utilisateur {user['email']} (rôle: {role}) - permissions ajoutées : view={presquaccident_perms['view']}, edit={presquaccident_perms['edit']}, delete={presquaccident_perms['delete']}")
            updated_count += 1
        
        print(f"\n✨ Migration terminée avec succès !")
        print(f"   - {updated_count} utilisateurs mis à jour")
        print(f"   - {skipped_count} utilisateurs déjà à jour")
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration : {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_permissions())
