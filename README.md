# CardioEvidence

**Multidisciplinary Clinical Evidence Timeline — Research & Demonstration Prototype**

> ⚠️ **SYNTHETIC DATA ONLY** — All data is de-identified and computer-generated. This system is NOT for clinical use, diagnosis, or treatment decisions.

---

## Problem Statement

A cardiology clinic uses multiple diagnostic devices from different vendors. Multidisciplinary teams struggle to assemble a unified evidence timeline for each case. Evidence arrives from:
- **Pathology** — Vendor A (CoreLab LIMS) + Vendor D (BioPulse POC Analyzer)
- **Imaging** — Vendor B (CardioVision PACS) + Vendor E (UltraEcho Workstation)
- **Molecular/NGS** — Vendor C (GeneCore NGS Sequencer)

Each vendor uses a different data format, identity schema, and portal. Manual assembly takes 16–21 minutes per case with high risk of missed evidence or stale data.

---

## Reproducibility — Full Setup from Scratch

### Prerequisites
- Python 3.13+
- Node.js v20.18+ / npm v10+
- Git

### 1 — Clone and install

```powershell
git clone <repo-url> cardioevidence
cd cardioevidence

# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2 — Run backend

```powershell
$env:PYTHONPATH = "d:\path\to\cardioevidence"
python -m uvicorn backend.main:app --reload --port 8000
```

The database (`cardioevidence.db`) is auto-created on first run with 100+ synthetic cases, 500+ evidence events, 5 vendors, specimens, audit logs, and edge-case scenarios.

### 3 — Run frontend

```powershell
cd frontend
npm run dev
# Opens at http://localhost:5173
```

### 4 — Login

Open [http://localhost:5173](http://localhost:5173) — you will see the Login page (not the dashboard).

### 5 — Run tests

```powershell
$env:PYTHONPATH = "d:\path\to\cardioevidence"
python -m pytest backend/tests -v
# Expected: 35 passed
```

### 6 — View benchmark report

```powershell
# First login to get a token:
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cardio@cardioevidence.demo","password":"Cardio@123"}'

# Use the token from the response:
curl http://localhost:8000/experiment/benchmark \
  -H "Authorization: Bearer <token>"
```

### 7 — Reset synthetic dataset

```powershell
curl -X POST http://localhost:8000/settings/reset \
  -H "Authorization: Bearer <token>"
