from datetime import datetime, timezone

def calculate_freshness(event_timestamp: datetime, current_days: int = 7, stale_days: int = 30) -> str:
    """
    Calculate evidence freshness state relative to current time or reference timestamp.
    """
    if not event_timestamp:
        return "Missing"
        
    now = datetime.utcnow()
    # Normalize naive datetime
    if event_timestamp.tzinfo:
        event_timestamp = event_timestamp.replace(tzinfo=None)
        
    age_days = (now - event_timestamp).total_seconds() / 86400.0
    
    if age_days < 0:
        return "Current"
    elif age_days <= current_days:
        return "Current"
    elif age_days <= stale_days:
        return "Stale"
    else:
        return "Very Stale"
