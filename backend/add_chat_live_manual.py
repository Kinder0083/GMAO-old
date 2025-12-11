#!/usr/bin/env python3
"""
Script pour ajouter le chapitre Chat Live dans le manuel utilisateur
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# Configuration MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'gmao_iris'

async def add_chat_live_manual():
    """Ajouter le chapitre et les sections Chat Live au manuel"""
    try:
        # Connexion MongoDB
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print("📚 Ajout du chapitre Chat Live dans le manuel...")
        
        # Nouveau chapitre Chat Live
        chat_chapter = {
            "id": "ch-012",
            "title": "💬 Chat Live",
            "description": "Communication en temps réel avec l'équipe",
            "icon": "MessageCircle",
            "order": 12,
            "sections": ["sec-012-01", "sec-012-02", "sec-012-03", "sec-012-04", "sec-012-05"],
            "target_roles": [],
            "target_modules": ["chatLive"]
        }
        
        # Sections du chapitre Chat Live
        chat_sections = [
            {
                "id": "sec-012-01",
                "chapter_id": "ch-012",
                "title": "📖 Introduction au Chat Live",
                "order": 1,
                "level": "beginner",
                "content": """Le Chat Live est un outil de communication en temps réel qui permet à tous les membres de l'équipe de communiquer instantanément.

