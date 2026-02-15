# GMAO Iris - PRD

## Problème Original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète et auto-hébergée pour la gestion de maintenance industrielle.

## Travaux Récents (Session Février 2026)

### Terminé
- **Correction timezone scheduler** : APScheduler utilise le fuseau horaire configuré
- **Upload manuel Google Drive** : Endpoint `POST /api/backup/drive/upload/{filename}` + bouton UI
- **Gestion erreurs Google Drive** : Messages d'erreur améliorés (403 accessNotConfigured)
- **README.md** : Documentation complète (guide 6 étapes Google Drive, dépannage)
- **Manuel utilisateur intégré** : 3 nouvelles sections (sauvegardes, upload GDrive, config GDrive)
- **Code migration amélioré** : Startup backend met à jour les sections des chapitres existants
- **Restauration de sauvegardes (NOUVEAU)** :
  - Nouvel onglet "Restauration" dans Import/Export
  - Endpoint `POST /api/restore/backup` avec modes merge et full
  - Mode "Fusionner" : ajoute/met à jour sans toucher aux données existantes
  - Mode "Restauration complète" : vide les collections avant import
  - Supporte ZIP de backup GMAO (data.xlsx + uploads/)
  - Validation du fichier ZIP (format, présence de data.xlsx)
  - Confirmation requise avant restauration complète
  - Affichage détaillé des résultats par module

### Fichiers Modifiés/Créés
- `backend/import_export_routes.py` : Endpoint restore/backup
- `frontend/src/pages/RestoreTab.jsx` : **NOUVEAU** - Composant onglet restauration
- `frontend/src/pages/ImportExport.jsx` : Ajout onglet Restauration
- `backend/manual_default_content.json` : +3 sections manual
- `backend/server.py` : Migration startup (update sections chapitres)

## Architecture
- **Backend** : FastAPI (Python), MongoDB, APScheduler
- **Frontend** : React 19, Shadcn/UI, Tailwind CSS
- **Auth** : JWT + bcrypt
- **Sauvegardes** : Local + Google Drive (OAuth 2.0) + Restauration ZIP

## Endpoints clés
- `POST /api/restore/backup?mode=merge|full` : Restauration de sauvegarde ZIP
- `POST /api/backup/drive/upload/{filename}` : Upload manuel vers Google Drive
- `POST /api/import/{module}` : Import données (CSV, XLSX, ZIP)
- `GET /api/export/{module}` : Export données

### Bug Fix - Badge échéances calendrier (15 Fév 2026)
- **Problème** : Le badge jaune du calendrier dans le header comptait les demandes d'amélioration en retard quel que soit leur statut (SOUMISE, REJETEE, etc.)
- **Cause racine** : `MainLayout.jsx` ligne 330 utilisait le mauvais champ (`impr.statut` au lieu de `impr.status`) et filtrait par exclusion au lieu de ne garder que les demandes acceptées
- **Fix** : Remplacé le filtre par `impr.status !== 'VALIDEE'` — seules les demandes validées (acceptées) avec date dépassée sont comptées
- **Fichiers modifiés** : `frontend/src/components/Layout/MainLayout.jsx`, `frontend/src/hooks/useOverdueItems.js`

## Backlog
Aucune tâche en attente.
