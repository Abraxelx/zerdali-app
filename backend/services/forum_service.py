from datetime import datetime, timedelta
import re
import unicodedata
from zoneinfo import ZoneInfo

from services.group_service import coerce_group_id, get_group, get_student_groups, list_groups, normalize_group_id
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

IST = ZoneInfo("Europe/Istanbul")
PROFILE_SELECT = "id, full_name, username, profile_photo_url, role"
TAG_SELECT = "id, slug, label, color, sort_order, created_by, created_at"
DEFAULT_TAG_LABEL = "Genel"
DEFAULT_TAG_COLOR = "#a855f7"
MAX_TAG_LABEL_LEN = 50
VALID_TARGET_TYPES = frozenset({"topic", "comment"})
VALID_REACTIONS = frozenset({"like", "dislike"})


def _guardian_group_ids(guardian_id: str) -> set[str]:
    from services.guardian_service import guardian_student_ids

    ids: set[str] = set()
    for student_id in guardian_student_ids(guardian_id):
        ids.update(_student_group_ids(student_id))
    return ids


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
    profiles = {p["id"]: p for p in (result.data or [])}
    _attach_student_levels(profiles)
    return profiles


def _attach_student_levels(profiles: dict[str, dict]) -> None:
    student_ids = [uid for uid, p in profiles.items() if p.get("role") == "student"]
    if not student_ids:
        return

    from services.gamification_service import _resolve_levels, get_effective_power, list_levels

    levels = list_levels()
    for sid in student_ids:
        power = get_effective_power(sid)
        current_level, _ = _resolve_levels(power, levels)
        profiles[sid]["current_level"] = (
            {"title": current_level["title"], "level_number": current_level["level_number"]}
            if current_level
            else None
        )


def _fetch_tags(tag_ids: list[str]) -> dict:
    if not tag_ids:
        return {}
    db = get_supabase_admin()
    result = db.table("forum_tags").select(TAG_SELECT).in_("id", tag_ids).execute()
    return {t["id"]: t for t in (result.data or [])}


def list_tags() -> list:
    db = get_supabase_admin()
    result = db.table("forum_tags").select(TAG_SELECT).order("label").execute()
    return result.data or []


def _slugify(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^\w\s-]", "", normalized.lower())
    slug = re.sub(r"[-\s]+", "-", slug).strip("-")
    return (slug[:60] or "etiket")


def _find_tag_by_label(label: str) -> dict | None:
    needle = label.strip().lower()
    if not needle:
        return None
    db = get_supabase_admin()
    result = db.table("forum_tags").select(TAG_SELECT).execute()
    for row in result.data or []:
        if (row.get("label") or "").strip().lower() == needle:
            return row
    return None


def get_or_create_tag(label: str, user_id: str) -> dict:
    cleaned = (label or "").strip()
    if not cleaned:
        raise APIError("Etiket adı gerekli", 422)
    if len(cleaned) > MAX_TAG_LABEL_LEN:
        raise APIError(f"Etiket en fazla {MAX_TAG_LABEL_LEN} karakter olabilir", 422)

    existing = _find_tag_by_label(cleaned)
    if existing:
        return existing

    db = get_supabase_admin()
    payload = {
        "label": cleaned,
        "slug": _slugify(cleaned),
        "color": DEFAULT_TAG_COLOR,
        "created_by": user_id,
    }
    result = db.table("forum_tags").insert(payload).execute()
    if not result.data:
        raise APIError("Etiket oluşturulamadı", 500)
    return result.data[0]


def create_tag(user_id: str, data: dict) -> dict:
    label = (data.get("label") or "").strip()
    return get_or_create_tag(label, user_id)


def _resolve_topic_tag(data: dict, user_id: str) -> str:
    tag_id = (data.get("tag_id") or "").strip()
    if tag_id:
        db = get_supabase_admin()
        row = db.table("forum_tags").select("id").eq("id", tag_id).maybe_single().execute()
        tag = get_data(row)
        if not tag:
            raise APIError("Geçersiz forum etiketi", 422)
        return tag["id"]

    tag_label = (data.get("tag_label") or "").strip()
    if not tag_label:
        raise APIError("Forum etiketi gerekli", 422)
    return get_or_create_tag(tag_label, user_id)["id"]


