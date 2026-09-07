import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.models import SystemSetting
from backend.services.seed_generator import seed_database
from backend.services.audit_service import log_audit
from backend.routers.rbac import require_roles, ADMIN_ONLY

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    settings_records = db.query(SystemSetting).all()
    res = {}
    for s in settings_records:
        try:
            res[s.key] = json.loads(s.value_json)
        except Exception:
            res[s.key] = s.value_json

    # Defaults if empty
    if "freshness_thresholds" not in res:
        res["freshness_thresholds"] = {"current_days": 7, "stale_days": 30, "very_stale_days": 60}
    if "required_modalities" not in res:
        res["required_modalities"] = ["Pathology", "Imaging", "Molecular"]

    return res

@router.put("")
def update_settings(
    payload: Dict[str, Any],
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(*ADMIN_ONLY))
):
    for k, v in payload.items():
        s = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        val_str = json.dumps(v) if not isinstance(v, str) else v
        if s:
            s.value_json = val_str
        else:
            db.add(SystemSetting(key=k, value_json=val_str))

    db.commit()

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Settings Updated",
        resource="SystemSettings",
        result="SUCCESS",
        details=f"Updated settings keys: {list(payload.keys())}"
    )

    return {"status": "success", "message": "Settings updated successfully"}

@router.post("/reset")
def reset_database(
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Resets the demo database and restores original clean demonstration dataset.
    """
    seed_database(db, force=True)

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Database Reset",
        resource="System",
        result="SUCCESS",
        details="Demo database was reset to initial baseline state."
    )

    return {"status": "success", "message": "Database reset and re-seeded with 100+ cases and 500+ events."}

@router.post("/regenerate")
def regenerate_dataset(
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    """
    Regenerates fresh randomized synthetic dataset.
    """
    seed_database(db, force=True)

    log_audit(
        db=db,
        user_role=user_role or "Administrator",
        action="Synthetic Dataset Regenerated",
        resource="System",
        result="SUCCESS",
        details="Complete synthetic dataset regeneration executed."
    )

    return {"status": "success", "message": "Fresh synthetic dataset generated."}
