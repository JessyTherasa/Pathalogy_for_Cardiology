import statistics
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.session import get_db
from backend.models import UserFeedback
from backend.schemas import UserFeedbackCreate, UserFeedbackItem, FeedbackMetrics
from backend.services.audit_service import log_audit
from backend.routers.rbac import require_roles, ALL_CLINICAL

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"],
    dependencies=[Depends(require_roles(*ALL_CLINICAL))]
)

@router.get("", response_model=List[UserFeedbackItem])
def list_feedback(db: Session = Depends(get_db)):
    items = db.query(UserFeedback).order_by(desc(UserFeedback.created_at)).all()
    return items

@router.get("/metrics", response_model=FeedbackMetrics)
def get_feedback_metrics(db: Session = Depends(get_db)):
    items = db.query(UserFeedback).all()
    if not items:
        return FeedbackMetrics()

    return FeedbackMetrics(
        total_responses=len(items),
        avg_ease_of_use=round(statistics.mean([i.ease_of_use for i in items]), 2),
        avg_timeline_clarity=round(statistics.mean([i.timeline_clarity for i in items]), 2),
        avg_completeness_confidence=round(statistics.mean([i.completeness_confidence for i in items]), 2),
        avg_time_seconds=round(statistics.mean([i.time_taken_seconds for i in items]), 1)
    )

@router.post("", response_model=UserFeedbackItem)
def submit_feedback(
    payload: UserFeedbackCreate,
    user_role: str = Header("Cardiologist", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    entry = UserFeedback(
        user_role=payload.user_role or user_role,
        task_completed=payload.task_completed,
        time_taken_seconds=payload.time_taken_seconds,
        ease_of_use=payload.ease_of_use,
        timeline_clarity=payload.timeline_clarity,
        completeness_confidence=payload.completeness_confidence,
        comments=payload.comments,
        suggested_improvements=payload.suggested_improvements,
        created_at=datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit(
        db=db,
        user_role=entry.user_role,
        action="User Feedback Submitted",
        resource="UserValidationModule",
        result="SUCCESS",
        details=f"Rating: Ease {entry.ease_of_use}/5, Clarity {entry.timeline_clarity}/5"
    )

    return entry