def _can_edit_topic(topic: dict, user_id: str, role: str) -> bool:
    return role == "superadmin" or topic.get("author_id") == user_id


def _can_edit_tag(tag: dict | None, user_id: str, role: str) -> bool:
    if not tag:
        return False
    if role == "superadmin":
        return True
    return tag.get("created_by") == user_id


def update_tag(tag_id: str, user_id: str, role: str, data: dict) -> dict:
    db = get_supabase_admin()
    row = db.table("forum_tags").select(TAG_SELECT).eq("id", tag_id).maybe_single().execute()
    tag = get_data(row)
    if not tag:
        raise APIError("Etiket bulunamadı", 404)
    if not _can_edit_tag(tag, user_id, role):
        raise APIError("Bu etiketi düzenleyemezsin", 403)

    label = (data.get("label") or "").strip()
    if not label:
        raise APIError("Etiket adı gerekli", 422)
    if len(label) > MAX_TAG_LABEL_LEN:
        raise APIError(f"Etiket en fazla {MAX_TAG_LABEL_LEN} karakter olabilir", 422)

    duplicate = _find_tag_by_label(label)
    if duplicate and duplicate["id"] != tag_id:
        raise APIError("Bu isimde bir etiket zaten var", 422)

    result = (
        db.table("forum_tags")
        .update({"label": label, "slug": _slugify(label)})
        .eq("id", tag_id)
        .execute()
    )
    if not result.data:
        raise APIError("Etiket güncellenemedi", 500)
    return result.data[0]


def update_topic(topic_id: str, user_id: str, role: str, data: dict) -> dict:
    db = get_supabase_admin()
    row = db.table("forum_topics").select("*").eq("id", topic_id).maybe_single().execute()
    topic = get_data(row)
    if not topic:
        raise APIError("Topic not found", 404)

    assert_group_access(user_id, role, topic["group_id"])
    if not _can_edit_topic(topic, user_id, role):
        raise APIError("Bu konuyu düzenleyemezsin", 403)

    updates: dict = {"updated_at": datetime.now(IST).isoformat()}
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            raise APIError("Konu başlığı gerekli", 422)
        if len(title) > 200:
            raise APIError("Başlık en fazla 200 karakter olabilir", 422)
        updates["title"] = title
    if "body" in data:
        body = (data.get("body") or "").strip()
        if not body:
            raise APIError("Konu metni gerekli", 422)
        updates["body"] = body
    if "tag_id" in data or "tag_label" in data:
        updates["tag_id"] = _resolve_topic_tag(data, user_id)

    if len(updates) == 1:
        raise APIError("Güncellenecek alan yok", 422)

    result = db.table("forum_topics").update(updates).eq("id", topic_id).execute()
    if not result.data:
        raise APIError("Konu güncellenemedi", 500)
    return get_topic(topic_id, user_id, role)


def _empty_reactions() -> dict:
    return {"like_count": 0, "dislike_count": 0, "user_reaction": None}


def _fetch_reactions(target_type: str, target_ids: list[str], viewer_id: str | None) -> dict[str, dict]:
    if not target_ids:
        return {}
    db = get_supabase_admin()
    result = (
        db.table("forum_reactions")
        .select("target_id, reaction, user_id")
        .eq("target_type", target_type)
        .in_("target_id", target_ids)
        .execute()
    )
    summary: dict[str, dict] = {tid: _empty_reactions().copy() for tid in target_ids}
    for row in result.data or []:
        tid = row["target_id"]
        bucket = summary.setdefault(tid, _empty_reactions().copy())
        if row["reaction"] == "like":
            bucket["like_count"] += 1
        elif row["reaction"] == "dislike":
            bucket["dislike_count"] += 1
        if viewer_id and row["user_id"] == viewer_id:
            bucket["user_reaction"] = row["reaction"]
    return summary


