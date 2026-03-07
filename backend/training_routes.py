"""
Routes API pour le module de formation des nouveaux arrivants
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dependencies import get_current_user
from pydantic import BaseModel, Field
import uuid
import secrets
import os

router = APIRouter(prefix="/training", tags=["Formation"])

db = None

def init_training_routes(database):
    global db
    db = database


# ===== Pydantic Models =====

class SlideModel(BaseModel):
    order: int = 0
    title: str = ""
    content: str = ""
    image_url: Optional[str] = None

class QuestionOption(BaseModel):
    label: str
    value: str

class QuestionModel(BaseModel):
    order: int = 0
    question: str
    type: str = "multiple_choice"  # multiple_choice, text, yes_no
    options: List[QuestionOption] = []
    correct_answer: Optional[str] = None

class SessionCreate(BaseModel):
    title: str
    description: str = ""
    slides: List[SlideModel] = []
    questionnaire: List[QuestionModel] = []

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    slides: Optional[List[SlideModel]] = None
    questionnaire: Optional[List[QuestionModel]] = None
    status: Optional[str] = None

class SendLinkRequest(BaseModel):
    employee_name: str
    employee_email: str
    validity_days: int = 7

class SubmitResponseRequest(BaseModel):
    employee_name: str
    answers: List[dict] = []
    attestation_formateur: bool = False
    attestation_employe: bool = False


# ===== Sessions CRUD =====

@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.training_sessions.find({}, {"_id": 0}).to_list(length=None)
    return sessions


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")
    return session


@router.post("/sessions")
async def create_session(data: SessionCreate, current_user: dict = Depends(get_current_user)):
    session = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "slides": [s.model_dump() for s in data.slides],
        "questionnaire": [q.model_dump() for q in data.questionnaire],
        "status": "active",
        "created_by": current_user.get("id"),
        "created_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.training_sessions.insert_one(session)
    session.pop("_id", None)
    return session


@router.put("/sessions/{session_id}")
async def update_session(session_id: str, data: SessionUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.training_sessions.find_one({"id": session_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.description is not None:
        update_data["description"] = data.description
    if data.slides is not None:
        update_data["slides"] = [s.model_dump() for s in data.slides]
    if data.questionnaire is not None:
        update_data["questionnaire"] = [q.model_dump() for q in data.questionnaire]
    if data.status is not None:
        update_data["status"] = data.status
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.training_sessions.update_one({"id": session_id}, {"$set": update_data})
    updated = await db.training_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.training_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session non trouvee")
    return {"success": True, "message": "Session supprimee"}


# ===== Upload images pour slides =====

@router.post("/upload")
async def upload_training_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    upload_dir = "/app/backend/uploads/training"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    backend_url = os.environ.get("BACKEND_URL", "")
    file_url = f"{backend_url}/api/training/files/{filename}"
    return {"url": file_url, "filename": filename}


@router.get("/files/{filename}")
async def get_training_file(filename: str):
    from fastapi.responses import FileResponse
    filepath = f"/app/backend/uploads/training/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    return FileResponse(filepath)


# ===== Liens ephemeres =====

@router.post("/sessions/{session_id}/send-link")
async def send_training_link(session_id: str, data: SendLinkRequest, current_user: dict = Depends(get_current_user)):
    session = await db.training_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=data.validity_days)

    link_doc = {
        "id": str(uuid.uuid4()),
        "token": token,
        "session_id": session_id,
        "session_title": session.get("title", ""),
        "employee_name": data.employee_name,
        "employee_email": data.employee_email,
        "expires_at": expires_at.isoformat(),
        "completed": False,
        "completed_at": None,
        "created_by": current_user.get("id"),
        "created_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.training_links.insert_one(link_doc)
    link_doc.pop("_id", None)

    # Envoyer l'email
    frontend_url = os.environ.get("FRONTEND_URL", "")
    training_url = f"{frontend_url}/training-public/{token}"

    try:
        from email_service import send_email
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Formation IRIS</h1>
            </div>
            <div style="padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0;">
                <p>Bonjour <strong>{data.employee_name}</strong>,</p>
                <p>Vous etes invite(e) a suivre la formation : <strong>{session.get('title', '')}</strong></p>
                <p>Cette formation comprend une presentation suivie d'un questionnaire d'evaluation.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{training_url}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Acceder a la formation
                    </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Ce lien est valide pendant {data.validity_days} jours (jusqu'au {expires_at.strftime('%d/%m/%Y')}).</p>
            </div>
            <div style="padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
                GMAO IRIS - Module de Formation
            </div>
        </div>
        """
        send_email(data.employee_email, f"Formation IRIS - {session.get('title', '')}", html_content)
        link_doc["email_sent"] = True
    except Exception as e:
        print(f"Erreur envoi email formation: {e}")
        link_doc["email_sent"] = False

    link_doc["training_url"] = training_url
    return link_doc


