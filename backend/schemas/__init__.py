from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Case Schemas ---
class CaseBase(BaseModel):
    case_id: str
    patient_synthetic_id: str
    age_range: str = "50-59"
    gender: str = "Unknown"
    consent_status: str = "Granted"
    risk_level: str = "Moderate"
    status: str = "Needs Review"

class CaseCreate(CaseBase):
    pass

class ModalitySummary(BaseModel):
    present: bool = False
    count: int = 0
    freshness: str = "Missing" # Current, Stale, Very Stale, Missing
    latest_test: Optional[str] = None
    latest_result: Optional[str] = None
    latest_timestamp: Optional[datetime] = None

class CaseItem(CaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    completeness_percentage: int = 0
    pathology: ModalitySummary
    imaging: ModalitySummary
    molecular: ModalitySummary
    evidence_health: str = "Healthy" # Healthy, Degraded, Stale, Incomplete, Warning
    review_status: str = "Not Started"

    model_config = ConfigDict(from_attributes=True)

# --- Evidence Event Schemas ---
class EvidenceEventBase(BaseModel):
    event_id: str
    case_id: str
    modality: str
    vendor: str
    test_name: str
    result_summary: str
    interpretation: str = "Normal"
    event_timestamp: datetime
    ingestion_timestamp: Optional[datetime] = None
    freshness: str = "Current"
    specimen_id: Optional[str] = None
    parent_specimen_id: Optional[str] = None
    source_system: str = "LIMS"
    device_system: str = "Analyzer"
    validation_status: str = "Valid"
    review_status: str = "Unreviewed"
    raw_payload: Optional[str] = None

class EvidenceEventCreate(EvidenceEventBase):
    pass

class EvidenceEventItem(EvidenceEventBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class EvidenceProvenanceStep(BaseModel):
    step: str
    system: str
    timestamp: datetime
    status: str
    description: str

class EvidenceDetail(EvidenceEventItem):
    provenance: List[EvidenceProvenanceStep] = []

# --- Specimen Schemas ---
class SpecimenItem(BaseModel):
    id: int
    specimen_id: str
    parent_specimen_id: Optional[str] = None
    case_id: str
    collection_timestamp: datetime
    source: str
    specimen_type: str

    model_config = ConfigDict(from_attributes=True)

class LineageNode(BaseModel):
    id: str
    label: str
    type: str # Specimen, Pathology, Molecular
    details: Dict[str, Any] = {}
    status: str = "Valid" # Valid, Mismatch, Warning
    children: List["LineageNode"] = []

class LineageGraphResponse(BaseModel):
    case_id: str
    root_specimens: List[LineageNode]
    has_mismatch: bool = False
    mismatch_details: Optional[str] = None

# --- Review Schemas ---
class ReviewDecisionBase(BaseModel):
    case_id: str
    reviewer_role: str
    reviewer_name: str = "Specialist"
    status: str # Not Started, In Review, Needs More Evidence, Complete, Escalated
    decision_text: str
    missing_evidence_identified: Optional[str] = None
    stale_evidence_identified: Optional[str] = None
    lineage_issue_identified: Optional[str] = None

class ReviewDecisionCreate(ReviewDecisionBase):
    pass

class ReviewDecisionItem(ReviewDecisionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Audit Schemas ---
class AuditLogBase(BaseModel):
    case_id: Optional[str] = None
    user_role: str
    action: str
    resource: str
    result: str = "SUCCESS"
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogItem(AuditLogBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Feedback Schemas ---
class UserFeedbackCreate(BaseModel):
    user_role: str
    task_completed: str
    time_taken_seconds: float = 180.0
    ease_of_use: int = 5
    timeline_clarity: int = 5
    completeness_confidence: int = 5
    comments: Optional[str] = None
    suggested_improvements: Optional[str] = None

class UserFeedbackItem(UserFeedbackCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FeedbackMetrics(BaseModel):
    total_responses: int = 0
    avg_ease_of_use: float = 0.0
    avg_timeline_clarity: float = 0.0
    avg_completeness_confidence: float = 0.0
    avg_time_seconds: float = 0.0

# --- Experiment Schemas ---
class ExperimentRunCreate(BaseModel):
    run_type: str = "Simulated"
    baseline_time_seconds: float
    prototype_time_seconds: float
    accuracy_baseline: float = 78.5
    accuracy_prototype: float = 99.2
    missing_detected: int = 10
    stale_detected: int = 10
    lineage_detected: int = 5
    notes: Optional[str] = None

class ExperimentRunItem(ExperimentRunCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ExperimentSummary(BaseModel):
    total_runs: int = 0
    mean_baseline_seconds: float = 0.0
    median_baseline_seconds: float = 0.0
    mean_prototype_seconds: float = 0.0
    median_prototype_seconds: float = 0.0
    time_reduction_percentage: float = 0.0
    time_saved_minutes: float = 0.0
    accuracy_baseline: float = 0.0
    accuracy_prototype: float = 0.0
    runs: List[ExperimentRunItem] = []

# --- Dashboard Metrics ---
class DashboardMetrics(BaseModel):
    total_cases: int = 0
    complete_cases: int = 0
    cases_needing_review: int = 0
    incomplete_cases: int = 0
    missing_evidence_cases: int = 0
    stale_evidence_cases: int = 0
    modality_counts: Dict[str, int] = {}
    vendor_counts: Dict[str, int] = {}
    recent_events_count: int = 0
