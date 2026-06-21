from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from services.group_service import coerce_group_id, get_group, get_student_groups, list_groups, normalize_group_id
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


def _student_group_ids(student_id: str) -> set[str]:
    memberships = get_student_groups(student_id)
    ids: set[str] = set()
    for m in memberships:
        gid = m.get("group_id") or (m.get("student_groups") or {}).get("id")
        if gid is not None:
            ids.add(normalize_group_id(gid))
    return ids


def assert_group_access(user_id: str, role: str, group_id) -> None:
    gid = normalize_group_id(group_id)
    if not gid:
        raise APIError("group_id is required", 422)
    if role == "superadmin":
        get_group(gid)
        return
    if gid not in _student_group_ids(user_id):
        raise APIError("Bu sınıf forumuna erişimin yok", 403)


def list_accessible_groups(user_id: str, role: str) -> list:
    if role == "superadmin":
        return list_groups(active_only=True)

    memberships = get_student_groups(user_id)
    groups = []
    seen: set[str] = set()

    for m in memberships:
        embedded = m.get("student_groups")
        gid = m.get("group_id") or (embedded or {}).get("id")
        if gid is None:
            continue
        key = normalize_group_id(gid)
        if key in seen:
            continue
        if embedded and embedded.get("id") is not None:
            groups.append(embedded)
        else:
            groups.append(get_group(gid))
        seen.add(key)

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


def list_topics(group_id, user_id: str, role: str) -> list:
    gid = coerce_group_id(group_id)
    assert_group_access(user_id, role, gid)
    db = get_supabase_admin()
    result = (
        db.table("forum_topics")
        .select("*")
        .eq("group_id", gid)
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

    group = get_group(gid)
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


def create_topic(group_id, author_id: str, role: str, data: dict) -> dict:
    gid = coerce_group_id(group_id)
    assert_group_access(author_id, role, gid)

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
        .insert({"group_id": gid, "author_id": author_id, "title": title, "body": body})
        .execute()
    )
    if not result.data:
        raise APIError("Konu oluşturulamadı", 500)

    topic = result.data[0]
    profiles = _fetch_profiles([author_id])
    group = get_group(gid)
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
    topic_row = (
        db.table("forum_topics")
        .select("id, group_id, author_id, title")
        .eq("id", topic_id)
        .maybe_single()
        .execute()
    )
    topic = get_data(topic_row)
    if not topic:
        raise APIError("Topic not found", 404)

    assert_group_access(author_id, role, topic["group_id"])

    prior_res = db.table("forum_comments").select("author_id").eq("topic_id", topic_id).execute()
    prior_commenters = {
        row["author_id"]
        for row in (prior_res.data or [])
        if row.get("author_id") and row["author_id"] != author_id
    }

    result = (
        db.table("forum_comments")
        .insert({"topic_id": topic_id, "author_id": author_id, "body": body})
        .execute()
    )
    if not result.data:
        raise APIError("Yorum gönderilemedi", 500)

    comment = result.data[0]
    profiles = _fetch_profiles([author_id])
    commenter = profiles.get(author_id)
    _notify_forum_comment(topic, author_id, prior_commenters, commenter)

    return {**comment, "author": commenter}


def _notify_forum_comment(topic: dict, commenter_id: str, prior_commenters: set[str], commenter: dict | None) -> None:
    recipients: set[str] = set(prior_commenters)
    if topic.get("author_id") and topic["author_id"] != commenter_id:
        recipients.add(topic["author_id"])
    recipients.discard(commenter_id)
    if not recipients:
        return

    from services.notification_service import notify_user

    name = (commenter or {}).get("full_name") or "Birisi"
    title = topic.get("title") or "Forum konusu"
    message = f'{name} "{title}" konusuna yorum yaptı.'

    for user_id in recipients:
        notify_user(user_id, "FORUM_COMMENT", "Forum yorumu", message)
