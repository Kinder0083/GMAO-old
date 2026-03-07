# 🔍 Comment fonctionne le système de détection de mises à jour ?

## 📋 Vue d'ensemble

Le système de mises à jour de GMAO Iris est conçu pour détecter automatiquement les nouvelles versions disponibles sur GitHub et permettre une mise à jour en un clic depuis l'application.

---

## 🏗️ Architecture du Système

### **1. Fichiers Clés**

#### **Backend :**
- **`/app/backend/update_service.py`** : Service principal de gestion des mises à jour
  - Contient la version actuelle de l'application (`self.current_version = "1.5.0"`)
  - Gère la vérification, le téléchargement et l'application des mises à jour

#### **Frontend :**
- **`/app/frontend/src/pages/Updates.jsx`** : Page de l'interface utilisateur pour les mises à jour
  - Affiche la version actuelle et la dernière version disponible
  - Permet de vérifier et appliquer les mises à jour
  - Affiche l'historique et le changelog

#### **Fichier de Version (GitHub) :**
- **`/app/updates/version.json`** : Fichier JSON contenant les informations de la dernière version
  - Stocké dans le dépôt GitHub
  - Accessible publiquement via une URL raw
  - Format standardisé

---

## 🔄 Processus de Détection Automatique

### **Étape 1 : Configuration de Base**

Le service `UpdateService` (dans `update_service.py`) est configuré avec :

```python
self.current_version = "1.5.0"  # Version actuelle de l'application
self.github_user = "Kinder0083"  # Nom d'utilisateur GitHub
self.github_repo = "GMAO"  # Nom du dépôt
self.github_branch = "main"  # Branche à suivre
self.version_file_url = f"https://raw.githubusercontent.com/{self.github_user}/{self.github_repo}/{self.github_branch}/updates/version.json"
```

**URL résultante :** `https://raw.githubusercontent.com/Kinder0083/GMAO/main/updates/version.json`

---

### **Étape 2 : Vérification des Mises à Jour**

La méthode `check_for_updates()` est appelée de deux manières :

#### **A. Vérification Automatique** (Au démarrage de l'application)
- L'application vérifie automatiquement au démarrage
- Une notification apparaît si une nouvelle version est disponible

#### **B. Vérification Manuelle** (Par l'utilisateur)
- L'utilisateur va dans le menu "Mise à Jour"
- Clique sur le bouton "Vérifier"
- Le système interroge GitHub immédiatement

#### **Processus de vérification :**

```python
async def check_for_updates(self):
    # 1. Télécharge le fichier version.json depuis GitHub
    async with aiohttp.ClientSession() as session:
        async with session.get(self.version_file_url) as response:
            remote_version_info = await response.json()
            remote_version = remote_version_info.get("version", "0.0.0")
            
            # 2. Compare les versions
            comparison = self.compare_versions(remote_version, self.current_version)
            
            # 3. Si remote_version > current_version
            if comparison > 0:
                # Une mise à jour est disponible !
                return {
                    "available": True,
                    "new_version": remote_version,
                    "changes": remote_version_info.get("changes", []),
                    ...
                }
```

---

### **Étape 3 : Comparaison des Versions**

Le système utilise le **versioning sémantique** (Semantic Versioning) :
- Format : `MAJOR.MINOR.PATCH` (ex: `1.5.0`)
- La méthode `compare_versions()` convertit les versions en tuples et les compare

**Exemple :**
- Version actuelle : `1.2.0` → `(1, 2, 0)`
- Version GitHub : `1.5.0` → `(1, 5, 0)`
- Comparaison : `(1, 5, 0) > (1, 2, 0)` = **Mise à jour disponible !**

```python
def compare_versions(self, v1: str, v2: str) -> int:
    v1_tuple = self.parse_version(v1)  # (1, 5, 0)
    v2_tuple = self.parse_version(v2)  # (1, 2, 0)
    
    if v1_tuple > v2_tuple:
        return 1  # v1 est plus récente
    elif v1_tuple < v2_tuple:
        return -1  # v2 est plus récente
    else:
        return 0  # Versions identiques
```

---

### **Étape 4 : Notification à l'Utilisateur**

#### **Dans l'Interface**
Si une mise à jour est disponible :
1. La page "Mise à Jour" affiche un **badge bleu "NOUVEAU"**
2. Un bouton **"Mettre à jour maintenant"** apparaît
3. Le changelog avec les nouveautés s'affiche

#### **Badge dans le Header** (optionnel)
Un badge de notification peut apparaître dans l'en-tête de l'application :
```jsx
{updateAvailable && (
  <Badge>Nouvelle version !</Badge>
)}
```