🎯 Fonctionnalités principales :
• Messages instantanés en temps réel (WebSocket)
• Chat de groupe pour toute l'équipe
• Messages privés à un ou plusieurs utilisateurs
• Partage de fichiers (tous types, jusqu'à 15 MB)
• Capture photo directe depuis la caméra
• Réactions emoji sur les messages
• Réponses avec citation (style Viber)
• Suppression de messages
• Liste des utilisateurs en ligne
• Notifications en temps réel
• Rétention des données : 60 jours

💡 Cas d'usage :
• Coordination rapide entre techniciens
• Partage de photos d'interventions
• Questions/réponses rapides
• Transfert de documents vers les modules (OT, Améliorations, etc.)

🔐 Permissions :
Le module Chat Live respecte le système de permissions de l'application. Les administrateurs peuvent configurer qui peut voir, éditer ou supprimer dans les paramètres utilisateurs.""",
                "target_roles": [],
                "target_modules": ["chatLive"],
                "images": []
            },
            {
                "id": "sec-012-02",
                "chapter_id": "ch-012",
                "title": "✉️ Envoyer et Recevoir des Messages",
                "order": 2,
                "level": "beginner",
                "content": """📝 Envoyer un message de groupe :

1. Accédez au menu "💬 Chat Live"
2. Tapez votre message dans le champ en bas de l'écran
3. Appuyez sur Entrée ou cliquez sur le bouton d'envoi
4. Le message apparaît instantanément pour tous les utilisateurs

📨 Envoyer un message privé :

1. Cliquez sur le bouton "🔒 Message privé"
2. Sélectionnez un ou plusieurs destinataires dans la liste des utilisateurs en ligne
3. Les utilisateurs sélectionnés apparaissent avec un badge vert
4. Tapez votre message
5. Seuls les destinataires sélectionnés verront le message (icône cadenas visible)
6. Cliquez à nouveau sur "Message privé" pour revenir au mode groupe

📥 Recevoir des messages :

• Les nouveaux messages apparaissent automatiquement en temps réel
• Les messages non lus sont indiqués dans le header (icône enveloppe avec badge)
• Le badge affiche le nombre total de messages non lus
• Dès que vous ouvrez le Chat Live, tous les messages sont marqués comme lus

⏱️ Statut en temps réel :

• "Temps réel activé" : WebSocket connecté
• "Temps réel désactivé" : Mode REST API (actualisation toutes les 5 secondes)

💡 Astuce : Le mode WebSocket est automatique. Si la connexion échoue, l'application bascule automatiquement en mode REST.""",
                "target_roles": [],
                "target_modules": ["chatLive"],
                "images": []
            },
            {
                "id": "sec-012-03",
                "chapter_id": "ch-012",
                "title": "📎 Partager des Fichiers et Photos",
                "order": 3,
                "level": "beginner",
                "content": """📤 Joindre un fichier :

1. Cliquez sur l'icône trombone (📎) à côté du champ de message
2. Sélectionnez un ou plusieurs fichiers depuis votre ordinateur
3. Types acceptés : TOUS les types de fichiers
4. Taille maximum : 15 MB par fichier
5. Les fichiers sont uploadés automatiquement
6. Un aperçu apparaît avant l'envoi (images visibles directement)
7. Ajoutez un message optionnel pour accompagner les fichiers
8. Cliquez sur Envoyer

📸 Capturer une photo :

1. Cliquez sur l'icône caméra (📷)
2. Autorisez l'accès à votre caméra si demandé
3. Positionnez-vous face à la caméra
4. Cliquez sur "Capturer"
5. Prévisualisez la photo
6. Options :
   • "Reprendre" : prendre une nouvelle photo
   • "Envoyer" : envoyer la photo dans le chat
7. Ajoutez un message optionnel

📥 Télécharger un fichier :

1. Faites un clic droit sur le fichier attaché au message
2. Cliquez sur "📥 Télécharger"
3. Le fichier est téléchargé sur votre ordinateur

🔄 Transférer un fichier vers un module :

1. Faites un clic droit sur un fichier
2. Sélectionnez la destination :
   • "Transférer dans un OT" : vers un Ordre de Travail
   • "Transférer dans une Amélioration"
   • "Transférer dans une Maintenance Préventive"
   • "Transférer dans un Presqu'accident"
3. Choisissez l'élément de destination dans la liste
4. Le fichier est automatiquement copié dans le module sélectionné

💡 Astuce : Les fichiers transférés restent accessibles dans le Chat Live ET dans le module de destination.""",
                "target_roles": [],
                "target_modules": ["chatLive"],
                "images": []
            },
            {
                "id": "sec-012-04",
                "chapter_id": "ch-012",
                "title": "😊 Réactions et Réponses",
                "order": 4,
                "level": "beginner",
                "content": """😊 Réagir avec un emoji :

1. Faites un clic droit sur un message
2. Le menu contextuel s'affiche avec :
   • ↩️ Répondre
   • Réagir : (avec 6 emojis directement visibles)
3. Cliquez directement sur l'emoji souhaité :
   • 👍 J'aime
   • ❤️ Adore
   • 😂 Drôle
   • 😮 Surpris
   • 😢 Triste
   • 😡 Fâché
4. L'emoji apparaît immédiatement en bas à droite du message
5. Votre nom s'affiche au survol de l'emoji

🔄 Changer ou retirer son emoji :

• Cliquer sur un emoji différent → remplace votre emoji actuel
• Cliquer sur le même emoji → retire votre réaction
• Vous ne pouvez avoir qu'UN SEUL emoji par message
• Les autres utilisateurs voient vos réactions en temps réel

↩️ Répondre à un message (citation) :

1. Faites un clic droit sur le message à citer
2. Cliquez sur "↩️ Répondre"
3. Une prévisualisation du message cité apparaît au-dessus du champ de saisie
4. Elle affiche :
   • Le nom de l'auteur
   • Un extrait du message original
   • Un bouton ❌ pour annuler
5. Tapez votre réponse
6. Envoyez le message
7. Votre réponse s'affiche avec le message cité au-dessus

🔍 Naviguer vers le message original :

• Cliquez sur la citation dans une réponse
• La vue défile automatiquement vers le message original
• Le message original est surligné brièvement en jaune

💡 Astuce : La fonction Répondre est idéale pour maintenir le contexte dans une longue conversation.""",
                "target_roles": [],
                "target_modules": ["chatLive"],
                "images": []
            },
            {
                "id": "sec-012-05",
                "chapter_id": "ch-012",
                "title": "👥 Utilisateurs en Ligne et Gestion",
                "order": 5,
                "level": "beginner",
                "content": """👥 Liste des utilisateurs en ligne :

• Visible dans la sidebar droite du Chat Live
• Titre : "Utilisateurs en ligne (X)" avec le nombre d'utilisateurs connectés
• Chaque utilisateur affiche :
  • 🟢 Point vert : utilisateur en ligne
  • Nom complet
  • Rôle (ADMIN, TECHNICIEN, etc.)
  • "(Vous)" : indique votre propre compte (fond bleu)

🔒 Sélectionner des destinataires pour message privé :

1. Cliquez sur "Message privé"
2. Les utilisateurs deviennent sélectionnables
3. Cliquez sur un utilisateur pour le sélectionner (badge vert "Sélectionné")
4. Vous pouvez sélectionner plusieurs utilisateurs
5. Votre propre compte n'est pas sélectionnable
6. Envoyez votre message (icône cadenas visible)

🗑️ Supprimer un message :

Pour les utilisateurs normaux :
• Faites un clic droit sur VOTRE message
• Cliquez sur "🗑️ Supprimer"
• ⚠️ Vous avez seulement 10 secondes après l'envoi
• Après 10 secondes, l'option disparaît
• Le message est remplacé par "Ce message a été supprimé"

Pour les administrateurs :
• Faites un clic droit sur N'IMPORTE QUEL message
• Cliquez sur "🗑️ Supprimer"
• ✅ Aucune limite de temps
• Les admins peuvent supprimer tous les messages à tout moment

🔐 Permissions du module :

Les permissions se configurent dans :
Paramètres → Gestion des utilisateurs → Modifier un utilisateur → Onglet Permissions

• "💬 Chat Live" apparaît dans la liste des modules
• Visualisation : Voir les messages
• Édition : Envoyer des messages
• Suppression : Supprimer ses propres messages (10 sec) ou tous les messages (admins)

📊 Rétention des données :

• Messages et fichiers sont conservés pendant 60 jours
• Après 60 jours, ils sont automatiquement supprimés
• Un script de nettoyage s'exécute quotidiennement
• Les données supprimées ne peuvent pas être récupérées

💡 Conseil : Utilisez la fonction de transfert vers les modules pour conserver les informations importantes au-delà de 60 jours.""",
                "target_roles": [],
                "target_modules": ["chatLive"],
                "images": []
            }
        ]
        
        # Vérifier si le chapitre existe déjà
        existing_chapter = await db.manual_chapters.find_one({"id": "ch-012"})
        
        if existing_chapter:
            print("⚠️  Le chapitre Chat Live existe déjà. Mise à jour...")
            # Mettre à jour le chapitre
            await db.manual_chapters.update_one(
                {"id": "ch-012"},
                {"$set": chat_chapter}
            )
        else:
            print("➕ Ajout du nouveau chapitre Chat Live...")
            # Insérer le nouveau chapitre
            await db.manual_chapters.insert_one(chat_chapter)
        
        # Ajouter ou mettre à jour les sections
        for section in chat_sections:
            existing_section = await db.manual_sections.find_one({"id": section["id"]})
            
            if existing_section:
                print(f"   ⚠️  Section {section['id']} existe. Mise à jour...")
                await db.manual_sections.update_one(
                    {"id": section["id"]},
                    {"$set": section}
                )
            else:
                print(f"   ➕ Ajout de la section {section['id']}: {section['title']}")
                await db.manual_sections.insert_one(section)
        
        # Mettre à jour la version du manuel
        await db.manual_versions.update_one(
            {"is_current": True},
            {
                "$set": {
                    "version": "1.2",
                    "release_date": datetime.now(timezone.utc).isoformat(),
                    "changes": [
                        "Ajout du chapitre 💬 Chat Live",
                        "5 nouvelles sections complètes sur la communication en temps réel",
                        "Guide complet des fonctionnalités : messages, fichiers, réactions, réponses"
                    ]
                }
            },
            upsert=True
        )
        
        print("\n✅ Chapitre Chat Live ajouté avec succès !")
        print(f"   • 1 chapitre : {chat_chapter['title']}")
        print(f"   • 5 sections")
        print(f"   • Version du manuel mise à jour : 1.2")
        
        # Fermer la connexion
        client.close()
        
    except Exception as e:
        print(f"❌ Erreur lors de l'ajout : {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(add_chat_live_manual())
