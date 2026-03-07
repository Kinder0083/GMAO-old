"""
Template HTML pour générer le PDF d'Autorisation Particulière de Travaux
Format: MAINT_FE_003_V03
"""

def generate_autorisation_html(autorisation: dict) -> str:
    """Génère le HTML pour l'autorisation particulière - Format avec colonnes pour sections spécifiques"""
    
    # Données de l'autorisation
    numero = autorisation.get("numero", "")
    date_etablissement = autorisation.get("date_etablissement", "")
    service_demandeur = autorisation.get("service_demandeur", "")
    responsable = autorisation.get("responsable", "")
    
    # Personnel autorisé (4 entrées)
    personnel_autorise = autorisation.get("personnel_autorise", [])
    personnel_rows = ""
    for i in range(4):
        if i < len(personnel_autorise):
            nom = personnel_autorise[i].get("nom", "")
            fonction = personnel_autorise[i].get("fonction", "")
        else:
            nom = ""
            fonction = ""
        personnel_rows += f"""
            <tr>
                <td style="border: 1px solid black; padding: 4px; text-align: center; height: 25px;">{i+1}</td>
                <td style="border: 1px solid black; padding: 4px; height: 25px;">{nom}</td>
                <td style="border: 1px solid black; padding: 4px; height: 25px;">{fonction}</td>
            </tr>
        """
    
    # Types de travaux (checkboxes) - sur 2 colonnes
    type_point_chaud = "☑" if autorisation.get("type_point_chaud") else "☐"
    type_fouille = "☑" if autorisation.get("type_fouille") else "☐"
    type_espace_clos = "☑" if autorisation.get("type_espace_clos") else "☐"
    type_autre_cas = "☑" if autorisation.get("type_autre_cas") else "☐"
    
    newline = "\n"
    br_tag = "<br>"
    description_travaux = autorisation.get("description_travaux", "").replace(newline, br_tag)
    horaire_debut = autorisation.get("horaire_debut", "")
    horaire_fin = autorisation.get("horaire_fin", "")
    lieu_travaux = autorisation.get("lieu_travaux", "")
    
    risques_potentiels = autorisation.get("risques_potentiels", "").replace(newline, br_tag)
    
    # Fonction helper pour afficher les mesures de sécurité
    def format_mesure(key):
        value = autorisation.get(key, "")
        if value == "FAIT":
            return '<span style="color: green; font-weight: bold;">✓ FAIT</span>'
        elif value == "A_FAIRE":
            return '<span style="color: orange; font-weight: bold;">⚠ À FAIRE</span>'
        else:
            return '<span style="color: gray;">-</span>'
    
    # Mesures de sécurité - tableau sur 2 colonnes
    mesures_data = [
        ("CONSIGNATION MAT. OU PIÈCE EN MOUV", "mesure_consignation_materiel"),
        ("CONSIGNATION ÉLECTRIQUE", "mesure_consignation_electrique"),
        ("DÉBRANCHEMENT FORCE MOTRICE", "mesure_debranchement_force"),
        ("VIDANGE APPAREIL/TUYAUTERIE", "mesure_vidange_appareil"),
        ("DÉCONTAMINATION/LAVAGE", "mesure_decontamination"),
        ("DÉGAZAGE", "mesure_degazage"),
        ("POSE JOINT PLEIN", "mesure_pose_joint"),
        ("VENTILATION FORCÉE", "mesure_ventilation"),
        ("ZONE BALISÉE", "mesure_zone_balisee"),
        ("CANALISATIONS ÉLECTRIQUES", "mesure_canalisations_electriques"),
        ("SOUTERRAINES BALISÉES", "mesure_souterraines_balisees"),
        ("ÉGOUTS ET CÂBLES PROTÉGÉS", "mesure_egouts_cables"),
        ("TAUX D'OXYGÈNE", "mesure_taux_oxygene"),
        ("TAUX D'EXPLOSIVITÉ", "mesure_taux_explosivite"),
        ("EXPLOSIMÈTRE EN CONTINU", "mesure_explosimetre"),
        ("ÉCLAIRAGE DE SÛRETÉ", "mesure_eclairage_surete"),
        ("EXTINCTEUR TYPE", "mesure_extincteur"),
        ("AUTRES", "mesure_autres")
    ]
    
    # Diviser en 2 colonnes
    mid = (len(mesures_data) + 1) // 2
    mesures_col1 = mesures_data[:mid]
    mesures_col2 = mesures_data[mid:]
    
    mesures_rows = ""
    for i in range(max(len(mesures_col1), len(mesures_col2))):
        row = "<tr>"
        # Colonne 1
        if i < len(mesures_col1):
            label1, key1 = mesures_col1[i]
            row += f'<td style="border: 1px solid black; padding: 3px; font-size: 8pt;">{label1}</td>'
            row += f'<td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8pt; width: 80px;">{format_mesure(key1)}</td>'
        else:
            row += '<td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td>'
        
        # Colonne 2
        if i < len(mesures_col2):
            label2, key2 = mesures_col2[i]
            row += f'<td style="border: 1px solid black; padding: 3px; font-size: 8pt;">{label2}</td>'
            row += f'<td style="border: 1px solid black; padding: 3px; text-align: center; font-size: 8pt; width: 80px;">{format_mesure(key2)}</td>'
        else:
            row += '<td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td>'
        
        row += "</tr>"
        mesures_rows += row
    
    mesures_securite_texte = autorisation.get("mesures_securite_texte", "").replace(newline, br_tag)
    
    # EPI (checkboxes) - sur 3 colonnes
    epi_data = [
        ("epi_visiere", "VISIÈRE"),
        ("epi_tenue_impermeable", "TENUE IMPERMÉABLE, BOTTES"),
        ("epi_cagoule_air", "CAGOULE AIR RESPIRABLE/ART"),
        ("epi_masque", "MASQUE TYPE"),
        ("epi_gant", "GANT TYPE"),
        ("epi_harnais", "HARNAIS DE SÉCURITÉ"),
        ("epi_outillage_anti_etincelle", "OUTILLAGE ANTI-ÉTINCELLE"),
        ("epi_presence_surveillant", "PRÉSENCE D'UN SURVEILLANT"),
        ("epi_autres", "AUTRES")
    ]
    
    epi_rows = ""
    for i in range(0, len(epi_data), 3):
        row = "<tr>"
        for j in range(3):
            if i + j < len(epi_data):
                key, label = epi_data[i + j]
                checked = "☑" if autorisation.get(key) else "☐"
                row += f'<td style="border: 1px solid black; padding: 4px; font-size: 9pt;"><span style="font-size: 11pt;">{checked}</span> {label}</td>'
            else:
                row += '<td style="border: 1px solid black;"></td>'
        row += "</tr>"
        epi_rows += row
    
    equipements_protection_texte = autorisation.get("equipements_protection_texte", "").replace(newline, br_tag)
    
    signature_demandeur = autorisation.get("signature_demandeur", "")
    date_signature_demandeur = autorisation.get("date_signature_demandeur", "")
    signature_responsable_securite = autorisation.get("signature_responsable_securite", "")
    date_signature_responsable = autorisation.get("date_signature_responsable", "")
    
    html = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Autorisation Particulière N°{numero}</title>
    <style>
        @page {{
            size: A4;
            margin: 12mm;
        }}
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
        }}
        .container {{
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }}
        .header-right {{
            text-align: right;
            font-size: 8pt;
        }}
        h1 {{
            text-align: center;
            font-size: 13pt;
            font-weight: bold;
            margin: 8px 0;
            text-transform: uppercase;
        }}
        .ref-box {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            border: 2px solid #000;
            padding: 5px;
            background: #f0f0f0;
        }}
        .ref-item {{
            font-size: 9pt;
            font-weight: bold;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }}
        th {{
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 4px;
            font-weight: bold;
            text-align: left;
            font-size: 9pt;
        }}
        td {{
            border: 1px solid #000;
            padding: 4px;
            font-size: 9pt;
        }}
        .section-title {{
            background-color: #c0c0c0;
            border: 1px solid #000;
            padding: 4px;
            font-weight: bold;
            margin-top: 6px;
            font-size: 10pt;
        }}
        .textarea-field {{
            min-height: 50px;
            vertical-align: top;
        }}
        .signature-section {{
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }}
        .signature-box {{
            width: 48%;
            border: 1px solid #000;
            padding: 8px;
        }}
        .signature-title {{
            font-weight: bold;
            margin-bottom: 8px;
            text-align: center;
        }}
        .signature-line {{
            margin-top: 30px;
            border-top: 1px solid #000;
            padding-top: 4px;
            font-size: 8pt;
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div>
                <div style="width: 100px; height: 50px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #666;">
                    LOGO
                </div>
            </div>
            <div class="header-right">
                <div><strong>Référence :</strong> MAINT_FE_003</div>
                <div><strong>Révision :</strong> V03</div>
                <div><strong>Date :</strong> {date_etablissement}</div>
            </div>
        </div>

        <h1>AUTORISATION PARTICULIÈRE DE TRAVAUX</h1>

        <div class="ref-box">
            <span class="ref-item">N° D'AUTORISATION : {numero}</span>
            <span class="ref-item">DATE D'ÉTABLISSEMENT : {date_etablissement}</span>
        </div>

        <!-- Informations principales -->
        <table>
            <tr>
                <th style="width: 30%;">SERVICE DEMANDEUR</th>
                <td>{service_demandeur}</td>
            </tr>
            <tr>
                <th>RESPONSABLE</th>
                <td>{responsable}</td>
            </tr>
        </table>

        <!-- Personnel autorisé -->
        <div class="section-title">PERSONNEL AUTORISÉ</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 8%; text-align: center;">N°</th>
                    <th style="width: 46%;">NOM ET PRÉNOM</th>
                    <th style="width: 46%;">FONCTION</th>
                </tr>
            </thead>
            <tbody>
                {personnel_rows}
            </tbody>
        </table>

        <!-- Type de travaux - SUR 2 COLONNES -->
        <div class="section-title">TYPE DE TRAVAUX</div>
        <table>
            <tr>
                <td style="width: 50%; padding: 6px; font-size: 9pt;">
                    <span style="font-size: 11pt;">{type_point_chaud}</span> Par point chaud
                </td>
                <td style="width: 50%; padding: 6px; font-size: 9pt;">
                    <span style="font-size: 11pt;">{type_fouille}</span> De fouille
                </td>
            </tr>
            <tr>
                <td style="padding: 6px; font-size: 9pt;">
                    <span style="font-size: 11pt;">{type_espace_clos}</span> En espace clos ou confiné
                </td>
                <td style="padding: 6px; font-size: 9pt;">
                    <span style="font-size: 11pt;">{type_autre_cas}</span> Autre cas
                </td>
            </tr>
        </table>
        {f'<table><tr><td style="padding: 4px;"><strong>Précisions:</strong> {description_travaux}</td></tr></table>' if description_travaux else ''}

        <!-- Horaires et lieu -->
        <table style="margin-top: 6px;">
            <tr>
                <th style="width: 25%;">HORAIRE DÉBUT</th>
                <td style="width: 25%;">{horaire_debut}</td>
                <th style="width: 25%;">HORAIRE FIN</th>
                <td style="width: 25%;">{horaire_fin}</td>
            </tr>
            <tr>
                <th>LIEU DES TRAVAUX</th>
                <td colspan="3">{lieu_travaux}</td>
            </tr>
        </table>

        <!-- Risques potentiels -->
        <div class="section-title">RISQUES POTENTIELS</div>
        <table>
            <tr>
                <td class="textarea-field">{risques_potentiels if risques_potentiels else ""}</td>
            </tr>
        </table>

        <!-- Mesures de sécurité - SUR 2 COLONNES -->
        <div class="section-title">MESURES DE SÉCURITÉ</div>
        <table>
            <tbody>
                {mesures_rows}
            </tbody>
        </table>
        {f'<table><tr><td style="padding: 4px;"><strong>Précisions:</strong> {mesures_securite_texte}</td></tr></table>' if mesures_securite_texte else ''}

        <!-- EPI - SUR 3 COLONNES -->
        <div class="section-title">ÉQUIPEMENTS DE PROTECTION INDIVIDUELLE (EPI)</div>
        <table>
            <tbody>
                {epi_rows}
            </tbody>
        </table>
        {f'<table><tr><td style="padding: 4px;"><strong>Précisions:</strong> {equipements_protection_texte}</td></tr></table>' if equipements_protection_texte else ''}

        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-title">DEMANDEUR</div>
                <div><strong>Nom :</strong> {signature_demandeur}</div>
                <div class="signature-line">Date : {date_signature_demandeur}</div>
            </div>
            <div class="signature-box">
                <div class="signature-title">RESPONSABLE SÉCURITÉ</div>
                <div><strong>Nom :</strong> {signature_responsable_securite}</div>
                <div class="signature-line">Date : {date_signature_responsable}</div>
            </div>
        </div>
    </div>
</body>
</html>
"""
    return html
