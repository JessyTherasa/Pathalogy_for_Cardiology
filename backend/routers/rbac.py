"""
CardioEvidence — Centralised RBAC Dependency
Enforces role-based access at the FastAPI handler level.

Permission model follows semantic names matching the frontend ROLE_PAGE_ACCESS matrix:
  PERM_CASE_BASIC       → who can view cases/basic case context
  PERM_TIMELINE_VIEW    → who can see the full evidence timeline
  PERM_PATHOLOGY_VIEW   → who can access pathology evidence
  PERM_IMAGING_VIEW     → who can access imaging evidence
  PERM_MOLECULAR_VIEW   → who can access molecular evidence
  PERM_SPECIMEN_VIEW    → who can access specimen lineage
  PERM_REVIEW_VIEW      → who can read/submit review decisions
  PERM_AUDIT_VIEW       → who can view audit trails
  PERM_FAILURE_SIM      → who can trigger failure simulations
  PERM_EXPERIMENT       → who can access experiment data
  PERM_ADMIN            → administrators only
"""

from typing import Optional
from fastapi import Depends, HTTPException, Header

# Import the active sessions store from auth
from backend.routers.auth import _active_sessions, DEMO_USERS


# ─── Core dependency ──────────────────────────────────────────────────────────

def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Validate the Bearer token from the Authorization header.
    Returns the full user dict (including role) or raises HTTP 401.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        email = _active_sessions.get(token)
        if email and email in DEMO_USERS:
            return DEMO_USERS[email]

    raise HTTPException(
        status_code=401,
        detail="Not authenticated. Please include a valid Authorization: Bearer <token> header."
    )


def require_roles(*allowed_roles: str):
    """
    Factory that returns a FastAPI dependency that enforces role membership.

    Usage:
        @router.get("/resource", dependencies=[Depends(require_roles("Cardiologist", "Reviewer"))])

    Raises HTTP 403 if the authenticated user's role is not in allowed_roles.
    """
    def _check(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Access denied. Your role '{user.get('role')}' does not have "
                    f"permission for this resource. Required: {list(allowed_roles)}"
                )
            )
        return user
    return _check


# ─── Semantic permission sets ─────────────────────────────────────────────────
# These match the permission matrix documented in README and the frontend
# ROLE_PAGE_ACCESS / ROLE_WORKSPACE_TABS maps.

# All authenticated clinical users
ALL_CLINICAL = (
    "Cardiologist", "Pathologist", "Imaging Specialist",
    "Molecular Specialist", "Reviewer", "Administrator"
)

# Basic case listing and identification — everyone
PERM_CASE_BASIC = ALL_CLINICAL

# Full evidence timeline (all modalities visible)
PERM_TIMELINE_VIEW = ("Cardiologist", "Reviewer")

# Pathology evidence access
PERM_PATHOLOGY_VIEW = ("Cardiologist", "Pathologist", "Reviewer")

# Imaging evidence access
PERM_IMAGING_VIEW = ("Cardiologist", "Imaging Specialist", "Reviewer")

# Molecular evidence access
PERM_MOLECULAR_VIEW = ("Cardiologist", "Molecular Specialist", "Reviewer")

# Specimen lineage access
PERM_SPECIMEN_VIEW = ("Cardiologist", "Pathologist", "Molecular Specialist", "Reviewer")

# Review decisions: create/read
PERM_REVIEW_VIEW = ("Cardiologist", "Reviewer")

# Audit trail access
PERM_AUDIT_VIEW = ("Cardiologist", "Reviewer", "Administrator")

# Failure simulation (test-mode destructive operations)
PERM_FAILURE_SIM = ("Cardiologist", "Administrator")

# Experiment/comparison module
PERM_EXPERIMENT = ("Cardiologist", "Reviewer", "Administrator")

# Administrator-only operations
PERM_ADMIN = ("Administrator",)

# ─── Legacy aliases (kept for backward compatibility with existing routers) ───
PATHOLOGY_ROLES      = PERM_PATHOLOGY_VIEW
IMAGING_ROLES        = PERM_IMAGING_VIEW
MOLECULAR_ROLES      = PERM_MOLECULAR_VIEW
LINEAGE_ROLES        = PERM_SPECIMEN_VIEW
REVIEW_ROLES         = PERM_REVIEW_VIEW
AUDIT_ROLES          = PERM_AUDIT_VIEW
ADMIN_ONLY           = PERM_ADMIN
ADMIN_CARDIOLOGIST   = PERM_FAILURE_SIM
EXPERIMENT_ROLES     = PERM_EXPERIMENT
