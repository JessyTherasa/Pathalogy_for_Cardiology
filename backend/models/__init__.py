from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database.session import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_synthetic_id = Column(String(50), nullable=False)
    age_range = Column(String(20), default="50-59")
    gender = Column(String(10), default="Unknown")
    consent_status = Column(String(30), default="Granted") # Granted, Restricted, Pending
    risk_level = Column(String(30), default="Moderate")    # Low, Moderate, High
    status = Column(String(50), default="Needs Review")    # Complete, Needs Review, Incomplete, Blocked, Under Review
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    events = relationship("EvidenceEvent", back_populates="case", cascade="all, delete-orphan")
    specimens = relationship("Specimen", back_populates="case", cascade="all, delete-orphan")
    reviews = relationship("ReviewDecision", back_populates="case", cascade="all, delete-orphan")


class EvidenceEvent(Base):
    __tablename__ = "evidence_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), index=True, nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id"), index=True, nullable=False)
    modality = Column(String(50), nullable=False) # Pathology, Imaging, Molecular
    vendor = Column(String(100), nullable=False)   # Vendor A, Vendor B, Vendor C
    test_name = Column(String(150), nullable=False) # e.g. Troponin I, Echocardiogram
    result_summary = Column(Text, nullable=False)
    interpretation = Column(String(50), default="Normal") # Normal, Abnormal, Pathogenic, VUS, Inconclusive
    event_timestamp = Column(DateTime, nullable=False)
    ingestion_timestamp = Column(DateTime, default=datetime.utcnow)
    freshness = Column(String(30), default="Current") # Current, Stale, Very Stale, Missing
    specimen_id = Column(String(50), nullable=True)
    parent_specimen_id = Column(String(50), nullable=True)
    source_system = Column(String(100), default="LIMS")
    device_system = Column(String(100), default="Analyzer 9000")
    validation_status = Column(String(50), default="Valid") # Valid, Duplicate, Lineage Mismatch, Conflicting, Invalid
    review_status = Column(String(50), default="Unreviewed") # Unreviewed, Reviewed, Flagged
    raw_payload = Column(Text, nullable=True)

    case = relationship("Case", back_populates="events")


class Specimen(Base):
    __tablename__ = "specimens"

    id = Column(Integer, primary_key=True, index=True)
    specimen_id = Column(String(50), index=True, nullable=False)
    parent_specimen_id = Column(String(50), nullable=True)
    case_id = Column(String(50), ForeignKey("cases.case_id"), index=True, nullable=False)
    collection_timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String(100), default="Whole Blood")
    specimen_type = Column(String(100), default="Serum")

    case = relationship("Case", back_populates="specimens")


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.case_id"), index=True, nullable=False)
    reviewer_role = Column(String(50), nullable=False) # Cardiologist, Pathologist, etc.
    reviewer_name = Column(String(100), default="Demo Specialist")
    status = Column(String(50), nullable=False) # Not Started, In Review, Needs More Evidence, Complete, Escalated
    decision_text = Column(Text, nullable=False)
    missing_evidence_identified = Column(String(200), nullable=True)
    stale_evidence_identified = Column(String(200), nullable=True)
    lineage_issue_identified = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="reviews")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), nullable=True, index=True)
    user_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(150), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    result = Column(String(50), default="SUCCESS") # SUCCESS, BLOCKED, WARNING, DETECTED
    details = Column(Text, nullable=True)


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    vendor_name = Column(String(100), nullable=False)
    modality = Column(String(50), nullable=False)
    system_name = Column(String(100), nullable=False)
    status = Column(String(50), default="Active") # Active, Degraded, Offline


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_role = Column(String(50), nullable=False)
    task_completed = Column(String(150), nullable=False)
    time_taken_seconds = Column(Float, default=180.0)
    ease_of_use = Column(Integer, default=5) # 1-5
    timeline_clarity = Column(Integer, default=5) # 1-5
    completeness_confidence = Column(Integer, default=5) # 1-5
    comments = Column(Text, nullable=True)
    suggested_improvements = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_type = Column(String(50), default="Simulated") # Simulated, Manual
    baseline_time_seconds = Column(Float, nullable=False)
    prototype_time_seconds = Column(Float, nullable=False)
    accuracy_baseline = Column(Float, default=78.5)
    accuracy_prototype = Column(Float, default=99.2)
    missing_detected = Column(Integer, default=10)
    stale_detected = Column(Integer, default=10)
    lineage_detected = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value_json = Column(Text, nullable=False)
