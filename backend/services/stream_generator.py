"""
CardioEvidence Real-Time Synthetic Event Generator
Generates synthetic diagnostic events for WebSocket streaming demo.
"""
import asyncio
import random
from datetime import datetime, timedelta
from typing import Optional, Callable

PATHOLOGY_EVENTS = [
    {"test_name": "Serum Troponin I (High Sensitivity)", "vendor": "Vendor A — CoreLab", "source_system": "CoreLab LIMS Enterprise 11.4"},
    {"test_name": "BNP (Brain Natriuretic Peptide)", "vendor": "Vendor D — BioPulse POC", "source_system": "BioPulse Bedside Analyzer 3"},
    {"test_name": "D-Dimer Quantitative", "vendor": "Vendor A — CoreLab", "source_system": "CoreLab LIMS Enterprise 11.4"},
    {"test_name": "CK-MB Isoenzyme", "vendor": "Vendor D — BioPulse POC", "source_system": "BioPulse Bedside Analyzer 3"},
    {"test_name": "Histopathology Report", "vendor": "Vendor A — CoreLab", "source_system": "CoreLab LIMS Enterprise 11.4"},
]

IMAGING_EVENTS = [
    {"test_name": "2D Transthoracic Echocardiogram", "vendor": "Vendor B — CardioVision", "source_system": "CardioVision PACS Cloud v4.2"},
    {"test_name": "12-Lead ECG Report", "vendor": "Vendor E — UltraEcho", "source_system": "UltraEcho Workstation Pro"},
    {"test_name": "Coronary CT Angiography", "vendor": "Vendor B — CardioVision", "source_system": "CardioVision PACS Cloud v4.2"},
    {"test_name": "Cardiac MRI", "vendor": "Vendor B — CardioVision", "source_system": "CardioVision PACS Cloud v4.2"},
    {"test_name": "Stress Echocardiogram", "vendor": "Vendor E — UltraEcho", "source_system": "UltraEcho Workstation Pro"},
]

MOLECULAR_EVENTS = [
    {"test_name": "Arrhythmogenic Cardiomyopathy Panel (PKP2)", "vendor": "Vendor C — GeneCore", "source_system": "GeneCore NGS Sequencer 900"},
    {"test_name": "Dilated Cardiomyopathy Panel (LMNA)", "vendor": "Vendor C — GeneCore", "source_system": "GeneCore NGS Sequencer 900"},
    {"test_name": "Hypertrophic Cardiomyopathy Panel (MYBPC3)", "vendor": "Vendor C — GeneCore", "source_system": "GeneCore NGS Sequencer 900"},
    {"test_name": "Ion Channelopathy Panel (SCN5A)", "vendor": "Vendor C — GeneCore", "source_system": "GeneCore NGS Sequencer 900"},
]

INTERPRETATIONS = {
    "pathology": ["Normal", "Normal", "Elevated", "Abnormal", "Normal"],
    "imaging": ["Normal", "Normal", "Abnormal", "Normal", "Mildly Abnormal"],
    "molecular": ["No pathogenic variant", "Likely Pathogenic", "VUS", "No pathogenic variant", "Pathogenic"],
}

FREQUENCY_SECONDS = {
    "slow": 8.0,
    "normal": 3.0,
    "fast": 1.0,
}

# Global state for the active generator task
_generator_task: Optional[asyncio.Task] = None
_is_running: bool = False
_session_stats = {
    "generated": 0,
    "validated": 0,
    "rejected": 0,
    "normalized": 0,
    "added_to_timeline": 0,
    "errors": 0,
    "started_at": None,
    "last_event_at": None,
}


def get_session_stats() -> dict:
    return dict(_session_stats)


def reset_session_stats():
    _session_stats.update({
        "generated": 0, "validated": 0, "rejected": 0,
        "normalized": 0, "added_to_timeline": 0, "errors": 0,
        "started_at": None, "last_event_at": None,
    })


def is_running() -> bool:
    return _is_running


def generate_single_event(modality: str = "mixed", case_id: str = None) -> dict:
    """Generate a single synthetic event dict (without DB persistence)."""
    now = datetime.utcnow()
    rand_num = random.randint(10000, 99999)
    cid = case_id or f"CASE-{random.randint(1001, 1050)}"

    if modality == "mixed":
        modality = random.choice(["pathology", "imaging", "molecular"])

    if modality == "pathology":
        template = random.choice(PATHOLOGY_EVENTS)
        interp = random.choice(INTERPRETATIONS["pathology"])
        val = round(random.uniform(5, 120), 1)
        result = f"{val} ng/L"
        event_id = f"EVT-STREAM-PATH-{rand_num}"
        modality_label = "Pathology"
    elif modality == "imaging":
        template = random.choice(IMAGING_EVENTS)
        interp = random.choice(INTERPRETATIONS["imaging"])
        lvef = random.randint(38, 70)
        result = f"LVEF {lvef}%" if "Echo" in template["test_name"] else f"Synthetic {interp.lower()} finding"
        event_id = f"EVT-STREAM-IMG-{rand_num}"
        modality_label = "Imaging"
    else:
        template = random.choice(MOLECULAR_EVENTS)
        interp = random.choice(INTERPRETATIONS["molecular"])
        result = f"Synthetic result: {interp}"
        event_id = f"EVT-STREAM-MOL-{rand_num}"
        modality_label = "Molecular"

    return {
        "event_id": event_id,
        "case_id": cid,
        "modality": modality_label,
        "vendor": template["vendor"],
        "test_name": template["test_name"],
        "result_summary": result,
        "interpretation": interp,
        "event_timestamp": (now - timedelta(minutes=random.randint(1, 30))).isoformat(),
        "ingestion_timestamp": now.isoformat(),
        "freshness": "Current",
        "validation_status": "Valid",
        "source_system": template["source_system"],
        "specimen_id": f"SPEC-{cid.replace('CASE-', '')}" if modality_label != "Imaging" else None,
    }


async def run_generator(
    broadcast_fn: Callable,
    db_save_fn: Callable,
    modality: str = "mixed",
    case_id: str = None,
    frequency: str = "normal",
):
    """Async generator loop — calls broadcast_fn and db_save_fn for each event."""
    global _is_running
    _is_running = True
    _session_stats["started_at"] = datetime.utcnow().isoformat()
    interval = FREQUENCY_SECONDS.get(frequency, 3.0)

    try:
        while _is_running:
            try:
                event = generate_single_event(modality, case_id)
                _session_stats["generated"] += 1

                # Simulate validation
                _session_stats["validated"] += 1
                _session_stats["normalized"] += 1

                # Persist to DB
                saved = await db_save_fn(event)
                if saved:
                    _session_stats["added_to_timeline"] += 1
                else:
                    _session_stats["rejected"] += 1

                # Broadcast to WebSocket clients
                await broadcast_fn({
                    "type": "new_event",
                    **event,
                    "message": f"New {event['modality']} evidence received for {event['case_id']}"
                })

                # Broadcast stats update
                await broadcast_fn({
                    "type": "stats_update",
                    "stats": get_session_stats()
                })

                _session_stats["last_event_at"] = datetime.utcnow().isoformat()

            except Exception as e:
                _session_stats["errors"] += 1

            await asyncio.sleep(interval)
    finally:
        _is_running = False


def stop_generator():
    global _is_running, _generator_task
    _is_running = False
    if _generator_task and not _generator_task.done():
        _generator_task.cancel()
    _generator_task = None
