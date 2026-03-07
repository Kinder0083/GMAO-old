"""
Migration: Ajouter le champ entreprise aux bons de travail existants
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def run_migration():
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.gmao_cmms
    
    print("Début de la migration: Ajout du champ entreprise aux bons de travail...")
    
    # Mettre à jour tous les bons de travail sans champ entreprise
    result = await db.bons_travail.update_many(
        {"entreprise": {"$exists": False}},
        {"$set": {"entreprise": "Non assignée"}}
    )
    
    print(f"✅ {result.modified_count} bons de travail mis à jour")
    
    # Mettre à jour tous les bons de travail sans champ titre
    result2 = await db.bons_travail.update_many(
        {"titre": {"$exists": False}},
        {"$set": {"titre": "Bon de travail"}}
    )
    
    print(f"✅ {result2.modified_count} bons de travail avec titre ajouté")
    
    client.close()
    print("Migration terminée !")

if __name__ == "__main__":
    asyncio.run(run_migration())
