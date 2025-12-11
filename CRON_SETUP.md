# Configuration du Cron Job pour le Nettoyage Automatique du Chat

## 📋 Vue d'ensemble

Le script `/app/backend/cleanup_old_chat_messages.py` doit être exécuté quotidiennement pour supprimer automatiquement les messages et fichiers du chat ayant plus de 60 jours.

## 🔧 Installation sur le serveur Proxmox

### Option 1 : Cron Job (Recommandé)

1. **Connectez-vous à votre serveur Proxmox en SSH**

2. **Vérifiez le chemin vers Python :**
   ```bash
   which python3
   # Devrait afficher : /usr/bin/python3
   ```

3. **Ouvrez le crontab :**
   ```bash
   sudo crontab -e
   ```

4. **Ajoutez la ligne suivante à la fin du fichier :**
   ```bash
   # Nettoyage automatique des messages de chat de plus de 60 jours
   # Exécution quotidienne à 2h00 du matin
   0 2 * * * cd /opt/gmao-iris/backend && /usr/bin/python3 /opt/gmao-iris/backend/cleanup_old_chat_messages.py >> /var/log/chat_cleanup.log 2>&1
   ```

5. **Sauvegardez et quittez** (dans nano : Ctrl+X, puis Y, puis Entrée)

6. **Vérifiez l'installation :**
   ```bash
   sudo crontab -l
   ```

### Option 2 : Systemd Timer (Alternative moderne)

1. **Créez le fichier de service :**
   ```bash
   sudo nano /etc/systemd/system/chat-cleanup.service
   ```

   Contenu :
   ```ini
   [Unit]
   Description=Chat Live - Nettoyage des messages de plus de 60 jours
   After=network.target

   [Service]
   Type=oneshot
   WorkingDirectory=/opt/gmao-iris/backend
   ExecStart=/usr/bin/python3 /opt/gmao-iris/backend/cleanup_old_chat_messages.py
   StandardOutput=append:/var/log/chat_cleanup.log
   StandardError=append:/var/log/chat_cleanup.log
   ```

2. **Créez le fichier timer :**
   ```bash
   sudo nano /etc/systemd/system/chat-cleanup.timer
   ```

   Contenu :
   ```ini
   [Unit]
   Description=Exécuter le nettoyage du chat quotidiennement
   Requires=chat-cleanup.service

   [Timer]
   OnCalendar=daily
   OnCalendar=02:00
   Persistent=true

   [Install]
   WantedBy=timers.target
   ```

3. **Activez et démarrez le timer :**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable chat-cleanup.timer
   sudo systemctl start chat-cleanup.timer
   ```

4. **Vérifiez le statut :**
   ```bash
   sudo systemctl status chat-cleanup.timer
   ```

## 🧪 Test Manuel

Pour tester le script manuellement avant l'automatisation :

```bash
cd /opt/gmao-iris/backend
python3 cleanup_old_chat_messages.py
```

Vérifiez les logs :
```bash
cat /var/log/chat_cleanup.log
```

## 📊 Surveillance

### Vérifier les exécutions du cron job :
```bash
sudo grep "chat_cleanup" /var/log/syslog
```

### Consulter les logs du script :
```bash
tail -f /var/log/chat_cleanup.log
```

### Vérifier les prochaines exécutions (systemd timer) :
```bash
sudo systemctl list-timers chat-cleanup.timer
```

## 🔍 Dépannage

### Le script ne s'exécute pas :
1. Vérifiez que le script est exécutable :
   ```bash
   chmod +x /opt/gmao-iris/backend/cleanup_old_chat_messages.py
   ```

2. Vérifiez les variables d'environnement :
   ```bash
   sudo crontab -e
   # Ajoutez en haut du fichier :
   MONGO_URL=mongodb://localhost:27017
   ```

3. Vérifiez les permissions du fichier de log :
   ```bash
   sudo touch /var/log/chat_cleanup.log
   sudo chmod 666 /var/log/chat_cleanup.log
   ```

### Erreurs MongoDB :
Si le script ne peut pas se connecter à MongoDB, vérifiez la variable d'environnement `MONGO_URL` dans le fichier `/opt/gmao-iris/backend/.env`

## 📅 Fréquence d'exécution

- **Par défaut** : Tous les jours à 2h00 du matin
- **Personnalisation** : Modifiez le cron pattern selon vos besoins
  - `0 2 * * *` = Tous les jours à 2h00
  - `0 3 * * 0` = Tous les dimanches à 3h00
  - `0 */6 * * *` = Toutes les 6 heures

## ✅ Vérification après installation

Attendez la prochaine exécution (ou testez manuellement) et vérifiez :

1. Le fichier de log existe et contient des entrées :
   ```bash
   ls -lh /var/log/chat_cleanup.log
   cat /var/log/chat_cleanup.log
   ```

2. Les messages de plus de 60 jours ont été supprimés dans MongoDB :
   ```bash
   # Connectez-vous à MongoDB et vérifiez
   mongo gmao_iris --eval "db.chat_messages.count()"
   ```

## 📝 Notes importantes

- ⚠️ **Attention** : Les messages et fichiers supprimés ne peuvent pas être récupérés
- 💾 **Sauvegarde** : Considérez une sauvegarde régulière de la base de données avant le nettoyage
- 🕐 **Timing** : L'exécution à 2h00 du matin minimise l'impact sur les utilisateurs
- 📈 **Performance** : Le nettoyage automatique maintient la base de données légère et performante
