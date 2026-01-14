"""
Fonctions email pour les Demandes d'Arrêt pour Maintenance
"""
import os
import logging
import email_service

logger = logging.getLogger(__name__)


async def send_demande_email(demande: dict):
    """Envoyer l'email de demande d'arrêt au destinataire"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        approve_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=approve"
        refuse_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=refuse"
        
        equipements_str = ", ".join(demande["equipement_noms"])
        
        subject = f"🔧 Demande d'Arrêt pour Maintenance - {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        .btn {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .highlight {{ font-weight: bold; color: #2563eb; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Demande d'Arrêt pour Maintenance</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande['destinataire_nom']}</strong>,</p>
            <p>Une nouvelle demande d'arrêt pour maintenance a été soumise et nécessite votre validation.</p>
            
            <div class="info-box">
                <h3>📋 Détails de la demande</h3>
                <p><strong>Demandeur:</strong> {demande['demandeur_nom']}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Période:</strong> Du <span class="highlight">{demande['date_debut']}</span> au <span class="highlight">{demande['date_fin']}</span></p>
                <p><strong>Motif:</strong> {demande.get('motif', 'Non spécifié')}</p>
                <p><strong>Type:</strong> {demande.get('type_maintenance', 'Non spécifié')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{approve_link}" class="btn btn-approve">✓ Approuver</a>
                <a href="{refuse_link}" class="btn btn-refuse">✗ Refuser</a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px;">
                Cette demande expirera automatiquement dans <strong>7 jours</strong> si aucune action n'est prise.
            </p>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement par le système GMAO.</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande d'Arrêt pour Maintenance

Bonjour {demande['destinataire_nom']},

Une nouvelle demande d'arrêt pour maintenance a été soumise.

Détails:
- Demandeur: {demande['demandeur_nom']}
- Équipements: {equipements_str}
- Période: Du {demande['date_debut']} au {demande['date_fin']}
- Motif: {demande.get('motif', 'Non spécifié')}

Pour approuver: {approve_link}
Pour refuser: {refuse_link}
        """
        
        success = email_service.send_email(
            to_email=demande['destinataire_email'],
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not success:
            logger.warning(f"Échec envoi email demande: {demande['id']}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email demande: {str(e)}")
        return False


async def send_confirmation_email(demande: dict, approved: bool, commentaire=None, date_proposee=None):
    """Envoyer email de confirmation au demandeur"""
    # À implémenter si nécessaire
    pass


async def send_expiration_email(demande: dict):
    """Envoyer email d'expiration"""
    # À implémenter si nécessaire
    pass


async def send_report_request_email(demande: dict, report: dict):
    """Envoyer email de demande de report au destinataire avec boutons d'action"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        token = report.get("validation_token")
        
        # URLs d'action
        approve_url = f"{FRONTEND_URL}/validate-report?token={token}&action=approve"
        refuse_url = f"{FRONTEND_URL}/validate-report?token={token}&action=refuse"
        counter_url = f"{FRONTEND_URL}/validate-report?token={token}&action=counter_propose"
        
        subject = f"📅 Demande de Report - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .dates-box {{ background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }}
        .raison-box {{ background: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6b7280; }}
        .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        .highlight {{ font-weight: bold; color: #f59e0b; }}
        .button {{ display: inline-block; padding: 12px 25px; margin: 8px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .btn-counter {{ background-color: #3b82f6; color: white; }}
        .actions {{ text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Demande de Report</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>Une demande de <span class="highlight">report de maintenance</span> a été soumise et nécessite votre réponse.</p>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande initiale</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates prévues actuellement:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
            </div>
            
            <div class="dates-box">
                <h3>📆 Nouvelles dates demandées</h3>
                <p><strong>Du:</strong> {report.get('nouvelle_date_debut', '')}</p>
                <p><strong>Au:</strong> {report.get('nouvelle_date_fin', '')}</p>
            </div>
            
            <div class="raison-box">
                <h3>📝 Raison du report</h3>
                <p><strong>Demandé par:</strong> {report.get('demandeur_report_nom', '')}</p>
                <p>{report.get('raison', '')}</p>
            </div>
            
            <div class="actions">
                <p><strong>Quelle est votre décision ?</strong></p>
                <a href="{approve_url}" class="button btn-approve">✓ Approuver le report</a>
                <a href="{refuse_url}" class="button btn-refuse">✗ Refuser</a>
                <br><br>
                <a href="{counter_url}" class="button btn-counter">📅 Proposer d'autres dates</a>
            </div>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé automatiquement par le système GMAO.</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande de Report - Maintenance

Bonjour {demande.get('destinataire_nom', '')},

Une demande de report de maintenance a été soumise.

Demandeur du report: {report.get('demandeur_report_nom', '')}
Raison: {report.get('raison', '')}

Dates actuelles: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}
Nouvelles dates demandées: Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}

Pour approuver: {approve_url}
Pour refuser: {refuse_url}
Pour proposer d'autres dates: {counter_url}
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if success:
            logger.info(f"Email de demande de report envoyé pour demande {demande.get('id')}")
        else:
            logger.warning(f"Échec envoi email report pour demande {demande.get('id')}")
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email report: {str(e)}")
        return False


async def send_report_decision_email(demande: dict, report: dict, decision: str):
    """Envoyer email au demandeur du report avec la décision"""
    try:
        demandeur_email = report.get("demandeur_report_email", "")
        if not demandeur_email:
            logger.warning("Email du demandeur de report non trouvé")
            return False
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        
        if decision == "ACCEPTE":
            status_color = "#10b981"
            status_text = "Accepté"
            message = f"Votre demande de report a été <strong style='color: {status_color};'>acceptée</strong>. Les nouvelles dates ont été appliquées à la maintenance."
        else:
            status_color = "#ef4444"
            status_text = "Refusé"
            message = f"Votre demande de report a été <strong style='color: {status_color};'>refusée</strong>. Les dates initiales de la maintenance sont maintenues."
        
        subject = f"📅 Report {status_text} - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {status_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid {status_color}; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Décision sur votre demande de report</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{report.get('demandeur_report_nom', '')}</strong>,</p>
            <p>{message}</p>
            
            <div class="info-box">
                <h3>📋 Détails</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates demandées:</strong> Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}</p>
                <p><strong>Raison initiale:</strong> {report.get('raison', '')}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Report {status_text}

{message.replace('<strong>', '').replace('</strong>', '').replace(f"<strong style='color: {status_color};'>", '').replace("</strong>", '')}

Équipements: {equipements_str}
Dates demandées: Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}
        """
        
        success = email_service.send_email(
            to_email=demandeur_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email décision report: {str(e)}")
        return False


async def send_counter_proposal_email(demande: dict, report: dict, counter: dict):
    """Envoyer email au demandeur du report avec la contre-proposition"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        demandeur_email = report.get("demandeur_report_email", "")
        token = counter.get("validation_token")
        
        if not demandeur_email:
            logger.warning("Email du demandeur de report non trouvé pour contre-proposition")
            return False
        
        accept_url = f"{FRONTEND_URL}/validate-counter-proposal?token={token}&action=accept"
        refuse_url = f"{FRONTEND_URL}/validate-counter-proposal?token={token}&action=refuse"
        
        subject = f"📅 Contre-proposition de dates - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #6b7280; }}
        .dates-box {{ background: #dbeafe; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }}
        .button {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }}
        .btn-accept {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
        .actions {{ text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Contre-proposition de Dates</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{report.get('demandeur_report_nom', '')}</strong>,</p>
            <p>Suite à votre demande de report, <strong>{demande.get('destinataire_nom', '')}</strong> vous propose des dates alternatives.</p>
            
            <div class="info-box">
                <h3>📋 Votre demande initiale</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates demandées:</strong> Du {report.get('nouvelle_date_debut', '')} au {report.get('nouvelle_date_fin', '')}</p>
            </div>
            
            <div class="dates-box">
                <h3>📆 Dates proposées par {demande.get('destinataire_nom', '')}</h3>
                <p><strong>Du:</strong> {counter.get('date_debut', '')}</p>
                <p><strong>Au:</strong> {counter.get('date_fin', '')}</p>
                {f"<p><strong>Commentaire:</strong> {counter.get('commentaire', '')}</p>" if counter.get('commentaire') else ""}
            </div>
            
            <div class="actions">
                <p><strong>Acceptez-vous ces nouvelles dates ?</strong></p>
                <a href="{accept_url}" class="button btn-accept">✓ Accepter ces dates</a>
                <a href="{refuse_url}" class="button btn-refuse">✗ Refuser</a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
                Si vous refusez, les dates initiales de la maintenance seront maintenues.
            </p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Contre-proposition de Dates

Bonjour {report.get('demandeur_report_nom', '')},

Suite à votre demande de report, {demande.get('destinataire_nom', '')} vous propose des dates alternatives.

Dates proposées: Du {counter.get('date_debut', '')} au {counter.get('date_fin', '')}
{f"Commentaire: {counter.get('commentaire', '')}" if counter.get('commentaire') else ""}

Pour accepter: {accept_url}
Pour refuser: {refuse_url}
        """
        
        success = email_service.send_email(
            to_email=demandeur_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email contre-proposition: {str(e)}")
        return False


async def send_counter_proposal_decision_email(demande: dict, report: dict, counter: dict, decision: str):
    """Envoyer email au destinataire de la demande avec la décision sur la contre-proposition"""
    try:
        destinataire_email = demande.get("destinataire_email", "")
        if not destinataire_email:
            logger.warning("Email du destinataire non trouvé")
            return False
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        
        if decision == "ACCEPTE":
            status_color = "#10b981"
            status_text = "Acceptée"
            message = f"La contre-proposition de dates a été <strong style='color: {status_color};'>acceptée</strong> par {report.get('demandeur_report_nom', '')}."
        else:
            status_color = "#ef4444"
            status_text = "Refusée"
            message = f"La contre-proposition de dates a été <strong style='color: {status_color};'>refusée</strong> par {report.get('demandeur_report_nom', '')}. Les dates initiales sont maintenues."
        
        subject = f"📅 Contre-proposition {status_text} - Maintenance {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {status_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid {status_color}; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Réponse à votre contre-proposition</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>{message}</p>
            
            <div class="info-box">
                <h3>📋 Détails</h3>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates que vous aviez proposées:</strong> Du {counter.get('date_debut', '')} au {counter.get('date_fin', '')}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Contre-proposition {status_text}

{message.replace('<strong>', '').replace('</strong>', '').replace(f"<strong style='color: {status_color};'>", '')}

Équipements: {equipements_str}
Dates proposées: Du {counter.get('date_debut', '')} au {counter.get('date_fin', '')}
        """
        
        success = email_service.send_email(
            to_email=destinataire_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email décision contre-proposition: {str(e)}")
        return False


async def send_cancellation_email(demande: dict, motif: str, cancelled_by: dict):
    """Envoyer email d'annulation au destinataire"""
    try:
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        cancelled_by_name = f"{cancelled_by.get('prenom', '')} {cancelled_by.get('nom', '')}"
        
        subject = f"❌ Demande d'Arrêt Annulée - {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ef4444; }}
        .motif-box {{ background: #fef2f2; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #ef4444; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Demande d'Arrêt Annulée</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            <p>La demande d'arrêt suivante a été <strong style="color: #ef4444;">annulée</strong>.</p>
            
            <div class="info-box">
                <h3>📋 Détails de la demande annulée</h3>
                <p><strong>Demandeur initial:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Dates prévues:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
            </div>
            
            <div class="motif-box">
                <h3>📝 Motif d'annulation</h3>
                <p><strong>Annulée par:</strong> {cancelled_by_name}</p>
                <p>{motif}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
Demande d'Arrêt Annulée

La demande d'arrêt a été annulée.

Équipements: {equipements_str}
Dates prévues: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}

Annulée par: {cancelled_by_name}
Motif: {motif}
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email annulation: {str(e)}")
        return False


async def send_reminder_email(demande: dict, days_remaining: int):
    """Envoyer un rappel pour une demande en attente"""
    try:
        FRONTEND_URL = os.environ.get('FRONTEND_URL', os.environ.get('APP_URL', 'http://localhost:3000'))
        
        approve_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=approve"
        refuse_link = f"{FRONTEND_URL}/validate-demande-arret?token={demande['validation_token']}&action=refuse"
        
        equipements_str = ", ".join(demande.get("equipement_noms", []))
        
        subject = f"⏰ RAPPEL: Demande d'Arrêt en attente - {equipements_str}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
        .urgent-box {{ background: #fef3c7; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }}
        .info-box {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2563eb; }}
        .btn {{ display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: bold; }}
        .btn-approve {{ background-color: #10b981; color: white; }}
        .btn-refuse {{ background-color: #ef4444; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ RAPPEL</h1>
        </div>
        <div class="content">
            <p>Bonjour <strong>{demande.get('destinataire_nom', '')}</strong>,</p>
            
            <div class="urgent-box">
                <p><strong>⚠️ Attention:</strong> Une demande d'arrêt est en attente de votre validation depuis plusieurs jours.</p>
                <p>Il reste <strong>{days_remaining} jour(s)</strong> avant l'expiration automatique de cette demande.</p>
            </div>
            
            <div class="info-box">
                <h3>📋 Rappel de la demande</h3>
                <p><strong>Demandeur:</strong> {demande.get('demandeur_nom', '')}</p>
                <p><strong>Équipements:</strong> {equipements_str}</p>
                <p><strong>Période:</strong> Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}</p>
                <p><strong>Motif:</strong> {demande.get('motif', 'Non spécifié')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{approve_link}" class="btn btn-approve">✓ Approuver</a>
                <a href="{refuse_link}" class="btn btn-refuse">✗ Refuser</a>
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
RAPPEL: Demande d'Arrêt en attente

Bonjour {demande.get('destinataire_nom', '')},

Une demande d'arrêt est en attente de votre validation.
Il reste {days_remaining} jour(s) avant l'expiration.

Demandeur: {demande.get('demandeur_nom', '')}
Équipements: {equipements_str}
Période: Du {demande.get('date_debut', '')} au {demande.get('date_fin', '')}

Pour approuver: {approve_link}
Pour refuser: {refuse_link}
        """
        
        success = email_service.send_email(
            to_email=demande.get('destinataire_email', ''),
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return success
    except Exception as e:
        logger.error(f"Erreur envoi email rappel: {str(e)}")
        return False
