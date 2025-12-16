# GMAO Iris v1.1.4 - Installation Automatique sur Proxmox

## 🆕 Nouveautés v1.1.4

### Fonctionnalité principale : Détail par Catégorie (Article + DM6)
- Nouvelle section dans "Historique Achat"
- Tableau détaillé des dépenses mensuelles par combinaison (Article, DM6)
- Sélecteur de mois pour choisir la période
- 24+ catégories prédéfinies (Maintenance, EPI, Transport, etc.)

### Améliorations du script d'installation
- ✅ Création automatique de `category_mapping.py`
- ✅ Vérification et ajout automatique de l'import dans `server.py`
- ✅ Rebuild frontend automatique
- ✅ Tout fonctionne dès l'installation terminée
- ✅ Aucune intervention manuelle requise

---

## 📋 Prérequis

### Sur le serveur Proxmox :
- Proxmox VE 8.0+ (testé sur 9.0)
- Accès root
- Connexion Internet
- Au moins 4 Go de RAM disponible
- 20 Go d'espace disque

### Avant l'installation :
1. **Token GitHub** : Vous avez besoin d'un Personal Access Token GitHub avec permission `repo`
   - Allez sur : https://github.com/settings/tokens
   - Créez un token avec permission `repo`
   - Copiez le token (vous ne pourrez plus le voir après)

2. **Dépôt GitHub** : L'application doit être dans un dépôt GitHub
   - Format : `https://github.com/VOTRE_USER/VOTRE_REPO.git`

---

## 🚀 Installation en 3 étapes

### Étape 1 : Télécharger le script

Connectez-vous en SSH sur votre serveur Proxmox :

```bash
ssh root@[IP_PROXMOX]
```

Téléchargez le script d'installation :

```bash
cd ~
wget https://[VOTRE_URL]/gmao-iris-v1.1.4-install-auto.sh
chmod +x gmao-iris-v1.1.4-install-auto.sh
```

### Étape 2 : Lancer l'installation

```bash
bash gmao-iris-v1.1.4-install-auto.sh
```

Le script va vous demander :
1. **GitHub User** : Votre nom d'utilisateur GitHub
2. **Repository Name** : Nom du dépôt (ex: `gmao-iris`)
3. **GitHub Token** : Votre Personal Access Token
4. **Branch** : Branche à utiliser (ex: `main` ou `master`)
5. **Container ID** : ID du container Proxmox (ex: `100`)
6. **IP Address** : Adresse IP statique pour le container (ex: `192.168.1.50`)
7. **Gateway** : Passerelle réseau (ex: `192.168.1.1`)
8. **Admin Email** : Email de l'administrateur principal
9. **Admin Password** : Mot de passe de l'administrateur

### Étape 3 : Vérification

Une fois l'installation terminée (environ 5-10 minutes), le script affichera :

```
╔════════════════════════════════════════════════════════════════╗
║              ✅ INSTALLATION TERMINÉE !                        ║
╚════════════════════════════════════════════════════════════════╝

🌐 URL:     http://192.168.1.50

🔐 Compte principal:
   Email:        votre@email.com
   Mot de passe: [celui que vous avez défini]
```

Ouvrez votre navigateur et testez l'accès à l'application.

---

## ✅ Vérifications automatiques

Le script v1.1.4 effectue automatiquement :

### 1. Installation de l'application
- Clonage du dépôt GitHub
- Installation des dépendances Python (backend)
- Installation des dépendances Node.js (frontend)
- Build de production du frontend

### 2. Création du module de catégorisation (NOUVEAU v1.1.4)
- Création de `/opt/gmao-iris/backend/category_mapping.py`
- Mapping de 24+ catégories (Article, DM6) → Nom catégorie
- Fonction `get_category_from_article_dm6(article, dm6)`

### 3. Vérification de l'import (NOUVEAU v1.1.4)
- Détection de l'import dans `server.py`
- Ajout automatique si manquant (ligne ~31)
- Vérification post-installation

### 4. Configuration des services
- MongoDB (base de données)
- Supervisor (gestion des processus)
- Nginx (serveur web)
- Firewall UFW

### 5. Initialisation des données
- Création des comptes administrateurs
- Génération du manuel utilisateur (23 chapitres)
- Base de données prête à l'emploi

---

## 🧪 Tests post-installation

### Test 1 : Vérifier le container

```bash
pct enter [CTID]
supervisorctl status
```

**Résultat attendu** :
```
gmao-iris-backend    RUNNING   pid 396, uptime 0:05:23
gmao-iris-frontend   RUNNING   pid 397, uptime 0:05:23
```

### Test 2 : Vérifier category_mapping.py

```bash
pct enter [CTID]
ls -lh /opt/gmao-iris/backend/category_mapping.py
```

**Résultat attendu** :
```
-rw-r--r-- 1 root root 2.5K [DATE] category_mapping.py
```

### Test 3 : Vérifier l'import

```bash
pct enter [CTID]
grep -n "from category_mapping" /opt/gmao-iris/backend/server.py
```

**Résultat attendu** :
```
31:from category_mapping import get_category_from_article_dm6
```

### Test 4 : Tester l'API

```bash
curl http://[IP_CONTAINER]/api/health
```

**Résultat attendu** :
```json
{"status":"ok"}
```

### Test 5 : Tester l'interface web

1. Ouvrez http://[IP_CONTAINER] dans votre navigateur
2. Connectez-vous avec vos identifiants
3. Allez sur **"Historique Achat"**
4. Scrollez vers le bas
5. Cherchez **"📊 Détail par Catégorie (DM6)"**
6. Sélectionnez un mois
7. Le tableau doit s'afficher avec les colonnes :
   - Article (orange)
   - DM6 (bleu)
   - Catégorie
   - Montant HT
   - Nb Lignes
   - Nb Commandes
   - % du Total

