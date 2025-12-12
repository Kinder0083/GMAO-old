"""
Service pour gérer les demandes d'achat (emails, PDF, tokens)
"""
import os
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
import base64

from email_service import send_email_with_attachment
from models import PurchaseRequest, PurchaseRequestStatus

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace('/api', '')


class PurchaseRequestService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def generate_pdf(self, purchase_request: dict) -> bytes:
        """Génère un PDF pour la demande d'achat"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                              rightMargin=2*cm, leftMargin=2*cm,
                              topMargin=2*cm, bottomMargin=2*cm)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#424242'),
            spaceAfter=10,
            spaceBefore=15
        )
        
        normal_style = styles['Normal']
        
        # Contenu du PDF
        story = []
        
        # Titre
        story.append(Paragraph("DEMANDE D'ACHAT", title_style))
        story.append(Spacer(1, 0.5*cm))
        
        # Numéro et date
        info_data = [
            ['Numéro:', purchase_request.get('numero', 'N/A')],
            ['Date de création:', datetime.fromisoformat(purchase_request.get('date_creation', '')).strftime('%d/%m/%Y %H:%M') if purchase_request.get('date_creation') else 'N/A'],
            ['Statut:', self._get_status_label(purchase_request.get('status', ''))]
        ]
        
        info_table = Table(info_data, colWidths=[5*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#424242')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5'))
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.5*cm))
        
        # Demandeur
        story.append(Paragraph("DEMANDEUR", heading_style))
        demandeur_data = [
            ['Nom:', purchase_request.get('demandeur_nom', 'N/A')],
            ['Email:', purchase_request.get('demandeur_email', 'N/A')]
        ]
        demandeur_table = Table(demandeur_data, colWidths=[5*cm, 10*cm])
        demandeur_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(demandeur_table)
        story.append(Spacer(1, 0.3*cm))
        
        # Article demandé
        story.append(Paragraph("ARTICLE DEMANDÉ", heading_style))
        article_data = [
            ['Type:', self._get_type_label(purchase_request.get('type', ''))],
            ['Désignation:', purchase_request.get('designation', 'N/A')],
            ['Quantité:', f"{purchase_request.get('quantite', 0)} {purchase_request.get('unite', 'Unité')}"],
            ['Référence:', purchase_request.get('reference', 'N/A') or '-'],
            ['Fournisseur suggéré:', purchase_request.get('fournisseur_suggere', 'N/A') or '-'],
            ['Urgence:', self._get_urgency_label(purchase_request.get('urgence', ''))]
        ]
        
        article_table = Table(article_data, colWidths=[5*cm, 10*cm])
        article_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5'))
        ]))
        story.append(article_table)
        story.append(Spacer(1, 0.3*cm))
        
        # Description (si existe)
        if purchase_request.get('description'):
            story.append(Paragraph("<b>Description:</b>", normal_style))
            story.append(Paragraph(purchase_request.get('description', ''), normal_style))
            story.append(Spacer(1, 0.3*cm))
        
        # Destinataire final
        story.append(Paragraph("DESTINATAIRE FINAL", heading_style))
        dest_data = [
            ['Nom:', purchase_request.get('destinataire_nom', 'N/A')]
        ]
        dest_table = Table(dest_data, colWidths=[5*cm, 10*cm])
        dest_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(dest_table)
        story.append(Spacer(1, 0.3*cm))
        
        # Justification
        story.append(Paragraph("JUSTIFICATION", heading_style))
        story.append(Paragraph(purchase_request.get('justification', 'N/A'), normal_style))
        
        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    
    def _get_status_label(self, status: str) -> str:
        """Retourne le libellé français du statut"""
        labels = {
            'SOUMISE': 'Soumise (en attente N+1)',
            'VALIDEE_N1': 'Validée par N+1',
            'APPROUVEE_ACHAT': 'Approuvée par service achat',
            'ACHAT_EFFECTUE': 'Achat effectué',
            'RECEPTIONNEE': 'Réceptionnée',
            'DISTRIBUEE': 'Distribuée',
            'REFUSEE_N1': 'Refusée par N+1',
            'REFUSEE_ACHAT': 'Refusée par service achat'
        }
        return labels.get(status, status)
    
    def _get_type_label(self, type_: str) -> str:
        """Retourne le libellé français du type"""
        labels = {
            'PIECE_DETACHEE': 'Pièce détachée',
            'EQUIPEMENT': 'Équipement',
            'CONSOMMABLE': 'Consommable',
            'SERVICE': 'Service/Prestation',
            'OUTILLAGE': 'Outillage',
            'FOURNITURE': 'Fourniture',
            'AUTRE': 'Autre'
        }
        return labels.get(type_, type_)
    
    def _get_urgency_label(self, urgency: str) -> str:
        """Retourne le libellé français de l'urgence"""
        labels = {
            'NORMAL': 'Normale',
            'URGENT': 'Urgent',
            'TRES_URGENT': 'Très urgent'
        }
        return labels.get(urgency, urgency)
    
    async def create_approval_token(self, request_id: str, action: str, user_id: str) -> str:
        """Crée un token sécurisé pour l'approbation/refus via email"""
        token = secrets.token_urlsafe(32)
        expiration = datetime.now(timezone.utc) + timedelta(days=7)
        
        token_data = {
            "token": token,
            "request_id": request_id,
            "action": action,  # "approve_n1", "reject_n1", "approve_achat", "reject_achat"
            "user_id": user_id,
            "expiration": expiration.isoformat(),
            "used": False
        }
        
        await self.db.approval_tokens.insert_one(token_data)
        
        return token
    
    async def send_email_to_n1(self, purchase_request: PurchaseRequest, n1_user: dict):
        """Envoie un email au N+1 avec la demande en PDF et boutons d'action"""
        try:
            # Générer le PDF
            pdf_bytes = self.generate_pdf(purchase_request.model_dump())
            
            # Créer les tokens d'approbation
            approve_token = await self.create_approval_token(
                purchase_request.id, "approve_n1", n1_user['id']
            )
            reject_token = await self.create_approval_token(
                purchase_request.id, "reject_n1", n1_user['id']
            )
            
            # URLs des boutons
            approve_url = f"{FRONTEND_URL}/api/purchase-requests/approve/{approve_token}"
            reject_url = f"{FRONTEND_URL}/api/purchase-requests/reject/{reject_token}"
            
            # Contenu HTML de l'email
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">
                        Nouvelle Demande d'Achat à Valider
                    </h2>
                    
                    <p>Bonjour {n1_user.get('prenom', '')} {n1_user.get('nom', '')},</p>
                    
                    <p>Une nouvelle demande d'achat nécessite votre validation :</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Numéro :</strong> {purchase_request.numero}</p>
                        <p style="margin: 5px 0;"><strong>Demandeur :</strong> {purchase_request.demandeur_nom}</p>
                        <p style="margin: 5px 0;"><strong>Article :</strong> {purchase_request.designation}</p>
                        <p style="margin: 5px 0;"><strong>Quantité :</strong> {purchase_request.quantite} {purchase_request.unite}</p>
                        <p style="margin: 5px 0;"><strong>Urgence :</strong> {self._get_urgency_label(purchase_request.urgence.value)}</p>
                    </div>
                    
                    <p><strong>Justification :</strong><br>{purchase_request.justification}</p>
                    
                    <p style="margin-top: 30px;">Vous trouverez le formulaire complet en pièce jointe.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{approve_url}" 
                           style="display: inline-block; padding: 12px 30px; margin: 10px; background-color: #4caf50; 
                                  color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            ✓ Approuver
                        </a>
                        <a href="{reject_url}" 
                           style="display: inline-block; padding: 12px 30px; margin: 10px; background-color: #f44336; 
                                  color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            ✗ Refuser
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
                        Ce lien est valable pendant 7 jours. Si vous ne pouvez pas cliquer sur les boutons, 
                        vous pouvez vous connecter à GMAO Iris pour traiter cette demande.
                    </p>
                </div>
            </body>
            </html>
            """
            
            # Envoyer l'email avec le PDF en pièce jointe
            send_email_with_attachment(
                to_email=n1_user.get('email'),
                subject=f"Demande d'achat à valider - {purchase_request.numero}",
                html_content=html_content,
                attachment_data=pdf_bytes,
                attachment_filename=f"Demande_{purchase_request.numero}.pdf"
            )
            
            logger.info(f"✅ Email envoyé au N+1 {n1_user.get('email')} pour demande {purchase_request.numero}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email N+1: {str(e)}")
            # Ne pas bloquer la création de la demande si l'email échoue
    
    async def send_status_change_emails(self, request_id: str, old_status: str, new_status: str, current_user: dict):
        """Envoie les emails appropriés selon le changement de statut"""
        try:
            # Récupérer la demande mise à jour
            request = await self.db.purchase_requests.find_one({"id": request_id}, {"_id": 0})
            
            if not request:
                return
            
            # Email au demandeur pour l'informer du changement de statut
            await self._send_status_notification_to_requester(request, old_status, new_status)
            
            # Si validé par N+1, envoyer au service achat (admin)
            if new_status == PurchaseRequestStatus.VALIDEE_N1.value:
                await self._send_to_purchase_department(request)
            
            # Si distribué, notifier le destinataire final
            if new_status == PurchaseRequestStatus.DISTRIBUEE.value:
                await self._notify_final_recipient(request)
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi emails changement statut: {str(e)}")
    
    async def _send_status_notification_to_requester(self, request: dict, old_status: str, new_status: str):
        """Notifie le demandeur du changement de statut"""
        try:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Mise à jour de votre demande d'achat</h2>
                    
                    <p>Bonjour {request.get('demandeur_nom')},</p>
                    
                    <p>Le statut de votre demande d'achat a été mis à jour :</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Numéro :</strong> {request.get('numero')}</p>
                        <p style="margin: 5px 0;"><strong>Article :</strong> {request.get('designation')}</p>
                        <p style="margin: 5px 0;"><strong>Ancien statut :</strong> {self._get_status_label(old_status)}</p>
                        <p style="margin: 5px 0;"><strong>Nouveau statut :</strong> 
                            <span style="color: #4caf50; font-weight: bold;">{self._get_status_label(new_status)}</span>
                        </p>
                    </div>
                    
                    <p style="margin-top: 20px;">
                        <a href="{FRONTEND_URL}/purchase-requests/{request.get('id')}" 
                           style="display: inline-block; padding: 10px 20px; background-color: #1976d2; 
                                  color: white; text-decoration: none; border-radius: 5px;">
                            Voir le détail
                        </a>
                    </p>
                </div>
            </body>
            </html>
            """
            
            send_email_with_attachment(
                to_email=request.get('demandeur_email'),
                subject=f"Mise à jour demande {request.get('numero')} - {self._get_status_label(new_status)}",
                html_content=html_content
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur notification demandeur: {str(e)}")
    
    async def _send_to_purchase_department(self, request: dict):
        """Envoie la demande au service achat (admin) après validation N+1"""
        try:
            # Récupérer l'email de l'admin principal (vous)
            admin_email = os.environ.get('ADMIN_EMAIL', 'buenogy@gmail.com')
            
            # Générer le PDF
            pdf_bytes = self.generate_pdf(request)
            
            # Créer les tokens
            admin_user = await self.db.users.find_one({"email": admin_email}, {"_id": 0})
            if not admin_user:
                logger.warning(f"Admin user not found for email {admin_email}")
                return
            
            approve_token = await self.create_approval_token(
                request['id'], "approve_achat", admin_user['id']
            )
            reject_token = await self.create_approval_token(
                request['id'], "reject_achat", admin_user['id']
            )
            
            approve_url = f"{FRONTEND_URL}/api/purchase-requests/approve/{approve_token}"
            reject_url = f"{FRONTEND_URL}/api/purchase-requests/reject/{reject_token}"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1976d2;">Demande d'achat validée par N+1</h2>
                    
                    <p>Bonjour,</p>
                    
                    <p>Une demande d'achat a été validée par le responsable hiérarchique et nécessite votre approbation :</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Numéro :</strong> {request.get('numero')}</p>
                        <p style="margin: 5px 0;"><strong>Demandeur :</strong> {request.get('demandeur_nom')}</p>
                        <p style="margin: 5px 0;"><strong>Validé par :</strong> {request.get('responsable_n1_nom', 'N/A')}</p>
                        <p style="margin: 5px 0;"><strong>Article :</strong> {request.get('designation')}</p>
                        <p style="margin: 5px 0;"><strong>Quantité :</strong> {request.get('quantite')} {request.get('unite')}</p>
                        <p style="margin: 5px 0;"><strong>Urgence :</strong> {self._get_urgency_label(request.get('urgence', ''))}</p>
                    </div>
                    
                    <p><strong>Justification :</strong><br>{request.get('justification')}</p>
                    
                    <p style="margin-top: 30px;">Formulaire complet en pièce jointe.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{approve_url}" 
                           style="display: inline-block; padding: 12px 30px; margin: 10px; background-color: #4caf50; 
                                  color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            ✓ Approuver l'achat
                        </a>
                        <a href="{reject_url}" 
                           style="display: inline-block; padding: 12px 30px; margin: 10px; background-color: #f44336; 
                                  color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            ✗ Refuser
                        </a>
                    </div>
                </div>
            </body>
            </html>
            """
            
            send_email_with_attachment(
                to_email=admin_email,
                subject=f"Achat à approuver - {request.get('numero')}",
                html_content=html_content,
                attachment_data=pdf_bytes,
                attachment_filename=f"Demande_{request.get('numero')}.pdf"
            )
            
            logger.info(f"✅ Email envoyé au service achat pour demande {request.get('numero')}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email service achat: {str(e)}")
    
    async def _notify_final_recipient(self, request: dict):
        """Notifie le destinataire final que l'article est disponible"""
        try:
            # Récupérer l'email du destinataire
            recipient = await self.db.users.find_one({"id": request.get('destinataire_id')}, {"_id": 0})
            
            if not recipient or not recipient.get('email'):
                logger.warning(f"Recipient not found or no email for request {request.get('numero')}")
                return
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4caf50;">Article disponible</h2>
                    
                    <p>Bonjour {recipient.get('prenom')} {recipient.get('nom')},</p>
                    
                    <p>L'article suivant vous a été attribué et est maintenant disponible :</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Article :</strong> {request.get('designation')}</p>
                        <p style="margin: 5px 0;"><strong>Quantité :</strong> {request.get('quantite')} {request.get('unite')}</p>
                        <p style="margin: 5px 0;"><strong>Demandé par :</strong> {request.get('demandeur_nom')}</p>
                    </div>
                    
                    <p>Merci de venir le récupérer auprès du service concerné.</p>
                </div>
            </body>
            </html>
            """
            
            send_email_with_attachment(
                to_email=recipient.get('email'),
                subject=f"Article disponible - {request.get('designation')}",
                html_content=html_content
            )
            
            logger.info(f"✅ Email envoyé au destinataire final pour demande {request.get('numero')}")
            
        except Exception as e:
            logger.error(f"❌ Erreur notification destinataire: {str(e)}")
