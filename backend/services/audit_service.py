from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.models import AuditLog

def log_audit(
    db: Session,
    user_role: str,
    action: str,
    resource: str,
    result: str = "SUCCESS",
    details: Optional[str] = None,
    case_id: Optional[str] = None
) -> AuditLog:
    """
    Records an entry in the system audit log.
    """
    entry = AuditLog(
        case_id=case_id,
        user_role=user_role or "Anonymous",
        action=action,
        resource=resource,
        result=result,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
