from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.models import ReviewDecision, Case
from backend.schemas import ReviewDecisionCreate, ReviewDecisionItem
from backend.services.audit_service import log_audit
from backend.routers.rbac import require_roles, REVIEW_ROLES

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewDecisionItem)
def submit_review_decision(
    payload: ReviewDecisionCreate,
    user_role: Optional[str] = Header("Reviewer", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*REVIEW_ROLES))
):
    """Submit a review decision — Cardiologist and Reviewer only."""
    role = current_user["role"]
    case = db.query(Case).filter(Case.case_id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {payload.case_id} not found")

    decision = ReviewDecision(
        case_id=payload.case_id,
        reviewer_role=payload.reviewer_role or role,
        reviewer_name=payload.reviewer_name or current_user.get("name", "Clinical Reviewer"),
        status=payload.status,
        decision_text=payload.decision_text,
        missing_evidence_identified=payload.missing_evidence_identified,
        stale_evidence_identified=payload.stale_evidence_identified,
        lineage_issue_identified=payload.lineage_issue_identified,
        created_at=datetime.utcnow()
    )
    db.add(decision)

    if payload.status == "Complete":
        case.status = "Complete"
    elif payload.status == "Needs More Evidence":
        case.status = "Incomplete"
    elif payload.status == "Escalated":
        case.status = "Blocked"
    elif payload.status == "In Review":
        case.status = "Under Review"

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(decision)

    log_audit(
        db=db, user_role=role, action="Review Decision Created",
        resource=payload.case_id, result="SUCCESS",
        details=f"Status: {payload.status}. Notes: {payload.decision_text[:60]}...",
        case_id=payload.case_id
    )
    return decision
