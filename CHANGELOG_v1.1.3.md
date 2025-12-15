# 📋 Changelog - GMAO Iris v1.1.3

## 🎉 Nouveautés v1.1.3 (Décembre 2024)

### ✨ Manuel Utilisateur Complet et Évolutif

#### 🆕 Initialisation Automatique du Manuel

**Problème résolu** :
- ❌ Installations fraîches sans manuel ou avec manuel incomplet
- ❌ Routes API `/api/manual/*` en erreur 404
- ❌ Chapitres cachés par filtrage de rôles

**Solution implémentée** :
- ✅ Initialisation automatique lors de l'installation
- ✅ 12 chapitres complets avec 49+ sections
- ✅ **Toutes les sections visibles par tous les rôles** (`target_roles: []`)
- ✅ Routes API corrigées avec bon préfixe (`/api/manual/`)

#### 📚 Contenu du Manuel (Évolutif)

Le manuel est généré depuis `/opt/gmao-iris/backend/generate_complete_manual.py` :

**12 Chapitres** :
1. 🚀 Guide de Démarrage (4 sections)
2. 👤 Utilisateurs (3 sections)
3. 📋 Ordres de Travail (5 sections)
4. 🔧 Équipements (4 sections)
5. 🔄 Maintenance Préventive (4 sections)
6. 📦 Gestion du Stock (4 sections)
7. 📝 Demandes d'Intervention (3 sections)
8. 💡 Demandes d'Amélioration (3 sections)
9. 📈 Projets d'Amélioration (3 sections)
10. 📊 Rapports et Analyses (3 sections)
11. ⚙️ Administration (8 sections)
12. ❓ FAQ et Dépannage (5 sections)

**Total** : 49+ sections détaillées

#### 🔧 Modifications Techniques

**Fichiers modifiés** :

1. **`gmao-iris-v1.1.3-install-auto.sh`** (Nouveau)
   - Ajout de l'initialisation du manuel après création des admins
   - Exécute automatiquement `generate_complete_manual.py`
   - Non-bloquant si échec (warning seulement)

2. **`backend/manual_routes.py`**
   - Ajout du préfixe `/manual` au router API
   - Routes nettoyées (plus de `/manual/manual/*`)
   - Optimisation MongoDB avec projection `{"_id": 0}`

3. **`backend/generate_complete_manual.py`**
   - Tous les chapitres ont `target_roles: []` par défaut
   - Permet évolution future du manuel
   - Contenu complet et détaillé

**Nouvelles routes API** :
- ✅ `GET /api/manual/content` - Récupère le manuel complet
- ✅ `POST /api/manual/search` - Recherche dans le manuel
- ✅ `GET /api/manual/export-pdf` - Export PDF
- ✅ `POST /api/manual/sections` - Créer une section (admin)
- ✅ `PUT /api/manual/sections/{id}` - Modifier une section (admin)
- ✅ `DELETE /api/manual/sections/{id}` - Supprimer une section (admin)

#### 🚀 Évolutivité

**Le manuel est conçu pour évoluer** :

1. **Ajout de nouveaux chapitres** :
   ```python
   # Dans generate_complete_manual.py
   {"id": "ch-013", "title": "🆕 Nouveau Module", ...}
   ```

2. **Ajout de nouvelles sections** :
   ```python
   # Dans ALL_SECTIONS
   "sec-013-01": {
       "title": "Nouvelle Fonctionnalité",
       "content": "...",
       "target_roles": []  # Visible par tous
   }
   ```

3. **Mise à jour du contenu** :
   - Modifier directement `generate_complete_manual.py`
   - Relancer le script : `python3 generate_complete_manual.py`
   - Ou utiliser les endpoints API admin

---

## 🔄 Migration depuis v1.1.2

### Pour Nouvelles Installations

Utilisez le nouveau script :
```bash
bash gmao-iris-v1.1.3-install-auto.sh
```

Le manuel sera automatiquement initialisé ! ✅

### Pour Installations Existantes

#### Option 1 : Script de Réinitialisation (Recommandé)

```bash
# Se connecter au container
pct enter <CTID>

# Aller dans le backend
cd /opt/gmao-iris/backend

# Activer venv
source venv/bin/activate

# Réinitialiser le manuel
python3 generate_complete_manual.py

# Redémarrer backend
supervisorctl restart gmao-iris-backend
```

#### Option 2 : Commandes MongoDB Manuelles

```bash
# Supprimer ancien manuel
mongosh gmao_iris --eval 'db.manual_chapters.deleteMany({})'
mongosh gmao_iris --eval 'db.manual_sections.deleteMany({})'
mongosh gmao_iris --eval 'db.manual_versions.deleteMany({})'

# Réinitialiser
cd /opt/gmao-iris/backend
source venv/bin/activate
python3 generate_complete_manual.py
```