```

---

## Demo Accounts (6 Roles)

| Role | Email | Password | Workspace |
|---|---|---|---|
| **Cardiologist** | `cardio@cardioevidence.demo` | `Cardio@123` | Full multidisciplinary access |
| **Pathologist** | `pathology@cardioevidence.demo` | `Pathology@123` | Pathology + Specimen Lineage |
| **Imaging Specialist** | `imaging@cardioevidence.demo` | `Imaging@123` | Imaging only |
| **Molecular Specialist** | `molecular@cardioevidence.demo` | `Molecular@123` | Molecular + Specimen Lineage |
| **Reviewer** | `reviewer@cardioevidence.demo` | `Reviewer@123` | Evidence review + Audit |
| **Administrator** | `admin@cardioevidence.demo` | `Admin@123` | System admin + Settings |

---

## Primary Evaluation Metric — Benchmark Results

**Metric:** Time to assemble a complete case-review timeline (seconds)

| | Baseline (Manual, 9 steps) | CardioEvidence (7 steps) |
|---|---|---|
| Mean | **1080 s (18.0 min)** | **140 s (2.3 min)** |
| Std Dev | ~96 s | ~18 s |
| Target | — | ≤ 300 s (5 min) |
| **Reduction** | — | **≥ 87%** |
| Target met | — | ✅ Yes |

### Baseline — 9-step manual workflow

| Step | Task | Mean Time |
|---|---|---|
| 1 | Log in to Pathology LIMS portal | 45 s |
| 2 | Search and locate case in LIMS | 95 s |
| 3 | Export/screenshot pathology results | 60 s |
| 4 | Log in to PACS/Imaging workstation | 50 s |
| 5 | Locate imaging studies (manual MRN cross-reference) | 120 s |
| 6 | Export imaging report summary | 70 s |
| 7 | Log in to Molecular/NGS portal (third system) | 55 s |
| 8 | Locate and download NGS report | 90 s |
| **9** | **Manually reconcile timeline (timestamp normalisation, freshness, specimen ID)** | **495 s** |
| **Total** | | **1080 s** |

> Step 9 represents 46% of the total baseline time and is the primary source of errors.

### Error Analysis

- **Baseline variability**: High — steps 8 & 9 vary ±8–15 min depending on NGS report availability (often 24–48h)
- **Prototype variability**: Low — server response <1s; UI load <3s
- **Threats to validity**: Simulation-only; no live clinical trial (would require ethical approval)
- **Recommended next step**: Structured task-analysis study with 5–10 clinicians

Full benchmark JSON: `GET /experiment/benchmark` (authenticated)

---

## Data Standardisation Layer

Each vendor's raw payload is normalised into a **CanonicalObservation** before storage — a lightweight HL7 FHIR R4 Observation-inspired schema.

```
Vendor Raw Payload (JSON / HL7v2 segment / DICOM SR / NGS report)
        ↓
  VendorNormaliser.normalise()   [backend/services/normalisation.py]
        ↓
  CanonicalObservation
  ├── event_id       → FHIR Observation.identifier
  ├── case_id        → FHIR Observation.subject (Patient ref)
  ├── modality       → FHIR Observation.category (laboratory / imaging)
  ├── vendor         → FHIR Observation.performer
  ├── test_name      → FHIR Observation.code (LOINC preferred)
  ├── result_summary → FHIR Observation.valueString
  ├── interpretation → FHIR Observation.interpretation
  ├── event_timestamp→ FHIR Observation.effectiveDateTime
  ├── specimen_id    → FHIR Observation.specimen
  ├── device_system  → FHIR Observation.device
  └── raw_payload    → FHIR extension (original preserved)
        ↓
  EvidenceEvent (SQLite via SQLAlchemy ORM)
        ↓
  CardioEvidence Unified Timeline
```

Per-vendor normalisers are in [`backend/services/normalisation.py`](backend/services/normalisation.py):

| Vendor | Normaliser Class | Source Format |
|---|---|---|
| Vendor A — CoreLab LIMS | `CoreLabPathologyNormaliser` | JSON (LIMS export) |
| Vendor B — CardioVision PACS | `CardioVisionImagingNormaliser` | JSON (PACS report) |
| Vendor C — GeneCore NGS | `GeneCoreNGSNormaliser` | JSON (NGS run report) |
| Vendor D — BioPulse POC | `BioPulsePOCNormaliser` | JSON (POC analyzer) |
| Vendor E — UltraEcho Echo | `UltraEchoImagingNormaliser` | JSON (echo workstation) |

The `CanonicalObservation.to_fhir_observation()` method serialises any event back to FHIR R4 JSON for interoperability export.

---

## Authentication & Login Flow

```
Application Start → /login
                 → Enter credentials
                 → POST /api/auth/login
                 → Bearer token issued
                 → Role identified
                 → Role-specific dashboard
                 → Permission-controlled evidence access
