import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database.session import Base, get_db
from backend.services.seed_generator import seed_database
from backend.services.freshness_engine import calculate_freshness
from backend.services.completeness_engine import evaluate_case_completeness
from backend.models import EvidenceEvent, Specimen, Case
from backend.routers.auth import _active_sessions

from sqlalchemy.pool import StaticPool

# ─── In-memory test database ────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ─── Session-scoped test setup ────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db, force=True)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


# ─── Auth helper — injects real demo tokens for each role ────────────────────
def get_auth_headers(role: str = "Cardiologist") -> dict:
    """
    Returns Authorization headers by injecting a test token directly into
    the in-memory session store (avoids round-trip to /api/auth/login).
    """
    import secrets
    role_to_email = {
        "Cardiologist":         "cardio@cardioevidence.demo",
        "Pathologist":          "pathology@cardioevidence.demo",
        "Imaging Specialist":   "imaging@cardioevidence.demo",
        "Molecular Specialist": "molecular@cardioevidence.demo",
        "Reviewer":             "reviewer@cardioevidence.demo",
        "Administrator":        "admin@cardioevidence.demo",
    }
    token = secrets.token_hex(16)
    _active_sessions[token] = role_to_email[role]
    return {"Authorization": f"Bearer {token}"}


# ─── Fixtures ─────────────────────────────────────────────────────────────────
@pytest.fixture
def client():
    return TestClient(app)


# ─── Pre-built header sets for common roles ──────────────────────────────────
@pytest.fixture
def cardio_headers():
    return get_auth_headers("Cardiologist")

@pytest.fixture
def reviewer_headers():
    return get_auth_headers("Reviewer")

@pytest.fixture
def admin_headers():
    return get_auth_headers("Administrator")

@pytest.fixture
def path_headers():
    return get_auth_headers("Pathologist")


# ─── Tests ───────────────────────────────────────────────────────────────────

# 1. Test Case Retrieval
def test_case_retrieval(client, cardio_headers):
    response = client.get("/cases", headers=cardio_headers)
    assert response.status_code == 200
    cases = response.json()
    assert len(cases) >= 10
    case_ids = [c["case_id"] for c in cases]
    assert "CASE-1001" in case_ids
    assert "CASE-1002" in case_ids
    assert "CASE-1003" in case_ids


# 2. Test Timeline Ordering
def test_timeline_ordering(client, cardio_headers):
    res_desc = client.get("/cases/CASE-1001/timeline?sort=desc", headers=cardio_headers)
    assert res_desc.status_code == 200
    data = res_desc.json()
    events = data["events"]
    assert len(events) >= 3
    timestamps = [e["event_timestamp"] for e in events]
    assert timestamps == sorted(timestamps, reverse=True)

    res_asc = client.get("/cases/CASE-1001/timeline?sort=asc", headers=cardio_headers)
    assert res_asc.status_code == 200
    asc_timestamps = [e["event_timestamp"] for e in res_asc.json()["events"]]
    assert asc_timestamps == sorted(asc_timestamps, reverse=False)



# 3. Test Freshness Engine (unit test — no HTTP call needed)
def test_freshness_calculation():
    now = datetime.utcnow()
    assert calculate_freshness(now - timedelta(days=2)) == "Current"
    assert calculate_freshness(now - timedelta(days=15)) == "Stale"
    assert calculate_freshness(now - timedelta(days=45)) == "Very Stale"
    assert calculate_freshness(None) == "Missing"


# 4. Test Missing Evidence Detection & Completeness (unit test)
def test_missing_evidence_and_completeness():
    now = datetime.utcnow()
    events = [
        EvidenceEvent(
            event_id="EVT-T1", case_id="CASE-TEST", modality="Pathology", vendor="Vendor A",
            test_name="Troponin", result_summary="10 ng/L", event_timestamp=now, validation_status="Valid"
        )
    ]
    res = evaluate_case_completeness(events)
    assert res["completeness_percentage"] == 33
    assert res["is_complete"] is False
    assert "Imaging" in res["missing_modalities"]
    assert "Molecular" in res["missing_modalities"]


