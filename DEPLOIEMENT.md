# 🚀 Guide de Déploiement - GMAO Iris

Ce document vous guide pour déployer l'application **GMAO Iris** sur différents environnements.

---

## 📁 Dossier de Déploiement

Tous les fichiers de configuration pour le déploiement Proxmox sont dans le dossier :

```
📂 deployment-proxmox/
```

**Consultez ce dossier pour :**
- Configuration Proxmox avec IP publique
- Déploiement Docker
- Scripts automatiques
- Guides complets

---

## 🎯 Environnements Supportés

### 1. 🔵 Emergent (Production Cloud)
**Environnement actuel** - Déploiement automatique via Kubernetes

**URL d'accès :** https://drawshare-sync.preview.emergentagent.com

**Caractéristiques :**
- ✅ Déploiement automatique
- ✅ HTTPS avec certificat SSL
- ✅ Reverse proxy configuré
- ✅ Base de données MongoDB hébergée
- ✅ Backups automatiques

**Aucune configuration requise** - Tout est géré automatiquement.

---

### 2. 🟢 Proxmox (Auto-hébergement)
**Pour déployer sur votre propre serveur Proxmox**

**📖 Documentation complète :** `deployment-proxmox/README.md`

#### Démarrage rapide

```bash
# 1. Cloner le repository sur votre Proxmox
git clone https://github.com/VOTRE-USERNAME/gmao-iris.git
cd gmao-iris

# 2. Utiliser le script automatique
cd deployment-proxmox
chmod +x configure-proxmox-ip-publique.sh
./configure-proxmox-ip-publique.sh

# 3. Accéder à votre application
# http://VOTRE-IP-PUBLIQUE:3000
```

#### Fichiers disponibles

| Fichier | Description |
|---------|-------------|
| `README.md` | Vue d'ensemble et démarrage rapide |
| `INSTRUCTIONS_PROXMOX.md` | Guide manuel complet pas à pas |
| `DOCKER_DEPLOYMENT.md` | Déploiement avec Docker et Docker Compose |
| `configure-proxmox-ip-publique.sh` | Script automatique de configuration |
| `update-proxmox.sh` | Script de mise à jour |
| `docker-compose.proxmox.yml` | Configuration Docker Compose |
| `.env.example` | Fichier exemple de configuration |

---

### 3. 🟠 Autres Environnements

#### VPS (DigitalOcean, OVH, etc.)
Suivez les instructions Proxmox, elles sont compatibles avec la plupart des VPS Linux.

#### Server Bare Metal
Utilisez le guide Docker dans `deployment-proxmox/DOCKER_DEPLOYMENT.md`

#### VM Locale
Même procédure que Proxmox.

---

## ⚙️ Configuration Requise

### Minimale (pour tests)
- **CPU :** 2 cœurs
- **RAM :** 2 GB
- **Disque :** 10 GB
- **OS :** Ubuntu 20.04+ / Debian 11+

### Recommandée (pour production)
- **CPU :** 4 cœurs
- **RAM :** 4 GB
- **Disque :** 20 GB (SSD)
- **OS :** Ubuntu 22.04 LTS

### Ports requis
- **3000** : Frontend React
- **8001** : Backend API FastAPI
- **27017** : MongoDB (interne uniquement)

---

## 🔧 Stack Technique

- **Frontend :** React 18 + Vite
- **Backend :** FastAPI (Python 3.11)
- **Base de données :** MongoDB 7.0
- **Authentification :** JWT
- **Styling :** Tailwind CSS + Shadcn/UI

---

## 📖 Documentation Détaillée

### Pour Proxmox / Auto-hébergement
👉 **Consultez le dossier `deployment-proxmox/`**

Guides disponibles :
1. **README.md** - Vue d'ensemble
2. **INSTRUCTIONS_PROXMOX.md** - Guide manuel complet
3. **DOCKER_DEPLOYMENT.md** - Déploiement Docker

### Pour développement local
Consultez `README.md` à la racine du projet

---

## 🆘 Support

### Problèmes de déploiement Proxmox
1. Consultez `deployment-proxmox/INSTRUCTIONS_PROXMOX.md` (section Dépannage)
2. Vérifiez les logs
3. Testez les ports avec `netstat -tlnp | grep -E "3000|8001"`

### Problèmes généraux
1. Ouvrez une issue sur GitHub
2. Incluez les logs d'erreur
3. Décrivez votre environnement

---

## 🔄 Mise à jour

### Sur Proxmox
```bash
cd /chemin/vers/gmao-iris
./deployment-proxmox/update-proxmox.sh
```

### Sur Emergent
Automatique via git push

---

## ✅ Checklist Post-Déploiement

- [ ] L'application est accessible via l'URL
- [ ] Le login admin fonctionne
- [ ] Les ports sont ouverts dans le firewall
- [ ] Les logs ne montrent pas d'erreurs
- [ ] MongoDB est accessible (en interne)
- [ ] Les fichiers uploadés sont sauvegardés
- [ ] Backup MongoDB configuré
- [ ] HTTPS configuré (production)

---

## 🔐 Sécurité

### Checklist de sécurité production

- [ ] Changez tous les mots de passe par défaut
- [ ] Générez un nouveau `SECRET_KEY` fort
- [ ] Limitez les origines CORS (pas de `*`)
- [ ] Configurez HTTPS avec Let's Encrypt
- [ ] Activez le firewall (UFW ou iptables)
- [ ] Configurez les backups MongoDB automatiques
- [ ] Limitez l'accès SSH (clé uniquement)
- [ ] Mettez à jour régulièrement le système

---

## 📊 Monitoring

### Vérification santé de l'application

```bash
# Backend API
curl http://VOTRE-IP:8001/api/version

# Frontend
curl http://VOTRE-IP:3000

# MongoDB (depuis le container)
mongosh -u admin -p PASSWORD --eval "db.adminCommand('ping')"
```

### Logs

```bash
# Backend
tail -f /var/log/supervisor/backend.err.log

# Frontend
tail -f /var/log/supervisor/frontend.err.log

# Docker
docker-compose logs -f
```

---

## 📞 Contact

Pour toute question sur le déploiement :
- GitHub Issues : [Créer une issue](https://github.com/VOTRE-USERNAME/gmao-iris/issues)
- Documentation : `deployment-proxmox/`

---

**Version :** 1.5.0  
**Dernière mise à jour :** 19 Novembre 2025