---

## 🔄 Mise à jour depuis v1.1.3

Si vous avez déjà une installation v1.1.3, vous n'avez **PAS besoin de réinstaller** !

### Option 1 : Via l'interface web (RECOMMANDÉ)

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Paramètres → Mises à jour**
3. Cliquez sur **"Vérifier les mises à jour"**
4. Si v1.1.4 est disponible, cliquez sur **"Appliquer la mise à jour"**
5. Attendez la fin du processus
6. Videz le cache de votre navigateur (Ctrl+Shift+R)

### Option 2 : Via SSH (manuel)

```bash
# Se connecter au container
pct enter [CTID]

# Aller dans le répertoire
cd /opt/gmao-iris

# Mettre à jour
git pull origin main  # ou master

# Créer category_mapping.py si manquant
cd backend
cat > category_mapping.py << 'EOF'
[Copiez le contenu depuis DEPLOYMENT_GUIDE_v1.1.4.md]
EOF

# Vérifier l'import dans server.py
grep "from category_mapping" server.py || \
  sed -i '/from audit_service import AuditService/a from category_mapping import get_category_from_article_dm6' server.py

# Rebuild le frontend
cd ../frontend
yarn build

# Redémarrer les services
supervisorctl restart all

# Vérifier
supervisorctl status
```

---

## 🔧 Résolution de problèmes

### Problème : "Backend ne démarre pas"

**Solution** :
```bash
pct enter [CTID]
tail -n 50 /var/log/gmao-iris-backend.err.log
```

Cherchez les erreurs d'import. Si vous voyez `ModuleNotFoundError: No module named 'category_mapping'` :

```bash
cd /opt/gmao-iris/backend
ls category_mapping.py  # Vérifier qu'il existe
# Si manquant, le recréer (voir DEPLOYMENT_GUIDE_v1.1.4.md)
supervisorctl restart gmao-iris-backend
```

### Problème : "Section Détail par Catégorie non visible"

**Solution** :
```bash
pct enter [CTID]
cd /opt/gmao-iris/frontend
yarn build
supervisorctl restart gmao-iris-frontend
```

Puis videz le cache de votre navigateur (Ctrl+Shift+R).

### Problème : "API lente"

**Cause** : Import dans la fonction au lieu du top du fichier.

**Solution** :
```bash
pct enter [CTID]
cd /opt/gmao-iris/backend
grep -n "from category_mapping" server.py
# Doit afficher SEULEMENT ligne 31
# Si ligne ~3323 existe, la supprimer et redémarrer
```

### Problème : "Installation échoue à l'étape Git"

**Causes possibles** :
- Token GitHub invalide
- Permissions insuffisantes
- Dépôt inexistant
- Branche incorrecte

**Solution** :
Vérifiez vos informations GitHub et relancez le script.

---

## 📊 Détails de la fonctionnalité v1.1.4

### Mapping des catégories

Le fichier `category_mapping.py` contient le mapping suivant :

| Article | DM6 | Catégorie |
|---------|-----|-----------|
| YP61502 | I370300 | Maintenance Machines |
| YP61502 | I370900 | Maintenance Constructions |
| YP61502 | I370200 | Maintenance Véhicules |
| YP60607 | I380300 | Fourniture EPI |
| YP60608 | I380100 | Matières consommables |
| AP23104 | I999999 | Investissements |
| ... | ... | ... |

**Important** : Chaque combinaison (Article, DM6) est unique. Le même article peut avoir plusieurs catégories selon son DM6.

### Personnalisation

Pour ajouter ou modifier des catégories :

```bash
pct enter [CTID]
cd /opt/gmao-iris/backend
nano category_mapping.py
```

Modifiez le dictionnaire `ARTICLE_DM6_TO_CATEGORY`, puis :

```bash
supervisorctl restart gmao-iris-backend
```

---

## 📞 Support

### Documentation complète
- `/opt/gmao-iris/DEPLOYMENT_GUIDE_v1.1.4.md` (dans le container)
- `/opt/gmao-iris/PROXMOX_DEPLOYMENT_FIX.md`

### Commandes utiles

```bash
# Entrer dans le container
pct enter [CTID]

# Statut des services
supervisorctl status

# Logs backend
tail -f /var/log/gmao-iris-backend.err.log

# Logs frontend
tail -f /var/log/gmao-iris-frontend.err.log

# Redémarrer un service
supervisorctl restart gmao-iris-backend
supervisorctl restart gmao-iris-frontend

# Rebuild frontend
cd /opt/gmao-iris/frontend && yarn build
```

---

## ✨ Checklist finale

Après l'installation, vérifiez :

- [ ] Container démarré (`pct status [CTID]`)
- [ ] Services running (`supervisorctl status`)
- [ ] Fichier `category_mapping.py` présent
- [ ] Import dans `server.py` ligne 31
- [ ] Application accessible via navigateur
- [ ] Connexion avec admin fonctionne
- [ ] Page "Historique Achat" charge
- [ ] Section "Détail par Catégorie" visible
- [ ] Sélecteur de mois fonctionne
- [ ] Tableau s'affiche avec données
- [ ] Performance acceptable (< 1s)

---

**Version** : 1.1.4  
**Date** : 16 Décembre 2025  
**Script** : `gmao-iris-v1.1.4-install-auto.sh`  
**Auteur** : E1 (Emergent Agent)
