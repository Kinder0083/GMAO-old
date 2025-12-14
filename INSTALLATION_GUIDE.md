# Guide d'Installation GMAO Iris

## 🚀 Installation Automatique (Recommandée)

### Prérequis

Avant d'exécuter le script d'installation, assurez-vous que votre système dispose de :

- **Python 3.8+**
- **Node.js 16+**
- **Yarn**
- **MongoDB** (local ou distant)
- **Supervisor**
- **Nginx** (optionnel, pour production)

### Installation sur Ubuntu/Debian

```bash
# 1. Installer les dépendances système
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm supervisor nginx mongodb

# 2. Installer Yarn
sudo npm install -g yarn

# 3. Cloner le projet (si ce n'est pas déjà fait)
cd /opt
sudo git clone <votre-repo> gmao-iris
cd gmao-iris

# 4. Rendre le script exécutable
chmod +x setup.sh

# 5. Exécuter le script d'installation
./setup.sh
```

### Ce que fait le script

Le script `setup.sh` effectue automatiquement :

1. ✅ **Vérification des prérequis** : Python, Node.js, Yarn, MongoDB, Supervisor, Nginx
2. ✅ **Configuration Python** : Création du venv, installation des dépendances
3. ✅ **Configuration Node.js** : Installation des packages avec Yarn
4. ✅ **Fichiers .env** : Création automatique avec valeurs par défaut
5. ✅ **Configuration Supervisor** : Services backend et frontend
6. ✅ **Configuration Nginx** : Reverse proxy (optionnel)
7. ✅ **Initialisation DB** : Création de l'utilisateur admin
8. ✅ **Démarrage** : Lancement automatique de tous les services

### Après l'installation

Accédez à l'application :

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8001

**Compte administrateur par défaut :**
- Email: `admin@test.com`
- Mot de passe: `testpassword`

⚠️ **Important** : Changez le mot de passe après la première connexion !

---

## 🔧 Configuration Manuelle (Avancée)

Si vous préférez configurer manuellement ou si le script automatique échoue :

### 1. Backend Python

```bash
cd /app/backend

# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

# Configurer .env
cp .env.example .env
nano .env  # Modifier selon vos besoins
```

### 2. Frontend React

```bash
cd /app/frontend

# Installer les dépendances
yarn install

# Configurer .env
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

### 3. Configuration Supervisor

Créer `/etc/supervisor/conf.d/gmao-iris.conf` :

```ini
[program:gmao-iris-backend]
directory=/app/backend
command=/app/backend/venv/bin/python server.py
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
user=www-data

[program:gmao-iris-frontend]
directory=/app/frontend
command=/usr/bin/yarn start
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
user=www-data
environment=PORT="3000"
```

Puis :

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gmao-iris-backend gmao-iris-frontend
```

### 4. Configuration Nginx (Production)

Créer `/etc/nginx/sites-available/gmao-iris` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    client_max_body_size 50M;
}
```

Activer et recharger :

```bash
sudo ln -s /etc/nginx/sites-available/gmao-iris /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ⚙️ Configuration des Variables d'Environnement

### Backend (.env)

```bash
# Base de données
MONGO_URL=mongodb://localhost:27017
DB_NAME=gmao_iris

# Sécurité
SECRET_KEY=votre-clé-secrète-très-longue
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Email (optionnel)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=noreply@gmao-iris.com
EMAIL_PASSWORD=votre-mot-de-passe

# MQTT (optionnel)
MQTT_BROKER=localhost
MQTT_PORT=1883

# Nettoyage automatique
CHAT_RETENTION_DAYS=60
CLEANUP_HOUR=3
```

### Frontend (.env)

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Pour production :**

```bash
REACT_APP_BACKEND_URL=https://votre-domaine.com
```

---

## 🐛 Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
sudo tail -f /var/log/supervisor/backend.err.log

# Problèmes courants :
# 1. Dépendance manquante (paho-mqtt)
cd /app/backend
source venv/bin/activate
pip install paho-mqtt

# 2. MongoDB non accessible
sudo systemctl status mongodb
sudo systemctl start mongodb
```

### Le frontend ne démarre pas

```bash
# Vérifier les logs
sudo tail -f /var/log/supervisor/frontend.err.log

# Réinstaller les dépendances
cd /app/frontend
rm -rf node_modules
yarn install
```

### Erreur "Bad Gateway" (502)

```bash
# Vérifier que les services fonctionnent
sudo supervisorctl status

# Redémarrer les services
sudo supervisorctl restart gmao-iris-backend gmao-iris-frontend

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Problème de connexion à MongoDB

```bash
# Vérifier MongoDB
sudo systemctl status mongodb

# Si MongoDB utilise un port différent
mongo --port 27017

# Vérifier la variable MONGO_URL dans .env
cat /app/backend/.env | grep MONGO_URL
```

---

## 🔄 Commandes Utiles

### Gestion des services

```bash
# Statut
sudo supervisorctl status

# Redémarrer
sudo supervisorctl restart gmao-iris-backend
sudo supervisorctl restart gmao-iris-frontend

# Arrêter
sudo supervisorctl stop gmao-iris-backend gmao-iris-frontend

# Démarrer
sudo supervisorctl start gmao-iris-backend gmao-iris-frontend
```

### Logs

```bash
# Backend
sudo tail -f /var/log/supervisor/backend.out.log
sudo tail -f /var/log/supervisor/backend.err.log

# Frontend
sudo tail -f /var/log/supervisor/frontend.out.log
sudo tail -f /var/log/supervisor/frontend.err.log

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Base de données

```bash
# Accéder à MongoDB
mongosh

# Utiliser la base GMAO
use gmao_iris

# Compter les utilisateurs
db.users.countDocuments()

# Lister les collections
show collections
```

---

## 📦 Mise à jour

Pour mettre à jour l'application :

```bash
cd /app

# 1. Sauvegarder la base de données
mongodump --db gmao_iris --out /backup/gmao-$(date +%Y%m%d)

# 2. Récupérer les dernières modifications
git pull

# 3. Mettre à jour les dépendances
cd backend
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
yarn install

# 4. Redémarrer les services
sudo supervisorctl restart gmao-iris-backend gmao-iris-frontend
```

Ou utilisez le système de mise à jour intégré dans l'application (section "Mise à Jour").

---

## 🆘 Support

En cas de problème persistant :

1. Consultez les logs (voir section ci-dessus)
2. Vérifiez la configuration des fichiers .env
3. Assurez-vous que tous les services requis fonctionnent
4. Utilisez le bouton "Aide" dans l'application pour signaler un problème avec capture d'écran

---

## 📝 Notes de Production

### Sécurité

- [ ] Changer le mot de passe admin par défaut
- [ ] Utiliser HTTPS (certificat SSL avec Let's Encrypt)
- [ ] Configurer un pare-feu (UFW)
- [ ] Restreindre l'accès à MongoDB
- [ ] Générer une nouvelle SECRET_KEY

### Performance

- [ ] Activer la compression Gzip dans Nginx
- [ ] Configurer le cache statique
- [ ] Augmenter les ressources si nécessaire
- [ ] Surveiller l'utilisation des ressources

### Sauvegarde

- [ ] Planifier des sauvegardes automatiques de MongoDB
- [ ] Sauvegarder les fichiers uploads régulièrement
- [ ] Tester la restauration

---

**Version du guide** : 1.0.0  
**Dernière mise à jour** : Décembre 2024
