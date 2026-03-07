#!/usr/bin/env python3
"""
Generateur de PDF a partir du README.md avec captures d'ecran
Style similaire aux presentations IRIS existantes
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Colors
IRIS_BLUE = HexColor('#2563EB')
IRIS_DARK = HexColor('#1E293B')
IRIS_GRAY = HexColor('#64748B')
IRIS_LIGHT = HexColor('#F1F5F9')
CODE_BG = HexColor('#F8FAFC')

LOGO_PATH = '/app/frontend/public/logo-iris.png'
SC = '/app/presentations/screenshots'
OUTPUT_DIR = '/app/presentations'
PAGE_W = A4[0] - 40*mm
README_PATH = '/app/README.md'

os.makedirs(OUTPUT_DIR, exist_ok=True)

try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
    FONT, FONT_BOLD, FONT_MONO = 'DejaVu', 'DejaVuBold', 'DejaVuMono'
except Exception:
    FONT, FONT_BOLD, FONT_MONO = 'Helvetica', 'Helvetica-Bold', 'Courier'


def get_styles():
    styles = getSampleStyleSheet()
    defs = [
        ('CoverTitle', FONT_BOLD, 32, IRIS_DARK, TA_CENTER, 8*mm, 38),
        ('CoverSubtitle', FONT, 14, IRIS_GRAY, TA_CENTER, 4*mm, 18),
        ('H1', FONT_BOLD, 20, IRIS_BLUE, None, 6*mm, 26),
        ('H2', FONT_BOLD, 15, IRIS_DARK, None, 4*mm, 20),
        ('H3', FONT_BOLD, 12, HexColor('#475569'), None, 3*mm, 16),
        ('H4', FONT_BOLD, 10, HexColor('#64748B'), None, 2*mm, 14),
        ('Body', FONT, 9.5, IRIS_DARK, TA_JUSTIFY, 2.5*mm, 14),
        ('BulletItem', FONT, 9.5, IRIS_DARK, None, 1.5*mm, 14),
        ('CodeBlock', FONT_MONO, 8, HexColor('#334155'), TA_LEFT, 3*mm, 11),
        ('Caption', FONT, 8, IRIS_GRAY, TA_CENTER, 2*mm, 10),
        ('TableHeader', FONT_BOLD, 9, white, TA_LEFT, 0, 12),
        ('TableCell', FONT, 8.5, IRIS_DARK, TA_LEFT, 0, 12),
    ]
    for name, font, size, color, align, space, lead in defs:
        kw = dict(fontName=font, fontSize=size, textColor=color, spaceAfter=space, leading=lead)
        if align:
            kw['alignment'] = align
        if name == 'H1':
            kw['spaceBefore'] = 10*mm
        if name in ('H2', 'H3'):
            kw['spaceBefore'] = 5*mm
        if name == 'H4':
            kw['spaceBefore'] = 3*mm
        if name == 'BulletItem':
            kw['leftIndent'] = 15
            kw['bulletIndent'] = 5
        if name == 'CodeBlock':
            kw['leftIndent'] = 10
            kw['backColor'] = CODE_BG
        styles.add(ParagraphStyle(name=name, **kw))
    return styles


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(IRIS_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, A4[0] - 20*mm, 15*mm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(IRIS_GRAY)
    canvas.drawString(20*mm, 10*mm, "FSAO Iris - Documentation README")
    canvas.drawRightString(A4[0] - 20*mm, 10*mm, f"Page {doc.page}")
    canvas.restoreState()


def add_screenshot(path, caption, width=None):
    """Add screenshot if it exists."""
    full = os.path.join(SC, path)
    if not os.path.exists(full):
        return []
    styles = get_styles()
    w = width or PAGE_W * 0.85
    img = Image(full, width=w, height=w * 0.42)
    img.hAlign = 'CENTER'
    return [Spacer(1, 3*mm), img, Paragraph(caption, styles['Caption']), Spacer(1, 3*mm)]


# Screenshot mapping: section keywords -> (filename, caption)
SCREENSHOTS = {
    'presentation': ('02_dashboard.jpeg', "Tableau de bord principal FSAO Iris"),
    'ordres de travail': ('05_workorders.jpeg', "Ordres de travail - Filtrage et gestion"),
    'equipements': ('06_equipments.jpeg', "Gestion des equipements avec arborescence"),
    'maintenance preventive': ('07_preventive.jpeg', "Maintenance preventive - Planification"),
    'inventaire': ('08_inventory.jpeg', "Inventaire - Pieces et fournitures"),
    'communication': ('09_chat.jpeg', "Chat Live - Messagerie temps reel"),
    'navigation intelligente': ('03_bell.jpeg', "Notifications multi-badges et acces rapides"),
    'demandes': ('10_demandes.jpeg', "Demandes d'intervention"),
}


def cover_page(styles):
    el = [Spacer(1, 30*mm)]
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=80*mm, height=40*mm)
        logo.hAlign = 'CENTER'
        el.append(logo)
    el += [
        Spacer(1, 15*mm),
        Paragraph("FSAO Iris", styles['CoverTitle']),
        Paragraph("Documentation Technique - README", styles['CoverSubtitle']),
        Spacer(1, 8*mm),
        HRFlowable(width="60%", thickness=2, color=IRIS_BLUE, spaceBefore=4*mm, spaceAfter=8*mm, hAlign='CENTER'),
        Paragraph(
            "Application de Fonctionnement des Services Assistee par Ordinateur<br/>"
            "Complete et auto-hebergee",
            styles['CoverSubtitle']
        ),
        Spacer(1, 25*mm),
    ]
    info = Table(
        [['Version', 'Auteur', 'Derniere MAJ'], ['1.8.0', 'Greg', 'Mars 2026']],
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


def escape_html(text):
    """Escape special HTML/XML chars for reportlab Paragraph."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def parse_markdown_table(lines):
    """Parse markdown table lines into header and rows."""
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        rows.append(cells)
    if len(rows) < 2:
        return None, None
    header = rows[0]
    # Skip separator line (----)
    data = [r for r in rows[1:] if not all(c.replace('-', '').replace(':', '').strip() == '' for c in r)]
    return header, data


