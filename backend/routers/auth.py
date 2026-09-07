"""
CardioEvidence — Authentication Router
Provides demo login/logout endpoints for prototype demonstration.
SYNTHETIC DATA — NOT FOR CLINICAL USE.
"""

import secrets
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Demo user store — 6 roles including the new Imaging Specialist
# ---------------------------------------------------------------------------
DEMO_USERS: dict[str, dict] = {
    "cardio@cardioevidence.demo": {
        "email": "cardio@cardioevidence.demo",
        "password": "Cardio@123",
        "name": "Dr. Elena Vance, MD",
        "title": "Attending Cardiologist",
        "department": "Cardiovascular Medicine",
        "role": "Cardiologist",
        "initials": "EV"
    },
    "pathology@cardioevidence.demo": {
        "email": "pathology@cardioevidence.demo",
        "password": "Pathology@123",
        "name": "Dr. Marcus Thorne, MD, FCAP",
        "title": "Senior Cardiovascular Pathologist",
        "department": "Anatomic & Clinical Pathology",
        "role": "Pathologist",
        "initials": "MT"
    },
    "imaging@cardioevidence.demo": {
        "email": "imaging@cardioevidence.demo",
        "password": "Imaging@123",
        "name": "Dr. Priya Desai, MD",
        "title": "Cardiovascular Imaging Specialist",
        "department": "Cardiac Imaging & Radiology",
        "role": "Imaging Specialist",
        "initials": "PD"
    },
    "molecular@cardioevidence.demo": {
        "email": "molecular@cardioevidence.demo",
        "password": "Molecular@123",
        "name": "Dr. Sarah Lin, PhD, FACMG",
        "title": "Lead Clinical Molecular Geneticist",
        "department": "Genomic Medicine",
        "role": "Molecular Specialist",
        "initials": "SL"
    },
    "reviewer@cardioevidence.demo": {
        "email": "reviewer@cardioevidence.demo",
        "password": "Reviewer@123",
        "name": "Dr. James Holloway, MD",
        "title": "Multidisciplinary Panel Lead / Quality Reviewer",
        "department": "Clinical Governance",
        "role": "Reviewer",
        "initials": "JH"
    },
    "admin@cardioevidence.demo": {
        "email": "admin@cardioevidence.demo",
        "password": "Admin@123",
        "name": "System Admin",
        "title": "Health Informatics Systems Administrator",
        "department": "Clinical IT Operations",
        "role": "Administrator",
        "initials": "SA"
    }
}

# In-memory token store: token -> user_email
# Exported so rbac.py can import it directly.
_active_sessions: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    email: str
    name: str
    title: str
    department: str
    role: str
    initials: str


class LoginResponse(BaseModel):
    authenticated: bool
    token: str
    user: UserInfo


class MeResponse(BaseModel):
    authenticated: bool
    user: UserInfo


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """Authenticate a demo user and return a session token."""
    user = DEMO_USERS.get(payload.email.lower().strip())
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = secrets.token_hex(32)
    _active_sessions[token] = user["email"]

    return LoginResponse(
        authenticated=True,
        token=token,
        user=UserInfo(
            email=user["email"],
            name=user["name"],
            title=user["title"],
            department=user["department"],
            role=user["role"],
            initials=user["initials"]
        )
    )


@router.get("/me", response_model=MeResponse)
def get_me(authorization: Optional[str] = Header(default=None)):
    """Return the current authenticated user from a Bearer token."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    email = _active_sessions.get(token)
    if not email or email not in DEMO_USERS:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")

    user = DEMO_USERS[email]
    return MeResponse(
        authenticated=True,
        user=UserInfo(
            email=user["email"],
            name=user["name"],
            title=user["title"],
            department=user["department"],
            role=user["role"],
            initials=user["initials"]
        )
    )


@router.post("/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    """Invalidate a session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        _active_sessions.pop(token, None)
    return {"logged_out": True}


@router.get("/demo-accounts")
def list_demo_accounts():
    """Return demo account emails (no passwords) for the login page."""
    accounts = [
        {"email": u["email"], "role": u["role"], "name": u["name"], "title": u["title"]}
        for u in DEMO_USERS.values()
    ]
    return {"accounts": accounts}
