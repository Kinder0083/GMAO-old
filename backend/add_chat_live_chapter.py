"""
Script pour ajouter le chapitre Chat Live au manuel
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def add_chat_live_chapter():
    """Ajoute le chapitre Chat Live au manuel"""
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'gmao_db')]
    
    chapter_id = "ch-chat-live"
    
    # Supprimer si existe déjà
    await db.manual_chapters.delete_one({"id": chapter_id})
    await db.manual_sections.delete_many({"chapter_id": chapter_id})
    
    # Créer le chapitre
    chapter = {
        "id": chapter_id,
        "title": "💬 Chat Live",
        "description": "Messagerie instantanée et consignes",
        "icon": "MessageSquare",
        "order": 1.5,
        "sections": ["sec-chat-01", "sec-chat-02", "sec-chat-03"],
        "target_roles": [],
        "target_modules": ["chatLive"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.manual_chapters.insert_one(chapter)
    print(f"✅ Chapitre créé: {chapter['title']}")
    
    sections = [
        {
            "id": "sec-chat-01",
            "chapter_id": chapter_id,
            "title": "Utiliser le Chat Live",
            "order": 1,
            "content": """## Messagerie instantanée

Le **Chat Live** permet de communiquer en temps réel avec les autres utilisateurs de GMAO Iris.

### Accéder au Chat

1. Cliquez sur **Chat Live** dans le menu latéral
2. La liste de vos conversations s'affiche à gauche
3. Sélectionnez une conversation ou créez-en une nouvelle

### Envoyer un message

1. Cliquez sur une conversation
2. Tapez votre message dans la zone de texte
3. Appuyez sur **Entrée** ou cliquez sur l'icône d'envoi

### Fonctionnalités

- **Messages texte** : Communication écrite standard
- **Notifications** : Alertes pour les nouveaux messages
- **Historique** : Consultez vos anciens messages
- **Statut** : Voyez qui est en ligne

> **💡 Astuce** : Le compteur de messages non lus s'affiche dans le menu latéral."""
        },
        {
            "id": "sec-chat-02",
            "chapter_id": chapter_id,
            "title": "Envoyer des consignes",
            "order": 2,
            "content": """## Système de consignes

Le Chat Live intègre un système de **consignes** permettant d'envoyer des instructions importantes.

### Consigne individuelle

Envoyez une instruction à un utilisateur spécifique :
1. Ouvrez une conversation avec l'utilisateur
2. Cliquez sur le bouton **Consigne** (icône drapeau)
3. Rédigez votre message
4. Le destinataire devra accuser réception

### Consigne générale

Envoyez une instruction à plusieurs utilisateurs :
1. Cliquez sur **Consigne générale** dans l'en-tête du Chat
2. Sélectionnez les destinataires par service ou rôle
3. Définissez le niveau d'urgence
4. Rédigez et envoyez

### Accusé de réception

- L'utilisateur doit cliquer sur "J'ai lu" pour confirmer
- Suivez qui a lu ou non la consigne
- Les consignes non lues restent visibles

### Cas d'usage
- Instructions de sécurité urgentes
- Changements de procédures
- Rappels pour des tâches critiques"""
        },
        {
            "id": "sec-chat-03",
            "chapter_id": chapter_id,
            "title": "Paramètres du Chat",
            "order": 3,
            "content": """## Configuration du Chat

### Notifications

Gérez vos notifications depuis les paramètres :
- **Sons** : Activer/désactiver les sons de notification
- **Pop-up** : Afficher les nouveaux messages en pop-up
- **Badge** : Compteur de messages non lus

### Historique des messages

- Les messages sont conservés **60 jours** par défaut
- L'administrateur peut modifier cette durée
- Les anciens messages sont automatiquement archivés

### Bonnes pratiques

1. **Soyez concis** : Messages courts et clairs
2. **Utilisez les consignes** : Pour les informations importantes
3. **Vérifiez vos notifications** : Ne manquez pas de messages urgents
4. **Respectez les horaires** : Évitez les messages tardifs sauf urgence"""
        }
    ]
    
    for section in sections:
        section["created_at"] = datetime.now(timezone.utc).isoformat()
        section["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.manual_sections.insert_one(section)
        print(f"  ✅ Section: {section['title']}")
    
    print(f"\n✅ Chapitre 'Chat Live' ajouté avec {len(sections)} sections")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_chat_live_chapter())
