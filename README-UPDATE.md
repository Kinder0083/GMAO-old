# 🚀 Script de Mise à Jour GMAO Iris (Proxmox)

## 📋 Description

Script automatique pour mettre à jour votre installation GMAO Iris sur un container Proxmox LXC.

## ⚡ Installation Rapide

### Sur votre serveur Proxmox :

```bash
# Télécharger le script
cd ~
wget https://raw.githubusercontent.com/[VOTRE_REPO]/GMAO/main/update-gmao.sh
# OU copier manuellement le contenu dans un fichier

# Rendre exécutable
chmod +x update-gmao.sh

# Lancer la mise à jour
./update-gmao.sh 104
```

*(Remplacez 104 par l'ID de votre container)*

## 📖 Utilisation

```bash
./update-gmao.sh <CONTAINER_ID>
```

**Exemple :**
```bash
./update-gmao.sh 104
```

## 🔄 Ce que fait le script

1. ✅ Vérifie que le container existe et est démarré
2. ✅ Vérifie que l'application est dans `/opt/gmao-iris`
3. ✅ Sauvegarde vos fichiers `.env` (configuration MQTT, URLs, etc.)
4. ✅ Arrête les services backend et frontend
5. ✅ Met à jour le code depuis GitHub (`git pull`)
6. ✅ Restaure vos fichiers `.env`
7. ✅ Installe les nouvelles dépendances (Python + Node.js)
8. ✅ Rebuild le frontend React
9. ✅ Redémarre les services
10. ✅ Vérifie que tout fonctionne

## ⏱️ Durée

**2-3 minutes** en moyenne (selon la vitesse de votre serveur)

## 🎯 Quand utiliser ce script

- ✅ Après avoir pushé des corrections sur GitHub
- ✅ Pour appliquer les mises à jour de fonctionnalités
- ✅ Après des corrections de bugs (comme les corrections MQTT)
- ✅ Pour synchroniser avec la branche `main`

## 📊 Sortie du script

```
╔════════════════════════════════════════════════════════════╗
║         GMAO IRIS - Mise à Jour Automatique               ║
║                  Version 2.0                               ║
╚════════════════════════════════════════════════════════════╝

▶ Vérification du container 104...
✓ Container 104 actif
▶ Vérification de l'installation...
✓ Installation trouvée dans /opt/gmao-iris
▶ Sauvegarde de la configuration...
✓ Configuration sauvegardée dans /tmp/gmao-backup
▶ Arrêt des services...
✓ Services arrêtés
▶ Mise à jour du code depuis GitHub...
✓ Code mis à jour depuis GitHub
▶ Restauration de la configuration...
✓ Configuration restaurée
▶ Mise à jour des dépendances backend...
✓ Dépendances backend installées
▶ Mise à jour des dépendances frontend...
✓ Dépendances frontend installées
▶ Build du frontend (peut prendre 1-2 minutes)...
✓ Frontend buildé avec succès
▶ Redémarrage des services...
✓ Services redémarrés
▶ Vérification finale...

✓ Backend: RUNNING
✓ Frontend: RUNNING

════════════════════════════════════════════════════════════
✓ Mise à jour terminée avec succès !
════════════════════════════════════════════════════════════

📍 Accès à l'application:
   • Local:  http://192.168.1.175:3000
   • Direct: http://192.168.1.175

📊 Commandes utiles:
   • Entrer dans le container: pct enter 104
   • Logs backend:  pct exec 104 -- tail -f /var/log/supervisor/backend.err.log
   • Logs frontend: pct exec 104 -- tail -f /var/log/supervisor/frontend.err.log
   • Status:        pct exec 104 -- supervisorctl status
```

## ⚠️ Avertissements

Si le script affiche des avertissements :
- **Backend: FATAL** ou **BACKOFF** → Vérifier les logs backend
- **Frontend: FATAL** → Vérifier les logs frontend
- **Erreur Git** → Vérifier votre token GitHub

## 🔍 Dépannage

### Le script ne trouve pas le container
```bash
# Lister vos containers
pct list

# Vérifier le statut
pct status 104
```

### Le container n'est pas démarré
```bash
# Démarrer le container
pct start 104
```

### Vérifier les logs après mise à jour
```bash
# Logs backend
pct exec 104 -- tail -50 /var/log/supervisor/backend.err.log

# Logs frontend
pct exec 104 -- tail -50 /var/log/supervisor/frontend.err.log
```

### Services qui ne démarrent pas
```bash
# Se connecter au container
pct enter 104

# Vérifier le statut
cd /opt/gmao-iris
supervisorctl status

# Redémarrer manuellement
supervisorctl restart backend
supervisorctl restart frontend
```

## 🛡️ Sécurité

Le script :
- ✅ Ne modifie PAS vos fichiers `.env` (ils sont sauvegardés et restaurés)
- ✅ Ne supprime PAS de données (pas de modification de la base MongoDB)
- ✅ Utilise `git reset --hard` pour éviter les conflits
- ✅ Vérifie l'existence du container avant toute action

## 📝 Notes

- Le script suppose que votre application est dans `/opt/gmao-iris`
- Les fichiers `.env` sont préservés entre les mises à jour
- La base de données MongoDB n'est jamais touchée
- Aucune donnée utilisateur n'est supprimée

## 🤝 Support

En cas de problème :
1. Vérifier les logs (commandes ci-dessus)
2. Vérifier que vous avez bien pushé sur GitHub
3. Vérifier que le container a accès à Internet

---

**Version:** 2.0  
**Dernière mise à jour:** 19/12/2024