```

- No role-switching after login. To change role: **Logout → Login with another account**
- Unauthenticated API calls → **HTTP 401**
- Wrong-role API calls → **HTTP 403**

---

## Role Permission Matrix

| Feature | Cardiologist | Pathologist | Imaging | Molecular | Reviewer | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cases | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence Timeline (full) | ✅ | — | — | — | ✅ | — |
| Pathology | ✅ | ✅ | ❌ | ❌ | ✅ | — |
| Imaging | ✅ | ❌ | ✅ | ❌ | ✅ | — |
| Molecular | ✅ | ❌ | ❌ | ✅ | ✅ | — |
| Specimen Lineage | ✅ | ✅ | ❌ | ✅ | ✅ | — |
| Review Decisions | ✅ | ❌ | ❌ | ❌ | ✅ | — |
| Audit Trail | ✅ | — | — | — | ✅ | ✅ |
| Failure Simulation | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Experiment / Benchmark | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ingestion Simulator | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Admin Settings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Architecture

```
backend/
  main.py                        # FastAPI app, router registration
  routers/
    auth.py                      # POST /api/auth/login, /me, /logout
    rbac.py                      # get_current_user(), require_roles(), permission tuples
    cases.py                     # Cases + timeline (per-role modality filter)
    evidence.py                  # Evidence events (per-modality 403 enforcement)
    experiment.py                # /results, /run, /benchmark (formal benchmark report)
    reviews.py / audit.py / ...
  services/
    normalisation.py             # ← NEW: Vendor-agnostic HL7 FHIR-inspired normalisation
    seed_generator.py            # 100+ synthetic cases, 500+ events, 5 vendors
    freshness_engine.py          # Current / Stale / Very Stale badge logic
    completeness_engine.py       # Missing modality detection
    lineage_engine.py            # Specimen lineage graph + mismatch detection
    duplicate_conflict.py        # Duplicate event ID + conflicting interpretation detection
    audit_service.py             # Structured audit log writer

frontend/src/
  context/
    AuthContext.tsx              # Login state, localStorage token persistence
    RoleContext.tsx              # ROLE_PAGE_ACCESS + ROLE_WORKSPACE_TABS
  pages/
    LoginPage.tsx                # Login-first entry point
    CaseWorkspace.tsx            # Role-conditional data loading (no unnecessary 403s)
  components/
    layout/Sidebar.tsx           # Hides unauthorised pages per role
    layout/Header.tsx            # Role + workspace label; no role-switch dropdown
    routing/ProtectedRoute.tsx   # Auth + role guard, AccessRestricted component
  services/
    api.ts                       # Authorization: Bearer <token> on every request
```

---

## Failure Mode Documentation

Three explicit failure scenarios are implemented and testable via the Failure Simulation module:

| Failure | Description | Detection | Impact in CardioEvidence |
|---|---|---|---|
| **Missing Evidence** | One or more modalities absent for a case | `completeness_engine.py` flags incomplete | Case marked "Incomplete"; banner shows missing modalities |
| **Stale Evidence** | Event ingested >30 days ago | `freshness_engine.py` computes freshness | Red "Very Stale" badge; timeline warning |
| **Lineage Mismatch** | Specimen IDs don't trace back to primary specimen | `lineage_engine.py` detects breaks | Warning icon on Lineage tab; reviewer alerted |
| **Duplicate Events** | Same event_id ingested twice | `duplicate_conflict.py` | Second event tagged `validation_status=Duplicate` |
| **Conflicting Interpretations** | Same modality shows conflicting results | `duplicate_conflict.py` | Tagged `validation_status=Conflicting`; review required |
| **Unauthorized Access** | Wrong-role API call | `rbac.py` `require_roles()` | HTTP 403; logged to audit trail |

---

## Running Tests

```powershell
$env:PYTHONPATH = "d:\path\to\cardioevidence"
python -m pytest backend/tests -v
```

35 tests — all must pass:
- 12 original functional tests (case retrieval, timeline, freshness, lineage, duplicates, etc.)
- 23 RBAC cross-role tests (allowed/denied per role × per endpoint)

---

## Security Notes

- In-memory sessions (restart clears all tokens) — by design for prototype
- `localStorage` token storage — not httpOnly cookies (demo only; not for production)
- Backend enforces RBAC independently of the UI
- Consent system (Granted/Restricted/Pending) is layered after role authorization
