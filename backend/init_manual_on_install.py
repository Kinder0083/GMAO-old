#!/usr/bin/env python3
"""
Script d'initialisation du manuel utilisateur - À APPELER LORS DE L'INSTALLATION
Ce script crée le manuel complet avec 14 chapitres et sections essentielles
IMPORTANT: Toutes les sections ont target_roles=[] pour être visibles par tous
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gmao_iris')

async def initialize_manual():
    """Initialise le manuel complet lors de l'installation"""
    
    print("=" * 70)
    print("📚 INITIALISATION DU MANUEL UTILISATEUR")
    print("=" * 70)
    print()
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Vérifier si le manuel existe déjà
        existing = await db.manual_chapters.count_documents({})
        if existing > 0:
            print(f"ℹ️  Manuel déjà présent ({existing} chapitres)")
            print("   Utilisation du manuel existant...")
            client.close()
            return True
        
        print("📥 Création du manuel complet...")
        print()
        
        # 1. Créer la version
        version = {
            "version": "1.1.0",
            "release_date": datetime.now(timezone.utc).isoformat(),
            "description": "Manuel utilisateur GMAO Iris - Version initiale",
            "author_id": "system",
            "author_name": "Système GMAO Iris",
            "is_current": True
        }
        await db.manual_versions.insert_one(version)
        print("✅ Version créée (v1.1.0)")
        
        # 2. Créer les 14 chapitres
        chapters = [
            {"id": "ch-001", "title": "🚀 Guide de Démarrage", "order": 1, "icon": "🚀", "description": "Premiers pas avec GMAO Iris"},
            {"id": "ch-002", "title": "👥 Gestion des Utilisateurs", "order": 2, "icon": "👥", "description": "Créer et gérer les utilisateurs"},
            {"id": "ch-003", "title": "🏭 Gestion des Équipements", "order": 3, "icon": "🏭", "description": "Inventaire des équipements"},
            {"id": "ch-004", "title": "🛠️ Demandes d'Intervention", "order": 4, "icon": "🛠️", "description": "Créer et suivre les demandes"},
            {"id": "ch-005", "title": "📋 Ordres de Travail", "order": 5, "icon": "📋", "description": "Gérer les ordres de travail"},
            {"id": "ch-006", "title": "🔄 Maintenance Préventive", "order": 6, "icon": "🔄", "description": "Planifier la maintenance préventive"},
            {"id": "ch-007", "title": "📦 Gestion des Stocks", "order": 7, "icon": "📦", "description": "Gérer les pièces et inventaire"},
            {"id": "ch-008", "title": "📊 Rapports et Analyses", "order": 8, "icon": "📊", "description": "Générer des rapports"},
            {"id": "ch-009", "title": "💬 Chat Live et Collaboration", "order": 9, "icon": "💬", "description": "Communication d'équipe"},
            {"id": "ch-010", "title": "📡 Capteurs MQTT et IoT", "order": 10, "icon": "📡", "description": "Monitoring IoT en temps réel"},
            {"id": "ch-011", "title": "📝 Demandes d'Achat", "order": 11, "icon": "📝", "description": "Gérer les achats"},
            {"id": "ch-012", "title": "💡 Demandes d'Amélioration", "order": 12, "icon": "💡", "description": "Proposer des améliorations"},
            {"id": "ch-013", "title": "⚙️ Configuration et Personnalisation", "order": 13, "icon": "⚙️", "description": "Personnaliser l'interface"},
            {"id": "ch-014", "title": "🔧 Dépannage et FAQ", "order": 14, "icon": "🔧", "description": "Questions fréquentes"}
        ]
        
        for ch in chapters:
            ch.update({
                "target_roles": [],  # VISIBLE PAR TOUS
                "target_modules": [],
                "sections": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        await db.manual_chapters.insert_many(chapters)
        print(f"✅ {len(chapters)} chapitres créés")
        
        # 3. Créer les sections essentielles (target_roles = [] pour TOUS)
        sections = [
            # Chapitre 1 - Guide de Démarrage
            {
                "id": "sec-001-01", "chapter_id": "ch-001", "order": 1,
                "title": "Bienvenue dans GMAO Iris",
                "content": """GMAO Iris est votre solution complète de gestion de maintenance assistée par ordinateur.

📌 **Qu'est-ce qu'une GMAO ?**

Une GMAO permet de gérer l'ensemble des activités de maintenance d'une entreprise :
• Planification des interventions
• Suivi des équipements
• Gestion des stocks de pièces
• Traçabilité des actions
• Analyse des performances

🎯 **Objectifs de GMAO Iris :**
1. Optimiser la maintenance préventive et curative
2. Réduire les temps d'arrêt des équipements
3. Suivre l'historique complet de vos installations
4. Analyser les performances avec des rapports détaillés
5. Collaborer efficacement entre les équipes""",
                "level": "beginner", "target_roles": [], "keywords": ["bienvenue", "introduction"]
            },
            {
                "id": "sec-001-02", "chapter_id": "ch-001", "order": 2,
                "title": "Connexion et Navigation",
                "content": """### Se Connecter
1. Ouvrez votre navigateur
2. Accédez à l'URL de GMAO Iris
3. Entrez votre email et mot de passe
4. Cliquez sur "Se connecter"

### Interface Principale
- **Menu latéral** : Accès aux différents modules
- **Tableau de bord** : Vue d'ensemble
- **Barre supérieure** : Notifications et paramètres
- **Bouton Manuel** : Cette documentation""",
                "level": "beginner", "target_roles": [], "keywords": ["connexion", "navigation"]
            },
            
            # Chapitre 2 - Utilisateurs
            {
                "id": "sec-002-01", "chapter_id": "ch-002", "order": 1,
                "title": "Création d'Utilisateurs",
                "content": """### Ajouter un Nouvel Utilisateur
1. Module **Personnel**
2. Cliquez sur **+ Ajouter**
3. Remplissez : Nom, Email, Rôle, Service
4. **Créer**

L'utilisateur recevra un email avec ses identifiants.""",
                "level": "intermediate", "target_roles": [], "keywords": ["utilisateur", "création"]
            },
            {
                "id": "sec-002-02", "chapter_id": "ch-002", "order": 2,
                "title": "Gestion des Rôles",
                "content": """### Rôles Disponibles
- **ADMIN** : Accès complet
- **MANAGER** : Gestion d'équipe
- **TECHNICIEN** : Exécution interventions
- **DEMANDEUR** : Création de demandes""",
                "level": "intermediate", "target_roles": [], "keywords": ["rôles", "permissions"]
            },
            
            # Chapitre 3 - Équipements
            {
                "id": "sec-003-01", "chapter_id": "ch-003", "order": 1,
                "title": "Ajout d'un Équipement",
                "content": """### Créer un Nouvel Équipement
1. Module **Équipements**
2. **+ Nouvel Équipement**
3. Renseignez : Nom, Code, Type, Localisation
4. Ajoutez photos et documents
5. **Enregistrer**""",
                "level": "intermediate", "target_roles": [], "keywords": ["équipement", "asset"]
            },
            
            # Chapitre 4 - Demandes
            {
                "id": "sec-004-01", "chapter_id": "ch-004", "order": 1,
                "title": "Créer une Demande d'Intervention",
                "content": """### Soumettre une Demande
1. **+ Nouvelle Demande**
2. Sélectionnez l'équipement
3. Décrivez le problème
4. Définissez l'urgence
5. **Soumettre**""",
                "level": "beginner", "target_roles": [], "keywords": ["demande", "intervention"]
            },
            
            # Chapitre 5 - Ordres de Travail
            {
                "id": "sec-005-01", "chapter_id": "ch-005", "order": 1,
                "title": "Traiter un Ordre de Travail",
                "content": """### Workflow
1. **Réception** : Ordre assigné
2. **Démarrage** : Cliquer "Commencer"
3. **Exécution** : Renseigner actions
4. **Clôture** : Marquer terminé""",
                "level": "intermediate", "target_roles": [], "keywords": ["ordre", "travail"]
            },
            
            # Chapitre 6 - Préventive
            {
                "id": "sec-006-01", "chapter_id": "ch-006", "order": 1,
                "title": "Planifier une Maintenance Préventive",
                "content": """### Créer un Plan
1. Module **Maintenance Préventive**
2. **+ Nouveau Plan**
3. Sélectionnez l'équipement
4. Définissez la récurrence
5. **Activer le plan**""",
                "level": "intermediate", "target_roles": [], "keywords": ["préventive", "planification"]
            },
            
            # Chapitre 7 - Stocks
            {
                "id": "sec-007-01", "chapter_id": "ch-007", "order": 1,
                "title": "Gestion du Stock",
                "content": """### Ajouter une Pièce
1. Module **Inventaire**
2. **+ Nouvelle Pièce**
3. Référence, Quantité, Prix
4. **Enregistrer**

Le système alerte automatiquement en cas de stock minimum.""",
                "level": "intermediate", "target_roles": [], "keywords": ["stock", "inventaire"]
            },
            
            # Chapitre 8 - Rapports
            {
                "id": "sec-008-01", "chapter_id": "ch-008", "order": 1,
                "title": "Générer des Rapports",
                "content": """### Types de Rapports
1. **Activité** : Interventions par période
2. **Équipements** : Historique maintenance
3. **Stock** : Mouvements de pièces

Export : PDF, Excel, Email automatique""",
                "level": "intermediate", "target_roles": [], "keywords": ["rapport", "analyse"]
            },
            
            # Chapitre 9 - Chat
            {
                "id": "sec-009-01", "chapter_id": "ch-009", "order": 1,
                "title": "Utiliser le Chat Live",
                "content": """### Communication en Temps Réel
1. Icône **💬 Chat**
2. Envoyez messages et fichiers
3. Conversations de groupe
4. Historique complet

Nettoyage automatique après 60 jours.""",
                "level": "beginner", "target_roles": [], "keywords": ["chat", "communication"]
            },
            
            # Chapitre 10 - MQTT
            {
                "id": "sec-010-01", "chapter_id": "ch-010", "order": 1,
                "title": "Configuration MQTT",
                "content": """### Ajouter un Capteur IoT
1. Module **Capteurs MQTT**
2. **+ Nouveau Capteur**
3. Nom, Topic MQTT, Type, Seuils
4. **Activer**

Dashboard temps réel avec graphiques.""",
                "level": "advanced", "target_roles": [], "keywords": ["mqtt", "iot", "capteurs"]
            },
            
            # Chapitre 11 - Achats
            {
                "id": "sec-011-01", "chapter_id": "ch-011", "order": 1,
                "title": "Demande d'Achat",
                "content": """### Créer une Demande
1. Module **Demandes d'Achat**
2. **+ Nouvelle Demande**
3. Articles, Quantités, Budget
4. **Soumettre pour approbation**

Circuit : Manager → Achats → Commande""",
                "level": "intermediate", "target_roles": [], "keywords": ["achat", "commande"]
            },
            
            # Chapitre 12 - Améliorations
            {
                "id": "sec-012-01", "chapter_id": "ch-012", "order": 1,
                "title": "Proposer une Amélioration",
                "content": """### Soumettre une Idée
1. Module **Améliorations**
2. **+ Nouvelle Proposition**
3. Décrivez le problème et la solution
4. **Soumettre**

Suivi : Validation → Priorisation → Mise en œuvre""",
                "level": "beginner", "target_roles": [], "keywords": ["amélioration", "innovation"]
            },
            
            # Chapitre 13 - Config
            {
                "id": "sec-013-01", "chapter_id": "ch-013", "order": 1,
                "title": "Personnaliser l'Interface",
                "content": """### Options
1. **Menu** : Réorganisez les modules
2. **Dashboard** : Ajoutez/supprimez widgets
3. **Notifications** : Configurez préférences

Profil → **⚙️ Personnalisation**""",
                "level": "beginner", "target_roles": [], "keywords": ["personnalisation", "config"]
            },
            
            # Chapitre 14 - FAQ
            {
                "id": "sec-014-01", "chapter_id": "ch-014", "order": 1,
                "title": "Questions Fréquentes",
                "content": """### FAQ

**Q: Mot de passe oublié ?**
R: "Mot de passe oublié" sur page connexion.

**Q: Comment signaler un bug ?**
R: Bouton "Aide" → Screenshot automatique.

**Q: Accès mobile ?**
R: Oui, interface responsive.

**Q: Sauvegardes ?**
R: Automatiques quotidiennes.""",
                "level": "beginner", "target_roles": [], "keywords": ["faq", "aide", "support"]
            }
        ]
        
        # Ajouter métadonnées à toutes les sections
        for sec in sections:
            sec.update({
                "target_modules": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        await db.manual_sections.insert_many(sections)
        print(f"✅ {len(sections)} sections créées")
        
        # 4. Mettre à jour les références des chapitres
        for chapter in chapters:
            chapter_sections = [s["id"] for s in sections if s["chapter_id"] == chapter["id"]]
            await db.manual_chapters.update_one(
                {"id": chapter["id"]},
                {"$set": {"sections": chapter_sections}}
            )
        
        print("✅ Références mises à jour")
        
        # 5. Vérification finale
        print()
        print("🔍 Vérification...")
        
        chapters_count = await db.manual_chapters.count_documents({})
        sections_count = await db.manual_sections.count_documents({})
        
        print(f"   📚 Chapitres: {chapters_count}")
        print(f"   📄 Sections: {sections_count}")
        
        print()
        print("=" * 70)
        print("✅ MANUEL INITIALISÉ AVEC SUCCÈS !")
        print("=" * 70)
        print()
        print(f"Le manuel contient {chapters_count} chapitres et {sections_count} sections.")
        print("Toutes les sections sont visibles par tous les utilisateurs.")
        print()
        
        return True
        
    except Exception as e:
        print()
        print("=" * 70)
        print("❌ ERREUR LORS DE L'INITIALISATION")
        print("=" * 70)
        print(f"Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        client.close()

if __name__ == "__main__":
    print()
    result = asyncio.run(initialize_manual())
    print()
    
    sys.exit(0 if result else 1)
