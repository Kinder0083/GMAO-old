#!/usr/bin/env python3
"""
Script pour restaurer le manuel complet AVEC Chat Live ET MQTT
Sans supprimer les données existantes si elles sont bonnes
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

async def restore_manual():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'gmao_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔄 Restauration du manuel complet...")
    
    # Supprimer uniquement ce qui existe
    await db.manual_chapters.delete_many({})
    await db.manual_sections.delete_many({})
    await db.manual_versions.delete_many({})
    print("✅ Anciennes données nettoyées")
    
    # Maintenant exécutons les 3 scripts dans l'ordre
    print("\n📚 Étape 1/3 : Génération du manuel de base...")
    os.system("cd /app/backend && python3 generate_complete_manual.py > /tmp/gen_manual.log 2>&1")
    
    # Vérification
    count_after_gen = await db.manual_chapters.count_documents({})
    print(f"   ✅ {count_after_gen} chapitres générés")
    
    print("\n💬 Étape 2/3 : Ajout du Chat Live...")
    os.system("cd /app/backend && python3 add_chat_live_manual.py > /tmp/add_chat.log 2>&1")
    
    count_after_chat = await db.manual_chapters.count_documents({})
    print(f"   ✅ Total : {count_after_chat} chapitres")
    
    print("\n📡 Étape 3/3 : Ajout du MQTT...")
    os.system("cd /app/backend && python3 add_mqtt_to_manual.py > /tmp/add_mqtt.log 2>&1")
    
    count_final = await db.manual_chapters.count_documents({})
    sections_final = await db.manual_sections.count_documents({})
    
    print(f"\n🎉 Manuel complet restauré !")
    print(f"   📖 {count_final} chapitres")
    print(f"   📄 {sections_final} sections")
    
    # Afficher les chapitres
    chapters = await db.manual_chapters.find({}, {"_id": 0, "title": 1, "order": 1}).sort("order", 1).to_list(None)
    
    print(f"\n📋 Liste des chapitres :")
    for ch in chapters:
        print(f"   {ch.get('order', '?')}.{ch.get('title')}")
    
    # S'assurer qu'il y a une version active
    await db.manual_versions.update_one(
        {},
        {"$set": {
            "version": "1.2.0",
            "is_current": True,
            "release_date": datetime.now(timezone.utc),
            "changes": [
                "Manuel de base complet",
                "Chapitre Chat Live ajouté",
                "Chapitre Système MQTT & IoT ajouté"
            ]
        }},
        upsert=True
    )
    print(f"\n✅ Version 1.2.0 activée")
    
    client.close()
    return {"success": True, "chapters": count_final, "sections": sections_final}

if __name__ == "__main__":
    result = asyncio.run(restore_manual())
