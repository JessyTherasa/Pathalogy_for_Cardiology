from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.database.session import get_db
from backend.models import Case, EvidenceEvent, Specimen, ReviewDecision, AuditLog
from backend.schemas import CaseItem, LineageGraphResponse, ReviewDecisionItem, AuditLogItem
from backend.services.completeness_engine import evaluate_case_completeness
from backend.services.lineage_engine import build_specimen_lineage
from backend.services.audit_service import log_audit
from backend.routers.rbac import (
    get_current_user, require_roles, ALL_CLINICAL,
    PATHOLOGY_ROLES, IMAGING_ROLES, MOLECULAR_ROLES,
    LINEAGE_ROLES, REVIEW_ROLES, AUDIT_ROLES
)

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=List[CaseItem])
def list_cases(
    search: Optional[str] = None,
    status: Optional[str] = None,
    risk: Optional[str] = None,
    consent: Optional[str] = None,
    modality: Optional[str] = None,
    vendor: Optional[str] = None,
    freshness: Optional[str] = None,
    user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ALL_CLINICAL))
):
    role = current_user["role"]
    query = db.query(Case)

    if status and status != "All":
        query = query.filter(Case.status == status)
    if risk and risk != "All":
        query = query.filter(Case.risk_level == risk)
    if consent and consent != "All":
        query = query.filter(Case.consent_status == consent)

    if search:
        search_term = f"%{search}%"
        matched_case_ids = [
            e.case_id for e in
            db.query(EvidenceEvent).filter(
                or_(
                    EvidenceEvent.event_id.ilike(search_term),
                    EvidenceEvent.specimen_id.ilike(search_term),
                    EvidenceEvent.vendor.ilike(search_term),
                    EvidenceEvent.modality.ilike(search_term),
                    EvidenceEvent.test_name.ilike(search_term)
                )
            ).all()
        ]
        query = query.filter(
            or_(
                Case.case_id.ilike(search_term),
                Case.patient_synthetic_id.ilike(search_term),
                Case.case_id.in_(matched_case_ids)
            )
        )

    cases = query.order_by(desc(Case.created_at)).limit(200).all()
    results = []

    for c in cases:
        events = db.query(EvidenceEvent).filter(EvidenceEvent.case_id == c.case_id).all()
        eval_res = evaluate_case_completeness(events)

        if modality and modality != "All":
            mod_data = eval_res["modality_summary"].get(modality.lower(), {})
            if not mod_data.get("present"):
                continue

        if vendor and vendor != "All":
            has_vendor = any(vendor.lower() in e.vendor.lower() for e in events)
            if not has_vendor:
                continue

        if freshness and freshness != "All":
            has_freshness = any(e.freshness == freshness for e in events)
            if not has_freshness and freshness != eval_res["evidence_health"]:
                continue

        latest_review = db.query(ReviewDecision).filter(ReviewDecision.case_id == c.case_id).order_by(desc(ReviewDecision.created_at)).first()
        rev_status = latest_review.status if latest_review else "Not Started"

        results.append(CaseItem(
            id=c.id,
            case_id=c.case_id,
            patient_synthetic_id=c.patient_synthetic_id,
            age_range=c.age_range,
            gender=c.gender,
            consent_status=c.consent_status,
            risk_level=c.risk_level,
            status=c.status,
            created_at=c.created_at,
            updated_at=c.updated_at,
            completeness_percentage=eval_res["completeness_percentage"],
            pathology=eval_res["modality_summary"]["pathology"],
            imaging=eval_res["modality_summary"]["imaging"],
            molecular=eval_res["modality_summary"]["molecular"],
            evidence_health=eval_res["evidence_health"],
            review_status=rev_status
        ))

    return results


@router.get("/{case_id}")
def get_case_detail(
    case_id: str,
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ALL_CLINICAL))
):
    role = current_user["role"]
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    log_audit(
        db=db,
        user_role=role,
        action="Case Accessed",
        resource=case_id,
        result="SUCCESS",
        details=f"Role '{role}' opened case workspace for {case_id}",
        case_id=case_id
    )

    events = db.query(EvidenceEvent).filter(EvidenceEvent.case_id == case_id).all()
    eval_res = evaluate_case_completeness(events)

    return {
        "case": {
            "id": case.id,
            "case_id": case.case_id,
            "patient_synthetic_id": case.patient_synthetic_id,
            "age_range": case.age_range,
            "gender": case.gender,
            "consent_status": case.consent_status,
            "risk_level": case.risk_level,
            "status": case.status,
            "created_at": case.created_at,
            "updated_at": case.updated_at,
        },
        "evaluation": eval_res
    }