@router.get("/links")
async def get_links(current_user: dict = Depends(get_current_user)):
    links = await db.training_links.find({}, {"_id": 0}).to_list(length=None)
    return links


@router.delete("/links/{link_id}")
async def delete_link(link_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.training_links.delete_one({"id": link_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lien non trouve")
    return {"success": True, "message": "Lien supprime"}


# ===== Page publique (PAS D'AUTH) =====

@router.get("/public/{token}")
async def get_public_training(token: str):
    link = await db.training_links.find_one({"token": token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Lien invalide ou expire")

    expires_at = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00")) if isinstance(link["expires_at"], str) else link["expires_at"]
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Ce lien a expire")

    if link.get("completed"):
        raise HTTPException(status_code=400, detail="Cette formation a deja ete completee")

    session = await db.training_sessions.find_one({"id": link["session_id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session de formation non trouvee")

    return {
        "link": link,
        "session": session
    }


@router.post("/public/{token}/submit")
async def submit_public_response(token: str, data: SubmitResponseRequest):
    link = await db.training_links.find_one({"token": token})
    if not link:
        raise HTTPException(status_code=404, detail="Lien invalide")

    expires_at = datetime.fromisoformat(link["expires_at"].replace("Z", "+00:00")) if isinstance(link["expires_at"], str) else link["expires_at"]
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Ce lien a expire")

    if link.get("completed"):
        raise HTTPException(status_code=400, detail="Deja completee")

    session = await db.training_sessions.find_one({"id": link["session_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvee")

    # Calculer le score
    questionnaire = session.get("questionnaire", [])
    score = 0
    total = len(questionnaire)
    for ans in data.answers:
        q_index = ans.get("question_index", -1)
        if 0 <= q_index < len(questionnaire):
            q = questionnaire[q_index]
            if q.get("correct_answer") and ans.get("answer") == q["correct_answer"]:
                score += 1

    response_doc = {
        "id": str(uuid.uuid4()),
        "link_id": link["id"],
        "session_id": link["session_id"],
        "session_title": session.get("title", ""),
        "employee_name": data.employee_name or link.get("employee_name", ""),
        "employee_email": link.get("employee_email", ""),
        "answers": data.answers,
        "score": score,
        "total_questions": total,
        "attestation_formateur": data.attestation_formateur,
        "attestation_employe": data.attestation_employe,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.training_responses.insert_one(response_doc)
    response_doc.pop("_id", None)

    # Marquer le lien comme complete
    await db.training_links.update_one(
        {"token": token},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )

    return response_doc


# ===== Historique des reponses =====

@router.get("/responses")
async def get_responses(current_user: dict = Depends(get_current_user)):
    responses = await db.training_responses.find({}, {"_id": 0}).to_list(length=None)
    return responses


@router.get("/responses/{response_id}")
async def get_response_detail(response_id: str, current_user: dict = Depends(get_current_user)):
    response = await db.training_responses.find_one({"id": response_id}, {"_id": 0})
    if not response:
        raise HTTPException(status_code=404, detail="Reponse non trouvee")
    return response


# ===== Stats =====

@router.get("/stats")
async def get_training_stats(current_user: dict = Depends(get_current_user)):
    sessions_count = await db.training_sessions.count_documents({})
    links_count = await db.training_links.count_documents({})
    completed_count = await db.training_links.count_documents({"completed": True})
    pending_count = await db.training_links.count_documents({"completed": False})
    responses_count = await db.training_responses.count_documents({})

    return {
        "sessions": sessions_count,
        "links_sent": links_count,
        "completed": completed_count,
        "pending": pending_count,
        "responses": responses_count
    }
