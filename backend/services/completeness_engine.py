from typing import List, Dict, Any
from backend.models import EvidenceEvent
from backend.services.freshness_engine import calculate_freshness

REQUIRED_MODALITIES = ["Pathology", "Imaging", "Molecular"]

def evaluate_case_completeness(events: List[EvidenceEvent], current_days: int = 7, stale_days: int = 30) -> Dict[str, Any]:
    """
    Evaluates evidence presence across required modalities and computes completeness percentage.
    """
    modality_summary = {}
    present_modalities = set()
    has_stale = False
    has_warning = False

    for mod in REQUIRED_MODALITIES:
        matching_events = [e for e in events if e.modality.lower() == mod.lower()]
        if matching_events:
            present_modalities.add(mod)
            # Sort newest first
            sorted_events = sorted(matching_events, key=lambda x: x.event_timestamp, reverse=True)
            latest = sorted_events[0]
            freshness = calculate_freshness(latest.event_timestamp, current_days, stale_days)
            if freshness in ["Stale", "Very Stale"]:
                has_stale = True
            if latest.validation_status != "Valid":
                has_warning = True

            modality_summary[mod.lower()] = {
                "present": True,
                "count": len(matching_events),
                "freshness": freshness,
                "latest_test": latest.test_name,
                "latest_result": latest.result_summary,
                "latest_timestamp": latest.event_timestamp
            }
        else:
            modality_summary[mod.lower()] = {
                "present": False,
                "count": 0,
                "freshness": "Missing",
                "latest_test": None,
                "latest_result": None,
                "latest_timestamp": None
            }

    completeness_percentage = int((len(present_modalities) / len(REQUIRED_MODALITIES)) * 100)
    is_complete = (len(present_modalities) == len(REQUIRED_MODALITIES)) and not has_stale

    # Determine overall evidence health label
    if has_warning:
        evidence_health = "Warning"
    elif not is_complete:
        if len(present_modalities) < len(REQUIRED_MODALITIES):
            evidence_health = "Incomplete"
        else:
            evidence_health = "Stale"
    else:
        evidence_health = "Healthy"

    missing_modalities = [mod for mod in REQUIRED_MODALITIES if mod not in present_modalities]

    return {
        "completeness_percentage": completeness_percentage,
        "is_complete": is_complete,
        "evidence_health": evidence_health,
        "modality_summary": modality_summary,
        "missing_modalities": missing_modalities
    }
