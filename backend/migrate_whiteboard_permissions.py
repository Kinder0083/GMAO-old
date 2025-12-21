#!/usr/bin/env python3
"""
Script de migration des permissions - Ajoute la permission whiteboard aux utilisateurs existants
À exécuter après la mise à jour du code pour les installations existantes
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

async def migrate_permissions():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gmao_iris')
    
    print(f"🔧 Connexion à MongoDB: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Liste des rôles et leurs permissions whiteboard par défaut
    role_permissions = {
        "ADMIN": {"view": True, "edit": True, "delete": True},
        "AFFICHAGE": {"view": True, "edit": True, "delete": False},
        "DIRECTEUR": {"view": True, "edit": False, "delete": False},
        "QHSE": {"view": True, "edit": False, "delete": False},
        # Les autres rôles n'ont pas accès par défaut
    }
    
    total_updated = 0
    
    for role, permissions in role_permissions.items():
        result = await db.users.update_many(
            {
                "role": role,
                "$or": [
                    {"permissions.whiteboard": {"$exists": False}},
                    {"permissions.whiteboard.view": False}
                ]
            },
            {"$set": {"permissions.whiteboard": permissions}}
        )
        if result.modified_count > 0:
            print(f"  ✓ {result.modified_count} utilisateur(s) {role} mis à jour")
            total_updated += result.modified_count
    
    # Ajouter la permission avec view=False pour les autres utilisateurs qui n'ont pas encore whiteboard
    result = await db.users.update_many(
        {"permissions.whiteboard": {"$exists": False}},
        {"$set": {"permissions.whiteboard": {"view": False, "edit": False, "delete": False}}}
    )
    if result.modified_count > 0:
        print(f"  ✓ {result.modified_count} autre(s) utilisateur(s) mis à jour (sans accès)")
        total_updated += result.modified_count
    
    print(f"\n✅ Migration terminée: {total_updated} utilisateur(s) mis à jour au total")
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(migrate_permissions())
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)
