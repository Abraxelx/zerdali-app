from datetime import datetime, timedelta, timezone

from utils.supabase_client import get_supabase_admin

ONLINE_WITHIN_MINUTES = 1
PROFILE_SELECT = "id, full_name, username, role, profile_photo_url, last_seen_at"


def touch_presence(user_id: str) -> None:
    db = get_supabase_admin()
    now = datetime.now(timezone.utc).isoformat()
    db.table("profiles").update({"last_seen_at": now}).eq("id", user_id).execute()


def list_online_users(within_minutes: int = ONLINE_WITHIN_MINUTES) -> list:
    minutes = max(1, min(within_minutes, 30))
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    db = get_supabase_admin()
    result = (
        db.table("profiles")
        .select(PROFILE_SELECT)
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", desc=True)
        .execute()
    )
    return result.data or []
