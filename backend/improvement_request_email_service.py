"""
Service pour la gestion des emails des demandes d'amélioration
Inclut l'envoi d'emails avec pièces jointes et boutons d'approbation/rejet
"""
import os
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase

from email_service import send_email, send_email_with_attachment

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:3000")

# Variable globale pour la base de données
_db: Optional[AsyncIOMotorDatabase] = None


def init_improvement_request_email_service(db: AsyncIOMotorDatabase):
    """Initialise le service avec la connexion à la base de données"""
    global _db
    _db = db
    logger.info("✅ Service email demandes d'amélioration initialisé")


async def create_approval_token(request_id: str, action: str, user_id: str, request_type: str = "improvement_request") -> str:
    """Crée un token sécurisé pour l'approbation/refus via email"""
    token = secrets.token_urlsafe(32)
    expiration = datetime.now(timezone.utc) + timedelta(days=7)
    
    token_data = {
        "token": token,
        "request_id": request_id,
        "request_type": request_type,
        "action": action,  # "approve" ou "reject"
        "user_id": user_id,
        "expiration": expiration.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await _db.approval_tokens.insert_one(token_data)
    
    return token


async def validate_approval_token(token: str) -> Optional[Dict]:
    """Valide un token d'approbation et retourne ses données"""
    token_data = await _db.approval_tokens.find_one(
        {"token": token, "used": False},
        {"_id": 0}
    )
    
    if not token_data:
        return None
    
    # Vérifier l'expiration
    expiration = datetime.fromisoformat(token_data["expiration"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiration:
        return None
    
    return token_data


async def mark_token_used(token: str):
    """Marque un token comme utilisé"""
    await _db.approval_tokens.update_one(
        {"token": token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )


def get_priority_label(priority: str) -> str:
    """Retourne le libellé français de la priorité"""
    labels = {
        "HAUTE": "🔴 Haute",
        "MOYENNE": "🟠 Moyenne",
        "BASSE": "🔵 Basse",
        "AUCUNE": "⚪ Normale"
    }
    return labels.get(priority, priority)


async def send_improvement_request_email_to_manager(
    request_data: Dict,
    recipient: Dict,
    attachments: List[Dict] = None
):
    """
    Envoie un email au responsable de service pour validation d'une demande d'amélioration
    
    Args:
        request_data: Données de la demande d'amélioration
        recipient: Données du destinataire (email, nom, prenom, id)
        attachments: Liste des pièces jointes [{filename, path, size}]
    """
    try:
        # Vérifier que le destinataire a un ID
        recipient_id = recipient.get("id")
        if not recipient_id:
            logger.warning(f"Destinataire sans ID: {recipient.get('email')}")
            return False
        
        # Créer les tokens d'approbation
        approve_token = await create_approval_token(
            request_data["id"], "approve", recipient_id
        )
        reject_token = await create_approval_token(
            request_data["id"], "reject", recipient_id
        )
        
        # URLs des boutons (redirige vers page frontend de confirmation)
        approve_url = f"{FRONTEND_URL}/validate-improvement-request?token={approve_token}"
        reject_url = f"{FRONTEND_URL}/validate-improvement-request?token={reject_token}&action=reject"
        
        # Section pièces jointes
        attachments_html = ""
        if attachments and len(attachments) > 0:
            attachments_list = "".join([
                f'<li style="margin: 5px 0;">📎 {att.get("original_filename", att.get("filename", "Fichier"))} '
                f'<span style="color: #888;">({_format_file_size(att.get("size", 0))})</span></li>'
                for att in attachments
            ])
            attachments_html = f"""
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1976d2;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #1976d2;">📁 Pièces jointes ({len(attachments)})</p>
                <ul style="margin: 0; padding-left: 20px;">
                    {attachments_list}
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                    Les pièces jointes sont accessibles dans l'application FSAO.
                </p>
            </div>
            """
        else:
            attachments_html = """
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
                <p style="margin: 0; color: #e65100;">
                    ℹ️ <strong>Aucune pièce jointe</strong> n'a été fournie avec cette demande.
                </p>
            </div>
            """
        
        # Informations sur l'équipement si présent
        equipment_html = ""
        if request_data.get("equipement"):
            equipment_html = f"""
            <tr>
                <td style="padding: 10px; font-weight: bold; background: #f5f5f5; width: 150px;">Équipement</td>
                <td style="padding: 10px;">{request_data["equipement"].get("nom", "N/A")}</td>
            </tr>
            """
        
        # Informations sur l'emplacement si présent
        location_html = ""
        if request_data.get("emplacement"):
            location_html = f"""
            <tr>
                <td style="padding: 10px; font-weight: bold; background: #f5f5f5; width: 150px;">Emplacement</td>
                <td style="padding: 10px;">{request_data["emplacement"].get("nom", "N/A")}</td>
            </tr>
            """
        
        # Date limite désirée
        date_limite_html = ""
        if request_data.get("date_limite_desiree"):
            date_str = request_data["date_limite_desiree"]
            if isinstance(date_str, str):
                try:
                    date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    date_str = date_obj.strftime("%d/%m/%Y")
                except:
                    pass
            date_limite_html = f"""
            <tr>
                <td style="padding: 10px; font-weight: bold; background: #f5f5f5; width: 150px;">Date limite souhaitée</td>
                <td style="padding: 10px;">{date_str}</td>
            </tr>
            """
        
        # Contenu HTML de l'email
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
                <!-- En-tête -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">💡 Demande d'Amélioration</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Validation requise</p>
                </div>
                
                <!-- Corps -->
                <div style="background: white; padding: 25px; border: 1px solid #e0e0e0; border-top: none;">
                    <p>Bonjour <strong>{recipient.get('prenom', '')} {recipient.get('nom', '')}</strong>,</p>
                    
                    <p>Une nouvelle demande d'amélioration a été soumise et nécessite votre validation.</p>
                    
                    <!-- Tableau des informations -->
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <tr>
                            <td style="padding: 10px; font-weight: bold; background: #f5f5f5; width: 150px;">Titre</td>
                            <td style="padding: 10px; font-weight: bold; color: #1976d2;">{request_data.get("titre", "N/A")}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; background: #f5f5f5;">Description</td>
                            <td style="padding: 10px;">{request_data.get("description", "N/A")[:500]}{'...' if len(request_data.get("description", "")) > 500 else ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; background: #f5f5f5;">Priorité</td>
                            <td style="padding: 10px;">{get_priority_label(request_data.get("priorite", "AUCUNE"))}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; background: #f5f5f5;">Demandeur</td>
                            <td style="padding: 10px;">{request_data.get("created_by_name", "N/A")}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; font-weight: bold; background: #f5f5f5;">Service</td>
                            <td style="padding: 10px;">{request_data.get("service", "Non défini")}</td>
                        </tr>
                        {equipment_html}
                        {location_html}
                        {date_limite_html}
                    </table>
                    
                    <!-- Pièces jointes -->
                    {attachments_html}
                    
                    <!-- Boutons d'action -->
                    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fafafa; border-radius: 10px;">
                        <p style="margin: 0 0 20px 0; font-weight: bold; color: #333;">Votre décision :</p>
                        <a href="{approve_url}" 
                           style="display: inline-block; padding: 14px 40px; margin: 10px; background-color: #4caf50; 
                                  color: white; text-decoration: none; border-radius: 8px; font-weight: bold;
                                  box-shadow: 0 2px 5px rgba(76,175,80,0.3);">
                            ✓ Approuver la demande
                        </a>
                        <a href="{reject_url}" 
                           style="display: inline-block; padding: 14px 40px; margin: 10px; background-color: #f44336; 
                                  color: white; text-decoration: none; border-radius: 8px; font-weight: bold;
                                  box-shadow: 0 2px 5px rgba(244,67,54,0.3);">
                            ✗ Refuser la demande
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 13px; margin-top: 20px;">
                        En cliquant sur un bouton, vous serez redirigé vers une page de confirmation où vous pourrez 
                        ajouter un commentaire avant de valider votre choix.
                    </p>
                </div>
                
                <!-- Pied de page -->
                <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="color: #888; font-size: 11px; margin: 0; text-align: center;">
                        Ces liens sont valables pendant <strong>7 jours</strong>. Passé ce délai, veuillez vous connecter à 
                        <a href="{FRONTEND_URL}" style="color: #1976d2;">FSAO Iris</a> pour traiter cette demande.
                    </p>
                    <p style="color: #aaa; font-size: 10px; margin: 10px 0 0 0; text-align: center;">
                        Cet email a été envoyé automatiquement par le système FSAO. Ne pas répondre à cet email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"[FSAO] 💡 Demande d'amélioration à valider: {request_data.get('titre', 'Sans titre')}"
        
        # Envoyer l'email
        send_email(
            to_email=recipient["email"],
            subject=subject,
            html_content=html_content
        )
        
        logger.info(f"📧 Email envoyé à {recipient['email']} pour validation demande d'amélioration {request_data.get('id')}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur envoi email demande d'amélioration: {str(e)}")
        return False


def _format_file_size(size_bytes: int) -> str:
    """Formate la taille d'un fichier en unité lisible"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


async def send_validation_notification_email(
    request_data: Dict,
    creator: Dict,
    status: str,
    validator_name: str,
    comment: Optional[str] = None
):
    """
    Envoie un email au demandeur pour l'informer de la validation/rejet
    
    Args:
        request_data: Données de la demande
        creator: Données du créateur (demandeur)
        status: VALIDEE ou REJETEE
        validator_name: Nom du valideur
        comment: Commentaire optionnel
    """
    try:
        is_approved = status == "VALIDEE"
        
        status_color = "#4caf50" if is_approved else "#f44336"
        status_icon = "✅" if is_approved else "❌"
        status_label = "Validée" if is_approved else "Rejetée"
        
        comment_html = ""
        if comment:
            comment_html = f"""
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
                <p style="margin: 0 0 5px 0; font-weight: bold;">💬 Commentaire du responsable :</p>
                <p style="margin: 0; font-style: italic;">"{comment}"</p>
            </div>
            """
        
        next_steps = ""
        if is_approved:
            next_steps = """
            <p>Votre demande sera prochainement convertie en projet d'amélioration par un responsable.</p>
            """
        else:
            next_steps = """
            <p>Vous pouvez soumettre une nouvelle demande en tenant compte des remarques ci-dessus.</p>
            """
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- En-tête -->
                <div style="background-color: {status_color}; padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">{status_icon} Demande {status_label}</h1>
                </div>
                
                <!-- Corps -->
                <div style="background: white; padding: 25px; border: 1px solid #e0e0e0; border-top: none;">
                    <p>Bonjour <strong>{creator.get('prenom', '')} {creator.get('nom', '')}</strong>,</p>
                    
                    <p>Votre demande d'amélioration <strong>"{request_data.get('titre', 'N/A')}"</strong> 
                    a été <strong style="color: {status_color};">{status_label.lower()}</strong> par <strong>{validator_name}</strong>.</p>
                    
                    {comment_html}
                    
                    {next_steps}
                    
                    <p style="margin-top: 20px;">
                        <a href="{FRONTEND_URL}/improvement-requests" 
                           style="display: inline-block; padding: 10px 20px; background-color: #1976d2; 
                                  color: white; text-decoration: none; border-radius: 5px;">
                            Voir mes demandes
                        </a>
                    </p>
                </div>
                
                <!-- Pied de page -->
                <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                    <p style="color: #aaa; font-size: 10px; margin: 0; text-align: center;">
                        Cet email a été envoyé automatiquement par le système FSAO.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"[FSAO] Votre demande d'amélioration a été {status_label.lower()}: {request_data.get('titre', 'Sans titre')}"
        
        send_email(
            to_email=creator["email"],
            subject=subject,
            html_content=html_content
        )
        
        logger.info(f"📧 Email de notification envoyé à {creator['email']} - Demande {status_label}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur envoi email notification: {str(e)}")
        return False
