# 🐳 Déploiement Docker sur Proxmox

Guide complet pour déployer **GMAO Iris** avec Docker sur Proxmox.

---

## 📋 Prérequis

- Proxmox VE installé et configuré
- Container LXC Ubuntu 22.04 créé (ou VM)
- Docker et Docker Compose installés
- Votre IP publique Proxmox
- Ports 3000 et 8001 accessibles depuis l'extérieur

---

## 🚀 Installation rapide

### 1. Préparer le container Proxmox

```bash
# Sur le host Proxmox, créez un container LXC
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname gmao-iris \
  --memory 4096 \
  --cores 2 \
  --rootfs local-lvm:32 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1

# Démarrer le container
pct start 100

# Entrer dans le container
pct enter 100
```

### 2. Installer Docker dans le container

```bash
# Mettre à jour le système
apt update && apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installer Docker Compose
apt install docker-compose -y

# Vérifier l'installation
docker --version
docker-compose --version
```

### 3. Cloner le repository

```bash
# Installer git si nécessaire
apt install git -y

# Cloner votre repository
cd /opt
git clone https://github.com/VOTRE-USERNAME/gmao-iris.git
cd gmao-iris
```

### 4. Configurer l'application

```bash
# Copier le fichier docker-compose
cp deployment-proxmox/docker-compose.proxmox.yml docker-compose.yml

# Éditer le fichier avec votre IP publique
nano docker-compose.yml
```

**Modifiez ces lignes :**
```yaml
# Ligne 48: Remplacez par votre IP
APP_URL: http://VOTRE-IP-PUBLIQUE:3000

# Ligne 60: Remplacez par votre IP
REACT_APP_BACKEND_URL: http://VOTRE-IP-PUBLIQUE:8001

# IMPORTANT: Changez aussi le SECRET_KEY et le mot de passe MongoDB !
```

### 5. Créer les fichiers Dockerfile

#### Backend Dockerfile

```bash
# Créer le Dockerfile pour le backend
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app/backend

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p uploads /app/backups

# Exposer le port
EXPOSE 8001

# Commande de démarrage
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
EOF
```

#### Frontend Dockerfile

```bash
# Créer le Dockerfile pour le frontend
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build

WORKDIR /app

# Copier package.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Argument pour l'URL backend
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build l'application
RUN npm run build

# Stage de production avec Nginx
FROM nginx:alpine

# Copier les fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
EOF
```

#### Configuration Nginx pour le frontend

```bash
cat > frontend/nginx.conf << 'EOF'
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 6. Démarrer l'application

```bash
# Build et démarrer les containers
docker-compose up -d --build

# Vérifier que tout tourne
docker-compose ps

# Voir les logs
docker-compose logs -f
```

### 7. Initialiser le Manuel Utilisateur

⚠️ **IMPORTANT** : Après le premier démarrage, initialisez le manuel utilisateur :

```bash
# Entrer dans le container backend
docker exec -it gmao-iris-backend bash

# Exécuter le script d'initialisation du manuel
python3 init_manual_on_install.py

# Ou directement sans entrer dans le container
docker exec gmao-iris-backend python3 /app/backend/init_manual_on_install.py
```

Le manuel sera créé avec :
- 📚 **24 chapitres** couvrant toutes les fonctionnalités
- 📄 **70+ sections** détaillées
- 📋 **Ordres Type** (Modèles d'OT)
- 📝 **Modèles de Formulaires** et Créateur personnalisé
- 👥 **Gestion des Rôles** et Permissions
- 💡 **Aide Contextuelle** et Tooltips enrichis

---

## 🔥 Configuration du Firewall Proxmox

**Sur le HOST Proxmox** (pas dans le container) :

```bash
# Autoriser les ports nécessaires
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
iptables -A INPUT -p tcp --dport 8001 -j ACCEPT

# Sauvegarder les règles
apt install iptables-persistent -y
iptables-save > /etc/iptables/rules.v4
```

---

## ✅ Vérification

### 1. Tester le backend

```bash
# Depuis le container
curl http://localhost:8001/api/version

