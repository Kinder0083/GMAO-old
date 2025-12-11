#!/usr/bin/env python3
"""
Script pour mettre à jour les permissions MQTT de tous les admins existants
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def update_permissions():
    # Connexion MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Nouvelles permissions MQTT pour ADMIN
    mqtt_permissions = {
        "sensors": {"view": True, "edit": True, "delete": True},
        "iotDashboard": {"view": True, "edit": True, "delete": False},
        "mqttLogs": {"view": True, "edit": True, "delete": True}
    }
    
    # Mettre à jour tous les utilisateurs ADMIN
    result = await db.users.update_many(
        {"role": "ADMIN"},
        {
            "$set": {
                "permissions.sensors": mqtt_permissions["sensors"],
                "permissions.iotDashboard": mqtt_permissions["iotDashboard"],
                "permissions.mqttLogs": mqtt_permissions["mqttLogs"]
            }
        }
    )
    
    print(f"✅ {result.modified_count} administrateur(s) mis à jour avec les permissions MQTT")
    
    # Vérifier
    admin_count = await db.users.count_documents({"role": "ADMIN"})
    print(f"   Total d'administrateurs : {admin_count}")
    
    # Fermer la connexion
    client.close()
    
    return {"success": True, "modified_count": result.modified_count}

if __name__ == "__main__":
    result = asyncio.run(update_permissions())
    print(f"\n✓ Mise à jour terminée")
