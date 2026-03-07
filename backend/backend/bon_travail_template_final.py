"""
Template HTML pour la génération du PDF Bon de Travail
Basé EXACTEMENT sur le prompt détaillé de l'utilisateur
Utilise les valeurs du formulaire JSX (formData)
"""

def generate_bon_travail_html(bon):
    """
    Génère le HTML du bon de travail selon le prompt utilisateur détaillé
    """
    
    # Extraction des données
    date_engagement = bon.get('date_engagement', '')[:10] if bon.get('date_engagement') else ''
    
    # Fonction helper pour générer les checkboxes
    def checkbox(label, checked_list, value):
        checked = value in (checked_list or [])
        check_mark = '✓' if checked else ''
        return f'<div class="checkbox-item"><span class="checkbox {"checked" if checked else ""}">{check_mark}</span> {label}</div>'
    
    # LISTES DU FORMULAIRE JSX (PAS DU DOCX)
    risques_materiel_list = ['Chute plain pied', 'Chute en hauteur', 'Manutention', 'Matériel en rotation', 'Electricité', 'Circulation engin']
    risques_autorisation_list = ['Point chaud', 'Espace confiné']
    risques_produits_list = ['Toxique', 'Inflammable', 'Corrosif', 'Irritant', 'CMR']
    risques_environnement_list = ['Co-activité', 'Passage chariot', 'Zone piétonne', 'Zone ATEX']
    
    precautions_materiel_list = ['Echafaudage', 'Nacelle', 'Harnais', 'Ligne vie', 'Consignation', 'Déconsignation']
    precautions_epi_list = ['Casque', 'Lunettes', 'Gants', 'Chaussures S3', 'Masque', 'Bouchons oreilles', 'Gilet HV']
    precautions_environnement_list = ['Balisage', 'Signalisation', 'Permis feu', 'Ventilation']
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bon de travail - MAINT_FE_004_V02</title>
    <style>
        @page {{
            size: A4;
            margin: 20mm 15mm;
        }}
        
        * {{
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Calibri', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
        }}
        
        /* 1. EN-TÊTE SUR UNE LIGNE */
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
        }}
        
        .header-left {{
            font-size: 18pt;
            font-weight: bold;
        }}
        
        .header-right {{
            font-size: 10pt;
            font-weight: bold;
        }}
        
        /* 2. INTRODUCTION */
        .intro {{
            text-align: justify;
            font-size: 10pt;
            line-height: 1.4;
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ccc;
        }}
        
        /* 3. SECTIONS */
        .section {{
            margin: 20px 0;
        }}
        
        .section-title {{
            font-weight: bold;
            font-size: 12pt;
            text-decoration: underline;
            margin-bottom: 12px;
        }}
        
        .subsection-title {{
            font-weight: bold;
            font-size: 10pt;
            margin: 12px 0 6px 0;
        }}
        
        /* CHAMPS DE FORMULAIRE */
        .field {{
            margin: 6px 0;
            line-height: 1.6;
        }}
        
        .field-label {{
            font-weight: bold;
        }}
        
        .field-value {{
            display: inline;
            border-bottom: 1px dotted #666;
            min-width: 200px;
            padding: 0 3px;
        }}
        
        /* CHECKBOXES */
        .checkbox-group {{
            margin: 8px 0 12px 0;
        }}
        
        .checkbox-item {{
            margin: 4px 0;
            padding-left: 5px;
            display: flex;
            align-items: flex-start;
        }}
        
        .checkbox {{
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #000;
            margin-right: 8px;
            margin-top: 2px;
            text-align: center;
            line-height: 11px;
            font-size: 11px;
            font-weight: bold;
            flex-shrink: 0;
        }}
        
        .checkbox.checked {{
            background-color: #000;
            color: white;
        }}
        
        /* NOTE OBLIGATOIRE */
        .note {{
            margin: 12px 0;
            padding: 10px;
            background-color: #fff8dc;
            border-left: 4px solid #ffa500;
            font-size: 10pt;
            font-style: italic;
        }}
        
        /* ENGAGEMENT */
        .engagement {{
            margin: 20px 0;
            padding: 12px;
            border: 2px solid #000;
            background-color: #f9f9f9;
        }}
        
        .engagement-title {{
            font-weight: bold;
            font-size: 12pt;
            text-decoration: underline;
            margin-bottom: 10px;
        }}
        
        /* TABLE DES SIGNATURES */
        .signature-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        
        .signature-table th {{
            border: 2px solid #000;
            padding: 10px;
            background-color: #d0d0d0;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
        }}
        
        .signature-table td {{
            border: 2px solid #000;
            padding: 15px;
            min-height: 70px;
            vertical-align: top;
            text-align: center;
        }}
        
        /* PIED DE PAGE */
        .footer {{
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #000;
            font-size: 9pt;
            font-style: italic;
            text-align: center;
        }}
        
        @media print {{
            body {{ margin: 0; }}
        }}
    </style>
