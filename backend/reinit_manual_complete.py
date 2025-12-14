#!/usr/bin/env python3
"""
Script pour RÉINITIALISER complètement le manuel utilisateur
Supprime tout et recrée les 14 chapitres + 65 sections
"""
import asyncio
import sys
import os

# Ajouter le chemin du backend au PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Connexion MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gmao_iris')

async def reinitialize_manual():
    """Réinitialise complètement le manuel"""
    
    print("=" * 60)
    print("🔄 RÉINITIALISATION COMPLÈTE DU MANUEL")
    print("=" * 60)
    print()
    
    # Connexion
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # 1. Supprimer toutes les données existantes
        print("🗑️  Suppression des données existantes...")
        
        deleted_chapters = await db.manual_chapters.delete_many({})
        print(f"   ✅ {deleted_chapters.deleted_count} chapitres supprimés")
        
        deleted_sections = await db.manual_sections.delete_many({})
        print(f"   ✅ {deleted_sections.deleted_count} sections supprimées")
        
        deleted_versions = await db.manual_versions.delete_many({})
        print(f"   ✅ {deleted_versions.deleted_count} versions supprimées")
        
        print()
        
        # 2. Importer le script complet
        print("📥 Importation du manuel complet...")
        from generate_complete_manual import generate_complete_manual
        
        # 3. Générer le nouveau manuel
        await generate_complete_manual()
        
        # 4. Vérification
        print()
        print("🔍 Vérification de la réinitialisation...")
        
        chapters_count = await db.manual_chapters.count_documents({})
        sections_count = await db.manual_sections.count_documents({})
        versions_count = await db.manual_versions.count_documents({})
        
        print(f"   📚 Chapitres: {chapters_count}")
        print(f"   📄 Sections: {sections_count}")
        print(f"   🏷️  Versions: {versions_count}")
        
        print()
        
        if chapters_count >= 14 and sections_count >= 60:
            print("=" * 60)
            print("✅ RÉINITIALISATION RÉUSSIE !")
            print("=" * 60)
            print()
            print("Le manuel contient maintenant :")
            print(f"  • {chapters_count} chapitres")
            print(f"  • {sections_count} sections")
            print()
            print("Vous pouvez maintenant accéder au manuel complet depuis l'interface.")
            return True
        else:
            print("=" * 60)
            print("⚠️  RÉINITIALISATION INCOMPLÈTE")
            print("=" * 60)
            print(f"Attendu: 14 chapitres, Obtenu: {chapters_count}")
            print(f"Attendu: 65+ sections, Obtenu: {sections_count}")
            return False
            
    except Exception as e:
        print()
        print("=" * 60)
        print("❌ ERREUR LORS DE LA RÉINITIALISATION")
        print("=" * 60)
        print(f"Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        client.close()

if __name__ == "__main__":
    print()
    result = asyncio.run(reinitialize_manual())
    print()
    
    if result:
        sys.exit(0)
    else:
        sys.exit(1)
