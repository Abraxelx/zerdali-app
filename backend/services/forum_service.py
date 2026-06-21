from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from services.group_service import get_group, get_student_groups, list_groups
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

IST = ZoneInfo("Europe/Istanbul")
PROFILE_SELECT = "id, full_name, username, profile_photo_url, role"


def istanbul_day_bounds() -> tuple[str, str]:
    """İstanbul gün sınırları (öğrenci günlük konu limiti için)."""
    now = datetime.now(IST)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _fetch_profiles(user_ids: list[str]) -> dict:
    if not user_ids:
        return {}
    db = get_supabase_admin()
    result = db.table("profiles").select(PROFILE_SELECT).in_("id", user_ids).execute()
    return {p["id"]: p for p in (result.data or [])}


def _student_group_ids(student_id: str) -> list[str]:
    memberships = get_student_groups(student_id)
    ids = []
    for m in memberships:
        gid = m.get("group_id") or (m.get("student_groups") or {}).get("id")
        if gid:
            ids.append(gid)
    return ids


def assert_group_access(user_id: str, role: str, group_id: str) -> None:
    if not group_id:
        raise APIError("group_id is required", 422)
    if role == "superadmin":
        get_group(group_id)
        return
    if group_id not in _student_group_ids(user_id):
        raise APIError("Bu sınıf forumuna erişimin yok", 403)


def list_accessible_groups(user_id: str, role: str) -> list:
    if role == "superadmin":
        return list_groups(active_only=True)
    memberships = get_student_groups(user_id)
    groups = []
    seen = set()
    for m in memberships:
        g = m.get("student_groups")
        if g and g.get("id") and g["id"] not in seen:
            groups.append(g)
            seen.add(g["id"])
    return groups


def student_topics_today_count(student_id: str) -> int:
    start, end = istanbul_day_bounds()
    db = get_supabase_admin()
    result = (
        db.table("forum_topics")
        .select("id", count="exact")
        .eq("author_id", student_id)
        .gte("created_at", start)
        .lt("created_at", end)
        .execute()
    )
    return result.count or 0


def get_topic_quota(user_id: str, role: str) -> dict:
    if role == "superadmin":
        return {"can_create": True, "remaining_today": None, "limit_per_day": None}
    used = student_topics_today_count(user_id)
    remaining = max(0, 1 - used)
    return {"can_create": remaining > 0, "remaining_today": remaining, "limit_per_day": 1}


def list_topics(group_id: str, user_id: str, role: str) -> list:
    assert_group_access(user_id, role, group_id)
    db = get_supabase_admin()
    result = (
        db.table("forum_topics")
        .select("*")
        .eq("group_id", group_id)
        .order("created_at", desc=True)
        .execute()
    )
    topics = result.data or []
    if not topics:
        return []

    author_ids = list({t["author_id"] for t in topics})
    profiles = _fetch_profiles(author_ids)

    topic_ids = [t["id"] for t in topics]
    comments_res = db.table("forum_comments").select("topic_id").in_("topic_id", topic_ids).execute()
    count_map: dict[str, int] = {}
    for row in comments_res.data or []:
        tid = row["topic_id"]
        count_map[tid] = count_map.get(tid, 0) + 1

    group = get_group(group_id)
    return [
        {
            **topic,
            "author": profiles.get(topic["author_id"]),
            "comment_count": count_map.get(topic["id"], 0),
            "group": {"id": group["id"], "group_name": group["group_name"]},
        }
        for topic in topics
    ]


def get_topic(topic_id: str, user_id: str, role: str) -> dict:
    db = get_supabase_admin()
    result = db.table("forum_topics").select("*").eq("id", topic_id).maybe_single().execute()
    topic = get_data(result)
    if not topic:
        raise APIError("Topic not found", 404)

    assert_group_access(user_id, role, topic["group_id"])

    comments_res = (
        db.table("forum_comments")
        .select("*")
        .eq("topic_id", topic_id)
        .order("created_at")
        .execute()
    )
    comments = comments_res.data or []

    author_ids = {topic["author_id"]}
    author_ids.update(c["author_id"] for c in comments)
    profiles = _fetch_profiles(list(author_ids))
    group = get_group(topic["group_id"])

    return {
        **topic,
        "author": profiles.get(topic["author_id"]),
        "group": {"id": group["id"], "group_name": group["group_name"]},
        "comments": [
            {**comment, "author": profiles.get(comment["author_id"])}
            for comment in comments
        ],
    }


def create_topic(group_id: str, author_id: str, role: str, data: dict) -> dict:
    assert_group_access(author_id, role, group_id)

    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    if not title:
        raise APIError("Konu başlığı gerekli", 422)
    if not body:
        raise APIError("Konu metni gerekli", 422)
    if len(title) > 200:
        raise APIError("Başlık en fazla 200 karakter olabilir", 422)

    if role != "superadmin" and student_topics_today_count(author_id) >= 1:
        raise APIError("Bugün zaten bir konu açtın. Yarın tekrar deneyebilirsin.", 429)

    db = get_supabase_admin()
    result = (
        db.table("forum_topics")
        .insert({"group_id": group_id, "author_id": author_id, "title": title, "body": body})
        .execute()
    )
    if not result.data:
        raise APIError("Konu oluşturulamadı", 500)

    topic = result.data[0]
    profiles = _fetch_profiles([author_id])
    group = get_group(group_id)
    return {
        **topic,
        "author": profiles.get(author_id),
        "comment_count": 0,
        "group": {"id": group["id"], "group_name": group["group_name"]},
    }


def create_comment(topic_id: str, author_id: str, role: str, data: dict) -> dict:
    body = (data.get("body") or "").strip()
    if not body:
        raise APIError("Yorum metni gerekli", 422)

    db = get_supabase_admin()
    topic_row = db.table("forum_topics").select("id, group_id").eq("id", topic_id).maybe_single().execute()
    topic = get_data(topic_row)
    if not topic:
        raise APIError("Topic not found", 404)

    assert_group_access(author_id, role, topic["group_id"])

    result = (
        db.table("forum_comments")
        .insert({"topic_id": topic_id, "author_id": author_id, "body": body})
        .execute()
    )
    if not result.data:
        raise APIError("Yorum gönderilemedi", 500)

    comment = result.data[0]
    profiles = _fetch_profiles([author_id])
    return {**comment, "author": profiles.get(author_id)}
