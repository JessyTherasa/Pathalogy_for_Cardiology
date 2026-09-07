# CardioEvidence

**Multidisciplinary Clinical Evidence Timeline — Research & Demonstration Prototype**

> ⚠️ **SYNTHETIC DATA ONLY** — All data is de-identified and computer-generated. This system is NOT for clinical use, diagnosis, or treatment decisions.

---

## Overview

CardioEvidence is a demonstration prototype for a cardiology clinic where diagnostic evidence arrives from multiple vendors (Pathology, Imaging, Molecular) and multidisciplinary teams need a unified evidence timeline per case.

The system enforces strict **Role-Based Access Control (RBAC)** at both the API and UI layers. Each professional logs in with their own credentials and receives a role-specific workspace. There is no role-switching after login.

---

## Authentication & Login Flow

```
Application Start
      ↓
  Login Page   (/login)
      ↓
  Enter demo credentials
      ↓
  POST /api/auth/login
      ↓
  Bearer token issued
      ↓
  Role identified from account
      ↓
  Role-specific dashboard
      ↓
  Permission-controlled evidence access
```

- Unauthenticated users visiting any route are redirected to `/login`
- After logout, the Back button does **not** expose protected data
- **There is no "Change Role" button.** To change role: Logout → Login with another account

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

## Role Permission Matrix

| Feature | Cardiologist | Pathologist | Imaging Specialist | Molecular Specialist | Reviewer | Administrator |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cases (list + detail) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence Timeline (full) | ✅ | — | — | — | ✅ | — |
| Pathology evidence | ✅ | ✅ | ❌ | ❌ | ✅ | — |
| Imaging evidence | ✅ | ❌ | ✅ | ❌ | ✅ | — |
| Molecular evidence | ✅ | ❌ | ❌ | ✅ | ✅ | — |
| Specimen Lineage | ✅ | ✅ | ❌ | ✅ | ✅ | — |
| Review Decisions | ✅ | ❌ | ❌ | ❌ | ✅ | — |
| Audit Trail | ✅ | — | — | — | ✅ | ✅ |
| Failure Simulation | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Experiment Module | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ingestion Simulator | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Workflow Map | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User Feedback | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Settings | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> **Timeline note:** Specialists (Pathologist / Imaging / Molecular) can only see their own modality's events in the timeline — the backend filters this server-side. Unauthenticated API calls return HTTP 401. Cross-role API calls return HTTP 403.

---

## Case Workspace Tabs per Role

| Tab | Cardiologist | Pathologist | Imaging Specialist | Molecular Specialist | Reviewer | Administrator |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidence Timeline | ✅ | — | — | — | ✅ | — |
| Pathology | ✅ | ✅ | — | — | ✅ | — |
| Imaging | ✅ | — | ✅ | — | ✅ | — |
| Molecular | ✅ | — | — | ✅ | ✅ | — |
| Specimen Lineage | ✅ | ✅ | — | ✅ | ✅ | — |
| Review Decisions | ✅ | — | — | — | ✅ | — |
| Audit Trail | ✅ | — | — | — | ✅ | ✅ |

Unauthorised tabs are **completely hidden** — not just grayed out.

---

## Running the Application

```powershell
# Terminal 1 — Backend (FastAPI)
$env:PYTHONPATH = "d:\c28__project"
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend (Vite dev server)
cd d:\c28__project\frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you will see the Login page.

---

## Running Tests

```powershell
$env:PYTHONPATH = "d:\c28__project"
python -m pytest backend/tests -v
```

**35 tests** covering:
- All original 12 functional tests (case retrieval, timeline, freshness, lineage, etc.)
- Authentication: invalid login rejected, all 6 demo accounts valid, unauthenticated → 401
- Cardiologist: full clinical access, all modality evidence visible
- Pathologist: pathology allowed, imaging/molecular/reviews/admin → 403
- Imaging Specialist: imaging allowed, pathology/molecular/reviews/specimens → 403
- Molecular Specialist: molecular allowed, imaging/pathology → 403
- Reviewer: timeline/reviews/audit allowed, failures/admin → 403
- Administrator: audit/failures/experiment/settings allowed

---

## Architecture

```
backend/
  main.py                   # FastAPI app, router registration
  routers/
    auth.py                 # POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
    rbac.py                 # get_current_user(), require_roles(), permission constants
    cases.py                # GET /cases, /cases/{id}, /cases/{id}/timeline (RBAC + modality filter)
    evidence.py             # GET/POST /evidence/{id} (per-modality 403 enforcement)
    reviews.py              # GET/POST /reviews (Cardiologist + Reviewer only)
    audit.py                # GET /audit (Cardiologist + Reviewer + Administrator)
    dashboard.py            # GET /dashboard/metrics
    failures.py             # POST /failures/* (Cardiologist + Administrator)
    experiment.py           # GET/POST /experiment/* (Cardiologist + Reviewer + Administrator)
    ingestion.py            # POST /ingestion/* (Administrator only)
    feedback.py             # GET/POST /feedback
    settings.py             # GET /settings (open), PUT /settings (Administrator only)

frontend/src/
  context/
    AuthContext.tsx          # Login/logout state, localStorage token persistence
    RoleContext.tsx          # ROLE_PAGE_ACCESS + ROLE_WORKSPACE_TABS maps
  pages/
    LoginPage.tsx            # Login-first entry, 6 demo credential rows
    CaseWorkspace.tsx        # Role-conditional data fetching (no unnecessary 403s)
  components/
    layout/Sidebar.tsx       # Hides (not locks) unauthorised pages per role
    layout/Header.tsx        # Shows "Role: X | Workspace: Y", no role-switch dropdown
    routing/ProtectedRoute.tsx # Auth guard + AccessRestricted with role name + area
  services/
    api.ts                   # Attaches Authorization: Bearer <token> on every request
```

---

## Security Notes

- Sessions are **in-memory** on the backend — restarting the server clears all sessions
- Tokens are stored in `localStorage` — not httpOnly cookies (demo prototype only)
- Backend enforces RBAC independently of the frontend: API calls without a valid token return 401, wrong-role calls return 403
- Consent system (Granted/Restricted/Pending) is preserved and layered after role authorization
