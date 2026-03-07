"""
Migration pour ajouter les permissions 'surveillance' à tous les utilisateurs existants
selon leur rôle actuel.

Usage: python add_surveillance_permissions.py
"""

import os
import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import get_default_permissions_by_role

# Configuration MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/gmao_iris')

async def migrate_surveillance_permissions():
    """Ajoute les permissions surveillance à tous les utilisateurs existants"""
    
    # Connexion à MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.gmao_iris
    
    try:
        print("🔍 Récupération de tous les utilisateurs...")
        users = await db.users.find().to_list(length=None)
        print(f"✅ {len(users)} utilisateurs trouvés\n")
        
        updated_count = 0
        already_has_permission_count = 0
        
        for user in users:
            user_email = user.get('email', 'inconnu')
            user_role = user.get('role', 'VISUALISEUR')
            permissions = user.get('permissions', {})
            
            # Vérifier si l'utilisateur a déjà la permission surveillance
            if 'surveillance' in permissions:
                print(f"⏭️  {user_email} ({user_role}) : permission 'surveillance' déjà présente")
                already_has_permission_count += 1
                continue
            
            # Obtenir les permissions par défaut pour le rôle
            default_permissions = get_default_permissions_by_role(user_role)
            surveillance_permission = default_permissions.surveillance.model_dump()
            
            # Ajouter la permission surveillance
            permissions['surveillance'] = surveillance_permission
            
            # Mettre à jour l'utilisateur
            await db.users.update_one(
                {'email': user_email},
                {'$set': {'permissions': permissions}}
            )
            
            print(f"✅ {user_email} ({user_role}) : permission 'surveillance' ajoutée → view={surveillance_permission['view']}, edit={surveillance_permission['edit']}, delete={surveillance_permission['delete']}")
            updated_count += 1
        
        print(f"\n📊 RÉSUMÉ DE LA MIGRATION :")
        print(f"   - Utilisateurs mis à jour : {updated_count}")
        print(f"   - Utilisateurs déjà à jour : {already_has_permission_count}")
        print(f"   - Total : {len(users)}")
        print(f"\n✅ Migration terminée avec succès !")
        
    except Exception as e:
        print(f"\n❌ ERREUR lors de la migration : {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    print("=" * 70)
    print("  MIGRATION : Ajout des permissions 'surveillance'")
    print("=" * 70)
    print()
    
    asyncio.run(migrate_surveillance_permissions())