# 5. Test Specimen Lineage Mismatch Detection
def test_lineage_mismatch_detection(client, cardio_headers):
    response = client.get("/cases/CASE-1003/specimens", headers=cardio_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["has_mismatch"] is True
    assert "SPEC-999" in (data["mismatch_details"] or "")


# 6. Test Duplicate Event Detection
def test_duplicate_event_detection(client, cardio_headers):
    dup_payload = {
        "event_id": "EVT-DUP-TEST-01",
        "case_id": "CASE-1001",
        "modality": "Pathology",
        "vendor": "Vendor A — CoreLab",
        "test_name": "Troponin Check",
        "result_summary": "15 ng/L",
        "interpretation": "Normal",
        "event_timestamp": datetime.utcnow().isoformat(),
        "source_system": "LIMS",
        "device_system": "Analyzer",
        "validation_status": "Valid",
        "review_status": "Unreviewed"
    }
    # First submission
    r1 = client.post("/evidence/CASE-1001", json=dup_payload, headers=cardio_headers)
    assert r1.status_code == 200
    assert r1.json()["is_duplicate"] is False

    # Second submission with SAME event_id — should be flagged as duplicate
    r2 = client.post("/evidence/CASE-1001", json=dup_payload, headers=cardio_headers)
    assert r2.status_code == 200
    assert r2.json()["is_duplicate"] is True


# 7. Test Conflicting Vendor Results
def test_conflicting_vendor_detection(client, admin_headers, cardio_headers):
    res = client.post("/failures/conflict?case_id=CASE-1001", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    timeline = client.get("/cases/CASE-1001/timeline", headers=cardio_headers).json()
    # After conflict injection there should be conflicting events
    conflicting = [e for e in timeline["events"] if e.get("has_conflict") is True]
    assert len(conflicting) >= 1


# 8. Test Role-Based Visibility & RBAC Enforcement
def test_role_based_visibility_and_consent(client, cardio_headers):
    # Cardiologist can access any timeline
    res_cardio = client.get("/cases/CASE-1005/timeline", headers=cardio_headers)
    assert res_cardio.status_code == 200

    # Unauthenticated access must return 401
    unauth_res = client.get("/cases/CASE-1001/timeline")
    assert unauth_res.status_code == 401

    # Pathologist trying to access /failures must return 403 (not their role)
    path_h = get_auth_headers("Pathologist")
    path_res = client.post("/failures/conflict?case_id=CASE-1001", headers=path_h)
    assert path_res.status_code == 403

    # Imaging Specialist trying to access /reviews must return 403
    img_h = get_auth_headers("Imaging Specialist")
    img_res = client.post("/reviews", json={
        "case_id": "CASE-1001", "reviewer_role": "Imaging Specialist",
        "reviewer_name": "Test", "status": "In Review",
        "decision_text": "Test decision"
    }, headers=img_h)
    assert img_res.status_code == 403


# 9. Test Review Decision Creation
def test_review_decision_creation(client, reviewer_headers):
    review_data = {
        "case_id": "CASE-1002",
        "reviewer_role": "Reviewer",
        "reviewer_name": "Dr. Multidisciplinary Lead",
        "status": "Needs More Evidence",
        "decision_text": "Requires fresh troponin panel due to stale pathology results.",
        "missing_evidence_identified": "Molecular NGS Panel",
        "stale_evidence_identified": "Troponin T (>30d)"
    }
    response = client.post("/reviews", json=review_data, headers=reviewer_headers)
    assert response.status_code == 200
    created = response.json()
    assert created["status"] == "Needs More Evidence"
    assert created["case_id"] == "CASE-1002"


# 10. Test Audit Trail Logging
def test_audit_logging(client, cardio_headers, reviewer_headers):
    client.get("/cases/CASE-1001", headers=cardio_headers)
    audit_res = client.get("/audit?case_id=CASE-1001", headers=reviewer_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    actions = [l["action"] for l in logs]
    assert any("Case" in a for a in actions)


# 11. Test Experiment Calculation Engine
def test_experiment_calculation(client, cardio_headers):
    run_res = client.post("/experiment/run", headers=cardio_headers)
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["baseline_time_seconds"] > run_data["prototype_time_seconds"]

    summary_res = client.get("/experiment/results", headers=cardio_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["time_reduction_percentage"] > 70.0
    assert summary["time_saved_minutes"] > 10.0


# 12. Test Dashboard KPI Metrics
def test_dashboard_metrics(client, cardio_headers):
    res = client.get("/dashboard/metrics", headers=cardio_headers)
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["total_cases"] >= 10
    assert metrics["complete_cases"] >= 1
    assert metrics["missing_evidence_cases"] >= 1
    assert metrics["stale_evidence_cases"] >= 1
    assert "Pathology" in metrics["modality_counts"]
    assert "Imaging" in metrics["modality_counts"]
    assert "Molecular" in metrics["modality_counts"]


# 13. Test Case Creation By Any Role
def test_case_creation_all_roles(client):
    for role in ["Cardiologist", "Pathologist", "Imaging Specialist", "Molecular Specialist", "Reviewer", "Administrator"]:
        headers = get_auth_headers(role)
        res = client.post("/cases?age_range=50-59&gender=F&risk_level=Moderate&consent_status=Granted", headers=headers)
        assert res.status_code == 200, f"Role {role} failed to create case: {res.text}"
        data = res.json()
        assert data["status"] == "success"
        assert "CASE-" in data["case_id"]


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION B — RBAC CROSS-ROLE AUTHORIZATION TESTS
# Spec requirement: each role must be allowed/denied at the backend layer
# independently of any frontend navigation hiding.
# ═══════════════════════════════════════════════════════════════════════════════

# ─── B1. Authentication ───────────────────────────────────────────────────────

def test_auth_invalid_login_rejected(client):
    """Incorrect credentials must return 401."""
    r = client.post("/api/auth/login", json={"email": "bad@user.com", "password": "wrong"})
    assert r.status_code == 401

def test_auth_all_demo_accounts_valid():
    """All 6 demo accounts must be accepted by the login endpoint."""
    from fastapi.testclient import TestClient as TC
    c = TC(app)
    accounts = [
        ("cardio@cardioevidence.demo",    "Cardio@123"),
        ("pathology@cardioevidence.demo", "Pathology@123"),
        ("imaging@cardioevidence.demo",   "Imaging@123"),
        ("molecular@cardioevidence.demo", "Molecular@123"),
        ("reviewer@cardioevidence.demo",  "Reviewer@123"),
        ("admin@cardioevidence.demo",     "Admin@123"),
    ]
    for email, password in accounts:
        r = c.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, f"Login failed for {email}: {r.text}"
        data = r.json()
        assert "token" in data
        # role is nested in the user object
        assert "role" in data.get("user", data)

def test_unauthenticated_requests_return_401(client):
    """All protected endpoints must return 401 without a token."""
    protected = [
        "/cases", "/cases/CASE-1001", "/cases/CASE-1001/timeline",
        "/dashboard/metrics", "/audit",
    ]
    for url in protected:
        r = client.get(url)
        assert r.status_code == 401, f"Expected 401 for {url}, got {r.status_code}"


# ─── B2. Cardiologist — Full Access ──────────────────────────────────────────

def test_cardiologist_full_clinical_access(client, cardio_headers):
    """Cardiologist must reach every protected endpoint with 200."""
    assert client.get("/cases", headers=cardio_headers).status_code == 200
    assert client.get("/cases/CASE-1001", headers=cardio_headers).status_code == 200
    assert client.get("/cases/CASE-1001/timeline", headers=cardio_headers).status_code == 200
    assert client.get("/cases/CASE-1001/specimens", headers=cardio_headers).status_code == 200
    assert client.get("/cases/CASE-1001/reviews", headers=cardio_headers).status_code == 200
    assert client.get("/cases/CASE-1001/audit", headers=cardio_headers).status_code == 200
    assert client.get("/dashboard/metrics", headers=cardio_headers).status_code == 200
    assert client.get("/experiment/results", headers=cardio_headers).status_code == 200

def test_cardiologist_modality_evidence_access(client, cardio_headers):
    """Cardiologist must be able to read evidence detail for all modalities."""
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_headers).json()
    events = tl.get("events", [])
    assert len(events) >= 3
    # Ensure events of all 3 modalities are visible
    modalities = {e["modality"].lower() for e in events}
    assert "pathology" in modalities
    assert "imaging" in modalities
    assert "molecular" in modalities


# ─── B3. Pathologist ─────────────────────────────────────────────────────────

def test_pathologist_allowed_endpoints(client, path_headers):
    """Pathologist can access cases, own timeline events, specimens."""
    assert client.get("/cases", headers=path_headers).status_code == 200
    assert client.get("/cases/CASE-1001", headers=path_headers).status_code == 200
    assert client.get("/cases/CASE-1001/specimens", headers=path_headers).status_code == 200
    tl = client.get("/cases/CASE-1001/timeline", headers=path_headers).json()
    # Backend must return only Pathology events for Pathologist
    assert all(e["modality"].lower() == "pathology" for e in tl.get("events", []))

def test_pathologist_denied_reviews(client, path_headers):
    """Pathologist must be denied access to review decisions (403)."""
    r = client.get("/cases/CASE-1001/reviews", headers=path_headers)
    assert r.status_code == 403

def test_pathologist_denied_imaging_evidence(client, path_headers):
    """Pathologist attempting to access Imaging events via evidence endpoint must get 403."""
    # Find an imaging event via admin
    admin_h = get_auth_headers("Administrator")
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    imaging_events = [e for e in tl.get("events", []) if e["modality"].lower() == "imaging"]
    if imaging_events:
        event_id = imaging_events[0]["event_id"]
        r = client.get(f"/evidence/{event_id}", headers=path_headers)
        assert r.status_code == 403

def test_pathologist_denied_molecular_evidence(client, path_headers):
    """Pathologist attempting to access Molecular events via evidence endpoint must get 403."""
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    mol_events = [e for e in tl.get("events", []) if e["modality"].lower() == "molecular"]
    if mol_events:
        event_id = mol_events[0]["event_id"]
        r = client.get(f"/evidence/{event_id}", headers=path_headers)
        assert r.status_code == 403

def test_pathologist_denied_failure_simulation(client, path_headers):
    """Pathologist must be denied failure simulation (403)."""
    r = client.post("/failures/conflict?case_id=CASE-1001", headers=path_headers)
    assert r.status_code == 403

def test_pathologist_denied_admin(client, path_headers):
    """Pathologist must be denied admin settings write (403)."""
    r = client.put("/settings", json={"staleness_threshold_days": 30}, headers=path_headers)
    assert r.status_code == 403


# ─── B4. Imaging Specialist ───────────────────────────────────────────────────

def test_imaging_specialist_allowed_endpoints(client):
    """Imaging Specialist can access cases and their own timeline events."""
    img_h = get_auth_headers("Imaging Specialist")
    assert client.get("/cases", headers=img_h).status_code == 200
    assert client.get("/cases/CASE-1001", headers=img_h).status_code == 200
    tl = client.get("/cases/CASE-1001/timeline", headers=img_h).json()
    # Backend must return only Imaging events for Imaging Specialist
    assert all(e["modality"].lower() == "imaging" for e in tl.get("events", []))

def test_imaging_specialist_denied_pathology_evidence(client):
    """Imaging Specialist accessing Pathology evidence must get 403."""
    img_h = get_auth_headers("Imaging Specialist")
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    path_events = [e for e in tl.get("events", []) if e["modality"].lower() == "pathology"]
    if path_events:
        r = client.get(f"/evidence/{path_events[0]['event_id']}", headers=img_h)
        assert r.status_code == 403

def test_imaging_specialist_denied_molecular_evidence(client):
    """Imaging Specialist accessing Molecular evidence must get 403."""
    img_h = get_auth_headers("Imaging Specialist")
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    mol_events = [e for e in tl.get("events", []) if e["modality"].lower() == "molecular"]
    if mol_events:
        r = client.get(f"/evidence/{mol_events[0]['event_id']}", headers=img_h)
        assert r.status_code == 403

def test_imaging_specialist_denied_reviews(client):
    """Imaging Specialist must be denied review decisions (403)."""
    img_h = get_auth_headers("Imaging Specialist")
    r = client.get("/cases/CASE-1001/reviews", headers=img_h)
    assert r.status_code == 403

def test_imaging_specialist_denied_specimens(client):
    """Imaging Specialist must be denied specimen lineage (403)."""
    img_h = get_auth_headers("Imaging Specialist")
    r = client.get("/cases/CASE-1001/specimens", headers=img_h)
    assert r.status_code == 403


# ─── B5. Molecular Specialist ─────────────────────────────────────────────────

def test_molecular_specialist_allowed_endpoints(client):
    """Molecular Specialist can access cases, molecular timeline, and specimens."""
    mol_h = get_auth_headers("Molecular Specialist")
    assert client.get("/cases", headers=mol_h).status_code == 200
    tl = client.get("/cases/CASE-1001/timeline", headers=mol_h).json()
    assert all(e["modality"].lower() == "molecular" for e in tl.get("events", []))
    assert client.get("/cases/CASE-1001/specimens", headers=mol_h).status_code == 200

def test_molecular_specialist_denied_imaging_evidence(client):
    """Molecular Specialist accessing Imaging evidence must get 403."""
    mol_h = get_auth_headers("Molecular Specialist")
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    img_events = [e for e in tl.get("events", []) if e["modality"].lower() == "imaging"]
    if img_events:
        r = client.get(f"/evidence/{img_events[0]['event_id']}", headers=mol_h)
        assert r.status_code == 403

def test_molecular_specialist_denied_pathology_evidence(client):
    """Molecular Specialist accessing Pathology evidence must get 403."""
    mol_h = get_auth_headers("Molecular Specialist")
    cardio_h = get_auth_headers("Cardiologist")
    tl = client.get("/cases/CASE-1001/timeline", headers=cardio_h).json()
    path_events = [e for e in tl.get("events", []) if e["modality"].lower() == "pathology"]
    if path_events:
        r = client.get(f"/evidence/{path_events[0]['event_id']}", headers=mol_h)
        assert r.status_code == 403


# ─── B6. Reviewer ────────────────────────────────────────────────────────────

def test_reviewer_allowed_review_and_audit(client, reviewer_headers):
    """Reviewer can access timeline, reviews, and audit."""
    assert client.get("/cases", headers=reviewer_headers).status_code == 200
    assert client.get("/cases/CASE-1001/timeline", headers=reviewer_headers).status_code == 200
    assert client.get("/cases/CASE-1001/reviews", headers=reviewer_headers).status_code == 200
    assert client.get("/audit", headers=reviewer_headers).status_code == 200

def test_reviewer_denied_failure_simulation(client, reviewer_headers):
    """Reviewer must be denied failure simulation (403)."""
    r = client.post("/failures/conflict?case_id=CASE-1001", headers=reviewer_headers)
    assert r.status_code == 403

def test_reviewer_denied_admin_settings(client, reviewer_headers):
    """Reviewer must be denied admin settings write (403)."""
    r = client.put("/settings", json={"staleness_threshold_days": 30}, headers=reviewer_headers)
    assert r.status_code == 403


# ─── B7. Administrator ───────────────────────────────────────────────────────

def test_administrator_allowed_endpoints(client, admin_headers):
    """Administrator can access all areas including clinical workspaces, audit, failures, experiment, settings."""
    assert client.get("/cases", headers=admin_headers).status_code == 200
    assert client.get("/cases/CASE-1001", headers=admin_headers).status_code == 200
    assert client.get("/cases/CASE-1001/timeline", headers=admin_headers).status_code == 200
    assert client.get("/cases/CASE-1001/specimens", headers=admin_headers).status_code == 200
    assert client.get("/cases/CASE-1001/reviews", headers=admin_headers).status_code == 200
    assert client.get("/audit", headers=admin_headers).status_code == 200
    assert client.post("/failures/conflict?case_id=CASE-1001", headers=admin_headers).status_code == 200
    assert client.get("/experiment/results", headers=admin_headers).status_code == 200
    assert client.put("/settings", json={"staleness_threshold_days": 30}, headers=admin_headers).status_code == 200
