"""
Routes API pour la gestion des contrats fournisseurs
"""
import os
import uuid
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from bson import ObjectId

from dependencies import get_current_user, get_current_admin_user, check_permission, require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contracts", tags=["Contrats"])

db = None
audit_service = None

UPLOADS_DIR = Path("/app/backend/uploads/contracts")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def init_db(database, audit_svc=None):
    global db, audit_service
    db = database
    audit_service = audit_svc


def serialize_doc(doc):
    """Convertit un document MongoDB pour la sérialisation JSON"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


# --- Pydantic Models ---

class ContractCreate(BaseModel):
    numero_contrat: str
    titre: str
    type_contrat: str = "maintenance"  # maintenance, service, location, prestation, autre
    statut: str = "actif"  # actif, expire, resilie, en_renouvellement
    
    date_etablissement: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    
    montant_total: Optional[float] = None
    periodicite_paiement: str = "mensuel"  # mensuel, trimestriel, annuel
    montant_periode: Optional[float] = None
    mode_paiement: Optional[str] = None
    
    fournisseur_id: Optional[str] = None
    fournisseur_nom: Optional[str] = None
    fournisseur_adresse: Optional[str] = None
    fournisseur_telephone: Optional[str] = None
    fournisseur_email: Optional[str] = None
    fournisseur_site_web: Optional[str] = None
    
    contact_nom: Optional[str] = None
    contact_telephone: Optional[str] = None
    contact_email: Optional[str] = None
    
    signataire_interne_id: Optional[str] = None
    signataire_interne_nom: Optional[str] = None
    commande_interne: Optional[str] = None
    
    alerte_echeance_jours: int = 30
    alerte_resiliation_jours: Optional[int] = None
    alerte_paiement: bool = False
    
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    numero_contrat: Optional[str] = None
    titre: Optional[str] = None
    type_contrat: Optional[str] = None
    statut: Optional[str] = None
    date_etablissement: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    montant_total: Optional[float] = None
    periodicite_paiement: Optional[str] = None
    montant_periode: Optional[float] = None
    mode_paiement: Optional[str] = None
    fournisseur_id: Optional[str] = None
    fournisseur_nom: Optional[str] = None
    fournisseur_adresse: Optional[str] = None
    fournisseur_telephone: Optional[str] = None
    fournisseur_email: Optional[str] = None
    fournisseur_site_web: Optional[str] = None
    contact_nom: Optional[str] = None
    contact_telephone: Optional[str] = None
    contact_email: Optional[str] = None
    signataire_interne_id: Optional[str] = None
    signataire_interne_nom: Optional[str] = None
    commande_interne: Optional[str] = None
    alerte_echeance_jours: Optional[int] = None
    alerte_resiliation_jours: Optional[int] = None
    alerte_paiement: Optional[bool] = None
    notes: Optional[str] = None


# --- CRUD Endpoints ---

@router.get("")
async def get_contracts(
    statut: Optional[str] = None,
    type_contrat: Optional[str] = None,
    fournisseur_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Liste tous les contrats avec filtres optionnels"""
    query = {}
    if statut:
        query["statut"] = statut
    if type_contrat:
        query["type_contrat"] = type_contrat
    if fournisseur_id:
        query["fournisseur_id"] = fournisseur_id
    if search:
        query["$or"] = [
            {"titre": {"$regex": search, "$options": "i"}},
            {"numero_contrat": {"$regex": search, "$options": "i"}},
            {"fournisseur_nom": {"$regex": search, "$options": "i"}}
        ]

    contracts = await db.contracts.find(query).sort("date_fin", 1).to_list(1000)
    result = []
    for c in contracts:
        c["id"] = str(c.pop("_id"))
        result.append(c)
    return result


