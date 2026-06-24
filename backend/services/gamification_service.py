from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin
from utils.events import log_event


def get_effective_multiplier(student_id: str) -> float:
    db = get_supabase_admin()
    result = (
        db.table("student_meblahs")
        .select("meblah_type_id, meblah_types(zerdalyum_multiplier)")
        .eq("student_id", student_id)
        .execute()
    )
    if not result.data:
        return 1.0

    multipliers = []
    for item in result.data:
        mt = item.get("meblah_types")
        if mt and mt.get("zerdalyum_multiplier"):
            multipliers.append(float(mt["zerdalyum_multiplier"]))

    return max(multipliers) if multipliers else 1.0


def get_effective_power(student_id: str) -> float:
    db = get_supabase_admin()
    points = db.table("student_points").select("total_zerdalyum").eq("student_id", student_id).maybe_single().execute()
    points_data = get_data(points)
    total = points_data["total_zerdalyum"] if points_data else 0
    multiplier = get_effective_multiplier(student_id)
    return total * multiplier


def get_student_meblahs(student_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("student_meblahs")
        .select("*, meblah_types(*)")
        .eq("student_id", student_id)
        .order("earned_at", desc=True)
        .execute()
    )
    return result.data or []


def list_meblah_types() -> list:
    db = get_supabase_admin()
    result = db.table("meblah_types").select("*").order("zerdalyum_multiplier").execute()
    return result.data or []


