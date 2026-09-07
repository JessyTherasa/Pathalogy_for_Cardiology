from datetime import datetime, timedelta
import random
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.models import Case, EvidenceEvent, Specimen
from backend.services.audit_service import log_audit
from backend.services.freshness_engine import calculate_freshness
from backend.routers.rbac import require_roles, ADMIN_ONLY

router = APIRouter(
    prefix="/ingestion",
    tags=["ingestion"],
    dependencies=[Depends(require_roles(*ADMIN_ONLY))]
)

# In-memory session stats counter (backed by DB query as well)
INGESTION_STATS = {
    "records_received": 1420,
    "records_accepted": 1385,
    "records_rejected": 35,
    "validation_errors": 18,
    "duplicate_records": 12,
    "linkage_errors": 5
}

@router.get("/stats")
def get_ingestion_stats(db: Session = Depends(get_db)):
    total_events = db.query(EvidenceEvent).count()
    dup_count = db.query(EvidenceEvent).filter(EvidenceEvent.validation_status == "Duplicate").count()
    lineage_count = db.query(EvidenceEvent).filter(EvidenceEvent.validation_status == "Lineage Mismatch").count()
    conflict_count = db.query(EvidenceEvent).filter(EvidenceEvent.validation_status == "Conflicting").count()

    return {
        "records_received": INGESTION_STATS["records_received"] + total_events,
        "records_accepted": INGESTION_STATS["records_accepted"] + (total_events - dup_count - lineage_count),
        "records_rejected": INGESTION_STATS["records_rejected"] + dup_count + lineage_count,
        "validation_errors": INGESTION_STATS["validation_errors"] + conflict_count,
        "duplicate_records": INGESTION_STATS["duplicate_records"] + dup_count,
        "linkage_errors": INGESTION_STATS["linkage_errors"] + lineage_count
    }

