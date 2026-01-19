# 🚀 Déploiement GMAO Iris sur Proxmox

Ce dossier contient tous les fichiers nécessaires pour déployer et configurer l'application **GMAO Iris** sur un serveur **Proxmox** avec accès via IP publique.

---

## 📦 Contenu du dossier

| Fichier | Description |
|---------|-------------|
| `install.sh` | **🆕 Script d'installation automatique complet** |
| `docker-compose.proxmox.yml` | Configuration Docker Compose |
| `DOCKER_DEPLOYMENT.md` | Guide de déploiement Docker |
| `INSTRUCTIONS_PROXMOX.md` | Instructions manuelles détaillées |
| `PREMIERE_CONNEXION.md` | Guide de première connexion |

---

## 🚀 Installation Automatique (Recommandé)

Le script `install.sh` automatise **toute l'installation** en une seule commande :

```bash
# 1. Cloner le repository
cd /opt
git clone https://github.com/VOTRE-USERNAME/gmao-iris.git
cd gmao-iris

# 2. Lancer l'installation
chmod +x deployment-proxmox/install.sh
./deployment-proxmox/install.sh -i VOTRE_IP_PUBLIQUE
```

### Ce que fait le script automatiquement :

| Étape | Description |
|-------|-------------|
| 1 | ✅ Installe Docker et Docker Compose |
| 2 | ✅ Configure docker-compose.yml avec votre IP |
| 3 | ✅ Crée les Dockerfiles backend/frontend |
| 4 | ✅ Build et démarre les containers |
| 5 | ✅ **Initialise le manuel utilisateur** (24 chapitres, 70+ sections) |
| 6 | ✅ Sauvegarde les credentials dans `credentials.txt` |

### Options disponibles :

```bash
./deployment-proxmox/install.sh --help

Options:
  -i, --ip IP         IP publique (OBLIGATOIRE)
  -p, --password PWD  Mot de passe MongoDB
  -s, --secret KEY    Clé secrète JWT
  --skip-docker       Ignorer l'installation Docker
  --skip-manual       Ignorer l'initialisation du manuel
```

### Exemple complet :

```bash
# Installation avec mot de passe personnalisé
./deployment-proxmox/install.sh -i 192.168.1.100 -p MonMotDePasse123

# Installation si Docker est déjà installé
./deployment-proxmox/install.sh -i 192.168.1.100 --skip-docker
```

---

## 🎯 Après l'installation

### Accès à l'application

```
Frontend : http://VOTRE_IP:3000
Backend  : http://VOTRE_IP:8001
```

### Compte administrateur par défaut

```
Email    : admin@gmao-iris.local
Password : Admin123!
```

⚠️ **Changez le mot de passe immédiatement après la première connexion !**

---

## 📖 Documentation supplémentaire

- **`DOCKER_DEPLOYMENT.md`** : Guide détaillé du déploiement Docker
- **`INSTRUCTIONS_PROXMOX.md`** : Instructions manuelles pas à pas
- **`PREMIERE_CONNEXION.md`** : Guide de configuration initiale

---

## 🔧 Commandes utiles

```bash
# Voir l'état des services
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f

# Redémarrer les services
docker-compose restart

# Arrêter l'application
docker-compose down

# Réinitialiser le manuel utilisateur
docker exec gmao-backend python3 /app/backend/init_manual_on_install.py
```

---

## 📝 Architecture de déploiement

```
┌─────────────────────────────────────────┐
│     Internet (IP Publique)              │
│     http://VOTRE-IP:3000                │
└──────────────┬──────────────────────────┘
               │
               │ Firewall Proxmox
               │ Ports: 3000, 8001
               │
┌──────────────▼──────────────────────────┐
│     Serveur Proxmox                     │
│  ┌─────────────────────────────────┐   │
│  │   Container Docker              │   │
│  │                                 │   │
│  │   ┌──────────┐   ┌──────────┐  │   │
│  │   │ Frontend │   │ Backend  │  │   │
│  │   │  :3000   │   │  :8001   │  │   │
│  │   └──────────┘   └──────────┘  │   │
│  │         │             │         │   │
│  │         └─────┬───────┘         │   │
│  │               │                 │   │
│  │         ┌─────▼─────┐           │   │
│  │         │  MongoDB  │           │   │
│  │         │   :27017  │           │   │
│  │         └───────────┘           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## ⚠️ Points importants

### Sécurité
- 🔒 Changez le mot de passe admin après la première connexion
- 🔒 Configurez HTTPS avec Let's Encrypt (recommandé en production)
- 🛡️ Ne jamais exposer MongoDB (port 27017) à l'extérieur

### Ports à ouvrir
- **3000** : Frontend React
- **8001** : Backend API FastAPI

---

## 🆘 Dépannage

```bash
# Vérifier que les services tournent
docker-compose ps

# Voir les logs d'erreur
docker-compose logs backend
docker-compose logs frontend

# Tester l'API backend
curl http://localhost:8001/api/version

# Réinitialiser le manuel si nécessaire
docker exec gmao-backend python3 /app/backend/init_manual_on_install.py
```

---

**Version:** 2.0  
**Dernière mise à jour:** 19 Janvier 2026  
**Testé sur:** Proxmox VE 8.x, Ubuntu 22.04 LTS
