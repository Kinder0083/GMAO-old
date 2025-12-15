# 📚 Intégration du Manuel dans le Script d'Installation Proxmox

## 🎯 Objectif

Assurer que **toutes les nouvelles installations** Proxmox incluent automatiquement le manuel utilisateur complet avec **14 chapitres** et toutes les sections visibles pour tous les utilisateurs.

---

## ✅ Fichiers Modifiés et Créés

### 1. **Backend - Routes API** (Déjà corrigé)

**Fichier** : `/app/backend/manual_routes.py`

**Modifications appliquées** :
- ✅ Ajout du préfixe `/manual` au router
- ✅ Nettoyage des routes (suppression des `/manual/` redondants)
- ✅ Optimisation MongoDB avec projection `{"_id": 0}`

**Résultat** : Les routes API fonctionnent correctement :
- `GET /api/manual/content` → Renvoie 14 chapitres
- `POST /api/manual/search` → Recherche dans le manuel
- etc.

---

### 2. **Script d'Initialisation du Manuel** (Nouveau)

**Fichier** : `/app/backend/init_manual_on_install.py`

**Ce qu'il fait** :
- Crée automatiquement les **14 chapitres** avec leurs icônes
- Crée les **sections essentielles** (1-2 par chapitre)
- **IMPORTANT** : Toutes les sections ont `target_roles: []` → Visibles par TOUS
- Gère l'idempotence : ne recrée pas si déjà existant
- Retourne un code de sortie propre (0 = succès, 1 = erreur)

**Usage** :
```bash
cd /opt/gmao-iris/backend
/opt/gmao-iris/backend/venv/bin/python3 init_manual_on_install.py
```

---

## 🔧 Intégration dans le Script d'Installation Proxmox

### Étape 1 : Localiser la Section d'Initialisation

Dans votre script `/app/gmao-iris-v1.1.2-install-auto.sh`, trouvez la section où vous :
1. Créez les utilisateurs admin
2. Initialisez la base de données
3. Démarrez les services

**Recherchez une ligne similaire à** :
```bash
msg "Initialisation de la base de données..."
```

Ou :
```bash
msg "Création de l'utilisateur admin..."
```

---

### Étape 2 : Ajouter l'Initialisation du Manuel

**Ajoutez ce bloc APRÈS la création de l'admin et AVANT le démarrage des services** :

```bash
# ============================================================================
# INITIALISATION DU MANUEL UTILISATEUR
# ============================================================================
msg "Initialisation du manuel utilisateur..."

cd /opt/gmao-iris/backend

if /opt/gmao-iris/backend/venv/bin/python3 init_manual_on_install.py; then
    ok "Manuel initialisé (14 chapitres créés)"
else
    warn "Échec initialisation manuel (non bloquant)"
fi

echo ""
```

---

### Étape 3 : Emplacement Recommandé

**Exemple de placement dans le script** :

```bash
# ... installation des packages, clone du repo, etc. ...

# Configuration MongoDB
msg "Démarrage de MongoDB..."
systemctl enable mongod
systemctl start mongod
sleep 3
ok "MongoDB démarré"

# Création utilisateur admin
msg "Création de l'utilisateur administrateur..."
cd /opt/gmao-iris/backend
cat > create_admin.py << 'ADMIN_EOF'
# ... script création admin ...
ADMIN_EOF
/opt/gmao-iris/backend/venv/bin/python3 create_admin.py
ok "Utilisateur admin créé"

# ➡️ AJOUTEZ ICI LE BLOC D'INITIALISATION DU MANUEL ⬅️
msg "Initialisation du manuel utilisateur..."
if /opt/gmao-iris/backend/venv/bin/python3 init_manual_on_install.py; then
    ok "Manuel initialisé (14 chapitres)"
else
    warn "Échec init manuel (non bloquant)"
fi
echo ""

# Configuration Supervisor & démarrage services
msg "Configuration des services..."
# ... suite du script ...
```

---

## 🧪 Test de l'Intégration

### Test 1 : Installation Fraîche

1. Créez un nouveau container LXC avec votre script modifié
2. Lancez l'installation :
   ```bash
   bash gmao-iris-v1.1.2-install-auto.sh
   ```
3. Vérifiez que vous voyez :
   ```
   ▶ Initialisation du manuel utilisateur...
   ✓ Manuel initialisé (14 chapitres créés)
   ```
4. Connectez-vous à l'interface web
5. Cliquez sur "Manuel"
6. **Vérifiez** : Les **14 chapitres** doivent tous être visibles

