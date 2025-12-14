#!/usr/bin/env python3
"""
Script pour mettre à jour le manuel avec la nouvelle fonctionnalité de dessin
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

async def update_help_section():
    """Met à jour la section Aide avec la fonctionnalité de dessin"""
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client['gmao_iris']
    
    print("🎨 Mise à jour du manuel - Fonctionnalité de dessin")
    
    # Nouveau contenu pour la section "Utiliser le Bouton Aide"
    new_content = """Le bouton "Aide" vous permet de contacter rapidement les administrateurs en cas de problème.

## 📍 Localisation
Le bouton "Aide" se trouve dans le coin supérieur droit de l'écran, à côté de vos paramètres utilisateur.

## 🎯 Comment demander de l'aide

### Étape 1 : Ouvrir la fenêtre d'aide
Cliquez sur le bouton rouge "Aide" pour ouvrir la fenêtre de demande d'aide.

### Étape 2 : Choisir votre méthode
Vous avez deux options :

**Option A : Demande simple**
- Rédigez votre message dans le champ de texte (optionnel)
- Cliquez sur "Envoyer la demande"
- Un screenshot automatique sera capturé et envoyé

**Option B : Demande avec annotations** 🆕
1. Cliquez sur le bouton **"Dessiner sur l'écran"** (violet avec icône crayon)
2. La fenêtre se ferme et un canvas transparent apparaît sur votre écran
3. Une palette d'outils flottante s'affiche

### Étape 3 : Annoter l'écran (Option B) 🎨

#### Palette d'outils disponibles

La palette flottante contient :

**5 Outils de dessin :**
- ✏️ **Crayon** : Pour dessiner librement ou écrire à la main
- ➡️ **Flèche** : Pour pointer un élément spécifique
- ⬜ **Rectangle** : Pour encadrer une zone importante
- 🔤 **Texte** : Pour ajouter du texte directement
- 🧹 **Gomme** : Pour effacer vos annotations

**6 Couleurs disponibles :**
- 🔴 Rouge (par défaut)
- 🟠 Orange
- 🟢 Vert
- 🔵 Bleu
- ⚫ Noir
- ⚪ Blanc

**3 Tailles d'épaisseur :**
- Fin (2px)
- Moyen (4px)
- Épais (6px)

**Actions :**
- ↶ **Annuler dernier trait** : Pour corriger une erreur
- ✗ **Annuler tout** : Ferme et annule toutes les annotations
- ✓ **Valider** : Confirme vos annotations et retourne à la fenêtre d'aide

#### Déplacer la palette
- La palette est **déplaçable** par glisser-déposer
- Cliquez sur l'en-tête "Outils de dessin" et déplacez-la où vous voulez
- Pratique pour ne pas masquer la zone que vous voulez annoter