@router.post("/generate")
def generate_vendor_event(
    action_type: str, # pathology, imaging, molecular, complete_case, missing_case, stale_case, lineage_case
    case_id: Optional[str] = None,
    user_role: Optional[str] = Header("Administrator", alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    rand_num = random.randint(2000, 9999)

    if action_type == "pathology":
        cid = case_id or f"CASE-{random.randint(1001, 1050)}"
        evt = EvidenceEvent(
            event_id=f"EVT-ING-PATH-{rand_num}",
            case_id=cid,
            modality="Pathology",
            vendor="Vendor A — CoreLab",
            test_name="Serum Troponin I (High Sensitivity)",
            result_summary=f"{random.randint(8, 95)} ng/L",
            interpretation="Normal" if random.random() > 0.4 else "Abnormal",
            event_timestamp=now - timedelta(minutes=random.randint(5, 120)),
            freshness="Current",
            specimen_id=f"SPEC-{cid.replace('CASE-', '')}",
            source_system="CoreLab LIMS Enterprise 11.4",
            validation_status="Valid"
        )
        db.add(evt)
        db.commit()
        log_audit(db, user_role, "Data Ingested", f"{cid}:{evt.event_id}", "SUCCESS", "Generated synthetic pathology event", cid)
        return {"status": "success", "event_id": evt.event_id, "case_id": cid, "modality": "Pathology"}

    elif action_type == "imaging":
        cid = case_id or f"CASE-{random.randint(1001, 1050)}"
        evt = EvidenceEvent(
            event_id=f"EVT-ING-IMG-{rand_num}",
            case_id=cid,
            modality="Imaging",
            vendor="Vendor B — CardioVision",
            test_name="2D Transthoracic Echocardiogram",
            result_summary=f"LVEF {random.randint(40, 65)}%; mild concentric LV hypertrophy",
            interpretation="Normal" if random.random() > 0.3 else "Abnormal",
            event_timestamp=now - timedelta(hours=random.randint(1, 12)),
            freshness="Current",
            source_system="CardioVision PACS Cloud v4.2",
            validation_status="Valid"
        )
        db.add(evt)
        db.commit()
        log_audit(db, user_role, "Data Ingested", f"{cid}:{evt.event_id}", "SUCCESS", "Generated synthetic imaging event", cid)
        return {"status": "success", "event_id": evt.event_id, "case_id": cid, "modality": "Imaging"}

    elif action_type == "molecular":
        cid = case_id or f"CASE-{random.randint(1001, 1050)}"
        evt = EvidenceEvent(
            event_id=f"EVT-ING-MOL-{rand_num}",
            case_id=cid,
            modality="Molecular",
            vendor="Vendor C — GeneCore",
            test_name="Arrhythmogenic Cardiomyopathy Panel",
            result_summary="PKP2 c.2146-1G>C Heterozygous Splice Variant",
            interpretation="Pathogenic",
            event_timestamp=now - timedelta(hours=random.randint(2, 24)),
            freshness="Current",
            specimen_id=f"SPEC-{cid.replace('CASE-', '')}",
            source_system="GeneCore NGS Sequencer 900",
            validation_status="Valid"
        )
        db.add(evt)
        db.commit()
        log_audit(db, user_role, "Data Ingested", f"{cid}:{evt.event_id}", "SUCCESS", "Generated synthetic molecular event", cid)
        return {"status": "success", "event_id": evt.event_id, "case_id": cid, "modality": "Molecular"}

    elif action_type == "complete_case":
        new_id = f"CASE-{random.randint(2000, 8999)}"
        c = Case(
            case_id=new_id,
            patient_synthetic_id=f"SYN-PT-{new_id.split('-')[1]}",
            age_range="50-59",
            gender="M",
            consent_status="Granted",
            risk_level="Moderate",
            status="Complete",
            created_at=now - timedelta(days=2)
        )
        db.add(c)
        db.flush()

        s_id = f"SPEC-{new_id.split('-')[1]}"
        db.add(Specimen(specimen_id=s_id, case_id=new_id, source="Venous Blood", specimen_type="Plasma"))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-P", case_id=new_id, modality="Pathology", vendor="Vendor A — CoreLab",
            test_name="Troponin I", result_summary="10 ng/L (Normal)", interpretation="Normal",
            event_timestamp=now - timedelta(days=1), freshness="Current", specimen_id=s_id, validation_status="Valid"
        ))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-I", case_id=new_id, modality="Imaging", vendor="Vendor B — CardioVision",
            test_name="Echocardiogram", result_summary="LVEF 60% (Normal)", interpretation="Normal",
            event_timestamp=now - timedelta(days=1), freshness="Current", validation_status="Valid"
        ))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-M", case_id=new_id, modality="Molecular", vendor="Vendor C — GeneCore",
            test_name="Cardiac NGS Panel", result_summary="No pathogenic variants", interpretation="Normal",
            event_timestamp=now - timedelta(hours=10), freshness="Current", specimen_id=s_id, validation_status="Valid"
        ))
        db.commit()
        log_audit(db, user_role, "Case Ingested", new_id, "SUCCESS", "Complete 3-modality case generated", new_id)
        return {"status": "success", "case_id": new_id, "message": "Complete case created with Pathology, Imaging, Molecular"}

    elif action_type == "missing_case":
        new_id = f"CASE-{random.randint(2000, 8999)}"
        c = Case(
            case_id=new_id, patient_synthetic_id=f"SYN-PT-{new_id.split('-')[1]}",
            age_range="60-69", gender="F", consent_status="Granted", risk_level="High", status="Incomplete",
            created_at=now - timedelta(days=3)
        )
        db.add(c)
        db.flush()
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-P", case_id=new_id, modality="Pathology", vendor="Vendor A — CoreLab",
            test_name="Troponin T", result_summary="45 ng/L", interpretation="Abnormal",
            event_timestamp=now - timedelta(days=2), freshness="Current", validation_status="Valid"
        ))
        # Molecular and Imaging are missing!
        db.commit()
        log_audit(db, user_role, "Case Ingested", new_id, "WARNING", "Incomplete case generated with missing modalities", new_id)
        return {"status": "success", "case_id": new_id, "message": "Case created with missing imaging and molecular evidence"}

    elif action_type == "stale_case":
        new_id = f"CASE-{random.randint(2000, 8999)}"
        c = Case(
            case_id=new_id, patient_synthetic_id=f"SYN-PT-{new_id.split('-')[1]}",
            age_range="70-79", gender="M", consent_status="Granted", risk_level="High", status="Needs Review",
            created_at=now - timedelta(days=45)
        )
        db.add(c)
        db.flush()
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-P", case_id=new_id, modality="Pathology", vendor="Vendor A — CoreLab",
            test_name="Troponin I", result_summary="32 ng/L", interpretation="Abnormal",
            event_timestamp=now - timedelta(days=40), freshness="Very Stale", validation_status="Valid"
        ))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-I", case_id=new_id, modality="Imaging", vendor="Vendor B — CardioVision",
            test_name="Cardiac Echo", result_summary="LVEF 45%", interpretation="Abnormal",
            event_timestamp=now - timedelta(days=35), freshness="Very Stale", validation_status="Valid"
        ))
        db.commit()
        log_audit(db, user_role, "Case Ingested", new_id, "WARNING", "Stale case generated", new_id)
        return {"status": "success", "case_id": new_id, "message": "Case created with stale (>30d) evidence"}

    elif action_type == "lineage_case":
        new_id = f"CASE-{random.randint(2000, 8999)}"
        c = Case(
            case_id=new_id, patient_synthetic_id=f"SYN-PT-{new_id.split('-')[1]}",
            age_range="45-54", gender="F", consent_status="Granted", risk_level="Moderate", status="Blocked",
            created_at=now - timedelta(days=3)
        )
        db.add(c)
        db.flush()
        true_spec = f"SPEC-{new_id.split('-')[1]}"
        db.add(Specimen(specimen_id=true_spec, case_id=new_id, source="Venous Blood", specimen_type="Plasma"))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-P", case_id=new_id, modality="Pathology", vendor="Vendor A — CoreLab",
            test_name="Troponin I", result_summary="15 ng/L", interpretation="Normal",
            event_timestamp=now - timedelta(days=1), freshness="Current", specimen_id=true_spec, validation_status="Valid"
        ))
        db.add(EvidenceEvent(
            event_id=f"EVT-{rand_num}-M", case_id=new_id, modality="Molecular", vendor="Vendor C — GeneCore",
            test_name="Genetic Panel", result_summary="MYBPC3 variant", interpretation="VUS",
            event_timestamp=now - timedelta(hours=8), freshness="Current", specimen_id="SPEC-UNKNOWN-99",
            validation_status="Lineage Mismatch"
        ))
        db.commit()
        log_audit(db, user_role, "Lineage Error Ingested", new_id, "DETECTED", "Lineage error case created", new_id)
        return {"status": "success", "case_id": new_id, "message": "Case created with SPECIMEN LINEAGE MISMATCH"}

    return {"status": "error", "message": f"Unknown action_type '{action_type}'"}