</head>
<body>
    <!-- 1. EN-TÊTE SUR UNE LIGNE -->
    <div class="header">
        <div class="header-left">Bon de travail</div>
        <div class="header-right">MAINT_FE_004_V02</div>
    </div>
    
    <!-- 2. PARAGRAPHE D'INTRODUCTION -->
    <div class="intro">
        Le bon de travail, permet d'identifier les risques liés aux travaux spécifiés ci-dessous ainsi que les précautions à prendre pour éviter tout accident, dégât matériel ou atteinte à l'environnement. Ce bon de travail tient lieu de plan de prévention. Sauf contre-indication particulière (ou modification des conditions d'intervention), le bon de travail est valable pour toute la durée du chantier (dans la limite de 24 heures).
    </div>
    
    <!-- 3. SECTION: TRAVAUX À RÉALISER -->
    <div class="section">
        <div class="section-title">Travaux à réaliser</div>
        
        <div class="field">
            <span class="field-label">Localisation / Ligne :</span>
            <span class="field-value">{bon.get('localisation_ligne', '')}</span>
        </div>
        
        <div class="field">
            <span class="field-label">Description :</span>
            <span class="field-value">{bon.get('description_travaux', '')}</span>
        </div>
        
        <div class="field">
            <span class="field-label">Nom des intervenants :</span>
            <span class="field-value">{bon.get('nom_intervenants', '')}</span>
        </div>
        
        <div class="field">
            <span class="field-label">Titre :</span>
            <span class="field-value">{bon.get('titre', '')}</span>
        </div>
        
        <div class="field">
            <span class="field-label">Entreprise :</span>
            <span class="field-value">{bon.get('entreprise', '')}</span>
        </div>
    </div>
    
    <!-- 4. SECTION: RISQUES IDENTIFIÉS -->
    <div class="section">
        <div class="section-title">Risques Identifiés</div>
        
        <!-- Sous-section 1: Matériel/Infrastructures -->
        <div class="subsection-title">Intervention sur du matériel ou des infrastructures :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('risques_materiel', []), label) for label in risques_materiel_list])}
            <div class="field" style="margin-top: 8px;">
                <span class="field-label">Autre (préciser) :</span>
                <span class="field-value">{bon.get('risques_materiel_autre', '')}</span>
            </div>
        </div>
        
        <!-- Sous-section 2: Autorisation -->
        <div class="subsection-title">Travaux nécessitant une autorisation particulière :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('risques_autorisation', []), label) for label in risques_autorisation_list])}
        </div>
        
        <!-- Sous-section 3: Produits -->
        <div class="subsection-title">Produits dangereux :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('risques_produits', []), label) for label in risques_produits_list])}
        </div>
        
        <!-- Sous-section 4: Environnement -->
        <div class="subsection-title">Environnement des travaux nécessitant une attention particulière :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('risques_environnement', []), label) for label in risques_environnement_list])}
            <div class="field" style="margin-top: 8px;">
                <span class="field-label">Autre (préciser) :</span>
                <span class="field-value">{bon.get('risques_environnement_autre', '')}</span>
            </div>
        </div>
    </div>
    
    <!-- 5. SECTION: PRÉCAUTIONS À PRENDRE -->
    <div class="section">
        <div class="section-title">Précautions à Prendre</div>
        
        <!-- Sous-section 1: Matériel -->
        <div class="subsection-title">Sur le matériel ou les infrastructures :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('precautions_materiel', []), label) for label in precautions_materiel_list])}
            <div class="field" style="margin-top: 8px;">
                <span class="field-label">Autre (préciser) :</span>
                <span class="field-value">{bon.get('precautions_materiel_autre', '')}</span>
            </div>
        </div>
        
        <!-- NOTE OBLIGATOIRE -->
        <div class="note">
            L'utilisation d'un chariot ou d'une nacelle n'est possible qu'après que l'entreprise intervenante ait fourni à IRIS une autorisation nominative de conduite.
        </div>
        
        <!-- Sous-section 2: EPI -->
        <div class="subsection-title">Sur les hommes, le matériel ou l'environnement :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('precautions_epi', []), label) for label in precautions_epi_list])}
            <div class="field" style="margin-top: 8px;">
                <span class="field-label">Autre (préciser) :</span>
                <span class="field-value">{bon.get('precautions_epi_autre', '')}</span>
            </div>
        </div>
        
        <!-- Sous-section 3: Environnement -->
        <div class="subsection-title">Sur l'environnement des travaux :</div>
        <div class="checkbox-group">
            {''.join([checkbox(label, bon.get('precautions_environnement', []), label) for label in precautions_environnement_list])}
            <div class="field" style="margin-top: 8px;">
                <span class="field-label">Autre (préciser) :</span>
                <span class="field-value">{bon.get('precautions_environnement_autre', '')}</span>
            </div>
        </div>
    </div>
    
    <!-- 6. SECTION: ENGAGEMENT -->
    <div class="engagement">
        <div class="engagement-title">Engagement</div>
        <p style="margin: 0; text-align: justify;">
            Le représentant de l'entreprise intervenante reconnaît avoir pris connaissance des risques liés aux travaux qui lui sont confiés et s'engage à appliquer et faire appliquer les mesures de précaution qui lui ont été notifiées.
        </p>
    </div>
    
    <!-- 7. SECTION: TABLE DES SIGNATURES -->
    <table class="signature-table">
        <tr>
            <th>Date</th>
            <th>Nom et visa du demandeur</th>
            <th>Nom et visa du représentant de l'intervenant</th>
        </tr>
        <tr>
            <td>{date_engagement}</td>
            <td>{bon.get('nom_agent_maitrise', '')}</td>
            <td>{bon.get('nom_representant', '')}</td>
        </tr>
    </table>
    
    <!-- 8. PIED DE PAGE -->
    <div class="footer">
        Remettre une copie à l'intervenant – Archivage Direction du site
    </div>
</body>
</html>
    """
    
    return html_content
