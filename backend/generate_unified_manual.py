#!/usr/bin/env python3
"""
Script idempotent unifié pour générer le manuel complet GMAO Iris (23 chapitres)
Ce script remplace generate_complete_manual.py et add_missing_manual_chapters.py

Caractéristiques :
- Idempotent : Peut être exécuté plusieurs fois sans dupliquer les données
- Complet : Génère tous les 23 chapitres et leurs sections (61 sections au total)
- Maintenable : Code centralisé et organisé

Utilisation :
    python3 generate_unified_manual.py
"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

# Connexion MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# Toutes les sections du manuel
ALL_SECTIONS = {
    # Chapitre 1 : Guide de Démarrage (déjà créé en base)
    "sec-001-01": {
        "title": "Bienvenue dans GMAO Iris",
        "content": """GMAO Iris est votre solution complète de gestion de maintenance assistée par ordinateur.

📌 **Qu'est-ce qu'une GMAO ?**

Une GMAO (Gestion de Maintenance Assistée par Ordinateur) est un logiciel qui permet de gérer l'ensemble des activités de maintenance d'une entreprise :

• Planification des interventions
• Suivi des équipements
• Gestion des stocks de pièces
• Traçabilité des actions
• Analyse des performances

🎯 **Objectifs de GMAO Iris :**

1. **Optimiser** la maintenance préventive et curative
2. **Réduire** les temps d'arrêt des équipements
3. **Suivre** l'historique complet de vos installations
4. **Analyser** les performances avec des rapports détaillés
5. **Collaborer** efficacement entre les équipes

✅ **Premiers pas recommandés :**

1. Consultez la section "Connexion et Navigation"
2. Familiarisez-vous avec votre rôle et vos permissions
3. Explorez les différents modules selon vos besoins
4. N'hésitez pas à utiliser la fonction de recherche dans ce manuel

