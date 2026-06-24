import logging
from datetime import datetime, timedelta, timezone

from utils.db_helpers import get_data
from utils.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

SESSION_THROTTLE_MINUTES = 30


def _client_meta(ip_address: str | None = None, user_agent: str | None = None) -> dict:
    row: dict = {}
    if ip_address:
        row["ip_address"] = ip_address[:64]
    if user_agent:
        row["user_agent"] = user_agent[:512]
    return row


def record_login(user_id: str, ip_address: str | None = None, user_agent: str | None = None) -> None:
    db = get_supabase_admin()
    try:
        db.table("user_login_logs").insert(
            {"user_id": user_id, "entry_type": "login", **_client_meta(ip_address, user_agent)}
        ).execute()
    except Exception as e:
        logger.warning("record_login failed for %s: %s", user_id, e)


def record_session_if_needed(
    user_id: str, ip_address: str | None = None, user_agent: str | None = None
) -> None:
    db = get_supabase_admin()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=SESSION_THROTTLE_MINUTES)).isoformat()
    try:
        recent = (
            db.table("user_login_logs")
            .select("id")
            .eq("user_id", user_id)
            .gte("logged_in_at", cutoff)
            .limit(1)
            .execute()
        )
        if get_data(recent):
            return
        db.table("user_login_logs").insert(
            {"user_id": user_id, "entry_type": "session", **_client_meta(ip_address, user_agent)}
        ).execute()
    except Exception as e:
        logger.warning("record_session_if_needed failed for %s: %s", user_id, e)


def list_login_logs(limit: int = 100, offset: int = 0) -> list:
    db = get_supabase_admin()
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    result = (
        db.table("user_login_logs")
        .select(
            "id, user_id, entry_type, logged_in_at, ip_address, user_agent, "
            "profiles(id, full_name, username, email, role, profile_photo_url)"
        )
        .order("logged_in_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []
