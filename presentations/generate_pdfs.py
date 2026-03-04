#!/usr/bin/env python3
"""
Generateur de presentations PDF pour FSAO Iris
Cree 3 versions : courte (5-8 pages), moyenne (10-15 pages), longue (20+ pages)
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Colors
IRIS_BLUE = HexColor('#2563EB')
IRIS_DARK = HexColor('#1E293B')
IRIS_GRAY = HexColor('#64748B')
IRIS_LIGHT = HexColor('#F1F5F9')
IRIS_GREEN = HexColor('#16A34A')
IRIS_PURPLE = HexColor('#7C3AED')
IRIS_RED = HexColor('#DC2626')
IRIS_ORANGE = HexColor('#EA580C')
ACCENT = HexColor('#3B82F6')

LOGO_PATH = '/app/frontend/public/logo-iris.png'
OUTPUT_DIR = '/app/presentations'

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Try to register a nice font
try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    FONT = 'DejaVu'
    FONT_BOLD = 'DejaVuBold'
except:
    FONT = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'


def get_styles():
    """Custom styles for the PDF"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName=FONT_BOLD,
        fontSize=32,
        textColor=IRIS_DARK,
        alignment=TA_CENTER,
        spaceAfter=8*mm,
        leading=38
    ))
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName=FONT,
        fontSize=14,
        textColor=IRIS_GRAY,
        alignment=TA_CENTER,
        spaceAfter=4*mm,
        leading=18
    ))
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontName=FONT_BOLD,
        fontSize=20,
        textColor=IRIS_BLUE,
        spaceBefore=10*mm,
        spaceAfter=6*mm,
        leading=26
    ))
    styles.add(ParagraphStyle(
        name='SubTitle',
        fontName=FONT_BOLD,
        fontSize=14,
        textColor=IRIS_DARK,
        spaceBefore=6*mm,
        spaceAfter=3*mm,
        leading=18
    ))
    styles.add(ParagraphStyle(
        name='BodyText2',
        fontName=FONT,
        fontSize=10,
        textColor=IRIS_DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=3*mm,
        leading=14
    ))
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName=FONT,
        fontSize=10,
        textColor=IRIS_DARK,
        leftIndent=15,
        spaceAfter=2*mm,
        leading=14,
        bulletFontName=FONT_BOLD,
        bulletFontSize=10,
        bulletColor=IRIS_BLUE
    ))
    styles.add(ParagraphStyle(
        name='FeatureTitle',
        fontName=FONT_BOLD,
        fontSize=11,
        textColor=IRIS_BLUE,
        spaceAfter=1*mm,
        leading=14
    ))
    styles.add(ParagraphStyle(
        name='Footer',
        fontName=FONT,
        fontSize=8,
        textColor=IRIS_GRAY,
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='KPI',
        fontName=FONT_BOLD,
        fontSize=24,
        textColor=IRIS_BLUE,
        alignment=TA_CENTER,
        leading=30
    ))
    styles.add(ParagraphStyle(
        name='KPILabel',
        fontName=FONT,
        fontSize=9,
        textColor=IRIS_GRAY,
        alignment=TA_CENTER,
        leading=12
    ))
    styles.add(ParagraphStyle(
        name='Quote',
        fontName=FONT,
        fontSize=11,
        textColor=IRIS_PURPLE,
        alignment=TA_CENTER,
        spaceBefore=6*mm,
        spaceAfter=6*mm,
        leading=16,
        leftIndent=20,
        rightIndent=20
    ))
    return styles


def add_header_footer(canvas, doc):
    """Add header/footer to each page"""
    canvas.saveState()
    # Footer line
    canvas.setStrokeColor(IRIS_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, A4[0] - 20*mm, 15*mm)
    # Footer text
    canvas.setFont(FONT, 7)
    canvas.setFillColor(IRIS_GRAY)
    canvas.drawString(20*mm, 10*mm, "FSAO Iris - Iris")
    canvas.drawRightString(A4[0] - 20*mm, 10*mm, f"Page {doc.page}")
    canvas.restoreState()


def cover_page(styles):
    """Generate cover page elements"""
    elements = []
    elements.append(Spacer(1, 30*mm))
    
    # Logo
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=80*mm, height=40*mm)
        logo.hAlign = 'CENTER'
        elements.append(logo)
    
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph("FSAO Iris", styles['CoverTitle']))
    elements.append(Paragraph(
        "Fonctionnement des Services Assist\u00e9 par Ordinateur",
        styles['CoverSubtitle']
    ))
    elements.append(Spacer(1, 8*mm))
    
    # Horizontal line
    elements.append(HRFlowable(
        width="60%", thickness=2, color=IRIS_BLUE,
        spaceBefore=4*mm, spaceAfter=8*mm, hAlign='CENTER'
    ))
    
    elements.append(Paragraph(
        "Solution compl\u00e8te de gestion de maintenance industrielle,<br/>"
        "auto-h\u00e9berg\u00e9e et enrichie par l'intelligence artificielle",
        styles['CoverSubtitle']
    ))
    
    elements.append(Spacer(1, 20*mm))
    
    # Info box
    info_data = [
        ['Version', 'Concepteur', 'D\u00e9ploiement'],
        ['1.8.0', 'Iris', 'Proxmox LXC']
    ]
    info_table = Table(info_data, colWidths=[50*mm, 50*mm, 50*mm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTNAME', (0, 1), (-1, 1), FONT),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, 1), 11),
        ('TEXTCOLOR', (0, 0), (-1, 0), IRIS_GRAY),
        ('TEXTCOLOR', (0, 1), (-1, 1), IRIS_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    
    elements.append(PageBreak())
    return elements


def kpi_section(styles):
    """KPI highlight section"""
    elements = []
    elements.append(Paragraph("Iris en chiffres", styles['SectionTitle']))
    
    kpis = [
        ('66+', 'Pages fonctionnelles'),
        ('35+', 'Modules API'),
        ('63', 'Modules import/export'),
        ('40+', 'Collections MongoDB'),
    ]
    
    kpi_cells = []
    label_cells = []
    for val, label in kpis:
        kpi_cells.append(Paragraph(val, styles['KPI']))
        label_cells.append(Paragraph(label, styles['KPILabel']))
    
    kpi_table = Table([kpi_cells, label_cells], colWidths=[40*mm]*4)
    kpi_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, -1), IRIS_LIGHT),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 6*mm))
    return elements


def feature_block(title, description, styles):
    """Single feature block"""
    return KeepTogether([
        Paragraph(f"\u25CF  {title}", styles['FeatureTitle']),
        Paragraph(description, styles['BodyText2']),
        Spacer(1, 2*mm)
    ])


def bullet(text, styles):
    """Bullet point"""
    return Paragraph(f"\u2022  {text}", styles['BulletItem'])


