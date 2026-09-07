# CardioEvidence — Failure Modes and Effects Analysis (FMEA)

This document details the clinical failure modes simulated and detected by the CardioEvidence platform.

---

## Failure Modes Summary Table

| Failure Mode | Injected Scenario | Detection Engine | UI Presentation | Severity |
|---|---|---|---|---|
| **1. Missing Evidence** | Pathology or molecular stream omitted from case | Completeness Engine (required modalities check) | 🔴 Missing Modality badge; "CASE REVIEW INCOMPLETE" warning banner | High |
| **2. Stale Diagnostic Data** | Imaging or lab timestamp pushed beyond threshold (>30d) | Dynamic Freshness Engine | 🟡 Stale or 🔴 Very Stale dot; Case marked as "Needs Review" | Medium |
| **3. Specimen Lineage Mismatch** | Molecular test references foreign specimen ID (e.g. `SPEC-999`) | Specimen Lineage Hierarchy Graph Engine | 🔴 "SPECIMEN LINEAGE MISMATCH DETECTED" banner; review blocked | Critical |
| **4. Duplicate Evidence** | Identical `event_id` transmitted from two vendor systems | Ingestion Gateway Collision Detector | ⚠️ "Duplicate Evidence" alert in timeline | Medium |
| **5. Conflicting Multi-Vendor Findings** | Vendor A (Normal 5.2 ng/L) vs Vendor D (Severely Elevated 162 ng/L) | Multi-Vendor Concordance Engine | ⚠️ "Conflicting Evidence" banner; dual sources preserved | High |
| **6. Unauthorized Role Access** | Cardiologist role queries restricted consent molecular data | RBAC & Consent Policy Filter | 🔒 "Access Restricted" (HTTP 403); incident logged to audit trail | High |
| **7. Timestamp Inversion Anomaly** | Event timestamp precedes specimen collection timestamp | Temporal Verification Engine | Warning flag on chronological timeline | Medium |

---

## Detailed Anomaly Descriptions

### Scenario 1: Missing Pathology Evidence
- **Risk**: A clinician might diagnose heart failure or non-ischemic cardiomyopathy without ruling out acute myocardial injury or necrosis.
- **CardioEvidence Action**: Calculates 1/3 or 2/3 completeness, refuses to set case to "Complete", and forces review status to "Incomplete".

### Scenario 2: Stale Imaging
- **Risk**: Basing surgical or medical intervention on an echocardiogram performed 6 months prior when ventricular remodeling may have worsened.
- **CardioEvidence Action**: Flags the study with an amber or red freshness dot and prevents automatic sign-off.

### Scenario 3: Specimen Lineage Mismatch
- **Risk**: Patient A receives the genetic sequencing results of Patient B due to an accession number transposition error.
- **CardioEvidence Action**: Evaluates all specimen aliquots against the registered patient specimen root. Any mismatched identifier halts automated linking and renders a prominent flashing red alert.

### Scenario 4: Conflicting Vendor Results
- **Risk**: Discarding or silently overwriting contradictory results between standard laboratory analyzers and point-of-care emergency devices.
- **CardioEvidence Action**: CardioEvidence preserves both records without discarding either, flags them as discordant, and alerts the multidisciplinary team for manual reconciliation.
