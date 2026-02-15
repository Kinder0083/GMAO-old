# GMAO Iris - PRD

## Problème Original
Application GMAO (Gestion de Maintenance Assistée par Ordinateur) complète et auto-hébergée pour la gestion de maintenance industrielle.

## Travaux Récents (Session Février 2026)

### Terminé
- **Correction timezone scheduler** : APScheduler utilise désormais le fuseau horaire configuré dans les paramètres de l'application
- **Upload manuel Google Drive** : Nouvel endpoint `POST /api/backup/drive/upload/{filename}` + bouton UI dans BackupTab.jsx
- **Gestion erreurs Google Drive** : Messages d'erreur améliorés pour guider l'utilisateur (403 accessNotConfigured)
- **README.md** : Documentation complète mise à jour (guide 6 étapes Google Drive, dépannage)
- **Manuel utilisateur intégré** : 3 nouvelles sections ajoutées au chapitre Import/Export :
  - `sec-023-02` : Sauvegardes Automatiques (planification, fuseau horaire, icône de statut)
  - `sec-023-03` : Upload Manuel vers Google Drive
  - `sec-023-04` : Configuration Google Drive (guide complet activation API, OAuth, dépannage)
- **Code migration amélioré** : Le startup backend met à jour les sections des chapitres existants (pas seulement les nouveaux chapitres)

### Fichiers Modifiés
- `backend/manual_default_content.json` : +3 sections (sauvegardes, upload GDrive, config GDrive)
- `backend/server.py` : Migration startup mise à jour (update sections chapitres existants)
- `backend/api/backup_routes.py` : Endpoint upload GDrive + messages d'erreur
- `backend/services/backup_service.py` : Logique dossier "Backup GMAO" GDrive
- `frontend/src/components/backup/BackupTab.jsx` : Bouton upload GDrive
- `README.md` : Documentation complète

## Architecture
- **Backend** : FastAPI (Python), MongoDB, APScheduler
- **Frontend** : React 19, Shadcn/UI, Tailwind CSS
- **Auth** : JWT + bcrypt
- **Sauvegardes** : Local + Google Drive (OAuth 2.0)

## Backlog
Aucune tâche en attente.