@router.get("/{case_id}/timeline")
def get_case_timeline(
    case_id: str,
    sort: Optional[str] = Query("desc"),
    modality: Optional[str] = Query(None),
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ALL_CLINICAL))
):
    role = current_user["role"]

    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    q = db.query(EvidenceEvent).filter(EvidenceEvent.case_id == case_id)

    if modality and modality != "All":
        q = q.filter(EvidenceEvent.modality == modality)

    # Role-based modality filtering — specialists only see their modality
    if role == "Pathologist":
        q = q.filter(EvidenceEvent.modality == "Pathology")
    elif role == "Imaging Specialist":
        q = q.filter(EvidenceEvent.modality == "Imaging")
    elif role == "Molecular Specialist":
        q = q.filter(EvidenceEvent.modality == "Molecular")

    if sort == "asc":
        q = q.order_by(asc(EvidenceEvent.event_timestamp))
    else:
        q = q.order_by(desc(EvidenceEvent.event_timestamp))

    events = q.all()

    # Consent filter for molecular data
    filtered = []
    for ev in events:
        if case.consent_status == "Restricted" and ev.modality == "Molecular" and role not in ["Administrator", "Reviewer", "Cardiologist"]:
            continue
        filtered.append(ev)

    return {
        "case_id": case_id,
        "total_events": len(filtered),
        "events": [_serialize_event(ev) for ev in filtered]
    }


@router.get("/{case_id}/specimens")
def get_case_specimens(
    case_id: str,
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*LINEAGE_ROLES))
):
    """Specimen lineage — accessible to Cardiologist, Pathologist, Molecular Specialist, Reviewer."""
    role = current_user["role"]
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    specimens = db.query(Specimen).filter(Specimen.case_id == case_id).all()
    events = db.query(EvidenceEvent).filter(EvidenceEvent.case_id == case_id).all()
    lineage = build_specimen_lineage(case_id, specimens, events)
    return lineage



@router.get("/{case_id}/reviews")
def get_case_reviews(
    case_id: str,
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*REVIEW_ROLES))
):
    """Review decisions — Cardiologist and Reviewer only."""
    reviews = db.query(ReviewDecision).filter(ReviewDecision.case_id == case_id).order_by(desc(ReviewDecision.created_at)).all()
    return reviews


@router.get("/{case_id}/audit")
def get_case_audit(
    case_id: str,
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*AUDIT_ROLES))
):
    """Audit trail — Cardiologist, Reviewer, Administrator only."""
    logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(desc(AuditLog.timestamp)).all()
    return logs


def _serialize_event(ev) -> dict:
    return {
        "id": ev.id,
        "event_id": ev.event_id,
        "case_id": ev.case_id,
        "modality": ev.modality,
        "test_name": ev.test_name,
        "vendor": ev.vendor,
        "result_summary": ev.result_summary,
        "interpretation": getattr(ev, "interpretation", None),
        "event_timestamp": ev.event_timestamp,
        "ingestion_timestamp": ev.ingestion_timestamp,
        "freshness": ev.freshness,
        "specimen_id": ev.specimen_id,
        "parent_specimen_id": getattr(ev, "parent_specimen_id", None),
        "source_system": getattr(ev, "source_system", None),
        "device_system": getattr(ev, "device_system", None),
        "validation_status": ev.validation_status,
        "review_status": getattr(ev, "review_status", None),
        "raw_payload": getattr(ev, "raw_payload", None),
        # Computed/legacy aliases for frontend compatibility
        "has_conflict": ev.validation_status == "Conflicting",
        "conflict_note": ev.result_summary if ev.validation_status == "Conflicting" else None,
        "is_duplicate": ev.validation_status == "Duplicate",
        "status": ev.validation_status,
    }

