# Guide de Déploiement GMAO IRIS

## 🚨 Problème : Page Nginx par défaut

Si vous voyez "Welcome to nginx!" au lieu de l'application, cela signifie que nginx n'est pas configuré pour servir votre application React.

## ✅ Solution Rapide

### 1. Vérifier que les services sont en cours d'exécution

```bash
sudo supervisorctl status
```

Vous devriez voir :
- `backend RUNNING`
- `frontend RUNNING`  
- `mongodb RUNNING`

Si un service est `STOPPED` :
```bash
sudo supervisorctl start backend
sudo supervisorctl start frontend
```

### 2. Vérifier les logs

**Logs Frontend :**
```bash
tail -n 100 /var/log/supervisor/frontend.out.log
tail -n 100 /var/log/supervisor/frontend.err.log
```

**Logs Backend :**
```bash
tail -n 100 /var/log/supervisor/backend.out.log
tail -n 100 /var/log/supervisor/backend.err.log
```

### 3. Rebuild le Frontend

Si le frontend ne démarre pas :

```bash
cd /app/frontend
yarn install
yarn build
sudo supervisorctl restart frontend
```

### 4. Configuration Nginx (si problème persiste)

Si vous voyez toujours la page nginx par défaut, vérifiez la configuration nginx :

```bash
# Vérifier la configuration nginx active
cat /etc/nginx/sites-enabled/default

# Ou
cat /etc/nginx/conf.d/default.conf
```

La configuration doit pointer vers votre application. Si elle pointe vers `/usr/share/nginx/html`, c'est le problème.

**Solution temporaire - Servir via le port 3000 directement :**

Accédez à l'application via : `http://votre-ip:3000`

## 📧 Configuration Email (setup-email.sh)

Le script `setup-email.sh` doit être exécuté **manuellement** après l'installation :

```bash
cd /app
bash setup-email.sh
```

Ce script vous demandera :
- Serveur SMTP
- Port SMTP  
- Nom d'utilisateur
- Mot de passe
- Email expéditeur

Une fois configuré, redémarrez le backend :
```bash
sudo supervisorctl restart backend
```

## 🔧 Déploiement sur Emergent Platform

### Vérification pré-déploiement

1. **Vérifier les variables d'environnement :**

```bash
# Backend
cat /app/backend/.env

# Frontend
cat /app/frontend/.env
```

2. **S'assurer que REACT_APP_BACKEND_URL pointe vers la bonne URL**

3. **Tester localement avant de déployer**

### Post-déploiement

Après chaque déploiement GitHub :

1. Les services redémarrent automatiquement
2. Le frontend se rebuild automatiquement
3. Les dépendances se réinstallent si nécessaire

**Si quelque chose ne fonctionne pas :**

```bash
# Forcer un rebuild complet
cd /app/frontend
yarn install
yarn build
sudo supervisorctl restart frontend

cd /app/backend
pip install -r requirements.txt
sudo supervisorctl restart backend
```

## 🐛 Dépannage

### Problème : "Cannot connect to backend"

Vérifiez que `REACT_APP_BACKEND_URL` dans `/app/frontend/.env` pointe vers la bonne URL.

### Problème : "Database connection failed"

Vérifiez que MongoDB est démarré :
```bash
sudo supervisorctl status mongodb
sudo supervisorctl start mongodb
```

### Problème : "502 Bad Gateway"

Le backend ne répond pas. Vérifiez les logs :
```bash
tail -n 50 /var/log/supervisor/backend.err.log
```

### Problème : Page blanche ou erreur React

Reconstruisez le frontend :
```bash
cd /app/frontend
rm -rf node_modules
yarn install
yarn build
sudo supervisorctl restart frontend
```

## 📝 Architecture de Déploiement

```
Nginx (Port 80/443)
    ↓
    ├─→ Frontend (React, Port 3000)
    │   └─→ API calls → Backend
    │
    └─→ Backend (FastAPI, Port 8001)
        └─→ MongoDB (Port 27017)
```

## ✅ Checklist Post-Installation

- [ ] Services démarrés (supervisorctl status)
- [ ] Frontend accessible (http://votre-url ou http://votre-ip:3000)
- [ ] Backend répond (http://votre-url/api/health ou http://votre-ip:8001/api/health)
- [ ] MongoDB connecté (vérifier logs backend)
- [ ] Configuration email effectuée (si nécessaire)
- [ ] Test de connexion utilisateur (admin@test.com / password)
- [ ] Test tableau d'affichage (création/suppression d'objets)

## 🆘 Support

Si le problème persiste après avoir suivi ce guide :

1. Capturez les logs :
```bash
sudo supervisorctl status > status.log
tail -n 200 /var/log/supervisor/frontend.err.log > frontend-error.log
tail -n 200 /var/log/supervisor/backend.err.log > backend-error.log
```

2. Partagez ces fichiers pour diagnostic approfondi.