# ============================================================
# SHORT VERSION (5-8 pages)
# ============================================================
def generate_short():
    styles = get_styles()
    doc = SimpleDocTemplate(
        os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Courte.pdf'),
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )
    
    elements = cover_page(styles)
    
    # Page 2: Overview
    elements.append(Paragraph("Pr\u00e9sentation", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris est une application web compl\u00e8te de gestion de maintenance industrielle (GMAO/FSAO), "
        "con\u00e7ue pour centraliser et optimiser l'ensemble des op\u00e9rations de maintenance, "
        "de production et de qualit\u00e9. Auto-h\u00e9berg\u00e9e et enrichie par l'intelligence artificielle, "
        "elle offre une solution cl\u00e9-en-main d\u00e9ployable en quelques minutes.",
        styles['BodyText2']
    ))
    
    elements += kpi_section(styles)
    
    # Page 3: Key features
    elements.append(PageBreak())
    elements.append(Paragraph("Fonctionnalit\u00e9s cl\u00e9s", styles['SectionTitle']))
    
    features = [
        ("Intelligence Artificielle (Adria)", 
         "Assistante IA conversationnelle capable de cr\u00e9er, modifier et cl\u00f4turer des ordres de travail en langage naturel. Analyse automatique des non-conformit\u00e9s, causes racines et tendances QHSE."),
        ("Ordres de Travail", 
         "Cr\u00e9ation, assignation, suivi et historique complet. Pi\u00e8ces jointes multiples, templates r\u00e9utilisables, g\u00e9n\u00e9ration PDF."),
        ("QR Codes \u00c9quipements", 
         "G\u00e9n\u00e9ration de QR codes et d'\u00e9tiquettes imprimables. Le scan ouvre une page d'actions rapides configurables pour les techniciens terrain."),
        ("Maintenance Pr\u00e9ventive", 
         "Planification r\u00e9currente avec calendrier Gantt, checklists, alertes automatiques et ex\u00e9cution imm\u00e9diate."),
        ("Inventaire et Achats", 
         "Gestion des pi\u00e8ces d\u00e9tach\u00e9es, alertes stock bas, workflow de validation des demandes d'achat."),
        ("Surveillance et QHSE", 
         "Plan de surveillance avec correspondance IA, presqu'accidents avec analyse 5 Pourquoi et Ishikawa, rapports QHSE automatiques."),
        ("Communication Temps R\u00e9el", 
         "Chat WebSocket, tableau d'affichage collaboratif, consignes inter-\u00e9quipes, notifications push PWA."),
        ("Dashboard Personnalisable", 
         "Widgets custom avec formules math\u00e9matiques, cr\u00e9ation par IA, rapports hebdomadaires automatiques."),
    ]
    for title, desc in features:
        elements.append(feature_block(title, desc, styles))
    
    # Page 4: Benefits
    elements.append(PageBreak())
    elements.append(Paragraph("B\u00e9n\u00e9fices m\u00e9tier", styles['SectionTitle']))
    
    benefits = [
        "R\u00e9duction du temps de gestion des OT gr\u00e2ce \u00e0 l'IA (cr\u00e9ation en langage naturel)",
        "Identification proactive des risques via l'analyse automatique des tendances",
        "Tra\u00e7abilit\u00e9 compl\u00e8te des interventions et \u00e9quipements",
        "Communication am\u00e9lior\u00e9e entre \u00e9quipes (chat, consignes, notifications push)",
        "Co\u00fbts r\u00e9duits : auto-h\u00e9berg\u00e9e, pas d'abonnement SaaS",
        "Conformit\u00e9 QHSE facilit\u00e9e avec rapports automatiques",
        "Accessibilit\u00e9 mobile via PWA (installation comme app native)",
        "QR Codes terrain pour acc\u00e9l\u00e9rer les interventions sur \u00e9quipement",
    ]
    for b in benefits:
        elements.append(bullet(b, styles))
    
    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph(
        "\u00ab FSAO Iris transforme la maintenance r\u00e9active en maintenance intelligente. \u00bb",
        styles['Quote']
    ))
    
    # Page 5: Deployment
    elements.append(PageBreak())
    elements.append(Paragraph("D\u00e9ploiement", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris se d\u00e9ploie dans un container LXC Proxmox en une seule commande. "
        "L'installation est enti\u00e8rement automatis\u00e9e et inclut tous les composants n\u00e9cessaires.",
        styles['BodyText2']
    ))
    
    stack_data = [
        ['Composant', 'Technologie'],
        ['Frontend', 'React 19, Shadcn/UI, Tailwind CSS'],
        ['Backend', 'FastAPI (Python 3.11+)'],
        ['Base de donn\u00e9es', 'MongoDB 7.0+'],
        ['Temps r\u00e9el', 'WebSocket'],
        ['IA', 'Gemini (via Emergent LLM)'],
        ['D\u00e9ploiement', 'Proxmox LXC (Debian 12)'],
        ['Mises \u00e0 jour', 'Int\u00e9gr\u00e9es (1 clic)'],
    ]
    stack_table = Table(stack_data, colWidths=[55*mm, 105*mm])
    stack_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTNAME', (0, 1), (-1, -1), FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BACKGROUND', (0, 0), (-1, 0), IRIS_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('TEXTCOLOR', (0, 1), (-1, -1), IRIS_DARK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, IRIS_LIGHT]),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E2E8F0')),
    ]))
    elements.append(stack_table)
    
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph("Avantages du d\u00e9ploiement LXC Proxmox", styles['SubTitle']))
    lxc_benefits = [
        "Isolation compl\u00e8te sans surcharge de virtualisation",
        "Performance native (pas de couche hyperviseur)",
        "Snapshots et sauvegardes int\u00e9gr\u00e9es \u00e0 Proxmox",
        "Ressources ajustables \u00e0 chaud (RAM, CPU, stockage)",
        "Migration live entre n\u0153uds Proxmox",
        "Empreinte m\u00e9moire minimale (~256 Mo au repos)",
    ]
    for b in lxc_benefits:
        elements.append(bullet(b, styles))
    
    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"[OK] Presentation courte: {doc.filename}")