@router.get("/stats")
async def get_contracts_stats(
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Statistiques des contrats"""
    now = datetime.now(timezone.utc)
    
    total = await db.contracts.count_documents({})
    actifs = await db.contracts.count_documents({"statut": "actif"})
    expires = await db.contracts.count_documents({"statut": "expire"})
    resilies = await db.contracts.count_documents({"statut": "resilie"})
    
    # Contrats expirant dans les 30 prochains jours
    in_30_days = (now + timedelta(days=30)).isoformat()
    expirant_bientot = await db.contracts.count_documents({
        "statut": "actif",
        "date_fin": {"$lte": in_30_days, "$gte": now.isoformat()}
    })
    
    # Coût annuel total (contrats actifs)
    pipeline = [
        {"$match": {"statut": "actif", "montant_periode": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": None,
            "total_mensuel": {
                "$sum": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$periodicite_paiement", "mensuel"]}, "then": "$montant_periode"},
                            {"case": {"$eq": ["$periodicite_paiement", "trimestriel"]}, "then": {"$divide": ["$montant_periode", 3]}},
                            {"case": {"$eq": ["$periodicite_paiement", "annuel"]}, "then": {"$divide": ["$montant_periode", 12]}}
                        ],
                        "default": "$montant_periode"
                    }
                }
            }
        }}
    ]
    agg_result = await db.contracts.aggregate(pipeline).to_list(1)
    cout_mensuel = agg_result[0]["total_mensuel"] if agg_result else 0
    
    return {
        "total": total,
        "actifs": actifs,
        "expires": expires,
        "resilies": resilies,
        "expirant_bientot": expirant_bientot,
        "cout_mensuel": round(cout_mensuel, 2),
        "cout_annuel": round(cout_mensuel * 12, 2)
    }


@router.get("/dashboard")
async def get_contracts_dashboard(
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Données complètes pour le tableau de bord des contrats"""
    now = datetime.now(timezone.utc)
    contracts = await db.contracts.find({}).to_list(1000)

    # --- KPI ---
    actifs = [c for c in contracts if c.get("statut") == "actif"]
    expires = [c for c in contracts if c.get("statut") == "expire"]
    resilies = [c for c in contracts if c.get("statut") == "resilie"]

    def _monthly_cost(c):
        mp = c.get("montant_periode")
        if not mp:
            return 0
        per = c.get("periodicite_paiement", "mensuel")
        if per == "trimestriel":
            return mp / 3
        if per == "annuel":
            return mp / 12
        return mp

    budget_mensuel = sum(_monthly_cost(c) for c in actifs)

    # Contrats à renouveler ce trimestre
    in_90_days = (now + timedelta(days=90)).isoformat()
    a_renouveler = [c for c in actifs if c.get("date_fin") and c["date_fin"] <= in_90_days]

    # Top fournisseurs par coût mensuel
    vendor_costs = {}
    for c in actifs:
        nom = c.get("fournisseur_nom") or "Inconnu"
        vendor_costs[nom] = vendor_costs.get(nom, 0) + _monthly_cost(c)
    top_vendors = sorted(vendor_costs.items(), key=lambda x: -x[1])[:5]

    kpi = {
        "total": len(contracts),
        "actifs": len(actifs),
        "expires": len(expires),
        "resilies": len(resilies),
        "budget_mensuel": round(budget_mensuel, 2),
        "budget_annuel": round(budget_mensuel * 12, 2),
        "a_renouveler_trimestre": len(a_renouveler),
        "top_vendors": [{"nom": n, "cout_mensuel": round(c, 2)} for n, c in top_vendors]
    }

    # --- Répartition par type (pie chart) ---
    type_counts = {}
    for c in contracts:
        t = c.get("type_contrat", "autre")
        type_counts[t] = type_counts.get(t, 0) + 1
    repartition_type = [{"type": k, "count": v} for k, v in type_counts.items()]

    # --- Coût mensuel par fournisseur (bar chart) ---
    cout_par_vendor = [{"fournisseur": n, "cout_mensuel": round(c, 2), "cout_annuel": round(c * 12, 2)} for n, c in top_vendors]

    # --- Évolution budget sur 12 mois (line chart) ---
    evolution = []
    mois_labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    for month_offset in range(12):
        target_month = (now.month - 11 + month_offset - 1) % 12 + 1
        target_year = now.year if (now.month - 11 + month_offset) > 0 else now.year - 1
        month_start = f"{target_year}-{target_month:02d}-01"
        if target_month == 12:
            month_end = f"{target_year + 1}-01-01"
        else:
            month_end = f"{target_year}-{target_month + 1:02d}-01"

        cout = 0
        for c in contracts:
            if c.get("statut") in ("actif", "expire"):
                debut = c.get("date_debut", c.get("date_etablissement", ""))
                fin = c.get("date_fin", "9999-12-31")
                if debut <= month_end and fin >= month_start:
                    cout += _monthly_cost(c)
        evolution.append({
            "mois": mois_labels[target_month - 1],
            "mois_num": f"{target_year}-{target_month:02d}",
            "cout": round(cout, 2)
        })

    # --- Calendrier des échéances (12 prochains mois) ---
    calendar_events = []
    now_naive = now.replace(tzinfo=None)
    for c in contracts:
        if c.get("statut") != "actif":
            continue
        date_fin_str = c.get("date_fin")
        if not date_fin_str:
            continue
        try:
            if isinstance(date_fin_str, str):
                # Gérer les dates avec ou sans timezone
                clean = date_fin_str.replace("Z", "+00:00")
                date_fin = datetime.fromisoformat(clean)
                if date_fin.tzinfo:
                    date_fin = date_fin.replace(tzinfo=None)
            else:
                date_fin = date_fin_str.replace(tzinfo=None) if hasattr(date_fin_str, 'replace') else date_fin_str
            jours = (date_fin - now_naive).days
            if -30 <= jours <= 365:
                seuil_resil = c.get("alerte_resiliation_jours")
                event = {
                    "id": str(c["_id"]),
                    "titre": c.get("titre", ""),
                    "numero": c.get("numero_contrat", ""),
                    "fournisseur": c.get("fournisseur_nom", ""),
                    "date_fin": date_fin_str,
                    "jours_restants": jours,
                    "type": "echeance",
                    "severity": "critical" if jours <= 0 else "warning" if jours <= 30 else "info"
                }
                calendar_events.append(event)

                if seuil_resil:
                    date_resil = date_fin - timedelta(days=seuil_resil)
                    jours_resil = (date_resil - now).days
                    if -30 <= jours_resil <= 365:
                        calendar_events.append({
                            "id": f"resil_{c['_id']}",
                            "titre": c.get("titre", ""),
                            "numero": c.get("numero_contrat", ""),
                            "fournisseur": c.get("fournisseur_nom", ""),
                            "date_fin": date_resil.isoformat(),
                            "jours_restants": jours_resil,
                            "type": "resiliation",
                            "severity": "critical" if jours_resil <= 0 else "warning" if jours_resil <= 30 else "info",
                            "preavis": seuil_resil
                        })
        except (ValueError, TypeError):
            continue

    calendar_events.sort(key=lambda e: e.get("jours_restants", 999))

    # --- Répartition par statut ---
    repartition_statut = [
        {"statut": "actif", "count": len(actifs)},
        {"statut": "expire", "count": len(expires)},
        {"statut": "resilie", "count": len(resilies)},
        {"statut": "en_renouvellement", "count": len([c for c in contracts if c.get("statut") == "en_renouvellement"])}
    ]

    return {
        "kpi": kpi,
        "repartition_type": repartition_type,
        "repartition_statut": repartition_statut,
        "cout_par_vendor": cout_par_vendor,
        "evolution_budget": evolution,
        "calendar_events": calendar_events
    }


@router.get("/alerts")
async def get_contract_alerts(
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Récupère les alertes de contrats (échéances, résiliations, paiements)"""
    now = datetime.now(timezone.utc)
    alerts = []
    
    # Récupérer tous les contrats actifs
    contracts = await db.contracts.find({"statut": "actif"}).to_list(1000)
    
    for contract in contracts:
        contract_id = str(contract["_id"])
        titre = contract.get("titre", "Sans titre")
        
        date_fin_str = contract.get("date_fin")
        if date_fin_str:
            try:
                date_fin = datetime.fromisoformat(date_fin_str.replace("Z", "+00:00")) if isinstance(date_fin_str, str) else date_fin_str
                jours_restants = (date_fin - now).days
                
                # Alerte d'échéance
                seuil_echeance = contract.get("alerte_echeance_jours", 30)
                if jours_restants <= seuil_echeance:
                    alerts.append({
                        "id": f"echeance_{contract_id}",
                        "contract_id": contract_id,
                        "type": "echeance",
                        "titre": titre,
                        "fournisseur": contract.get("fournisseur_nom", ""),
                        "date_fin": date_fin_str,
                        "jours_restants": jours_restants,
                        "severity": "critical" if jours_restants <= 0 else "warning" if jours_restants <= 15 else "info",
                        "message": f"Contrat expiré depuis {abs(jours_restants)} jour(s)" if jours_restants <= 0 
                                   else f"Expire dans {jours_restants} jour(s)"
                    })
                
                # Alerte de résiliation
                seuil_resiliation = contract.get("alerte_resiliation_jours")
                if seuil_resiliation and jours_restants <= seuil_resiliation:
                    alerts.append({
                        "id": f"resiliation_{contract_id}",
                        "contract_id": contract_id,
                        "type": "resiliation",
                        "titre": titre,
                        "fournisseur": contract.get("fournisseur_nom", ""),
                        "date_fin": date_fin_str,
                        "jours_restants": jours_restants,
                        "severity": "critical" if jours_restants <= seuil_resiliation // 2 else "warning",
                        "message": f"Date limite de résiliation dans {jours_restants} jour(s) (préavis: {seuil_resiliation}j)"
                    })
            except (ValueError, TypeError):
                pass
    
    # Trier par sévérité puis par jours restants
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: (severity_order.get(a["severity"], 3), a.get("jours_restants", 999)))
    
    return alerts


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Récupère un contrat par son ID"""
    contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")
    return serialize_doc(contract)


@router.post("")
async def create_contract(
    data: ContractCreate,
    current_user: dict = Depends(require_permission("contrats", "edit"))
):
    """Créer un nouveau contrat"""
    contract_dict = data.model_dump()
    contract_dict["pieces_jointes"] = []
    contract_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    contract_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    contract_dict["created_by"] = current_user.get("id")
    contract_dict["created_by_name"] = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()

    result = await db.contracts.insert_one(contract_dict)
    contract_dict["id"] = str(result.inserted_id)
    contract_dict.pop("_id", None)

    if audit_service:
        from models import ActionType, EntityType
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=contract_dict["created_by_name"],
            user_email=current_user["email"],
            action=ActionType.CREATE,
            entity_type=EntityType.USER,
            entity_id=contract_dict["id"],
            entity_name=data.titre,
            details=f"Contrat '{data.titre}' ({data.numero_contrat}) créé"
        )

    return contract_dict


@router.put("/{contract_id}")
async def update_contract(
    contract_id: str,
    data: ContractUpdate,
    current_user: dict = Depends(require_permission("contrats", "edit"))
):
    """Modifier un contrat"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")

    updated = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    return serialize_doc(updated)


@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: str,
    current_user: dict = Depends(require_permission("contrats", "delete"))
):
    """Supprimer un contrat"""
    contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")

    # Supprimer les fichiers attachés
    for pj in contract.get("pieces_jointes", []):
        file_path = pj.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

    await db.contracts.delete_one({"_id": ObjectId(contract_id)})

    if audit_service:
        from models import ActionType, EntityType
        await audit_service.log_action(
            user_id=current_user["id"],
            user_name=f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip(),
            user_email=current_user["email"],
            action=ActionType.DELETE,
            entity_type=EntityType.USER,
            entity_id=contract_id,
            entity_name=contract.get("titre", ""),
            details=f"Contrat '{contract.get('titre', '')}' supprimé"
        )

    return {"message": "Contrat supprimé"}


# --- File Upload ---

@router.post("/{contract_id}/upload")
async def upload_contract_file(
    contract_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("contrats", "edit"))
):
    """Ajouter une pièce jointe à un contrat"""
    contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")

    # Sauvegarder le fichier
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOADS_DIR / unique_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    attachment = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "stored_filename": unique_filename,
        "file_path": str(file_path),
        "size": len(content),
        "content_type": file.content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": current_user.get("id"),
        "uploaded_by_name": f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
    }

    await db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$push": {"pieces_jointes": attachment}}
    )

    return attachment


@router.get("/{contract_id}/download/{file_id}")
async def download_contract_file(
    contract_id: str,
    file_id: str,
    current_user: dict = Depends(require_permission("contrats", "view"))
):
    """Télécharger une pièce jointe"""
    contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")

    attachment = next((pj for pj in contract.get("pieces_jointes", []) if pj["id"] == file_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Pièce jointe non trouvée")

    file_path = attachment["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier non disponible")

    return FileResponse(
        file_path,
        media_type=attachment.get("content_type", "application/octet-stream"),
        filename=attachment["filename"]
    )


@router.delete("/{contract_id}/files/{file_id}")
async def delete_contract_file(
    contract_id: str,
    file_id: str,
    current_user: dict = Depends(require_permission("contrats", "edit"))
):
    """Supprimer une pièce jointe"""
    contract = await db.contracts.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")

    attachment = next((pj for pj in contract.get("pieces_jointes", []) if pj["id"] == file_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Pièce jointe non trouvée")

    # Supprimer le fichier physique
    file_path = attachment.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

    await db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$pull": {"pieces_jointes": {"id": file_id}}}
    )

    return {"message": "Pièce jointe supprimée"}


# --- AI Extraction ---

@router.post("/ai/extract")
async def extract_contract_info(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("contrats", "edit"))
):
    """Extraire les informations d'un contrat via IA (Gemini)"""
    try:
        import tempfile
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Clé LLM non configurée")

        # Sauvegarder temporairement le fichier
        ext = os.path.splitext(file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        mime_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp"
        }
        mime_type = mime_map.get(ext, "application/pdf")

        chat = LlmChat(
            api_key=api_key,
            session_id=f"contract_extract_{uuid.uuid4().hex[:8]}",
            system_message="""Tu es un assistant spécialisé dans l'extraction d'informations de contrats commerciaux.
Analyse le document fourni et extrais les informations suivantes au format JSON strict.
Si une information n'est pas trouvée, utilise null.
Réponds UNIQUEMENT avec le JSON, sans aucun texte autour ni backticks.

Format attendu:
{
  "numero_contrat": "string ou null",
  "titre": "string - objet/titre du contrat",
  "type_contrat": "maintenance|service|location|prestation|autre",
  "date_etablissement": "YYYY-MM-DD ou null",
  "date_debut": "YYYY-MM-DD ou null",
  "date_fin": "YYYY-MM-DD ou null",
  "montant_total": number ou null,
  "periodicite_paiement": "mensuel|trimestriel|annuel",
  "montant_periode": number ou null,
  "mode_paiement": "string ou null",
  "fournisseur_nom": "string - nom de la société",
  "fournisseur_adresse": "string ou null",
  "fournisseur_telephone": "string ou null",
  "fournisseur_email": "string ou null",
  "fournisseur_site_web": "string ou null",
  "contact_nom": "string - personne de contact ou null",
  "contact_telephone": "string ou null",
  "contact_email": "string ou null",
  "notes": "string - résumé des points importants du contrat"
}"""
        ).with_model("gemini", "gemini-2.5-flash")

        file_content = FileContentWithMimeType(
            file_path=tmp_path,
            mime_type=mime_type
        )

        response = await chat.send_message(UserMessage(
            text="Analyse ce contrat et extrais toutes les informations demandées au format JSON.",
            file_contents=[file_content]
        ))

        # Nettoyer le fichier temporaire
        os.unlink(tmp_path)

        # Parser la réponse JSON
        response_text = response.strip()
        # Nettoyer les backticks si présents
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        extracted = json.loads(response_text)
        return {"success": True, "data": extracted}

    except json.JSONDecodeError:
        logger.error(f"Erreur parsing JSON de l'IA: {response_text[:200] if 'response_text' in dir() else 'N/A'}")
        return {"success": False, "error": "L'IA n'a pas pu extraire les informations correctement. Veuillez réessayer."}
    except ImportError:
        raise HTTPException(status_code=500, detail="Module emergentintegrations non installé")
    except Exception as e:
        logger.error(f"Erreur extraction IA: {e}")
        return {"success": False, "error": f"Erreur lors de l'extraction: {str(e)}"}


# --- Email Alerts ---

async def check_contract_alerts():
    """Vérifier les alertes de contrats et envoyer les emails (appelé par le scheduler)"""
    if not db:
        return

    try:
        now = datetime.now(timezone.utc)
        contracts = await db.contracts.find({"statut": "actif"}).to_list(1000)
        alerts_to_send = []

        for contract in contracts:
            date_fin_str = contract.get("date_fin")
            if not date_fin_str:
                continue

            try:
                date_fin = datetime.fromisoformat(date_fin_str.replace("Z", "+00:00")) if isinstance(date_fin_str, str) else date_fin_str
                jours_restants = (date_fin - now).days
                titre = contract.get("titre", "Sans titre")
                numero = contract.get("numero_contrat", "N/A")

                # Alerte d'échéance
                seuil = contract.get("alerte_echeance_jours", 30)
                if 0 < jours_restants <= seuil:
                    alerts_to_send.append({
                        "type": "echeance",
                        "titre": titre,
                        "numero": numero,
                        "fournisseur": contract.get("fournisseur_nom", ""),
                        "jours": jours_restants,
                        "date_fin": date_fin_str
                    })

                # Contrat expiré - mettre à jour le statut
                if jours_restants <= 0:
                    await db.contracts.update_one(
                        {"_id": contract["_id"]},
                        {"$set": {"statut": "expire", "updated_at": now.isoformat()}}
                    )

                # Alerte de résiliation
                seuil_resil = contract.get("alerte_resiliation_jours")
                if seuil_resil and 0 < jours_restants <= seuil_resil:
                    alerts_to_send.append({
                        "type": "resiliation",
                        "titre": titre,
                        "numero": numero,
                        "fournisseur": contract.get("fournisseur_nom", ""),
                        "jours": jours_restants,
                        "date_fin": date_fin_str,
                        "preavis": seuil_resil
                    })

            except (ValueError, TypeError):
                continue

        # Envoyer les alertes par email
        if alerts_to_send:
            await _send_contract_alert_email(alerts_to_send)

        logger.info(f"[Contrats] Vérification terminée: {len(alerts_to_send)} alerte(s)")

    except Exception as e:
        logger.error(f"[Contrats] Erreur vérification alertes: {e}")


async def _send_contract_alert_email(alerts):
    """Envoyer un email récapitulatif des alertes de contrats"""
    try:
        from email_service import send_email

        # Trouver les admins pour envoyer les alertes
        admins = await db.users.find({"role": "ADMIN", "statut": "actif"}).to_list(10)
        if not admins:
            return

        html = """
        <h2>Alertes Contrats - GMAO Iris</h2>
        <table style="border-collapse: collapse; width: 100%;">
        <tr style="background: #f3f4f6;">
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Type</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Contrat</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Fournisseur</th>
            <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Jours restants</th>
        </tr>
        """
        for alert in alerts:
            type_label = "Échéance" if alert["type"] == "echeance" else "Résiliation"
            color = "#dc2626" if alert["jours"] <= 7 else "#f59e0b" if alert["jours"] <= 15 else "#3b82f6"
            html += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb;"><span style="color: {color}; font-weight: bold;">{type_label}</span></td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">{alert['titre']} ({alert['numero']})</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">{alert['fournisseur']}</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: {color};">{alert['jours']} jour(s)</td>
            </tr>
            """
        html += "</table>"

        subject = f"[GMAO Iris] {len(alerts)} alerte(s) contrat(s)"
        for admin in admins:
            email = admin.get("email")
            if email:
                send_email(email, subject, html)

        logger.info(f"[Contrats] Email d'alerte envoyé à {len(admins)} admin(s)")

    except Exception as e:
        logger.error(f"[Contrats] Erreur envoi email alertes: {e}")
