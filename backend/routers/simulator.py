"""
CardioEvidence — Real-Time Simulator Control API
Start/Stop/Configure the synthetic event stream.
"""
from datetime import datetime
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from backend.database.session import get_db, SessionLocal
from backend.models import EvidenceEvent
from backend.services import stream_generator as gen
from backend.services.freshness_engine import calculate_freshness
from backend.services.audit_service import log_audit
from backend.routers.stream import manager

router = APIRouter(
    prefix="/simulator",
    tags=["simulator"],
)


async def _save_event_to_db(event_data: dict) -> bool:
    """Save a generated event to the database. Returns True on success."""
    db = SessionLocal()
    try:
        evt_dt = datetime.fromisoformat(event_data["event_timestamp"])
        freshness = calculate_freshness(evt_dt)
        evt = EvidenceEvent(
            event_id=event_data["event_id"],
            case_id=event_data["case_id"],
            modality=event_data["modality"],
            vendor=event_data["vendor"],
            test_name=event_data["test_name"],
            result_summary=event_data["result_summary"],
            interpretation=event_data.get("interpretation"),
            event_timestamp=evt_dt,
            freshness=freshness,
            specimen_id=event_data.get("specimen_id"),
            source_system=event_data.get("source_system"),
            validation_status="Valid",
            review_status="Unreviewed",
        )
        db.add(evt)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


@router.post("/start")
async def start_simulator(
    modality: str = "mixed",
    frequency: str = "normal",
    case_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
):
    """Start the real-time synthetic event stream."""
    if gen.is_running():
        return {"status": "already_running", "message": "Simulator is already active"}

    gen.reset_session_stats()

    async def _run():
        await gen.run_generator(
            broadcast_fn=manager.broadcast,
            db_save_fn=_save_event_to_db,
            modality=modality,
            case_id=case_id,
            frequency=frequency,
        )

    asyncio.ensure_future(_run())
    return {
        "status": "started",
        "modality": modality,
        "frequency": frequency,
        "case_id": case_id,
        "message": f"Real-time {modality} event stream started at {frequency} frequency"
    }


@router.post("/stop")
async def stop_simulator():
    """Stop the real-time event stream."""
    gen.stop_generator()
    await manager.broadcast({"type": "stream_stopped", "message": "Event stream stopped"})
    return {"status": "stopped", "stats": gen.get_session_stats()}


@router.get("/status")
def get_simulator_status():
    """Return current simulator state."""
    return {
        "is_running": gen.is_running(),
        "stats": gen.get_session_stats(),
        "active_ws_connections": len(manager.active_connections),
    }


@router.post("/generate-one")
async def generate_one_event(
    modality: str = "mixed",
    case_id: Optional[str] = None,
):
    """Generate and broadcast a single event immediately."""
    event = gen.generate_single_event(modality, case_id)
    saved = await _save_event_to_db(event)
    await manager.broadcast({
        "type": "new_event",
        **event,
        "message": f"New {event['modality']} evidence received for {event['case_id']}"
    })
    return {"status": "generated", "event": event, "saved_to_db": saved}


@router.get("/stats")
def get_simulator_stats():
    """Return live session statistics."""
    return {
        "is_running": gen.is_running(),
        "active_ws_connections": len(manager.active_connections),
        **gen.get_session_stats()
    }
