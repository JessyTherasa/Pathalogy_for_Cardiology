"""
CardioEvidence — Vendor-Agnostic Diagnostic Payload Normalisation Layer

Implements a lightweight HL7 FHIR-inspired schema for normalising disparate
diagnostic payloads from multiple vendors/modalities into a canonical internal
representation before storage.

Reference: https://hl7.org/fhir/R4/observation.html (simplified subset)

Each incoming vendor payload (JSON, HL7v2 segment, DICOM SR, NGS report) is
mapped to a CanonicalObservation before being persisted as an EvidenceEvent.

Vendor → Raw Payload
       ↓
  VendorNormaliser.normalise()
       ↓
  CanonicalObservation (FHIR Observation-inspired)
       ↓
  EvidenceEvent (SQLite, via ORM)
       ↓
  CardioEvidence Timeline
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
import json


# ─── Canonical Internal Schema ────────────────────────────────────────────────

@dataclass
class CanonicalObservation:
    """
    Vendor-agnostic representation of a single diagnostic observation.
    Inspired by HL7 FHIR R4 Observation resource (simplified subset).

    FHIR Mapping:
      event_id          → Observation.identifier[0].value
      case_id           → Observation.subject.reference (Patient)
      modality          → Observation.category[0].coding[0].display
      vendor            → Observation.performer[0].display
      test_name         → Observation.code.display  (LOINC preferred)
      result_summary    → Observation.valueString
      interpretation    → Observation.interpretation[0].text
      event_timestamp   → Observation.effectiveDateTime
      source_system     → Observation.meta.source
      device_system     → Observation.device.display
      specimen_id       → Observation.specimen.reference
      validation_status → Observation.status  (registered|preliminary|final|corrected|cancelled)
      raw_payload       → Observation.extension[rawVendorPayload]
    """
    # Required
    event_id: str
    case_id: str
    modality: str           # "Pathology" | "Imaging" | "Molecular"
    vendor: str
    test_name: str
    result_summary: str
    event_timestamp: datetime

    # Optional
    interpretation: Optional[str] = None
    source_system: Optional[str] = None
    device_system: Optional[str] = None
    specimen_id: Optional[str] = None
    parent_specimen_id: Optional[str] = None
    validation_status: str = "Valid"
    review_status: str = "Unreviewed"
    raw_payload: Optional[str] = None      # original vendor JSON preserved

    def to_fhir_observation(self) -> Dict[str, Any]:
        """
        Serialise to a minimal FHIR R4 Observation JSON structure.
        Suitable for interoperability export or audit logging.
        """
        return {
            "resourceType": "Observation",
            "id": self.event_id,
            "identifier": [{"value": self.event_id, "system": "urn:cardioevidence:event-id"}],
            "status": self._map_validation_to_fhir_status(),
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": self._map_modality_to_fhir_category(),
                    "display": self.modality
                }]
            }],
            "code": {
                "text": self.test_name,
                # Placeholder LOINC: in production map to real LOINC codes
                "coding": [{"system": "http://loinc.org", "code": "UNMAPPED", "display": self.test_name}]
            },
            "subject": {"reference": f"Patient/{self.case_id}"},
            "effectiveDateTime": self.event_timestamp.isoformat(),
            "performer": [{"display": self.vendor}],
            "valueString": self.result_summary,
            "interpretation": [{"text": self.interpretation}] if self.interpretation else [],
            "specimen": {"reference": f"Specimen/{self.specimen_id}"} if self.specimen_id else None,
            "device": {"display": self.device_system} if self.device_system else None,
            "meta": {
                "source": self.source_system,
                "tag": [{"display": "SYNTHETIC-DATA"}]
            },
            "extension": [
                {
                    "url": "urn:cardioevidence:rawVendorPayload",
                    "valueString": self.raw_payload
                }
            ] if self.raw_payload else []
        }

    def _map_validation_to_fhir_status(self) -> str:
        mapping = {
            "Valid": "final",
            "Duplicate": "cancelled",
            "Conflicting": "corrected",
            "Unreviewed": "preliminary",
            "Invalid": "entered-in-error",
        }
        return mapping.get(self.validation_status, "unknown")

    def _map_modality_to_fhir_category(self) -> str:
        mapping = {
            "Pathology": "laboratory",
            "Imaging": "imaging",
            "Molecular": "laboratory",   # no FHIR standard for molecular; falls under lab
        }
        return mapping.get(self.modality, "exam")


# ─── Per-Vendor Normaliser Classes ────────────────────────────────────────────

class VendorNormaliserBase:
    """Base normaliser. Subclass per vendor or modality family."""
    VENDOR_NAME: str = "Unknown"
    MODALITY: str = "Unknown"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        raise NotImplementedError


class CoreLabPathologyNormaliser(VendorNormaliserBase):
    """
    Vendor A — CoreLab LIMS Enterprise 11.4
    Example raw payload shape:
    {
      "specimen_accession": "ACC-12345",
      "patient_ref": "CASE-XXXX",
      "test_code": "TROP-I",
      "test_description": "Troponin I Quantitative",
      "numeric_result": 0.04,
      "units": "ng/mL",
      "reference_range": "< 0.04 ng/mL",
      "clinical_flag": "NORMAL",
      "collected_at": "2026-09-01T08:30:00",
      "reported_at": "2026-09-01T10:15:00",
      "analyzer_id": "CoreLab-Analyzer-7"
    }
    """
    VENDOR_NAME = "Vendor A — CoreLab"
    MODALITY = "Pathology"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        result_val = raw.get("numeric_result", "")
        units = raw.get("units", "")
        return CanonicalObservation(
            event_id=f"EVT-CL-{raw.get('specimen_accession', 'UNK')}",
            case_id=raw.get("patient_ref", ""),
            modality=self.MODALITY,
            vendor=self.VENDOR_NAME,
            test_name=raw.get("test_description", raw.get("test_code", "")),
            result_summary=f"{result_val} {units}".strip(),
            interpretation=raw.get("clinical_flag"),
            event_timestamp=_parse_dt(raw.get("reported_at") or raw.get("collected_at")),
            source_system="CoreLab LIMS Enterprise 11.4",
            device_system=raw.get("analyzer_id"),
            specimen_id=raw.get("specimen_accession"),
            raw_payload=json.dumps(raw),
        )


class CardioVisionImagingNormaliser(VendorNormaliserBase):
    """
    Vendor B — CardioVision PACS Cloud v4.2
    Example raw payload shape:
    {
      "study_uid": "1.2.840.10008.5.1.4.1.1.12",
      "patient_mrn": "CASE-XXXX",
      "modality_code": "ECG",
      "report_title": "12-Lead ECG Report",
      "report_summary": "Normal sinus rhythm. QTc 420ms.",
      "radiologist_impression": "Normal",
      "study_date": "2026-09-01T09:00:00",
      "reported_date": "2026-09-01T11:30:00",
      "equipment": "CardioVision CV-12 Lead ECG"
    }
    """
    VENDOR_NAME = "Vendor B — CardioVision"
    MODALITY = "Imaging"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        return CanonicalObservation(
            event_id=f"EVT-CV-{raw.get('study_uid', 'UNK')[-8:]}",
            case_id=raw.get("patient_mrn", ""),
            modality=self.MODALITY,
            vendor=self.VENDOR_NAME,
            test_name=raw.get("report_title", raw.get("modality_code", "")),
            result_summary=raw.get("report_summary", ""),
            interpretation=raw.get("radiologist_impression"),
            event_timestamp=_parse_dt(raw.get("reported_date") or raw.get("study_date")),
            source_system="CardioVision PACS Cloud v4.2",
            device_system=raw.get("equipment"),
            raw_payload=json.dumps(raw),
        )


class GeneCoreNGSNormaliser(VendorNormaliserBase):
    """
    Vendor C — GeneCore NGS Sequencer 900
    Example raw payload shape:
    {
      "run_id": "RUN-20260901-042",
      "sample_id": "SPEC-001",
      "case_ref": "CASE-XXXX",
      "panel": "CardioPanel-48Gene",
      "gene_symbol": "TNNT2",
      "variant_call": "c.694C>T (p.Arg232Cys)",
      "pathogenicity": "Likely Pathogenic",
      "depth_of_coverage": 250,
      "run_completed_at": "2026-09-01T22:00:00",
      "sequencer": "GeneCore NGS Sequencer 900"
    }
    """
    VENDOR_NAME = "Vendor C — GeneCore"
    MODALITY = "Molecular"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        return CanonicalObservation(
            event_id=f"EVT-GC-{raw.get('run_id', 'UNK')}",
            case_id=raw.get("case_ref", ""),
            modality=self.MODALITY,
            vendor=self.VENDOR_NAME,
            test_name=f"NGS {raw.get('panel', '')} — {raw.get('gene_symbol', '')}",
            result_summary=raw.get("variant_call", "No variant detected"),
            interpretation=raw.get("pathogenicity"),
            event_timestamp=_parse_dt(raw.get("run_completed_at")),
            source_system="GeneCore NGS Sequencer 900",
            device_system=raw.get("sequencer"),
            specimen_id=raw.get("sample_id"),
            raw_payload=json.dumps(raw),
        )


class BioPulsePOCNormaliser(VendorNormaliserBase):
    """
    Vendor D — BioPulse Bedside Analyzer 3 (Point-of-Care Pathology)
    Example raw payload shape:
    {
      "device_serial": "BPA3-0042",
      "patient_barcode": "CASE-XXXX",
      "assay": "BNP",
      "result": "480",
      "unit": "pg/mL",
      "flag": "HIGH",
      "timestamp": "2026-09-01T07:45:00"
    }
    """
    VENDOR_NAME = "Vendor D — BioPulse POC"
    MODALITY = "Pathology"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        return CanonicalObservation(
            event_id=f"EVT-BP-{raw.get('device_serial','X')}-{raw.get('timestamp','').replace(':','').replace('-','')[:12]}",
            case_id=raw.get("patient_barcode", ""),
            modality=self.MODALITY,
            vendor=self.VENDOR_NAME,
            test_name=f"POC {raw.get('assay', '')}",
            result_summary=f"{raw.get('result','')} {raw.get('unit','')}".strip(),
            interpretation=raw.get("flag"),
            event_timestamp=_parse_dt(raw.get("timestamp")),
            source_system="BioPulse Bedside Analyzer 3",
            device_system=raw.get("device_serial"),
            raw_payload=json.dumps(raw),
        )


class UltraEchoImagingNormaliser(VendorNormaliserBase):
    """
    Vendor E — UltraEcho Workstation Pro (Echocardiography)
    Example raw payload shape:
    {
      "exam_id": "ECHO-20260901-007",
      "patient_id": "CASE-XXXX",
      "exam_type": "Transthoracic Echo",
      "lvef_percentage": 55,
      "wall_motion": "Normal",
      "impression": "Normal LV function",
      "exam_datetime": "2026-09-01T14:30:00",
      "sonographer": "UltraEcho Workstation Pro"
    }
    """
    VENDOR_NAME = "Vendor E — UltraEcho"
    MODALITY = "Imaging"

    def normalise(self, raw: Dict[str, Any]) -> CanonicalObservation:
        return CanonicalObservation(
            event_id=f"EVT-UE-{raw.get('exam_id', 'UNK')}",
            case_id=raw.get("patient_id", ""),
            modality=self.MODALITY,
            vendor=self.VENDOR_NAME,
            test_name=raw.get("exam_type", "Echocardiogram"),
            result_summary=f"LVEF {raw.get('lvef_percentage','')}% — Wall motion: {raw.get('wall_motion','')}",
            interpretation=raw.get("impression"),
            event_timestamp=_parse_dt(raw.get("exam_datetime")),
            source_system="UltraEcho Workstation Pro",
            device_system=raw.get("sonographer"),
            raw_payload=json.dumps(raw),
        )


# ─── Registry & Dispatch ─────────────────────────────────────────────────────

NORMALISER_REGISTRY: Dict[str, VendorNormaliserBase] = {
    "Vendor A — CoreLab":    CoreLabPathologyNormaliser(),
    "Vendor B — CardioVision": CardioVisionImagingNormaliser(),
    "Vendor C — GeneCore":   GeneCoreNGSNormaliser(),
    "Vendor D — BioPulse POC": BioPulsePOCNormaliser(),
    "Vendor E — UltraEcho":  UltraEchoImagingNormaliser(),
}


def normalise_vendor_payload(vendor_name: str, raw: Dict[str, Any]) -> CanonicalObservation:
    """
    Dispatch entry point for the normalisation layer.

    Usage:
        obs = normalise_vendor_payload("Vendor A — CoreLab", raw_lims_dict)
        # obs is a CanonicalObservation ready for storage as EvidenceEvent
    """
    normaliser = NORMALISER_REGISTRY.get(vendor_name)
    if not normaliser:
        raise ValueError(
            f"No normaliser registered for vendor '{vendor_name}'. "
            f"Known vendors: {list(NORMALISER_REGISTRY.keys())}"
        )
    return normaliser.normalise(raw)


def normalise_to_fhir(vendor_name: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience: normalise and immediately serialise to FHIR JSON."""
    return normalise_vendor_payload(vendor_name, raw).to_fhir_observation()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_dt(value: Optional[str]) -> datetime:
    """Parse ISO datetime string; fall back to now if missing."""
    if not value:
        return datetime.utcnow()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return datetime.utcnow()
