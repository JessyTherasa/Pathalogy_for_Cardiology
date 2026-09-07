# CardioEvidence — Multidisciplinary Clinical Review Workflow

## 1. The Multidisciplinary Team (MDT) Workflow

Cardiology diagnosis for complex structural, ischemic, and genetic cardiomyopathies requires multiple clinical subspecialties:

1. **Cardiologist**: Synthesizes clinical symptoms, physical examination, and diagnostic reports to determine patient risk and therapy strategy.
2. **Pathologist**: Validates serum biomarkers (Troponin I/T kinetics, CK-MB, NT-proBNP) and endomyocardial biopsy tissue stains.
3. **Molecular Specialist / Geneticist**: Analyzes Next-Generation Sequencing (NGS) panels for pathogenic variants (e.g. *MYH7*, *MYBPC3*, *LMNA*, *TTR*, *PKP2*).
4. **Lead Reviewer / Panel Chair**: Validates evidence completeness across all disciplines and confirms multidisciplinary consensus.
5. **Informatics Administrator**: Manages system integrity, vendor data streams, and quality compliance.

---

## 2. Step-by-Step Demonstration Script for Judges

To showcase the complete application to judges or evaluators, follow this exact 10-step sequence:

### STEP 1: Launch & Dashboard
- Navigate to `http://localhost:5173` (or `http://localhost:8000`).
- Select role **Cardiologist**.
- Observe the prominent **SYNTHETIC DATA — DEMONSTRATION ONLY** warning badge.
- View the 6 KPI cards (100+ Total Cases, Complete Cases, Incomplete Cases, Missing Evidence, Stale Evidence).

### STEP 2: Showcase CASE-1001 (The Ideal Complete Case)
- Click `CASE-1001` in the Quick Jump bar or table.
- Verify that Pathology (Troponin I), Imaging (Echocardiogram), and Molecular (Cardiomyopathy Panel) are all present with 🟢 **Current** status.
- Observe Evidence Completeness: **100%**.

### STEP 3: Evidence Provenance Drill-Down
- On `CASE-1001`, click **View Evidence** on the Troponin I event.
- Inspect the 6-stage provenance audit chain:
  `Vendor Transmission → Ingestion → Normalization → Validation → Case Linkage → Timeline`.

### STEP 4: Specimen Lineage Tree
- Click the **Specimen Lineage** tab.
- Observe the visual hierarchy: `SPEC-001` branching into Pathology and Molecular aliquots.
- Verify status: **Lineage Validated**.

### STEP 5: Role-Based Visibility (Switching Roles)
- In the top header, switch role from **Cardiologist** to **Molecular Specialist**.
- Note the sidebar navigation updates dynamically.
- Click the **Molecular Stream** tab to inspect specialized gene variant details.

### STEP 6: Showcase CASE-1002 (Stale Lab & Missing Molecular)
- Return to Dashboard and click `CASE-1002`.
- Observe:
  - 🟡 **Stale Pathology** (Troponin is 35 days old).
  - 🔴 **Missing Molecular** (NGS panel absent).
  - Prominent alert: **CASE REVIEW INCOMPLETE — Timeline cannot be considered complete**.

### STEP 7: Showcase CASE-1003 (Specimen Lineage Mismatch)
- Click `CASE-1003`.
- Click the **Specimen Lineage** tab.
- Observe the high-visibility alert:
  **🔴 SPECIMEN LINEAGE MISMATCH DETECTED**
- The visual graph shows that the molecular test was associated with foreign specimen `SPEC-999` while the case registered `SPEC-020`.

### STEP 8: Failure Simulation Workbench
- Switch role to **Administrator** and open **Failure Simulation**.
- Click **Inject Scenario** for Duplicate Evidence or Conflicting Vendor Results on target `CASE-1001`.
- Immediately inspect `CASE-1001` to observe the realtime UI warning badges.

### STEP 9: Workflow Experiment (Baseline vs CardioEvidence)
- Open **Baseline vs CardioEvidence** page.
- Click **[Run Experiment Trials]**.
- Review the Recharts comparison:
  - Baseline Manual Assembly: ~18.0 minutes
  - CardioEvidence Unified: ~3.5 minutes
  - Reduction: ~80.5% (~14.5 minutes saved per case review)

### STEP 10: Stakeholder Feedback & Audit Trail
- Open **User Feedback** and submit a demo evaluation rating.
- Open **Audit Trail** to demonstrate that every case query, drill-down, and simulation is immutably logged with timestamp, role, and action result.
