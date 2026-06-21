from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin


def _insert(user_id: str, ntype: str, title: str, message: str) -> dict | None:
    db = get_supabase_admin()
    result = db.table("notifications").insert(
        {"user_id": user_id, "type": ntype, "title": title, "message": message}
    ).execute()
    return result.data[0] if result.data else None


def notify_user(user_id: str, ntype: str, title: str, message: str) -> dict | None:
    return _insert(user_id, ntype, title, message)


def notify_superadmins(ntype: str, title: str, message: str) -> list:
    db = get_supabase_admin()
    admins = db.table("profiles").select("id").eq("role", "superadmin").execute()
    created = []
    for row in admins.data or []:
        n = _insert(row["id"], ntype, title, message)
        if n:
            created.append(n)
    return created


def notify_group_students(group_id: str, ntype: str, title: str, message: str) -> list:
    from services.group_service import get_group_members

    created = []
    for member in get_group_members(group_id):
        sid = member.get("student_id")
        if sid:
            n = _insert(sid, ntype, title, message)
            if n:
                created.append(n)
    return created


def get_notifications(user_id: str, unread_only: bool = False) -> list:
    db = get_supabase_admin()
    query = db.table("notifications").select("*").eq("user_id", user_id)
    if unread_only:
        query = query.eq("read", False)
    result = query.order("created_at", desc=True).limit(50).execute()
    return result.data or []


def mark_read(notification_id: str, user_id: str) -> dict:
    db = get_supabase_admin()
    result = (
        db.table("notifications")
        .update({"read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise APIError("Notification not found", 404)
    return result.data[0]


def mark_all_read(user_id: str) -> dict:
    db = get_supabase_admin()
    db.table("notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
    return {"message": "ok"}
