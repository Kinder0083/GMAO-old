"""
Script pour ajouter les nouvelles fonctionnalités au manuel utilisateur
- Consignes individuelles et générales
- Visite guidée
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def add_new_features_to_manual():
    """Ajoute les nouvelles fonctionnalités au manuel"""
    
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'gmao_db')]
    
    # === 1. Ajouter la section Consignes au chapitre Chat Live ===
    
    # Chercher le chapitre Chat Live
    chat_chapter = await db.manual_chapters.find_one({"title": {"$regex": "Chat Live", "$options": "i"}})
    
    if chat_chapter:
        chapter_id = chat_chapter["id"]
        
        # Vérifier si la section consignes existe
        existing_consigne = await db.manual_sections.find_one({"id": "sec-consignes-01"})
        if not existing_consigne:
            consigne_section = {
                "id": "sec-consignes-01",
                "chapter_id": chapter_id,
                "title": "Envoyer des consignes",
                "order": 10,
                "content": """## Système de consignes

Le Chat Live intègre un système de **consignes** permettant d'envoyer des instructions importantes aux utilisateurs.

### Types de consignes

#### Consigne individuelle
Envoyez une instruction à un utilisateur spécifique :
1. Ouvrez une conversation avec l'utilisateur
2. Cliquez sur le bouton **Consigne** (icône drapeau)
3. Rédigez votre message
4. Le destinataire recevra une notification et devra accuser réception

#### Consigne générale
Envoyez une instruction à un groupe d'utilisateurs :
1. Cliquez sur **Consigne générale** dans l'en-tête du Chat
2. Sélectionnez les destinataires par service ou rôle
3. Rédigez votre message et définissez le niveau d'urgence
4. Tous les destinataires recevront la consigne

### Accusé de réception

Les consignes nécessitent un **accusé de réception** :
- L'utilisateur doit cliquer sur "J'ai lu" pour confirmer
- Vous pouvez suivre qui a lu ou non la consigne
- Les consignes non lues restent visibles jusqu'à acquittement

### Cas d'usage
- Instructions de sécurité urgentes
- Changements de procédures
- Informations importantes à transmettre
- Rappels pour des tâches critiques""",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.manual_sections.insert_one(consigne_section)
            print("✅ Section 'Consignes' ajoutée au chapitre Chat Live")
            
            # Mettre à jour la liste des sections du chapitre
            await db.manual_chapters.update_one(
                {"id": chapter_id},
                {"$addToSet": {"sections": "sec-consignes-01"}}
            )
    else:
        print("⚠️ Chapitre Chat Live non trouvé")
    
    # === 2. Ajouter la section Visite guidée au chapitre Démarrage ===
    
    start_chapter = await db.manual_chapters.find_one({"title": {"$regex": "Démarrage|Guide", "$options": "i"}})
    
    if start_chapter:
        chapter_id = start_chapter["id"]
        
        existing_tour = await db.manual_sections.find_one({"id": "sec-visite-guidee"})
        if not existing_tour:
            tour_section = {
                "id": "sec-visite-guidee",
                "chapter_id": chapter_id,
                "title": "Visite guidée de l'application",
                "order": 5,
                "content": """## Visite guidée interactive

GMAO Iris propose une **visite guidée** pour découvrir l'interface et les fonctionnalités principales.

### Lancer la visite guidée

1. Cliquez sur votre **nom/avatar** en haut à droite
2. Sélectionnez **Paramètres**
3. Dans la section "Interface", cliquez sur **Lancer la visite guidée**

### Contenu de la visite

La visite vous présente :
- **Le menu principal** : Navigation entre les modules
- **Le tableau de bord** : Vue d'ensemble de votre activité
- **Les notifications** : Alertes et messages importants
- **Le profil utilisateur** : Vos paramètres personnels

### Conseils
- La visite dure environ 2 minutes
- Vous pouvez la quitter à tout moment
- Relancez-la si besoin depuis les paramètres
- Recommandée pour les nouveaux utilisateurs""",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.manual_sections.insert_one(tour_section)
            print("✅ Section 'Visite guidée' ajoutée au chapitre Démarrage")
            
            await db.manual_chapters.update_one(
                {"id": chapter_id},
                {"$addToSet": {"sections": "sec-visite-guidee"}}
            )
    else:
        print("⚠️ Chapitre Démarrage non trouvé")
    
    # === 3. Ajouter section sur les responsables de service ===
    
    users_chapter = await db.manual_chapters.find_one({"title": {"$regex": "Utilisateurs|Users", "$options": "i"}})
    
    if users_chapter:
        chapter_id = users_chapter["id"]
        
        existing_resp = await db.manual_sections.find_one({"id": "sec-responsables-service"})
        if not existing_resp:
            resp_section = {
                "id": "sec-responsables-service",
                "chapter_id": chapter_id,
                "title": "Responsables de service",
                "order": 10,
                "content": """## Gestion des responsables de service

Les **responsables de service** ont des privilèges spéciaux pour gérer leur équipe.

### Désigner un responsable de service

1. Allez dans **Utilisateurs** > **Gestion des rôles**
2. Cliquez sur l'onglet **Responsables de service**
3. Pour chaque service, sélectionnez un utilisateur dans la liste déroulante
4. Le responsable désigné aura accès aux fonctionnalités spéciales

### Fonctionnalités des responsables

- **Dashboard Service** : Tableau de bord personnalisé avec widgets
- **Vue équipe** : Visualisation des membres du service
- **Validation** : Approbation des demandes de son service
- **Rapports** : Accès aux statistiques de son service

### Services disponibles
- ADMINISTRATION
- LOGISTIQUE
- MAINTENANCE
- PRODUCTION
- QUALITÉ
- QHSE
- RH
- INFORMATIQUE
- DIRECTION
- AUTRE

> **💡 Astuce** : Un même utilisateur peut être responsable de plusieurs services.""",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.manual_sections.insert_one(resp_section)
            print("✅ Section 'Responsables de service' ajoutée")
            
            await db.manual_chapters.update_one(
                {"id": chapter_id},
                {"$addToSet": {"sections": "sec-responsables-service"}}
            )
    
    # === 4. Mettre à jour la version ===
    await db.user_manuals.update_one(
        {"id": "manual-gmao-iris"},
        {
            "$set": {
                "version": "1.4",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "changes": "Ajout sections: Consignes, Visite guidée, Responsables de service (Janvier 2026)"
            }
        },
        upsert=True
    )
    
    print("\n✅ Manuel mis à jour vers la version 1.4")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_new_features_to_manual())