#### Option 3 : Mise à Jour Sélective

Si le manuel existe mais certaines sections sont cachées :

```bash
# Rendre toutes les sections visibles
mongosh gmao_iris --eval 'db.manual_sections.updateMany({}, {$set: {target_roles: []}})'
```

---

## 🧪 Vérifications Post-Installation

### 1. Vérifier MongoDB

```bash
# Compter les chapitres
mongosh gmao_iris --eval "db.manual_chapters.countDocuments({})"
# Attendu: 12

# Compter les sections
mongosh gmao_iris --eval "db.manual_sections.countDocuments({})"
# Attendu: 49+

# Vérifier qu'aucune section n'est restreinte
mongosh gmao_iris --eval 'db.manual_sections.find({target_roles: {$ne: []}}).count()'
# Attendu: 0
```

### 2. Tester l'API

```bash
# Récupérer le manuel
curl http://localhost:8001/api/manual/content | python3 -m json.tool

# Compter les chapitres
curl -s http://localhost:8001/api/manual/content | python3 -c "import sys,json; print(len(json.load(sys.stdin)['chapters']))"
# Attendu: 12
```

### 3. Tester l'Interface Web

1. Se connecter à l'application
2. Cliquer sur le bouton "Manuel" (📖)
3. Vérifier que tous les chapitres sont visibles
4. Naviguer entre les sections

---

## 📊 Comparaison v1.1.2 → v1.1.3

| Aspect | v1.1.2 | v1.1.3 |
|--------|--------|--------|
| **Manuel inclus** | ❌ Non | ✅ Oui (automatique) |
| **Chapitres** | 0-1 | 12 |
| **Sections** | 0-2 | 49+ |
| **Routes API** | ❌ 404 | ✅ Fonctionnelles |
| **Filtrage rôles** | ⚠️ Bloque certains | ✅ Tous visibles |
| **Évolutif** | N/A | ✅ Oui |
| **Migration** | N/A | ✅ Script fourni |

---

## 🐛 Problèmes Connus et Solutions

### Problème : Manuel vide après installation v1.1.3

**Cause** : Script d'initialisation échoué

**Solution** :
```bash
cd /opt/gmao-iris/backend
source venv/bin/activate
python3 generate_complete_manual.py
supervisorctl restart gmao-iris-backend
```

### Problème : Chapitres manquants (< 12)

**Cause** : Filtrage par rôle actif

**Solution** :
```bash
mongosh gmao_iris --eval 'db.manual_sections.updateMany({}, {$set: {target_roles: []}})'
```

### Problème : Routes API 404

**Cause** : Backend pas redémarré après mise à jour

**Solution** :
```bash
supervisorctl restart gmao-iris-backend
```

---

## 🎯 Bonnes Pratiques

### 1. Maintenir le Manuel à Jour

- Modifier `generate_complete_manual.py` pour ajouter du contenu
- Toujours mettre `target_roles: []` pour visibilité maximale
- Tester après chaque modification

### 2. Sauvegardes

Avant de modifier le manuel :
```bash
mongodump --db gmao_iris --collection manual_chapters --out /backup
mongodump --db gmao_iris --collection manual_sections --out /backup
```

### 3. Développement

Pour tester en local :
```bash
cd /opt/gmao-iris/backend
source venv/bin/activate

# Modifier generate_complete_manual.py
nano generate_complete_manual.py

# Tester
python3 generate_complete_manual.py

# Vérifier
mongosh gmao_iris --eval "db.manual_chapters.find({}, {title:1, _id:0})"
```

---

## 📞 Support

En cas de problème après mise à jour vers v1.1.3 :

1. **Vérifier les logs** :
   ```bash
   tail -100 /var/log/gmao-iris-backend.err.log | grep -i manual
   ```

2. **Tester l'API manuellement** :
   ```bash
   curl http://localhost:8001/api/manual/content
   ```

3. **Réinitialiser si nécessaire** :
   ```bash
   cd /opt/gmao-iris/backend
   source venv/bin/activate
   python3 generate_complete_manual.py
   ```

---

## ✅ Checklist de Migration

Pour passer de v1.1.2 à v1.1.3 :

- [ ] Script v1.1.3 téléchargé
- [ ] Test sur environnement de dev
- [ ] Sauvegarde MongoDB effectuée
- [ ] Manuel initialisé (12 chapitres)
- [ ] Routes API testées
- [ ] Interface web vérifiée
- [ ] target_roles = [] vérifié
- [ ] Documentation à jour

---

**Date de release** : 15 Décembre 2024  
**Version** : 1.1.3  
**Compatibilité** : Proxmox 8.x et 9.0, Debian 12

**Prochaine version** : v1.2.0 (À venir)
