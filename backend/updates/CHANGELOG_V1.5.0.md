# 📋 GMAO Iris - Version 1.5.0
## Rapport de Surveillance Avancé

**Date de sortie :** 18 Janvier 2025  
**Nom de code :** Rapport de Surveillance Avancé

---

## 🎯 Résumé

Cette version apporte une **nouvelle page de rapport avancée** pour le module "Plan de Surveillance" avec **3 modes d'affichage interactifs** et des **statistiques détaillées**. Les utilisateurs peuvent maintenant visualiser les données de surveillance selon leurs préférences (Cartes, Tableaux ou Graphiques).

---

## ✨ Nouvelles Fonctionnalités

### 📊 Page "Rapport Surveillance"

#### **3 Modes d'Affichage**
1. **Mode Cartes** (par défaut)
   - Cartes colorées avec bordures distinctives
   - Barres de progression horizontales
   - 3 sections : par catégorie, bâtiment, périodicité

2. **Mode Tableau**
   - Tableaux HTML détaillés et professionnels
   - Colonnes : Nom, Total, Réalisés, Taux, Progression
   - Effets de survol (hover)
   - Barres de progression intégrées

3. **Mode Graphiques**
   - Graphique en camembert (donut chart) pour les catégories
   - 3 graphiques à barres interactifs
   - Légendes colorées et axes configurés
   - Utilisation de la librairie @nivo (graphiques professionnels)

#### **Statistiques Globales** (4 cartes toujours affichées)
- Taux de réalisation global avec pourcentage
- Nombre de contrôles en retard (alerte rouge)
- Nombre de contrôles à temps (indicateur bleu)
- Nombre d'anomalies détectées (alerte orange)

#### **Statistiques Détaillées**

**Par Catégorie :**
- MMRI (Mesures de Maîtrise des Risques Instrumentées)
- INCENDIE
- SECURITE ENVIRONNEMENT
- ELECTRIQUE
- MANUTENTION
- EXTRACTION
- AUTRE

**Par Bâtiment :**
- BATIMENT 1
- BATIMENT 2
- BATIMENT 1 ET 2

**Par Périodicité :**
- Mensuel
- Trimestriel (3 mois)
- Semestriel (6 mois)
- Annuel (1 an)
- Pluriannuel (3 ans, 10 ans, etc.)

**Par Responsable :**
- MAINT (Maintenance)
- PROD (Production)
- QHSE
- Autres responsables définis

#### **Fonctionnalités Techniques**
- **Persistance du mode** : Le mode d'affichage choisi est sauvegardé dans le localStorage du navigateur
- **Sélecteur intuitif** : Menu déroulant avec icônes pour changer de mode
- **Interface responsive** : S'adapte aux différentes tailles d'écran
- **Chargement dynamique** : Les données sont récupérées en temps réel depuis l'API

---

## 🔧 Améliorations Backend

### **Nouvel Endpoint API**

**`GET /api/surveillance/rapport-stats`**
- Protection par authentification JWT
- Calcul de 6 types de statistiques différentes
- Gestion robuste des valeurs null/undefined
- Calculs mathématiques précis des pourcentages
- Agrégation de données par catégorie, bâtiment, périodicité, responsable
- Comptage intelligent des anomalies par mots-clés ("anomalie", "problème", "défaut", "dysfonctionnement", "intervention", "réparation")

**Structure de réponse JSON :**
```json
{
  "global": {
    "total": int,
    "realises": int,
    "planifies": int,
    "a_planifier": int,
    "pourcentage_realisation": float,
    "en_retard": int,
    "a_temps": int
  },
  "by_category": { ... },
  "by_batiment": { ... },
  "by_periodicite": { ... },
  "by_responsable": { ... },
  "anomalies": int
}
```

---

## 🔒 Sécurité

- ✅ Endpoint protégé par authentification JWT
- ✅ Validation des permissions utilisateur (module 'surveillance')
- ✅ Gestion sécurisée des erreurs
- ✅ Protection contre les valeurs null dans les requêtes

---

## 🧪 Tests Effectués

### **Backend**
- ✅ Endpoint répond 200 avec authentification valide
- ✅ Endpoint refuse l'accès sans authentification (403 Forbidden)
- ✅ Structure JSON complète et conforme
- ✅ Calculs mathématiques corrects (pourcentages, totaux)
- ✅ Gestion des cas limites (0 items, valeurs null)
- ✅ Agrégation par catégorie, bâtiment, périodicité, responsable

### **Frontend**
- ✅ Navigation depuis la sidebar fonctionnelle
- ✅ Chargement des données depuis l'API
- ✅ Sélecteur de mode opérationnel
- ✅ Affichage correct des 3 modes
- ✅ Persistance du mode dans localStorage
- ✅ Graphiques interactifs avec @nivo
- ✅ Interface responsive

---

## 📦 Dépendances Ajoutées

### **Frontend**
- `@nivo/pie@0.99.0` : Graphiques en camembert
- `@nivo/arcs@0.99.0` : Dépendance de @nivo/pie

*Note : @nivo/bar et @nivo/core étaient déjà installés*

---

## 🚀 Installation

Pour mettre à jour vers la version 1.5.0 :

1. **Depuis l'application** (recommandé) :
   - Allez dans le menu "Mise à Jour"
   - Cliquez sur "Vérifier les mises à jour"
   - Cliquez sur "Mettre à jour maintenant"

2. **Manuellement via Git** :
   ```bash
   cd /chemin/vers/GMAO
   git pull origin main
   cd frontend
   yarn install
   cd ..
   sudo supervisorctl restart all
   ```

---

## 📝 Notes de Migration

### **Compatibilité**
- ✅ Compatible avec la version 1.2.0 et supérieures
- ✅ Aucune modification de la base de données requise
- ✅ Pas de migration de données nécessaire
- ✅ Aucun changement cassant (breaking change)

### **Permissions**
- La nouvelle page "Rapport Surveillance" utilise le module de permission `surveillance`
- Les utilisateurs ayant accès au "Plan de Surveillance" ont automatiquement accès au rapport

---

## 🐛 Corrections de Bugs

- ✅ Correction de la gestion des valeurs null dans le champ `commentaire` lors du calcul des anomalies
- ✅ Installation automatique de @nivo/pie si manquant

---

## 🔮 Prochaines Étapes (Phase 3)

- Import/Export CSV/Excel pour les items de surveillance
- Rappels automatiques par email pour les échéances proches
- Statistiques avancées avec historique temporel
- Génération de rapports PDF

---

## 👨‍💻 Auteur

**Grèg** - Développeur GMAO Iris

---

## 📸 Captures d'Écran

### Mode Cartes
![Mode Cartes](docs/screenshots/v1.5.0_mode_cartes.png)

### Mode Tableau
![Mode Tableau](docs/screenshots/v1.5.0_mode_tableau.png)

### Mode Graphiques
![Mode Graphiques](docs/screenshots/v1.5.0_mode_graphiques.png)

---

**Version 1.5.0** - Rapport de Surveillance Avancé  
*Développé avec ❤️ pour optimiser la gestion de la maintenance*
