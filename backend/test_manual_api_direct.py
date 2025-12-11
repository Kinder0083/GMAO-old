"""Test direct de la logique de l'API manuel"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def test_manual_logic():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db_name = os.environ.get('DB_NAME', 'gmao_iris')
    db = client[db_name]
    
    print("=" * 80)
    print("🧪 TEST DIRECT DE LA LOGIQUE DE L'API MANUEL")
    print("=" * 80)
    print(f"\nBase de données utilisée: {db_name}")
    
    # Simuler un utilisateur ADMIN
    current_user = {"role": "ADMIN", "email": "test@test.com"}
    user_role = current_user.get("role", "")
    
    print(f"Utilisateur de test: {current_user['email']} (role: {user_role})")
    
    # 1. Récupérer la version actuelle
    print("\n1️⃣  Récupération de la version actuelle...")
    current_version = await db.manual_versions.find_one({"is_current": True})
    
    if not current_version:
        print("   ❌ Aucune version actuelle trouvée!")
        client.close()
        return
    
    print(f"   ✅ Version trouvée: {current_version.get('version')}")
    
    # 2. Récupérer tous les chapitres et sections
    print("\n2️⃣  Récupération des chapitres et sections...")
    chapters = await db.manual_chapters.find({}).sort("order", 1).to_list(None)
    sections = await db.manual_sections.find({}).sort("order", 1).to_list(None)
    
    print(f"   Chapitres bruts: {len(chapters)}")
    print(f"   Sections brutes: {len(sections)}")
    
    # 3. Filtrer selon le rôle de l'utilisateur
    print("\n3️⃣  Filtrage des chapitres...")
    filtered_chapters = []
    for chapter in chapters:
        # Si le chapitre a des rôles cibles et l'utilisateur n'est pas dans la liste, skip
        if chapter.get("target_roles") and user_role not in chapter["target_roles"]:
            print(f"   ❌ Filtré: {chapter.get('title')} (roles: {chapter.get('target_roles')})")
            continue
        
        # Garder l'ID original (ch-001) et non l'ID MongoDB
        if "id" not in chapter or not chapter["id"]:
            chapter["id"] = str(chapter.get("_id"))
        if "_id" in chapter:
            del chapter["_id"]
        filtered_chapters.append(chapter)
        print(f"   ✅ Accepté: {chapter.get('title')}")
    
    print(f"\n   Résultat: {len(filtered_chapters)} chapitres après filtrage")
    
    # 4. Filtrer les sections
    print("\n4️⃣  Filtrage des sections...")
    filtered_sections = []
    skipped = 0
    for section in sections:
        # Filtrer selon les rôles
        if section.get("target_roles") and user_role not in section["target_roles"]:
            skipped += 1
            continue
        
        # Garder l'ID original (sec-001-01) et non l'ID MongoDB
        if "id" not in section or not section["id"]:
            section["id"] = str(section.get("_id"))
        if "_id" in section:
            del section["_id"]
        filtered_sections.append(section)
    
    print(f"   Filtrées: {skipped}")
    print(f"   Acceptées: {len(filtered_sections)}")
    
    # 5. Filtrer les chapitres qui n'ont plus de sections après filtrage
    print("\n5️⃣  Vérification des chapitres avec sections...")
    section_ids = {s["id"] for s in filtered_sections}
    final_chapters = []
    
    for chapter in filtered_chapters:
        # Vérifier si le chapitre a au moins une section visible
        chapter_sections = chapter.get("sections", [])
        chapter_has_sections = any(
            sec_id in section_ids 
            for sec_id in chapter_sections
        )
        
        if chapter_has_sections:
            visible_count = len([s for s in chapter_sections if s in section_ids])
            print(f"   ✅ {chapter.get('title')}: {visible_count} section(s)")
            final_chapters.append(chapter)
        else:
            print(f"   ❌ {chapter.get('title')}: aucune section visible")
    
    # 6. Résultat final
    print("\n" + "=" * 80)
    print("📊 RÉSULTAT FINAL")
    print("=" * 80)
    print(f"  Version: {current_version.get('version')}")
    print(f"  Chapitres: {len(final_chapters)}")
    print(f"  Sections: {len(filtered_sections)}")
    
    if len(final_chapters) > 0:
        print("\n📖 Liste des chapitres:")
        for ch in final_chapters:
            print(f"  [{ch.get('order', '?')}] {ch.get('title')}")
    else:
        print("\n❌ AUCUN CHAPITRE DANS LE RÉSULTAT FINAL!")
    
    print("\n" + "=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_manual_logic())
