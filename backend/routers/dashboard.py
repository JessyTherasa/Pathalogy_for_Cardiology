from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.session import get_db
from backend.models import Case, EvidenceEvent, Vendor
from backend.schemas import DashboardMetrics
from backend.services.completeness_engine import evaluate_case_completeness
from backend.routers.rbac import require_roles, ALL_CLINICAL

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ALL_CLINICAL))
):
    all_cases = db.query(Case).all()
    all_events = db.query(EvidenceEvent).all()

    total_cases = len(all_cases)
    complete_cases = 0
    needs_review_cases = 0
    incomplete_cases = 0
    missing_evidence_count = 0
    stale_evidence_count = 0

    # Group events by case_id for speed
    events_by_case = {}
    for ev in all_events:
        events_by_case.setdefault(ev.case_id, []).append(ev)

    for c in all_cases:
        c_events = events_by_case.get(c.case_id, [])
        eval_res = evaluate_case_completeness(c_events)

        if eval_res["is_complete"] and c.status == "Complete":
            complete_cases += 1
        elif c.status == "Needs Review":
            needs_review_cases += 1
        elif c.status in ["Incomplete", "Blocked"]:
            incomplete_cases += 1

        if len(eval_res["missing_modalities"]) > 0:
            missing_evidence_count += 1
        if any(e.freshness in ["Stale", "Very Stale"] for e in c_events):
            stale_evidence_count += 1

    # Modality counts
    mod_counts = {
        "Pathology": 0,
        "Imaging": 0,
        "Molecular": 0
    }
    for ev in all_events:
        m = ev.modality.capitalize()
        mod_counts[m] = mod_counts.get(m, 0) + 1

    # Vendor counts
    vendor_counts = {}
    for ev in all_events:
        v = ev.vendor
        vendor_counts[v] = vendor_counts.get(v, 0) + 1

    return DashboardMetrics(
        total_cases=total_cases,
        complete_cases=complete_cases,
        cases_needing_review=needs_review_cases,
        incomplete_cases=incomplete_cases,
        missing_evidence_cases=missing_evidence_count,
        stale_evidence_cases=stale_evidence_count,
        modality_counts=mod_counts,
        vendor_counts=vendor_counts,
        recent_events_count=len(all_events)
    )
