"""
Routes pour le manuel utilisateur
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from dependencies import get_current_user, get_current_admin_user, require_permission
from models import ManualCreate, ManualSearchRequest
from datetime import datetime, timezone
import uuid
import logging

# Logger
logger = logging.getLogger(__name__)

# Créer un routeur séparé pour les endpoints du manuel
router = APIRouter(prefix="/manual", tags=["manual"])

# Import de la base de données
from server import db


@router.get("/content")
async def get_manual_content(
    role_filter: Optional[str] = None,
    module_filter: Optional[str] = None,
    level_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer le contenu du manuel filtré selon le rôle et les préférences"""
    try:
        # Récupérer la version actuelle
        current_version = await db.manual_versions.find_one({"is_current": True})
        if not current_version:
            # Créer le contenu par défaut si aucun manuel n'existe
            return await initialize_default_manual(current_user)
        
        # Récupérer tous les chapitres et sections
        chapters = await db.manual_chapters.find({}, {"_id": 0}).sort("order", 1).to_list(None)
        sections = await db.manual_sections.find({}, {"_id": 0}).sort("order", 1).to_list(None)
        
        # Filtrer selon le rôle de l'utilisateur
        user_role = current_user.get("role", "")
        
        logger.info(f"📖 DEBUG: Chapitres bruts: {len(chapters)}, Sections brutes: {len(sections)}")
        logger.info(f"📖 DEBUG: User role: {user_role}, Filters: role={role_filter}, module={module_filter}, level={level_filter}")
        
        filtered_chapters = []
        for chapter in chapters:
            # Si le chapitre a des rôles cibles et l'utilisateur n'est pas dans la liste, skip
            if chapter.get("target_roles") and user_role not in chapter["target_roles"]:
                continue
            
            # Appliquer les filtres additionnels
            if role_filter and role_filter not in chapter.get("target_roles", []):
                continue
            if module_filter and module_filter not in chapter.get("target_modules", []):
                continue
            
            filtered_chapters.append(chapter)
        
        filtered_sections = []
        for section in sections:
            # Filtrer selon les rôles
            if section.get("target_roles") and user_role not in section["target_roles"]:
                continue
            
            # Appliquer les filtres
            if role_filter and role_filter not in section.get("target_roles", []):
                continue
            if module_filter and module_filter not in section.get("target_modules", []):
                continue
            if level_filter and section.get("level") != level_filter and section.get("level") != "both":
                continue
            
            filtered_sections.append(section)
        
        # Filtrer les chapitres qui n'ont plus de sections après filtrage
        section_chapter_map = {}
        for s in filtered_sections:
            ch_id = s.get("chapter_id")
            if ch_id:
                section_chapter_map.setdefault(ch_id, set()).add(s["id"])
        
        section_ids = {s["id"] for s in filtered_sections}
        final_chapters = []
        for chapter in filtered_chapters:
            # Vérifier si le chapitre a au moins une section visible
            # Méthode 1: via le champ "sections" du chapitre
            chapter_has_sections = any(
                sec_id in section_ids 
                for sec_id in chapter.get("sections", [])
            )
            # Méthode 2: via chapter_id des sections
            if not chapter_has_sections:
                chapter_has_sections = chapter.get("id") in section_chapter_map
            if chapter_has_sections:
                final_chapters.append(chapter)
        
        logger.info(f"📖 DEBUG: Après filtrage - Chapitres: {len(final_chapters)}, Sections: {len(filtered_sections)}")
        
        return {
            "version": current_version.get("version"),
            "chapters": final_chapters,
            "sections": filtered_sections,
            "last_updated": current_version.get("release_date")
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du manuel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_manual(
    search_request: ManualSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Rechercher dans le manuel"""
    try:
        query = search_request.query.lower()
        
        # Recherche dans les sections
        sections = await db.manual_sections.find({}).to_list(None)
        
        results = []
        for section in sections:
            # Calculer le score de pertinence
            score = 0.0
            title_lower = section.get("title", "").lower()
            content_lower = section.get("content", "").lower()
            keywords = [k.lower() for k in section.get("keywords", [])]
            
            # Score basé sur le titre (poids 3)
            if query in title_lower:
                score += 3.0
            
            # Score basé sur les mots-clés (poids 2)
            if any(query in kw for kw in keywords):
                score += 2.0
            
            # Score basé sur le contenu (poids 1)
            if query in content_lower:
                score += 1.0
            
            if score > 0:
                # Extraire un extrait pertinent
                content = section.get("content", "")
                excerpt_start = max(0, content_lower.find(query) - 50)
                excerpt = content[excerpt_start:excerpt_start + 200]
                
                # Trouver le chapitre parent
                chapter_id = None
                chapter_title = None
                
                # D'abord vérifier si la section a un chapter_id
                if section.get("chapter_id"):
                    chapter = await db.manual_chapters.find_one({"id": section.get("chapter_id")}, {"_id": 0})
                    if chapter:
                        chapter_id = chapter.get("id")
                        chapter_title = chapter.get("title")
                
                # Sinon, utiliser l'ancienne méthode
                if not chapter_id:
                    chapters = await db.manual_chapters.find({}, {"_id": 0}).to_list(None)
                    for chapter in chapters:
                        if section.get("id") in chapter.get("sections", []):
                            chapter_id = chapter.get("id")  # Utiliser l'ID personnalisé (ch-001)
                            chapter_title = chapter.get("title")
                            break
                
                results.append({
                    "section_id": section.get("id"),  # ID personnalisé (sec-001-01)
                    "chapter_id": chapter_id,
                    "chapter_title": chapter_title,
                    "title": section.get("title"),
                    "excerpt": excerpt.strip(),
                    "relevance_score": score
                })
        
        # Trier par score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return {"results": results[:10]}  # Top 10 résultats
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/content")
async def create_or_update_manual(
    manual_data: ManualCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Créer ou mettre à jour le contenu du manuel (Super Admin uniquement)"""
    try:
        # Marquer les anciennes versions comme non-actuelles
        await db.manual_versions.update_many(
            {"is_current": True},
            {"$set": {"is_current": False}}
        )
        
        # Créer une nouvelle version
        from models import ManualVersion
        version = ManualVersion(
            version=manual_data.version,
            changes=manual_data.changes,
            author_id=current_user["id"],
            author_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}",
            is_current=True
        )
        await db.manual_versions.insert_one(version.model_dump())
        
        # Supprimer les chapitres et sections existants
        await db.manual_chapters.delete_many({})
        await db.manual_sections.delete_many({})
        
        # Insérer les nouveaux chapitres
        for chapter in manual_data.chapters:
            await db.manual_chapters.insert_one(chapter.model_dump())
        
        # Insérer les nouvelles sections
        for section in manual_data.sections:
            await db.manual_sections.insert_one(section.model_dump())
        
        logger.info(f"📚 Manuel mis à jour vers version {manual_data.version} par {current_user['email']}")
        
        return {"success": True, "message": f"Manuel mis à jour vers version {manual_data.version}"}
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du manuel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def initialize_default_manual(current_user: dict):
    """Initialiser le manuel avec le contenu par défaut"""
    try:
        logger.info("📚 Initialisation du manuel avec contenu par défaut...")
        
        now = datetime.now(timezone.utc)
        
        # Créer la version initiale
        version = {
            "id": str(uuid.uuid4()),
            "version": "1.5",
            "release_date": now.isoformat(),
            "changes": ["Création initiale du manuel", "Ajout du module M.E.S."],
            "author_id": current_user.get("id", "system"),
            "author_name": current_user.get("nom", "Système") + " " + current_user.get("prenom", ""),
            "is_current": True
        }
        await db.manual_versions.insert_one(version)
        
        all_chapters = []
        all_sections = []
        
        # ==================== CHAPITRE 1: GUIDE DE DÉMARRAGE ====================
        chapter1 = {
            "id": "ch-001",
            "title": "🚀 Guide de Démarrage",
            "description": "Premiers pas avec FSAO Iris",
            "icon": "Rocket",
            "order": 1,
            "sections": ["sec-001-01", "sec-001-02"],
            "target_roles": [],
            "target_modules": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_chapters.append(chapter1)
        
        section1_1 = {
            "id": "sec-001-01",
            "chapter_id": "ch-001",
            "title": "Bienvenue dans FSAO Iris",
            "content": """FSAO Iris est votre solution complète de gestion de maintenance assistée par ordinateur.

📌 **Qu'est-ce qu'une GMAO ?**

Une GMAO (Fonctionnement des Services Assistée par Ordinateur) est un logiciel qui permet de gérer l'ensemble des activités de maintenance d'une entreprise :

• Planification des interventions
• Suivi des équipements
• Gestion des stocks de pièces
• Traçabilité des actions
• Analyse des performances

🎯 **Objectifs de FSAO Iris :**

1. **Optimiser** la maintenance préventive et curative
2. **Réduire** les temps d'arrêt des équipements
3. **Suivre** l'historique complet de vos installations
4. **Analyser** les performances avec des rapports détaillés
5. **Collaborer** efficacement entre les équipes

✅ **Premiers pas recommandés :**

1. Consultez la section "Connexion et Navigation"
2. Familiarisez-vous avec votre rôle et vos permissions
3. Explorez les différents modules selon vos besoins
4. N'hésitez pas à utiliser la fonction de recherche dans ce manuel

💡 **Astuce :** Utilisez le bouton "Aide" en haut à droite pour signaler un problème ou demander de l'assistance à tout moment.""",
            "order": 1,
            "parent_id": None,
            "target_roles": [],
            "target_modules": [],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["bienvenue", "introduction", "gmao"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section1_1)
        
        section1_2 = {
            "id": "sec-001-02",
            "chapter_id": "ch-001",
            "title": "Connexion et Navigation",
            "content": """📱 **Se Connecter à FSAO Iris**

1. **Accéder à l'application**
   • Ouvrez votre navigateur web (Chrome, Firefox, Edge, Safari)
   • Saisissez l'URL de FSAO Iris
   • Bookmark la page pour un accès rapide

2. **Première Connexion**
   • Email : Votre adresse email professionnelle
   • Mot de passe : Mot de passe fourni par l'administrateur
   • ⚠️ Changez votre mot de passe lors de la première connexion

3. **Changer votre mot de passe**
   • Minimum 8 caractères
   • Au moins une majuscule, une minuscule et un chiffre

🗺️ **Navigation dans l'Interface**

**Sidebar (Barre latérale)**
• Contient tous les modules principaux
• Cliquez sur un élément pour accéder au module
• Utilisez l'icône ☰ pour réduire/agrandir la sidebar

**Header (En-tête)**
• Logo et nom de l'application à gauche
• Boutons "Manuel" et "Aide" au centre
• Badges de notifications
• Votre profil à droite

🔔 **Notifications**

• Badge ROUGE : Maintenances préventives dues
• Badge BLEU : Maintenances bientôt dues
• Badge ORANGE : Ordres de travail en retard
• Badge VERT : Alertes stock faible
• Icône M.E.S. : Alertes de production

Cliquez sur un badge pour voir les détails.""",
            "order": 2,
            "parent_id": None,
            "target_roles": [],
            "target_modules": [],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["connexion", "navigation", "interface"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section1_2)
        
        # ==================== CHAPITRE M.E.S. ====================
        chapter_mes = {
            "id": "ch-mes",
            "title": "🏭 M.E.S. - Suivi de Production",
            "description": "Manufacturing Execution System - Monitoring temps réel de la production",
            "icon": "Factory",
            "order": 10,
            "sections": ["sec-mes-01", "sec-mes-02", "sec-mes-03", "sec-mes-04"],
            "target_roles": [],
            "target_modules": ["mes"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_chapters.append(chapter_mes)
        
        section_mes_1 = {
            "id": "sec-mes-01",
            "chapter_id": "ch-mes",
            "title": "Présentation du module M.E.S.",
            "content": """🏭 **Qu'est-ce que le M.E.S. ?**

Le M.E.S. (Manufacturing Execution System) est un module de suivi de production en temps réel. Il permet de :

• **Comptabiliser** les coups/impulsions des machines de production
• **Calculer** la cadence réelle (coups/minute, coups/heure)
• **Suivre** la production journalière et sur 24h glissantes
• **Détecter** les arrêts machine automatiquement
• **Alerter** en cas d'anomalie (sous-cadence, sur-cadence, arrêt prolongé)
• **Analyser** les performances avec le TRS (Taux de Rendement Synthétique)

📡 **Comment ça fonctionne ?**

1. Un capteur (contact sec) est installé sur la machine
2. Chaque impulsion (1/0) = 1 coup = 1 produit fabriqué
3. Le capteur envoie les données via MQTT
4. FSAO Iris reçoit et analyse les données en temps réel
5. Les métriques et alertes sont mises à jour automatiquement

📊 **Indicateurs disponibles**

• **Cadence/min** : Nombre de coups dans la dernière minute
• **Cadence/heure** : Nombre de coups dans la dernière heure
• **Production jour** : Total depuis minuit
• **Production 24h** : Total sur les 24 dernières heures
• **Temps d'arrêt** : Temps cumulé d'arrêt aujourd'hui
• **TRS** : Ratio production réelle / production théorique""",
            "order": 1,
            "parent_id": None,
            "target_roles": [],
            "target_modules": ["mes"],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["mes", "production", "cadence", "manufacturing", "trs"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section_mes_1)
        
        section_mes_2 = {
            "id": "sec-mes-02",
            "chapter_id": "ch-mes",
            "title": "Configuration d'une machine M.E.S.",
            "content": """⚙️ **Ajouter une machine M.E.S.**

1. Accédez à la page **M.E.S.** depuis la sidebar
2. Cliquez sur **"+ Ajouter"** en haut à droite
3. Sélectionnez l'équipement lié dans la liste
4. La machine apparaît dans la liste

🔧 **Configurer les paramètres**

Cliquez sur l'icône **engrenage** (⚙️) à côté de la machine pour ouvrir les paramètres :

**Section Production :**
• **Cadence théorique** (cp/min) : La cadence nominale de la machine. Exemple : 6 coups/minute = 1 coup toutes les 10 secondes
• **Marge d'arrêt** (%) : Tolérance avant de considérer la machine à l'arrêt. Exemple : 30% signifie que si le temps entre 2 impulsions dépasse 13 secondes (10s + 30%), la machine est considérée à l'arrêt

**Section Capteur :**
• **Topic MQTT** : Le topic sur lequel le capteur publie ses impulsions. Exemple : `factory/machine1/pulse`
• **Adresse IP capteur** : L'IP du capteur pour vérifier sa connectivité via ping

**Section Alertes :**
• **Arrêt machine** (min) : Déclenche une alerte si la machine est arrêtée depuis X minutes
• **Perte signal** (min) : Alerte si aucun signal reçu (différent d'un arrêt normal)
• **Sous-cadence** (cp/min) : Alerte si cadence inférieure au seuil (0 = désactivé)
• **Sur-cadence** (cp/min) : Alerte si cadence supérieure au seuil (0 = désactivé)
• **Objectif journalier** (coups) : Notification quand l'objectif est atteint

💾 Cliquez sur **"Sauvegarder"** pour appliquer les paramètres.""",
            "order": 2,
            "parent_id": None,
            "target_roles": [],
            "target_modules": ["mes"],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["configuration", "parametres", "mqtt", "cadence", "alertes"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section_mes_2)
        
        section_mes_3 = {
            "id": "sec-mes-03",
            "chapter_id": "ch-mes",
            "title": "Lecture du graphique de production",
            "content": """📈 **Le graphique de cadence**

Le graphique affiche l'évolution de la cadence dans le temps, similaire à une courbe de température :

• **Axe X (horizontal)** : Le temps
• **Axe Y (vertical)** : La cadence (coups/minute)
• **Ligne bleue** : Cadence réelle mesurée
• **Ligne pointillée** : Cadence théorique (si configurée)

🕐 **Périodes d'affichage**

Utilisez les boutons pour changer la période :

• **6h** (par défaut) : Affichage minute par minute des 6 dernières heures
• **12h** : Affichage minute par minute des 12 dernières heures
• **24h** : Affichage minute par minute des 24 dernières heures
• **7j** : Affichage de la **moyenne horaire** des 7 derniers jours
• **Personnalisé** : Choisissez vos dates de début et fin

⚠️ **Note importante** : Pour les périodes de 7 jours ou plus, l'affichage passe automatiquement en moyenne horaire pour une meilleure lisibilité.

🔄 **Mise à jour automatique**

Le graphique se met à jour automatiquement toutes les minutes. La nouvelle donnée apparaît à droite et le graphique défile naturellement vers la gauche.

💡 **Astuce** : Survolez un point du graphique pour voir les détails (heure exacte et valeur de cadence).""",
            "order": 3,
            "parent_id": None,
            "target_roles": [],
            "target_modules": ["mes"],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["graphique", "courbe", "historique", "cadence", "periode"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section_mes_3)
        
        section_mes_4 = {
            "id": "sec-mes-04",
            "chapter_id": "ch-mes",
            "title": "Alertes M.E.S. et notifications",
            "content": """🔔 **Système d'alertes M.E.S.**

Les alertes M.E.S. apparaissent dans l'icône dédiée en haut de l'écran (à côté des autres notifications).

**Types d'alertes :**

🔴 **Machine à l'arrêt** : La machine n'a pas produit depuis X minutes (configurable)

⬇️ **Sous-cadence** : La cadence est inférieure au seuil défini

⬆️ **Sur-cadence** : La cadence dépasse le seuil défini (risque de surchauffe/usure)

🎯 **Objectif atteint** : L'objectif de production journalier est atteint

📡 **Perte de signal** : Aucun signal reçu du capteur (problème de connectivité)

**Gestion des alertes**

• Cliquez sur l'icône M.E.S. pour voir la liste des alertes
• Cliquez sur ✓ pour marquer une alerte comme lue
• Cliquez sur **"Tout lire"** pour marquer toutes les alertes comme lues
• Cliquez sur l'icône **corbeille** 🗑️ pour **supprimer toutes les alertes**

⚠️ **Attention** : La suppression des alertes est définitive et immédiate.

🔧 **Vérifier la connectivité du capteur**

Si vous recevez des alertes "Perte de signal" :

1. Ouvrez les paramètres de la machine (⚙️)
2. Vérifiez que l'adresse IP du capteur est renseignée
3. Cliquez sur le bouton **"Ping"** pour tester la connectivité
4. Si le ping échoue, vérifiez le réseau et l'alimentation du capteur""",
            "order": 4,
            "parent_id": None,
            "target_roles": [],
            "target_modules": ["mes"],
            "level": "beginner",
            "images": [],
            "video_url": None,
            "keywords": ["alertes", "notifications", "arret", "signal", "ping", "supprimer"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        all_sections.append(section_mes_4)
        
        # Insérer tous les chapitres et sections
        for chapter in all_chapters:
            await db.manual_chapters.insert_one(chapter)
        
        for section in all_sections:
            await db.manual_sections.insert_one(section)
        
        logger.info("✅ Manuel initialisé avec succès (incluant M.E.S.)")
        
        # Retourner le contenu
        return {
            "version": "1.5",
            "chapters": all_chapters,
            "sections": all_sections,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation du manuel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/export-pdf")
async def export_manual_pdf(
    level_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Exporter le manuel en PDF"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
        from reportlab.lib import colors
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from io import BytesIO
        from fastapi.responses import StreamingResponse
        
        # Récupérer le contenu du manuel
        manual_content = await get_manual_content(
            role_filter=None,
            module_filter=None,
            level_filter=level_filter,
            current_user=current_user
        )
        
        # Créer le buffer PDF en mémoire
        buffer = BytesIO()
        
        # Créer le document PDF
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
            title="Manuel Utilisateur FSAO Iris",
            author="FSAO Iris"
        )
        
        # Styles
        styles = getSampleStyleSheet()
        
        # Style pour le titre principal
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        # Style pour les chapitres
        chapter_style = ParagraphStyle(
            'ChapterTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Style pour les sections
        section_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=8,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        )
        
        # Style pour le contenu
        content_style = ParagraphStyle(
            'ContentText',
            parent=styles['BodyText'],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            fontName='Helvetica'
        )
        
        # Construire le contenu du PDF
        story = []
        
        # Page de garde
        story.append(Spacer(1, 3*cm))
        story.append(Paragraph("Manuel Utilisateur", title_style))
        story.append(Paragraph("FSAO Iris", title_style))
        story.append(Spacer(1, 1*cm))
        story.append(Paragraph(f"Version {manual_content['version']}", styles['Normal']))
        story.append(Paragraph(f"Généré le {datetime.now(timezone.utc).strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))
        story.append(PageBreak())
        
        # Table des matières
        story.append(Paragraph("Table des Matières", chapter_style))
        story.append(Spacer(1, 0.5*cm))
        
        for chapter in manual_content['chapters']:
            chapter_sections = [s for s in manual_content['sections'] if s['id'] in chapter.get('sections', [])]
            if chapter_sections:
                story.append(Paragraph(f"<b>{chapter['title']}</b>", styles['Normal']))
                for section in chapter_sections:
                    level_badge = ""
                    if section.get('level') == 'beginner':
                        level_badge = " 🎓"
                    elif section.get('level') == 'advanced':
                        level_badge = " ⚡"
                    story.append(Paragraph(f"  • {section['title']}{level_badge}", styles['Normal']))
                story.append(Spacer(1, 0.3*cm))
        
        story.append(PageBreak())
        
        # Contenu de chaque chapitre et section
        for chapter in manual_content['chapters']:
            # Titre du chapitre
            story.append(Paragraph(chapter['title'], chapter_style))
            story.append(Paragraph(chapter.get('description', ''), styles['Italic']))
            story.append(Spacer(1, 0.5*cm))
            
            # Sections du chapitre
            chapter_sections = [s for s in manual_content['sections'] if s['id'] in chapter.get('sections', [])]
            
            for section in chapter_sections:
                # Titre de section avec badge niveau
                section_title = section['title']
                if section.get('level') == 'beginner':
                    section_title += " 🎓 Débutant"
                elif section.get('level') == 'advanced':
                    section_title += " ⚡ Avancé"
                
                story.append(Paragraph(section_title, section_style))
                
                # Contenu de la section (formatage simple)
                content = section.get('content', '')
                
                # Fonction pour nettoyer et formater le texte pour PDF
                def clean_text_for_pdf(text):
                    # Échapper les caractères spéciaux XML/HTML
                    text = text.replace('&', '&amp;')
                    text = text.replace('<', '&lt;')
                    text = text.replace('>', '&gt;')
                    
                    # Supprimer les emojis et caractères Unicode problématiques
                    import re
                    text = re.sub(r'[^\x00-\x7F]+', '', text)  # Supprimer Unicode non-ASCII
                    
                    # Convertir markdown gras (** texte **)
                    # Utiliser regex pour remplacer par paires
                    parts = text.split('**')
                    result = []
                    for i, part in enumerate(parts):
                        if i % 2 == 0:
                            result.append(part)  # Texte normal
                        else:
                            result.append(f'<b>{part}</b>')  # Texte en gras
                    
                    return ''.join(result)
                
                # Diviser en paragraphes
                paragraphs = content.split('\n\n')
                for para in paragraphs:
                    if para.strip():
                        # Traiter les listes à puces
                        if para.strip().startswith('•') or para.strip().startswith('-'):
                            lines = para.split('\n')
                            for line in lines:
                                if line.strip():
                                    cleaned_line = clean_text_for_pdf(line.strip())
                                    try:
                                        story.append(Paragraph(cleaned_line, content_style))
                                    except Exception as e:
                                        # En cas d'erreur, ajouter le texte brut
                                        logger.warning(f"Erreur formatage ligne: {str(e)}")
                                        story.append(Paragraph(line.strip().replace('&', '&amp;'), content_style))
                        else:
                            # Paragraphe normal
                            cleaned_para = clean_text_for_pdf(para.strip())
                            try:
                                story.append(Paragraph(cleaned_para, content_style))
                            except Exception as e:
                                # En cas d'erreur, ajouter le texte brut
                                logger.warning(f"Erreur formatage paragraphe: {str(e)}")
                                story.append(Paragraph(para.strip().replace('&', '&amp;'), content_style))
                        
                        story.append(Spacer(1, 0.2*cm))
                
                story.append(Spacer(1, 0.5*cm))
            
            # Saut de page entre chapitres
            story.append(PageBreak())
        
        # Générer le PDF
        doc.build(story)
        
        # Préparer la réponse
        buffer.seek(0)
        
        filename = f"manuel_gmao_iris_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de l'export PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")


# ========================================
# ENDPOINTS ADMIN - ÉDITION DU MANUEL
# ========================================

@router.put("/sections/{section_id}")
async def update_manual_section(
    section_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    level: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    current_user: dict = Depends(require_permission("admin", "edit"))
):
    """Mettre à jour une section du manuel (ADMIN uniquement)"""
    try:
        # Construire l'update
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if title is not None:
            update_data["title"] = title
        if content is not None:
            update_data["content"] = content
        if level is not None:
            if level not in ["beginner", "advanced", "both"]:
                raise HTTPException(status_code=400, detail="Niveau invalide")
            update_data["level"] = level
        if keywords is not None:
            update_data["keywords"] = keywords
        
        # Mettre à jour dans MongoDB
        result = await db.manual_sections.update_one(
            {"id": section_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Section non trouvée")
        
        # Log audit
        await db.audit_log.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user.get("id"),
            "user_email": current_user.get("email"),
            "user_name": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            "action": "UPDATE",
            "entity_type": "manual_section",
            "entity_id": section_id,
            "details": update_data
        })
        
        logger.info(f"Section {section_id} mise à jour par {current_user.get('email')}")
        
        return {"message": "Section mise à jour avec succès", "section_id": section_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de la section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sections")
async def create_manual_section(
    chapter_id: str,
    title: str,
    content: str,
    level: str = "beginner",
    keywords: List[str] = [],
    current_user: dict = Depends(require_permission("admin", "edit"))
):
    """Créer une nouvelle section du manuel (ADMIN uniquement)"""
    try:
        # Vérifier que le chapitre existe
        chapter = await db.manual_chapters.find_one({"id": chapter_id})
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapitre non trouvé")
        
        # Générer ID pour la nouvelle section
        # Format: sec-XXX-YY où XXX est le numéro du chapitre
        chapter_num = chapter_id.split('-')[1]
        
        # Compter les sections existantes du chapitre
        existing_sections = chapter.get("sections", [])
        new_section_num = len(existing_sections) + 1
        section_id = f"sec-{chapter_num}-{new_section_num:02d}"
        
        # Créer la section
        now = datetime.now(timezone.utc)
        section = {
            "id": section_id,
            "title": title,
            "content": content,
            "order": new_section_num,
            "parent_id": None,
            "target_roles": [],
            "target_modules": [],
            "level": level,
            "images": [],
            "video_url": None,
            "keywords": keywords,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.manual_sections.insert_one(section)
        
        # Ajouter la section au chapitre
        await db.manual_chapters.update_one(
            {"id": chapter_id},
            {"$push": {"sections": section_id}}
        )
        
        # Log audit
        await db.audit_log.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": now.isoformat(),
            "user_id": current_user.get("id"),
            "user_email": current_user.get("email"),
            "user_name": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            "action": "CREATE",
            "entity_type": "manual_section",
            "entity_id": section_id,
            "details": {"chapter_id": chapter_id, "title": title}
        })
        
        logger.info(f"Section {section_id} créée par {current_user.get('email')}")
        
        return {"message": "Section créée avec succès", "section_id": section_id, "section": section}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la création de la section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sections/{section_id}")
async def delete_manual_section(
    section_id: str,
    current_user: dict = Depends(require_permission("admin", "delete"))
):
    """Supprimer une section du manuel (ADMIN uniquement)"""
    try:
        # Vérifier que la section existe
        section = await db.manual_sections.find_one({"id": section_id})
        if not section:
            raise HTTPException(status_code=404, detail="Section non trouvée")
        
        # Trouver le chapitre parent
        chapter = await db.manual_chapters.find_one({"sections": section_id})
        
        # Supprimer la section
        await db.manual_sections.delete_one({"id": section_id})
        
        # Retirer de la liste des sections du chapitre
        if chapter:
            await db.manual_chapters.update_one(
                {"id": chapter["id"]},
                {"$pull": {"sections": section_id}}
            )
        
        # Log audit
        await db.audit_log.insert_one({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": current_user.get("id"),
            "user_email": current_user.get("email"),
            "user_name": f"{current_user.get('firstName', '')} {current_user.get('lastName', '')}".strip(),
            "action": "DELETE",
            "entity_type": "manual_section",
            "entity_id": section_id,
            "details": {"title": section.get("title")}
        })
        
        logger.info(f"Section {section_id} supprimée par {current_user.get('email')}")
        
        return {"message": "Section supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression de la section: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/upgrade-mes")
async def upgrade_manual_with_mes(
    current_user: dict = Depends(require_permission("admin", "edit"))
):
    """Ajouter le chapitre M.E.S. au manuel existant (pour les installations existantes)"""
    try:
        now = datetime.now(timezone.utc)
        
        # Vérifier si le chapitre M.E.S. existe déjà
        existing_mes = await db.manual_chapters.find_one({"id": "ch-mes"})
        if existing_mes:
            return {"success": False, "message": "Le chapitre M.E.S. existe déjà dans le manuel"}
        
        # Créer le chapitre M.E.S.
        chapter_mes = {
            "id": "ch-mes",
            "title": "🏭 M.E.S. - Suivi de Production",
            "description": "Manufacturing Execution System - Monitoring temps réel de la production",
            "icon": "Factory",
            "order": 10,
            "sections": ["sec-mes-01", "sec-mes-02", "sec-mes-03", "sec-mes-04"],
            "target_roles": [],
            "target_modules": ["mes"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.manual_chapters.insert_one(chapter_mes)
        
        # Sections M.E.S.
        mes_sections = [
            {
                "id": "sec-mes-01",
                "chapter_id": "ch-mes",
                "title": "Présentation du module M.E.S.",
                "content": """🏭 **Qu'est-ce que le M.E.S. ?**

Le M.E.S. (Manufacturing Execution System) est un module de suivi de production en temps réel. Il permet de :

• **Comptabiliser** les coups/impulsions des machines de production
• **Calculer** la cadence réelle (coups/minute, coups/heure)
• **Suivre** la production journalière et sur 24h glissantes
• **Détecter** les arrêts machine automatiquement
• **Alerter** en cas d'anomalie (sous-cadence, sur-cadence, arrêt prolongé)
• **Analyser** les performances avec le TRS (Taux de Rendement Synthétique)

📡 **Comment ça fonctionne ?**

1. Un capteur (contact sec) est installé sur la machine
2. Chaque impulsion (1/0) = 1 coup = 1 produit fabriqué
3. Le capteur envoie les données via MQTT
4. FSAO Iris reçoit et analyse les données en temps réel
5. Les métriques et alertes sont mises à jour automatiquement""",
                "order": 1,
                "level": "beginner",
                "keywords": ["mes", "production", "cadence", "manufacturing", "trs"],
            },
            {
                "id": "sec-mes-02",
                "chapter_id": "ch-mes",
                "title": "Configuration d'une machine M.E.S.",
                "content": """⚙️ **Ajouter une machine M.E.S.**

1. Accédez à la page **M.E.S.** depuis la sidebar
2. Cliquez sur **"+ Ajouter"** en haut à droite
3. Sélectionnez l'équipement lié dans la liste
4. La machine apparaît dans la liste

🔧 **Configurer les paramètres**

Cliquez sur l'icône **engrenage** (⚙️) à côté de la machine pour ouvrir les paramètres :

**Section Production :**
• **Cadence théorique** (cp/min) : La cadence nominale de la machine
• **Marge d'arrêt** (%) : Tolérance avant de considérer la machine à l'arrêt

**Section Capteur :**
• **Topic MQTT** : Le topic sur lequel le capteur publie ses impulsions
• **Adresse IP capteur** : L'IP du capteur pour vérifier sa connectivité via ping

**Section Alertes :**
• **Arrêt machine** (min) : Alerte si la machine est arrêtée depuis X minutes
• **Perte signal** (min) : Alerte si aucun signal reçu
• **Sous-cadence** / **Sur-cadence** (cp/min) : Alertes de cadence
• **Objectif journalier** (coups) : Notification quand l'objectif est atteint""",
                "order": 2,
                "level": "beginner",
                "keywords": ["configuration", "parametres", "mqtt", "cadence", "alertes"],
            },
            {
                "id": "sec-mes-03",
                "chapter_id": "ch-mes",
                "title": "Lecture du graphique de production",
                "content": """📈 **Le graphique de cadence**

Le graphique affiche l'évolution de la cadence dans le temps :

• **Axe X** : Le temps
• **Axe Y** : La cadence (coups/minute)

🕐 **Périodes d'affichage**

• **6h** (par défaut) : Minute par minute
• **12h / 24h** : Minute par minute
• **7j** : Moyenne horaire
• **Personnalisé** : Choisissez vos dates

⚠️ Pour les périodes de 7 jours ou plus, l'affichage passe en moyenne horaire.

🔄 Le graphique se met à jour automatiquement toutes les minutes.""",
                "order": 3,
                "level": "beginner",
                "keywords": ["graphique", "courbe", "historique", "cadence", "periode"],
            },
            {
                "id": "sec-mes-04",
                "chapter_id": "ch-mes",
                "title": "Alertes M.E.S. et notifications",
                "content": """🔔 **Système d'alertes M.E.S.**

Les alertes apparaissent dans l'icône M.E.S. en haut de l'écran.

**Types d'alertes :**
🔴 Machine à l'arrêt | ⬇️ Sous-cadence | ⬆️ Sur-cadence | 🎯 Objectif atteint | 📡 Perte de signal

**Gestion des alertes**
• Cliquez sur ✓ pour marquer une alerte comme lue
• Cliquez sur **"Tout lire"** pour tout marquer comme lu
• Cliquez sur l'icône **corbeille** 🗑️ pour **supprimer toutes les alertes**

⚠️ La suppression est définitive et immédiate.

🔧 **Vérifier la connectivité du capteur**
Ouvrez les paramètres (⚙️) et cliquez sur **"Ping"** pour tester la connectivité.""",
                "order": 4,
                "level": "beginner",
                "keywords": ["alertes", "notifications", "arret", "signal", "ping", "supprimer"],
            }
        ]
        
        for section in mes_sections:
            section["parent_id"] = None
            section["target_roles"] = []
            section["target_modules"] = ["mes"]
            section["images"] = []
            section["video_url"] = None
            section["created_at"] = now.isoformat()
            section["updated_at"] = now.isoformat()
            await db.manual_sections.insert_one(section)
        
        # Mettre à jour la version du manuel
        await db.manual_versions.update_many(
            {"is_current": True},
            {"$set": {"is_current": False}}
        )
        
        new_version = {
            "id": str(uuid.uuid4()),
            "version": "1.5",
            "release_date": now.isoformat(),
            "changes": ["Ajout du chapitre M.E.S. (Manufacturing Execution System)"],
            "author_id": current_user.get("id", "system"),
            "author_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip(),
            "is_current": True
        }
        await db.manual_versions.insert_one(new_version)
        
        logger.info(f"📚 Manuel mis à jour avec M.E.S. par {current_user.get('email')}")
        
        return {"success": True, "message": "Chapitre M.E.S. ajouté au manuel avec succès", "version": "1.5"}
        
    except Exception as e:
        logger.error(f"Erreur lors de l'upgrade du manuel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