# ============================================================
# MEDIUM VERSION (10-15 pages)
# ============================================================
def generate_medium():
    styles = get_styles()
    doc = SimpleDocTemplate(
        os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Moyenne.pdf'),
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )
    
    elements = cover_page(styles)
    
    # --- Sommaire ---
    elements.append(Paragraph("Sommaire", styles['SectionTitle']))
    toc_items = [
        "1. Pr\u00e9sentation g\u00e9n\u00e9rale",
        "2. Fonctionnalit\u00e9s principales",
        "3. Intelligence Artificielle",
        "4. QR Codes et mobilit\u00e9 terrain",
        "5. Communication et collaboration",
        "6. B\u00e9n\u00e9fices m\u00e9tier",
        "7. Architecture technique",
        "8. D\u00e9ploiement et installation",
        "9. Support et \u00e9volutions",
    ]
    for item in toc_items:
        elements.append(Paragraph(item, styles['BodyText2']))
    elements.append(PageBreak())
    
    # --- 1. Presentation ---
    elements.append(Paragraph("1. Pr\u00e9sentation g\u00e9n\u00e9rale", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris est une solution GMAO/FSAO nouvelle g\u00e9n\u00e9ration, con\u00e7ue pour r\u00e9pondre aux "
        "besoins des \u00e9quipes de maintenance, production et qualit\u00e9 dans un environnement industriel. "
        "Enti\u00e8rement auto-h\u00e9berg\u00e9e, elle garantit la souverainet\u00e9 de vos donn\u00e9es tout en offrant "
        "une exp\u00e9rience utilisateur moderne et intuitive.",
        styles['BodyText2']
    ))
    elements.append(Paragraph(
        "L'application int\u00e8gre nativement une couche d'intelligence artificielle (Adria) qui "
        "automatise les t\u00e2ches r\u00e9p\u00e9titives, analyse les donn\u00e9es QHSE et assiste les techniciens "
        "dans leurs interventions quotidiennes.",
        styles['BodyText2']
    ))
    
    elements += kpi_section(styles)
    
    elements.append(Paragraph(
        "\u00ab Une GMAO qui s'adapte \u00e0 votre m\u00e9tier, pas l'inverse. \u00bb",
        styles['Quote']
    ))
    elements.append(PageBreak())
    
    # --- 2. Fonctionnalites ---
    elements.append(Paragraph("2. Fonctionnalit\u00e9s principales", styles['SectionTitle']))
    
    modules = [
        ("Ordres de Travail", [
            "Cr\u00e9ation, assignation, suivi et historique complet",
            "Pi\u00e8ces jointes multiples (photos, vid\u00e9os, documents jusqu'\u00e0 25 Mo)",
            "Galerie avec lightbox plein \u00e9cran et pr\u00e9visualisation",
            "Templates r\u00e9utilisables et g\u00e9n\u00e9ration PDF",
            "Filtrage avanc\u00e9 par date, p\u00e9riode, statut, priorit\u00e9",
        ]),
        ("\u00c9quipements", [
            "Inventaire complet avec structure hi\u00e9rarchique (parent/enfant)",
            "Suivi de l'\u00e9tat op\u00e9rationnel et historique des maintenances",
            "Gestion des garanties, co\u00fbts et compteurs",
            "G\u00e9n\u00e9ration de QR codes et \u00e9tiquettes imprimables",
        ]),
        ("Maintenance Pr\u00e9ventive", [
            "Planification r\u00e9currente (hebdo, mensuel, trimestriel, annuel)",
            "Planning visuel calendrier Gantt",
            "Checklists de maintenance et alertes automatiques",
            "Ex\u00e9cution imm\u00e9diate possible",
        ]),
        ("Inventaire et Achats", [
            "Gestion des pi\u00e8ces d\u00e9tach\u00e9es et alertes stock bas",
            "Suivi des fournisseurs et des co\u00fbts",
            "Demandes d'achat avec workflow de validation",
        ]),
        ("Surveillance et QHSE", [
            "Plan de surveillance avec contr\u00f4les p\u00e9riodiques",
            "Correspondance IA des rapports de contr\u00f4le",
            "Presqu'accidents avec formulaire enrichi (7 sections)",
            "Rapports export PDF et Excel",
        ]),
        ("M.E.S. (Suivi de Production)", [
            "Suivi de production en temps r\u00e9el",
            "Calcul automatique de cadence",
            "Rapports M.E.S. planifi\u00e9s",
        ]),
    ]
    
    for mod_title, mod_items in modules:
        elements.append(Paragraph(mod_title, styles['SubTitle']))
        for item in mod_items:
            elements.append(bullet(item, styles))
    
    elements.append(PageBreak())
    
    # --- 3. IA ---
    elements.append(Paragraph("3. Intelligence Artificielle", styles['SectionTitle']))
    elements.append(Paragraph(
        "L'IA est au c\u0153ur de FSAO Iris. L'assistante Adria comprend le langage naturel et "
        "interagit avec l'ensemble des donn\u00e9es de l'application.",
        styles['BodyText2']
    ))
    
    ai_features = [
        ("Adria - Assistante IA", 
         "Cr\u00e9ation, modification et cl\u00f4ture d'OT en langage naturel. "
         "Auto-assignation intelligente, d\u00e9duction de stock automatique, cr\u00e9ation de widgets dashboard."),
        ("Analyse QHSE", 
         "D\u00e9tection automatique des non-conformit\u00e9s r\u00e9currentes, analyse des causes racines "
         "(5 Pourquoi + Ishikawa), rapport de synth\u00e8se QHSE g\u00e9n\u00e9r\u00e9 automatiquement."),
        ("Maintenance Pr\u00e9dictive", 
         "G\u00e9n\u00e9ration automatique de checklists et programmes de maintenance depuis des documents "
         "techniques constructeur. D\u00e9tection d'anomalies capteurs."),
        ("Automatisations", 
         "R\u00e8gles configur\u00e9es en langage naturel : alertes capteurs, rappels maintenance, "
         "escalades, seuils d'inventaire."),
    ]
    for title, desc in ai_features:
        elements.append(feature_block(title, desc, styles))
    
    elements.append(PageBreak())
    
    # --- 4. QR Codes ---
    elements.append(Paragraph("4. QR Codes et mobilit\u00e9 terrain", styles['SectionTitle']))
    elements.append(Paragraph(
        "Chaque \u00e9quipement peut disposer d'un QR code unique g\u00e9n\u00e9r\u00e9 directement depuis l'application. "
        "Le scan du QR code depuis un smartphone ouvre une page d'actions rapides.",
        styles['BodyText2']
    ))
    
    qr_features = [
        "G\u00e9n\u00e9ration automatique de QR codes pour chaque \u00e9quipement",
        "\u00c9tiquettes imprimables (PNG) avec nom de l'\u00e9quipement",
        "Page publique accessible sans connexion (informations \u00e9quipement)",
        "Actions rapides configurables (cr\u00e9er un OT, signaler un probl\u00e8me, etc.)",
        "Certaines actions peuvent n\u00e9cessiter une authentification",
        "Administration des actions depuis les param\u00e8tres",
    ]
    for f in qr_features:
        elements.append(bullet(f, styles))
    
    elements.append(Spacer(1, 4*mm))
    elements.append(Paragraph("Application Mobile (PWA)", styles['SubTitle']))
    pwa_features = [
        "Installation sur l'\u00e9cran d'accueil (Android et iOS)",
        "Notifications push navigateur (Web Push VAPID)",
        "Interface responsive adapt\u00e9e mobile et tablette",
        "Fonctionnement hors-ligne partiel",
    ]
    for f in pwa_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 5. Communication ---
    elements.append(Paragraph("5. Communication et collaboration", styles['SectionTitle']))
    comm_features = [
        ("Chat en temps r\u00e9el", "Messagerie instantan\u00e9e WebSocket avec pr\u00e9visualisation des fichiers joints."),
        ("Tableau d'affichage", "Espace collaboratif en temps r\u00e9el pour les annonces et communications d'\u00e9quipe."),
        ("Consignes inter-\u00e9quipes", "Transmission de consignes avec syst\u00e8me d'acquittement."),
        ("Notifications intelligentes", "Cloche multi-badges dans le header avec 3 compteurs ind\u00e9pendants (OT, am\u00e9liorations, pr\u00e9ventif). Menu d\u00e9roulant avec acc\u00e8s direct aux \u00e9l\u00e9ments en attente."),
        ("Journal des modifications", "Syst\u00e8me 'Quoi de neuf ?' int\u00e9gr\u00e9 avec feedback utilisateur et badge de notification."),
    ]
    for title, desc in comm_features:
        elements.append(feature_block(title, desc, styles))
    
    elements.append(PageBreak())
    
    # --- 6. Benefits ---
    elements.append(Paragraph("6. B\u00e9n\u00e9fices m\u00e9tier", styles['SectionTitle']))
    
    benefit_categories = [
        ("Pour la Direction", [
            "Vision globale en temps r\u00e9el de l'activit\u00e9 maintenance",
            "Rapports automatiques hebdomadaires par email",
            "Analyse des co\u00fbts et tendances via dashboard personnalisable",
            "Conformit\u00e9 QHSE avec rapports structur\u00e9s",
            "Pas d'abonnement SaaS : co\u00fbt ma\u00eetris\u00e9, donn\u00e9es souveraines",
        ]),
        ("Pour les Techniciens", [
            "Cr\u00e9ation d'OT en langage naturel via l'assistante IA",
            "QR codes terrain pour acc\u00e9der instantan\u00e9ment aux \u00e9quipements",
            "Application mobile PWA install\u00e9e sur le smartphone",
            "Notifications push pour les nouvelles assignations",
            "Historique complet des interventions par \u00e9quipement",
        ]),
        ("Pour la Qualit\u00e9/QHSE", [
            "Analyse automatique des non-conformit\u00e9s et presqu'accidents",
            "Rapports QHSE g\u00e9n\u00e9r\u00e9s par IA (causes racines, tendances, plan d'action)",
            "Plan de surveillance avec correspondance IA des rapports",
            "Tra\u00e7abilit\u00e9 compl\u00e8te et audit log",
        ]),
    ]
    
    for cat_title, cat_items in benefit_categories:
        elements.append(Paragraph(cat_title, styles['SubTitle']))
        for item in cat_items:
            elements.append(bullet(item, styles))
    
    elements.append(PageBreak())
    
    # --- 7. Architecture ---
    elements.append(Paragraph("7. Architecture technique", styles['SectionTitle']))
    
    stack_data = [
        ['Couche', 'Technologie', 'D\u00e9tail'],
        ['Frontend', 'React 19', 'Shadcn/UI, Tailwind CSS, Lucide Icons'],
        ['Backend', 'FastAPI', 'Python 3.11+, Uvicorn, APScheduler'],
        ['Base de donn\u00e9es', 'MongoDB 7.0+', '40+ collections, pas de sch\u00e9ma rigide'],
        ['Temps r\u00e9el', 'WebSocket', 'Chat, whiteboard, notifications live'],
        ['IA', 'Gemini Flash', 'Via Emergent LLM (cloisonn\u00e9)'],
        ['Auth', 'JWT + bcrypt', 'Roles et permissions granulaires'],
        ['Serveur', 'Nginx', 'Reverse proxy, SSL, fichiers statiques'],
        ['Process', 'Supervisor', 'Gestion des services backend'],
        ['PWA', 'Service Worker', 'Cache, notifications push VAPID'],
    ]
    stack_table = Table(stack_data, colWidths=[35*mm, 35*mm, 90*mm])
    stack_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTNAME', (0, 1), (-1, -1), FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), IRIS_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('TEXTCOLOR', (0, 1), (-1, -1), IRIS_DARK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, IRIS_LIGHT]),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E2E8F0')),
    ]))
    elements.append(stack_table)
    
    elements.append(PageBreak())
    
    # --- 8. Deployment ---
    elements.append(Paragraph("8. D\u00e9ploiement et installation", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris est con\u00e7ue pour \u00eatre d\u00e9ploy\u00e9e dans un container LXC sur un serveur Proxmox. "
        "Cette architecture offre le meilleur compromis entre performance, s\u00e9curit\u00e9 et simplicit\u00e9.",
        styles['BodyText2']
    ))
    
    elements.append(Paragraph("Pourquoi un container LXC Proxmox ?", styles['SubTitle']))
    lxc_benefits = [
        ("Performance native", "Pas de couche de virtualisation. Les performances sont quasi identiques \u00e0 celles d'une machine physique."),
        ("Isolation s\u00e9curis\u00e9e", "Chaque container est isol\u00e9 du syst\u00e8me h\u00f4te et des autres containers."),
        ("Gestion des ressources", "RAM, CPU et stockage ajustables \u00e0 chaud depuis l'interface Proxmox."),
        ("Sauvegardes Proxmox", "Snapshots, sauvegardes planifi\u00e9es et migration live entre n\u0153uds."),
        ("Empreinte l\u00e9g\u00e8re", "~256 Mo de RAM au repos, contre 1+ Go pour une VM compl\u00e8te."),
        ("Installation en 1 commande", "Le script d'installation g\u00e8re tout : MongoDB, Node.js, Python, Nginx, SSL."),
    ]
    for title, desc in lxc_benefits:
        elements.append(feature_block(title, desc, styles))
    
    elements.append(Paragraph("Mises \u00e0 jour", styles['SubTitle']))
    elements.append(Paragraph(
        "Le syst\u00e8me de mise \u00e0 jour est enti\u00e8rement int\u00e9gr\u00e9 \u00e0 l'application. Un administrateur peut "
        "v\u00e9rifier, appliquer et suivre les mises \u00e0 jour depuis l'interface web, sans acc\u00e8s SSH.",
        styles['BodyText2']
    ))
    
    elements.append(PageBreak())
    
    # --- 9. Support ---
    elements.append(Paragraph("9. Support et \u00e9volutions", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris est en \u00e9volution constante. Le journal des modifications int\u00e9gr\u00e9 permet de "
        "suivre chaque nouvelle fonctionnalit\u00e9 et correction. Les utilisateurs peuvent donner leur "
        "feedback directement depuis l'application.",
        styles['BodyText2']
    ))
    
    elements.append(Paragraph("Ressources disponibles", styles['SubTitle']))
    support_items = [
        "Manuel int\u00e9gr\u00e9 \u00e0 l'application (38+ chapitres)",
        "Documentation API Swagger compl\u00e8te (/docs)",
        "Visite guid\u00e9e personnalis\u00e9e par profil \u00e0 la premi\u00e8re connexion",
        "Journal des modifications avec feedback utilisateur",
        "Syst\u00e8me de diagnostic int\u00e9gr\u00e9 pour le d\u00e9pannage",
    ]
    for item in support_items:
        elements.append(bullet(item, styles))
    
    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"[OK] Presentation moyenne: {doc.filename}")


