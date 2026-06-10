"""Event logging utility — logs system actions for audit trail."""

EVENT_TYPES = {
    "POINT_GRANTED",
    "HOMEWORK_SUBMITTED",
    "ATTENDANCE_MARKED",
    "MEBLAH_EARNED",
    "LEVEL_UP",
}


def log_event(event_type: str, user_id: str, metadata: dict | None = None):
    """Log a system event. Currently uses print; can be extended to a dedicated events table."""
    if event_type not in EVENT_TYPES:
        return
    meta = metadata or {}
    print(f"[EVENT] {event_type} user={user_id} meta={meta}")
