#!/usr/bin/env python3
"""
Script pour mettre à jour le manuel MQTT avec les détails de la Phase 2
Ajoute des informations sur l'interface à onglets du Dashboard IoT
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'gmao_iris')

# Contenu mis à jour pour la section Dashboard IoT
UPDATED_MQTT_DASHBOARD_CONTENT = """### Visualiser les Données IoT - Dashboard Phase 2

Le **Dashboard IoT** affiche en temps réel toutes les données de vos capteurs avec une interface à onglets moderne.

#### 🎯 Interface à Onglets

**Onglet 1 : Vue d'ensemble**
- Affichage de tous les capteurs actifs
- Valeurs actuelles en temps réel
- Statut de chaque capteur (actif/inactif)
- Indicateurs d'alerte visuels

**Onglet 2 : Groupes par Type**
- Capteurs regroupés automatiquement par type
  - Température 🌡️
  - Humidité 💧
  - Pression 🔵
  - Autres types personnalisés
- Statistiques par groupe
- Graphiques d'évolution

**Onglet 3 : Groupes par Localisation**
- Organisation géographique des capteurs
- Regroupement par zone/emplacement
- Vue cartographique (si configurée)
- Filtrage rapide par localisation

#### 📊 Fonctionnalités Avancées

**Graphiques en Temps Réel**
- Évolution des valeurs dans le temps
- Graphiques interactifs et zoomables
- Export des données en CSV
- Personnalisation de la période d'affichage

**Statistiques Détaillées**
- Valeur minimale de la période
- Valeur maximale de la période
- Valeur moyenne calculée
- Écart-type et tendances

**Système d'Alertes**
- Alertes visuelles en cas de dépassement de seuil
- Notifications en temps réel
- Historique des alertes
- Configuration des seuils personnalisée

**Logs MQTT**
- Accès à l'historique complet via **Logs MQTT**
- Filtrage par capteur, période, type
- Export des logs pour analyse
- Recherche avancée

#### 🔧 Configuration

**Rafraîchissement Automatique**
Les données sont mises à jour automatiquement toutes les 5 secondes (configurable)

**Personnalisation de l'Affichage**
- Choix des capteurs à afficher
- Ordre d'affichage personnalisable
- Couleurs et seuils configurables

#### 💡 Conseils d'Utilisation

1. **Surveillance Continue** : Laissez le dashboard ouvert pour un monitoring en temps réel
2. **Alertes Pertinentes** : Configurez les seuils selon vos besoins réels
3. **Organisation Logique** : Groupez vos capteurs par zone pour une meilleure visualisation
4. **Export Régulier** : Exportez les données pour analyse approfondie

#### 🐛 Dépannage

**Les données ne se mettent pas à jour**
- Vérifiez la connexion MQTT
- Vérifiez que le broker MQTT est démarré
- Consultez les logs dans **Logs MQTT**

**Capteur n'apparaît pas**
- Vérifiez que le capteur est activé
- Vérifiez le topic MQTT configuré
- Testez la connexion du capteur physique"""

async def update_mqtt_manual():
    """Met à jour la section Dashboard IoT du manuel"""
    print("=" * 80)
    print("📡 MISE À JOUR DU MANUEL MQTT - PHASE 2")
    print("=" * 80)
    print()
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print(f"🔗 Connexion à MongoDB: {MONGO_URL}")
        print(f"📂 Base de données: {DB_NAME}")
        print()
        
        # Trouver la section Dashboard IoT
        section = await db.manual_sections.find_one({"id": "sec-014-02"})
        
        if not section:
            print("⚠️  Section 'Dashboard IoT' (sec-014-02) non trouvée")
            print("   Cette section sera créée lors de la première utilisation de l'application")
            print("   ✅ Installation continue (non bloquant)")
            return True  # Retourner True pour ne pas bloquer l'installation
        
        print(f"📝 Section trouvée : {section['title']}")
        print()
        
        # Mettre à jour le contenu
        result = await db.manual_sections.update_one(
            {"id": "sec-014-02"},
            {
                "$set": {
                    "content": UPDATED_MQTT_DASHBOARD_CONTENT,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "level": "intermediate"
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Section 'Dashboard IoT' mise à jour avec succès")
            print()
            print("📝 Contenu ajouté :")
            print("   - Description de l'interface à onglets (3 onglets)")
            print("   - Fonctionnalités avancées détaillées")
            print("   - Conseils d'utilisation")
            print("   - Section de dépannage")
            print()
            print("💡 Note : Pour ajouter des captures d'écran, utilisez l'interface")
            print("   d'administration du manuel dans l'application")
        else:
            print("ℹ️  Aucune modification effectuée (contenu peut-être déjà à jour)")
        
        print()
        print("=" * 80)
        print("✅ MISE À JOUR TERMINÉE")
        print("=" * 80)
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()


if __name__ == "__main__":
    import sys
    success = asyncio.run(update_mqtt_manual())
    sys.exit(0 if success else 1)
