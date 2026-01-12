# FIX CRITIQUE - Accès depuis IP Publique

## Problème
Impossible de se connecter au container depuis une IP publique

## Cause
Configuration CORS restrictive qui n'autorisait que des origines spécifiques :
- localhost:3000
- 127.0.0.1:3000
- FRONTEND_URL depuis .env

## Solution appliquée

### Fichier : `/app/backend/server.py`

**AVANT (restrictif) :**
```python
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,  # ❌ Liste restreinte
    ...
)
```

**APRÈS (ouvert) :**
```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # ✅ Toutes les origines autorisées
    ...
)
```

## Actions effectuées

1. ✅ Modification de `/app/backend/server.py` (ligne ~4674-4702)
2. ✅ Redémarrage du backend : `sudo supervisorctl restart backend`
3. ✅ Vérification des logs : CORS configuré pour TOUTES les origines
4. ✅ Test endpoint `/api/version` : Fonctionnel

## Vérification

```bash
# Test depuis n'importe quelle IP
curl https://dashboard-live.preview.emergentagent.com/api/version

# Résultat attendu :
{"version":"1.5.0","versionName":"...","releaseDate":"..."}
```

## Configuration backend

```bash
# Backend écoute sur
0.0.0.0:8001

# CORS headers
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: *
```

## Important

Cette configuration permet l'accès depuis **n'importe quelle IP publique** :
- ✅ Accès direct via IP
- ✅ Accès via domaine
- ✅ Accès depuis localhost
- ✅ Accès depuis n'importe quel réseau

## Date d'application
18 novembre 2025 - 22:05 UTC

## Status
✅ **APPLIQUÉ ET FONCTIONNEL**
