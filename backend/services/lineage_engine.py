from typing import List, Dict, Any, Optional
from backend.models import Specimen, EvidenceEvent

def build_specimen_lineage(case_id: str, specimens: List[Specimen], events: List[EvidenceEvent]) -> Dict[str, Any]:
    """
    Constructs a tree representation of specimens and downstream evidence tests.
    Flags any lineage mismatch where an event references an unknown or unexpected specimen.
    """
    specimen_map = {s.specimen_id: s for s in specimens}
    root_nodes = []
    has_mismatch = False
    mismatch_details = []

    # Map events to specimens
    events_by_specimen: Dict[str, List[EvidenceEvent]] = {}
    for ev in events:
        if ev.specimen_id:
            events_by_specimen.setdefault(ev.specimen_id, []).append(ev)
            # Check if specimen exists in case specimens
            if ev.specimen_id not in specimen_map or ev.validation_status == "Lineage Mismatch":
                has_mismatch = True
                mismatch_details.append(
                    f"Evidence '{ev.test_name}' ({ev.event_id}) references specimen '{ev.specimen_id}', which is not linked to Case {case_id} registered lineage."
                )

    # Build tree nodes for known specimens
    specimen_nodes = {}
    for s in specimens:
        specimen_nodes[s.specimen_id] = {
            "id": s.specimen_id,
            "label": f"Specimen: {s.specimen_id} ({s.source})",
            "type": "Specimen",
            "details": {
                "collection_time": s.collection_timestamp.isoformat() if s.collection_timestamp else "",
                "source": s.source,
                "type": s.specimen_type
            },
            "status": "Valid",
            "children": []
        }

    # Attach events as children of specimens
    for spec_id, ev_list in events_by_specimen.items():
        if spec_id in specimen_nodes:
            for ev in ev_list:
                status = "Valid"
                if ev.validation_status == "Lineage Mismatch":
                    status = "Mismatch"
                specimen_nodes[spec_id]["children"].append({
                    "id": ev.event_id,
                    "label": f"{ev.modality}: {ev.test_name}",
                    "type": ev.modality,
                    "details": {
                        "vendor": ev.vendor,
                        "result": ev.result_summary,
                        "interpretation": ev.interpretation,
                        "timestamp": ev.event_timestamp.isoformat() if ev.event_timestamp else ""
                    },
                    "status": status,
                    "children": []
                })

    # Attach children specimens to parent specimens or to root
    for s in specimens:
        node = specimen_nodes[s.specimen_id]
        if s.parent_specimen_id and s.parent_specimen_id in specimen_nodes:
            specimen_nodes[s.parent_specimen_id]["children"].append(node)
        else:
            root_nodes.append(node)

    # If there are mismatched orphaned events, add an anomaly node to roots
    if has_mismatch:
        for ev in events:
            if ev.specimen_id and (ev.specimen_id not in specimen_map or ev.validation_status == "Lineage Mismatch"):
                root_nodes.append({
                    "id": f"orphan-{ev.event_id}",
                    "label": f"🔴 MISMATCH: Specimen {ev.specimen_id}",
                    "type": "Mismatch",
                    "details": {
                        "event_id": ev.event_id,
                        "test": ev.test_name,
                        "vendor": ev.vendor,
                        "error": f"Referenced specimen {ev.specimen_id} not in case lineage tree"
                    },
                    "status": "Mismatch",
                    "children": [
                        {
                            "id": ev.event_id,
                            "label": f"{ev.modality}: {ev.test_name} ({ev.event_id})",
                            "type": ev.modality,
                            "details": {
                                "result": ev.result_summary,
                                "timestamp": ev.event_timestamp.isoformat() if ev.event_timestamp else ""
                            },
                            "status": "Mismatch",
                            "children": []
                        }
                    ]
                })

    return {
        "case_id": case_id,
        "root_specimens": root_nodes,
        "has_mismatch": has_mismatch,
        "mismatch_details": "; ".join(mismatch_details) if mismatch_details else None
    }