💡 **Astuce :** Utilisez le bouton "Aide" en haut à droite pour signaler un problème ou demander de l'assistance à tout moment.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["bienvenue", "introduction", "gmao"]
    },
    
    "sec-001-02": {
        "title": "Connexion et Navigation",
        "content": """📱 **Se Connecter à GMAO Iris**

1. **Accéder à l'application**
   • Ouvrez votre navigateur web
   • Saisissez l'URL de GMAO Iris
   • Bookmark la page pour un accès rapide

2. **Première Connexion**
   • Email : Votre adresse email professionnelle
   • Mot de passe : Fourni par l'administrateur
   • ⚠️ Changez votre mot de passe

🗺️ **Navigation dans l'Interface**

**Sidebar (Barre latérale)**
• Tous les modules principaux
• Réduire/agrandir avec l'icône ☰

**Header (En-tête)**
• Boutons "Manuel" et "Aide"
• Badges de notifications
• Votre profil

🔔 **Notifications**
• Badge ROUGE : Maintenances dues
• Badge ORANGE : OT en retard
• Badge VERT : Alertes stock""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["connexion", "navigation"]
    },
    
    "sec-001-03": {
        "title": "Comprendre les Rôles",
        "content": """🎭 **Les Différents Rôles**

**ADMIN** : Accès complet
**DIRECTEUR** : Vision globale
**QHSE** : Sécurité/qualité
**TECHNICIEN** : Exécution
**ADV** : Achats/ventes
**LABO** : Laboratoire
**VISUALISEUR** : Lecture seule

🔐 **Connaître Mon Rôle**
Cliquez sur votre nom en haut à droite""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["rôles", "permissions"]
    },
    
    "sec-001-04": {
        "title": "Raccourcis et Astuces",
        "content": """⌨️ **Raccourcis Clavier**

**Navigation**
• **Ctrl + K** : Recherche globale
• **Échap** : Fermer
• **Ctrl + /** : Manuel

💡 **Astuces**
1. Utilisez les filtres
2. Cliquez sur les badges
3. Exportez vos données
4. Ajoutez des commentaires""",
        "level": "both",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["raccourcis", "astuces"]
    },
    
    # Chapitre 2 : Utilisateurs
    "sec-002-01": {
        "title": "Créer un Utilisateur",
        "content": """👥 **Créer un Nouvel Utilisateur**

⚠️ **Prérequis** : Rôle ADMIN

**Étape 1** : Module "Équipes" → "+ Inviter membre"

**Étape 2** : Remplir le formulaire
• Email (obligatoire)
• Prénom et Nom
• Rôle (ADMIN, TECHNICIEN, etc.)
• Téléphone (optionnel)

**Étape 3** : Configurer les permissions
Les permissions sont automatiques selon le rôle

**Étape 4** : Envoyer l'invitation
L'utilisateur reçoit un email

✅ **Vérification**
L'utilisateur apparaît avec le statut "En attente"

💡 **Bonnes Pratiques**
• Emails professionnels uniquement
• Minimum de permissions nécessaires
• Désactivez (ne supprimez pas) les anciens comptes""",
        "level": "beginner",
        "target_roles": ["ADMIN"],
        "target_modules": ["people"],
        "keywords": ["utilisateur", "créer", "inviter"]
    },
    
    "sec-002-02": {
        "title": "Modifier les Permissions",
        "content": """🔐 **Gérer les Permissions**

⚠️ **Prérequis** : ADMIN

**3 Niveaux de Permission**
• **Voir** : Consulter
• **Éditer** : Créer/modifier
• **Supprimer** : Supprimer

**Modifier**
1. Module "Équipes" → Utilisateur
2. "Modifier les permissions"
3. Cocher/décocher par module
4. Sauvegarder

**Permissions par Défaut**
• ADMIN : Tout ✅
• TECHNICIEN : Voir/Éditer ✅, Supprimer ❌
• VISUALISEUR : Voir ✅ uniquement

⚠️ **Attention**
Certaines actions nécessitent toujours ADMIN :
• Gestion utilisateurs
• Configuration système""",
        "level": "advanced",
        "target_roles": ["ADMIN"],
        "target_modules": ["people"],
        "keywords": ["permissions", "droits"]
    },
    
    "sec-002-03": {
        "title": "Désactiver un Compte",
        "content": """🔒 **Désactiver un Utilisateur**

⚠️ Préférez la désactivation à la suppression !

**Pourquoi Désactiver ?**
• Conserve l'historique
• Traçabilité maintenue
• Réactivation possible

**Étape 1** : Module "Équipes"
**Étape 2** : Cliquez sur l'utilisateur
**Étape 3** : Bouton "Désactiver"
**Étape 4** : Confirmez

✅ **Résultat**
• L'utilisateur ne peut plus se connecter
• Ses données restent visibles
• Son nom apparaît sur ses anciennes actions

🔄 **Réactiver**
Même procédure, bouton "Activer\"""",
        "level": "beginner",
        "target_roles": ["ADMIN"],
        "target_modules": ["people"],
        "keywords": ["désactiver", "compte"]
    },
    
    # Chapitre 3 : Ordres de Travail
    "sec-003-01": {
        "title": "Créer un Ordre de Travail",
        "content": """📋 **Workflow Complet : Créer un OT**

**Étape 1** : Module "Ordres de travail"
Cliquez sur "+ Nouvel ordre"

**Étape 2** : Informations de base
• **Titre** : Descriptif court (obligatoire)
• **Description** : Détails du problème
• **Équipement** : Sélectionner dans la liste
• **Zone** : Localisation
• **Priorité** : Basse, Normale, Haute, Critique

**Étape 3** : Planification
• **Type** : Correctif, Préventif, Amélioration
• **Assigné à** : Technicien responsable
• **Date limite** : Échéance

**Étape 4** : Détails additionnels
• Catégorie (Électrique, Mécanique, etc.)
• Temps estimé
• Coût estimé

**Étape 5** : Sauvegarder
• Statut initial : "Nouveau"
• Numéro automatique : OT-XXXX

💡 **Conseils**
• Soyez précis dans la description
• Ajoutez des photos si possible
• Indiquez les symptômes observés
• Mentionnez les tentatives déjà faites""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["workOrders"],
        "keywords": ["ordre travail", "créer", "OT"]
    },
    
    "sec-003-02": {
        "title": "Suivre l'Avancement d'un OT",
        "content": """📊 **Suivre un Ordre de Travail**

**Les Statuts d'un OT**
1. **Nouveau** : Créé, pas encore assigné
2. **En attente** : Assigné, pas démarré
3. **En cours** : Travail en cours
4. **En attente pièce** : Bloqué (manque pièce)
5. **Terminé** : Travail fini
6. **Fermé** : Validé et archivé

**Changer le Statut**
1. Ouvrir l'OT
2. Bouton "Changer statut"
3. Sélectionner le nouveau statut
4. Ajouter un commentaire (recommandé)
5. Valider

**Tableau de Bord**
Filtrez par statut pour voir :
• Tous les OT en cours
• Les OT en retard (badge orange)
• Vos OT assignés

**Historique**
Chaque changement est tracé :
• Qui a fait quoi
• Quand
• Pourquoi (si commentaire)

💡 **Bonne Pratique**
Mettez à jour le statut régulièrement !""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["workOrders"],
        "keywords": ["statut", "suivi", "avancement"]
    },
    
    "sec-003-03": {
        "title": "Ajouter des Pièces Utilisées",
        "content": """🔧 **Enregistrer les Pièces Utilisées**

**Pourquoi Enregistrer ?**
• Suivi du stock
• Calcul du coût réel
• Historique équipement
• Statistiques

**Étape 1** : Ouvrir l'OT
**Étape 2** : Onglet "Pièces utilisées"
**Étape 3** : Cliquer "+ Ajouter pièce"

**Étape 4** : Sélectionner
• Rechercher la pièce
• Quantité utilisée
• Le stock est automatiquement déduit !

**Étape 5** : Valider

⚠️ **Attention au Stock**
• Si stock insuffisant : alerte
• Possibilité de continuer quand même
• Pensez à commander

📊 **Coût Automatique**
Le coût total de l'OT est recalculé automatiquement""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["workOrders"],
        "keywords": ["pièces", "stock", "consommation"]
    },
    
    "sec-003-04": {
        "title": "Joindre des Fichiers",
        "content": """📎 **Ajouter des Pièces Jointes**

**Types de Fichiers Acceptés**
• Photos : JPG, PNG (recommandé)
• Documents : PDF
• Taille max : 10 Mo par fichier

**Ajouter une Pièce Jointe**
1. Ouvrir l'OT
2. Section "Pièces jointes"
3. Glisser-déposer ou cliquer "Parcourir"
4. Sélectionner le(s) fichier(s)
5. Upload automatique

**Bonnes Pratiques**
📸 **Photos Avant/Après**
• Photo du problème initial
• Photo après réparation
• Preuve du travail effectué

📄 **Documents Utiles**
• Bon de commande pièces
• Schémas techniques
• Certificats de conformité

💡 **Conseil**
Nommez vos fichiers clairement :
"OT-5823_avant.jpg"
"OT-5823_schema_electrique.pdf\"""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["workOrders"],
        "keywords": ["pièces jointes", "fichiers", "photos"]
    },
    
    "sec-003-05": {
        "title": "Clôturer un OT",
        "content": """✅ **Clôturer un Ordre de Travail**

**Avant de Clôturer - Checklist**
☑️ Travail terminé
☑️ Pièces utilisées enregistrées
☑️ Temps de travail saisi
☑️ Photos ajoutées
☑️ Commentaire final rédigé

**Étape 1** : Statut "Terminé"
Changez le statut en "Terminé"

**Étape 2** : Rapport d'intervention
• Travaux effectués
• Problèmes rencontrés
• Recommandations

**Étape 3** : Validation
• Si vous êtes le responsable : Statut "Fermé"
• Sinon : Un supérieur validera

**OT Fermé**
• Archive automatique
• Visible dans l'historique
• Ne peut plus être modifié (sauf ADMIN)

📊 **Statistiques Automatiques**
L'OT fermé alimente :
• Taux de disponibilité équipement
• MTTR (temps moyen réparation)
• Coûts de maintenance""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["workOrders"],
        "keywords": ["clôturer", "fermer", "terminer"]
    },
    
    "sec-003-06": {
        "title": "Ordres Type (Modèles d'OT)",
        "content": """📋 **Créer et Utiliser des Ordres Type**

Les **Ordres Type** sont des modèles d'ordres de travail pré-configurés pour accélérer la création d'OT récurrents.

**Accéder aux Ordres Type** (Admin/Responsables de service) :
1. Module **Ordres de travail**
2. Bouton **"Ordres Type"** (violet, en haut à droite)

**Créer un Modèle** :
1. Cliquer **"+ Nouveau modèle"**
2. Remplir les champs :
   • **Nom** : Ex: "Remplacement courroie machine X"
   • **Description** : Instructions détaillées
   • **Catégorie** : Travaux Curatif, Préventif, etc.
   • **Priorité** par défaut
   • **Temps estimé**
   • **Équipement** par défaut (optionnel)
3. **Créer**

**Utiliser un Modèle** :
1. Module **Ordres de travail**
2. Cliquer **"+ Nouvel Ordre (Modèle)"**
3. Sélectionner un modèle dans la liste déroulante
4. Prévisualiser les informations
5. **"Utiliser ce modèle"**
6. Le formulaire s'ouvre pré-rempli avec :
   • Titre, Description, Catégorie, Priorité
   • Date du jour automatique
   • Temps estimé du modèle
   • Emplacement auto-rempli si équipement lié
7. Compléter et sauvegarder

**Fonctionnalités Avancées** :
• 📊 **Compteur d'utilisation** sur chaque modèle
• 📋 **Dupliquer** un modèle existant
• 📁 Modèles rangés par **catégorie**

💡 **Astuce** : Créez des modèles pour les interventions répétitives comme les rondes, changements de pièces d'usure, etc.""",
        "level": "intermediate",
        "target_roles": ["ADMIN", "RSP_SERVICE", "RSP_PROD"],
        "target_modules": ["workOrders"],
        "keywords": ["modèle", "template", "ordre type", "pré-rempli"]
    },
    
    # Chapitre 4 : Équipements
    "sec-004-01": {
        "title": "Ajouter un Équipement",
        "content": """🔧 **Créer un Nouvel Équipement**

**Étape 1** : Module "Équipements"
Cliquez "+ Nouvel équipement"

**Informations Obligatoires**
• **Nom** : Identifiant unique
• **Type** : Machine, Installation, Outil
• **Zone** : Localisation

**Informations Recommandées**
• Marque et Modèle
• N° de série
• Date de mise en service
• Fournisseur
• Criticité (A, B, C)

**Hiérarchie**
• Équipement parent (optionnel)
• Permet de créer une arborescence
• Exemple : Ligne production > Machine > Composant

**Photo**
Ajoutez une photo pour identification rapide

💡 **Code Équipement**
Utilisez une nomenclature cohérente :
ZONE-TYPE-NUMERO
Ex: "PROD-TOUR-001\"""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["assets"],
        "keywords": ["équipement", "ajouter", "créer"]
    },
    
    "sec-004-02": {
        "title": "Gérer l'Hiérarchie",
        "content": """🌳 **Hiérarchie des Équipements**

**Pourquoi une Hiérarchie ?**
• Organisation logique
• Navigation facilitée
• Maintenance en cascade

**Exemple de Structure**
Usine
  └─ Atelier Production
      └─ Ligne A
          └─ Machine découpe
              ├─ Moteur principal
              ├─ Système hydraulique
              └─ Panneau contrôle

**Créer une Hiérarchie**
1. Créer l'équipement parent
2. Créer l'enfant
3. Sélectionner le parent

**Visualiser**
• Vue liste : tous les équipements
• Vue arbre : hiérarchie complète
• Bouton "Voir hiérarchie" sur chaque équipement

💡 **Astuce**
Un OT sur un parent peut impacter tous les enfants""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["assets"],
        "keywords": ["hiérarchie", "parent", "enfant"]
    },
    
    "sec-004-03": {
        "title": "Historique d'un Équipement",
        "content": """📚 **Consulter l'Historique**

**Informations Disponibles**
• Tous les OT liés
• Pièces remplacées
• Temps d'arrêt total
• Coûts cumulés
• Maintenances préventives

**Accéder à l'Historique**
1. Ouvrir l'équipement
2. Onglet "Historique"
3. Filtrer par période si besoin

**Indicateurs Clés**
• **MTBF** : Temps moyen entre pannes
• **MTTR** : Temps moyen de réparation
• **Disponibilité** : % temps opérationnel
• **Coût total** : Maintenance cumulée

📊 **Graphiques**
• Évolution des pannes
• Répartition des coûts
• Temps d'intervention

💡 **Décision de Remplacement**
Si coûts > 60% valeur neuve : envisager remplacement""",
        "level": "both",
        "target_roles": [],
        "target_modules": ["assets"],
        "keywords": ["historique", "statistiques"]
    },
    
    "sec-004-04": {
        "title": "Changer le Statut",
        "content": """🚦 **Statuts des Équipements**

**5 Statuts Possibles**
• ✅ **Opérationnel** : Fonctionne normalement
• ⚠️ **Attention** : Surveiller
• 🔧 **En maintenance** : Intervention en cours
• ❌ **Hors service** : Non utilisable
• 🗑️ **Déclassé** : Retiré du service

**Changer le Statut**
1. Ouvrir l'équipement
2. Bouton "Changer statut"
3. Sélectionner + commentaire
4. Valider

**Impact du Statut**
• Visible sur le tableau de bord
• Alertes automatiques si "Hors service"
• Empêche création OT si "Déclassé"

⚠️ **Hors Service**
Met automatiquement l'équipement en rouge
Notifie les responsables

💡 **Bonne Pratique**
Mettez à jour en temps réel""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["assets"],
        "keywords": ["statut", "état", "disponibilité"]
    },
    
    # Chapitre 5 : Maintenance Préventive
    "sec-005-01": {
        "title": "Comprendre la Maintenance Préventive",
        "content": """🔄 **Qu'est-ce que la Maintenance Préventive ?**

**Définition**
Maintenance planifiée pour éviter les pannes et prolonger la durée de vie des équipements.

**Avantages**
• ⬇️ Réduction des pannes imprévues
• 💰 Économies sur les réparations d'urgence
• ⏱️ Moins de temps d'arrêt
• 📈 Meilleure disponibilité
• 🛡️ Sécurité améliorée

**Types de Maintenance Préventive**
1. **Systématique** : Basée sur le temps
   - Hebdomadaire, mensuelle, annuelle
   - Exemple : Vidange tous les 6 mois

2. **Conditionnelle** : Basée sur l'état
   - Inspection des paramètres
   - Exemple : Changer si vibrations > seuil

3. **Prévisionnelle** : Basée sur l'analyse
   - Analyse d'huile, thermographie
   - Prédit la défaillance avant qu'elle n'arrive

**Cycle de Vie**
Planification → Programmation → Exécution → Validation → Amélioration

💡 **Règle d'Or**
20% de préventif évite 80% de curatif !""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["preventiveMaintenance"],
        "keywords": ["préventif", "planification", "maintenance"]
    },
    
    "sec-005-02": {
        "title": "Créer un Plan de Maintenance",
        "content": """📅 **Créer un Plan de Maintenance Préventive**

**Étape 1** : Module "Maintenance Préventive"
Cliquez "+ Nouveau plan"

**Informations Obligatoires**
• **Titre** : Description claire
• **Équipement** : Sélectionner
• **Fréquence** : Hebdomadaire, Mensuelle, Trimestrielle, Semestrielle, Annuelle
• **Date de début** : Première intervention

**Informations Recommandées**
• Instructions détaillées
• Checklist des tâches
• Pièces à vérifier/remplacer
• Temps estimé
• Assigné à (technicien)

**Options Avancées**
• Générer OT automatiquement
• Alertes X jours avant
• Stop si équipement hors service

**Calendrier**
• Visualisez toutes les maintenances sur un calendrier
• Vue mois, semaine, jour

💡 **Astuce**
Basez-vous sur les recommandations du fabricant""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["preventiveMaintenance"],
        "keywords": ["plan", "créer", "fréquence"]
    },
    
    "sec-005-03": {
        "title": "Gérer les Échéances",
        "content": """⏰ **Suivre les Échéances**

**Tableau de Bord**
Affiche :
• Maintenances dues aujourd'hui
• Maintenances à venir (7 jours)
• Maintenances en retard ⚠️

**Badge de Notification**
Badge ROUGE dans le header : maintenances dues

**Statuts des Maintenances**
• 🔵 **Planifiée** : Programmée
• ⏳ **Due** : À faire maintenant
• ⚠️ **En retard** : Échéance dépassée
• ✅ **Réalisée** : Complétée
• ⏸️ **Suspendue** : Temporairement désactivée

**Marquer comme Réalisée**
1. Ouvrir la maintenance
2. Bouton "Marquer comme réalisée"
3. Remplir le rapport :
   - Observations
   - Anomalies détectées
   - Pièces changées
   - Prochaines actions
4. Valider

**OT Automatique**
Si l'option est activée, un OT est créé automatiquement à chaque échéance""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["preventiveMaintenance"],
        "keywords": ["échéance", "notification", "due"]
    },
    
    "sec-005-04": {
        "title": "Historique et Statistiques",
        "content": """📊 **Analyser les Performances**

**Historique d'un Plan**
• Toutes les réalisations passées
• Respect des délais
• Problèmes récurrents
• Pièces consommées

**KPIs de la Maintenance Préventive**
• **Taux de réalisation** : % maintenances faites à temps
• **MTBF** : Temps moyen entre pannes (amélioration)
• **Coût préventif vs curatif**
• **Temps moyen d'intervention**

**Rapports Disponibles**
1. Respect du calendrier
2. Maintenances par équipement
3. Coûts de maintenance préventive
4. Efficacité (réduction des pannes)

**Amélioration Continue**
• Si pannes malgré préventif : ajuster fréquence
• Si aucun problème détecté : espacer
• Analyser les équipements critiques

💡 **Objectif**
Taux de réalisation > 95%""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["preventiveMaintenance"],
        "keywords": ["statistiques", "rapport", "KPI"]
    },
    
    # Chapitre 6 : Gestion du Stock
    "sec-006-01": {
        "title": "Ajouter un Article au Stock",
        "content": """📦 **Créer un Article de Stock**

**Étape 1** : Module "Stock & Inventaire"
Cliquez "+ Nouvel article"

**Informations Essentielles**
• **Nom** : Désignation claire
• **Code article** : Référence unique
• **Catégorie** : Mécanique, Électrique, Consommable, etc.
• **Quantité** : Stock actuel
• **Unité** : Pièce, Kg, Litre, Mètre

**Informations de Gestion**
• **Stock minimum** : Seuil d'alerte
• **Stock maximum** : Quantité optimale
• **Emplacement** : Rayon, étagère
• **Prix unitaire** : Coût

**Fournisseur**
• Fournisseur principal
• Référence fournisseur
• Délai de livraison

**Photo**
Ajoutez une photo pour identification

💡 **Code Article**
Utilisez un code structuré :
CAT-TYPE-NUMERO
Ex: "ELEC-MOTOR-001\"""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["inventory"],
        "keywords": ["stock", "article", "ajouter"]
    },
    
    "sec-006-02": {
        "title": "Gérer les Mouvements de Stock",
        "content": """📊 **Suivre les Mouvements**

**Types de Mouvements**
• ➕ **Entrée** : Réception, retour
• ➖ **Sortie** : Utilisation, prêt
• 🔄 **Transfert** : Changement d'emplacement
• ✏️ **Ajustement** : Correction inventaire

**Enregistrer une Entrée**
1. Ouvrir l'article
2. Bouton "Mouvement de stock"
3. Type : "Entrée"
4. Quantité reçue
5. Numéro bon de livraison
6. Date de réception
7. Valider

**Enregistrer une Sortie**
1. Ouvrir l'article
2. Type : "Sortie"
3. Quantité utilisée
4. Lié à un OT (recommandé)
5. Utilisateur
6. Valider

**Historique des Mouvements**
• Tous les mouvements sont tracés
• Qui, Quand, Combien, Pourquoi
• Valeur du stock en temps réel

⚠️ **Alerte Stock Bas**
Notification automatique si stock < minimum""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["inventory"],
        "keywords": ["mouvement", "entrée", "sortie"]
    },
    
    "sec-006-03": {
        "title": "Réaliser un Inventaire",
        "content": """📋 **Inventaire Physique**

**Pourquoi un Inventaire ?**
• Vérifier concordance stock/réel
• Détecter pertes, vols, erreurs
• Valorisation comptable
• Réglementation

**Préparation**
1. Planifier : date, heure, équipe
2. Imprimer la liste (Export Excel)
3. Préparer étiquettes et scanner

**Réalisation**
1. Module "Stock & Inventaire"
2. Bouton "Nouvel inventaire"
3. Sélectionner articles ou catégorie
4. Mode de comptage :
   - Par article
   - Par emplacement
   - Complet

**Comptage**
• Compter physiquement
• Saisir quantité réelle
• Noter écarts
• Chercher causes si écart > 5%

**Validation**
1. Réviser les écarts importants
2. Valider l'inventaire
3. Ajustements automatiques
4. Rapport généré

**Fréquence Recommandée**
• Articles A (critiques) : Mensuel
• Articles B : Trimestriel
• Articles C : Annuel""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["inventory"],
        "keywords": ["inventaire", "comptage"]
    },
    
    "sec-006-04": {
        "title": "Gérer les Alertes Stock",
        "content": """🔔 **Alertes et Réapprovisionnement**

**Types d'Alertes**
• 🔴 **Stock critique** : < Stock minimum
• 🟠 **Stock bas** : < 120% stock minimum
• ⚪ **Rupture** : Quantité = 0
• ⚫ **Stock mort** : Aucun mouvement 12 mois

**Configurer les Alertes**
1. Ouvrir l'article
2. Définir "Stock minimum"
3. Activer "Alertes automatiques"
4. Destinataires emails

**Badge de Notification**
Badge VERT dans header : articles en alerte

**Liste des Articles en Alerte**
Module "Stock & Inventaire" → Onglet "Alertes"

**Réapprovisionnement**
1. Consulter la liste d'alertes
2. Bouton "Créer commande"
3. Quantité = (Stock max - Stock actuel)
4. Envoyer au fournisseur

**Calcul Automatique**
• Consommation moyenne
• Délai de livraison
• Stock de sécurité
→ Proposition quantité optimale

💡 **Astuce**
Configurez stock minimum = (Consommation moyenne × Délai livraison) + Stock sécurité""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["inventory"],
        "keywords": ["alerte", "réapprovisionnement", "stock minimum"]
    },
    
    # Chapitre 7 : Demandes d'Intervention
    "sec-007-01": {
        "title": "Soumettre une Demande",
        "content": """📝 **Créer une Demande d'Intervention**

**Pour Qui ?**
Tout utilisateur peut créer une demande

**Étape 1** : Module "Demandes d'intervention"
Cliquez "+ Nouvelle demande"

**Informations à Remplir**
• **Titre** : Problème en quelques mots
• **Description** : Détails précis
• **Équipement** : Quel équipement ?
• **Zone** : Localisation
• **Priorité suggérée** : Basse, Normale, Haute
• **Photos** : Très recommandé !

**Priorités**
• **Basse** : Confort, pas urgent
• **Normale** : Défaut sans impact production
• **Haute** : Impact production modéré
• **Urgente** : Arrêt production, sécurité

**Après Soumission**
• Statut : "En attente"
• Notification aux responsables maintenance
• Numéro de demande : DI-XXXX

💡 **Conseil**
Plus la description est précise, plus vite on peut intervenir !
Ajoutez photos/vidéos si possible.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["interventionRequests"],
        "keywords": ["demande", "intervention", "créer"]
    },
    
    "sec-007-02": {
        "title": "Suivre ma Demande",
        "content": """👁️ **Suivre l'État de ma Demande**

**Statuts Possibles**
1. **En attente** : Soumise, pas encore traitée
2. **Approuvée** : Acceptée, va être planifiée
3. **En cours** : OT créé, intervention lancée
4. **Terminée** : Résolue
5. **Rejetée** : Non retenue (avec justification)

**Voir mes Demandes**
Module "Demandes d'intervention" → Filtre "Mes demandes"

**Notifications**
Vous êtes notifié par email :
• Changement de statut
• Commentaire ajouté
• Intervention terminée

**Ajouter un Commentaire**
• Ouvrir la demande
• Section "Commentaires"
• Préciser, ajouter infos

**Clôturer**
Une fois résolue :
• Vérifiez que le problème est résolu
• Bouton "Valider la résolution"
• Donnez votre satisfaction (optionnel)

💡 **Suivi en Temps Réel**
Toutes les actions sont tracées avec date et responsable""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["interventionRequests"],
        "keywords": ["suivre", "statut", "notification"]
    },
    
    "sec-007-03": {
        "title": "Traiter une Demande (Responsable)",
        "content": """⚙️ **Traiter les Demandes d'Intervention**

⚠️ **Prérequis** : Droits de modification

**Étape 1** : Évaluer la Demande
• Lire description et photos
• Évaluer urgence réelle
• Vérifier disponibilité pièces
• Estimer temps et coût

**Étape 2** : Décider
**Option A - Approuver**
1. Bouton "Approuver"
2. Ajuster priorité si nécessaire
3. Assigner technicien
4. Planifier intervention

**Option B - Rejeter**
1. Bouton "Rejeter"
2. ⚠️ Justification OBLIGATOIRE
3. Proposer alternative si possible

**Étape 3** : Créer l'OT
Bouton "Convertir en OT"
• Toutes les infos sont pré-remplies
• OT lié automatiquement
• Demandeur notifié

**Suivi**
• Tableau de bord : demandes en attente
• Temps moyen de traitement
• Taux d'approbation

💡 **Objectif**
Traiter toutes demandes < 24h""",
        "level": "advanced",
        "target_roles": ["ADMIN", "RSP_PROD", "INDUS"],
        "target_modules": ["interventionRequests"],
        "keywords": ["traiter", "approuver", "rejeter"]
    },
    
    # Chapitre 8 : Demandes d'Amélioration
    "sec-008-01": {
        "title": "Soumettre une Idée",
        "content": """💡 **Proposer une Amélioration**

**C'est Quoi ?**
Suggérer une amélioration pour :
• Optimiser un processus
• Améliorer la productivité
• Renforcer la sécurité
• Réduire les coûts
• Améliorer la qualité

**Créer une Demande**
Module "Demandes d'amélioration" → "+ Nouvelle demande"

**Formulaire**
• **Titre** : Nom de l'idée
• **Contexte** : Situation actuelle
• **Proposition** : Votre idée
• **Bénéfices attendus** : Gains espérés
• **Risques** : Contraintes/difficultés
• **Priorité** : Faible, Moyenne, Haute

**Catégories**
• Processus
• Équipement
• Sécurité
• Qualité
• Organisation
• Formation

**Après Soumission**
• Statut : "En attente"
• Évaluation par comité
• Vous serez tenu informé

🏆 **Culture d'Amélioration Continue**
Chaque idée compte !""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["improvementRequests"],
        "keywords": ["amélioration", "idée", "proposition"]
    },
    
    "sec-008-02": {
        "title": "Évaluer une Demande",
        "content": """🔍 **Analyser les Demandes d'Amélioration**

⚠️ **Prérequis** : Droits de modification (ADMIN, DIRECTEUR, QHSE, RSP_PROD)

**Processus d'Évaluation**
1. **Lecture** : Comprendre la proposition
2. **Analyse** : Faisabilité technique et financière
3. **Évaluation** : Ratio bénéfices/coûts
4. **Décision** : Approuver ou refuser

**Critères d'Évaluation**
• Impact sur productivité
• Coût de mise en œuvre
• Retour sur investissement (ROI)
• Délai de réalisation
• Ressources nécessaires
• Conformité réglementaire

**Statuts**
• **En attente** : Non encore évaluée
• **En évaluation** : Analyse en cours
• **Approuvée** : Validée, à planifier
• **Rejetée** : Non retenue
• **Convertie** : Transformée en projet d'amélioration

**Commenter**
Échangez avec le demandeur pour préciser sa proposition

💡 **Délai Cible**
Réponse dans les 15 jours""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR", "QHSE", "RSP_PROD"],
        "target_modules": ["improvementRequests"],
        "keywords": ["évaluer", "analyser"]
    },
    
    "sec-008-03": {
        "title": "Convertir en Projet",
        "content": """🚀 **Transformer en Projet d'Amélioration**

**Quand Convertir ?**
Lorsque la demande est approuvée et mérite un suivi projet

**Conversion**
1. Ouvrir la demande approuvée
2. Bouton "Convertir en amélioration"
3. Compléter les infos projet :
   - Responsable projet
   - Budget alloué
   - Date limite
   - Jalons
4. Valider

**Numérotation**
Les améliorations ont un numéro >= 7000
(Ex: 7001, 7002, etc.)

**Lien Automatique**
La demande est liée au projet
Traçabilité complète

**Suivi Projet**
Module "Améliorations" pour le suivi détaillé

💡 **Astuce**
Une demande approuvée ne devient pas forcément un projet immédiatement
Peut être mise en file d'attente""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR"],
        "target_modules": ["improvementRequests", "improvements"],
        "keywords": ["convertir", "projet"]
    },
    
    # Chapitre 9 : Projets d'Amélioration
    "sec-009-01": {
        "title": "Créer un Projet",
        "content": """📈 **Lancer un Projet d'Amélioration**

**Deux Méthodes**
1. Convertir une demande (recommandé)
2. Créer directement (Module "Améliorations" → "+ Nouveau")

**Informations Projet**
• **Titre** : Nom du projet
• **Description** : Objectifs détaillés
• **Responsable** : Chef de projet
• **Budget** : Montant alloué
• **Date début / fin** : Planning
• **Priorité** : Faible, Moyenne, Haute

**Équipe Projet**
• Ajouter membres
• Définir rôles
• Notifications automatiques

**Jalons**
Définir les grandes étapes :
• Étude de faisabilité
• Validation direction
• Réalisation
• Tests
• Déploiement

**Documents**
Joindre :
• Cahier des charges
• Plans
• Devis fournisseurs
• Autorisations

💡 **Méthode Agile**
Découpez en petites étapes""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR"],
        "target_modules": ["improvements"],
        "keywords": ["projet", "amélioration", "créer"]
    },
    
    "sec-009-02": {
        "title": "Suivre l'Avancement",
        "content": """📊 **Piloter le Projet**

**Statuts du Projet**
• **Planifié** : Validé, pas démarré
• **En cours** : Réalisation
• **En pause** : Suspendu temporairement
• **Terminé** : Achevé avec succès
• **Annulé** : Abandonné

**Tableau de Bord Projet**
• % d'avancement
• Budget consommé vs alloué
• Temps écoulé vs prévu
• Jalons franchis
• Problèmes bloquants

**Mise à Jour**
1. Ouvrir le projet
2. Modifier % avancement
3. Ajouter commentaire sur évolution
4. Mettre à jour statut si nécessaire

**Rapports d'Avancement**
Section "Commentaires" :
• Rapport hebdomadaire recommandé
• Difficultés rencontrées
• Actions correctives
• Prochaines étapes

**Alertes**
• Dépassement budget
• Retard sur planning
• Jalon non franchi

💡 **Communication**
Informez régulièrement les parties prenantes""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR"],
        "target_modules": ["improvements"],
        "keywords": ["suivi", "avancement", "pilotage"]
    },
    
    "sec-009-03": {
        "title": "Clôturer un Projet",
        "content": """✅ **Finaliser le Projet**

**Avant Clôture**
☑️ Tous les jalons franchis
☑️ Objectifs atteints
☑️ Tests validés
☑️ Documentation complète
☑️ Formation utilisateurs (si nécessaire)

**Bilan Final**
1. Ouvrir le projet
2. Section "Bilan"
3. Remplir :
   - Objectifs atteints (Oui/Partiellement/Non)
   - Écarts budget
   - Écarts planning
   - Bénéfices réalisés
   - Leçons apprises
   - Recommandations

**Mesure des Bénéfices**
• Gains de productivité mesurés
• Économies réalisées
• ROI calculé
• Satisfaction utilisateurs

**Clôture**
Statut : "Terminé"
Génère rapport final automatique

**Capitalisation**
• Archivage documentation
• Partage bonnes pratiques
• Base de connaissance

🏆 **Célébrez !**
Remerciez l'équipe projet""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR"],
        "target_modules": ["improvements"],
        "keywords": ["clôturer", "bilan", "finaliser"]
    },
    
    # Chapitre 10 : Rapports et Analyses
    "sec-010-01": {
        "title": "Tableau de Bord Principal",
        "content": """📊 **Visualiser les KPIs**

**Accès**
Module "Rapports & Analyses" → Tableau de bord

**Indicateurs Clés**
🔧 **Ordres de Travail**
• Total OT ce mois
• En cours vs terminés
• Taux de complétion
• OT en retard

⚙️ **Maintenance Préventive**
• Respect du planning
• Maintenances dues
• Taux de réalisation

📦 **Stock**
• Articles en alerte
• Valeur du stock
• Ruptures ce mois

💰 **Coûts**
• Coût total maintenance
• Répartition préventif/curatif
• Top 5 équipements coûteux

**Période**
Sélectionnez :
• Aujourd'hui
• Cette semaine
• Ce mois
• Ce trimestre
• Cette année
• Personnalisée

**Graphiques**
• Évolution temporelle
• Répartition par catégorie
• Comparatif périodes

💡 **Actualisation**
Données mises à jour en temps réel""",
        "level": "both",
        "target_roles": [],
        "target_modules": ["reports"],
        "keywords": ["tableau de bord", "KPI", "indicateurs"]
    },
    
    "sec-010-02": {
        "title": "Rapports Prédéfinis",
        "content": """📋 **Générer des Rapports**

**Types de Rapports Disponibles**

**1. Rapport Ordres de Travail**
• Liste complète des OT
• Filtres : statut, période, équipement, technicien
• Temps passé et coûts
• Export Excel/PDF

**2. Rapport Équipements**
• Historique par équipement
• MTBF, MTTR, disponibilité
• Coûts de maintenance cumulés
• Top pannes récurrentes

**3. Rapport Maintenance Préventive**
• Planning vs réalisé
• Maintenances en retard
• Efficacité par technicien
• Détection de problèmes récurrents

**4. Rapport Stock**
• État des stocks
• Mouvements période
• Articles sans mouvement
• Valorisation

**5. Rapport Temps**
• Temps passé par technicien
• Temps par catégorie d'intervention
• Productivité
• Heures supplémentaires

**Génération**
1. Sélectionner type de rapport
2. Choisir période
3. Appliquer filtres
4. Cliquer "Générer"
5. Exporter (Excel, PDF, CSV)

💡 **Automatisation**
Programmez envoi automatique par email (hebdo, mensuel)""",
        "level": "both",
        "target_roles": [],
        "target_modules": ["reports"],
        "keywords": ["rapport", "export", "génération"]
    },
    
    "sec-010-03": {
        "title": "Analyses Avancées",
        "content": """🔬 **Analyses Approfondies**

⚠️ **Prérequis** : Rôle ADMIN, DIRECTEUR, QHSE

**Analyse de Fiabilité**
• Courbe de baignoire
• Taux de défaillance
• Prédiction pannes futures
• Équipements à remplacer

**Analyse ABC des Équipements**
• **A (Critiques)** : 20% équipements, 80% impact
• **B (Importants)** : 30% équipements, 15% impact
• **C (Standards)** : 50% équipements, 5% impact

Stratégie de maintenance adaptée à chaque classe

**Analyse Coûts**
• Ratio préventif/curatif (objectif 30/70)
• Coût par type d'intervention
• Tendance des coûts
• ROI de la GMAO

**Analyse Temps**
• Répartition temps productif/improductif
• Temps d'attente pièces
• Temps de déplacement
• Optimisation planning

**Analyse Root Cause (RCA)**
• Pannes récurrentes
• Causes profondes
• Diagramme Ishikawa
• Plan d'actions correctives

💡 **Objectif**
Passer de données à décisions""",
        "level": "advanced",
        "target_roles": ["ADMIN", "DIRECTEUR", "QHSE"],
        "target_modules": ["reports"],
        "keywords": ["analyse", "RCA", "fiabilité", "ABC"]
    },
    
    # Chapitre 11 : Administration
    "sec-011-01": {
        "title": "Gérer les Fournisseurs",
        "content": """🏪 **Gestion des Fournisseurs**

**Pourquoi Gérer les Fournisseurs ?**
• Centraliser les contacts
• Suivre les commandes et livraisons
• Évaluer les performances
• Gérer les contrats

**Ajouter un Fournisseur**
1. Module "Fournisseurs" → "+ Nouveau fournisseur"
2. Informations :
   • Nom (obligatoire)
   • Email et téléphone
   • Adresse complète
   • Type (Pièces, Services, Mixte)
   • Site web
   • Contact principal

**Informations Contractuelles**
• Conditions de paiement
• Délais de livraison moyens
• Remises accordées
• Numéro de compte
• Certification (ISO, etc.)

**Évaluation Fournisseur**
Critères d'évaluation :
• Qualité des produits/services
• Respect des délais
• Réactivité
• Prix
• Note globale sur 5

**Historique**
• Toutes les commandes
• Articles fournis
• OT liés
• Montants facturés

💡 **Astuce**
Mettez à jour régulièrement les coordonnées et évaluations""",
        "level": "beginner",
        "target_roles": ["ADMIN", "LOGISTIQUE", "ADV"],
        "target_modules": ["vendors"],
        "keywords": ["fournisseur", "vendor", "achats"]
    },
    
    "sec-011-02": {
        "title": "Organiser les Zones et Localisations",
        "content": """📍 **Gestion des Zones**

**À Quoi Servent les Zones ?**
• Organiser géographiquement les équipements
• Faciliter la localisation
• Rapports par zone
• Planification des interventions

**Structure Hiérarchique**
```
Site
  └─ Bâtiment
      └─ Étage
          └─ Zone
              └─ Sous-zone
```

**Créer une Zone**
Module "Zones" → "+ Nouvelle zone"
• Nom (obligatoire)
• Code (ex: BAT-A-R1)
• Type (Bâtiment, Atelier, Bureau, Extérieur)
• Zone parent (optionnel)
• Responsable de zone
• Superficie (m²)
• Description

**Codes de Zone**
Recommandation de nomenclature :
• **Bâtiment-Étage-Zone**
• Ex: A-01-PROD (Bâtiment A, Étage 1, Production)

**Affectation aux Équipements**
Chaque équipement doit être affecté à une zone

**Cartographie**
• Upload plan de l'usine
• Positionnement visuel des équipements (à venir)

💡 **Bonnes Pratiques**
Une structure claire = maintenance plus efficace""",
        "level": "beginner",
        "target_roles": ["ADMIN"],
        "target_modules": ["locations"],
        "keywords": ["zone", "localisation", "emplacement"]
    },
    
    "sec-011-03": {
        "title": "Gérer les Compteurs (Eau, Gaz, Électricité)",
        "content": """⚡ **Gestion des Compteurs**

**Types de Compteurs**
• EAU : Consommation d'eau
• GAZ : Consommation de gaz
• ELECTRICITE : Consommation électrique
• CHALEUR : Consommation chauffage
• AUTRE : Autres fluides

**Créer un Compteur**
Module "Compteurs" → "+ Nouveau compteur"
• Nom (ex: "Compteur électrique Atelier A")
• Type
• Numéro de série
• Emplacement
• Unité (kWh, m³, L)
• Prix unitaire (pour calcul coût)

**Saisir un Relevé**
1. Ouvrir le compteur
2. "+ Nouveau relevé"
3. Valeur du compteur
4. Date et heure du relevé
5. Notes (optionnel)
6. Sauvegarder

**Calculs Automatiques**
• **Consommation** = Relevé actuel - Relevé précédent
• **Coût** = Consommation × Prix unitaire

**Statistiques**
• Consommation par période
• Évolution temporelle
• Coûts cumulés
• Comparatif années

**Alertes**
Configuration d'alertes :
• Consommation anormale
• Relevé en retard
• Seuil de coût dépassé

💡 **Fréquence Recommandée**
Relevés mensuels minimum""",
        "level": "beginner",
        "target_roles": ["ADMIN", "RSP_PROD", "LOGISTIQUE"],
        "target_modules": ["meters"],
        "keywords": ["compteur", "consommation", "énergie", "fluide"]
    },
    
    "sec-011-04": {
        "title": "Plan de Surveillance",
        "content": """🔍 **Plan de Surveillance**

**Qu'est-ce que le Plan de Surveillance ?**
Suivi régulier de points de contrôle critiques pour la qualité, sécurité et conformité.

**Créer un Item de Surveillance**
Module "Plan de Surveillance" → "+ Nouvel item"
• Désignation (ex: "Vérification extincteurs")
• Catégorie (Sécurité, Qualité, Environnement, Équipement)
• Fréquence (Quotidienne, Hebdomadaire, Mensuelle, Trimestrielle, Annuelle)
• Responsable
• Instructions détaillées
• Critères de conformité

**Les 3 Statuts**
• 🟦 **À planifier** : Pas encore programmé
• 🟧 **Planifié** : Date définie
• 🟩 **Réalisé** : Contrôle effectué

**Réaliser un Contrôle**
1. Ouvrir l'item
2. "+ Nouveau log"
3. Date de contrôle
4. Résultat : Conforme / Non conforme
5. Commentaire détaillé
6. Upload photos si nécessaire
7. Actions correctives si non conforme

**Vues Disponibles**
• **Liste** : Tous les items
• **Grille** : Par catégorie
• **Calendrier** : Planning visuel

**Rappels Automatiques**
Email envoyé X jours avant échéance

**KPIs**
• % réalisation global
• % par catégorie
• % par responsable
• Items en retard

💡 **Conformité Réglementaire**
Documentez tout pour les audits !""",
        "level": "advanced",
        "target_roles": ["ADMIN", "QHSE"],
        "target_modules": ["surveillance"],
        "keywords": ["surveillance", "contrôle", "conformité", "audit"]
    },
    
    "sec-011-05": {
        "title": "Import et Export de Données",
        "content": """📤📥 **Import/Export de Données**

**Export de Données**
Disponible sur presque tous les modules

**Comment Exporter ?**
1. Accéder au module (ex: Ordres de Travail)
2. Appliquer filtres si nécessaire
3. Bouton "Exporter"
4. Choisir format : Excel (.xlsx) ou CSV
5. Téléchargement automatique

**Données Exportables**
• Ordres de travail
• Équipements
• Stock & inventaire
• Utilisateurs
• Maintenance préventive
• Fournisseurs
• Et plus encore...

**Import de Données**
Module "Import/Export"

**Import Simple (1 module)**
1. Sélectionner le module cible
2. Télécharger le modèle Excel
3. Remplir le fichier avec vos données
4. Upload du fichier
5. Validation et import

**Import Multiple (Tous les modules)**
1. Choisir "Toutes les données"
2. Upload fichier Excel multi-feuilles
3. Chaque feuille = 1 module
4. Import groupé

**Format du Fichier**
• Utiliser les **colonnes françaises** (Nom, Type, etc.)
• Ou **colonnes anglaises** (Name, Type, etc.)
• Les deux sont acceptés

**Gestion des Doublons**
• Mise à jour si existe
• Création si nouveau
• Compteur d'inserted/updated/skipped

⚠️ **Attention**
• Sauvegardez avant un gros import
• Testez avec quelques lignes d'abord
• Vérifiez après import

💡 **Cas d'Usage**
• Migration depuis ancien système
• Import en masse
• Mise à jour groupée
• Sauvegarde/restauration""",
        "level": "advanced",
        "target_roles": ["ADMIN"],
        "target_modules": ["import", "export"],
        "keywords": ["import", "export", "Excel", "CSV", "migration"]
    },
    
    "sec-011-06": {
        "title": "Journal d'Audit",
        "content": """📜 **Journal d'Audit (Traçabilité)**

⚠️ **Accès** : ADMIN et QHSE uniquement

**Qu'est-ce que le Journal d'Audit ?**
Enregistrement automatique de **toutes les actions** effectuées dans l'application :
• Qui a fait quoi ?
• Quand ?
• Sur quel enregistrement ?
• Avec quels changements ?

**Actions Tracées**
• **CREATE** : Création d'enregistrement
• **UPDATE** : Modification
• **DELETE** : Suppression
• **LOGIN** : Connexion utilisateur
• **LOGOUT** : Déconnexion
• **EXPORT** : Export de données
• **IMPORT** : Import de données

**Modules Tracés**
• Ordres de travail
• Équipements
• Utilisateurs
• Stock
• Maintenance préventive
• Demandes
• Améliorations
• Paramètres système
• Et tous les autres...

**Consulter le Journal**
Module "Journal d'Audit"

**Filtres Disponibles**
• Par utilisateur
• Par type d'action
• Par module/entité
• Par date/période
• Par ID d'enregistrement

**Informations Affichées**
• Date et heure précise
• Utilisateur (nom complet)
• Action effectuée
• Module concerné
• ID de l'enregistrement
• Détails des modifications

**Recherche**
Barre de recherche globale

**Export**
• Export Excel pour analyse
• Utile pour audits externes

**Cas d'Usage**
• Audit de sécurité
• Investigation après incident
• Conformité réglementaire (ISO, etc.)
• Suivi des modifications critiques
• Preuve légale

**Rétention des Données**
Les logs sont conservés indéfiniment

⚠️ **Note Importante**
Les actions dans le journal ne peuvent PAS être modifiées ou supprimées

💡 **Pour les Audits**
Filtrez par période et exportez en Excel""",
        "level": "advanced",
        "target_roles": ["ADMIN", "QHSE"],
        "target_modules": ["audit"],
        "keywords": ["audit", "log", "traçabilité", "historique"]
    },
    
    "sec-011-07": {
        "title": "Paramètres Système",
        "content": """⚙️ **Configuration Système**

⚠️ **Accès** : ADMIN uniquement

**Paramètres Généraux**
Module "Paramètres"

**Timeout d'Inactivité**
• Déconnexion automatique après X minutes d'inactivité
• Plage : 1 à 120 minutes
• Valeur par défaut : 15 minutes
• Améliore la sécurité

**Configuration SMTP/Email**
Paramètres d'envoi d'emails :
• Serveur SMTP
• Port
• Expéditeur (nom et email)
• URL de l'application
• Authentification

**Personnalisation**
• Logo de l'entreprise (à venir)
• Nom de l'application
• Couleurs du thème (à venir)

**Sauvegardes Automatiques**
• Fréquence des backups
• Rétention des sauvegardes
• Email de notification

**Limites et Quotas**
• Taille max fichiers (10 Mo)
• Nombre max d'utilisateurs
• Espace de stockage

**Sécurité**
• Politique de mots de passe
• Double authentification (à venir)
• Durée de validité token
• IP autorisées (à venir)

**Notifications**
• Activer/désactiver par type
• Destinataires par défaut
• Modèles d'emails

**Maintenance du Système**
• Nettoyer anciens logs
• Optimiser base de données
• Vérifier intégrité données

⚠️ **Attention**
Certains paramètres nécessitent redémarrage du serveur

💡 **Bonnes Pratiques**
• Configurez SMTP dès le début
• Timeout adapté à votre usage
• Backups réguliers activés""",
        "level": "advanced",
        "target_roles": ["ADMIN"],
        "target_modules": ["settings"],
        "keywords": ["paramètres", "configuration", "système", "SMTP"]
    },
    
    "sec-011-08": {
        "title": "Personnaliser l'Interface",
        "content": """🎨 **Personnalisation de l'Interface**

Module "Personnalisation"

**Organiser le Menu**
• Drag & drop pour réordonner les modules
• Afficher/masquer les modules non utilisés
• Ordre personnalisé pour chaque utilisateur

**Comment Personnaliser ?**
1. Module "Personnalisation"
2. Section "Organisation du menu"
3. Cocher les modules à afficher
4. Glisser-déposer pour réordonner
5. Bouton "Sauvegarder l'ordre"

**Modules Disponibles**
• Dashboard
• Ordres de travail
• Équipements
• Maintenance préventive
• Demandes d'intervention
• Demandes d'amélioration
• Améliorations
• Stock & Inventaire
• Fournisseurs
• Zones
• Compteurs
• Plan de surveillance
• Équipes
• Rapports & Analyses
• Journal d'audit
• Paramètres
• Import/Export
• Historique d'achat

**Mettre à Jour les Menus**
Si de nouveaux modules sont disponibles :
Bouton "Mettre à jour mes menus"

**Restaurer par Défaut**
Bouton "Réinitialiser" pour revenir à l'ordre initial

💡 **Conseil**
Placez en haut les modules que vous utilisez le plus""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["personalization"],
        "keywords": ["personnalisation", "menu", "interface"]
    },
    
    "sec-011-09": {
        "title": "Gestion des Rôles et Permissions",
        "content": """👥 **Gestion des Rôles**

⚠️ **Accès** : ADMIN uniquement

**Accéder à la Gestion des Rôles** :
1. Module **Utilisateurs**
2. Bouton **"Gestion des rôles"** (violet, en haut)

**Rôles Système (Non modifiables)** :
• **ADMIN** : Accès complet, toutes les permissions
• **TECHNICIEN** : Accès aux OT, équipements, stock
• **VISUALISEUR** : Lecture seule sur tous les modules

**Créer un Rôle Personnalisé** :
1. Cliquer **"+ Nouveau rôle"**
2. **Nom** : Ex: "Chef d'équipe Mécanique"
3. **Code** : Ex: "CHEF_MECA" (unique)
4. **Description** : Usage du rôle
5. Configurer les **permissions par module** :
   • ✅ Visualiser
   • ✏️ Éditer
   • 🗑️ Supprimer
6. **Créer**

**Modules Configurables** :
• Dashboard, Ordres de travail, Équipements
• Maintenance préventive, Stock, Demandes
• Améliorations, Projets, Rapports
• Zones, Compteurs, Surveillance
• Fournisseurs, Import/Export, etc.

**Assigner les Responsables de Service** :
1. Onglet **"Responsables de service"**
2. Sélectionner un **service** (Production, Maintenance, etc.)
3. Choisir l'**utilisateur** responsable
4. **Sauvegarder**

**Avantages des Rôles Personnalisés** :
• Principe du **moindre privilège**
• Contrôle fin des accès
• Audit et conformité facilités

💡 **Astuce** : Créez des rôles pour chaque profil métier de votre organisation.""",
        "level": "advanced",
        "target_roles": ["ADMIN"],
        "target_modules": ["people"],
        "keywords": ["rôle", "permission", "accès", "responsable", "service"]
    },
    
    "sec-011-10": {
        "title": "Interface et Aide Contextuelle",
        "content": """💡 **Aide Contextuelle et Tooltips**

GMAO Iris dispose d'un système d'**aide contextuelle enrichie** pour faciliter l'utilisation.

**Tooltips Enrichis** :
Survolez les icônes et boutons pour voir :
• **Titre** de l'action
• **Description** détaillée
• Informations contextuelles (compteurs, statuts)

**Exemples de Tooltips** :
• 🔔 **Cloche notifications** : "4 notifications en attente"
• ⚙️ **Roue dentée alertes** : "Alertes système - 0 alerte en attente"
• 📦 **Package inventaire** : Détail des articles en alerte
• 👁️ **Œil surveillance** : Taux de réalisation, échéances proches

**Bouton d'Aide** :
En haut de chaque page :
1. Cliquer sur le bouton **"?"** ou **"Aide"**
2. Décrivez votre problème
3. Une capture d'écran automatique est jointe
4. Envoi aux administrateurs

**Manuel Utilisateur** :
1. Bouton **"Manuel"** (en haut à droite)
2. Navigation par chapitres
3. Recherche par mots-clés
4. Filtrage par niveau (débutant, intermédiaire, avancé)

💡 **Astuce** : Utilisez la barre de recherche du manuel pour trouver rapidement une information.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["aide", "tooltip", "infobulle", "manuel", "support"]
    },
    
    # Chapitre 12 : FAQ et Dépannage
    "sec-012-01": {
        "title": "Problèmes de Connexion",
        "content": """🔐 **Problèmes de Connexion**

**Je ne peux pas me connecter**

**Cause 1 : Mauvais mot de passe**
✅ Solution :
• Cliquez sur "Mot de passe oublié ?"
• Recevez un email de réinitialisation
• Créez un nouveau mot de passe

**Cause 2 : Compte désactivé**
✅ Solution :
• Contactez votre administrateur
• Votre compte doit être réactivé

**Cause 3 : Email incorrect**
✅ Solution :
• Vérifiez l'orthographe de votre email
• Contactez l'administrateur pour vérifier

**Cause 4 : Première connexion**
✅ Solution :
• Vérifiez votre boîte email (invitation)
• Cliquez sur le lien d'activation
• Complétez votre inscription

**Je dois changer mon mot de passe**
1. Première connexion → Dialog automatique
2. Option "Changer" ou "Conserver le mot de passe temporaire"
3. Si changement ultérieur : Profil → "Paramètres" → "Changer mot de passe"

**Mot de passe oublié**
1. Page de connexion → "Mot de passe oublié ?"
2. Saisissez votre email
3. Recevez un email avec lien
4. Cliquez sur le lien (valide 1h)
5. Créez un nouveau mot de passe

**Session expirée**
• Normal après 15 min d'inactivité (paramètre)
• Reconnectez-vous
• Votre travail non sauvegardé peut être perdu

💡 **Conseil**
Enregistrez régulièrement votre travail""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["connexion", "mot de passe", "login", "problème"]
    },
    
    "sec-012-02": {
        "title": "Erreurs Courantes",
        "content": """⚠️ **Erreurs Courantes et Solutions**

**"Erreur 404 - Page non trouvée"**
Cause : URL incorrecte ou page supprimée
✅ Solution :
• Vérifiez l'URL
• Retournez à l'accueil
• Utilisez le menu de navigation

**"Erreur 403 - Accès refusé"**
Cause : Permissions insuffisantes
✅ Solution :
• Contactez votre administrateur
• Demandez les permissions nécessaires
• Vérifiez votre rôle

**"Erreur 500 - Erreur serveur"**
Cause : Problème technique serveur
✅ Solution :
• Rafraîchissez la page (F5)
• Attendez quelques minutes
• Si persiste : Bouton "Aide" avec screenshot
• Contactez le support technique

**"Impossible de charger les données"**
Cause : Problème de connexion ou API
✅ Solution :
• Vérifiez votre connexion internet
• Rafraîchissez la page
• Videz le cache (Ctrl+Shift+Delete)
• Essayez un autre navigateur

**Upload de fichier échoue**
Cause : Fichier trop volumineux ou format non supporté
✅ Solution :
• Max 10 Mo par fichier
• Formats supportés : JPG, PNG, PDF
• Compressez les images
• Utilisez un convertisseur si besoin

**Données non sauvegardées**
Cause : Session expirée ou erreur réseau
✅ Solution :
• Vérifiez la connexion
• Reconnectez-vous
• Ressaisissez les données
• Message de confirmation à chaque sauvegarde

**Page se charge lentement**
Causes possibles :
• Connexion internet lente
• Beaucoup de données à charger
• Navigateur surchargé

✅ Solutions :
• Utilisez les filtres pour réduire les données
• Fermez onglets inutiles
• Videz le cache navigateur
• Utilisez Chrome/Firefox récent

💡 **En Dernier Recours**
Utilisez le bouton "Aide" pour envoyer un rapport avec screenshot""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["erreur", "bug", "problème", "dépannage"]
    },
    
    "sec-012-03": {
        "title": "Optimiser les Performances",
        "content": """⚡ **Améliorer les Performances**

**Navigateur Recommandé**
• ✅ Chrome (dernière version)
• ✅ Firefox (dernière version)
• ✅ Edge (dernière version)
• ⚠️ Safari (compatible mais moins testé)
• ❌ Internet Explorer (non supporté)

**Vider le Cache**
Régulièrement (1 fois/mois)
• Chrome/Firefox : Ctrl + Shift + Delete
• Cocher "Images et fichiers en cache"
• Dernière heure ou 24h
• Cliquer "Effacer"

**Désactiver Extensions**
Certaines extensions peuvent ralentir :
• Bloqueurs de pub trop agressifs
• Gestionnaires de mots de passe (parfois)
• Outils de capture
→ Désactivez temporairement pour tester

**Utiliser les Filtres**
• Ne chargez pas "Toutes les données" si inutile
• Filtrez par date (ce mois, cette semaine)
• Filtrez par statut
• Recherche ciblée

**Pagination**
• Les listes affichent 20-50 items par page
• Utilisez la pagination en bas
• Ne chargez pas tout d'un coup

**Connexion Internet**
• Min 2 Mbps recommandé
• WiFi stable
• Évitez 4G si instable

**Fermer Onglets Inutiles**
• 1 seul onglet GMAO Iris
• Libère mémoire RAM

**Recharger la Page**
Si lent après longue session :
• F5 pour recharger
• Ou Ctrl + F5 (rechargement complet)

**Résolution d'Écran**
• Min 1366×768
• Recommandé : 1920×1080
• Fonctionne aussi sur tablette

**Mettre à Jour Navigateur**
• Vérifiez les mises à jour
• Menu → Aide → À propos
• Update automatique ou manuel

💡 **Astuce Pro**
Mode sombre = moins de consommation batterie (à venir)""",
        "level": "both",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["performance", "lenteur", "optimisation", "navigateur"]
    },
    
    "sec-012-04": {
        "title": "Utiliser le Bouton Aide",
        "content": """❓ **Fonction d'Aide Intégrée**

**Accès**
Bouton "Aide" en haut à droite du header

**À Quoi Ça Sert ?**
• Signaler un bug
• Demander de l'assistance
• Poser une question
• Suggérer une amélioration

**Comment Ça Marche ?**
1. Cliquez sur "Aide"
2. Une capture d'écran est automatiquement prise
3. Formulaire s'ouvre
4. Remplissez :
   - Objet (titre court)
   - Description détaillée du problème
   - Catégorie (Bug, Question, Suggestion)
5. Screenshot est joint automatiquement
6. Cliquez "Envoyer"

**Capture d'Écran Automatique**
• Capture exactement ce que vous voyez
• Inclut messages d'erreur
• Facilite le diagnostic
• Pas besoin de faire vous-même

**Temps de Réponse**
• Bugs critiques : < 4h
• Problèmes importants : < 24h
• Questions : < 48h
• Suggestions : Variable

**Suivi de Votre Demande**
• Vous recevez un numéro de ticket par email
• Réponse par email
• Historique consultable (à venir)

**Que Mettre dans la Description ?**
✅ **Bon exemple** :
"Lorsque je clique sur 'Sauvegarder' dans la création d'OT, j'obtiens une erreur 500. J'ai essayé sur Chrome et Firefox, même problème. Mes informations : titre 'Réparation pompe', équipement 'Pompe-001'."

❌ **Mauvais exemple** :
"Ça marche pas"

**Informations Utiles**
• Ce que vous faisiez
• Message d'erreur exact
• Navigateur utilisé
• Essais déjà effectués
• Données concernées

**Limitations**
• Rate limit : 15 demandes par heure
• Pour éviter spam
• Si dépassé : Attendez 1h

💡 **N'hésitez Pas !**
Aucune question n'est bête. Nous sommes là pour vous aider.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["aide", "support", "assistance", "bug", "question"]
    },
    
    "sec-012-05": {
        "title": "Meilleures Pratiques Générales",
        "content": """✨ **Meilleures Pratiques GMAO Iris**

## 📝 Saisie des Données

**Soyez Précis**
• Titres descriptifs mais courts
• Descriptions détaillées
• Tous les champs remplis
• Orthographe correcte

**Utilisez les Photos**
• Avant/après intervention
• Problèmes constatés
• Preuves de conformité
• Équipements/pièces

## 🕐 Mise à Jour en Temps Réel

**Changez les Statuts**
• OT : Dès que vous commencez/terminez
• Équipements : État réel
• Stock : À chaque mouvement

**Saisissez les Temps**
• Temps passé sur chaque OT
• Permet calculs de productivité
• Utile pour préventif

## 🔒 Sécurité

**Déconnectez-Vous**
• En partant
• Si vous prêtez votre PC
• Sur PC partagé

**Mot de Passe Fort**
• Min 8 caractères
• Majuscules + minuscules
• Chiffres + symboles
• Ne partagez jamais

**Permissions Minimales**
• Ne demandez que ce dont vous avez besoin
• Principe du moindre privilège

## 💬 Communication

**Commentez**
• Sur les OT : Avancements, problèmes
• Sur équipements : Observations
• Sur demandes : Précisions

**Assignez Correctement**
• Bon technicien pour bon OT
• Compétences adaptées
• Charge de travail équilibrée

## 📊 Exploitez les Données

**Consultez les Rapports**
• Identifiez tendances
• Anticipez problèmes
• Optimisez ressources

**Historique**
• Avant intervention : Vérifiez historique
• Souvent la solution est là

## 🔄 Amé lioration Continue

**Proposez des Améliorations**
• Vous utilisez l'outil au quotidien
• Vos idées comptent
• Module "Demandes d'amélioration"

**Formez-Vous**
• Lisez ce manuel
• Explorez les fonctionnalités
• Demandez formation si besoin

## 🎯 Objectifs Généraux

**Taux de Complétion OT** : > 95%
**Respect Planning Préventif** : > 95%
**Taux de Saisie Temps** : 100%
**Qualité Données** : Pas de champs vides

💡 **Règle d'Or**
Si ce n'est pas dans la GMAO, ça n'existe pas !
Documentez tout.""",
        "level": "both",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["bonnes pratiques", "conseils", "qualité", "efficacité"]
    },
    
    "sec-013-01": {
        "title": "Utiliser le Chat Live",
        "content": """### Communication en Temps Réel

Le module **Chat Live** permet aux équipes de communiquer instantanément.

**Fonctionnalités** :
1. Messages instantanés entre utilisateurs
2. Notifications en temps réel
3. Historique des conversations
4. Pièces jointes possibles

**Utilisation** :
- Module **Chat Live**
- Sélectionner un utilisateur ou créer un groupe
- Envoyer des messages
- Recevoir des notifications""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["chatLive"],
        "keywords": ["chat", "communication", "messagerie"]
    },
    
    "sec-014-01": {
        "title": "Configurer MQTT",
        "content": """### Configuration du Broker MQTT

Pour connecter vos capteurs IoT :

1. Module **Administration** > **Paramètres MQTT**
2. Renseigner :
   - Adresse du broker MQTT
   - Port (1883 par défaut)
   - Nom d'utilisateur
   - Mot de passe
   - ID Client
3. **Sauvegarder** et **Connecter**
4. Vérifier le statut de connexion""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["sensors"],
        "keywords": ["mqtt", "iot", "configuration", "capteurs"]
    },
    
    "sec-014-02": {
        "title": "Gérer les Capteurs IoT",
        "content": """### Ajouter et Surveiller les Capteurs

**Ajouter un Capteur** :
1. Module **Capteurs MQTT**
2. **+ Nouveau Capteur**
3. Nom, Type, Topic MQTT
4. Seuils d'alerte (min/max)
5. **Enregistrer**

**Surveillance** :
- Dashboard temps réel
- Graphiques d'évolution
- Alertes automatiques si seuils dépassés
- Historique des mesures""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["sensors"],
        "keywords": ["capteurs", "monitoring", "iot", "alertes"]
    },
    
    "sec-015-01": {
        "title": "Créer une Demande d'Achat",
        "content": """### Soumettre une Demande d'Achat

1. Module **Demandes d'Achat**
2. **+ Nouvelle Demande**
3. Remplir :
   - Article demandé
   - Quantité
   - Justification
   - Urgence
   - Fournisseur suggéré (optionnel)
4. **Soumettre**

**Workflow** :
- Soumise → En attente d'approbation
- Approuvée → Commande créée
- Refusée → Notification avec motif""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["purchaseRequests"],
        "keywords": ["achat", "approvisionnement", "commande"]
    },
    
    "sec-016-01": {
        "title": "Organiser les Zones",
        "content": """### Créer et Gérer les Zones

Les zones permettent de localiser vos équipements.

1. Module **Zones**
2. **+ Nouvelle Zone**
3. Nom, Bâtiment, Étage, Description
4. **Enregistrer**

**Hiérarchie** :
- Site → Bâtiment → Étage → Zone → Sous-zone

**Utilité** :
- Localiser rapidement les équipements
- Filtrer les OT par zone
- Rapports par zone""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["locations"],
        "keywords": ["zones", "localisation", "bâtiments"]
    },
    
    "sec-017-01": {
        "title": "Suivre les Compteurs",
        "content": """### Gérer les Compteurs d'Équipements

Les compteurs suivent les heures de fonctionnement, km, cycles, etc.

**Créer un Compteur** :
1. Dans la fiche Équipement
2. Onglet **Compteurs**
3. **+ Nouveau Compteur**
4. Type, Unité, Valeur initiale
5. **Enregistrer**

**Relever un Compteur** :
- Saisir la nouvelle valeur
- Date et heure enregistrées
- Calcul automatique des écarts
- Déclenchement préventif basé sur compteur""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["meters"],
        "keywords": ["compteurs", "heures", "cycles"]
    },
    
    "sec-018-01": {
        "title": "Mettre en Place un Plan de Surveillance",
        "content": """### Organiser la Surveillance

Le plan de surveillance définit les rondes et vérifications.

**Créer un Plan** :
1. Module **Plan de Surveillance**
2. **+ Nouveau Plan**
3. Zones concernées
4. Points de contrôle
5. Fréquence des rondes
6. Affectation des responsables

**Exécution** :
- Liste des points à vérifier
- Constatations et photos
- Génération automatique d'OT si anomalie""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["surveillance"],
        "keywords": ["surveillance", "rondes", "inspection"]
    },
    
    "sec-019-01": {
        "title": "Déclarer un Presqu'accident",
        "content": """### Signaler les Presqu'accidents

Les presqu'accidents sont des événements qui auraient pu causer un accident.

**Déclarer** :
1. Module **Presqu'accidents**
2. **+ Nouveau Presqu'accident**
3. Description de l'événement
4. Localisation
5. Causes potentielles
6. Personnes impliquées
7. Photos si disponibles
8. **Enregistrer**

**Suivi** :
- Analyse des causes
- Actions correctives
- Prévention des accidents futurs""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["presquaccident"],
        "keywords": ["sécurité", "presqu'accident", "prévention"]
    },
    
    "sec-020-01": {
        "title": "Gérer la Documentation",
        "content": """### Ajouter et Organiser les Documents

Le module Documentations centralise tous vos fichiers techniques et formulaires par pôle.

**Structure des Pôles** :
Chaque pôle (zone, atelier) possède sa propre arborescence :
• 📁 Documents (PDF, images, manuels)
• 📋 Bons de travail
• 📜 Autorisations particulières
• 📝 Formulaires personnalisés

**Naviguer dans les Documents** :
1. Module **Documentations**
2. Cliquer sur un **Pôle**
3. Navigation en **arborescence dépliable** par catégorie
4. Cliquer sur un document pour le télécharger

**Ajouter un Document** :
1. Accéder au détail d'un pôle
2. Section Documents → **"+ Document"**
3. Titre, Type de document
4. Upload du fichier (PDF, Excel, Word, images...)
5. **Enregistrer**

**Recherche et Consultation** :
• Recherche par mot-clé
• Filtres par catégorie
• Téléchargement direct
• Historique des modifications""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["documentations"],
        "keywords": ["documentation", "fichiers", "manuels", "pôles"]
    },
    
    "sec-020-02": {
        "title": "Modèles de Formulaires",
        "content": """### Gérer les Modèles de Formulaires

Les **Modèles de Formulaires** permettent de créer des formulaires réutilisables pour standardiser vos processus.

**Accéder à la Page Modèles** (Admin uniquement) :
1. Module **Documentations**
2. Bouton **"Modèles de formulaires"** (en haut)

**Types de Modèles** :
• 📋 **Modèles Système** : Pré-définis (Bon de travail, Autorisation particulière) - Non modifiables
• ✏️ **Modèles Personnalisés** : Créés par les administrateurs

**Créer un Formulaire à partir d'un Modèle** :
1. Accéder au détail d'un **Pôle**
2. Section Formulaires → **"+ Formulaire"**
3. Sélectionner le modèle souhaité
4. Remplir les champs du formulaire
5. **Sauvegarder**

**Utilisation des Bons de Travail** :
1. Pôle → Section "Bons de travail" → **"+ Bon"**
2. Remplir : Équipement, Description, Personnel
3. Zone de signature tactile
4. Enregistrer

**Utilisation des Autorisations Particulières** :
1. Pôle → Section "Autorisations" → **"+ Autorisation"**
2. Remplir le formulaire complet
3. Signatures multiples si nécessaire
4. Enregistrer et imprimer""",
        "level": "intermediate",
        "target_roles": ["ADMIN"],
        "target_modules": ["documentations"],
        "keywords": ["modèle", "formulaire", "bon de travail", "autorisation"]
    },
    
    "sec-020-03": {
        "title": "Créateur de Formulaires Personnalisés",
        "content": """### Créer vos Propres Formulaires

Le **Créateur de Formulaires** permet aux administrateurs de concevoir des formulaires sur mesure.

**Accéder au Créateur** :
1. Module **Documentations**
2. Bouton **"Modèles de formulaires"**
3. **"+ Nouveau modèle personnalisé"**

**Types de Champs Disponibles** :
• 📝 **Texte** : Champ texte simple
• 📄 **Zone de texte** : Texte multiligne
• 🔢 **Nombre** : Valeurs numériques
• 📅 **Date** : Sélecteur de date
• ☑️ **Case à cocher** : Oui/Non
• 🔘 **Interrupteur** : Activation/Désactivation
• 📋 **Liste déroulante** : Choix parmi options
• ✍️ **Signature** : Zone de signature tactile
• 📎 **Téléchargement fichier** : Upload de documents

**Créer un Formulaire Personnalisé** :
1. **Nom du modèle** : Ex: "Checklist sécurité"
2. **Description** : Usage du formulaire
3. **Ajouter des champs** : Glisser-déposer
4. Pour chaque champ :
   • Libellé (question)
   • Type de champ
   • Obligatoire ou non
   • Options (pour les listes)
5. **Réorganiser** les champs par glisser-déposer
6. **Enregistrer**

**Utiliser le Formulaire** :
1. Pôle → Formulaires → **"+ Formulaire"**
2. Choisir votre modèle personnalisé
3. Remplir et sauvegarder

💡 **Astuce** : Créez des checklists de contrôle, des rapports d'inspection, des fiches de non-conformité personnalisées.""",
        "level": "advanced",
        "target_roles": ["ADMIN"],
        "target_modules": ["documentations"],
        "keywords": ["créateur", "formulaire", "personnalisé", "drag-drop", "signature"]
    },
    
    "sec-021-01": {
        "title": "Utiliser le Planning",
        "content": """### Planifier les Interventions

Le Planning affiche toutes les interventions et maintenances.

**Fonctionnalités** :
1. Vue calendrier avec tous les ordres de travail
2. Drag & drop pour réorganiser
3. Filtrer par technicien, zone, type
4. Exporter le planning

**Utilisation** :
- Module **Planning**
- Visualiser les OT à venir
- Glisser-déposer pour réaffecter
- Identifier les surcharges
- Optimiser les tournées""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["planning"],
        "keywords": ["planning", "calendrier", "organisation"]
    },
    
    "sec-022-01": {
        "title": "Gérer les Fournisseurs",
        "content": """### Ajouter et Gérer les Fournisseurs

**Ajouter un Fournisseur** :
1. Module **Fournisseurs**
2. **+ Nouveau Fournisseur**
3. Nom, Contact, Adresse, Email, Téléphone
4. Spécialités et domaines
5. **Enregistrer**

**Utilisation** :
- Associer aux pièces fournies
- Historique des commandes
- Évaluation des fournisseurs
- Contacts rapides""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["vendors"],
        "keywords": ["fournisseurs", "contacts", "achats"]
    },
    
    "sec-023-01": {
        "title": "Import / Export de Données",
        "content": """### Importer et Exporter

**Import** :
1. Module **Import / Export**
2. **Import**
3. Sélectionner le type (équipements, pièces, etc.)
4. Upload fichier Excel/CSV
5. Mapper les colonnes
6. **Importer**

**Export** :
- Exporter toutes vos données en Excel
- Choisir les modules à exporter
- Sauvegardes régulières recommandées

💡 **Conseil** : Effectuez des exports réguliers pour sauvegarder vos données""",
        "level": "advanced",
        "target_roles": [],
        "target_modules": ["importExport"],
        "keywords": ["import", "export", "excel", "csv", "données"]
    },
    
    # Chapitre 24 : Assistant IA
    "sec-024-01": {
        "title": "Présentation de l'Assistant IA",
        "content": """🤖 **Votre Assistant IA Personnalisé**

GMAO Iris intègre un assistant IA intelligent qui vous aide à utiliser l'application efficacement.

📌 **Qu'est-ce que l'Assistant IA ?**

L'assistant IA (nommé "Adria" par défaut) est un chatbot intelligent qui peut :

• Répondre à vos questions sur l'utilisation de GMAO Iris
• Vous guider dans la création d'ordres de travail, équipements, etc.
• Naviguer automatiquement vers les pages demandées
• Analyser vos données et statistiques
• Vous aider à résoudre des problèmes courants

🎯 **Comment accéder à l'Assistant IA ?**

1. **Bouton dans la barre de navigation**
   • Cliquez sur le bouton robot (ex: "Adria") en haut à droite
   • À côté des boutons "Manuel" et "Aide"

2. **Menu contextuel (clic droit)**
   • Faites un clic droit n'importe où dans l'application
   • Sélectionnez "Discuter avec Adria"
   • L'assistant connaîtra le contexte de la page où vous êtes

💬 **Fonctionnalités du Chat**

• **Actions rapides** : Boutons pour créer un OT, ajouter un équipement, etc.
• **Navigation automatique** : L'IA peut vous diriger vers les pages demandées
• **Historique** : Vos conversations sont sauvegardées
• **Multilingue** : Répond dans la langue de votre interface

💡 **Astuce** : Posez vos questions en langage naturel, l'assistant comprend le contexte !""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["ia", "assistant", "chatbot", "adria", "aide", "intelligence artificielle"]
    },
    
    "sec-024-02": {
        "title": "Personnalisation de l'Assistant IA",
        "content": """⚙️ **Personnaliser votre Assistant IA**

Vous pouvez configurer l'assistant IA selon vos préférences dans le menu Personnalisation.

📍 **Accéder aux paramètres IA**

1. Menu latéral → **Personnalisation**
2. Cliquez sur l'onglet **IA**

🎨 **Options de personnalisation**

**1. Nom de l'assistant**
• Par défaut : "Adria"
• Changez-le pour un nom de votre choix
• Ce nom apparaîtra dans le bouton et les conversations

**2. Genre de l'assistant**
• Femme (par défaut) ou Homme
• Affecte le ton des réponses ("assistante" vs "assistant")

**3. Fournisseur LLM**
• **Google Gemini** (par défaut, via clé Emergent)
• **OpenAI GPT** (GPT-4o, GPT-5.1)
• **Anthropic Claude** (Claude 4 Sonnet)
• **DeepSeek** (nécessite clé API globale)
• **Mistral** (nécessite clé API globale)

**4. Modèle**
• Choisissez le modèle selon le fournisseur sélectionné
• Les modèles recommandés sont marqués

📊 **Aperçu en temps réel**

• Visualisez l'apparence de votre assistant avant de sauvegarder
• Affiche le nom, le genre et le fournisseur sélectionnés

💾 **Sauvegarder**

Cliquez sur "Sauvegarder les préférences IA" pour appliquer vos modifications.

💡 **Note** : Chaque utilisateur peut avoir ses propres préférences IA.""",
        "level": "beginner",
        "target_roles": [],
        "target_modules": ["personnalisation"],
        "keywords": ["personnalisation", "configuration", "ia", "llm", "gemini", "openai", "claude"]
    },
    
    "sec-024-03": {
        "title": "Configuration des Clés API LLM (Admin)",
        "content": """🔐 **Configuration des Clés API pour les Fournisseurs LLM**

*Cette section est réservée aux administrateurs.*

📍 **Accéder aux paramètres**

1. Menu latéral → **Paramètres Spéciaux**
2. Faites défiler jusqu'à la section **Clés API - Fournisseurs LLM**

🔑 **Types de clés**

**Clé Emergent (pré-configurée)**
• Fonctionne automatiquement pour : Gemini, OpenAI, Claude
• Aucune configuration requise

**Clés API globales (optionnelles)**
• **DeepSeek** : Obtenez votre clé sur platform.deepseek.com
• **Mistral** : Obtenez votre clé sur console.mistral.ai

⚙️ **Configurer une clé API**

1. Entrez la clé dans le champ correspondant
2. Utilisez l'icône œil pour afficher/masquer la clé
3. Cliquez sur "Sauvegarder les clés API"

📅 **Vérification des versions LLM**

L'application vérifie automatiquement les nouvelles versions :
• **Automatique** : Chaque lundi à 03h00 GMT
• **Manuelle** : Bouton "Vérifier maintenant"

Vous recevrez une notification email si de nouvelles versions sont disponibles.

⚠️ **Important**

• Les clés API sont stockées de manière sécurisée
• Elles sont masquées dans l'interface après sauvegarde
• Seuls les administrateurs peuvent les modifier""",
        "level": "advanced",
        "target_roles": ["admin"],
        "target_modules": ["specialSettings"],
        "keywords": ["api", "clé", "llm", "deepseek", "mistral", "admin", "configuration"]
    },
    
    "sec-024-04": {
        "title": "Utilisation Avancée de l'Assistant IA",
        "content": """🚀 **Fonctionnalités Avancées de l'Assistant IA**

Découvrez comment tirer le meilleur parti de votre assistant IA.

📋 **Actions Rapides**

Au démarrage d'une conversation, des boutons d'action rapide sont disponibles :

• 📋 **Créer un OT** : Navigation directe vers la création d'ordre de travail
• 🔧 **Ajouter équipement** : Accès rapide à l'ajout d'équipement
• 📊 **Dashboard** : Retour au tableau de bord
• 📡 **Capteurs IoT** : Accès aux capteurs MQTT

🎯 **Navigation Assistée**

L'assistant peut :
• Naviguer automatiquement vers les pages demandées
• Surligner les éléments importants sur la page
• Afficher des flèches et tooltips de guidage
• Vous accompagner étape par étape dans une procédure

💬 **Questions Contextuelles**

Utilisez le clic droit pour poser des questions contextuelles :
1. Clic droit sur un élément (équipement, OT, etc.)
2. Sélectionnez "Discuter avec [nom de l'IA]"
3. L'assistant connaîtra automatiquement le contexte

📝 **Exemples de questions**

• "Comment créer un ordre de travail ?"
• "Explique-moi la maintenance préventive"
• "Emmène-moi vers les capteurs IoT"
• "Comment ajouter un équipement avec MQTT ?"
• "Quelles sont les statistiques du mois ?"

🔄 **Gestion de l'historique**

• Les conversations sont sauvegardées par session
• Cliquez sur l'icône poubelle pour effacer l'historique
• Chaque nouvelle session commence une nouvelle conversation

💡 **Conseils pour de meilleures réponses**

1. Soyez précis dans vos questions
2. Utilisez le vocabulaire de GMAO (OT, équipement, etc.)
3. Précisez le contexte si nécessaire
4. N'hésitez pas à demander des clarifications""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": [],
        "keywords": ["avancé", "navigation", "guidage", "actions rapides", "contextuel"]
    },
    
    # Chapitre 25 : Fonctions Responsable de Service
    "sec-025-01": {
        "title": "Introduction aux fonctions de responsable",
        "content": """## Rôle du Responsable de Service

Le responsable de service dispose de fonctionnalités avancées pour superviser et gérer son équipe et les activités de son département.

### Accès aux fonctions de responsable

Pour être reconnu comme responsable de service, un administrateur doit vous assigner via :
1. Aller dans **Gestion des rôles** (depuis la page Équipe)
2. Onglet **Responsables de service**
3. Sélectionner votre service et vous assigner comme responsable

### Fonctionnalités disponibles

Une fois assigné comme responsable, vous bénéficiez de :
- **Filtrage automatique** : Les données affichées sont automatiquement filtrées pour votre service
- **Dashboard Service** : Tableau de bord personnalisé avec widgets configurables
- **Vue Équipe** : Visualisation de votre équipe et de leurs activités
- **Statistiques** : Indicateurs de performance de votre service""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "keywords": ["responsable", "service", "manager", "supervision", "accès"]
    },
    
    "sec-025-02": {
        "title": "Filtrage automatique par service",
        "content": """## Filtrage Automatique des Données

### Comment ça fonctionne

Lorsque vous êtes identifié comme responsable d'un service, l'application filtre automatiquement les données sur plusieurs pages pour n'afficher que les éléments de votre service.

### Pages avec filtrage automatique

| Page | Champ filtré | Effet |
|------|--------------|-------|
| Ordres de travail | service | Seuls les OT de votre service sont affichés |
| Équipements | service | Seuls les équipements de votre service sont affichés |
| Maintenance préventive | service | Filtrées par service |
| Demandes d'intervention | service | Filtrées par service |
| Demandes d'amélioration | service | Filtrées par service |
| Presqu'accidents | service | Filtrées par service |

### Indicateur visuel

Un **badge bleu** s'affiche à côté du titre de la page pour indiquer que le filtrage est actif :

📋 Ordres de travail   🏢 Service : Maintenance

Ce badge vous rappelle que vous ne voyez que les données de votre service.

### Différence avec un administrateur

| Utilisateur | Comportement |
|-------------|--------------|
| **Administrateur** | Voit toutes les données de tous les services |
| **Responsable de service** | Voit uniquement les données de son/ses service(s) |
| **Utilisateur normal** | Voit les données de son propre service |

### Gestion de plusieurs services

Si vous êtes responsable de plusieurs services, les données de tous ces services seront affichées. Le système combine automatiquement les filtres.""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "keywords": ["filtrage", "automatique", "service", "badge", "données"]
    },
    
    "sec-025-03": {
        "title": "Vue Équipe (Mon Équipe)",
        "content": """## Page Mon Équipe

### Accès

1. Cliquez sur **Dashboard Service** dans le menu latéral
2. Cliquez sur le bouton **Mon Équipe** ou accédez directement via l'URL /service-dashboard/team

### Informations affichées

#### En-tête
- Nom du service géré
- Nombre total de membres dans l'équipe

#### Statistiques rapides (4 cartes)
- **OT en cours** : Nombre d'ordres de travail en cours dans votre service
- **OT en attente** : Nombre d'ordres de travail en attente
- **Équip. en panne** : Nombre d'équipements actuellement en panne
- **Taux complétion** : Pourcentage d'OT terminés sur le total

#### Liste des membres
Un tableau affiche tous les membres de votre équipe avec :
- **Nom** : Prénom et nom de l'utilisateur
- **Email** : Adresse email professionnelle
- **Rôle** : Fonction dans l'entreprise (Technicien, Admin, etc.)
- **Service** : Service d'appartenance
- **Statut** : Actif ou Inactif

### Recherche

Utilisez la barre de recherche pour filtrer les membres par :
- Nom ou prénom
- Email
- Rôle

### Permissions requises

Pour accéder à cette page, vous devez être :
- Assigné comme responsable de service, **OU**
- Avoir le rôle Administrateur""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "keywords": ["équipe", "team", "membres", "statistiques", "vue"]
    },
    
    "sec-025-04": {
        "title": "Dashboard Service personnalisé",
        "content": """## Dashboard Service

### Accès

Cliquez sur **Dashboard Service** dans le menu latéral (visible uniquement pour les responsables de service et administrateurs).

### Fonctionnalités

Le Dashboard Service vous permet de créer des **widgets personnalisés** pour suivre les indicateurs importants de votre service.

### Types de widgets disponibles

| Type | Description |
|------|-------------|
| Valeur simple | Affiche une valeur numérique avec unité |
| Jauge | Affiche une valeur avec un indicateur visuel circulaire |
| Graphique ligne | Tendance sur une période |
| Graphique barres | Comparaison de valeurs |
| Camembert | Répartition en pourcentages |
| Tableau | Données sous forme de tableau |

### Sources de données

Les widgets peuvent puiser leurs données de :
- **Données GMAO** : Statistiques automatiques (OT, équipements, inventaire, etc.)
- **Fichiers Excel** : Via partage SMB (avec credentials si nécessaire)
- **Valeurs manuelles** : Saisie directe
- **Formules** : Combinaison de plusieurs sources

### Création d'un widget

1. Cliquez sur **+ Créer un widget** ou utilisez un modèle prédéfini
2. Remplissez les informations générales (nom, description)
3. Configurez la source de données
4. Choisissez le type de visualisation
5. Définissez les options de partage

### Modèles prédéfinis

14 modèles sont disponibles pour créer rapidement des widgets courants :
- Compteur OT ouvert
- Taux de disponibilité équipements
- Stock critique
- Et plus encore...

### Partage de widgets

Vous pouvez partager vos widgets avec :
- Uniquement vous (privé)
- Votre service
- Les administrateurs
- Des rôles spécifiques""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "keywords": ["dashboard", "widgets", "personnalisation", "indicateurs", "graphiques"]
    },
    
    "sec-025-05": {
        "title": "Bonnes pratiques pour les responsables",
        "content": """## Bonnes Pratiques

### Organisation quotidienne

1. **Consultez le Dashboard Service** chaque matin pour avoir une vue d'ensemble
2. **Vérifiez les OT en attente** et assignez-les à votre équipe
3. **Surveillez les équipements en panne** et priorisez les interventions

### Gestion d'équipe

- Utilisez la page **Mon Équipe** pour voir la charge de travail
- Répartissez équitablement les tâches entre les membres
- Suivez les indicateurs de performance (taux de complétion)

### Création de widgets utiles

Créez des widgets pour suivre :
- Les KPIs de votre service (temps moyen d'intervention, etc.)
- Les alertes importantes (stock bas, équipements critiques)
- Les tendances sur plusieurs semaines/mois

### Communication

- Utilisez le **Chat Live** pour communiquer avec votre équipe
- Envoyez des **Consignes** pour les informations importantes
- Documentez les procédures dans la section **Documentations**

### Suivi régulier

| Fréquence | Actions |
|-----------|---------|
| Quotidien | Vérifier OT en attente, équipements en panne |
| Hebdomadaire | Analyser les statistiques, ajuster les priorités |
| Mensuel | Réviser les indicateurs, créer/modifier les widgets |""",
        "level": "intermediate",
        "target_roles": [],
        "target_modules": ["serviceDashboard"],
        "keywords": ["bonnes pratiques", "conseils", "organisation", "gestion"]
    }
}

