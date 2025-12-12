#!/usr/bin/env python3
"""
Script pour ajouter des captures d'écran au manuel utilisateur GMAO Iris
Puisque nous avons des images de démonstration dans les screenshots capturés,
nous allons créer un mappage entre les sections du manuel et des descriptions d'images
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

# Mapping des sections avec leurs images (placeholder URLs pour le moment)
# Format: section_id -> texte avec balise <img>
SECTION_IMAGES = {
    # Guide de démarrage
    "sec-001-02": {
        "title": "Connexion et Navigation",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/01-connexion.png" alt="Page de connexion GMAO Iris" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Page de connexion de GMAO Iris</p>\n</div>'
    },
    
    # Dashboard
    "sec-010-01": {
        "title": "Tableau de Bord Principal",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/02-dashboard.png" alt="Tableau de bord principal" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Vue d\'ensemble du tableau de bord avec les indicateurs clés</p>\n</div>'
    },
    
    # Inventaire
    "sec-006-01": {
        "title": "Ajouter un Article au Stock",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/03-inventaire.png" alt="Module inventaire" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Interface de gestion de l\'inventaire</p>\n</div>'
    },
    
    # Demandes d'achat
    "sec-013-01": {
        "title": "Vue d'ensemble",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/04-demandes-achat.png" alt="Module demandes d\'achat" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Liste des demandes d\'achat avec leurs statuts</p>\n</div>'
    },
    
    # IoT/MQTT
    "ch-mqtt-001-sec-005": {
        "title": "Dashboard IoT - Vue d'Ensemble",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/05-iot-dashboard.png" alt="Dashboard IoT" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Dashboard IoT/MQTT pour la surveillance des capteurs</p>\n</div>'
    },
    
    # Chat Live
    "sec-001-04": {
        "title": "Raccourcis et Astuces",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/06-chat-live.png" alt="Chat en direct" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Interface de chat en temps réel entre utilisateurs</p>\n</div>'
    },
    
    # Équipements
    "sec-004-01": {
        "title": "Ajouter un Équipement",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/07-equipements.png" alt="Gestion des équipements" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Vue de la liste des équipements</p>\n</div>'
    },
    
    # Personnes/Utilisateurs
    "sec-002-01": {
        "title": "Créer un Utilisateur",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/08-personnes.png" alt="Gestion des utilisateurs" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Interface de gestion des équipes et utilisateurs</p>\n</div>'
    },
    
    # Zones
    "sec-011-02": {
        "title": "Organiser les Zones et Localisations",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/09-zones.png" alt="Gestion des zones" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Organisation des zones et sous-zones</p>\n</div>'
    },
    
    # Paramètres
    "sec-011-07": {
        "title": "Paramètres Système",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/11-parametres.png" alt="Paramètres utilisateur" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Page de configuration des paramètres</p>\n</div>'
    },
    
    # Manuel utilisateur (méta!)
    "sec-012-04": {
        "title": "Utiliser le Bouton Aide",
        "image_html": '\n\n<div style="text-align: center; margin: 20px 0;">\n<img src="/images/manual/12-manuel-utilisateur.png" alt="Manuel utilisateur" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Le manuel utilisateur intégré à l\'application</p>\n</div>'
    },
}

async def add_screenshots_to_manual():
    """Ajoute les screenshots aux sections du manuel"""
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client['gmao_iris']
    
    print("📸 Ajout des captures d'écran au manuel utilisateur...")
    print(f"   Nombre de sections à mettre à jour: {len(SECTION_IMAGES)}\n")
    
    updated_count = 0
    not_found_count = 0
    
    for section_id, data in SECTION_IMAGES.items():
        # Récupérer la section
        section = await db.manual_sections.find_one({"id": section_id}, {"_id": 0})
        
        if not section:
            print(f"⚠️  Section {section_id} non trouvée")
            not_found_count += 1
            continue
        
        # Vérifier si l'image est déjà présente
        if data["image_html"] in section.get("content", ""):
            print(f"⏭️  Section '{data['title']}' ({section_id}) - Image déjà présente")
            continue
        
        # Ajouter l'image à la fin du contenu
        current_content = section.get("content", "")
        new_content = current_content + data["image_html"]
        
        # Mettre à jour la section
        result = await db.manual_sections.update_one(
            {"id": section_id},
            {"$set": {"content": new_content}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Section '{data['title']}' ({section_id}) - Image ajoutée")
            updated_count += 1
        else:
            print(f"⚠️  Section '{data['title']}' ({section_id}) - Échec de mise à jour")
    
    print(f"\n{'='*60}")
    print(f"✅ Mise à jour terminée!")
    print(f"   - Sections mises à jour: {updated_count}")
    print(f"   - Sections non trouvées: {not_found_count}")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_screenshots_to_manual())
