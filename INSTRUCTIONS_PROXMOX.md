# 🚨 CONFIGURATION IMPORTANTE POUR PROXMOX 🚨

## Problème : "Erreur de connexion au serveur" à distance

Si vous avez cette erreur lors de la connexion à distance mais que ça fonctionne en local, c'est que le frontend essaie de contacter la mauvaise URL.

## ✅ SOLUTION

### Étape 1 : Identifier votre URL/IP publique

Votre serveur Proxmox est accessible via :
- Une IP publique : `http://VOTRE-IP-PUBLIQUE`
- OU un nom de domaine : `https://votre-domaine.com`

**Exemple :** Si votre IP publique est `192.168.1.100`, votre URL sera `http://192.168.1.100`

### Étape 2 : Modifier le fichier frontend/.env

Sur votre serveur Proxmox, éditez le fichier `frontend/.env` dans votre répertoire d'installation :

```bash
# Allez dans votre répertoire d'installation (exemple : /opt/GMAO/)
cd /VOTRE/CHEMIN/GMAO/

# Éditez le fichier frontend/.env
nano frontend/.env
```

**Note :** Le chemin exact dépend de votre installation. Si vous avez utilisé les scripts d'installation, c'est probablement `/opt/gmao-iris/` ou similaire.

Modifiez la ligne `REACT_APP_BACKEND_URL` avec VOTRE URL :

```env
# Remplacez par VOTRE IP ou domaine
REACT_APP_BACKEND_URL=http://VOTRE-IP-PUBLIQUE

# OU si vous avez un domaine avec HTTPS :
# REACT_APP_BACKEND_URL=https://votre-domaine.com
```

**⚠️ IMPORTANT :** 
- Si vous utilisez HTTP (pas HTTPS), l'URL doit commencer par `http://`
- Si vous utilisez HTTPS, l'URL doit commencer par `https://`
- **NE PAS** mettre de slash `/` à la fin de l'URL

### Étape 3 : Modifier le fichier backend/.env (optionnel mais recommandé)

Éditez aussi `backend/.env` dans votre répertoire d'installation :

```bash
# Dans le même répertoire que l'étape précédente
nano backend/.env
```

Modifiez ces lignes :

```env
FRONTEND_URL=http://VOTRE-IP-PUBLIQUE
BACKEND_URL=http://VOTRE-IP-PUBLIQUE
APP_URL=http://VOTRE-IP-PUBLIQUE
```

### Étape 4 : Redémarrer les services

```bash
# Redémarrer le frontend pour charger la nouvelle config
sudo supervisorctl restart frontend

# Redémarrer le backend (si vous avez modifié backend/.env)
sudo supervisorctl restart backend

# Vérifier que tout tourne
sudo supervisorctl status
```

### Étape 5 : Vider le cache du navigateur

**TRÈS IMPORTANT !** Sur votre ordinateur/téléphone, videz le cache du navigateur :
- Chrome/Edge : `Ctrl + Shift + Delete`
- Firefox : `Ctrl + Shift + Delete`
- Safari : `Cmd + Option + E`

Puis rechargez la page avec `Ctrl + F5` (ou `Cmd + Shift + R` sur Mac)

---

## 🔍 Vérification

Pour vérifier que tout fonctionne, ouvrez votre navigateur et testez :

1. **Page de login** : `http://VOTRE-IP-PUBLIQUE` → Doit afficher la page de connexion
2. **API Backend** : `http://VOTRE-IP-PUBLIQUE/api/updates/version` → Doit retourner du JSON

---

## 📞 Exemple Complet

Si votre IP publique est `192.168.1.100` :

**frontend/.env** :
```env
REACT_APP_BACKEND_URL=http://192.168.1.100
```

**backend/.env** :
```env
FRONTEND_URL=http://192.168.1.100
BACKEND_URL=http://192.168.1.100
APP_URL=http://192.168.1.100
```

Puis redémarrer :
```bash
sudo supervisorctl restart frontend backend
```

---

## ❓ Besoin d'aide ?

Si après ces étapes ça ne fonctionne toujours pas :

1. Vérifiez vos logs :
```bash
tail -50 /var/log/supervisor/backend.err.log
tail -50 /var/log/supervisor/frontend.err.log
```

2. Vérifiez que les ports sont ouverts sur votre firewall :
   - Port 80 (HTTP)
   - Port 443 (HTTPS si applicable)

3. Testez l'API directement depuis votre serveur :
```bash
curl http://localhost:8001/api/updates/version
```