def _attach_reactions(items: list[dict], target_type: str, viewer_id: str | None, id_key: str = "id") -> None:
    ids = [item[id_key] for item in items]
    reactions = _fetch_reactions(target_type, ids, viewer_id)
    for item in items:
        item["reactions"] = reactions.get(item[id_key], _empty_reactions())


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
    if role == "veli":
        if gid not in _guardian_group_ids(user_id):
            raise APIError("Bu sınıf forumuna erişimin yok", 403)
        return
    if gid not in _student_group_ids(user_id):
        raise APIError("Bu sınıf forumuna erişimin yok", 403)


def list_accessible_groups(user_id: str, role: str) -> list:
    if role == "superadmin":
        return list_groups(active_only=True)

    if role == "veli":
        group_ids = _guardian_group_ids(user_id)
        if not group_ids:
            return []
        groups = []
        for gid in group_ids:
            try:
                groups.append(get_group(gid))
            except APIError:
                continue
        return groups

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
    if role == "veli":
        return {"can_create": False, "remaining_today": 0, "limit_per_day": 0}
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

    tag_ids = list({t["tag_id"] for t in topics if t.get("tag_id")})
    tags = _fetch_tags(tag_ids)

    topic_ids = [t["id"] for t in topics]
    comments_res = db.table("forum_comments").select("topic_id").in_("topic_id", topic_ids).execute()
    count_map: dict[str, int] = {}
    for row in comments_res.data or []:
        tid = row["topic_id"]
        count_map[tid] = count_map.get(tid, 0) + 1

    group = get_group(gid)
    enriched = [
        {
            **topic,
            "author": profiles.get(topic["author_id"]),
            "tag": tags.get(topic["tag_id"]) if topic.get("tag_id") else None,
            "comment_count": count_map.get(topic["id"], 0),
            "group": {"id": group["id"], "group_name": group["group_name"]},
        }
        for topic in topics
    ]
    _attach_reactions(enriched, "topic", user_id)
    return enriched


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
    tag = None
    if topic.get("tag_id"):
        tags = _fetch_tags([topic["tag_id"]])
        tag = tags.get(topic["tag_id"])

    enriched_comments = [
        {**comment, "author": profiles.get(comment["author_id"])}
        for comment in comments
    ]
    _attach_reactions(enriched_comments, "comment", user_id)

    topic_payload = {
        **topic,
        "author": profiles.get(topic["author_id"]),
        "tag": tag,
        "can_edit": _can_edit_topic(topic, user_id, role),
        "can_edit_tag": _can_edit_tag(tag, user_id, role),
        "group": {"id": group["id"], "group_name": group["group_name"]},
        "comments": enriched_comments,
    }
    _attach_reactions([topic_payload], "topic", user_id)
    return topic_payload


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

    if role == "veli":
        raise APIError("Veliler forum konusu açamaz", 403)

    if role != "superadmin" and student_topics_today_count(author_id) >= 1:
        raise APIError("Bugün zaten bir konu açtın. Yarın tekrar deneyebilirsin.", 429)

    tag_id = _resolve_topic_tag(data, author_id)

    db = get_supabase_admin()
    result = (
        db.table("forum_topics")
        .insert({"group_id": gid, "author_id": author_id, "title": title, "body": body, "tag_id": tag_id})
        .execute()
    )
    if not result.data:
        raise APIError("Konu oluşturulamadı", 500)

    topic = result.data[0]
    profiles = _fetch_profiles([author_id])
    tags = _fetch_tags([tag_id])
    group = get_group(gid)
    payload = {
        **topic,
        "author": profiles.get(author_id),
        "tag": tags.get(tag_id),
        "comment_count": 0,
        "group": {"id": group["id"], "group_name": group["group_name"]},
        "reactions": _empty_reactions(),
    }
    return payload


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

    payload = {**comment, "author": commenter, "reactions": _empty_reactions()}
    return payload


