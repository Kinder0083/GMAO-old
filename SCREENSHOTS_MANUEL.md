# 📸 Guide pour Améliorer les Screenshots du Manuel

## ✅ Ce qui a été fait

1. **Structure créée** : Le répertoire `/app/public/images/manual/` a été créé
2. **Images placeholder** : 12 images PNG ont été créées (actuellement 1x1 pixel transparent)
3. **Base de données mise à jour** : 11 sections du manuel incluent maintenant des balises `<img>` pointant vers ces images
4. **Frontend modifié** : Le composant `ManualButton.jsx` a été mis à jour pour afficher le HTML (images comprises)

## 📋 Sections avec Images

Les sections suivantes du manuel ont maintenant des images :

1. **Connexion et Navigation** (`sec-001-02`) → `/images/manual/01-connexion.png`
2. **Tableau de Bord Principal** (`sec-010-01`) → `/images/manual/02-dashboard.png`
3. **Ajouter un Article au Stock** (`sec-006-01`) → `/images/manual/03-inventaire.png`
4. **Vue d'ensemble (Demandes d'Achat)** (`sec-013-01`) → `/images/manual/04-demandes-achat.png`
5. **Dashboard IoT - Vue d'Ensemble** (`ch-mqtt-001-sec-005`) → `/images/manual/05-iot-dashboard.png`
6. **Raccourcis et Astuces** (`sec-001-04`) → `/images/manual/06-chat-live.png`
7. **Ajouter un Équipement** (`sec-004-01`) → `/images/manual/07-equipements.png`
8. **Créer un Utilisateur** (`sec-002-01`) → `/images/manual/08-personnes.png`
9. **Organiser les Zones et Localisations** (`sec-011-02`) → `/images/manual/09-zones.png`
10. **Planning** (pas encore ajouté) → `/images/manual/10-planning.png`
11. **Paramètres Système** (`sec-011-07`) → `/images/manual/11-parametres.png`
12. **Utiliser le Bouton Aide** (`sec-012-04`) → `/images/manual/12-manuel-utilisateur.png`

## 🎯 Comment Remplacer les Images par de Vraies Captures d'Écran

### Méthode 1 : Captures d'écran manuelles

1. Naviguez vers chaque page de l'application
2. Prenez une capture d'écran (utilisez les outils de développement du navigateur : F12 → Console → `screenshot`)
3. Renommez l'image selon la convention de nommage ci-dessus
4. Copiez l'image dans `/app/public/images/manual/`
5. Assurez-vous que l'image est au format PNG

### Méthode 2 : Script Python avec Playwright (nécessite installation)

```bash
# Installer playwright si nécessaire
cd /app/backend
pip install playwright
playwright install chromium

# Exécuter le script de capture
python3 capture_manual_screenshots.py
```

### Méthode 3 : Depuis l'interface Admin

Si vous êtes ADMIN dans l'application :
1. Ouvrez le manuel (bouton "Manuel" dans le header)
2. Activez le "Mode Admin"
3. Modifiez les sections pour ajuster les images ou leur légende

## 📝 Format des Images dans la Base de Données

Les images sont insérées dans le contenu des sections avec ce format HTML :

```html
<div style="text-align: center; margin: 20px 0;">
<img src="/images/manual/01-connexion.png" 
     alt="Page de connexion GMAO Iris" 
     style="max-width: 100%; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
<p style="color: #666; font-size: 0.9em; margin-top: 8px;">
  Figure: Page de connexion de GMAO Iris
</p>
</div>
```

## 🔧 Scripts Utiles

- **`/app/backend/add_screenshots_to_manual.py`** : Script pour ajouter les références d'images aux sections
- **`/app/backend/capture_manual_screenshots.py`** : Script pour capturer automatiquement les screenshots (nécessite Playwright)

## ⚠️ Notes Importantes

1. Les images sont servies depuis `/app/public/images/manual/`
2. Le chemin dans le HTML doit être `/images/manual/nom-fichier.png` (sans `/app/public`)
3. Les images doivent être au format PNG pour une meilleure qualité
4. Recommandation de taille : max 1920x1080, qualité optimisée pour le web

## 🚀 Prochaines Étapes Recommandées

1. Capturer de vraies captures d'écran de l'application en fonctionnement
2. Remplacer les images placeholder par les vraies captures
3. Ajouter des images supplémentaires pour les sections qui n'en ont pas encore
4. Créer des captures d'écran annotées pour les procédures complexes

## 📞 Support

Pour toute question ou assistance, consultez le script Python ou le composant React :
- Backend : `/app/backend/add_screenshots_to_manual.py`
- Frontend : `/app/frontend/src/components/Common/ManualButton.jsx` (ligne 492)