---

## 📄 Structure du Fichier version.json

Le fichier `/app/updates/version.json` sur GitHub contient toutes les informations de la version :

```json
{
  "version": "1.5.0",
  "versionName": "Rapport de Surveillance Avancé",
  "releaseDate": "2025-01-18",
  "description": "Nouvelle page Rapport pour le Plan de Surveillance...",
  "changes": [
    "✅ Nouvelle page 'Rapport Surveillance' avec 3 modes d'affichage",
    "✅ Mode Cartes : Visualisation en cartes colorées...",
    "✅ Mode Tableau : Affichage détaillé en tableaux HTML",
    "..."
  ],
  "minVersion": "1.2.0",
  "breaking": false,
  "downloadUrl": "https://github.com/Kinder0083/GMAO",
  "author": "Grèg"
}
```

**Champs importants :**
- **`version`** : Numéro de version (utilisé pour la comparaison)
- **`changes`** : Liste des nouveautés (affichée dans le changelog)
- **`minVersion`** : Version minimale requise pour la mise à jour
- **`breaking`** : Indique si la mise à jour contient des changements cassants

---

## 🚀 Application de la Mise à Jour

Lorsque l'utilisateur clique sur **"Mettre à jour maintenant"** :

### **1. Vérification des Conflits Git**
```javascript
await axios.get('/api/updates/check-conflicts')
```
- Vérifie s'il y a des modifications locales non commitées
- Affiche un dialogue si des conflits sont détectés

### **2. Confirmation de l'Utilisateur**
```javascript
if (!window.confirm('⚠️ ATTENTION ! Une sauvegarde automatique sera créée...')) {
  return;
}
```

### **3. Processus de Mise à Jour** (Backend)
```python
async def apply_update(version: str):
    # 1. Créer un backup de la base de données
    backup_path = await create_backup()
    
    # 2. Télécharger les nouvelles modifications depuis GitHub
    subprocess.run(['git', 'pull', 'origin', 'main'])
    
    # 3. Installer les dépendances backend
    subprocess.run(['pip', 'install', '-r', 'requirements.txt'])
    
    # 4. Installer les dépendances frontend
    subprocess.run(['yarn', 'install'], cwd='frontend')
    
    # 5. Compiler le frontend
    subprocess.run(['yarn', 'build'], cwd='frontend')
    
    # 6. Redémarrer les services
    subprocess.run(['sudo', 'supervisorctl', 'restart', 'all'])
    
    # 7. Enregistrer dans l'historique
    await save_update_history(version, backup_path)
```

### **4. Rechargement de la Page**
```javascript
setTimeout(() => {
  window.location.reload();
}, 3000);
```

---

## 📊 Workflow Complet (Diagramme)

