# Configuration WebSocket pour GMAO Iris

## Problème
Les WebSockets (Chat Live et Tableau d'affichage collaboratif) ne fonctionnent pas sur l'installation Proxmox.

## Solution
Vous devez configurer votre reverse proxy pour supporter les WebSockets.

### Si vous utilisez Nginx (recommandé)

Ajoutez cette configuration dans votre fichier nginx.conf ou dans le site-available :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Redirection vers HTTPS (recommandé)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name votre-domaine.com;

    # Certificats SSL
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket pour le Chat Live
    location /ws/chat/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # 24 heures
        proxy_send_timeout 86400;
    }

    # WebSocket pour le Tableau d'affichage
    location /ws/whiteboard/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Frontend React
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Si vous n'utilisez pas de reverse proxy

Si le backend est directement accessible, assurez-vous que :

1. Le fichier `.env` du frontend a la bonne URL :
   ```
   REACT_APP_BACKEND_URL=http://VOTRE_IP:8001
   ```

2. Le backend écoute sur toutes les interfaces :
   ```
   uvicorn server:app --host 0.0.0.0 --port 8001
   ```

### Vérification

Pour tester si les WebSockets fonctionnent, ouvrez la console du navigateur (F12) et vérifiez :

1. **Chat Live** : Vous devriez voir "✅ WebSocket connecté" au lieu de "Mode REST"
2. **Tableau d'affichage** : L'icône WiFi devrait être verte

### Chemins WebSocket utilisés

| Fonctionnalité | Chemin | Description |
|---|---|---|
| Chat Live | `/ws/chat/{token}` | Communication en temps réel |
| Whiteboard | `/ws/whiteboard/{board_id}` | Synchronisation des tableaux |

### Diagnostic

Si les WebSockets ne fonctionnent toujours pas :

1. Vérifiez les logs backend :
   ```bash
   tail -f /var/log/supervisor/backend.err.log
   ```

2. Testez la connexion WebSocket manuellement :
   ```bash
   # Installer wscat si nécessaire
   npm install -g wscat
   
   # Tester le whiteboard
   wscat -c "ws://localhost:8001/ws/whiteboard/board_1?user_id=test&user_name=Test"
   ```

3. Vérifiez que le firewall autorise les connexions WebSocket (ports 80, 443, 8001)
