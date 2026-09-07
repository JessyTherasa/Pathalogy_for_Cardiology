from typing import Optional, List
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.session import get_db
from backend.models import AuditLog
from backend.schemas import AuditLogItem
from backend.routers.rbac import require_roles, AUDIT_ROLES

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=List[AuditLogItem])
def list_audit_logs(
    user_role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    limit: int = 150,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*AUDIT_ROLES))
):

    query = db.query(AuditLog)

    if user_role and user_role != "All":
        query = query.filter(AuditLog.user_role == user_role)
    if action and action != "All":
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if result and result != "All":
        query = query.filter(AuditLog.result == result)
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)

    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return logs
