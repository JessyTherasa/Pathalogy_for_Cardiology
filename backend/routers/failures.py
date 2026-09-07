from datetime import datetime, timedelta
import random
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.models import Case, EvidenceEvent, Specimen
from backend.services.audit_service import log_audit
from backend.routers.rbac import require_roles, ADMIN_CARDIOLOGIST

router = APIRouter(
    prefix="/failures",
    tags=["failures"],
    dependencies=[Depends(require_roles(*ADMIN_CARDIOLOGIST))]
)

@router.post("/missing")
def trigger_missing_pathology(
    case_id: str = "CASE-1001",
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 1: Remove/omit pathology result to demonstrate missing evidence detection.
    """
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    deleted = db.query(EvidenceEvent).filter(
        EvidenceEvent.case_id == case_id,
        EvidenceEvent.modality == "Pathology"
    ).delete()

    case.status = "Incomplete"
    case.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Failure Simulation: Missing Pathology",
        resource=case_id,
        result="DETECTED",
        details=f"Removed {deleted} pathology event(s) to simulate missing evidence. Case marked Incomplete.",
        case_id=case_id
    )

    return {
        "status": "success",
        "case_id": case_id,
        "message": f"Pathology evidence removed for {case_id}. Case is now Incomplete.",
        "failure_mode": "Missing Pathology Evidence"
    }

@router.post("/stale")
def trigger_stale_imaging(
    case_id: str = "CASE-1001",
    days_old: int = 45,
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 2: Make imaging evidence older than configured threshold (45 days old).
    """
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    img_events = db.query(EvidenceEvent).filter(
        EvidenceEvent.case_id == case_id,
        EvidenceEvent.modality == "Imaging"
    ).all()

    stale_timestamp = datetime.utcnow() - timedelta(days=days_old)
    for ev in img_events:
        ev.event_timestamp = stale_timestamp
        ev.freshness = "Very Stale"

    case.status = "Needs Review"
    case.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Failure Simulation: Stale Imaging",
        resource=case_id,
        result="DETECTED",
        details=f"Updated imaging events to {days_old} days old. Freshness marked as Very Stale.",
        case_id=case_id
    )

    return {
        "status": "success",
        "case_id": case_id,
        "message": f"Imaging evidence pushed back to {days_old} days ago for {case_id}.",
        "failure_mode": "Stale Diagnostic Imaging"
    }

@router.post("/lineage")
def trigger_lineage_mismatch(
    case_id: str = "CASE-1001",
    mismatch_specimen_id: str = "SPEC-999-ERR",
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 3: Alter molecular specimen ID to an unregistered specimen.
    """
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    mol_event = db.query(EvidenceEvent).filter(
        EvidenceEvent.case_id == case_id,
        EvidenceEvent.modality == "Molecular"
    ).first()

    if not mol_event:
        # Create one if missing
        mol_event = EvidenceEvent(
            event_id=f"EVT-MOL-ERR-{random.randint(100, 999)}",
            case_id=case_id,
            modality="Molecular",
            vendor="Vendor C — GeneCore",
            test_name="Targeted Cardiomyopathy Panel",
            result_summary="Variant identified in LMNA gene",
            interpretation="Pathogenic",
            event_timestamp=datetime.utcnow() - timedelta(days=2),
            freshness="Current",
            specimen_id=mismatch_specimen_id,
            source_system="NGS Core",
            validation_status="Lineage Mismatch"
        )
        db.add(mol_event)
    else:
        mol_event.specimen_id = mismatch_specimen_id
        mol_event.validation_status = "Lineage Mismatch"

    case.status = "Blocked"
    case.updated_at = datetime.utcnow()
    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Failure Simulation: Lineage Mismatch",
        resource=case_id,
        result="DETECTED",
        details=f"Molecular test associated with foreign specimen ID '{mismatch_specimen_id}'. LINEAGE MISMATCH triggered.",
        case_id=case_id
    )

    return {
        "status": "success",
        "case_id": case_id,
        "message": f"Lineage mismatch injected with foreign specimen {mismatch_specimen_id}.",
        "failure_mode": "Specimen Lineage Mismatch"
    }

@router.post("/duplicate")
def trigger_duplicate_event(
    case_id: str = "CASE-1001",
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 4: Inject duplicate event ID into the case timeline.
    """
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    # Find an existing event to duplicate or create two with the same event_id
    dup_id = f"EVT-DUP-SIM-{random.randint(1000, 9999)}"
    now = datetime.utcnow()

    db.add(EvidenceEvent(
        event_id=dup_id,
        case_id=case_id,
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Follow-up Echocardiogram (Source 1)",
        result_summary="LVEF 55%; normal left ventricle",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=1),
        freshness="Current",
        validation_status="Duplicate",
        review_status="Flagged"
    ))
    db.add(EvidenceEvent(
        event_id=dup_id,
        case_id=case_id,
        modality="Imaging",
        vendor="Vendor E — UltraEcho",
        test_name="Follow-up Echocardiogram (Source 2 - Duplicated Transmission)",
        result_summary="LVEF 55%; normal left ventricle",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=1),
        freshness="Current",
        validation_status="Duplicate",
        review_status="Flagged"
    ))

    case.updated_at = now
    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Failure Simulation: Duplicate Event",
        resource=case_id,
        result="DETECTED",
        details=f"Injected duplicate event ID '{dup_id}' from two vendors.",
        case_id=case_id
    )

    return {
        "status": "success",
        "case_id": case_id,
        "duplicate_event_id": dup_id,
        "message": f"Duplicate event ID {dup_id} injected into {case_id}.",
        "failure_mode": "Duplicate Evidence"
    }

