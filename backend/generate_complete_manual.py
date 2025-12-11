#!/usr/bin/env python3
"""
Script pour générer et importer le contenu complet du manuel
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
    }
}

async def generate_manual():
    client = AsyncIOMotorClient(mongo_url)
    db = client.gmao_iris
    
    print("📚 Génération du manuel complet...")
    
    try:
        # NE PAS supprimer pour garder Chat Live et MQTT qui seront ajoutés après
        await db.manual_versions.delete_many({})
        # await db.manual_chapters.delete_many({})
        # await db.manual_sections.delete_many({})
        
        # Créer version
        now = datetime.now(timezone.utc)
        version = {
            "id": str(uuid.uuid4()),
            "version": "2.0",
            "release_date": now.isoformat(),
            "changes": [
                "Manuel complet avec 12 chapitres",
                "49 sections détaillées couvrant tous les modules",
                "Guide complet de A à Z",
                "FAQ et dépannage inclus"
            ],
            "author_id": "system",
            "author_name": "Système GMAO Iris",
            "is_current": True
        }
        await db.manual_versions.insert_one(version)
        
        # Créer chapitres
        chapters = [
            {"id": "ch-001", "title": "🚀 Guide de Démarrage", "description": "Premiers pas", "icon": "Rocket", "order": 1, "sections": ["sec-001-01", "sec-001-02", "sec-001-03", "sec-001-04"], "target_roles": [], "target_modules": []},
            {"id": "ch-002", "title": "👤 Utilisateurs", "description": "Gérer les utilisateurs", "icon": "Users", "order": 2, "sections": ["sec-002-01", "sec-002-02", "sec-002-03"], "target_roles": ["ADMIN"], "target_modules": ["people"]},
            {"id": "ch-003", "title": "📋 Ordres de Travail", "description": "Gérer les OT", "icon": "ClipboardList", "order": 3, "sections": ["sec-003-01", "sec-003-02", "sec-003-03", "sec-003-04", "sec-003-05"], "target_roles": [], "target_modules": ["workOrders"]},
            {"id": "ch-004", "title": "🔧 Équipements", "description": "Gérer les équipements", "icon": "Wrench", "order": 4, "sections": ["sec-004-01", "sec-004-02", "sec-004-03", "sec-004-04"], "target_roles": [], "target_modules": ["assets"]},
            {"id": "ch-005", "title": "🔄 Maintenance Préventive", "description": "Planifier les maintenances", "icon": "RotateCw", "order": 5, "sections": ["sec-005-01", "sec-005-02", "sec-005-03", "sec-005-04"], "target_roles": [], "target_modules": ["preventiveMaintenance"]},
            {"id": "ch-006", "title": "📦 Gestion du Stock", "description": "Gérer l'inventaire", "icon": "Package", "order": 6, "sections": ["sec-006-01", "sec-006-02", "sec-006-03", "sec-006-04"], "target_roles": [], "target_modules": ["inventory"]},
            {"id": "ch-007", "title": "📝 Demandes d'Intervention", "description": "Soumettre et traiter", "icon": "FileText", "order": 7, "sections": ["sec-007-01", "sec-007-02", "sec-007-03"], "target_roles": [], "target_modules": ["interventionRequests"]},
            {"id": "ch-008", "title": "💡 Demandes d'Amélioration", "description": "Proposer des améliorations", "icon": "Lightbulb", "order": 8, "sections": ["sec-008-01", "sec-008-02", "sec-008-03"], "target_roles": [], "target_modules": ["improvementRequests"]},
            {"id": "ch-009", "title": "📈 Projets d'Amélioration", "description": "Gérer les projets", "icon": "TrendingUp", "order": 9, "sections": ["sec-009-01", "sec-009-02", "sec-009-03"], "target_roles": ["ADMIN", "DIRECTEUR"], "target_modules": ["improvements"]},
            {"id": "ch-010", "title": "📊 Rapports et Analyses", "description": "Analyser les performances", "icon": "BarChart", "order": 10, "sections": ["sec-010-01", "sec-010-02", "sec-010-03"], "target_roles": [], "target_modules": ["reports"]},
            {"id": "ch-011", "title": "⚙️ Administration", "description": "Configuration système", "icon": "Settings", "order": 11, "sections": ["sec-011-01", "sec-011-02", "sec-011-03", "sec-011-04", "sec-011-05", "sec-011-06", "sec-011-07", "sec-011-08"], "target_roles": ["ADMIN"], "target_modules": ["admin"]},
            {"id": "ch-012", "title": "❓ FAQ et Dépannage", "description": "Questions fréquentes", "icon": "HelpCircle", "order": 12, "sections": ["sec-012-01", "sec-012-02", "sec-012-03", "sec-012-04", "sec-012-05"], "target_roles": [], "target_modules": []}
        ]
        
        for chapter in chapters:
            chapter_data = {**chapter, "created_at": now.isoformat(), "updated_at": now.isoformat()}
            await db.manual_chapters.insert_one(chapter_data)
            print(f"✅ {chapter['title']}")
        
        # Créer sections
        order = 1
        for sec_id, sec_data in ALL_SECTIONS.items():
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
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.manual_sections.insert_one(section)
            order += 1
        
        print(f"\n✅ {len(ALL_SECTIONS)} sections créées")
        print("\n🎉 Manuel généré avec succès !")
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(generate_manual())
