from typing import List, Dict, Any
from backend.models import EvidenceEvent

def detect_duplicates_and_conflicts(events: List[EvidenceEvent]) -> Dict[str, Any]:
    """
    Scans a set of events for:
    1. Duplicate event IDs
    2. Conflicting summaries/interpretations within the same modality
    """
    seen_ids = set()
    duplicates = []
    
    # Conflict detection by modality
    by_modality: Dict[str, List[EvidenceEvent]] = {}
    
    for ev in events:
        if ev.event_id in seen_ids:
            duplicates.append(ev.event_id)
        seen_ids.add(ev.event_id)
        by_modality.setdefault(ev.modality.lower(), []).append(ev)

    conflicts = []
    for mod, ev_list in by_modality.items():
        if len(ev_list) > 1:
            # Check for conflicting interpretations across different vendors or tests
            interpretations = set(e.interpretation.lower() for e in ev_list)
            # If both 'normal' and 'abnormal'/'pathogenic' exist, flag conflict
            has_normal = any(i in interpretations for i in ["normal", "benign", "negative"])
            has_abnormal = any(i in interpretations for i in ["abnormal", "pathogenic", "elevated", "dysfunction"])
            
            # Or if explicitly tagged with validation_status == 'Conflicting'
            has_explicit_conflict = any(e.validation_status == "Conflicting" for e in ev_list)
            
            if (has_normal and has_abnormal) or has_explicit_conflict:
                conflicts.append({
                    "modality": mod.capitalize(),
                    "events": [
                        {
                            "event_id": e.event_id,
                            "vendor": e.vendor,
                            "test_name": e.test_name,
                            "result": e.result_summary,
                            "interpretation": e.interpretation
                        } for e in ev_list
                    ],
                    "reason": "Discordant interpretations observed across multiple evidence sources"
                })

    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicate_event_ids": list(set(duplicates)),
        "has_conflicts": len(conflicts) > 0,
        "conflicts": conflicts
    }