def build_table(header, data, styles):
    """Build a reportlab Table from parsed markdown table."""
    n_cols = len(header)
    col_w = PAGE_W / n_cols

    table_data = [[Paragraph(escape_html(h), styles['TableHeader']) for h in header]]
    for row in data:
        table_data.append([Paragraph(escape_html(c if c else ''), styles['TableCell']) for c in row[:n_cols]])

    t = Table(table_data, colWidths=[col_w]*n_cols)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), IRIS_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, IRIS_LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E2E8F0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t


def generate_readme_pdf():
    styles = get_styles()

    doc = SimpleDocTemplate(
        os.path.join(OUTPUT_DIR, 'IRIS_README_Documentation.pdf'),
        pagesize=A4, leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )

    el = cover_page(styles)

    # Login screenshot on first page
    el += add_screenshot('01_login.jpeg', "Page de connexion FSAO Iris", PAGE_W * 0.65)
    el.append(PageBreak())

    # Read README
    with open(README_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Track sections for screenshots
    current_section = ''
    in_code_block = False
    code_lines = []
    code_lang = ''
    in_table = False
    table_lines = []
    screenshots_placed = set()

    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')

        # Code blocks
        if line.strip().startswith('```'):
            if in_code_block:
                # End code block
                in_code_block = False
                if code_lines:
                    code_text = '\n'.join(code_lines)
                    # Use Preformatted for code blocks
                    el.append(Spacer(1, 2*mm))
                    code_para = Preformatted(code_text, styles['CodeBlock'])
                    el.append(code_para)
                    el.append(Spacer(1, 2*mm))
                code_lines = []
            else:
                in_code_block = True
                code_lang = line.strip()[3:].strip()
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Tables
        if '|' in line and line.strip().startswith('|'):
            if not in_table:
                in_table = True
                table_lines = []
            table_lines.append(line)
            i += 1
            continue
        else:
            if in_table:
                in_table = False
                header, data = parse_markdown_table(table_lines)
                if header and data:
                    el.append(Spacer(1, 2*mm))
                    el.append(build_table(header, data, styles))
                    el.append(Spacer(1, 3*mm))
                table_lines = []

        # Empty lines
        if not line.strip():
            el.append(Spacer(1, 2*mm))
            i += 1
            continue

        # Horizontal rules
        if line.strip() == '---':
            el.append(HRFlowable(width="100%", thickness=1, color=IRIS_LIGHT, spaceBefore=3*mm, spaceAfter=3*mm))
            i += 1
            continue

        # Headers
        if line.startswith('#'):
            hashes = 0
            for ch in line:
                if ch == '#':
                    hashes += 1
                else:
                    break
            text = line[hashes:].strip()
            text = escape_html(text)

            if hashes == 1:
                el.append(Paragraph(text, styles['H1']))
                current_section = text.lower()
            elif hashes == 2:
                el.append(Paragraph(text, styles['H1']))
                current_section = text.lower()
                # Maybe add page break before major sections
                if any(kw in current_section for kw in ['architecture', 'installation', 'configuration', 'utilisation', 'administration', 'depannage', 'collections', 'developpement']):
                    el.insert(-1, PageBreak())
            elif hashes == 3:
                el.append(Paragraph(text, styles['H2']))
                current_section = text.lower()
                # Insert screenshot if matching
                for kw, (sc_file, sc_caption) in SCREENSHOTS.items():
                    if kw in current_section and kw not in screenshots_placed:
                        sc_elements = add_screenshot(sc_file, sc_caption)
                        if sc_elements:
                            el.extend(sc_elements)
                            screenshots_placed.add(kw)
                        break
            elif hashes == 4:
                el.append(Paragraph(text, styles['H3']))
            else:
                el.append(Paragraph(text, styles['H4']))

            i += 1
            continue

        # Bullet points
        stripped = line.strip()
        if stripped.startswith('- ') or stripped.startswith('* '):
            text = stripped[2:].strip()
            # Handle bold in bullets
            text = escape_html(text)
            text = format_bold(text)
            el.append(Paragraph(f"\u2022  {text}", styles['BulletItem']))
            i += 1
            continue

        # Numbered lists
        if stripped and stripped[0].isdigit() and '.' in stripped[:4]:
            idx = stripped.index('.')
            num = stripped[:idx]
            text = stripped[idx+1:].strip()
            text = escape_html(text)
            text = format_bold(text)
            el.append(Paragraph(f"{num}.  {text}", styles['BulletItem']))
            i += 1
            continue

        # Block quotes
        if stripped.startswith('>'):
            text = stripped[1:].strip()
            text = escape_html(text)
            text = format_bold(text)
            el.append(Paragraph(f"<i>{text}</i>", styles['Body']))
            i += 1
            continue

        # Regular paragraph
        text = escape_html(stripped)
        text = format_bold(text)
        el.append(Paragraph(text, styles['Body']))
        i += 1

    # End of file: finalize any pending table
    if in_table and table_lines:
        header, data = parse_markdown_table(table_lines)
        if header and data:
            el.append(build_table(header, data, styles))

    # Final page
    el.append(Spacer(1, 15*mm))
    el.append(HRFlowable(width="80%", thickness=1, color=IRIS_BLUE, spaceBefore=6*mm, spaceAfter=6*mm, hAlign='CENTER'))
    el.append(Paragraph("FSAO Iris - Version 1.8.0 - Mars 2026", styles['CoverSubtitle']))
    el.append(Paragraph("Developpe par Greg", styles['CoverSubtitle']))

    doc.build(el, onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"[OK] README PDF: {doc.filename}")


def format_bold(text):
    """Convert **bold** markdown to <b>bold</b> for reportlab, handling already-escaped HTML."""
    import re
    # Handle **text** pattern
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Handle `code` pattern
    text = re.sub(r'`(.+?)`', r'<font face="{}" size="8">\1</font>'.format(FONT_MONO), text)
    return text


if __name__ == '__main__':
    generate_readme_pdf()
