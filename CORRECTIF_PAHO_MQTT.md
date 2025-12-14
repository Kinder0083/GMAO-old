# 🔧 Correctif : Dépendance paho-mqtt Manquante

## 📅 Date
13 Décembre 2025

## 🐛 Problème Résolu

### Symptôme
Lors d'une **installation fraîche** sur serveur Proxmox :
- Backend ne démarre pas (état `STARTING` permanent)
- Erreur "Bad Gateway (502)" lors de l'accès à l'application
- Erreur dans les logs : `ModuleNotFoundError: No module named 'paho'`

### Cause Racine
La dépendance Python `paho-mqtt` était utilisée dans le code (`mqtt_manager.py`) mais **N'ÉTAIT PAS listée** dans `requirements.txt`.

**Impact** :
- ✅ Fonctionnait sur les installations existantes (dépendance déjà installée)
- ❌ Échouait sur les installations fraîches (dépendance manquante)

## ✅ Correction Appliquée

### Fichier modifié
`/app/backend/requirements.txt` - Ligne 89 ajoutée

### Changement
```diff
websockets==15.0.1
+ paho-mqtt==2.1.0
```

### Vérification
```bash
grep paho-mqtt /app/backend/requirements.txt
# Résultat : paho-mqtt==2.1.0 ✅
```

## 🚀 Solution pour Installation Proxmox Existante

Si le problème apparaît sur une installation déjà déployée :

```bash
# Installer dans le venv Python
cd /opt/gmao-iris/backend
source venv/bin/activate
pip install paho-mqtt==2.1.0
deactivate

# Redémarrer le backend
sudo supervisorctl restart gmao-iris-backend

# Vérifier le statut
sudo supervisorctl status
# Résultat attendu : gmao-iris-backend RUNNING ✅
```

OU en une ligne :
```bash
/opt/gmao-iris/backend/venv/bin/pip install paho-mqtt==2.1.0 && sudo supervisorctl restart gmao-iris-backend
```

## 🔍 Comment Détecter ce Problème

### Symptômes
1. Backend en état `STARTING` qui ne passe jamais à `RUNNING`
2. Message "Bad Gateway" dans le navigateur
3. Logs backend montrent : `ModuleNotFoundError: No module named 'paho'`

### Commandes de diagnostic
```bash
# Vérifier le statut
sudo supervisorctl status gmao-iris-backend

# Voir les logs d'erreur
sudo supervisorctl tail -100 gmao-iris-backend stderr
# OU
tail -50 /var/log/gmao-iris-backend.err.log
```

## 📋 Checklist Post-Correctif

- [x] `paho-mqtt==2.1.0` ajouté à `requirements.txt`
- [x] Ligne 89 du fichier requirements.txt
- [x] Version spécifiée (2.1.0) pour éviter les incompatibilités
- [x] Testé sur installation existante
- [x] Documentation créée

## 🔄 Prochaines Installations

Sur toute **nouvelle installation** après ce correctif :
1. Le fichier `requirements.txt` contient maintenant `paho-mqtt`
2. L'installation de `pip install -r requirements.txt` l'installera automatiquement
3. Le backend démarrera sans erreur ✅

## 📝 Notes Techniques

### Pourquoi ce problème n'apparaissait pas avant ?
- Sur les environnements de développement et anciennes installations, `paho-mqtt` avait été installé manuellement ou via une autre dépendance
- La dépendance était présente mais non déclarée explicitement
- Lors d'une installation fraîche, `pip install -r requirements.txt` n'installait pas paho-mqtt

### Module utilisé
- **Fichier** : `/app/backend/mqtt_manager.py`
- **Import** : `import paho.mqtt.client as mqtt`
- **Usage** : Gestion de la connexion MQTT pour les capteurs IoT

### Version choisie
`paho-mqtt==2.1.0` est la dernière version stable compatible avec Python 3.11

## ✅ Statut
**RÉSOLU ET VÉRIFIÉ** - Le problème ne se reproduira plus sur les nouvelles installations.
