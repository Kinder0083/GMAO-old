#!/usr/bin/env python3
"""
Generateur de presentations PDF pour FSAO Iris - AVEC CAPTURES D'ECRAN
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
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

LOGO_PATH = '/app/frontend/public/logo-iris.png'
SC = '/app/presentations/screenshots'
OUTPUT_DIR = '/app/presentations'
PAGE_W = A4[0] - 40*mm  # usable width

os.makedirs(OUTPUT_DIR, exist_ok=True)

try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    FONT, FONT_BOLD = 'DejaVu', 'DejaVuBold'
except:
    FONT, FONT_BOLD = 'Helvetica', 'Helvetica-Bold'


def get_styles():
    styles = getSampleStyleSheet()
    defs = [
        ('CoverTitle', FONT_BOLD, 32, IRIS_DARK, TA_CENTER, 8*mm, 38),
        ('CoverSubtitle', FONT, 14, IRIS_GRAY, TA_CENTER, 4*mm, 18),
        ('SectionTitle', FONT_BOLD, 20, IRIS_BLUE, None, 6*mm, 26),
        ('SubTitle', FONT_BOLD, 14, IRIS_DARK, None, 3*mm, 18),
        ('BodyText2', FONT, 10, IRIS_DARK, TA_JUSTIFY, 3*mm, 14),
        ('BulletItem', FONT, 10, IRIS_DARK, None, 2*mm, 14),
        ('FeatureTitle', FONT_BOLD, 11, IRIS_BLUE, None, 1*mm, 14),
        ('KPI', FONT_BOLD, 24, IRIS_BLUE, TA_CENTER, 0, 30),
        ('KPILabel', FONT, 9, IRIS_GRAY, TA_CENTER, 0, 12),
        ('Quote', FONT, 11, HexColor('#7C3AED'), TA_CENTER, 6*mm, 16),
        ('Caption', FONT, 8, IRIS_GRAY, TA_CENTER, 2*mm, 10),
    ]
    for name, font, size, color, align, space, lead in defs:
        kw = dict(fontName=font, fontSize=size, textColor=color, spaceAfter=space, leading=lead)
        if align: kw['alignment'] = align
        if name == 'SectionTitle': kw['spaceBefore'] = 10*mm
        if name == 'SubTitle': kw['spaceBefore'] = 6*mm
        if name == 'BulletItem': kw['leftIndent'] = 15
        if name == 'Quote': kw.update(leftIndent=20, rightIndent=20, spaceBefore=6*mm)
        styles.add(ParagraphStyle(name=name, **kw))
    return styles


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(IRIS_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, A4[0] - 20*mm, 15*mm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(IRIS_GRAY)
    canvas.drawString(20*mm, 10*mm, "FSAO Iris - Iris")
    canvas.drawRightString(A4[0] - 20*mm, 10*mm, f"Page {doc.page}")
    canvas.restoreState()


def screenshot(path, caption, width=PAGE_W):
    """Add a screenshot with caption"""
    full = os.path.join(SC, path)
    if not os.path.exists(full):
        return []
    styles = get_styles()
    img = Image(full, width=width, height=width * 0.42)
    img.hAlign = 'CENTER'
    return [
        Spacer(1, 3*mm),
        img,
        Paragraph(caption, styles['Caption']),
        Spacer(1, 3*mm),
    ]


def cover_page(styles):
    el = [Spacer(1, 30*mm)]
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=80*mm, height=40*mm)
        logo.hAlign = 'CENTER'
        el.append(logo)
    el += [
        Spacer(1, 15*mm),
        Paragraph("FSAO Iris", styles['CoverTitle']),
        Paragraph("Fonctionnement des Services Assist\u00e9 par Ordinateur", styles['CoverSubtitle']),
        Spacer(1, 8*mm),
        HRFlowable(width="60%", thickness=2, color=IRIS_BLUE, spaceBefore=4*mm, spaceAfter=8*mm, hAlign='CENTER'),
        Paragraph(
            "Solution compl\u00e8te de gestion de maintenance industrielle,<br/>"
            "auto-h\u00e9berg\u00e9e et enrichie par l'intelligence artificielle",
            styles['CoverSubtitle']
        ),
        Spacer(1, 20*mm),
    ]
    info = Table(
        [['Version', 'Soci\u00e9t\u00e9', 'D\u00e9ploiement'], ['1.8.0', 'Iris', 'Proxmox LXC']],
        colWidths=[50*mm]*3
    )
    info.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD), ('FONTNAME', (0, 1), (-1, 1), FONT),
        ('FONTSIZE', (0, 0), (-1, 0), 9), ('FONTSIZE', (0, 1), (-1, 1), 11),
        ('TEXTCOLOR', (0, 0), (-1, 0), IRIS_GRAY), ('TEXTCOLOR', (0, 1), (-1, 1), IRIS_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    el += [info, PageBreak()]
    return el


def kpi_section(styles):
    kpis = [('66+', 'Pages'), ('35+', 'Modules API'), ('63', 'Import/Export'), ('40+', 'Collections')]
    cells = [[Paragraph(v, styles['KPI']) for v, _ in kpis],
             [Paragraph(l, styles['KPILabel']) for _, l in kpis]]
    t = Table(cells, colWidths=[40*mm]*4)
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,-1), IRIS_LIGHT),
    ]))
    return [Paragraph("Iris en chiffres", styles['SectionTitle']), t, Spacer(1, 6*mm)]


def fb(title, desc, styles):
    return KeepTogether([
        Paragraph(f"\u25cf  {title}", styles['FeatureTitle']),
        Paragraph(desc, styles['BodyText2']), Spacer(1, 2*mm)
    ])


def bullet(text, styles):
    return Paragraph(f"\u2022  {text}", styles['BulletItem'])


def tech_table(styles):
    data = [
        ['Couche', 'Technologie', 'D\u00e9tail'],
        ['Frontend', 'React 19', 'Shadcn/UI, Tailwind CSS, Lucide Icons'],
        ['Backend', 'FastAPI', 'Python 3.11+, Uvicorn, APScheduler'],
        ['Base de donn\u00e9es', 'MongoDB 7.0+', '40+ collections, flexible'],
        ['Temps r\u00e9el', 'WebSocket', 'Chat, whiteboard, notifications'],
        ['IA', 'Gemini Flash', 'Via Emergent LLM'],
        ['Auth', 'JWT + bcrypt', 'R\u00f4les et permissions granulaires'],
        ['Serveur', 'Nginx', 'Reverse proxy, SSL'],
        ['Process', 'Supervisor', 'Gestion services backend'],
        ['PWA', 'Service Worker', 'Cache, push, install'],
    ]
    t = Table(data, colWidths=[35*mm, 35*mm, 90*mm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), FONT_BOLD), ('FONTNAME', (0,1), (-1,-1), FONT),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,0), (-1,0), IRIS_BLUE), ('TEXTCOLOR', (0,0), (-1,0), white),
        ('TEXTCOLOR', (0,1), (-1,-1), IRIS_DARK),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, IRIS_LIGHT]),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E2E8F0')),
    ]))
    return t


# ============================================================
# SHORT VERSION
# ============================================================
def generate_short():
    styles = get_styles()
    doc = SimpleDocTemplate(os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Courte.pdf'),
        pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    el = cover_page(styles)
    
    # Login screenshot
    el += screenshot('01_login.jpeg', 'Page de connexion FSAO Iris', PAGE_W * 0.7)
    el.append(PageBreak())
    
    # Presentation + Dashboard
    el.append(Paragraph("Pr\u00e9sentation", styles['SectionTitle']))
    el.append(Paragraph(
        "FSAO Iris est une application web compl\u00e8te de gestion de maintenance industrielle (GMAO/FSAO), "
        "con\u00e7ue pour centraliser et optimiser l'ensemble des op\u00e9rations de maintenance, "
        "de production et de qualit\u00e9. Auto-h\u00e9berg\u00e9e et enrichie par l'intelligence artificielle, "
        "elle offre une solution cl\u00e9-en-main d\u00e9ployable en quelques minutes.",
        styles['BodyText2']))
    el += kpi_section(styles)
    el += screenshot('02_dashboard.jpeg', 'Tableau de bord - Vue d\'ensemble des op\u00e9rations')
    el.append(PageBreak())
    
    # Features + screenshots
    el.append(Paragraph("Fonctionnalit\u00e9s cl\u00e9s", styles['SectionTitle']))
    features = [
        ("Intelligence Artificielle (Adria)", "Assistante IA conversationnelle : cr\u00e9ation d'OT en langage naturel, analyse QHSE, maintenance pr\u00e9dictive."),
        ("Ordres de Travail", "Cr\u00e9ation, assignation, suivi complet. Pi\u00e8ces jointes, templates, g\u00e9n\u00e9ration PDF."),
        ("QR Codes \u00c9quipements", "QR codes et \u00e9tiquettes imprimables. Page d'actions rapides pour techniciens terrain."),
        ("Maintenance Pr\u00e9ventive", "Planification r\u00e9currente, calendrier Gantt, checklists, alertes automatiques."),
    ]
    for t, d in features:
        el.append(fb(t, d, styles))
    el += screenshot('06_equipments.jpeg', 'Gestion des \u00e9quipements avec filtres et arborescence')
    
    features2 = [
        ("Inventaire et Achats", "Pi\u00e8ces d\u00e9tach\u00e9es, alertes stock bas, workflow validation achats."),
        ("Surveillance et QHSE", "Plan de surveillance, presqu'accidents, rapports IA."),
        ("Communication Temps R\u00e9el", "Chat WebSocket, consignes inter-\u00e9quipes, notifications push PWA."),
        ("Dashboard Personnalisable", "Widgets custom avec formules math\u00e9matiques, cr\u00e9ation par IA."),
    ]
    for t, d in features2:
        el.append(fb(t, d, styles))
    el += screenshot('03_bell.jpeg', 'Notifications multi-badges et menu d\u00e9roulant')
    el.append(PageBreak())
    
    # Benefits
    el.append(Paragraph("B\u00e9n\u00e9fices m\u00e9tier", styles['SectionTitle']))
    for b in [
        "R\u00e9duction du temps de gestion des OT gr\u00e2ce \u00e0 l'IA",
        "Tra\u00e7abilit\u00e9 compl\u00e8te des interventions et \u00e9quipements",
        "Communication am\u00e9lior\u00e9e entre \u00e9quipes",
        "Co\u00fbts r\u00e9duits : auto-h\u00e9berg\u00e9e, pas d'abonnement SaaS",
        "QR Codes terrain pour acc\u00e9l\u00e9rer les interventions",
        "Conformit\u00e9 QHSE avec rapports automatiques",
        "Accessibilit\u00e9 mobile via PWA",
    ]:
        el.append(bullet(b, styles))
    el.append(Spacer(1, 6*mm))
    el.append(Paragraph("\u00ab FSAO Iris transforme la maintenance r\u00e9active en maintenance intelligente. \u00bb", styles['Quote']))
    el.append(PageBreak())
    
    # Deployment
    el.append(Paragraph("D\u00e9ploiement Proxmox LXC", styles['SectionTitle']))
    el.append(Paragraph(
        "FSAO Iris se d\u00e9ploie dans un container LXC Proxmox en une seule commande. "
        "Mises \u00e0 jour int\u00e9gr\u00e9es en 1 clic depuis l'interface.",
        styles['BodyText2']))
    el.append(tech_table(styles))
    el.append(Spacer(1, 6*mm))
    el.append(Paragraph("Avantages LXC", styles['SubTitle']))
    for b in [
        "Performance native, pas de couche de virtualisation",
        "Isolation s\u00e9curis\u00e9e, snapshots et sauvegardes Proxmox",
        "Ressources ajustables \u00e0 chaud (RAM, CPU, stockage)",
        "Empreinte m\u00e9moire minimale (~256 Mo au repos)",
        "Migration live entre n\u0153uds Proxmox",
    ]:
        el.append(bullet(b, styles))
    
    doc.build(el, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"[OK] Courte: {doc.filename}")


# ============================================================
# MEDIUM VERSION
# ============================================================
def generate_medium():
    styles = get_styles()
    doc = SimpleDocTemplate(os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Moyenne.pdf'),
        pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    el = cover_page(styles)
    
    # Sommaire
    el.append(Paragraph("Sommaire", styles['SectionTitle']))
    for item in ["1. Pr\u00e9sentation g\u00e9n\u00e9rale", "2. Fonctionnalit\u00e9s principales",
                 "3. Intelligence Artificielle", "4. QR Codes et mobilit\u00e9 terrain",
                 "5. Communication et collaboration", "6. B\u00e9n\u00e9fices m\u00e9tier",
                 "7. Architecture technique", "8. D\u00e9ploiement Proxmox LXC"]:
        el.append(Paragraph(item, styles['BodyText2']))
    el.append(PageBreak())
    
    # 1. Presentation
    el.append(Paragraph("1. Pr\u00e9sentation g\u00e9n\u00e9rale", styles['SectionTitle']))
    el.append(Paragraph(
        "FSAO Iris est une solution GMAO/FSAO nouvelle g\u00e9n\u00e9ration, enti\u00e8rement auto-h\u00e9berg\u00e9e, "
        "garantissant la souverainet\u00e9 de vos donn\u00e9es tout en offrant une exp\u00e9rience moderne et intuitive. "
        "L'application int\u00e8gre nativement une IA (Adria) qui automatise les t\u00e2ches r\u00e9p\u00e9titives "
        "et analyse les donn\u00e9es QHSE.", styles['BodyText2']))
    el += kpi_section(styles)
    el += screenshot('01_login.jpeg', 'Page de connexion avec version dynamique', PAGE_W * 0.65)
    el += screenshot('02_dashboard.jpeg', 'Tableau de bord - Vue d\'ensemble')
    el.append(PageBreak())
    
    # 2. Fonctionnalites
    el.append(Paragraph("2. Fonctionnalit\u00e9s principales", styles['SectionTitle']))
    modules = [
        ("Ordres de Travail", [
            "Cr\u00e9ation manuelle ou via IA en langage naturel",
            "4 statuts, 4 priorit\u00e9s, cat\u00e9gories multiples",
            "Pi\u00e8ces jointes (photos, vid\u00e9os, PDF jusqu'\u00e0 25 Mo)",
            "Templates, g\u00e9n\u00e9ration PDF, filtrage avanc\u00e9",
        ]),
        ("\u00c9quipements", [
            "Structure hi\u00e9rarchique parent/enfant, arborescence",
            "QR Codes et \u00e9tiquettes imprimables",
            "Suivi \u00e9tat op\u00e9rationnel, garanties, compteurs",
        ]),
        ("Maintenance Pr\u00e9ventive", [
            "Planification r\u00e9currente, calendrier Gantt",
            "Checklists, alertes, ex\u00e9cution imm\u00e9diate",
        ]),
        ("Inventaire et Achats", [
            "Pi\u00e8ces d\u00e9tach\u00e9es, alertes stock bas",
            "Demandes d'achat avec validation hi\u00e9rarchique",
        ]),
    ]
    for title, items in modules:
        el.append(Paragraph(title, styles['SubTitle']))
        for i in items:
            el.append(bullet(i, styles))
    el += screenshot('05_workorders.jpeg', 'Ordres de travail - Filtrage par statut et p\u00e9riode')
    el += screenshot('06_equipments.jpeg', '\u00c9quipements - Vue liste avec \u00e9tat op\u00e9rationnel')
    el.append(PageBreak())
    
    # 3. IA
    el.append(Paragraph("3. Intelligence Artificielle", styles['SectionTitle']))
    el.append(Paragraph(
        "L'IA est au c\u0153ur de FSAO Iris. L'assistante Adria comprend le langage naturel et "
        "interagit avec l'ensemble des donn\u00e9es.", styles['BodyText2']))
    for t, d in [
        ("Adria - Assistante IA", "Cr\u00e9ation, modification et cl\u00f4ture d'OT en langage naturel. Auto-assignation, widgets dashboard, automatisations."),
        ("Analyse QHSE", "Non-conformit\u00e9s, causes racines (5 Pourquoi + Ishikawa), rapport synth\u00e8se automatique."),
        ("Maintenance Pr\u00e9dictive", "Checklists depuis documents constructeur, d\u00e9tection anomalies capteurs."),
    ]:
        el.append(fb(t, d, styles))
    el.append(PageBreak())
    
    # 4. QR Codes
    el.append(Paragraph("4. QR Codes et mobilit\u00e9 terrain", styles['SectionTitle']))
    el.append(Paragraph(
        "Chaque \u00e9quipement dispose d'un QR code unique. Le scan ouvre une page d'actions rapides.", styles['BodyText2']))
    for f in [
        "G\u00e9n\u00e9ration de QR codes et \u00e9tiquettes imprimables",
        "Page publique : informations \u00e9quipement + actions configurables",
        "Actions rapides : cr\u00e9er un OT, signaler, demander une intervention",
        "Administration des actions depuis les param\u00e8tres",
    ]:
        el.append(bullet(f, styles))
    el.append(Paragraph("Application Mobile (PWA)", styles['SubTitle']))
    for f in ["Installation sur l'\u00e9cran d'accueil", "Notifications push navigateur", "Interface responsive mobile/tablette"]:
        el.append(bullet(f, styles))
    el += screenshot('07_preventive.jpeg', 'Maintenance pr\u00e9ventive - Planification et suivi')
    el.append(PageBreak())
    
    # 5. Communication
    el.append(Paragraph("5. Communication et collaboration", styles['SectionTitle']))
    for t, d in [
        ("Chat en temps r\u00e9el", "Messagerie WebSocket avec fichiers joints."),
        ("Consignes inter-\u00e9quipes", "Transmission avec acquittement."),
        ("Notifications intelligentes", "Cloche multi-badges (OT, am\u00e9liorations, pr\u00e9ventif) avec menu d\u00e9roulant."),
        ("Journal des modifications", "Syst\u00e8me 'Quoi de neuf ?' avec feedback et badge NEW."),
    ]:
        el.append(fb(t, d, styles))
    el += screenshot('09_chat.jpeg', 'Chat Live - Messagerie temps r\u00e9el WebSocket')
    el += screenshot('03_bell.jpeg', 'Cloche multi-badges avec menu d\u00e9roulant')
    el.append(PageBreak())
    
    # 6. Benefits
    el.append(Paragraph("6. B\u00e9n\u00e9fices m\u00e9tier", styles['SectionTitle']))
    for cat, items in [
        ("Pour la Direction", [
            "Vision globale, rapports automatiques, conformit\u00e9 QHSE",
            "Pas d'abonnement SaaS : donn\u00e9es souveraines",
        ]),
        ("Pour les Techniciens", [
            "IA conversationnelle, QR codes terrain, app mobile PWA",
            "Notifications push, historique interventions",
        ]),
        ("Pour la Qualit\u00e9/QHSE", [
            "Analyse IA des non-conformit\u00e9s et presqu'accidents",
            "Plan de surveillance, tra\u00e7abilit\u00e9 compl\u00e8te",
        ]),
    ]:
        el.append(Paragraph(cat, styles['SubTitle']))
        for i in items:
            el.append(bullet(i, styles))
    el += screenshot('08_inventory.jpeg', 'Inventaire - Gestion des pi\u00e8ces et fournitures')
    el.append(PageBreak())
    
    # 7. Architecture
    el.append(Paragraph("7. Architecture technique", styles['SectionTitle']))
    el.append(tech_table(styles))
    el.append(PageBreak())
    
    # 8. Deployment
    el.append(Paragraph("8. D\u00e9ploiement Proxmox LXC", styles['SectionTitle']))
    el.append(Paragraph(
        "Installation en une commande dans un container LXC Proxmox. Mises \u00e0 jour en 1 clic.", styles['BodyText2']))
    for t, d in [
        ("Performance native", "Pas de couche de virtualisation, performances identiques \u00e0 un serveur physique."),
        ("Isolation s\u00e9curis\u00e9e", "Namespaces et cgroups Linux, cloisonnement complet."),
        ("Sauvegardes Proxmox", "Snapshots, vzdump, migration live entre n\u0153uds."),
        ("Empreinte l\u00e9g\u00e8re", "~256 Mo RAM au repos, ressources ajustables \u00e0 chaud."),
    ]:
        el.append(fb(t, d, styles))
    el += screenshot('10_demandes.jpeg', 'Demandes d\'intervention - Interface de gestion')
    el.append(Spacer(1, 8*mm))
    el.append(Paragraph("Iris - Version 1.8.0 - Mars 2026", styles['CoverSubtitle']))
    
    doc.build(el, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"[OK] Moyenne: {doc.filename}")


# ============================================================
# LONG VERSION
# ============================================================
def generate_long():
    styles = get_styles()
    doc = SimpleDocTemplate(os.path.join(OUTPUT_DIR, 'IRIS_Presentation_Complete.pdf'),
        pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    
    el = cover_page(styles)
    el += screenshot('01_login.jpeg', 'Page de connexion FSAO Iris', PAGE_W * 0.65)
    el.append(PageBreak())
    
    # Sommaire
    el.append(Paragraph("Sommaire", styles['SectionTitle']))
    for item in [
        "1. Pr\u00e9sentation g\u00e9n\u00e9rale", "2. Intelligence Artificielle",
        "3. Ordres de Travail", "4. \u00c9quipements et QR Codes",
        "5. Maintenance Pr\u00e9ventive", "6. Inventaire, Achats et Fournisseurs",
        "7. Surveillance, QHSE et Presqu'accidents", "8. M.E.S. - Suivi de Production",
        "9. Communication et Collaboration", "10. Rapports et Analytics",
        "11. Application Mobile (PWA)", "12. Import/Export et Sauvegardes",
        "13. Administration et S\u00e9curit\u00e9", "14. Architecture Technique",
        "15. D\u00e9ploiement Proxmox LXC", "16. Support et \u00c9volutions",
    ]:
        el.append(Paragraph(item, styles['BodyText2']))
    el.append(PageBreak())
    
    # 1. Presentation
    el.append(Paragraph("1. Pr\u00e9sentation g\u00e9n\u00e9rale", styles['SectionTitle']))
    el.append(Paragraph(
        "FSAO Iris (Fonctionnement des Services Assist\u00e9 par Ordinateur) est une application web "
        "full-stack de gestion de maintenance industrielle. Enti\u00e8rement auto-h\u00e9berg\u00e9e, elle "
        "garantit la souverainet\u00e9 de vos donn\u00e9es. L'IA int\u00e9gr\u00e9e (Adria) automatise les t\u00e2ches "
        "et analyse les donn\u00e9es QHSE.", styles['BodyText2']))
    el += kpi_section(styles)
    el += screenshot('02_dashboard.jpeg', 'Tableau de bord - Vue d\'ensemble des op\u00e9rations')
    el.append(Paragraph("Public cible", styles['SubTitle']))
    for t, d in [
        ("Direction", "Vision globale, KPIs, rapports automatiques"),
        ("Responsables maintenance", "Planification, suivi OT, inventaire"),
        ("Techniciens terrain", "App mobile, QR codes, IA conversationnelle"),
        ("QHSE", "Presqu'accidents, plan de surveillance, rapports IA"),
    ]:
        el.append(fb(t, d, styles))
    el.append(PageBreak())
    
    # 2. IA
    el.append(Paragraph("2. Intelligence Artificielle", styles['SectionTitle']))
    el.append(Paragraph("L'IA est int\u00e9gr\u00e9e \u00e0 chaque niveau de FSAO Iris.", styles['BodyText2']))
    el.append(Paragraph("Adria - Assistante conversationnelle", styles['SubTitle']))
    for f in [
        "Cr\u00e9ation d'ordres de travail en langage naturel",
        "Modification et cl\u00f4ture d'OT (statut, priorit\u00e9, assignation)",
        "Auto-assignation intelligente, d\u00e9duction de stock",
        "Cr\u00e9ation de widgets dashboard personnalis\u00e9s",
        "Automatisations configur\u00e9es en langage naturel",
    ]:
        el.append(bullet(f, styles))
    el.append(Paragraph("IA - Checklists et Maintenance", styles['SubTitle']))
    for f in [
        "G\u00e9n\u00e9ration de checklists depuis documents techniques",
        "Programmes de maintenance depuis documentation constructeur",
        "D\u00e9tection patterns non-conformit\u00e9s r\u00e9currents",
    ]:
        el.append(bullet(f, styles))
    el.append(Paragraph("IA - QHSE et Presqu'accidents", styles['SubTitle']))
    for f in [
        "Analyse causes racines (5 Pourquoi + Ishikawa)",
        "D\u00e9tection incidents similaires, tendances",
        "Rapport synth\u00e8se QHSE (KPIs, plan d'action, risques)",
    ]:
        el.append(bullet(f, styles))
    el.append(PageBreak())
    
    # 3. OT
    el.append(Paragraph("3. Ordres de Travail", styles['SectionTitle']))
    for f in [
        "Cr\u00e9ation manuelle ou via IA", "4 statuts : Ouvert, En attente, En cours, Termin\u00e9",
        "Pi\u00e8ces jointes multiples jusqu'\u00e0 25 Mo", "Templates r\u00e9utilisables, g\u00e9n\u00e9ration PDF",
        "Suivi temps (estim\u00e9 vs r\u00e9el), pi\u00e8ces utilis\u00e9es",
        "Filtrage avanc\u00e9 multi-crit\u00e8res",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('05_workorders.jpeg', 'Ordres de travail - Interface de gestion compl\u00e8te')
    el.append(PageBreak())
    
    # 4. Equipements + QR
    el.append(Paragraph("4. \u00c9quipements et QR Codes", styles['SectionTitle']))
    el.append(Paragraph("\u00c9quipements", styles['SubTitle']))
    for f in [
        "Inventaire complet, structure hi\u00e9rarchique parent/enfant",
        "Vues liste et arborescence", "\u00c9tat op\u00e9rationnel, garanties, compteurs",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('06_equipments.jpeg', '\u00c9quipements - Vue liste avec filtres et arborescence')
    el.append(Paragraph("QR Codes", styles['SubTitle']))
    el.append(Paragraph(
        "Chaque \u00e9quipement peut disposer d'un QR code unique. Le scan ouvre une page d'actions rapides.", styles['BodyText2']))
    for f in [
        "G\u00e9n\u00e9ration QR codes et \u00e9tiquettes imprimables (PNG)",
        "Page publique : informations \u00e9quipement + actions configurables",
        "Actions : cr\u00e9er un OT, signaler, demander une intervention",
        "Administration des actions depuis Param\u00e8tres > Actions QR",
    ]:
        el.append(bullet(f, styles))
    el.append(PageBreak())
    
    # 5. Maintenance Preventive
    el.append(Paragraph("5. Maintenance Pr\u00e9ventive", styles['SectionTitle']))
    for f in [
        "Planification r\u00e9currente (hebdo, mensuel, trimestriel, annuel)",
        "Calendrier Gantt, checklists d\u00e9taill\u00e9es",
        "Alertes automatiques, ex\u00e9cution imm\u00e9diate",
        "G\u00e9n\u00e9ration IA depuis documents constructeur",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('07_preventive.jpeg', 'Maintenance pr\u00e9ventive - Planification et suivi')
    
    # 6. Inventaire
    el.append(Paragraph("6. Inventaire, Achats et Fournisseurs", styles['SectionTitle']))
    for f in [
        "Pi\u00e8ces d\u00e9tach\u00e9es, alertes stock bas", "D\u00e9duction automatique du stock \u00e0 la cl\u00f4ture d'OT",
        "Fournisseurs avec historique", "Demandes d'achat avec validation hi\u00e9rarchique",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('08_inventory.jpeg', 'Inventaire - Gestion des pi\u00e8ces et fournitures')
    el.append(PageBreak())
    
    # 7. Surveillance
    el.append(Paragraph("7. Surveillance, QHSE et Presqu'accidents", styles['SectionTitle']))
    for f in [
        "Plan de surveillance avec contr\u00f4les p\u00e9riodiques",
        "Correspondance IA des rapports de contr\u00f4le",
        "Presqu'accidents : formulaire enrichi 7 sections",
        "Analyse IA : 5 Pourquoi + Ishikawa + tendances",
        "Export PDF et Excel",
    ]:
        el.append(bullet(f, styles))
    
    # 8. MES
    el.append(Paragraph("8. M.E.S. - Suivi de Production", styles['SectionTitle']))
    for f in ["Suivi production temps r\u00e9el", "Calcul cadence automatique", "Int\u00e9gration cam\u00e9ras", "Rapports planifi\u00e9s"]:
        el.append(bullet(f, styles))
    el.append(PageBreak())
    
    # 9. Communication
    el.append(Paragraph("9. Communication et Collaboration", styles['SectionTitle']))
    for f in [
        "Chat WebSocket temps r\u00e9el avec fichiers joints",
        "Tableau d'affichage collaboratif (Whiteboard)",
        "Consignes inter-\u00e9quipes avec acquittement",
        "Cloche multi-badges : OT (rouge), am\u00e9liorations (violet), pr\u00e9ventif (\u00e9chu, vert)",
        "Journal des modifications ('Quoi de neuf ?') avec feedback",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('09_chat.jpeg', 'Chat Live - Messagerie temps r\u00e9el')
    el += screenshot('03_bell.jpeg', 'Cloche multi-badges avec menu d\u00e9roulant d\'acc\u00e8s rapide')
    el.append(PageBreak())
    
    # 10. Rapports
    el.append(Paragraph("10. Rapports et Analytics", styles['SectionTitle']))
    for f in [
        "Dashboard personnalisable avec widgets custom",
        "Formules math\u00e9matiques pour KPIs", "Exports PDF, Excel, CSV",
        "Rapports hebdomadaires par email", "Rapport QHSE g\u00e9n\u00e9r\u00e9 par IA",
    ]:
        el.append(bullet(f, styles))
    
    # 11. PWA
    el.append(Paragraph("11. Application Mobile (PWA)", styles['SectionTitle']))
    for f in [
        "Installation \u00e9cran d'accueil (Android/iOS)",
        "Notifications push (VAPID)", "Interface responsive",
        "Cache Service Worker, mise \u00e0 jour automatique",
    ]:
        el.append(bullet(f, styles))
    
    # 12. Import/Export
    el.append(Paragraph("12. Import/Export et Sauvegardes", styles['SectionTitle']))
    for f in [
        "63 modules import/export (12 cat\u00e9gories)",
        "Export ZIP complet (data.xlsx + fichiers)",
        "Sauvegardes planifi\u00e9es (local et/ou Google Drive)",
        "Nettoyage automatique, v\u00e9rification int\u00e9grit\u00e9",
    ]:
        el.append(bullet(f, styles))
    el.append(PageBreak())
    
    # 13. Admin
    el.append(Paragraph("13. Administration et S\u00e9curit\u00e9", styles['SectionTitle']))
    for f in [
        "3 r\u00f4les : Administrateur, Technicien, Visualiseur",
        "Permissions granulaires par module",
        "Journal d'activit\u00e9 complet (audit log)",
        "Acc\u00e8s SSH distant, Tailscale int\u00e9gr\u00e9",
        "Visite guid\u00e9e personnalis\u00e9e par profil",
    ]:
        el.append(bullet(f, styles))
    el += screenshot('10_demandes.jpeg', 'Demandes d\'intervention - Interface compl\u00e8te')
    
    # 14. Architecture
    el.append(Paragraph("14. Architecture Technique", styles['SectionTitle']))
    el.append(tech_table(styles))
    el.append(PageBreak())
    
    # 15. Deployment
    el.append(Paragraph("15. D\u00e9ploiement Proxmox LXC", styles['SectionTitle']))
    el.append(Paragraph(
        "Installation en une commande. Le script cr\u00e9e le container Debian 12 et installe tout.", styles['BodyText2']))
    for t, d in [
        ("Performance native", "Pas de virtualisation. Performances d'un serveur physique."),
        ("Isolation s\u00e9curis\u00e9e", "Namespaces et cgroups Linux."),
        ("Gestion des ressources", "RAM, CPU, stockage ajustables \u00e0 chaud."),
        ("Sauvegardes Proxmox", "Snapshots, vzdump, migration live."),
        ("Empreinte l\u00e9g\u00e8re", "~256 Mo RAM au repos."),
        ("Mises \u00e0 jour", "Int\u00e9gr\u00e9es : 1 clic depuis l'interface, rollback automatique."),
    ]:
        el.append(fb(t, d, styles))
    el.append(PageBreak())
    
    # 16. Support
    el.append(Paragraph("16. Support et \u00c9volutions", styles['SectionTitle']))
    for f in [
        "Manuel int\u00e9gr\u00e9 (41 chapitres)", "API Swagger (/docs)",
        "Visite guid\u00e9e par profil", "Journal des modifications avec feedback",
        "Int\u00e9grations : MQTT, Google Drive, SMTP, Tailscale, VAPID, Expo",
    ]:
        el.append(bullet(f, styles))
    el.append(Spacer(1, 10*mm))
    el.append(HRFlowable(width="80%", thickness=1, color=IRIS_BLUE, spaceBefore=6*mm, spaceAfter=6*mm, hAlign='CENTER'))
    el.append(Paragraph("\u00ab FSAO Iris : la GMAO intelligente, souveraine et accessible. \u00bb", styles['Quote']))
    el.append(Paragraph("Iris - Version 1.8.0 - Mars 2026", styles['CoverSubtitle']))
    
    doc.build(el, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"[OK] Complete: {doc.filename}")


if __name__ == '__main__':
    generate_short()
    generate_medium()
    generate_long()
    print(f"\n3 PDFs generes dans {OUTPUT_DIR}/")