#### Opacité semi-transparente
- Vos annotations sont semi-transparentes (70% d'opacité)
- Vous pouvez voir l'application derrière vos dessins
- Facilite le positionnement précis

### Étape 4 : Finaliser et envoyer

Une fois vos annotations validées :
1. Vous revenez à la fenêtre "Demander de l'aide"
2. Un message de confirmation apparaît : ✅ "Annotations ajoutées !"
3. Vous pouvez ajouter un message texte si nécessaire
4. Cliquez sur "Envoyer la demande"

## 📧 Que contient la demande envoyée ?

Votre demande inclut automatiquement :
- ✅ Une capture d'écran de votre page actuelle **avec vos annotations**
- ✅ Les informations de votre navigateur
- ✅ L'URL de la page où vous êtes
- ✅ Les éventuelles erreurs console
- ✅ Votre message (si vous en avez écrit un)

## 💡 Conseils d'utilisation

### Quand utiliser les annotations ?
- Pour **entourer** un élément qui pose problème
- Pour **pointer** avec une flèche l'endroit exact de l'erreur
- Pour **ajouter des notes** directement sur l'écran
- Pour **encadrer** plusieurs éléments liés

### Bonnes pratiques
- Utilisez le **rouge** pour signaler les erreurs
- Utilisez le **vert** pour indiquer ce qui fonctionne
- Utilisez le **jaune/orange** pour les avertissements
- Soyez **précis** avec vos flèches et rectangles
- N'hésitez pas à **annuler** et recommencer si nécessaire

### Exemples d'utilisation

**Cas 1 : Bouton qui ne fonctionne pas**
1. Cliquez sur "Dessiner sur l'écran"
2. Sélectionnez la flèche rouge
3. Pointez le bouton problématique
4. Ajoutez un texte : "Ce bouton ne répond pas"
5. Validez et envoyez

**Cas 2 : Message d'erreur**
1. Ouvrez le mode dessin
2. Utilisez le rectangle rouge
3. Encadrez le message d'erreur
4. Validez
5. Ajoutez dans le message : "Cette erreur apparaît quand je clique sur Enregistrer"

**Cas 3 : Plusieurs éléments**
1. Utilisez différentes couleurs pour différents éléments
2. Rouge pour ce qui ne marche pas
3. Vert pour ce qui devrait apparaître
4. Annotez avec du texte pour expliquer

## ⚠️ Important à savoir

- Les annotations **ne modifient PAS** votre application
- Elles sont **temporaires** et disparaissent après l'envoi
- Seuls les **administrateurs** reçoivent votre demande
- Vous recevrez une **réponse par email** si configuré
- La palette d'outils **n'apparaît PAS** dans le screenshot final

## 🔄 Après l'envoi

Après avoir envoyé votre demande :
1. Un message de confirmation apparaît
2. Les annotations sont automatiquement effacées de votre écran
3. Vous revenez à l'utilisation normale de l'application
4. Les administrateurs reçoivent immédiatement votre demande avec le screenshot annoté

## 📞 Support supplémentaire

Si vous ne parvenez pas à envoyer une demande d'aide :
- Contactez directement votre administrateur par email ou téléphone
- Vérifiez votre connexion internet
- Essayez de rafraîchir la page (F5)

---

**Astuce** : Plus votre demande est précise et annotée, plus vite nous pourrons vous aider ! N'hésitez pas à utiliser tous les outils à votre disposition.

<div style="text-align: center; margin: 20px 0;">
<img src="/images/manual/12-manuel-utilisateur.png" alt="Interface de demande d'aide" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Fenêtre de demande d'aide avec option de dessin</p>
</div>"""

    # Mettre à jour la section
    result = await db.manual_sections.update_one(
        {"id": "sec-012-04"},
        {"$set": {"content": new_content}}
    )
    
    if result.modified_count > 0:
        print("✅ Section 'Utiliser le Bouton Aide' mise à jour avec la fonctionnalité de dessin")
    else:
        print("⚠️ Section non trouvée ou déjà à jour")
    
    # Ajouter aussi une mise à jour pour la section Dashboard IoT avec les groupes
    iot_dashboard_content = """Le Dashboard IoT est votre centre de contrôle pour tous vos capteurs et équipements connectés via MQTT.

## 📊 Organisation du Dashboard

Le Dashboard IoT est organisé en **3 onglets principaux** pour une navigation optimale :

### Onglet 1 : Vue d'ensemble 📈

C'est la page d'accueil du dashboard avec :

**KPI Cards (Indicateurs clés)**
- Nombre de capteurs actifs
- Nombre d'alertes en cours
- Température moyenne
- Puissance totale consommée

**Valeurs actuelles**
- Gauges circulaires pour chaque type de capteur
- Affichage en temps réel des valeurs
- Indicateurs visuels de seuils (vert/orange/rouge)

**Graphiques temporels**
- Historique des valeurs sur 1h, 6h, 24h ou 7 jours
- Courbes d'évolution pour chaque capteur
- Statistiques min/max/moyenne affichées

### Onglet 2 : Groupes par Type 🔍 🆕

Cet onglet regroupe vos capteurs par type pour une analyse comparative :

**Cards statistiques**
- Une card par type de capteur (Température, Humidité, Pression, etc.)
- Affichage du nombre de capteurs de ce type
- Calculs automatiques : Moyenne, Min, Max

**Graphique de comparaison**
- Bar Chart comparant les moyennes entre types
- Visualisation des min et max par type
- Identification rapide des anomalies

**Tables détaillées**
- Liste complète des capteurs par type
- Informations : nom, valeur actuelle, unité, emplacement
- Dernière mise à jour pour chaque capteur
- Tri et filtrage disponibles

**Exemple d'utilisation**
- Comparer les températures de tous vos capteurs thermiques
- Identifier rapidement le capteur avec la valeur la plus élevée
- Voir en un coup d'œil combien de capteurs de chaque type sont actifs

### Onglet 3 : Groupes par Localisation 📍 🆕

Cet onglet organise vos capteurs par zone géographique ou emplacement :

**Cards par zone**
- Une card par localisation/zone définie
- Nombre de capteurs dans cette zone
- Moyenne des valeurs dans la zone
- Nombre d'alertes actives pour cette zone

**Graphique de répartition**
- Visualisation du nombre de capteurs par zone
- Alertes actives par emplacement
- Identification des zones problématiques

**Tables par emplacement**
- Liste de tous les capteurs d'une zone
- Informations complètes : nom, type, valeur, alerte
- Statut d'alerte (activée/désactivée)
- Dernière mise à jour

**Exemple d'utilisation**
- Surveiller tous les capteurs d'un bâtiment spécifique
- Voir combien d'alertes sont actives dans chaque zone
- Comparer les moyennes entre différentes localisations

## 🔄 Calculs Automatiques

Le backend calcule automatiquement pour vous :
- **Moyenne** (avg) : Valeur moyenne de tous les capteurs du groupe
- **Minimum** (min) : Valeur la plus basse détectée
- **Maximum** (max) : Valeur la plus haute détectée
- **Count** : Nombre de capteurs dans le groupe
- **Alertes** : Nombre d'alertes actives
- **Tendances** : Direction d'évolution (hausse/baisse)

## ⚙️ Filtres et Options

**Filtre temporel** (tous les onglets)
- 1 heure : Données de la dernière heure
- 6 heures : Tendances court terme
- 24 heures : Vue journalière complète
- 7 jours : Analyse hebdomadaire

**Rafraîchissement**
- Automatique : Toutes les 30 secondes
- Manuel : Bouton "Rafraîchir" disponible

## 💡 Conseils d'utilisation

### Navigation efficace
1. **Vue d'ensemble** → Pour un aperçu général et rapide
2. **Groupes par Type** → Pour analyser un type de capteur spécifique
3. **Groupes par Localisation** → Pour surveiller une zone précise

### Analyse comparative
- Utilisez "Groupes par Type" pour comparer les performances entre capteurs similaires
- Utilisez "Groupes par Localisation" pour identifier les zones problématiques
- Les graphiques de comparaison facilitent la détection d'anomalies

### Gestion des alertes
- Les alertes actives sont mises en évidence en rouge
- Consultez l'onglet "Groupes par Localisation" pour voir les zones avec le plus d'alertes
- Les tableaux détaillés montrent le statut d'alerte de chaque capteur

## 🎯 Cas d'usage pratiques

**Cas 1 : Température anormale**
1. Allez dans "Groupes par Type"
2. Trouvez la card "Température"
3. Vérifiez la moyenne, min, max
4. Consultez la table pour identifier le capteur problématique

**Cas 2 : Zone avec problèmes**
1. Allez dans "Groupes par Localisation"
2. Trouvez la zone avec des alertes actives (chiffre rouge)
3. Cliquez sur la table pour voir tous les capteurs de cette zone
4. Identifiez les capteurs en alerte

**Cas 3 : Analyse de tendance**
1. Vue d'ensemble → Sélectionnez "7 jours"
2. Observez les courbes d'évolution
3. Identifiez les patterns de consommation
4. Comparez avec les statistiques min/max/moyenne

<div style="text-align: center; margin: 20px 0;">
<img src="/images/manual/05-iot-dashboard.png" alt="Dashboard IoT avec groupes" style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
<p style="color: #666; font-size: 0.9em; margin-top: 8px;">Figure: Dashboard IoT avec statistiques groupées par type</p>
</div>

---

**Note** : Les données affichées sont mises à jour en temps réel depuis votre broker MQTT. Assurez-vous que vos capteurs envoient régulièrement des données."""

    result2 = await db.manual_sections.update_one(
        {"id": "ch-mqtt-001-sec-005"},
        {"$set": {"content": iot_dashboard_content}}
    )
    
    if result2.modified_count > 0:
        print("✅ Section 'Dashboard IoT - Vue d'Ensemble' mise à jour avec les groupes")
    else:
        print("⚠️ Section Dashboard IoT non trouvée ou déjà à jour")
    
    print("\n" + "="*60)
    print("✅ Mise à jour du manuel terminée !")
    print("   - Section Aide : Fonctionnalité de dessin ajoutée")
    print("   - Section Dashboard IoT : Groupes par type/localisation ajoutés")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_help_section())
