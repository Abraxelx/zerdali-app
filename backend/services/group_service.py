from postgrest.exceptions import APIError as PostgrestAPIError

from utils.db_helpers import get_data
from utils.errors import APIError
from utils.group_fields import parse_lesson_day, parse_lesson_hour
from utils.supabase_client import get_supabase_admin


def normalize_group_id(group_id) -> str:
    """Grup id bigint/string karışımını tek forma çevirir."""
    if group_id is None:
        return ""
    return str(group_id).strip()


def coerce_group_id(group_id):
    """DB sorguları için bigint uyumlu id."""
    normalized = normalize_group_id(group_id)
    if normalized.isdigit():
        return int(normalized)
    return normalized


def _insert_group(payload: dict) -> dict:
    db = get_supabase_admin()
    try:
        result = db.table("student_groups").insert(payload).execute()
    except PostgrestAPIError as e:
        message = e.message if hasattr(e, "message") else str(e)
        if isinstance(message, dict):
            message = message.get("message", str(message))
        raise APIError(message, 400)
    return result.data[0]


def create_group(data: dict) -> dict:
    required = ["group_name", "lesson_day", "lesson_hour"]
    for field in required:
        if field not in data or data[field] in (None, ""):
            raise APIError(f"{field} is required", 422)

    return _insert_group(
        {
            "group_name": data["group_name"],
            "lesson_day": parse_lesson_day(data["lesson_day"]),
            "lesson_hour": parse_lesson_hour(data["lesson_hour"]),
            "is_active": True,
        }
    )


def list_groups(active_only: bool = True) -> list:
    db = get_supabase_admin()
    query = db.table("student_groups").select("*")
    if active_only:
        query = query.eq("is_active", True)
    result = query.order("group_name").execute()
    return result.data or []


def get_group(group_id: str) -> dict:
    db = get_supabase_admin()
    result = db.table("student_groups").select("*").eq("id", group_id).maybe_single().execute()
    data = get_data(result)
    if not data:
        raise APIError("Group not found", 404)
    return data


def update_group(group_id: str, data: dict) -> dict:
    allowed = {"group_name", "lesson_day", "lesson_hour", "is_active"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    if "lesson_day" in update_data:
        update_data["lesson_day"] = parse_lesson_day(update_data["lesson_day"])
    if "lesson_hour" in update_data:
        update_data["lesson_hour"] = parse_lesson_hour(update_data["lesson_hour"])

    db = get_supabase_admin()
    try:
        result = db.table("student_groups").update(update_data).eq("id", group_id).execute()
    except PostgrestAPIError as e:
        message = e.message if hasattr(e, "message") else str(e)
        if isinstance(message, dict):
            message = message.get("message", str(message))
        raise APIError(message, 400)
    if not result.data:
        raise APIError("Group not found", 404)
    return result.data[0]


def delete_group(group_id: str) -> dict:
    return update_group(group_id, {"is_active": False})


def add_member(group_id: str, student_id: str) -> dict:
    get_group(group_id)
    db = get_supabase_admin()

    profile = db.table("profiles").select("id, role").eq("id", student_id).maybe_single().execute()
    profile_data = get_data(profile)
    if not profile_data:
        raise APIError("Student not found", 404)
    if profile_data.get("role") != "student":
        raise APIError("Gruba yalnızca öğrenci eklenebilir", 422)

    existing = (
        db.table("student_group_members")
        .select("student_id")
        .eq("group_id", group_id)
        .eq("student_id", student_id)
        .limit(1)
        .execute()
    )
    if get_data(existing):
        raise APIError("Student already in group", 400)

    try:
        result = db.table("student_group_members").insert(
            {"group_id": group_id, "student_id": student_id}
        ).execute()
    except PostgrestAPIError as e:
        message = e.message if hasattr(e, "message") else str(e)
        if isinstance(message, dict):
            message = message.get("message", str(message))
        raise APIError(message, 400)

    if not result.data:
        raise APIError("Failed to add member", 400)
    return result.data[0]


def remove_member(group_id: str, student_id: str):
    db = get_supabase_admin()
    db.table("student_group_members").delete().eq("group_id", group_id).eq("student_id", student_id).execute()
    return {"message": "Member removed"}


def get_student_groups(student_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("student_group_members")
        .select("group_id, joined_at, student_groups(*)")
        .eq("student_id", student_id)
        .execute()
    )
    return result.data or []


def get_group_members(group_id: str) -> list:
    get_group(group_id)
    db = get_supabase_admin()
    result = (
        db.table("student_group_members")
        .select("student_id, joined_at")
        .eq("group_id", group_id)
        .execute()
    )
    members = get_data(result) or []
    if not members:
        return []

    student_ids = [m["student_id"] for m in members]
    profiles_result = (
        db.table("profiles")
        .select("id, full_name, username, email, role, profile_photo_url, bio")
        .in_("id", student_ids)
        .eq("role", "student")
        .execute()
    )
    profile_map = {p["id"]: p for p in (get_data(profiles_result) or [])}

    enriched = []
    for member in members:
        enriched.append(
            {
                **member,
                "profiles": profile_map.get(member["student_id"]),
            }
        )
    return enriched
