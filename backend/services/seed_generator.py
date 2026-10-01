import random
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import (
    Case, EvidenceEvent, Specimen, ReviewDecision,
    AuditLog, Vendor, UserFeedback, ExperimentRun, SystemSetting
)

def seed_database(db: Session, force: bool = False):
    """
    Seeds database with predefined cases, evidence events,
    specimens, vendors, audit logs, and clinical scenarios.
    """
    if not force and db.query(Case).count() >= 10:
        return

    # Clear existing tables if force
    if force:
        db.query(AuditLog).delete()
        db.query(UserFeedback).delete()
        db.query(ExperimentRun).delete()
        db.query(SystemSetting).delete()
        db.query(ReviewDecision).delete()
        db.query(EvidenceEvent).delete()
        db.query(Specimen).delete()
        db.query(Vendor).delete()
        db.query(Case).delete()
        db.commit()

    # Seed vendors
    vendors_data = [
        ("Vendor A — CoreLab", "Pathology", "CoreLab LIMS Enterprise 11.4", "Active"),
        ("Vendor B — CardioVision", "Imaging", "CardioVision PACS Cloud v4.2", "Active"),
        ("Vendor C — GeneCore", "Molecular", "GeneCore NGS Sequencer 900", "Active"),
        ("Vendor D — BioPulse POC", "Pathology", "BioPulse Bedside Analyzer 3", "Active"),
        ("Vendor E — UltraEcho", "Imaging", "UltraEcho Workstation Pro", "Active"),
    ]
    for v_name, mod, sys_name, status in vendors_data:
        db.add(Vendor(vendor_name=v_name, modality=mod, system_name=sys_name, status=status))

    # Seed system settings
    default_settings = {
        "freshness_thresholds": {"current_days": 7, "stale_days": 30, "very_stale_days": 60},
        "required_modalities": ["Pathology", "Imaging", "Molecular"],
        "demo_mode": True,
        "privacy_enforcement": True
    }
    for k, v in default_settings.items():
        db.add(SystemSetting(key=k, value_json=json.dumps(v)))

    # Seed predefined DEMO CASES (CASE-1001 to CASE-1005)
    now = datetime.utcnow()

    # --- CASE-1001: Complete Case ---
    c1001 = Case(
        case_id="CASE-1001",
        patient_synthetic_id="SYN-PT-1001",
        age_range="55-64",
        gender="F",
        consent_status="Granted",
        risk_level="Low",
        status="Complete",
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(days=1)
    )
    db.add(c1001)
    db.flush()

    s1001 = Specimen(
        specimen_id="SPEC-001",
        parent_specimen_id=None,
        case_id="CASE-1001",
        collection_timestamp=now - timedelta(days=4, hours=2),
        source="Venous Blood",
        specimen_type="Whole Blood & Plasma"
    )
    db.add(s1001)
    db.flush()

    db.add(EvidenceEvent(
        event_id="EVT-1001-PATH",
        case_id="CASE-1001",
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="High-Sensitivity Troponin I",
        result_summary="14 ng/L (Reference: < 16 ng/L)",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=3, hours=4),
        freshness="Current",
        specimen_id="SPEC-001",
        source_system="CoreLab LIMS Enterprise",
        device_system="Cobas e411",
        validation_status="Valid",
        review_status="Reviewed"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1001-IMG",
        case_id="CASE-1001",
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Transthoracic Echocardiogram",
        result_summary="LVEF 58%; normal biventricular size and systolic function; trace MR",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=2, hours=1),
        freshness="Current",
        specimen_id=None,
        source_system="CardioVision PACS",
        device_system="Philips Epiq CVx",
        validation_status="Valid",
        review_status="Reviewed"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1001-MOL",
        case_id="CASE-1001",
        modality="Molecular",
        vendor="Vendor C — GeneCore",
        test_name="Comprehensive Inherited Cardiomyopathy NGS Panel (124 genes)",
        result_summary="No pathogenic or likely pathogenic variants identified in tested genes",
        interpretation="Benign / Negative",
        event_timestamp=now - timedelta(days=1, hours=3),
        freshness="Current",
        specimen_id="SPEC-001",
        source_system="GeneCore NGS Sequencer",
        device_system="Illumina NovaSeq 6000",
        validation_status="Valid",
        review_status="Reviewed"
    ))

    db.add(ReviewDecision(
        case_id="CASE-1001",
        reviewer_role="Cardiologist",
        reviewer_name="Dr. E. Vance, MD",
        status="Complete",
        decision_text="All 3 modality streams unified and normal. Case review completed with high confidence.",
        created_at=now - timedelta(hours=12)
    ))

    # --- CASE-1002: Stale Pathology + Missing Molecular ---
    c1002 = Case(
        case_id="CASE-1002",
        patient_synthetic_id="SYN-PT-1002",
        age_range="65-74",
        gender="M",
        consent_status="Granted",
        risk_level="High",
        status="Incomplete",
        created_at=now - timedelta(days=40),
        updated_at=now - timedelta(days=2)
    )
    db.add(c1002)
    db.flush()

    s1002 = Specimen(
        specimen_id="SPEC-002",
        case_id="CASE-1002",
        collection_timestamp=now - timedelta(days=36),
        source="Venous Blood",
        specimen_type="Serum"
    )
    db.add(s1002)
    db.flush()

    db.add(EvidenceEvent(
        event_id="EVT-1002-PATH",
        case_id="CASE-1002",
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="Troponin T & NT-proBNP",
        result_summary="Troponin T: 48 ng/L (Elevated); NT-proBNP: 1,420 pg/mL (Elevated)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=35),
        freshness="Very Stale",
        specimen_id="SPEC-002",
        source_system="CoreLab LIMS Enterprise",
        validation_status="Valid",
        review_status="Unreviewed"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1002-IMG",
        case_id="CASE-1002",
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Stress Cardiac MRI",
        result_summary="Subendocardial perfusion deficit in basal to mid inferolateral wall; LVEF 44%",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=4),
        freshness="Current",
        specimen_id=None,
        source_system="CardioVision PACS",
        validation_status="Valid",
        review_status="Unreviewed"
    ))
    # Molecular intentionally missing!

    db.add(ReviewDecision(
        case_id="CASE-1002",
        reviewer_role="Reviewer",
        reviewer_name="Multidisciplinary Review Panel",
        status="Needs More Evidence",
        decision_text="Pathology is stale (>30 days). Molecular panel result is missing. Order fresh biomarker panel and retrieve molecular sequencing report.",
        missing_evidence_identified="Molecular Cardiac NGS Panel",
        stale_evidence_identified="Troponin T & NT-proBNP (35 days old)",
        created_at=now - timedelta(days=1)
    ))

    # --- CASE-1003: Specimen Lineage Mismatch ---
    c1003 = Case(
        case_id="CASE-1003",
        patient_synthetic_id="SYN-PT-1003",
        age_range="45-54",
        gender="F",
        consent_status="Granted",
        risk_level="High",
        status="Blocked",
        created_at=now - timedelta(days=6),
        updated_at=now - timedelta(hours=4)
    )
    db.add(c1003)
    db.flush()

    s1003_expected = Specimen(
        specimen_id="SPEC-020",
        case_id="CASE-1003",
        collection_timestamp=now - timedelta(days=4),
        source="Peripheral Blood",
        specimen_type="EDTA Tube"
    )
    db.add(s1003_expected)
    db.flush()

    db.add(EvidenceEvent(
        event_id="EVT-1003-PATH",
        case_id="CASE-1003",
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="CK-MB and Myoglobin",
        result_summary="CK-MB: 4.2 ng/mL (Normal); Myoglobin: 45 ng/mL (Normal)",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=3),
        freshness="Current",
        specimen_id="SPEC-020",
        validation_status="Valid",
        review_status="Unreviewed"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1003-IMG",
        case_id="CASE-1003",
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Echocardiogram",
        result_summary="LVEF 52%; concentric LV remodeling; no regional wall motion abnormalities",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=2),
        freshness="Current",
        validation_status="Valid",
        review_status="Unreviewed"
    ))
    # Mismatch! Molecular references SPEC-999 which does NOT belong to CASE-1003
    db.add(EvidenceEvent(
        event_id="EVT-1003-MOL",
        case_id="CASE-1003",
        modality="Molecular",
        vendor="Vendor C — GeneCore",
        test_name="Hypertrophic Cardiomyopathy MYH7/MYBPC3 Targeted Panel",
        result_summary="Variant of Uncertain Significance: MYH7 c.2155C>T (p.Arg719Trp)",
        interpretation="VUS",
        event_timestamp=now - timedelta(days=1),
        freshness="Current",
        specimen_id="SPEC-999", # MISMATCH!
        validation_status="Lineage Mismatch",
        review_status="Flagged"
    ))

    # --- CASE-1004: Duplicate Evidence ---
    c1004 = Case(
        case_id="CASE-1004",
        patient_synthetic_id="SYN-PT-1004",
        age_range="50-59",
        gender="M",
        consent_status="Granted",
        risk_level="Moderate",
        status="Needs Review",
        created_at=now - timedelta(days=3),
        updated_at=now - timedelta(hours=2)
    )
    db.add(c1004)
    db.flush()

    s1004 = Specimen(
        specimen_id="SPEC-004",
        case_id="CASE-1004",
        collection_timestamp=now - timedelta(days=2),
        source="Venous Blood",
        specimen_type="Serum"
    )
    db.add(s1004)
    db.flush()

    # Event 1 & Event 2 with identical Event ID
    db.add(EvidenceEvent(
        event_id="EVT-DUP-4001",
        case_id="CASE-1004",
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="Serial Troponin I - 0hr Draw",
        result_summary="28 ng/L (Borderline elevated)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=2, hours=3),
        freshness="Current",
        specimen_id="SPEC-004",
        validation_status="Duplicate",
        review_status="Flagged"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-DUP-4001",
        case_id="CASE-1004",
        modality="Pathology",
        vendor="Vendor D — BioPulse POC",
        test_name="Bedside Troponin I - 0hr Draw (Duplicate Transmission)",
        result_summary="29 ng/L (Borderline elevated)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=2, hours=3),
        freshness="Current",
        specimen_id="SPEC-004",
        validation_status="Duplicate",
        review_status="Flagged"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1004-IMG",
        case_id="CASE-1004",
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Coronary CT Angiogram",
        result_summary="CAD-RADS 2: Mild non-obstructive coronary atherosclerosis (<50% stenosis)",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=1),
        freshness="Current",
        validation_status="Valid",
        review_status="Unreviewed"
    ))

    # --- CASE-1005: Conflicting Vendor Results ---
    c1005 = Case(
        case_id="CASE-1005",
        patient_synthetic_id="SYN-PT-1005",
        age_range="60-69",
        gender="F",
        consent_status="Restricted", # Also tests restricted consent!
        risk_level="High",
        status="Under Review",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(hours=1)
    )
    db.add(c1005)
    db.flush()

    s1005 = Specimen(
        specimen_id="SPEC-005",
        case_id="CASE-1005",
        collection_timestamp=now - timedelta(days=3),
        source="Venous Blood",
        specimen_type="Plasma"
    )
    db.add(s1005)
    db.flush()

    # Conflicting reports between Vendor B and Vendor E
    db.add(EvidenceEvent(
        event_id="EVT-1005-IMG-A",
        case_id="CASE-1005",
        modality="Imaging",
        vendor="Vendor B — CardioVision",
        test_name="Transthoracic Echocardiogram (Automated AI)",
        result_summary="LVEF 58%; Normal left ventricular systolic function; No RWMA",
        interpretation="Normal",
        event_timestamp=now - timedelta(days=2, hours=4),
        freshness="Current",
        validation_status="Conflicting",
        review_status="Flagged"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1005-IMG-B",
        case_id="CASE-1005",
        modality="Imaging",
        vendor="Vendor E — UltraEcho",
        test_name="Handheld Cardiac Ultrasound",
        result_summary="LVEF 34%; Severe diffuse hypokinesis; Moderate LV systolic dysfunction",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=2, hours=2),
        freshness="Current",
        validation_status="Conflicting",
        review_status="Flagged"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1005-PATH",
        case_id="CASE-1005",
        modality="Pathology",
        vendor="Vendor A — CoreLab",
        test_name="hs-cTnI and BNP",
        result_summary="hs-cTnI: 92 ng/L (Elevated); BNP: 620 pg/mL (Elevated)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=2),
        freshness="Current",
        specimen_id="SPEC-005",
        validation_status="Valid",
        review_status="Unreviewed"
    ))

    # --- CASE-1006: Stale Imaging + Stale Pathology (>35d) ---
    db.add(Case(
        case_id="CASE-1006", patient_synthetic_id="PT-1006",
        age_range="70-79", gender="M", consent_status="Granted",
        risk_level="High", status="Needs Review",
        created_at=now - timedelta(days=45)
    ))
    db.flush()
    db.add(EvidenceEvent(
        event_id="EVT-1006-PATH", case_id="CASE-1006",
        modality="Pathology", vendor="Vendor A — CoreLab",
        test_name="NT-proBNP Biomarker",
        result_summary="3120 pg/mL (Significantly Elevated)",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=40),
        freshness="Very Stale", validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1006-IMG", case_id="CASE-1006",
        modality="Imaging", vendor="Vendor B — CardioVision",
        test_name="Transthoracic Echocardiogram",
        result_summary="LVEF 32%; severe systolic dysfunction; dilated LV",
        interpretation="Abnormal",
        event_timestamp=now - timedelta(days=35),
        freshness="Very Stale", validation_status="Valid"
    ))

    # --- CASE-1007: Complete — Low Risk ---
    db.add(Case(
        case_id="CASE-1007", patient_synthetic_id="PT-1007",
        age_range="35-44", gender="F", consent_status="Granted",
        risk_level="Low", status="Complete",
        created_at=now - timedelta(days=3)
    ))
    db.flush()
    s1007 = Specimen(specimen_id="SPEC-007", case_id="CASE-1007",
        source="Venous Blood", specimen_type="Plasma",
        collection_timestamp=now - timedelta(days=3))
    db.add(s1007)
    db.flush()
    db.add(EvidenceEvent(
        event_id="EVT-1007-PATH", case_id="CASE-1007",
        modality="Pathology", vendor="Vendor A — CoreLab",
        test_name="High-Sensitivity Troponin I",
        result_summary="8 ng/L (Reference: < 16 ng/L)",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(days=2),
        specimen_id="SPEC-007", validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1007-IMG", case_id="CASE-1007",
        modality="Imaging", vendor="Vendor E — UltraEcho",
        test_name="Stress Echocardiogram",
        result_summary="No inducible ischemia; LVEF response 55%→68%",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(days=1, hours=5),
        validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1007-MOL", case_id="CASE-1007",
        modality="Molecular", vendor="Vendor C — GeneCore",
        test_name="Hypertrophic Cardiomyopathy Panel (MYBPC3)",
        result_summary="No pathogenic variants detected",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(hours=18),
        specimen_id="SPEC-007", validation_status="Valid"
    ))

    # --- CASE-1008: Missing Imaging ---
    db.add(Case(
        case_id="CASE-1008", patient_synthetic_id="PT-1008",
        age_range="55-64", gender="M", consent_status="Granted",
        risk_level="High", status="Incomplete",
        created_at=now - timedelta(days=2)
    ))
    db.flush()
    db.add(EvidenceEvent(
        event_id="EVT-1008-PATH", case_id="CASE-1008",
        modality="Pathology", vendor="Vendor D — BioPulse POC",
        test_name="Bedside Troponin & BNP Panel",
        result_summary="Troponin I: 240 ng/L (Elevated); BNP: 890 pg/mL",
        interpretation="Abnormal", freshness="Current",
        event_timestamp=now - timedelta(hours=30),
        validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1008-MOL", case_id="CASE-1008",
        modality="Molecular", vendor="Vendor C — GeneCore",
        test_name="Dilated Cardiomyopathy Panel (LMNA)",
        result_summary="LMNA c.357+1G>A Heterozygous Splice Variant — Pathogenic",
        interpretation="Pathogenic", freshness="Current",
        event_timestamp=now - timedelta(hours=6),
        validation_status="Valid"
    ))

    # --- CASE-1009: Pending Consent ---
    db.add(Case(
        case_id="CASE-1009", patient_synthetic_id="PT-1009",
        age_range="50-59", gender="F", consent_status="Pending",
        risk_level="Moderate", status="Complete",
        created_at=now - timedelta(days=1)
    ))
    db.flush()
    db.add(EvidenceEvent(
        event_id="EVT-1009-PATH", case_id="CASE-1009",
        modality="Pathology", vendor="Vendor A — CoreLab",
        test_name="High-Sensitivity Troponin I",
        result_summary="22 ng/L (Mildly Elevated)",
        interpretation="Elevated", freshness="Current",
        event_timestamp=now - timedelta(hours=20),
        validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1009-IMG", case_id="CASE-1009",
        modality="Imaging", vendor="Vendor B — CardioVision",
        test_name="Coronary CT Angiography",
        result_summary="CAD-RADS 2: Mild non-obstructive coronary disease (25-49%)",
        interpretation="Mildly Abnormal", freshness="Current",
        event_timestamp=now - timedelta(hours=14),
        validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1009-MOL", case_id="CASE-1009",
        modality="Molecular", vendor="Vendor C — GeneCore",
        test_name="Ion Channelopathy Panel (SCN5A)",
        result_summary="No pathogenic variants detected",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(hours=4),
        validation_status="Valid"
    ))

    # --- CASE-1010: Complete — Young Adult ---
    db.add(Case(
        case_id="CASE-1010", patient_synthetic_id="PT-1010",
        age_range="30-39", gender="M", consent_status="Granted",
        risk_level="Low", status="Complete",
        created_at=now - timedelta(days=4)
    ))
    db.flush()
    s1010 = Specimen(specimen_id="SPEC-010", case_id="CASE-1010",
        source="Venous Blood", specimen_type="Whole Blood",
        collection_timestamp=now - timedelta(days=4))
    db.add(s1010)
    db.flush()
    db.add(EvidenceEvent(
        event_id="EVT-1010-PATH", case_id="CASE-1010",
        modality="Pathology", vendor="Vendor A — CoreLab",
        test_name="High-Sensitivity Troponin I",
        result_summary="10 ng/L (Reference: < 16 ng/L)",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(days=3),
        specimen_id="SPEC-010", validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1010-IMG", case_id="CASE-1010",
        modality="Imaging", vendor="Vendor B — CardioVision",
        test_name="Transthoracic Echocardiogram",
        result_summary="LVEF 65%; normal biventricular function; no valvular abnormality",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(days=2, hours=6),
        validation_status="Valid"
    ))
    db.add(EvidenceEvent(
        event_id="EVT-1010-MOL", case_id="CASE-1010",
        modality="Molecular", vendor="Vendor C — GeneCore",
        test_name="Arrhythmogenic Cardiomyopathy Panel (PKP2)",
        result_summary="No pathogenic variants detected",
        interpretation="Normal", freshness="Current",
        event_timestamp=now - timedelta(days=1),
        specimen_id="SPEC-010", validation_status="Valid"
    ))

    db.commit()

    # Seed initial audit logs
    audit_samples = [
        ("Administrator", "Database Seeded", "System", "SUCCESS", "Initialized 10 clinical cases and multidisciplinary evidence events", None),
        ("Cardiologist", "Case Opened", "CASE-1001", "SUCCESS", "Viewed unified timeline", "CASE-1001"),
        ("Reviewer", "Review Created", "CASE-1001", "SUCCESS", "Marked complete", "CASE-1001"),
        ("Pathologist", "Evidence Viewed", "EVT-1002-PATH", "SUCCESS", "Inspected Troponin T & NT-proBNP", "CASE-1002"),
        ("Molecular Specialist", "Lineage Mismatch Detected", "CASE-1003", "DETECTED", "Flagged SPEC-999 lineage conflict", "CASE-1003"),
        ("Cardiologist", "Restricted Access Attempt", "CASE-1005", "BLOCKED", "Attempted to view consent-restricted molecular detail", "CASE-1005"),
    ]
    for role, act, res, outcome, details, cid in audit_samples:
        db.add(AuditLog(
            case_id=cid,
            user_role=role,
            action=act,
            resource=res,
            result=outcome,
            details=details,
            timestamp=now - timedelta(hours=random.randint(1, 20))
        ))

    # Seed initial experiment trial runs
    experiment_samples = [
        ("Simulated", 1120.0, 210.0, 76.0, 99.4, 10, 10, 5, "Initial benchmark trial set 1"),
        ("Simulated", 1040.0, 195.0, 80.0, 98.8, 10, 10, 5, "Trial set 2: Cardiology multidisciplinary panel"),
        ("Simulated", 1250.0, 240.0, 74.5, 99.1, 10, 10, 5, "Trial set 3: Complex multi-vendor cases"),
        ("Manual", 980.0, 180.0, 82.0, 100.0, 10, 10, 5, "Observer-timed clinic trial"),
    ]
    for r_type, base_t, proto_t, base_acc, proto_acc, mis_det, stl_det, lin_det, notes in experiment_samples:
        db.add(ExperimentRun(
            run_type=r_type,
            baseline_time_seconds=base_t,
            prototype_time_seconds=proto_t,
            accuracy_baseline=base_acc,
            accuracy_prototype=proto_acc,
            missing_detected=mis_det,
            stale_detected=stl_det,
            lineage_detected=lin_det,
            notes=notes,
            created_at=now - timedelta(days=random.randint(1, 10))
        ))

    # Seed initial user feedback
    feedback_samples = [
        ("Cardiologist", "Review CASE-1001 and CASE-1002", 185.0, 5, 5, 5, "Timeline clearly shows stale lab values immediately.", "Add quick filter by abnormal values."),
        ("Pathologist", "Specimen Lineage Check", 120.0, 5, 5, 4, "The lineage mismatch flag saved us from wrong specimen review.", "Show specimen aliquots."),
        ("Molecular Specialist", "Cardiac NGS Variant Verification", 210.0, 4, 5, 5, "Provenance pipeline makes source tracking effortless.", "Include link to ClinVar synthetic tags."),
        ("Reviewer", "Multidisciplinary Review Sign-off", 150.0, 5, 5, 5, "Drastic improvement over logging into three distinct vendor portals.", "Great prototype demonstration!"),
    ]
    for role, task, t_sec, ease, clar, conf, comm, sugg in feedback_samples:
        db.add(UserFeedback(
            user_role=role,
            task_completed=task,
            time_taken_seconds=t_sec,
            ease_of_use=ease,
            timeline_clarity=clar,
            completeness_confidence=conf,
            comments=comm,
            suggested_improvements=sugg,
            created_at=now - timedelta(days=random.randint(1, 5))
        ))

    db.commit()
    print("Database seeded successfully with 10 cases.")
