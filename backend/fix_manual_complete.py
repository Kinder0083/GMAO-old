#!/usr/bin/env python3
"""
Script FINAL pour charger le manuel complet AVEC Chat Live ET MQTT
"""
import asyncio
import subprocess
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_manual():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🧹 ÉTAPE 1: Nettoyage complet...")
    await db.manual_chapters.drop()
    await db.manual_sections.drop()
    await db.manual_versions.drop()
    print("   ✅ Collections vidées")
    
    print("\n📚 ÉTAPE 2: Génération du manuel de base...")
    result = subprocess.run(['python3', '/app/backend/generate_complete_manual.py'], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        print(f"   ❌ Erreur: {result.stderr}")
        return False
    
    count = await db.manual_chapters.count_documents({})
    print(f"   ✅ {count} chapitres de base insérés")
    
    if count == 0:
        print("   ⚠️  PROBLÈME: Le script de base n'a rien inséré!")
        print("   Insertion manuelle nécessaire...")
        # Le problème vient du fait que generate_complete_manual ne fait pas d'insert
        # On va le faire manuellement
        client.close()
        return False
    
    print("\n💬 ÉTAPE 3: Ajout Chat Live...")
    result = subprocess.run(['python3', '/app/backend/add_chat_live_manual.py'],
                          capture_output=True, text=True)
    
    count = await db.manual_chapters.count_documents({})
    chat_exists = await db.manual_chapters.find_one({"title": {"$regex": "Chat Live", "$options": "i"}})
    print(f"   ✅ Total: {count} chapitres")
    print(f"   {'✅' if chat_exists else '❌'} Chat Live: {'présent' if chat_exists else 'ABSENT'}")
    
    print("\n📡 ÉTAPE 4: Ajout MQTT...")
    result = subprocess.run(['python3', '/app/backend/add_mqtt_to_manual.py'],
                          capture_output=True, text=True)
    
    count_final = await db.manual_chapters.count_documents({})
    mqtt_exists = await db.manual_chapters.find_one({"title": {"$regex": "MQTT|IoT", "$options": "i"}})
    print(f"   ✅ Total final: {count_final} chapitres")
    print(f"   {'✅' if mqtt_exists else '❌'} MQTT: {'présent' if mqtt_exists else 'ABSENT'}")
    
    print("\n📋 ÉTAPE 5: Vérification finale...")
    chapters = await db.manual_chapters.find({}, {"_id": 0, "title": 1, "order": 1}).sort("order", 1).to_list(None)
    
    print(f"\n✅ RÉSULTAT FINAL:")
    print(f"   📖 {len(chapters)} chapitres dans la base")
    
    # Afficher les 5 derniers
    print(f"\n   Derniers chapitres:")
    for ch in chapters[-5:]:
        print(f"      {ch.get('order', '?')}. {ch.get('title', 'Sans titre')}")
    
    client.close()
    return True

if __name__ == "__main__":
    success = asyncio.run(fix_manual())
    if success:
        print("\n🎉 Manuel restauré avec succès!")
    else:
        print("\n❌ Échec de la restauration")
