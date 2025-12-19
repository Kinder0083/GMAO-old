# 🚀 Script de Mise à Jour GMAO Iris (Local)

## 📋 Description

Script à exécuter **directement dans le container Proxmox** pour mettre à jour GMAO Iris.

## 📥 Installation

### Depuis votre Proxmox host, pousser le script dans le container :

```bash
# Créer le script dans le container
pct exec 104 -- bash -c 'cat > /opt/gmao-iris/update.sh' < update.sh

# Rendre exécutable
pct exec 104 -- chmod +x /opt/gmao-iris/update.sh
```

### OU créer directement dans le container :

```bash
# Entrer dans le container
pct enter 104

# Aller dans le dossier de l'application
cd /opt/gmao-iris

# Créer le script
nano update.sh
# Copier le contenu du script, Ctrl+X, Y, Enter

# Rendre exécutable
chmod +x update.sh
```

## ⚡ Utilisation

```bash
# Se connecter au container
pct enter 104

# Aller dans le dossier de l'application
cd /opt/gmao-iris

# Lancer la mise à jour
./update.sh
```

## 🎯 Ce que fait le script

1. ✅ Arrête backend et frontend
2. ✅ Sauvegarde vos `.env` (config MQTT, etc.)
3. ✅ Met à jour depuis GitHub (`git pull`)
4. ✅ Restaure vos `.env`
5. ✅ Installe les dépendances Python
6. ✅ Installe les dépendances Node.js
7. ✅ Build le frontend
8. ✅ Redémarre les services
9. ✅ Vérifie que tout fonctionne

## ⏱️ Durée

**2-3 minutes**

## 📊 Exemple de sortie

```
╔════════════════════════════════════════════════════════════╗
║         GMAO IRIS - Mise à Jour Locale                    ║
╚════════════════════════════════════════════════════════════╝

▶ Arrêt des services...
✓ Services arrêtés
▶ Sauvegarde de la configuration...
✓ Configuration sauvegardée
▶ Mise à jour du code depuis GitHub...
  • Fetch...
  • Reset...
  • Pull...
✓ Code mis à jour
▶ Restauration de la configuration...
✓ backend/.env restauré
✓ frontend/.env restauré
▶ Installation des dépendances backend...
✓ Dépendances backend installées
▶ Installation des dépendances frontend...
✓ Dépendances frontend installées
▶ Build du frontend (1-2 minutes)...
✓ Frontend buildé
▶ Redémarrage des services...
✓ Services redémarrés
▶ Vérification finale...

✓ Backend: RUNNING
✓ Frontend: RUNNING

════════════════════════════════════════════════════════════
✓ Mise à jour terminée avec succès !
════════════════════════════════════════════════════════════

📍 Accès: http://192.168.1.175:3000

📊 Commandes utiles:
   • Logs backend:  tail -f /var/log/supervisor/backend.err.log
   • Logs frontend: tail -f /var/log/supervisor/frontend.err.log
   • Status:        supervisorctl status
```

## 🔧 Workflow Complet

### Pour appliquer des corrections (ex: MQTT) :

```bash
# 1. Sur votre PC : Pushez sur GitHub
git add .
git commit -m "Fix MQTT réception messages"
git push origin main

# 2. Sur Proxmox : Entrez dans le container
pct enter 104

# 3. Allez dans le dossier de l'app
cd /opt/gmao-iris

# 4. Lancez la mise à jour
./update.sh

# 5. Attendez 2-3 minutes

# 6. Testez votre application
# http://[IP_CONTAINER]:3000
```

## ⚠️ Dépannage

### Le script ne trouve pas les fichiers

Vérifiez que vous êtes dans le bon dossier :
```bash
pwd
# Devrait afficher : /opt/gmao-iris

ls
# Devrait montrer : backend/ frontend/ update.sh
```

### Services ne redémarrent pas

```bash
# Vérifier les logs
tail -50 /var/log/supervisor/backend.err.log
tail -50 /var/log/supervisor/frontend.err.log

# Redémarrer manuellement
supervisorctl restart backend
supervisorctl restart frontend
```

### Erreur Git

```bash
# Vérifier l'état Git
git status

# Forcer le reset si nécessaire
git fetch origin
git reset --hard origin/main
git pull origin main
```

## 🛡️ Sécurité

- ✅ Ne modifie PAS vos `.env` (sauvegardés/restaurés)
- ✅ Ne touche PAS MongoDB
- ✅ Ne supprime PAS de données
- ✅ Utilise `git reset --hard` pour éviter les conflits

## 💡 Astuce

Créez un alias pour plus de rapidité :

```bash
# Ajouter dans ~/.bashrc du container
echo "alias update-gmao='cd /opt/gmao-iris && ./update.sh'" >> ~/.bashrc
source ~/.bashrc

# Ensuite, depuis n'importe où :
update-gmao
```

---

**Version:** 1.0  
**Pour:** Container Proxmox avec GMAO Iris dans `/opt/gmao-iris`
