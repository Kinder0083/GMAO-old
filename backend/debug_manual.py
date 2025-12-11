"""Script de débogage du manuel utilisateur"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def debug_manual():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client['gmao_db']
    
    print("=" * 80)
    print("🔍 DÉBOGAGE DU MANUEL UTILISATEUR")
    print("=" * 80)
    
    # 1. Vérifier les collections
    print("\n📊 Comptage des documents:")
    chapters_count = await db.manual_chapters.count_documents({})
    sections_count = await db.manual_sections.count_documents({})
    versions_count = await db.manual_versions.count_documents({})
    
    print(f"  - manual_chapters: {chapters_count}")
    print(f"  - manual_sections: {sections_count}")
    print(f"  - manual_versions: {versions_count}")
    
    # 2. Vérifier la version actuelle
    print("\n🔖 Versions disponibles:")
    versions = await db.manual_versions.find({}, {'_id': 0}).to_list(None)
    current_version = None
    for v in versions:
        is_current = v.get('is_current', False)
        marker = " ✅ (actuelle)" if is_current else ""
        print(f"  - Version {v.get('version', 'N/A')}{marker}")
        print(f"    Date: {v.get('release_date', 'N/A')}")
        print(f"    is_current: {is_current}")
        if is_current:
            current_version = v
    
    if not current_version:
        print("\n⚠️  PROBLÈME: Aucune version marquée comme 'is_current: True'")
    
    # 3. Lister tous les chapitres
    print("\n📖 Chapitres disponibles:")
    chapters = await db.manual_chapters.find({}, {'_id': 0}).sort('order', 1).to_list(None)
    
    if not chapters:
        print("  ⚠️  Aucun chapitre trouvé!")
    else:
        for ch in chapters:
            print(f"\n  [{ch.get('order', '?')}] {ch.get('title', 'N/A')}")
            print(f"      ID: {ch.get('id', 'N/A')}")
            print(f"      Target roles: {ch.get('target_roles', [])}")
            print(f"      Sections: {len(ch.get('sections', []))} sections référencées")
            
            # Vérifier si les sections existent
            section_ids = ch.get('sections', [])
            if section_ids:
                existing = await db.manual_sections.count_documents({'id': {'$in': section_ids}})
                print(f"      Sections existantes: {existing}/{len(section_ids)}")
    
    # 4. Vérifier quelques sections
    print("\n📄 Premières sections:")
    sections = await db.manual_sections.find({}, {'_id': 0, 'id': 1, 'chapter_id': 1, 'title': 1, 'target_roles': 1}).limit(5).to_list(None)
    for sec in sections:
        print(f"  - {sec.get('id', 'N/A')}: {sec.get('title', 'N/A')}")
        print(f"    Chapter: {sec.get('chapter_id', 'N/A')}, Roles: {sec.get('target_roles', [])}")
    
    # 5. Simuler la logique de filtrage de l'API
    print("\n🔍 Simulation du filtrage de l'API:")
    print("  Test avec role='ADMIN':")
    
    user_role = "ADMIN"
    filtered_chapters = []
    
    for chapter in chapters:
        target_roles = chapter.get("target_roles", [])
        print(f"\n    Chapitre: {chapter.get('title')}")
        print(f"      target_roles: {target_roles}")
        
        if target_roles and user_role not in target_roles:
            print(f"      ❌ Filtré (user_role '{user_role}' pas dans target_roles)")
            continue
        
        print(f"      ✅ Accepté")
        filtered_chapters.append(chapter)
    
    print(f"\n  Résultat: {len(filtered_chapters)}/{len(chapters)} chapitres après filtrage")
    
    # 6. Vérifier si les chapitres ont des sections valides
    print("\n🔗 Vérification des sections par chapitre:")
    for chapter in filtered_chapters:
        section_ids = chapter.get('sections', [])
        if section_ids:
            existing_sections = await db.manual_sections.count_documents({
                'id': {'$in': section_ids}
            })
            print(f"  - {chapter.get('title')}: {existing_sections}/{len(section_ids)} sections trouvées")
        else:
            print(f"  - {chapter.get('title')}: ⚠️ Aucune section référencée")
    
    print("\n" + "=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_manual())
