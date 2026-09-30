# Data Standardisation Layer

## Overview

Every incoming vendor payload is normalised into a **CanonicalObservation** before storage. The schema is inspired by HL7 FHIR R4 `Observation` resource (simplified subset).

---

## Normalisation Pipeline

```
Vendor Raw Payload
  (JSON / HL7v2 / DICOM SR / NGS report)
        ↓
  VendorNormaliser.normalise()
  [backend/services/normalisation.py]
        ↓
  CanonicalObservation
        ↓
  EvidenceEvent (SQLite / ORM)
        ↓
  CardioEvidence Unified Timeline
```

---

## CanonicalObservation Schema

| Field | FHIR R4 Mapping | Description |
|---|---|---|
| `event_id` | `Observation.identifier[0].value` | Unique event identifier |
| `case_id` | `Observation.subject.reference` | Patient/case reference |
| `modality` | `Observation.category[0].coding[0].display` | `PATHOLOGY` / `IMAGING` / `MOLECULAR` |
| `vendor` | `Observation.performer[0].display` | Originating vendor |
| `test_name` | `Observation.code.display` (LOINC preferred) | Test/study description |
| `result_summary` | `Observation.valueString` | Human-readable result |
| `interpretation` | `Observation.interpretation[0].text` | Clinical flag |
| `event_timestamp` | `Observation.effectiveDateTime` | ISO 8601 |
| `source_system` | `Observation.meta.source` | Vendor system identifier |
| `device_system` | `Observation.device.display` | Instrument/device |
| `specimen_id` | `Observation.specimen.reference` | Specimen traceability |
| `validation_status` | `Observation.status` | `Valid` / `Duplicate` / `Conflicting` / `Lineage Mismatch` |
| `raw_payload` | `Observation.extension[rawVendorPayload]` | Original payload preserved |

### FHIR Status Mapping

| CardioEvidence | FHIR R4 |
|---|---|
| Valid | `final` |
| Duplicate | `cancelled` |
| Conflicting | `corrected` |
| Unreviewed | `preliminary` |
| Invalid | `entered-in-error` |

---

## Vendor Adapters

> **These are simulated vendor adapters. No real medical device APIs are used.**

### Vendor A — CoreLab LIMS Enterprise 11.4 (Pathology)

```json
{
  "specimen_accession": "ACC-12345",
  "patient_ref": "CASE-1001",
  "test_code": "TROP-I",
  "test_description": "Troponin I Quantitative",
  "numeric_result": 0.04,
  "units": "ng/mL",
  "clinical_flag": "NORMAL",
  "reported_at": "2026-09-01T10:15:00",
  "analyzer_id": "CoreLab-Analyzer-7"
}
```
**Normaliser:** `CoreLabPathologyNormaliser`

---

### Vendor B — CardioVision PACS Cloud v4.2 (Imaging)

```json
{
  "study_uid": "1.2.840.10008.5.1.4.1.1.12",
  "patient_mrn": "CASE-1001",
  "modality_code": "ECG",
  "report_title": "12-Lead ECG Report",
  "report_summary": "Normal sinus rhythm. QTc 420ms.",
  "radiologist_impression": "Normal",
  "reported_date": "2026-09-01T11:30:00",
  "equipment": "CardioVision CV-12 Lead ECG"
}
```
**Normaliser:** `CardioVisionImagingNormaliser`

---

### Vendor C — GeneCore NGS Sequencer 900 (Molecular)

```json
{
  "run_id": "RUN-20260901-042",
  "sample_id": "SPEC-001",
  "case_ref": "CASE-1001",
  "panel": "CardioPanel-48Gene",
  "gene_symbol": "TNNT2",
  "variant_call": "c.694C>T (p.Arg232Cys)",
  "pathogenicity": "Likely Pathogenic",
  "run_completed_at": "2026-09-01T22:00:00"
}
```
**Normaliser:** `GeneCoreNGSNormaliser`

---

### Vendor D — BioPulse Bedside Analyzer 3 (Point-of-Care Pathology)

```json
{
  "device_serial": "BPA3-0042",
  "patient_barcode": "CASE-1001",
  "assay": "BNP",
  "result": "480",
  "unit": "pg/mL",
  "flag": "HIGH",
  "timestamp": "2026-09-01T07:45:00"
}
```
**Normaliser:** `BioPulsePOCNormaliser`

---

### Vendor E — UltraEcho Workstation Pro (Echocardiography)

```json
{
  "exam_id": "ECHO-20260901-007",
  "patient_id": "CASE-1001",
  "exam_type": "Transthoracic Echo",
  "lvef_percentage": 55,
  "wall_motion": "Normal",
  "impression": "Normal LV function",
  "exam_datetime": "2026-09-01T14:30:00"
}
```
**Normaliser:** `UltraEchoImagingNormaliser`

---

## Registry Dispatch

```python
from backend.services.normalisation import normalise_vendor_payload

obs = normalise_vendor_payload("Vendor A — CoreLab", raw_dict)
# Returns CanonicalObservation

fhir = obs.to_fhir_observation()
# Returns FHIR R4 Observation JSON
```

---

## FHIR Export Example

```json
{
  "resourceType": "Observation",
  "id": "EVT-CL-ACC-12345",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "laboratory",
      "display": "Pathology"
    }]
  }],
  "code": {
    "text": "Troponin I Quantitative",
    "coding": [{"system": "http://loinc.org", "code": "UNMAPPED"}]
  },
  "subject": {"reference": "Patient/CASE-1001"},
  "effectiveDateTime": "2026-09-01T10:15:00",
  "performer": [{"display": "Vendor A — CoreLab"}],
  "valueString": "0.04 ng/mL",
  "meta": {"source": "CoreLab LIMS Enterprise 11.4", "tag": [{"display": "SYNTHETIC-DATA"}]}
}
```

> **Note:** LOINC codes are marked `UNMAPPED` in the prototype. A production deployment would require LOINC code mapping for each test.

---

## Real-Time Ingestion Flow

```
Vendor Event (JSON)
      ↓
POST /simulator/generate-one   OR   WebSocket event stream
      ↓
stream_generator.generate_single_event()
      ↓
_save_event_to_db()   →   EvidenceEvent (SQLite)
      ↓
manager.broadcast({type: "new_event", ...})
      ↓
All connected WebSocket clients
      ↓
CaseWorkspace / Dashboard auto-refresh
```

---

## Validation Rules

Every event must have:

| Field | Rule |
|---|---|
| `event_id` | Non-empty, unique |
| `case_id` | Must match existing case or be a new case ID |
| `modality` | Must be `Pathology`, `Imaging`, or `Molecular` |
| `vendor` | Must be a known vendor name |
| `test_name` | Non-empty |
| `event_timestamp` | Valid ISO 8601; must not be in the future |
| `result_summary` | Non-empty |

Validation failure → `validation_status = "Invalid"` + rejection logged to audit trail.

---

## Limitations

- LOINC codes are not mapped in the prototype (marked `UNMAPPED`)
- No HL7 v2 or DICOM SR wire format parsing — simulation uses JSON
- No real-time HL7 FHIR server subscription — uses WebSocket instead
- Vendor authentication is not simulated

For a production deployment, this layer would integrate with:
- HL7 FHIR R4 compliant terminology servers
- Real LOINC/SNOMED CT mappings
- Vendor-specific API credentials and OAuth
