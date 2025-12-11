"""
Script de migration du manuel de gmao_db vers gmao_iris
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_manual():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    
    source_db = client['gmao_db']
    target_db = client['gmao_iris']
    
    print("=" * 80)
    print("🔄 MIGRATION DU MANUEL UTILISATEUR")
    print("=" * 80)
    print(f"\n📤 Source: gmao_db")
    print(f"📥 Target: gmao_iris")
    
    # Vérifier l'état initial
    print("\n📊 État initial:")
    source_chapters = await source_db.manual_chapters.count_documents({})
    source_sections = await source_db.manual_sections.count_documents({})
    source_versions = await source_db.manual_versions.count_documents({})
    
    target_chapters = await target_db.manual_chapters.count_documents({})
    target_sections = await target_db.manual_sections.count_documents({})
    target_versions = await target_db.manual_versions.count_documents({})
    
    print(f"  Source (gmao_db):")
    print(f"    - Chapitres: {source_chapters}")
    print(f"    - Sections: {source_sections}")
    print(f"    - Versions: {source_versions}")
    
    print(f"  Target (gmao_iris):")
    print(f"    - Chapitres: {target_chapters}")
    print(f"    - Sections: {target_sections}")
    print(f"    - Versions: {target_versions}")
    
    # Migration
    print("\n🔄 Migration en cours...")
    
    # 1. Supprimer les anciennes données dans target
    print("  1️⃣  Nettoyage de la base cible...")
    await target_db.manual_chapters.delete_many({})
    await target_db.manual_sections.delete_many({})
    await target_db.manual_versions.delete_many({})
    print("     ✅ Nettoyage terminé")
    
    # 2. Copier les versions
    print("  2️⃣  Migration des versions...")
    versions = await source_db.manual_versions.find({}).to_list(None)
    if versions:
        await target_db.manual_versions.insert_many(versions)
        print(f"     ✅ {len(versions)} version(s) copiée(s)")
    
    # 3. Copier les chapitres
    print("  3️⃣  Migration des chapitres...")
    chapters = await source_db.manual_chapters.find({}).to_list(None)
    if chapters:
        await target_db.manual_chapters.insert_many(chapters)
        print(f"     ✅ {len(chapters)} chapitre(s) copié(s)")
    
    # 4. Copier les sections
    print("  4️⃣  Migration des sections...")
    sections = await source_db.manual_sections.find({}).to_list(None)
    if sections:
        await target_db.manual_sections.insert_many(sections)
        print(f"     ✅ {len(sections)} section(s) copiée(s)")
    
    # Vérification finale
    print("\n📊 État final:")
    final_chapters = await target_db.manual_chapters.count_documents({})
    final_sections = await target_db.manual_sections.count_documents({})
    final_versions = await target_db.manual_versions.count_documents({})
    
    print(f"  Target (gmao_iris):")
    print(f"    - Chapitres: {final_chapters}")
    print(f"    - Sections: {final_sections}")
    print(f"    - Versions: {final_versions}")
    
    # Lister les chapitres migrés
    print("\n📖 Chapitres migrés:")
    migrated_chapters = await target_db.manual_chapters.find({}, {'_id': 0, 'id': 1, 'title': 1, 'order': 1}).sort('order', 1).to_list(None)
    for ch in migrated_chapters:
        print(f"  [{ch.get('order')}] {ch.get('title')}")
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION TERMINÉE AVEC SUCCÈS")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_manual())