def update_meblah_type(meblah_id: str, data: dict) -> dict:
    allowed = {"name", "rarity", "zerdalyum_multiplier", "icon_url"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    db = get_supabase_admin()
    result = db.table("meblah_types").update(update_data).eq("id", meblah_id).execute()
    if not result.data:
        raise APIError("Meblah type not found", 404)
    return result.data[0]


def grant_meblah(student_id: str, meblah_type_id: str) -> dict:
    db = get_supabase_admin()
    mt = db.table("meblah_types").select("id, name, rarity").eq("id", meblah_type_id).maybe_single().execute()
    mt_data = get_data(mt)
    if not mt_data:
        raise APIError("Meblah type not found", 404)

    result = db.table("student_meblahs").insert(
        {"student_id": student_id, "meblah_type_id": meblah_type_id}
    ).execute()

    log_event("MEBLAH_EARNED", student_id, {"meblah_type_id": meblah_type_id})

    from services.notification_service import notify_user
    notify_user(
        student_id,
        "MEBLAH_EARNED",
        "Yeni meblağ kazandın!",
        f'"{mt_data["name"]}" meblağı hesabına eklendi.',
        data={"meblah_type_id": meblah_type_id},
    )
    return result.data[0]


def get_student_level(student_id: str) -> dict:
    power = get_effective_power(student_id)
    db = get_supabase_admin()
    levels = db.table("levels").select("*").order("level_number").execute()
    all_levels = levels.data or []

    current_level, next_level = _resolve_levels(power, all_levels)

    return {
        "effective_power": power,
        "effective_multiplier": get_effective_multiplier(student_id),
        "current_level": current_level,
        "next_level": next_level,
    }


def _resolve_levels(power: float, all_levels: list) -> tuple[dict | None, dict | None]:
    current_level = all_levels[0] if all_levels else None
    next_level = None

    for i, level in enumerate(all_levels):
        if power >= level["required_zerdalyum"]:
            current_level = level
            next_level = all_levels[i + 1] if i + 1 < len(all_levels) else None
        else:
            if next_level is None:
                next_level = level
            break

    return current_level, next_level


def _student_summaries_for_ids(student_ids: list[str]) -> list[dict]:
    if not student_ids:
        return []

    db = get_supabase_admin()
    profiles_res = (
        db.table("profiles")
        .select("*")
        .in_("id", student_ids)
        .eq("role", "student")
        .execute()
    )
    users = profiles_res.data or []
    if not users:
        return []

    ids = [u["id"] for u in users]

    points_res = (
        db.table("student_points")
        .select("student_id, total_zerdalyum")
        .in_("student_id", ids)
        .execute()
    )
    points_map = {p["student_id"]: p["total_zerdalyum"] for p in (points_res.data or [])}

    meblahs_res = (
        db.table("student_meblahs")
        .select("student_id, meblah_types(zerdalyum_multiplier)")
        .in_("student_id", ids)
        .execute()
    )
    mult_map: dict[str, float] = {}
    for item in meblahs_res.data or []:
        sid = item["student_id"]
        mt = item.get("meblah_types") or {}
        m = float(mt.get("zerdalyum_multiplier") or 1)
        mult_map[sid] = max(mult_map.get(sid, 1.0), m)

    levels = list_levels()
    summaries = []
    for u in users:
        sid = u["id"]
        total = points_map.get(sid, 0)
        mult = mult_map.get(sid, 1.0)
        power = total * mult
        current_level, _ = _resolve_levels(power, levels)
        summaries.append(
            {
                "profile": u,
                "total_zerdalyum": total,
                "effective_multiplier": mult,
                "effective_power": power,
                "current_level": current_level,
            }
        )

    summaries.sort(key=lambda x: x["effective_power"], reverse=True)
    for i, summary in enumerate(summaries, start=1):
        summary["rank"] = i
    return summaries


def list_students_summary() -> list:
    users = list_users(role="student")
    if not users:
        return []
    return _student_summaries_for_ids([u["id"] for u in users])


def get_group_leaderboard(group_id: str) -> list:
    from services import group_service

    group_service.get_group(group_id)
    members = group_service.get_group_members(group_id)
    student_ids = [m["student_id"] for m in members if m.get("profiles")]
    return _student_summaries_for_ids(student_ids)


def get_student_class_leaderboards(student_id: str) -> list:
    from services import group_service

    memberships = group_service.get_student_groups(student_id)
    boards = []
    for membership in memberships:
        embedded = membership.get("student_groups") or {}
        group_id = membership.get("group_id") or embedded.get("id")
        if group_id is None:
            continue
        group_name = embedded.get("group_name") or "Sınıf"
        entries = get_group_leaderboard(str(group_id))
        for entry in entries:
            entry["is_me"] = entry["profile"]["id"] == student_id
        boards.append(
            {
                "group_id": str(group_id),
                "group_name": group_name,
                "leaderboard": entries,
            }
        )
    return boards


def get_student_overview(student_id: str) -> dict:
    db = get_supabase_admin()
    profile = db.table("profiles").select("*").eq("id", student_id).maybe_single().execute()
    profile_data = get_data(profile)
    if not profile_data:
        raise APIError("Student not found", 404)
    if profile_data.get("role") != "student":
        raise APIError("User is not a student", 422)

    from services import group_service, point_service

    return {
        "profile": profile_data,
        "points": point_service.get_student_points(student_id),
        "level": get_student_level(student_id),
        "meblahs": get_student_meblahs(student_id),
        "groups": group_service.get_student_groups(student_id),
    }


def remove_student_meblah(student_id: str, record_id: str) -> dict:
    db = get_supabase_admin()
    row = (
        db.table("student_meblahs")
        .select("id, student_id")
        .eq("id", record_id)
        .maybe_single()
        .execute()
    )
    data = get_data(row)
    if not data or data["student_id"] != student_id:
        raise APIError("Meblah not found", 404)

    db.table("student_meblahs").delete().eq("id", record_id).execute()
    log_event("MEBLAH_REMOVED", student_id, {"student_meblah_id": record_id})
    return {"message": "Meblah removed"}


def check_level_up(student_id: str):
    level_info = get_student_level(student_id)
    current = level_info.get("current_level")
    if current:
        log_event("LEVEL_UP", student_id, {"level": current.get("level_number"), "title": current.get("title")})


def list_levels() -> list:
    db = get_supabase_admin()
    result = db.table("levels").select("*").order("level_number").execute()
    return result.data or []


def update_level(level_id: str, data: dict) -> dict:
    allowed = {"title", "required_zerdalyum", "icon_url", "level_number"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    db = get_supabase_admin()
    result = db.table("levels").update(update_data).eq("id", level_id).execute()
    if not result.data:
        raise APIError("Level not found", 404)
    return result.data[0]


def list_achievements() -> list:
    db = get_supabase_admin()
    result = db.table("achievements").select("*").execute()
    return result.data or []


def create_achievement(data: dict) -> dict:
    if not data.get("title"):
        raise APIError("title is required", 422)

    db = get_supabase_admin()
    result = db.table("achievements").insert(
        {"title": data["title"], "icon_url": data.get("icon_url"), "reward": data.get("reward")}
    ).execute()
    return result.data[0]


def get_student_achievements(student_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("student_achievements")
        .select("*, achievements(*)")
        .eq("student_id", student_id)
        .execute()
    )
    return result.data or []


def grant_achievement(student_id: str, achievement_id: str) -> dict:
    db = get_supabase_admin()
    ach = db.table("achievements").select("id").eq("id", achievement_id).maybe_single().execute()
    if not get_data(ach):
        raise APIError("Achievement not found", 404)

    result = db.table("student_achievements").insert(
        {"student_id": student_id, "achievement_id": achievement_id}
    ).execute()
    return result.data[0]


def list_users(role: str | None = None) -> list:
    db = get_supabase_admin()
    query = db.table("profiles").select("*")
    if role:
        query = query.eq("role", role)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


def update_user_role(user_id: str, role: str) -> dict:
    if role not in ("student", "superadmin", "veli"):
        raise APIError("Invalid role", 422)

    db = get_supabase_admin()
    result = db.table("profiles").update({"role": role}).eq("id", user_id).execute()
    if not result.data:
        raise APIError("User not found", 404)
    return result.data[0]


def update_user(user_id: str, data: dict) -> dict:
    allowed = {"full_name", "username", "bio", "profile_photo_url", "role"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    db = get_supabase_admin()
    result = db.table("profiles").update(update_data).eq("id", user_id).execute()
    if not result.data:
        raise APIError("User not found", 404)
    return result.data[0]