# Depuis l'extérieur
curl http://VOTRE-IP-PUBLIQUE:8001/api/version
```

### 2. Tester le frontend

Ouvrez votre navigateur :
```
http://VOTRE-IP-PUBLIQUE:3000
```

Connectez-vous avec :
- Email : `admin@gmao-iris.local`
- Password : `Admin123!`

---

## 🔧 Commandes utiles

### Gestion des containers

```bash
# Voir les logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart backend
docker-compose restart frontend

# Arrêter tout
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Rebuild un service
docker-compose up -d --build backend
```

### Accéder à un container

```bash
# Backend
docker exec -it gmao-backend bash

# Frontend
docker exec -it gmao-frontend sh

# MongoDB
docker exec -it gmao-mongodb mongosh
```

### Backup MongoDB

```bash
# Créer un backup
docker exec gmao-mongodb mongodump \
  --username admin \
  --password changeme_mongodb_password \
  --authenticationDatabase admin \
  --out /backup

# Copier le backup hors du container
docker cp gmao-mongodb:/backup ./backup-$(date +%Y%m%d)
```

---

## 🆘 Dépannage

### Problème : Container ne démarre pas

```bash
# Voir les logs détaillés
docker-compose logs backend
docker-compose logs frontend

# Vérifier la configuration
docker-compose config
```

### Problème : "Connection refused"

```bash
# Vérifier que les ports sont bien exposés
netstat -tlnp | grep -E "3000|8001"

# Vérifier que les containers tournent
docker ps
```

### Problème : MongoDB connection error

```bash
# Vérifier les logs MongoDB
docker-compose logs mongodb

# Tester la connexion
docker exec -it gmao-mongodb mongosh \
  -u admin \
  -p changeme_mongodb_password \
  --authenticationDatabase admin
```

### Problème : Frontend ne se connecte pas au backend

Vérifiez que `REACT_APP_BACKEND_URL` est correctement configuré :

```bash
# Reconstruire le frontend avec la bonne URL
docker-compose up -d --build frontend
```

---

## 🔄 Mise à jour de l'application

```bash
# Arrêter les services
docker-compose down

# Mettre à jour le code
git pull origin main

# Reconstruire et redémarrer
docker-compose up -d --build

# Vérifier
docker-compose ps
```

---

## 📊 Monitoring

### Utiliser Portainer (optionnel)

```bash
# Installer Portainer
docker volume create portainer_data

docker run -d -p 9000:9000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Accéder à Portainer
# http://VOTRE-IP:9000
```

### Logs centralisés

```bash
# Voir tous les logs en temps réel
docker-compose logs -f --tail=100

# Logs d'un service spécifique
docker-compose logs -f backend --tail=100
```

---

## 🔒 Sécurité en production

### 1. Utiliser des secrets forts

```bash
# Générer un SECRET_KEY fort
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. Configurer HTTPS avec Let's Encrypt

```bash
# Installer Certbot
apt install certbot python3-certbot-nginx -y

# Obtenir un certificat
certbot --nginx -d votre-domaine.com
```

### 3. Limiter les origines CORS

Dans `backend/server.py`, modifiez :
```python
allow_origins=["http://VOTRE-IP-PUBLIQUE:3000"]  # Au lieu de ["*"]
```

---

## 📝 Checklist de déploiement

- [ ] Container Proxmox créé
- [ ] Docker et Docker Compose installés
- [ ] Repository cloné
- [ ] docker-compose.yml configuré avec votre IP
- [ ] SECRET_KEY changé
- [ ] Mot de passe MongoDB changé
- [ ] Dockerfiles créés
- [ ] Build réussi : `docker-compose build`
- [ ] Containers démarrés : `docker-compose up -d`
- [ ] Ports ouverts dans le firewall (3000, 8001)
- [ ] Backend accessible : `curl http://IP:8001/api/version`
- [ ] Frontend accessible : `http://IP:3000`
- [ ] Login admin fonctionne
- [ ] Base de données persistante testée

---

**Succès !** 🎉 Votre application GMAO Iris est maintenant déployée sur Proxmox avec Docker !
