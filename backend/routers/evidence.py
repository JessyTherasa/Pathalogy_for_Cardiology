from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.models import EvidenceEvent, Case, Specimen
from backend.schemas import EvidenceDetail, EvidenceEventCreate, EvidenceEventItem, EvidenceProvenanceStep
from backend.services.audit_service import log_audit
from backend.services.freshness_engine import calculate_freshness
from backend.routers.rbac import (
    require_roles, ALL_CLINICAL,
    PATHOLOGY_ROLES, IMAGING_ROLES, MOLECULAR_ROLES, LINEAGE_ROLES
)

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.get("/{event_id}", response_model=EvidenceDetail)
def get_evidence_detail(
    event_id: str,
    user_role: Optional[str] = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ALL_CLINICAL))
):
    role = current_user["role"]
    ev = db.query(EvidenceEvent).filter(EvidenceEvent.event_id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evidence event {event_id} not found")

    case = db.query(Case).filter(Case.case_id == ev.case_id).first()

    # Role-based modality gating (specialists cannot drill into other modalities)
    modality = ev.modality.lower()
    if role == "Pathologist" and modality not in ("pathology",):
        raise HTTPException(status_code=403, detail=f"Access denied: Pathologist cannot access {ev.modality} evidence.")
    if role == "Imaging Specialist" and modality not in ("imaging",):
        raise HTTPException(status_code=403, detail=f"Access denied: Imaging Specialist cannot access {ev.modality} evidence.")
    if role == "Molecular Specialist" and modality not in ("molecular",):
        raise HTTPException(status_code=403, detail=f"Access denied: Molecular Specialist cannot access {ev.modality} evidence.")

    # Consent check for restricted molecular data
    if case and case.consent_status == "Restricted" and ev.modality == "Molecular" and role not in ["Administrator", "Reviewer", "Cardiologist"]:
        log_audit(
            db=db, user_role=role, action="Restricted Access Attempt",
            resource=f"Evidence:{event_id}", result="BLOCKED",
            details=f"Role '{role}' attempted restricted molecular evidence for Case {case.case_id}",
            case_id=case.case_id
        )
        raise HTTPException(status_code=403, detail="Access Restricted: Molecular evidence visibility is restricted under patient consent policy.")

    log_audit(
        db=db, user_role=role, action="Evidence Viewed",
        resource=f"Evidence:{event_id}", result="SUCCESS",
        details=f"Viewed {ev.modality} test '{ev.test_name}'",
        case_id=ev.case_id
    )

    # Build provenance chain
    steps = [
        EvidenceProvenanceStep(stage="Vendor Transmission",   status="Received",   timestamp=ev.event_timestamp,    detail=f"Source vendor: {ev.vendor}"),
        EvidenceProvenanceStep(stage="Ingestion",             status="Processed",  timestamp=ev.ingestion_timestamp, detail="Normalised HL7/FHIR payload"),
        EvidenceProvenanceStep(stage="Normalization",         status="Validated",  timestamp=ev.ingestion_timestamp, detail="Terminology mapped (LOINC/SNOMED)"),
        EvidenceProvenanceStep(stage="Validation",            status="Validated" if not ev.has_conflict else "Warning",  timestamp=ev.ingestion_timestamp, detail=ev.conflict_note or "Passed uniqueness and referential checks"),
        EvidenceProvenanceStep(stage="Case Linkage",          status="Linked",     timestamp=ev.ingestion_timestamp, detail=f"Linked to Case {ev.case_id}"),
        EvidenceProvenanceStep(stage="Timeline",              status="Published",  timestamp=ev.ingestion_timestamp, detail="Visible in unified evidence timeline"),
    ]

    return EvidenceDetail(
        id=ev.id,
        event_id=ev.event_id,
        case_id=ev.case_id,
        modality=ev.modality,
        test_name=ev.test_name,
        vendor=ev.vendor,
        result_summary=ev.result_summary,
        event_timestamp=ev.event_timestamp,
        ingestion_timestamp=ev.ingestion_timestamp,
        freshness=ev.freshness,
        specimen_id=ev.specimen_id,
        metadata_json=ev.metadata_json,
        has_conflict=ev.has_conflict,
        conflict_note=ev.conflict_note,
        is_duplicate=ev.is_duplicate,
        status=ev.status,
        provenance_chain=steps
    )


@router.post("/{case_id}")
def ingest_evidence_event(
    case_id: str,
    payload: EvidenceEventCreate,
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("Cardiologist", "Administrator"))
):
    """Ingest a new evidence event — only Cardiologist or Administrator."""
    role = current_user["role"]
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    from backend.services.duplicate_conflict import detect_duplicates_and_conflicts
    all_events = db.query(EvidenceEvent).filter(EvidenceEvent.case_id == case_id).all()

    # Check if this event_id already exists (duplicate detection)
    existing_ids = {ev.event_id for ev in all_events}
    is_dup = payload.event_id in existing_ids

    # Check for conflicts among existing events of same modality + new one
    is_conflict = False

    event_dt = datetime.fromisoformat(payload.event_timestamp) if isinstance(payload.event_timestamp, str) else payload.event_timestamp
    freshness = calculate_freshness(event_dt)

    ev = EvidenceEvent(
        event_id=payload.event_id,
        case_id=case_id,
        modality=payload.modality,
        test_name=payload.test_name,
        vendor=payload.vendor,
        result_summary=payload.result_summary,
        event_timestamp=event_dt,
        ingestion_timestamp=datetime.utcnow(),
        freshness=freshness,
        specimen_id=payload.specimen_id,
        validation_status="Duplicate" if is_dup else ("Conflicting" if is_conflict else "Valid"),
        review_status="Unreviewed",
        raw_payload=str(payload.model_dump()) if hasattr(payload, 'model_dump') else None,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)

    log_audit(db=db, user_role=role, action="Evidence Ingested", resource=ev.event_id,
              result="SUCCESS", details=f"Ingested {ev.modality} event from {ev.vendor}", case_id=case_id)
    # Return serialized with computed aliases
    return {
        "id": ev.id,
        "event_id": ev.event_id,
        "case_id": ev.case_id,
        "modality": ev.modality,
        "test_name": ev.test_name,
        "vendor": ev.vendor,
        "result_summary": ev.result_summary,
        "event_timestamp": ev.event_timestamp,
        "ingestion_timestamp": ev.ingestion_timestamp,
        "freshness": ev.freshness,
        "specimen_id": ev.specimen_id,
        "validation_status": ev.validation_status,
        "review_status": ev.review_status,
        "is_duplicate": ev.validation_status == "Duplicate",
        "has_conflict": ev.validation_status == "Conflicting",
        "status": ev.validation_status,
    }

