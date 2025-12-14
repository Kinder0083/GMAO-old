# 🔍 Guide de Diagnostic - Bad Gateway sur Installation Proxmox

## Étape 1 : Vérifier le statut des services

```bash
sudo supervisorctl status
```

**Résultat attendu** :
```
backend     RUNNING
frontend    RUNNING
mongodb     RUNNING
nginx       RUNNING
```

Si un service est en état **STOPPED** ou **FATAL**, c'est là le problème.

---

## Étape 2 : Vérifier les logs Backend

```bash
tail -100 /var/log/supervisor/backend.err.log
```

**Rechercher** :
- ❌ `ModuleNotFoundError` : Dépendance Python manquante
- ❌ `ImportError` : Problème d'import
- ❌ `SyntaxError` : Erreur de syntaxe dans le code
- ❌ `AttributeError` : Erreur d'attribut
- ❌ `Connection refused` : MongoDB non accessible

---

## Étape 3 : Vérifier les logs Frontend

```bash
tail -100 /var/log/supervisor/frontend.err.log
```

**Rechercher** :
- ❌ Erreurs de compilation
- ❌ Modules manquants
- ❌ Erreurs de syntaxe

---

## Étape 4 : Tester l'accès au Backend directement

```bash
curl http://localhost:8001/docs
```

**Si ça retourne du HTML** → Backend fonctionne ✅  
**Si ça retourne une erreur** → Backend ne fonctionne pas ❌

---

## Étape 5 : Tester MongoDB

```bash
mongosh --eval "db.version()"
```

**Si ça affiche une version** → MongoDB fonctionne ✅  
**Si erreur de connexion** → MongoDB ne fonctionne pas ❌

---

## Erreurs Courantes et Solutions

### 1. Backend ne démarre pas - ModuleNotFoundError

**Cause** : Dépendances Python manquantes

**Solution** :
```bash
cd /app/backend
pip3 install -r requirements.txt
sudo supervisorctl restart backend
```

### 2. Frontend ne compile pas - Module not found

**Cause** : Dépendances Node manquantes

**Solution** :
```bash
cd /app/frontend
yarn install
sudo supervisorctl restart frontend
```

### 3. MongoDB ne démarre pas

**Cause** : Service non démarré ou problème de permissions

**Solution** :
```bash
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 4. Nginx retourne 502 Bad Gateway

**Cause** : Le backend ne répond pas sur le port 8001

**Solution** :
```bash
# Vérifier si le port 8001 écoute
sudo netstat -tlnp | grep 8001

# Si rien, redémarrer le backend
sudo supervisorctl restart backend

# Vérifier les logs
tail -50 /var/log/supervisor/backend.err.log
```

### 5. Erreur de syntaxe Python

**Cause** : Incompatibilité de version Python ou code corrompu

**Solution** :
```bash
# Vérifier la version Python
python3 --version
# Doit être >= 3.9

# Réinstaller depuis GitHub
cd /app
git pull origin main
sudo supervisorctl restart all
```

---

## Commandes de Diagnostic Rapide

```bash
# Tout en un
echo "=== Statut Services ===" && \
sudo supervisorctl status && \
echo -e "\n=== Backend Logs (dernières 20 lignes) ===" && \
tail -20 /var/log/supervisor/backend.err.log && \
echo -e "\n=== Test Backend ===" && \
curl -I http://localhost:8001/docs 2>&1 | head -3 && \
echo -e "\n=== Test MongoDB ===" && \
mongosh --eval "db.version()" 2>&1 | grep -E "version|error"
```

---

## Contact Support

Si le problème persiste après ces vérifications, fournir :
1. Sortie de `sudo supervisorctl status`
2. Dernières 100 lignes de `/var/log/supervisor/backend.err.log`
3. Dernières 100 lignes de `/var/log/supervisor/frontend.err.log`
4. Version Python : `python3 --version`
5. Version Node : `node --version`
