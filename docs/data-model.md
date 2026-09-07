# CardioEvidence — Relational Data Model

The application uses SQLite with SQLAlchemy ORM models.

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    CASES ||--o{ EVIDENCE_EVENTS : contains
    CASES ||--o{ SPECIMENS : registers
    CASES ||--o{ REVIEW_DECISIONS : reviewed_by
    CASES ||--o{ AUDIT_LOGS : logged_in
    SPECIMENS ||--o{ EVIDENCE_EVENTS : originates

    CASES {
        int id PK
        string case_id UK
        string patient_synthetic_id
        string age_range
        string gender
        string consent_status
        string risk_level
        string status
        datetime created_at
        datetime updated_at
    }

    EVIDENCE_EVENTS {
        int id PK
        string event_id
        string case_id FK
        string modality
        string vendor
        string test_name
        text result_summary
        string interpretation
        datetime event_timestamp
        datetime ingestion_timestamp
        string freshness
        string specimen_id
        string parent_specimen_id
        string source_system
        string device_system
        string validation_status
        string review_status
        text raw_payload
    }

    SPECIMENS {
        int id PK
        string specimen_id UK
        string parent_specimen_id
        string case_id FK
        datetime collection_timestamp
        string source
        string specimen_type
    }

    REVIEW_DECISIONS {
        int id PK
        string case_id FK
        string reviewer_role
        string reviewer_name
        string status
        text decision_text
        string missing_evidence_identified
        string stale_evidence_identified
        string lineage_issue_identified
        datetime created_at
    }

    AUDIT_LOGS {
        int id PK
        string case_id FK
        string user_role
        string action
        string resource
        datetime timestamp
        string result
        text details
    }

    VENDORS {
        int id PK
        string vendor_name
        string modality
        string system_name
        string status
    }

    USER_FEEDBACK {
        int id PK
        string user_role
        string task_completed
        float time_taken_seconds
        int ease_of_use
        int timeline_clarity
        int completeness_confidence
        text comments
        text suggested_improvements
        datetime created_at
    }

    EXPERIMENT_RUNS {
        int id PK
        string run_type
        float baseline_time_seconds
        float prototype_time_seconds
        float accuracy_baseline
        float accuracy_prototype
        int missing_detected
        int stale_detected
        int lineage_detected
        datetime created_at
        text notes
    }

    SYSTEM_SETTINGS {
        int id PK
        string key UK
        text value_json
    }
```

---

## 2. Table Schemas

### `cases`
Primary registry of synthetic cardiovascular cases.
- `case_id`: Unique identifier (e.g. `CASE-1001`, `CASE-1002`).
- `consent_status`: `Granted`, `Restricted`, `Pending`.
- `risk_level`: `Low`, `Moderate`, `High`.
- `status`: `Complete`, `Needs Review`, `Incomplete`, `Blocked`, `Under Review`.

### `evidence_events`
Canonical unit of clinical evidence.
- `modality`: `Pathology`, `Imaging`, `Molecular`.
- `freshness`: `Current` (<7d), `Stale` (7-30d), `Very Stale` (>30d), `Missing`.
- `validation_status`: `Valid`, `Duplicate`, `Lineage Mismatch`, `Conflicting`, `Invalid`.
- `review_status`: `Unreviewed`, `Reviewed`, `Flagged`.

### `specimens`
Specimen provenance tree.
- Supports hierarchy with `parent_specimen_id` for aliquot tracking.

### `review_decisions`
Multidisciplinary clinical panel decisions and requested evidence.

### `audit_logs`
Immutable regulatory record of system transactions and access control events.
