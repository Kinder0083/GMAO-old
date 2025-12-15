# ✅ Checklist de Test - Installation Proxmox GMAO Iris v1.1.3

## 🎯 Objectif
Vérifier que l'installation automatique crée correctement le manuel utilisateur complet avec 23 chapitres.

---

## 📋 Avant de Commencer

### Prérequis
- [ ] Serveur Proxmox opérationnel
- [ ] Template Debian 12 disponible
- [ ] Accès SSH/Console au serveur Proxmox
- [ ] Script `gmao-iris-v1.1.3-install-auto.sh` à jour

### Informations à Noter
- **CTID du container** : _____________
- **Adresse IP** : _____________
- **Email admin** : _____________
- **Mot de passe admin** : _____________

---

## 🚀 Étape 1 : Installation

### 1.1 Lancer l'Installation
```bash
bash gmao-iris-v1.1.3-install-auto.sh
```

### 1.2 Surveiller les Messages Clés
Pendant l'installation, vérifiez que ces messages apparaissent :

- [ ] `📚 Initialisation du manuel utilisateur complet (23 chapitres)...`
- [ ] `✅ Manuel initialisé avec succès (23 chapitres, 61+ sections)`

**Note** : Si vous voyez `⚠️ Avertissement: Échec initialisation manuel`, notez l'erreur et passez à l'étape 3.

### 1.3 Fin de l'Installation
- [ ] Message final : `Installation terminée avec succès`
- [ ] Services démarrés : `supervisorctl status` montre `backend RUNNING` et `frontend RUNNING`

---

## 🔍 Étape 2 : Vérification Technique

### 2.1 Se Connecter au Container
```bash
pct enter <CTID>
```

### 2.2 Lancer le Script de Vérification
```bash
# Copier le script depuis /app vers Proxmox si nécessaire
# Ou télécharger depuis le dépôt Git

cd /opt/gmao-iris/backend
bash /root/verify_manual_installation.sh
```

### 2.3 Vérifier les Résultats
- [ ] `✅ Le manuel utilisateur est complet et opérationnel !`
- [ ] Chapitres : `23/23` ✅
- [ ] Sections : `61+` ✅

**Si Non Complet** : Le script propose de réinitialiser automatiquement. Répondre `o` pour accepter.

---

## 🖥️ Étape 3 : Test Interface Utilisateur

### 3.1 Accéder à l'Application
- [ ] Ouvrir le navigateur : `http://<IP_SERVER>`
- [ ] Page de connexion s'affiche correctement

### 3.2 Se Connecter
- [ ] Email : `<email_admin>`
- [ ] Mot de passe : `<password_admin>`
- [ ] Connexion réussie

### 3.3 Ouvrir le Manuel
- [ ] Cliquer sur le bouton **"Manuel"** en haut à droite
- [ ] Modal du manuel s'ouvre

### 3.4 Vérifier les Chapitres
Cochez chaque chapitre visible dans la barre latérale gauche :

#### Chapitres de Base (1-12)
- [ ] 1. 🚀 Guide de Démarrage
- [ ] 2. 👤 Utilisateurs
- [ ] 3. 📋 Ordres de Travail
- [ ] 4. 🔧 Équipements
- [ ] 5. 🔄 Maintenance Préventive
- [ ] 6. 📦 Gestion du Stock
- [ ] 7. 📝 Demandes d'Intervention
- [ ] 8. 💡 Demandes d'Amélioration
- [ ] 9. 📈 Projets d'Amélioration
- [ ] 10. 📊 Rapports et Analyses
- [ ] 11. ⚙️ Administration
- [ ] 12. ❓ FAQ et Dépannage

#### Chapitres Additionnels (13-23) - **CRITIQUE À VÉRIFIER**
- [ ] 13. 💬 Chat Live et Collaboration
- [ ] 14. 📡 Capteurs MQTT et IoT
- [ ] 15. 📝 Demandes d'Achat
- [ ] 16. 📍 Gestion des Zones
- [ ] 17. ⏱️ Compteurs
- [ ] 18. 👁️ Plan de Surveillance
- [ ] 19. ⚠️ Presqu'accidents
- [ ] 20. 📂 Documentations
- [ ] 21. 📅 Planning
- [ ] 22. 🏪 Fournisseurs
- [ ] 23. 💾 Import / Export

### 3.5 Tester les Fonctionnalités
- [ ] Cliquer sur un chapitre → Sections s'affichent
- [ ] Cliquer sur une section → Contenu s'affiche correctement
- [ ] Tester la **recherche** : Taper "MQTT" → Résultats pertinents s'affichent
- [ ] Tester le **filtre par mot-clé** : Sélectionner un tag → Filtrage fonctionne