### Test 2 : Vérification MongoDB

```bash
mongosh gmao_iris --eval "db.manual_chapters.countDocuments({})"
# Résultat attendu: 14

mongosh gmao_iris --eval "db.manual_sections.countDocuments({})"
# Résultat attendu: 14+

# Vérifier qu'aucune section n'a de target_roles restrictifs
mongosh gmao_iris --eval 'db.manual_sections.find({target_roles: {$ne: []}}).count()'
# Résultat attendu: 0
```

---

## 📝 Checklist Post-Installation

Après avoir intégré le script, vérifiez :

- [ ] Le script `init_manual_on_install.py` est présent dans le repo Git
- [ ] Le script est exécutable (`chmod +x`)
- [ ] Le bloc d'initialisation est dans le script Proxmox
- [ ] Le placement est correct (après DB, avant services)
- [ ] Test sur une installation fraîche réussit
- [ ] Les 14 chapitres sont visibles dans l'interface
- [ ] Aucune section n'est filtrée par rôle

---

## 🔄 Mise à Jour des Installations Existantes

Pour les installations **déjà déployées** qui ont le manuel incomplet :

### Option 1 : Script Standalone (Recommandé)

```bash
cd /opt/gmao-iris/backend
/opt/gmao-iris/backend/venv/bin/python3 reinit_manual_standalone.py
```

### Option 2 : Commandes MongoDB Manuelles

```bash
# Supprimer et recréer
mongosh gmao_iris --eval 'db.manual_chapters.deleteMany({})'
mongosh gmao_iris --eval 'db.manual_sections.deleteMany({})'

cd /opt/gmao-iris/backend
/opt/gmao-iris/backend/venv/bin/python3 init_manual_on_install.py
```

### Option 3 : Mise à Jour Sélective

Si le manuel existe mais certaines sections sont cachées :

```bash
# Rendre toutes les sections visibles
mongosh gmao_iris --eval 'db.manual_sections.updateMany({}, {$set: {target_roles: []}})'
```

---

## 🚨 Points d'Attention

### 1. **Ordre d'Exécution Critique**

L'initialisation du manuel DOIT se faire **APRÈS** :
- ✅ MongoDB démarré
- ✅ Base de données créée
- ✅ Utilisateur admin créé (optionnel mais recommandé)

Et **AVANT** :
- ⏸️ Démarrage des services Supervisor

### 2. **Gestion des Erreurs**

Le script d'initialisation est **non-bloquant** :
- Si le manuel existe déjà → Skip (message informatif)
- Si erreur d'initialisation → Warning (installation continue)

### 3. **target_roles = []**

**TRÈS IMPORTANT** : Toutes les sections du script `init_manual_on_install.py` ont :
```python
"target_roles": []  # Visible par TOUS
```

Ne modifiez pas cette valeur sauf si vous voulez restreindre l'accès.

---

## 📊 Comparaison Avant/Après

| Aspect | Avant | Après |
|--------|-------|-------|
| **Chapitres visibles** | 1 ou incomplet | 14 complets |
| **Sections visibles** | 2 | 14+ |
| **Routes API** | Erreur 404 | ✅ Fonctionnelles |
| **Filtrage par rôle** | Bloquait certains chapitres | Tous visibles |
| **Nouvelles installations** | Manuel vide | Manuel complet |

---

## 🎯 Résumé des Actions

1. ✅ Fichier `manual_routes.py` corrigé avec bon préfixe
2. ✅ Script `init_manual_on_install.py` créé avec 14 chapitres
3. ✅ Script `reinit_manual_standalone.py` pour dépannage
4. ⏳ **À FAIRE** : Intégrer dans `gmao-iris-v1.1.2-install-auto.sh`

---

## 📞 Support

En cas de problème après intégration :

1. **Vérifier les logs du script** :
   ```bash
   cat /var/log/gmao-iris-install.log | grep -i manual
   ```

2. **Test manuel du script** :
   ```bash
   cd /opt/gmao-iris/backend
   /opt/gmao-iris/backend/venv/bin/python3 init_manual_on_install.py
   ```

3. **Vérifier MongoDB** :
   ```bash
   mongosh gmao_iris --eval "db.manual_chapters.find({}, {title:1, _id:0})"
   ```

---

**Date de création** : Décembre 2024  
**Version** : 1.0.0  
**Auteur** : E1 - Emergent Labs