async def generate_manual():
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.getenv('DB_NAME', 'gmao_iris')  # Valeur par défaut corrigée
    db = client[db_name]  # Utiliser la bonne base de données
    
    print("📚 Génération du manuel complet...")
    
    try:
        # Créer ou mettre à jour la version du manuel (idempotent)
        now = datetime.now(timezone.utc)
        version = {
            "id": str(uuid.uuid4()),
            "version": "3.1",
            "release_date": now.isoformat(),
            "changes": [
                "Manuel complet avec 25 chapitres",
                "70 sections détaillées couvrant tous les modules",
                "Guide complet de A à Z",
                "Chapitres Chat Live, MQTT/IoT, Demandes d'Achat, Zones, Compteurs, etc.",
                "Nouveau chapitre Assistant IA avec 4 sections",
                "Nouveau chapitre Fonctions Responsable de Service avec 5 sections",
                "FAQ et dépannage inclus",
                "Recherche intuitive intégrée"
            ],
            "author_id": "system",
            "author_name": "Système GMAO Iris",
            "is_current": True,
            "updated_at": now.isoformat()
        }
        
        # Désactiver les anciennes versions
        await db.manual_versions.update_many(
            {"is_current": True},
            {"$set": {"is_current": False}}
        )
        
        # Insérer la nouvelle version
        await db.manual_versions.insert_one(version)
        print("✅ Version 3.1 du manuel créée")
        
        # NETTOYAGE : Supprimer les doublons potentiels avant de recréer
        # Supprimer les doublons de chapitres (garder un seul par ID)
        pipeline_chapters = [
            {"$group": {"_id": "$id", "count": {"$sum": 1}, "mongo_ids": {"$push": "$_id"}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        dup_chapters = await db.manual_chapters.aggregate(pipeline_chapters).to_list(length=100)
        for dup in dup_chapters:
            ids_to_delete = dup['mongo_ids'][1:]
            await db.manual_chapters.delete_many({"_id": {"$in": ids_to_delete}})
        
        # Supprimer les doublons de sections
        pipeline_sections = [
            {"$group": {"_id": "$id", "count": {"$sum": 1}, "mongo_ids": {"$push": "$_id"}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        dup_sections = await db.manual_sections.aggregate(pipeline_sections).to_list(length=100)
        for dup in dup_sections:
            ids_to_delete = dup['mongo_ids'][1:]
            await db.manual_sections.delete_many({"_id": {"$in": ids_to_delete}})
        
        if dup_chapters or dup_sections:
            print(f"🧹 Nettoyage: {len(dup_chapters)} chapitres et {len(dup_sections)} sections en double supprimés")
        
        # Créer chapitres (tous les 24 chapitres)
        chapters = [
            {"id": "ch-001", "title": "🚀 Guide de Démarrage", "description": "Premiers pas", "icon": "Rocket", "order": 1, "sections": ["sec-001-01", "sec-001-02", "sec-001-03", "sec-001-04"], "target_roles": [], "target_modules": []},
            {"id": "ch-002", "title": "👤 Utilisateurs", "description": "Gérer les utilisateurs", "icon": "Users", "order": 2, "sections": ["sec-002-01", "sec-002-02", "sec-002-03"], "target_roles": [], "target_modules": ["people"]},
            {"id": "ch-003", "title": "📋 Ordres de Travail", "description": "Gérer les OT", "icon": "ClipboardList", "order": 3, "sections": ["sec-003-01", "sec-003-02", "sec-003-03", "sec-003-04", "sec-003-05", "sec-003-06"], "target_roles": [], "target_modules": ["workOrders"]},
            {"id": "ch-004", "title": "🔧 Équipements", "description": "Gérer les équipements", "icon": "Wrench", "order": 4, "sections": ["sec-004-01", "sec-004-02", "sec-004-03", "sec-004-04"], "target_roles": [], "target_modules": ["assets"]},
            {"id": "ch-005", "title": "🔄 Maintenance Préventive", "description": "Planifier les maintenances", "icon": "RotateCw", "order": 5, "sections": ["sec-005-01", "sec-005-02", "sec-005-03", "sec-005-04"], "target_roles": [], "target_modules": ["preventiveMaintenance"]},
            {"id": "ch-006", "title": "📦 Gestion du Stock", "description": "Gérer l'inventaire", "icon": "Package", "order": 6, "sections": ["sec-006-01", "sec-006-02", "sec-006-03", "sec-006-04"], "target_roles": [], "target_modules": ["inventory"]},
            {"id": "ch-007", "title": "📝 Demandes d'Intervention", "description": "Soumettre et traiter", "icon": "FileText", "order": 7, "sections": ["sec-007-01", "sec-007-02", "sec-007-03"], "target_roles": [], "target_modules": ["interventionRequests"]},
            {"id": "ch-008", "title": "💡 Demandes d'Amélioration", "description": "Proposer des améliorations", "icon": "Lightbulb", "order": 8, "sections": ["sec-008-01", "sec-008-02", "sec-008-03"], "target_roles": [], "target_modules": ["improvementRequests"]},
            {"id": "ch-009", "title": "📈 Projets d'Amélioration", "description": "Gérer les projets", "icon": "TrendingUp", "order": 9, "sections": ["sec-009-01", "sec-009-02", "sec-009-03"], "target_roles": [], "target_modules": ["improvements"]},
            {"id": "ch-010", "title": "📊 Rapports et Analyses", "description": "Analyser les performances", "icon": "BarChart", "order": 10, "sections": ["sec-010-01", "sec-010-02", "sec-010-03"], "target_roles": [], "target_modules": ["reports"]},
            {"id": "ch-011", "title": "⚙️ Administration", "description": "Configuration système", "icon": "Settings", "order": 11, "sections": ["sec-011-01", "sec-011-02", "sec-011-03", "sec-011-04", "sec-011-05", "sec-011-06", "sec-011-07", "sec-011-08", "sec-011-09", "sec-011-10"], "target_roles": [], "target_modules": ["admin"]},
            {"id": "ch-012", "title": "❓ FAQ et Dépannage", "description": "Questions fréquentes", "icon": "HelpCircle", "order": 12, "sections": ["sec-012-01", "sec-012-02", "sec-012-03", "sec-012-04", "sec-012-05"], "target_roles": [], "target_modules": []},
            {"id": "ch-013", "title": "💬 Chat Live et Collaboration", "description": "Communication en temps réel entre équipes", "icon": "MessageCircle", "order": 13, "sections": ["sec-013-01"], "target_roles": [], "target_modules": ["chatLive"]},
            {"id": "ch-014", "title": "📡 Capteurs MQTT et IoT", "description": "Monitoring des capteurs en temps réel", "icon": "Activity", "order": 14, "sections": ["sec-014-01", "sec-014-02"], "target_roles": [], "target_modules": ["sensors"]},
            {"id": "ch-015", "title": "📝 Demandes d'Achat", "description": "Gérer les demandes d'achat et approvisionnements", "icon": "ShoppingCart", "order": 15, "sections": ["sec-015-01"], "target_roles": [], "target_modules": ["purchaseRequests"]},
            {"id": "ch-016", "title": "📍 Gestion des Zones", "description": "Organiser les zones et localisations", "icon": "MapPin", "order": 16, "sections": ["sec-016-01"], "target_roles": [], "target_modules": ["locations"]},
            {"id": "ch-017", "title": "⏱️ Compteurs", "description": "Suivi des compteurs d'équipements", "icon": "Gauge", "order": 17, "sections": ["sec-017-01"], "target_roles": [], "target_modules": ["meters"]},
            {"id": "ch-018", "title": "👁️ Plan de Surveillance", "description": "Organiser la surveillance des installations", "icon": "Eye", "order": 18, "sections": ["sec-018-01"], "target_roles": [], "target_modules": ["surveillance"]},
            {"id": "ch-019", "title": "⚠️ Presqu'accidents", "description": "Gérer les presqu'accidents et incidents", "icon": "AlertTriangle", "order": 19, "sections": ["sec-019-01"], "target_roles": [], "target_modules": ["presquaccident"]},
            {"id": "ch-020", "title": "📂 Documentations", "description": "Gérer la documentation technique", "icon": "FolderOpen", "order": 20, "sections": ["sec-020-01", "sec-020-02", "sec-020-03"], "target_roles": [], "target_modules": ["documentations"]},
            {"id": "ch-021", "title": "📅 Planning", "description": "Planifier les interventions", "icon": "Calendar", "order": 21, "sections": ["sec-021-01"], "target_roles": [], "target_modules": ["planning"]},
            {"id": "ch-022", "title": "🏭 Fournisseurs", "description": "Gérer les fournisseurs", "icon": "Building", "order": 22, "sections": ["sec-022-01"], "target_roles": [], "target_modules": ["vendors"]},
            {"id": "ch-023", "title": "💾 Import / Export", "description": "Importer et exporter des données", "icon": "Database", "order": 23, "sections": ["sec-023-01"], "target_roles": [], "target_modules": ["importExport"]},
            {"id": "ch-024", "title": "🤖 Assistant IA", "description": "Votre assistant intelligent", "icon": "Bot", "order": 24, "sections": ["sec-024-01", "sec-024-02", "sec-024-03", "sec-024-04"], "target_roles": [], "target_modules": []},
            {"id": "ch-025", "title": "👔 Fonctions Responsable de Service", "description": "Guide des fonctionnalités pour les responsables de service", "icon": "Building2", "order": 25, "sections": ["sec-025-01", "sec-025-02", "sec-025-03", "sec-025-04", "sec-025-05"], "target_roles": [], "target_modules": ["serviceDashboard"]}
        ]
        
        # Insérer ou mettre à jour les chapitres (idempotent)
        chapters_created = 0
        chapters_updated = 0
        for chapter in chapters:
            existing = await db.manual_chapters.find_one({"id": chapter["id"]})
            chapter_data = {**chapter, "updated_at": now.isoformat()}
            
            if not existing:
                chapter_data["created_at"] = now.isoformat()
                chapters_created += 1
            
            await db.manual_chapters.update_one(
                {"id": chapter["id"]},
                {"$set": chapter_data},
                upsert=True
            )
            
            if existing:
                chapters_updated += 1
        
        print(f"✅ {chapters_created} chapitres créés, {chapters_updated} mis à jour")
        
        # Insérer ou mettre à jour les sections (idempotent)
        sections_created = 0
        sections_updated = 0
        order = 1
        for sec_id, sec_data in ALL_SECTIONS.items():
            existing = await db.manual_sections.find_one({"id": sec_id})
            
            section = {
                "id": sec_id,
                "title": sec_data["title"],
                "content": sec_data["content"],
                "order": order,
                "parent_id": None,
                "target_roles": sec_data.get("target_roles", []),
                "target_modules": sec_data.get("target_modules", []),
                "level": sec_data.get("level", "beginner"),
                "images": [],
                "video_url": None,
                "keywords": sec_data.get("keywords", []),
                "updated_at": now.isoformat()
            }
            
            if not existing:
                section["created_at"] = now.isoformat()
                sections_created += 1
            
            await db.manual_sections.update_one(
                {"id": sec_id},
                {"$set": section},
                upsert=True
            )
            
            if existing:
                sections_updated += 1
            
            order += 1
        
        print(f"✅ {sections_created} sections créées, {sections_updated} mises à jour")
        print(f"\n📚 Total: {len(chapters)} chapitres, {len(ALL_SECTIONS)} sections")
        print("\n🎉 Manuel unifié généré avec succès !")
        return True
        
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = asyncio.run(generate_manual())
    import sys
    sys.exit(0 if success else 1)
