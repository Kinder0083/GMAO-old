#!/usr/bin/env python3
"""
Script AUTONOME pour réinitialiser complètement le manuel
Ne dépend d'aucun autre fichier
"""
import asyncio
import sys
import os
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
        print("📥 Création du nouveau manuel...")
        
        # 2. Créer la version
        version = {
            "version": "1.1.0",
            "release_date": datetime.now(timezone.utc).isoformat(),
            "description": "Manuel complet GMAO Iris - Réinitialisé",
            "author_id": "system",
            "author_name": "Système GMAO Iris",
            "is_current": True
        }
        await db.manual_versions.insert_one(version)
        print("   ✅ Version créée")
        
        # 3. Créer les 14 chapitres
        chapters = [
            {"id": "ch-001", "title": "🚀 Guide de Démarrage", "order": 1, "icon": "🚀"},
            {"id": "ch-002", "title": "👥 Gestion des Utilisateurs", "order": 2, "icon": "👥"},
            {"id": "ch-003", "title": "🏭 Gestion des Équipements", "order": 3, "icon": "🏭"},
            {"id": "ch-004", "title": "🛠️ Demandes d'Intervention", "order": 4, "icon": "🛠️"},
            {"id": "ch-005", "title": "📋 Ordres de Travail", "order": 5, "icon": "📋"},
            {"id": "ch-006", "title": "🔄 Maintenance Préventive", "order": 6, "icon": "🔄"},
            {"id": "ch-007", "title": "📦 Gestion des Stocks", "order": 7, "icon": "📦"},
            {"id": "ch-008", "title": "📊 Rapports et Analyses", "order": 8, "icon": "📊"},
            {"id": "ch-009", "title": "💬 Chat Live et Collaboration", "order": 9, "icon": "💬"},
            {"id": "ch-010", "title": "📡 Capteurs MQTT et IoT", "order": 10, "icon": "📡"},
            {"id": "ch-011", "title": "📝 Demandes d'Achat", "order": 11, "icon": "📝"},
            {"id": "ch-012", "title": "💡 Demandes d'Amélioration", "order": 12, "icon": "💡"},
            {"id": "ch-013", "title": "⚙️ Configuration et Personnalisation", "order": 13, "icon": "⚙️"},
            {"id": "ch-014", "title": "🔧 Dépannage et FAQ", "order": 14, "icon": "🔧"}
        ]
        
        for ch in chapters:
            ch.update({
                "description": f"Documentation complète sur {ch['title']}",
                "target_roles": [],
                "target_modules": [],
                "sections": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        await db.manual_chapters.insert_many(chapters)
        print(f"   ✅ {len(chapters)} chapitres créés")
        
        # 4. Créer les sections essentielles
        sections = [
            # Chapitre 1
            {
                "id": "sec-001-01",
                "chapter_id": "ch-001",
                "title": "Bienvenue dans GMAO Iris",
                "content": """GMAO Iris est votre solution complète de gestion de maintenance assistée par ordinateur.

📌 **Qu'est-ce qu'une GMAO ?**

Une GMAO (Gestion de Maintenance Assistée par Ordinateur) est un logiciel qui permet de gérer l'ensemble des activités de maintenance d'une entreprise.

🎯 **Objectifs de GMAO Iris :**

1. **Optimiser** la maintenance préventive et curative
2. **Réduire** les temps d'arrêt des équipements  
3. **Suivre** l'historique complet de vos installations
4. **Analyser** les performances avec des rapports détaillés
5. **Collaborer** efficacement entre les équipes""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["bienvenue", "introduction", "gmao"]
            },
            {
                "id": "sec-001-02",
                "chapter_id": "ch-001",
                "title": "Connexion et Navigation",
                "content": """### Se Connecter

1. Ouvrez votre navigateur
2. Accédez à l'URL de GMAO Iris
3. Entrez votre email et mot de passe
4. Cliquez sur "Se connecter"

### Interface Principale

- **Menu latéral** : Accès aux différents modules
- **Tableau de bord** : Vue d'ensemble de l'activité
- **Barre supérieure** : Notifications et paramètres
- **Bouton Manuel** : Accès à cette documentation""",
                "order": 2,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["connexion", "navigation", "interface"]
            },
            # Chapitre 2
            {
                "id": "sec-002-01",
                "chapter_id": "ch-002",
                "title": "Création d'Utilisateurs",
                "content": """### Ajouter un Nouvel Utilisateur

1. Accédez au module **Personnel**
2. Cliquez sur **+ Ajouter**
3. Remplissez le formulaire :
   - Nom et prénom
   - Email professionnel
   - Rôle (ADMIN, TECHNICIEN, MANAGER, etc.)
   - Service d'affectation
4. Cliquez sur **Créer**

L'utilisateur recevra un email avec ses identifiants.""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["ADMIN"],
                "keywords": ["utilisateur", "création", "personnel"]
            },
            {
                "id": "sec-002-02",
                "chapter_id": "ch-002",
                "title": "Gestion des Rôles et Permissions",
                "content": """### Rôles Disponibles

- **ADMIN** : Accès complet à toutes les fonctionnalités
- **MANAGER** : Gestion d'équipe et validation
- **TECHNICIEN** : Exécution des interventions
- **DEMANDEUR** : Création de demandes uniquement

### Modifier les Permissions

1. Accédez au profil de l'utilisateur
2. Section **Permissions**
3. Cochez/décochez les modules accessibles
4. Enregistrez les modifications""",
                "order": 2,
                "level": "intermediate",
                "target_roles": ["ADMIN"],
                "keywords": ["rôles", "permissions", "sécurité"]
            },
            # Chapitre 3
            {
                "id": "sec-003-01",
                "chapter_id": "ch-003",
                "title": "Ajout d'un Équipement",
                "content": """### Créer un Nouvel Équipement

1. Module **Équipements**
2. Bouton **+ Nouvel Équipement**
3. Renseignez :
   - Nom et code unique
   - Type et catégorie
   - Localisation
   - Date de mise en service
   - Caractéristiques techniques
4. Joignez photos et documents
5. **Enregistrer**""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["ADMIN", "MANAGER"],
                "keywords": ["équipement", "asset", "matériel"]
            },
            # Chapitre 4
            {
                "id": "sec-004-01",
                "chapter_id": "ch-004",
                "title": "Créer une Demande d'Intervention",
                "content": """### Soumettre une Demande

1. Cliquez sur **+ Nouvelle Demande**
2. Sélectionnez l'équipement concerné
3. Décrivez le problème
4. Définissez l'urgence (Faible, Moyenne, Haute, Critique)
5. Ajoutez des photos si nécessaire
6. **Soumettre**

La demande sera automatiquement assignée selon les règles configurées.""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["demande", "intervention", "ticket"]
            },
            # Chapitre 5
            {
                "id": "sec-005-01",
                "chapter_id": "ch-005",
                "title": "Traiter un Ordre de Travail",
                "content": """### Workflow Complet

1. **Réception** : Ordre assigné au technicien
2. **Démarrage** : Cliquer sur "Commencer"
3. **Exécution** : Renseigner les actions effectuées
4. **Pièces** : Ajouter les pièces utilisées
5. **Clôture** : Marquer comme terminé
6. **Validation** : Le manager valide

Le demandeur est notifié automatiquement.""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["TECHNICIEN", "MANAGER"],
                "keywords": ["ordre", "travail", "workflow"]
            },
            # Chapitre 6
            {
                "id": "sec-006-01",
                "chapter_id": "ch-006",
                "title": "Planifier une Maintenance Préventive",
                "content": """### Créer un Plan de Maintenance

1. Module **Maintenance Préventive**
2. **+ Nouveau Plan**
3. Sélectionnez l'équipement
4. Définissez la récurrence :
   - Basée sur le temps (jours, mois)
   - Basée sur l'usage (heures, cycles)
5. Décrivez les tâches à effectuer
6. Assignez un technicien
7. **Activer le plan**

Le système créera automatiquement les ordres selon la planification.""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["MANAGER", "ADMIN"],
                "keywords": ["préventive", "planification", "récurrence"]
            },
            # Chapitre 7
            {
                "id": "sec-007-01",
                "chapter_id": "ch-007",
                "title": "Gestion du Stock de Pièces",
                "content": """### Ajouter une Pièce au Stock

1. Module **Inventaire**
2. **+ Nouvelle Pièce**
3. Informations :
   - Référence et désignation
   - Quantité en stock
   - Stock minimum/maximum
   - Prix unitaire
   - Fournisseur
4. **Enregistrer**

### Alertes de Stock

Le système vous alertera automatiquement quand :
- Stock minimum atteint
- Pièce obsolète
- Rupture de stock""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["ADMIN", "MANAGER"],
                "keywords": ["stock", "inventaire", "pièces"]
            },
            # Chapitre 8
            {
                "id": "sec-008-01",
                "chapter_id": "ch-008",
                "title": "Générer des Rapports",
                "content": """### Types de Rapports Disponibles

1. **Rapports d'Activité**
   - Interventions par période
   - Performance par technicien
   - Taux de résolution

2. **Rapports Équipements**
   - Historique de maintenance
   - Temps d'arrêt (MTTR)
   - Coûts de maintenance

3. **Rapports Stock**
   - Mouvements de pièces
   - Consommation par équipement
   - Valorisation du stock

### Exporter un Rapport

- Format PDF pour impression
- Format Excel pour analyse
- Envoi automatique par email""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["MANAGER", "ADMIN"],
                "keywords": ["rapport", "analyse", "statistiques"]
            },
            # Chapitre 9
            {
                "id": "sec-009-01",
                "chapter_id": "ch-009",
                "title": "Utiliser le Chat Live",
                "content": """### Communication en Temps Réel

1. Cliquez sur l'icône **💬 Chat**
2. Envoyez des messages à votre équipe
3. Partagez des fichiers et images
4. Créez des conversations de groupe
5. Recevez des notifications instantanées

### Fonctionnalités

- Messages texte
- Pièces jointes (photos, PDF, etc.)
- Historique complet
- Recherche dans les conversations
- Nettoyage automatique après 60 jours""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["chat", "communication", "collaboration"]
            },
            # Chapitre 10
            {
                "id": "sec-010-01",
                "chapter_id": "ch-010",
                "title": "Configuration des Capteurs MQTT",
                "content": """### Ajouter un Capteur IoT

1. Module **Capteurs MQTT**
2. **+ Nouveau Capteur**
3. Configuration :
   - Nom du capteur
   - Topic MQTT à surveiller
   - Type de données (température, humidité, etc.)
   - Seuils d'alerte (min/max)
   - Localisation
4. **Activer**

### Dashboard IoT

Visualisez en temps réel :
- Valeurs actuelles de tous les capteurs
- Graphiques d'évolution
- Alertes actives
- Groupement par type ou localisation""",
                "order": 1,
                "level": "advanced",
                "target_roles": ["ADMIN", "MANAGER"],
                "keywords": ["mqtt", "iot", "capteurs", "monitoring"]
            },
            # Chapitre 11
            {
                "id": "sec-011-01",
                "chapter_id": "ch-011",
                "title": "Soumettre une Demande d'Achat",
                "content": """### Créer une Demande d'Achat

1. Module **Demandes d'Achat**
2. **+ Nouvelle Demande**
3. Remplissez :
   - Articles à commander
   - Quantités
   - Justification
   - Budget estimé
   - Fournisseur suggéré
4. **Soumettre pour approbation**

### Circuit de Validation

1. Manager valide le besoin
2. Service achats vérifie le budget
3. Commande passée auprès du fournisseur
4. Réception et mise en stock""",
                "order": 1,
                "level": "intermediate",
                "target_roles": ["TECHNICIEN", "MANAGER"],
                "keywords": ["achat", "commande", "approvisionnement"]
            },
            # Chapitre 12
            {
                "id": "sec-012-01",
                "chapter_id": "ch-012",
                "title": "Proposer une Amélioration",
                "content": """### Soumettre une Idée

1. Module **Améliorations**
2. **+ Nouvelle Proposition**
3. Décrivez :
   - Problème ou opportunité
   - Solution proposée
   - Bénéfices attendus
   - Impact estimé
4. **Soumettre**

### Suivi des Améliorations

- Statut de validation
- Priorisation par le comité
- Planification de mise en œuvre
- Mesure des résultats""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["amélioration", "suggestion", "innovation"]
            },
            # Chapitre 13
            {
                "id": "sec-013-01",
                "chapter_id": "ch-013",
                "title": "Personnaliser l'Interface",
                "content": """### Options de Personnalisation

1. **Menu** : Réorganisez les modules selon vos besoins
2. **Tableau de bord** : Ajoutez/supprimez des widgets
3. **Notifications** : Configurez vos préférences
4. **Thème** : Mode clair ou sombre (si disponible)

### Accès aux Paramètres

Cliquez sur votre profil → **⚙️ Personnalisation**""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["personnalisation", "configuration", "paramètres"]
            },
            # Chapitre 14
            {
                "id": "sec-014-01",
                "chapter_id": "ch-014",
                "title": "Questions Fréquentes (FAQ)",
                "content": """### Questions Courantes

**Q: J'ai oublié mon mot de passe, que faire ?**
R: Cliquez sur "Mot de passe oublié" sur la page de connexion.

**Q: Comment signaler un bug ?**
R: Utilisez le bouton "Aide" pour capturer un screenshot et décrire le problème.

**Q: Puis-je accéder à GMAO Iris sur mobile ?**
R: Oui, l'interface est responsive et fonctionne sur tous les appareils.

**Q: Les données sont-elles sauvegardées ?**
R: Oui, des sauvegardes automatiques sont effectuées quotidiennement.

**Q: Comment obtenir de l'aide supplémentaire ?**
R: Contactez votre administrateur système ou utilisez le chat live.""",
                "order": 1,
                "level": "beginner",
                "target_roles": [],
                "keywords": ["faq", "aide", "questions", "support"]
            }
        ]
        
        for sec in sections:
            sec.update({
                "target_modules": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        await db.manual_sections.insert_many(sections)
        print(f"   ✅ {len(sections)} sections créées")
        
        # 5. Mettre à jour les références des chapitres
        for chapter in chapters:
            chapter_sections = [s["id"] for s in sections if s["chapter_id"] == chapter["id"]]
            await db.manual_chapters.update_one(
                {"id": chapter["id"]},
                {"$set": {"sections": chapter_sections}}
            )
        
        print("   ✅ Références mises à jour")
        
        # 6. Vérification finale
        print()
        print("🔍 Vérification finale...")
        
        chapters_count = await db.manual_chapters.count_documents({})
        sections_count = await db.manual_sections.count_documents({})
        versions_count = await db.manual_versions.count_documents({})
        
        print(f"   📚 Chapitres: {chapters_count}")
        print(f"   📄 Sections: {sections_count}")
        print(f"   🏷️  Versions: {versions_count}")
        
        print()
        
        if chapters_count >= 14 and sections_count >= 14:
            print("=" * 60)
            print("✅ RÉINITIALISATION RÉUSSIE !")
            print("=" * 60)
            print()
            print("Le manuel contient maintenant :")
            print(f"  • {chapters_count} chapitres")
            print(f"  • {sections_count} sections")
            print()
            print("✨ Vous pouvez maintenant accéder au manuel complet !")
            print("   Rafraîchissez votre navigateur et cliquez sur 'Manuel'")
            return True
        else:
            print("=" * 60)
            print("⚠️  RÉINITIALISATION INCOMPLÈTE")
            print("=" * 60)
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
    
    sys.exit(0 if result else 1)