### 3.6 Vérifier le Contenu MQTT (Chapitre 14)
- [ ] Ouvrir chapitre 14 : **Capteurs MQTT et IoT**
- [ ] Section 1 visible : "Configuration des Capteurs MQTT"
- [ ] Section 2 visible : "Dashboard IoT"
- [ ] Contenu de la section 2 mentionne "Interface à Onglets" ✅
- [ ] Contenu détaille les 3 onglets (Vue d'ensemble, Par Type, Par Localisation) ✅

---

## 🐛 Étape 4 : Dépannage (Si Problèmes)

### Problème A : Manuel Incomplet (12 chapitres au lieu de 23)

**Solution** :
```bash
# Se connecter au container
pct enter <CTID>

# Aller dans le répertoire backend
cd /opt/gmao-iris/backend

# Activer le virtualenv
source venv/bin/activate

# Réexécuter le script de génération
python3 generate_full_manual_23ch.py

# Redémarrer les services
sudo supervisorctl restart backend frontend

# Revérifier dans l'interface
```

### Problème B : Erreur lors de l'Installation du Manuel

**Vérifications** :
```bash
# 1. Vérifier MongoDB
mongo --eval "db.runCommand({ ping: 1 })"

# 2. Vérifier le virtualenv
cd /opt/gmao-iris/backend
source venv/bin/activate
which python3
# Devrait retourner : /opt/gmao-iris/backend/venv/bin/python3

# 3. Vérifier les dépendances
pip list | grep -E "(motor|pymongo)"
# Devrait montrer motor et pymongo installés

# 4. Vérifier le script
ls -la generate_full_manual_23ch.py
# Devrait exister et être exécutable

# 5. Consulter les logs
tail -100 /var/log/supervisor/backend.*.log
```

### Problème C : Le Manuel Ne S'Affiche Pas dans l'Interface

**Solution** :
```bash
# 1. Vérifier que le backend est actif
sudo supervisorctl status backend
# Devrait être RUNNING

# 2. Tester l'API du manuel
API_URL=$(grep REACT_APP_BACKEND_URL /opt/gmao-iris/frontend/.env | cut -d '=' -f2)
curl -s "$API_URL/api/manual/chapters" | head -50

# 3. Vérifier les logs frontend
tail -100 /var/log/supervisor/frontend.*.log

# 4. Redémarrer tous les services
sudo supervisorctl restart all
```

---

## 📊 Résultats du Test

### Résumé
- **Date du test** : _______________
- **Durée installation** : _______________ min
- **Chapitres trouvés** : _____ / 23
- **Sections trouvées** : _____ / 61+

### Statut Global
- [ ] ✅ **SUCCÈS** - Tout fonctionne parfaitement
- [ ] ⚠️ **PARTIEL** - Manuel incomplet mais récupérable
- [ ] ❌ **ÉCHEC** - Problèmes majeurs nécessitant investigation

### Problèmes Rencontrés
_Décrire ici les problèmes rencontrés et les solutions appliquées :_

```
(Espace pour notes)




```

### Logs Importants à Partager (Si Échec)
```bash
# Copier ces logs pour analyse
cat /var/log/supervisor/backend.err.log
tail -200 /var/log/supervisor/backend.out.log
```

---

## ✅ Validation Finale

### Critères de Succès
Pour valider le test, tous ces points doivent être cochés :
- [ ] Installation terminée sans erreur critique
- [ ] 23 chapitres visibles dans l'interface
- [ ] Recherche du manuel fonctionnelle
- [ ] Contenu MQTT Phase 2 présent
- [ ] Navigation fluide entre les chapitres

### Prochaines Étapes (Si Succès)
1. 🎉 L'installation automatique fonctionne correctement
2. 📝 Fournir un feedback positif
3. 🚀 Passer à l'utilisation normale de GMAO Iris

### Prochaines Étapes (Si Échec)
1. 📋 Compléter la section "Problèmes Rencontrés"
2. 📤 Partager les logs avec le support
3. 🔧 Appliquer les solutions proposées
4. 🔄 Relancer le test

---

## 📞 Support

**En cas de difficulté** :
1. Consulter `/app/RESUME_TRAVAUX_REALISES.md` pour les détails techniques
2. Consulter `/app/INSTALLATION_MANUEL_COMPLET_v1.1.3.md` pour le guide complet
3. Contacter le support avec :
   - Cette checklist remplie
   - Les logs backend/frontend
   - Screenshots si problème d'affichage

---

**Document créé le** : Décembre 2025  
**Version GMAO Iris** : v1.1.3  
**Testeur** : _______________  
**Signature** : _______________