@router.post("/conflict")
def trigger_conflicting_evidence(
    case_id: str = "CASE-1001",
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 5: Inject discordant/conflicting findings from two distinct vendors.
    """
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    now = datetime.utcnow()
    evt_id_a = f"EVT-CONF-A-{random.randint(100, 999)}"
    evt_id_b = f"EVT-CONF-B-{random.randint(100, 999)}"

    db.add(EvidenceEvent(
        event_id=evt_id_a,
        case_id=case_id,
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="Troponin I Quantitative",
        result_summary="5.2 ng/L (Normal Baseline, Ref < 16 ng/L)",
        interpretation="Normal",
        event_timestamp=now - timedelta(hours=6),
        freshness="Current",
        validation_status="Conflicting",
        review_status="Flagged"
    ))

    db.add(EvidenceEvent(
        event_id=evt_id_b,
        case_id=case_id,
        modality="Pathology",
        vendor="Vendor D — BioPulse POC",
        test_name="Troponin I Quantitative Bedside Rapid",
        result_summary="162.0 ng/L (Massively elevated, Acute Myocardial Injury)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(hours=5),
        freshness="Current",
        validation_status="Conflicting",
        review_status="Flagged"
    ))

    case.status = "Under Review"
    case.updated_at = now
    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Failure Simulation: Conflicting Evidence",
        resource=case_id,
        result="DETECTED",
        details="Injected contradictory pathology results: Normal (5.2 ng/L) vs Severely Elevated (162 ng/L).",
        case_id=case_id
    )

    return {
        "status": "success",
        "case_id": case_id,
        "message": "Contradictory evidence injected from Vendor A and Vendor D.",
        "failure_mode": "Conflicting Vendor Results"
    }

@router.post("/unauthorized")
def trigger_unauthorized_access(
    case_id: str = "CASE-1005",
    attempted_role: str = "Cardiologist",
    db: Session = Depends(get_db)
):
    """
    Failure Scenario 6: Attempt to access restricted evidence without sufficient privilege.
    """
    log_audit(
        db=db,
        user_role=attempted_role,
        action="Restricted Access Attempt",
        resource=f"{case_id}:Molecular",
        result="BLOCKED",
        details=f"Unauthorized access attempted on restricted consent data by role '{attempted_role}'. Access was blocked.",
        case_id=case_id
    )

    raise HTTPException(
        status_code=403,
        detail=f"Access Restricted: Role '{attempted_role}' is not authorized to inspect restricted consent evidence for {case_id}."
    )