```
┌─────────────────────────────────────────────────────────┐
│ 1. DÉVELOPPEMENT                                         │
│    - Nouvelles fonctionnalités implémentées             │
│    - Tests effectués et validés                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. PRÉPARATION DE LA RELEASE                            │
│    - Mettre à jour version.json (version: 1.5.0)       │
│    - Créer CHANGELOG_V1.5.0.md                         │
│    - Mettre à jour update_service.py (current_version)  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PUBLICATION SUR GITHUB                               │
│    - git add .                                          │
│    - git commit -m "Release v1.5.0"                     │
│    - git push origin main                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. DÉTECTION AUTOMATIQUE (Côté Utilisateur)            │
│    - L'application vérifie GitHub au démarrage          │
│    - Télécharge version.json depuis GitHub              │
│    - Compare remote_version (1.5.0) vs current (1.2.0)  │
│    - Détecte : 1.5.0 > 1.2.0 → Mise à jour disponible! │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. NOTIFICATION À L'UTILISATEUR                         │
│    - Badge "NOUVEAU" sur la page Mise à Jour            │
│    - Affichage du changelog avec les nouveautés         │
│    - Bouton "Mettre à jour maintenant" disponible       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. APPLICATION DE LA MISE À JOUR (1 clic)              │
│    - Backup automatique de la base de données           │
│    - git pull origin main                               │
│    - Installation des dépendances                       │
│    - Compilation du frontend                            │
│    - Redémarrage des services                           │
│    - Application mise à jour vers 1.5.0 !               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Sécurité et Rollback

### **Backup Automatique**
Avant chaque mise à jour, un backup complet de la base de données est créé :
```python
backup_path = f"backups/backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.gz"
```

### **Rollback (Retour Arrière)**
Si la mise à jour échoue ou pose problème :
1. Aller dans "Mise à Jour" > "Historique"
2. Cliquer sur "Revenir" à côté de la version souhaitée
3. Le système restaure le backup et revient à l'ancienne version

---

## 📝 Checklist pour Publier une Nouvelle Version

- [ ] **1. Développer et tester** les nouvelles fonctionnalités
- [ ] **2. Mettre à jour `update_service.py`** : Changer `self.current_version = "X.X.X"`
- [ ] **3. Créer/Mettre à jour `version.json`** avec le nouveau numéro de version
- [ ] **4. Créer `CHANGELOG_VX.X.X.md`** avec les détails de la release
- [ ] **5. Committer et pousser** sur GitHub :
  ```bash
  git add .
  git commit -m "Release vX.X.X: Description"
  git push origin main
  ```
- [ ] **6. Vérifier** que le fichier version.json est accessible via l'URL raw
- [ ] **7. Tester** la détection depuis une application client
- [ ] **8. Communiquer** la nouvelle version aux utilisateurs

---

## 🎯 Exemple Pratique : Publication de la v1.5.0

### **Ce qui a été fait pour la v1.5.0 :**

1. ✅ **Développement** : Nouvelle page Rapport Surveillance avec 3 modes d'affichage
2. ✅ **Tests** : Backend testé (endpoint validé), Frontend testé (screenshots)
3. ✅ **Mise à jour `update_service.py`** : `self.current_version = "1.5.0"`
4. ✅ **Création `version.json`** :
   ```json
   {
     "version": "1.5.0",
     "versionName": "Rapport de Surveillance Avancé",
     "changes": ["✅ Nouvelle page...", "✅ Mode Cartes...", ...]
   }
   ```
5. ✅ **Création `CHANGELOG_V1.5.0.md`** : Documentation complète
6. ✅ **Backend redémarré** : `sudo supervisorctl restart backend`

### **Ce qu'il vous reste à faire :**

1. **Committer les changements** :
   ```bash
   cd /app
   git add updates/version.json
   git add backend/update_service.py
   git add updates/CHANGELOG_V1.5.0.md
   git add frontend/src/pages/SurveillanceRapport.jsx
   git add frontend/src/App.js
   git add frontend/src/components/Layout/MainLayout.jsx
   git add frontend/src/services/api.js
   git add backend/surveillance_routes.py
   git commit -m "Release v1.5.0: Rapport de Surveillance Avancé avec 3 modes d'affichage"
   ```

2. **Pousser sur GitHub** :
   ```bash
   git push origin main
   ```

3. **Vérifier l'URL** :
   Ouvrir dans un navigateur : `https://raw.githubusercontent.com/Kinder0083/GMAO/main/updates/version.json`
   Vous devriez voir le contenu JSON avec `"version": "1.5.0"`

4. **Tester la détection** :
   - Sur une autre installation de GMAO Iris (ou en changeant temporairement `current_version` à `1.2.0`)
   - Aller dans "Mise à Jour" > "Vérifier"
   - Vous devriez voir "Version 1.5.0 disponible !"

---

## 💡 Astuces et Bonnes Pratiques

### **Versioning Sémantique**
- **MAJOR** (1.x.x) : Changements cassants (breaking changes)
- **MINOR** (x.5.x) : Nouvelles fonctionnalités (compatibles)
- **PATCH** (x.x.1) : Corrections de bugs

### **Tests avant Publication**
- Toujours tester la mise à jour sur un environnement de test
- Vérifier que le fichier version.json est accessible
- S'assurer que les chemins Git sont corrects

### **Communication**
- Décrire clairement les changements dans `changes`
- Utiliser des émojis pour la lisibilité (✅, 🔧, 🐛, ⚡)
- Mentionner les breaking changes explicitement

---

## 🆘 Dépannage

### **"Impossible de vérifier les mises à jour"**
- Vérifier la connexion Internet
- Vérifier que l'URL GitHub est accessible
- Vérifier le format du fichier version.json

### **"La mise à jour échoue"**
- Consulter les logs : `/var/log/supervisor/backend.err.log`
- Vérifier les permissions Git
- S'assurer qu'il n'y a pas de conflits locaux

### **"La nouvelle version n'est pas détectée"**
- Vérifier que le cache n'est pas en cause (F5 ou Ctrl+Shift+R)
- Vérifier que version.json est bien sur GitHub
- Vérifier que `current_version` dans update_service.py est correct

---

**🎉 Félicitations ! Vous savez maintenant comment fonctionne le système de détection de mises à jour de GMAO Iris.**

Pour toute question, consulter la documentation ou ouvrir une issue sur GitHub.
