import json

from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin


def _normalize_data(data) -> dict:
    if data is None:
        return {}
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    if isinstance(data, dict):
        return data
    return {}


def _serialize_data(data: dict | None) -> dict:
    normalized = _normalize_data(data)
    return {str(k): v for k, v in normalized.items() if v is not None}


def resolve_notification_href(ntype: str, data: dict | None, role: str) -> str | None:
    d = _normalize_data(data)
    ntype = (ntype or "").strip()

    if ntype == "FORUM_COMMENT":
        topic_id = d.get("topic_id")
        if topic_id:
            path = f"/forum/{topic_id}"
            if role == "veli":
                path = f"/parent/forum/{topic_id}"
            return path
        return "/parent/forum" if role == "veli" else "/forum"

    if ntype in ("FORUM_LIKE", "FORUM_DISLIKE"):
        topic_id = d.get("topic_id")
        if topic_id:
            path = f"/forum/{topic_id}"
            if role == "veli":
                path = f"/parent/forum/{topic_id}"
            return path
        return "/parent/forum" if role == "veli" else "/forum"

    if ntype == "HOMEWORK_SUBMITTED":
        if role != "superadmin":
            return None
        submission_id = d.get("submission_id")
        if submission_id:
            return f"/admin/approvals?submission={submission_id}"
        return "/admin/approvals"

    if ntype in ("HOMEWORK_APPROVED", "HOMEWORK_REJECTED", "ASSIGNMENT_CREATED"):
        return "/parent/assignments" if role == "veli" else "/assignments"

    if ntype == "LESSON_CREATED":
        return None if role == "veli" else "/lessons"

    if ntype == "POINTS":
        tx = d.get("transaction_type")
        if role == "veli":
            if tx == "ATTENDANCE":
                return "/parent/attendance"
            if tx == "LESSON_SCORE":
                return "/parent/scores"
            if tx == "HOMEWORK":
                return "/parent/assignments"
            if tx == "GAME_2048":
                return "/parent"
            return "/parent"
        if tx == "ATTENDANCE":
            return "/attendance"
        if tx == "LESSON_SCORE":
            return "/scores"
        if tx == "HOMEWORK":
            return "/assignments"
        if tx == "GAME_2048":
            return "/games/2048"
        return "/dashboard"

    if ntype == "MEBLAH_EARNED":
        return "/parent" if role == "veli" else "/dashboard"

    if ntype in ("GAME_2048_REWARD",):
        return None if role == "veli" else "/games/2048"

    return None


def _enrich_notification(row: dict, role: str) -> dict:
    data = _normalize_data(row.get("data"))
    row["data"] = data
    row["href"] = resolve_notification_href(row.get("type"), data, role)
    return row


def _insert(
    user_id: str,
    ntype: str,
    title: str,
    message: str,
    data: dict | None = None,
) -> dict | None:
    db = get_supabase_admin()
    row: dict = {
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "message": message,
        "data": _serialize_data(data),
    }
    result = db.table("notifications").insert(row).execute()
    return result.data[0] if result.data else None


def notify_user(
    user_id: str,
    ntype: str,
    title: str,
    message: str,
    data: dict | None = None,
) -> dict | None:
    return _insert(user_id, ntype, title, message, data)


def notify_superadmins(
    ntype: str,
    title: str,
    message: str,
    data: dict | None = None,
) -> list:
    db = get_supabase_admin()
    admins = db.table("profiles").select("id").eq("role", "superadmin").execute()
    created = []
    for row in admins.data or []:
        n = _insert(row["id"], ntype, title, message, data)
        if n:
            created.append(n)
    return created


def notify_group_students(
    group_id: str,
    ntype: str,
    title: str,
    message: str,
    data: dict | None = None,
) -> list:
    from services.group_service import get_group_members

    created = []
    for member in get_group_members(group_id):
        sid = member.get("student_id")
        if sid:
            n = _insert(sid, ntype, title, message, data)
            if n:
                created.append(n)
    return created


def get_notifications(user_id: str, role: str, unread_only: bool = False) -> list:
    db = get_supabase_admin()
    query = db.table("notifications").select("*").eq("user_id", user_id)
    if unread_only:
        query = query.eq("read", False)
    result = query.order("created_at", desc=True).limit(50).execute()
    rows = result.data or []
    return [_enrich_notification(row, role) for row in rows]


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