def set_reaction(
    target_type: str,
    target_id: str,
    user_id: str,
    role: str,
    reaction: str | None,
) -> dict:
    target_type = (target_type or "").strip()
    if target_type not in VALID_TARGET_TYPES:
        raise APIError("Geçersiz hedef türü", 422)

    reaction = (reaction or "").strip().lower() or None
    if reaction is not None and reaction not in VALID_REACTIONS:
        raise APIError("Geçersiz tepki", 422)

    db = get_supabase_admin()
    owner_id: str | None = None
    topic_id: str | None = None
    topic_title: str | None = None

    if target_type == "topic":
        row = db.table("forum_topics").select("id, group_id, author_id, title").eq("id", target_id).maybe_single().execute()
        target = get_data(row)
        if not target:
            raise APIError("Topic not found", 404)
        assert_group_access(user_id, role, target["group_id"])
        owner_id = target["author_id"]
        topic_id = target["id"]
        topic_title = target.get("title")
    else:
        row = (
            db.table("forum_comments")
            .select("id, author_id, topic_id")
            .eq("id", target_id)
            .maybe_single()
            .execute()
        )
        comment = get_data(row)
        if not comment:
            raise APIError("Comment not found", 404)
        topic_row = (
            db.table("forum_topics")
            .select("group_id, title")
            .eq("id", comment["topic_id"])
            .maybe_single()
            .execute()
        )
        topic = get_data(topic_row) or {}
        assert_group_access(user_id, role, topic.get("group_id"))
        owner_id = comment["author_id"]
        topic_id = comment["topic_id"]
        topic_title = topic.get("title")

    existing = (
        db.table("forum_reactions")
        .select("id, reaction")
        .eq("user_id", user_id)
        .eq("target_type", target_type)
        .eq("target_id", target_id)
        .maybe_single()
        .execute()
    )
    prior = get_data(existing)
    prior_reaction = prior["reaction"] if prior else None

    if reaction is None or reaction == prior_reaction:
        if prior:
            db.table("forum_reactions").delete().eq("id", prior["id"]).execute()
        new_reaction = None
    elif prior:
        db.table("forum_reactions").update({"reaction": reaction}).eq("id", prior["id"]).execute()
        new_reaction = reaction
    else:
        db.table("forum_reactions").insert(
            {
                "user_id": user_id,
                "target_type": target_type,
                "target_id": target_id,
                "reaction": reaction,
            }
        ).execute()
        new_reaction = reaction

    if new_reaction and owner_id and owner_id != user_id:
        profiles = _fetch_profiles([user_id])
        reactor = profiles.get(user_id)
        _notify_forum_reaction(
            owner_id,
            reactor,
            new_reaction,
            target_type,
            topic_id,
            topic_title,
        )

    summary = _fetch_reactions(target_type, [target_id], user_id).get(target_id, _empty_reactions())
    return {"target_type": target_type, "target_id": target_id, "reactions": summary}


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
        notify_user(
            user_id,
            "FORUM_COMMENT",
            "Forum yorumu",
            message,
            data={"topic_id": str(topic["id"])},
        )


def _notify_forum_reaction(
    owner_id: str,
    reactor: dict | None,
    reaction: str,
    target_type: str,
    topic_id: str | None,
    topic_title: str | None,
) -> None:
    from services.notification_service import notify_user

    name = (reactor or {}).get("full_name") or "Birisi"
    title_text = topic_title or "Forum konusu"
    is_like = reaction == "like"
    ntype = "FORUM_LIKE" if is_like else "FORUM_DISLIKE"
    notif_title = "Forum beğenisi" if is_like else "Forum beğenmemesi"
    target_label = "konusunu" if target_type == "topic" else "yorumunu"
    verb = "beğendi" if is_like else "beğenmedi"
    message = f'{name} "{title_text}" {target_label} {verb}.'

    notify_user(
        owner_id,
        ntype,
        notif_title,
        message,
        data={"topic_id": str(topic_id) if topic_id else None, "reaction": reaction},
    )