# ============================================================
# LONG VERSION (20+ pages)
# ============================================================
def generate_long():
    styles = get_styles()
    doc = SimpleDocTemplate(
        os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Complete.pdf'),
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )
    
    elements = cover_page(styles)
    
    # --- Sommaire ---
    elements.append(Paragraph("Sommaire", styles['SectionTitle']))
    toc_items = [
        "1. Pr\u00e9sentation g\u00e9n\u00e9rale",
        "2. Intelligence Artificielle",
        "3. Ordres de Travail",
        "4. \u00c9quipements et QR Codes",
        "5. Maintenance Pr\u00e9ventive",
        "6. Inventaire, Achats et Fournisseurs",
        "7. Surveillance, QHSE et Presqu'accidents",
        "8. M.E.S. - Suivi de Production",
        "9. Communication et Collaboration",
        "10. Rapports et Analytics",
        "11. Application Mobile (PWA)",
        "12. Import/Export et Sauvegardes",
        "13. Administration et S\u00e9curit\u00e9",
        "14. Architecture Technique",
        "15. D\u00e9ploiement Proxmox LXC",
        "16. Support, Installation et \u00c9volutions",
    ]
    for item in toc_items:
        elements.append(Paragraph(item, styles['BodyText2']))
    elements.append(PageBreak())
    
    # --- 1. Presentation ---
    elements.append(Paragraph("1. Pr\u00e9sentation g\u00e9n\u00e9rale", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris (Fonctionnement des Services Assist\u00e9 par Ordinateur) est une application web "
        "full-stack con\u00e7ue pour g\u00e9rer l'ensemble du cycle de maintenance industrielle et du "
        "fonctionnement des services. Elle r\u00e9pond aux besoins des \u00e9quipes de maintenance, production, "
        "qualit\u00e9 et direction dans un environnement industriel.",
        styles['BodyText2']
    ))
    elements.append(Paragraph(
        "Enti\u00e8rement auto-h\u00e9berg\u00e9e, FSAO Iris garantit la souverainet\u00e9 compl\u00e8te de vos donn\u00e9es. "
        "Pas d'abonnement SaaS, pas de d\u00e9pendance \u00e0 un service cloud tiers. Vos donn\u00e9es restent "
        "sur votre infrastructure, accessibles uniquement par vos \u00e9quipes.",
        styles['BodyText2']
    ))
    elements.append(Paragraph(
        "L'application int\u00e8gre nativement une couche d'intelligence artificielle (assistante Adria) "
        "qui automatise les t\u00e2ches r\u00e9p\u00e9titives, analyse les donn\u00e9es de qualit\u00e9 et s\u00e9curit\u00e9, et "
        "assiste les techniciens dans leurs interventions quotidiennes en langage naturel.",
        styles['BodyText2']
    ))
    
    elements += kpi_section(styles)
    
    elements.append(Paragraph("Public cible", styles['SubTitle']))
    audiences = [
        ("Directeurs d'usine / RSI", "Vision globale, KPIs, rapports automatiques, conformit\u00e9"),
        ("Responsables maintenance", "Planification, suivi OT, analyse tendances, inventaire"),
        ("Techniciens terrain", "App mobile, QR codes, IA conversationnelle, notifications"),
        ("Responsables QHSE", "Presqu'accidents, plan de surveillance, rapports IA"),
        ("Responsables production", "M.E.S., cadence, rapports planifi\u00e9s"),
    ]
    for title, desc in audiences:
        elements.append(feature_block(title, desc, styles))
    
    elements.append(PageBreak())
    
    # --- 2. IA ---
    elements.append(Paragraph("2. Intelligence Artificielle", styles['SectionTitle']))
    elements.append(Paragraph(
        "L'intelligence artificielle est int\u00e9gr\u00e9e \u00e0 chaque niveau de FSAO Iris. "
        "Elle ne se contente pas d'analyser : elle agit, cr\u00e9e, modifie et pr\u00e9vient.",
        styles['BodyText2']
    ))
    
    elements.append(Paragraph("Adria - Assistante IA conversationnelle", styles['SubTitle']))
    adria_features = [
        "Cr\u00e9ation d'ordres de travail en langage naturel",
        "Modification d'OT existants (statut, priorit\u00e9, description, assignation)",
        "Cl\u00f4ture d'OT avec temps pass\u00e9, pi\u00e8ces utilis\u00e9es et commentaire",
        "Auto-assignation intelligente (r\u00e9solution de nom de technicien)",
        "Cr\u00e9ation de widgets dashboard personnalis\u00e9s",
        "Support des formules math\u00e9matiques pour les KPIs",
        "Configuration d'automatisations en langage naturel",
        "M\u00e9moire de conversation et contexte enrichi par les donn\u00e9es FSAO",
    ]
    for f in adria_features:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("IA - Checklists et Maintenance", styles['SubTitle']))
    ai_maint = [
        "G\u00e9n\u00e9ration automatique de checklists depuis un document technique",
        "G\u00e9n\u00e9ration de programmes de maintenance depuis documentation constructeur",
        "Analyse des non-conformit\u00e9s pour d\u00e9tecter les patterns r\u00e9currents",
        "Cr\u00e9ation d'OT curatifs en 1 clic depuis les r\u00e9sultats IA",
        "Alertes email automatiques aux responsables de service",
    ]
    for f in ai_maint:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("IA - Presqu'accidents et QHSE", styles['SubTitle']))
    ai_qhse = [
        "Analyse des causes racines (5 Pourquoi + diagramme Ishikawa)",
        "D\u00e9tection d'incidents similaires dans l'historique",
        "Analyse globale des tendances et pr\u00e9dictions",
        "Rapport de synth\u00e8se QHSE structur\u00e9 (KPIs, plan d'action, top risques)",
        "Alertes email automatiques aux responsables",
    ]
    for f in ai_qhse:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("Tableau de bord IA", styles['SubTitle']))
    ai_dash = [
        "5 onglets : Tendances, Ordres de Travail, Capteurs, Surveillance, Automatisations",
        "Diagnostic IA par OT (causes probables, recommandations)",
        "R\u00e9sum\u00e9 IA des interventions",
        "D\u00e9tection pr\u00e9dictive d'anomalies capteurs",
        "Notifications push temps r\u00e9el pour les automatisations",
    ]
    for f in ai_dash:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 3. OT ---
    elements.append(Paragraph("3. Ordres de Travail", styles['SectionTitle']))
    ot_features = [
        "Cr\u00e9ation manuelle ou via IA (langage naturel)",
        "Assignation \u00e0 un technicien ou une \u00e9quipe",
        "4 statuts : Ouvert, En attente, En cours, Termin\u00e9",
        "4 niveaux de priorit\u00e9 : Basse, Normale, Haute, Urgente",
        "Cat\u00e9gories : Corrective, Pr\u00e9ventive, Am\u00e9liorative, R\u00e9glage, etc.",
        "Pi\u00e8ces jointes multiples (photos, vid\u00e9os, PDF jusqu'\u00e0 25 Mo)",
        "Galerie avec lightbox plein \u00e9cran (navigation clavier)",
        "Templates r\u00e9utilisables pour les interventions r\u00e9currentes",
        "Bons de travail g\u00e9n\u00e9rables en PDF",
        "Suivi du temps (estim\u00e9 vs r\u00e9el)",
        "Pi\u00e8ces utilis\u00e9es avec d\u00e9duction automatique du stock",
        "Commentaires et historique complet",
        "Filtrage avanc\u00e9 multi-crit\u00e8res",
    ]
    for f in ot_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 4. Equipements + QR ---
    elements.append(Paragraph("4. \u00c9quipements et QR Codes", styles['SectionTitle']))
    
    elements.append(Paragraph("\u00c9quipements", styles['SubTitle']))
    eq_features = [
        "Inventaire complet avec structure hi\u00e9rarchique (parent/enfant)",
        "Vues en liste et en arborescence",
        "Suivi de l'\u00e9tat op\u00e9rationnel (Op\u00e9rationnel, D\u00e9grad\u00e9, Hors service)",
        "Historique de toutes les maintenances et interventions",
        "Gestion des garanties, co\u00fbts et compteurs (m\u00e8tres)",
        "Liaison avec les ordres de travail et la maintenance pr\u00e9ventive",
    ]
    for f in eq_features:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("QR Codes", styles['SubTitle']))
    elements.append(Paragraph(
        "La fonctionnalit\u00e9 QR Codes transforme chaque \u00e9quipement en point d'acc\u00e8s num\u00e9rique. "
        "Un simple scan depuis un smartphone permet d'acc\u00e9der instantan\u00e9ment aux informations "
        "et aux actions associ\u00e9es \u00e0 un \u00e9quipement.",
        styles['BodyText2']
    ))
    qr_details = [
        "G\u00e9n\u00e9ration automatique d'un QR code unique par \u00e9quipement",
        "\u00c9tiquettes imprimables au format PNG (QR code + nom de l'\u00e9quipement)",
        "Page publique accessible sans connexion affichant les informations de l'\u00e9quipement",
        "Liste d'actions rapides configurables par l'administrateur",
        "Exemples d'actions : cr\u00e9er un OT, signaler un probl\u00e8me, demander une intervention",
        "Possibilit\u00e9 de restreindre certaines actions aux utilisateurs connect\u00e9s",
        "Administration compl\u00e8te depuis Param\u00e8tres > Actions QR",
    ]
    for f in qr_details:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 5. Maintenance Preventive ---
    elements.append(Paragraph("5. Maintenance Pr\u00e9ventive", styles['SectionTitle']))
    mp_features = [
        "Planification r\u00e9currente : hebdomadaire, mensuel, trimestriel, annuel",
        "Planning visuel avec calendrier Gantt",
        "Checklists de maintenance d\u00e9taill\u00e9es",
        "G\u00e9n\u00e9ration automatique de programmes depuis documents constructeur (IA)",
        "Alertes automatiques avant \u00e9ch\u00e9ance",
        "Ex\u00e9cution imm\u00e9diate possible",
        "Suivi des maintenances \u00e9chues avec badge dans le header",
    ]
    for f in mp_features:
        elements.append(bullet(f, styles))
    
    # --- 6. Inventaire ---
    elements.append(Paragraph("6. Inventaire, Achats et Fournisseurs", styles['SectionTitle']))
    inv_features = [
        "Gestion des pi\u00e8ces d\u00e9tach\u00e9es avec seuils d'alerte",
        "Alertes stock bas avec badge dans le header",
        "D\u00e9duction automatique du stock lors de la cl\u00f4ture d'OT",
        "Suivi des fournisseurs avec coordonn\u00e9es et historique",
        "Demandes d'achat avec workflow de validation hi\u00e9rarchique",
        "Historique des achats avec statistiques par utilisateur et par mois",
    ]
    for f in inv_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 7. Surveillance ---
    elements.append(Paragraph("7. Surveillance, QHSE et Presqu'accidents", styles['SectionTitle']))
    
    elements.append(Paragraph("Plan de Surveillance", styles['SubTitle']))
    surv_features = [
        "Suivi des contr\u00f4les p\u00e9riodiques (onglets par ann\u00e9e)",
        "G\u00e9n\u00e9ration automatique des contr\u00f4les r\u00e9currents",
        "Correspondance IA des rapports de contr\u00f4le",
        "Correspondance manuelle en cas d'ambigu\u00eft\u00e9",
        "3 modes de rapports : cartes, tableau, graphiques",
        "KPIs : taux de r\u00e9alisation, \u00e9cart moyen, respect des d\u00e9lais",
        "Export PDF et Excel",
    ]
    for f in surv_features:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("Presqu'accidents", styles['SubTitle']))
    pa_features = [
        "Formulaire enrichi en 7 sections",
        "Cat\u00e9gorie d'incident, \u00e9quipement li\u00e9, mesures imm\u00e9diates",
        "Type de l\u00e9sion potentielle, t\u00e9moins, conditions, facteurs contributifs",
        "Analyse IA des causes racines (5 Pourquoi + Ishikawa)",
        "D\u00e9tection automatique d'incidents similaires",
        "Analyse des tendances avec pr\u00e9dictions",
        "Rapport de synth\u00e8se QHSE g\u00e9n\u00e9r\u00e9 par IA",
    ]
    for f in pa_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 8. MES ---
    elements.append(Paragraph("8. M.E.S. - Suivi de Production", styles['SectionTitle']))
    mes_features = [
        "Suivi de production en temps r\u00e9el",
        "Calcul automatique de cadence (par minute, via scheduler)",
        "Int\u00e9gration cam\u00e9ras (snapshots, alertes via Frigate/MQTT)",
        "Rapports M.E.S. planifi\u00e9s",
        "Dashboard d\u00e9di\u00e9 production",
    ]
    for f in mes_features:
        elements.append(bullet(f, styles))
    
    # --- 9. Communication ---
    elements.append(Paragraph("9. Communication et Collaboration", styles['SectionTitle']))
    comm_features = [
        "Chat en temps r\u00e9el (WebSocket) avec pr\u00e9visualisation fichiers",
        "Tableau d'affichage collaboratif (Whiteboard WebSocket)",
        "Consignes inter-\u00e9quipes avec acquittement",
        "Notifications temps r\u00e9el pour OT et \u00e9quipements",
        "Notifications push mobile (PWA + Expo)",
        "Cloche multi-badges : OT en attente (rouge), am\u00e9liorations (violet), pr\u00e9ventif (vert)",
        "Menu d\u00e9roulant avec acc\u00e8s direct et filtres pr\u00e9-appliqu\u00e9s",
        "Journal des modifications ('Quoi de neuf ?') avec feedback utilisateur",
    ]
    for f in comm_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 10. Rapports ---
    elements.append(Paragraph("10. Rapports et Analytics", styles['SectionTitle']))
    reports = [
        "Tableaux de bord en temps r\u00e9el",
        "Dashboard personnalisable avec widgets custom (cr\u00e9ation par IA)",
        "Formules math\u00e9matiques pour KPIs avanc\u00e9s",
        "Statistiques d\u00e9taill\u00e9es et analyse des co\u00fbts",
        "Exports PDF, Excel, CSV (admin)",
        "Rapports hebdomadaires automatiques par email",
        "Rapports M.E.S. planifi\u00e9s",
        "Rapport QHSE g\u00e9n\u00e9r\u00e9 par IA",
    ]
    for f in reports:
        elements.append(bullet(f, styles))
    
    # --- 11. PWA ---
    elements.append(Paragraph("11. Application Mobile (PWA)", styles['SectionTitle']))
    pwa = [
        "Installation sur l'\u00e9cran d'accueil (Android via Chrome, iOS via Safari)",
        "Notifications push navigateur (Web Push VAPID)",
        "Interface responsive adapt\u00e9e mobile et tablette",
        "Header adaptatif (ic\u00f4nes secondaires masqu\u00e9es sur mobile)",
        "Sidebar overlay avec menu hamburger sur mobile",
        "Fonctionnement hors-ligne partiel (cache Service Worker)",
        "Mise \u00e0 jour automatique du cache apr\u00e8s mise \u00e0 jour serveur",
    ]
    for f in pwa:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 12. Import/Export ---
    elements.append(Paragraph("12. Import/Export et Sauvegardes", styles['SectionTitle']))
    ie_features = [
        "Import/export de 63 modules (s\u00e9lecteur par 12 cat\u00e9gories)",
        "Export complet en ZIP (data.xlsx + fichiers upload\u00e9s)",
        "Import ZIP pour restauration compl\u00e8te",
        "Sauvegardes automatiques planifi\u00e9es (quotidien/hebdo/mensuel)",
        "Destinations : local, Google Drive, ou les deux",
        "Nettoyage automatique (r\u00e9tention 1 \u00e0 5 backups)",
        "V\u00e9rification d'int\u00e9grit\u00e9 des archives ZIP",
        "Historique avec t\u00e9l\u00e9chargement et notifications email",
        "Ic\u00f4ne de statut dans le header (vert = backup r\u00e9cent)",
    ]
    for f in ie_features:
        elements.append(bullet(f, styles))
    
    # --- 13. Admin ---
    elements.append(Paragraph("13. Administration et S\u00e9curit\u00e9", styles['SectionTitle']))
    admin_features = [
        "3 r\u00f4les : Administrateur, Technicien, Visualiseur",
        "Permissions granulaires par module (view, edit, delete)",
        "Modules IA configurables par r\u00f4le",
        "Gestion des \u00e9quipes, services et responsables hi\u00e9rarchiques",
        "Planning de disponibilit\u00e9 des techniciens",
        "Pr\u00e9f\u00e9rences utilisateur personnalis\u00e9es",
        "Journal d'activit\u00e9 complet (audit log)",
        "Acc\u00e8s SSH distant depuis l'interface (admin)",
        "Configuration Tailscale depuis l'interface web",
        "Visite guid\u00e9e personnalis\u00e9e par profil \u00e0 la premi\u00e8re connexion",
    ]
    for f in admin_features:
        elements.append(bullet(f, styles))
    
    elements.append(PageBreak())
    
    # --- 14. Architecture ---
    elements.append(Paragraph("14. Architecture Technique", styles['SectionTitle']))
    
    stack_data = [
        ['Couche', 'Technologie', 'D\u00e9tail'],
        ['Frontend', 'React 19', 'Shadcn/UI, Tailwind CSS, Lucide Icons'],
        ['Backend', 'FastAPI', 'Python 3.11+, Uvicorn, APScheduler'],
        ['Base de donn\u00e9es', 'MongoDB 7.0+', '40+ collections, flexible'],
        ['Temps r\u00e9el', 'WebSocket', 'Chat, whiteboard, notifications'],
        ['IA', 'Gemini Flash', 'Via Emergent LLM'],
        ['Auth', 'JWT + bcrypt', 'R\u00f4les et permissions granulaires'],
        ['Serveur web', 'Nginx', 'Reverse proxy, SSL, static'],
        ['Process', 'Supervisor', 'Gestion services backend'],
        ['Notifications', 'Web Push', 'VAPID + Expo Push'],
        ['PWA', 'Service Worker', 'Cache, install, push'],
        ['IoT', 'MQTT', 'Capteurs, cam\u00e9ras, Frigate'],
        ['D\u00e9ploiement', 'Proxmox LXC', 'Debian 12, auto-install'],
    ]
    stack_table = Table(stack_data, colWidths=[35*mm, 35*mm, 90*mm])
    stack_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTNAME', (0, 1), (-1, -1), FONT),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), IRIS_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('TEXTCOLOR', (0, 1), (-1, -1), IRIS_DARK),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, IRIS_LIGHT]),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E2E8F0')),
    ]))
    elements.append(stack_table)
    
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Structure du projet", styles['SubTitle']))
    struct_lines = [
        "backend/ - API FastAPI (~9000+ lignes), 35+ modules de routes, 16 services m\u00e9tier",
        "frontend/ - Application React 19, 66 pages, composants Shadcn/UI",
        "Hooks React personnalis\u00e9s pour la logique m\u00e9tier",
        "WebSocket managers pour chat, whiteboard, notifications temps r\u00e9el",
        "Service Worker pour PWA, cache et notifications push",
    ]
    for s in struct_lines:
        elements.append(bullet(s, styles))
    
    elements.append(PageBreak())
    
    # --- 15. Deployment ---
    elements.append(Paragraph("15. D\u00e9ploiement Proxmox LXC", styles['SectionTitle']))
    elements.append(Paragraph(
        "FSAO Iris est optimis\u00e9e pour un d\u00e9ploiement dans un container LXC sur un serveur Proxmox VE. "
        "Cette architecture offre le meilleur compromis entre performance, s\u00e9curit\u00e9, simplicit\u00e9 d'administration "
        "et co\u00fbt.",
        styles['BodyText2']
    ))
    
    elements.append(Paragraph("Avantages du container LXC", styles['SubTitle']))
    lxc_adv = [
        ("Performance native", 
         "Les containers LXC partagent le noyau Linux de l'h\u00f4te sans couche de virtualisation. "
         "Les performances sont quasi identiques \u00e0 celles d'un serveur physique d\u00e9di\u00e9."),
        ("Isolation s\u00e9curis\u00e9e", 
         "Chaque container est isol\u00e9 via des namespaces et cgroups Linux. Les processus, le r\u00e9seau "
         "et le syst\u00e8me de fichiers sont compl\u00e8tement cloisonn\u00e9s."),
        ("Gestion des ressources \u00e0 chaud", 
         "RAM, CPU et stockage sont ajustables depuis l'interface Proxmox sans red\u00e9marrage du container."),
        ("Sauvegardes int\u00e9gr\u00e9es", 
         "Proxmox offre des snapshots instantan\u00e9s, des sauvegardes planifi\u00e9es (vzdump) et la migration "
         "live entre n\u0153uds d'un cluster."),
        ("Empreinte m\u00e9moire minimale", 
         "FSAO Iris consomme environ 256 Mo de RAM au repos dans un container LXC, contre 1+ Go "
         "pour une machine virtuelle compl\u00e8te."),
        ("Haute disponibilit\u00e9", 
         "En cluster Proxmox, le container peut \u00eatre migr\u00e9 automatiquement vers un autre n\u0153ud "
         "en cas de panne mat\u00e9rielle."),
    ]
    for title, desc in lxc_adv:
        elements.append(feature_block(title, desc, styles))
    
    elements.append(Paragraph("Installation", styles['SubTitle']))
    elements.append(Paragraph(
        "L'installation se fait en une seule commande depuis le serveur Proxmox. Le script interactif "
        "cr\u00e9e automatiquement un container Debian 12 et installe tous les composants : MongoDB 7.0, "
        "Node.js 20, Python 3.11+, Nginx, Supervisor, et effectue le build complet de l'application.",
        styles['BodyText2']
    ))
    
    install_steps = [
        "1. Ex\u00e9cutez le script d'installation sur le serveur Proxmox",
        "2. Renseignez le token GitHub, la configuration r\u00e9seau et les identifiants admin",
        "3. Le script cr\u00e9e le container, installe les d\u00e9pendances et d\u00e9marre l'application",
        "4. Ex\u00e9cutez le script post-install pour SSL (Let's Encrypt) et Google Drive",
        "5. Acc\u00e9dez \u00e0 l'application via votre navigateur",
    ]
    for step in install_steps:
        elements.append(Paragraph(step, styles['BodyText2']))
    
    elements.append(Paragraph("Mises \u00e0 jour int\u00e9gr\u00e9es", styles['SubTitle']))
    elements.append(Paragraph(
        "Le syst\u00e8me de mise \u00e0 jour est enti\u00e8rement int\u00e9gr\u00e9. Un administrateur peut v\u00e9rifier, "
        "appliquer et suivre les mises \u00e0 jour depuis l'interface web. Le processus inclut : "
        "sauvegarde automatique, mise \u00e0 jour du code, installation des d\u00e9pendances, rebuild du "
        "frontend et red\u00e9marrage des services. En cas d'erreur, un rollback automatique est effectu\u00e9.",
        styles['BodyText2']
    ))
    
    elements.append(PageBreak())
    
    # --- 16. Support ---
    elements.append(Paragraph("16. Support, Installation et \u00c9volutions", styles['SectionTitle']))
    
    elements.append(Paragraph("Documentation int\u00e9gr\u00e9e", styles['SubTitle']))
    doc_features = [
        "Manuel utilisateur int\u00e9gr\u00e9 (41 chapitres couvrant tous les modules)",
        "Documentation API Swagger compl\u00e8te accessible via /docs",
        "Visite guid\u00e9e personnalis\u00e9e par profil m\u00e9tier \u00e0 la premi\u00e8re connexion",
        "Journal des modifications ('Quoi de neuf ?') avec historique des versions",
        "Syst\u00e8me de feedback utilisateur sur chaque version",
    ]
    for f in doc_features:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("Personnalisation", styles['SubTitle']))
    custom = [
        "Personnalisation compl\u00e8te de l'assistante IA (nom, genre, mod\u00e8le LLM)",
        "Dashboard personnalisable avec widgets custom",
        "Permissions granulaires par r\u00f4le et par module",
        "Configuration des actions QR par \u00e9quipement",
        "Fuseau horaire configurable",
        "Th\u00e8me et pr\u00e9f\u00e9rences utilisateur",
    ]
    for f in custom:
        elements.append(bullet(f, styles))
    
    elements.append(Paragraph("Int\u00e9grations", styles['SubTitle']))
    integrations = [
        "IoT : MQTT pour capteurs et cam\u00e9ras (Frigate)",
        "Google Drive pour les sauvegardes cloud",
        "SMTP pour les emails (rapports, alertes, notifications)",
        "Tailscale pour l'acc\u00e8s distant s\u00e9curis\u00e9",
        "Web Push (VAPID) pour les notifications navigateur",
        "Expo Push pour l'application mobile native",
    ]
    for f in integrations:
        elements.append(bullet(f, styles))
    
    elements.append(Spacer(1, 10*mm))
    elements.append(HRFlowable(
        width="80%", thickness=1, color=IRIS_BLUE,
        spaceBefore=6*mm, spaceAfter=6*mm, hAlign='CENTER'
    ))
    elements.append(Paragraph(
        "\u00ab FSAO Iris : la GMAO intelligente, souveraine et accessible. \u00bb",
        styles['Quote']
    ))
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Iris - Version 1.8.0 - Mars 2026", styles['CoverSubtitle']))
    
    doc.build(elements, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"[OK] Presentation complete: {doc.filename}")


if __name__ == '__main__':
    generate_short()
    generate_medium()
    generate_long()
    print(f"\n3 PDFs generes dans {OUTPUT_DIR}/")
