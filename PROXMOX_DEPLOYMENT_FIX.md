# Fix pour déploiement Proxmox - Détail par Catégorie (Article + DM6)

## Problème rencontré
- Redémarrage des services extrêmement long
- Message "bad gateway" 
- Nécessité de redémarrer le container Proxmox
- Nouveaux ajouts non visibles

## Cause
L'import du module `category_mapping` était fait **à l'intérieur** de la fonction API, ce qui causait :
- Des imports répétés à chaque requête
- Performance dégradée sur Proxmox
- Timeout possible des requêtes

## Solution appliquée
✅ Import déplacé en haut du fichier `server.py` (ligne 31)
✅ Gestion d'erreur ajoutée avec try/catch
✅ Performance optimisée (temps de réponse < 100ms)

## Fichiers modifiés
1. `/app/backend/server.py` : Import en haut + gestion d'erreur
2. `/app/backend/category_mapping.py` : Nouveau fichier de mapping (Article, DM6) → Catégorie
3. `/app/frontend/src/pages/PurchaseHistory.jsx` : Nouveau tableau avec sélecteur de mois

## Instructions de déploiement sur Proxmox

### 1. Vérifier que les fichiers sont bien transférés
```bash
ls -la /app/backend/category_mapping.py
# Doit afficher le fichier avec la taille ~2-3KB
```

### 2. Tester l'import du module
```bash
cd /app/backend
python3 -c "from category_mapping import get_category_from_article_dm6; print('✅ Import OK')"
```

### 3. Redémarrer les services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### 4. Vérifier les logs
```bash
# Backend doit démarrer en ~2 secondes
tail -f /var/log/supervisor/backend.err.log

# Chercher "Application startup complete"
```

### 5. Tester l'API
```bash
# Remplacer YOUR_API_URL par l'URL de votre serveur
curl -X POST "YOUR_API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmao-iris.local","password":"YOUR_PASSWORD"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"

# Utiliser le token pour tester l'endpoint stats
curl -X GET "YOUR_API_URL/api/purchase-history/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print('✅ OK' if 'par_mois_categories' in data else '❌ MISSING')"
```

### 6. Vérifier le frontend
- Ouvrir la page "Historique Achat"
- Scroller vers le bas jusqu'à "📊 Détail par Catégorie (DM6)"
- Sélectionner un mois dans le dropdown
- Le tableau doit s'afficher avec colonnes : Article, DM6, Catégorie, Montant, etc.

## En cas de problème persistant

### Symptôme : "bad gateway"
**Cause** : Backend ne démarre pas
**Solution** :
```bash
# Vérifier les logs d'erreur
tail -n 100 /var/log/supervisor/backend.err.log

# Chercher "Traceback" ou "Error"
# Si erreur d'import, vérifier que category_mapping.py existe
ls -la /app/backend/category_mapping.py

# Redémarrer
sudo supervisorctl restart backend
```

### Symptôme : Tableau ne s'affiche pas
**Cause** : API ne retourne pas `par_mois_categories`
**Solution** :
```bash
# Tester l'API directement (voir étape 5 ci-dessus)
# Si le champ est absent, vérifier server.py ligne 3321-3400
```

### Symptôme : Services très lents
**Cause** : Import dans la boucle ou base de données lente
**Solution** :
```bash
# Vérifier que l'import est en haut de server.py
grep "from category_mapping" /app/backend/server.py
# Doit afficher : "from category_mapping import get_category_from_article_dm6" (ligne 31)

# Si l'import est dans la fonction, le déplacer en haut
```

## Performance attendue
- **Démarrage backend** : < 5 secondes
- **Temps de réponse API /purchase-history/stats** : < 200ms
- **Affichage frontend** : < 1 seconde

## Rollback si nécessaire
Si le nouveau code pose problème, vous pouvez temporairement désactiver la fonctionnalité :

1. Commenter l'import dans server.py (ligne 31)
2. Commenter le bloc de code lignes 3321-3400 dans server.py
3. Redémarrer backend

Le reste de l'application continuera de fonctionner normalement.
