# 🔄 Réinitialisation Complète du Manuel sur Proxmox

## 📋 Contexte

Votre installation Proxmox ne contient qu'**1 chapitre** au lieu de **14 chapitres** complets.

Ce script va :
- ✅ Supprimer toutes les données du manuel existantes
- ✅ Recréer les **14 chapitres**
- ✅ Recréer les **65+ sections**
- ✅ Vérifier l'intégrité des données

---

## 🚀 Instructions

### Étape 1 : Se connecter à votre serveur Proxmox

```bash
ssh root@votre-ip-proxmox
```

Ou si vous êtes déjà dans le container LXC :

```bash
pct enter <CTID>
```

### Étape 2 : Aller dans le répertoire backend

```bash
cd /app/backend
```

### Étape 3 : Exécuter le script de réinitialisation

```bash
python3 reinit_manual_complete.py
```

**Sortie attendue :**

```
============================================================
🔄 RÉINITIALISATION COMPLÈTE DU MANUEL
============================================================

🗑️  Suppression des données existantes...
   ✅ 1 chapitres supprimés
   ✅ 2 sections supprimées
   ✅ 1 versions supprimées

📥 Importation du manuel complet...
📚 Génération du manuel complet avec 14 chapitres et 65 sections...
   ✅ Chapitre 1 créé...
   ✅ Chapitre 2 créé...
   ... (etc)
   ✅ 65 sections créées au total

🔍 Vérification de la réinitialisation...
   📚 Chapitres: 14
   📄 Sections: 65
   🏷️  Versions: 1

============================================================
✅ RÉINITIALISATION RÉUSSIE !
============================================================

Le manuel contient maintenant :
  • 14 chapitres
  • 65 sections

Vous pouvez maintenant accéder au manuel complet depuis l'interface.
```

### Étape 4 : Redémarrer le backend (optionnel)

```bash
sudo supervisorctl restart gmao-iris-backend
```

### Étape 5 : Tester dans l'interface

1. Ouvrez votre GMAO dans le navigateur
2. Cliquez sur le bouton "Manuel"
3. Vérifiez que vous voyez maintenant **14 chapitres** dans la table des matières

---

## 📚 Chapitres Attendus

Après la réinitialisation, vous devriez voir :

1. 🚀 Guide de Démarrage
2. 👥 Gestion des Utilisateurs
3. 🏭 Gestion des Équipements
4. 🛠️ Demandes d'Intervention
5. 📋 Ordres de Travail
6. 🔄 Maintenance Préventive
7. 📦 Gestion des Stocks
8. 📊 Rapports et Analyses
9. 💬 Chat Live et Collaboration
10. 📡 Capteurs MQTT et IoT
11. 📝 Demandes d'Achat
12. 💡 Demandes d'Amélioration
13. ⚙️ Configuration et Personnalisation
14. 🔧 Dépannage et FAQ

---

## 🐛 En Cas de Problème

### Erreur : "Module not found"

```bash
# Assurez-vous d'être dans le bon répertoire
cd /app/backend

# Vérifiez que le fichier existe
ls -la generate_complete_manual.py
ls -la reinit_manual_complete.py
```

### Erreur : "Connection refused" (MongoDB)

```bash
# Vérifier que MongoDB est actif
sudo systemctl status mongod

# Démarrer MongoDB si nécessaire
sudo systemctl start mongod
```

### Le manuel ne s'affiche toujours pas

```bash
# 1. Vérifier les données en base
mongosh gmao_iris --eval "db.manual_chapters.countDocuments({})"

# 2. Redémarrer le backend
sudo supervisorctl restart gmao-iris-backend

# 3. Vider le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
```

### Relancer le script en cas d'échec

```bash
cd /app/backend
python3 reinit_manual_complete.py
```

Le script est **idempotent** : il peut être exécuté plusieurs fois sans problème.

---

## ✅ Vérification Post-Installation

Après avoir exécuté le script, vérifiez :

```bash
# Compter les chapitres
mongosh gmao_iris --eval "db.manual_chapters.countDocuments({})"
# Résultat attendu: 14

# Compter les sections
mongosh gmao_iris --eval "db.manual_sections.countDocuments({})"
# Résultat attendu: 65+

# Lister les titres des chapitres
mongosh gmao_iris --eval "db.manual_chapters.find({}, {title: 1, _id: 0}).sort({order: 1})"
```

---

## 📞 Support

Si le problème persiste après cette réinitialisation :

1. Vérifiez les logs du backend :
   ```bash
   sudo tail -100 /var/log/supervisor/gmao-iris-backend.err.log
   ```

2. Testez l'API manuellement :
   ```bash
   curl http://localhost:8001/api/manual/content
   ```

---

**Dernière mise à jour** : Décembre 2024  
**Version du script** : 1.0.0
