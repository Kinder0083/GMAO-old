# Système de Gestion des Mises à Jour - GMAO Iris

## 📋 Vue d'ensemble

Ce système permet de gérer les mises à jour de l'application GMAO Iris de manière automatisée et sécurisée.

## 🔄 Fonctionnement

### 1. Vérification automatique
- **Planification**: Tous les jours à 1h00 du matin
- **Source**: Fichier `version.json` dans le dossier `/updates` du repository GitHub
- **Fréquence manuelle**: Toutes les heures via le frontend (pour les admins)

### 2. Notification
- **Pour les admins**: Badge rouge avec le chiffre "1" sur l'icône de téléchargement dans le header
- **Pour tous les utilisateurs**: Popup d'information pendant 3 jours après l'installation d'une mise à jour

### 3. Processus de mise à jour

Lorsqu'un admin lance une mise à jour, le système effectue automatiquement:

1. **Sauvegarde complète**:
   - Dump MongoDB complet
   - Export Excel de toutes les données
   - Copie des fichiers uploads

2. **Installation**:
   - `git pull` depuis GitHub
   - Installation des dépendances backend (`pip install -r requirements.txt`)
   - Installation des dépendances frontend (`yarn install`)

3. **Redémarrage**:
   - Redémarrage automatique de tous les services

⏱️ **Durée estimée**: 2-5 minutes

## 📝 Format du fichier version.json

```json
{
  "version": "1.2.0",
  "versionName": "Version BetaTest",
  "releaseDate": "2025-01-11",
  "description": "Description courte de la version",
  "changes": [
    "✅ Fonctionnalité 1",
    "✅ Fonctionnalité 2",
    "✅ Correction bug X"
  ],
  "minVersion": "1.0.0",
  "breaking": false,
  "downloadUrl": "https://github.com/Kinder0083/GMAO",
  "author": "Grèg"
}
```

### Champs du fichier

| Champ | Type | Description |
|-------|------|-------------|
| `version` | string | Numéro de version (format: X.Y.Z) |
| `versionName` | string | Nom de la version |
| `releaseDate` | string | Date de publication (YYYY-MM-DD) |
| `description` | string | Description courte |
| `changes` | array | Liste des modifications |
| `minVersion` | string | Version minimale requise |
| `breaking` | boolean | Contient des breaking changes |
| `downloadUrl` | string | URL du repository GitHub |
| `author` | string | Auteur de la version |

## 🚀 Créer une nouvelle version

### Étape 1: Préparer les informations

Rassemblez:
- Numéro de version (ex: 1.3.0)
- Nom de la version (ex: "Version Hiver 2025")
- Description des améliorations
- Liste détaillée des changements

### Étape 2: Mettre à jour le fichier version.json

1. Modifier le fichier `/updates/version.json`
2. Mettre à jour tous les champs
3. Commit et push sur GitHub:

```bash
git add updates/version.json
git commit -m "Release v1.3.0"
git push origin main
```

### Étape 3: Attendre la vérification automatique

- À 1h00 du matin, le système vérifiera automatiquement
- OU
- Un admin peut vérifier manuellement via l'interface

## 🔐 Sécurité et Sauvegardes

### Emplacements des sauvegardes

- **Dossier**: `/app/backups/backup_vX.Y.Z_YYYYMMDD_HHMMSS/`
- **Contenu**:
  - `mongodb/`: Dump complet MongoDB
  - `export_data.xlsx`: Export Excel de toutes les données
  - `uploads/`: Copie des fichiers uploadés

### Restauration manuelle

En cas de problème, restaurer avec:

```bash
# Restaurer MongoDB
mongorestore --uri mongodb://localhost:27017 --db gmao_iris --drop /app/backups/backup_XXX/mongodb/gmao_iris

# Les données Excel sont disponibles dans export_data.xlsx
```

## 📊 API Endpoints

| Endpoint | Méthode | Rôle | Description |
|----------|---------|------|-------------|
| `/api/updates/check` | GET | Admin | Vérifier les mises à jour maintenant |
| `/api/updates/status` | GET | Admin | Statut actuel des MAJ |
| `/api/updates/apply` | POST | Admin | Appliquer une mise à jour |
| `/api/updates/dismiss/{version}` | POST | Admin | Masquer une notification |
| `/api/updates/recent-info` | GET | Tous | Info des MAJ récentes (popup) |
| `/api/updates/version` | GET | Public | Version actuelle |

## 🎨 Interface Utilisateur

### Pour les Admins

1. **Badge de notification**:
   - Position: Header, à gauche de la cloche de notifications
   - Badge rouge avec "1" quand une MAJ est disponible
   - Clic ouvre le modal de mise à jour

2. **Modal de mise à jour**:
   - Informations complètes sur la nouvelle version
   - Liste des améliorations
   - Boutons: "Installer maintenant", "Vérifier", "Masquer"

### Pour tous les utilisateurs

**Popup d'information** (après installation):
- Affichage automatique pendant 3 jours
- Titre, description, liste des nouveautés
- Possibilité de fermer et ne plus voir pour cette version

## 🔧 Dépannage

### La vérification échoue

1. Vérifier la connectivité GitHub
2. Vérifier le format du fichier version.json
3. Consulter les logs: `/var/log/supervisor/backend.out.log`

### L'installation échoue

1. Les sauvegardes sont automatiquement créées avant
2. Consulter les logs pour identifier l'erreur
3. Restaurer manuellement si nécessaire

### La notification ne s'affiche pas

1. Vérifier que l'utilisateur est admin
2. Vérifier que la version dans version.json est supérieure à la version actuelle
3. Vérifier que la notification n'a pas été dismissée

## 📚 Versioning

Le système utilise le **Semantic Versioning** (semver):

- **X.0.0**: Version majeure (breaking changes)
- **0.X.0**: Version mineure (nouvelles fonctionnalités)
- **0.0.X**: Version patch (corrections de bugs)

Exemples:
- `1.2.0` → `1.2.1`: Correction de bug
- `1.2.1` → `1.3.0`: Nouvelle fonctionnalité
- `1.3.0` → `2.0.0`: Breaking change

## 📞 Support

Pour toute question sur le système de mise à jour:
- Email: support@gmao-iris.local
- Documentation: /updates/README.md
