from datetime import datetime
from zoneinfo import ZoneInfo

from services.game_2048_settings import get_settings
from services.group_service import get_group_members, get_student_groups, list_groups
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

IST = ZoneInfo("Europe/Istanbul")
MAX_TILE = 131072
MIN_MOVES = 1
MAX_MOVES = 50_000
MAX_DURATION_SEC = 4 * 3600


def istanbul_week_key(when: datetime | None = None) -> str:
    now = when or datetime.now(IST)
    iso = now.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


PLAYABLE_ROLES = frozenset({"student", "superadmin"})
STUDENT_ROLE = "student"


def _assert_player(role: str) -> None:
    if role not in PLAYABLE_ROLES:
        raise APIError("2048 yalnızca öğrenci ve öğretmen hesapları tarafından oynanabilir", 403)


def _is_power_of_two(value: int) -> bool:
    return value > 0 and (value & (value - 1)) == 0


def _validate_finish_payload(score: int, max_tile: int, moves: int, duration_sec: int) -> None:
    if not isinstance(score, int) or score < 0:
        raise APIError("Geçersiz skor", 422)
    if not isinstance(max_tile, int) or max_tile < 2 or max_tile > MAX_TILE or not _is_power_of_two(max_tile):
        raise APIError("Geçersiz en yüksek karo", 422)
    if not isinstance(moves, int) or moves < MIN_MOVES or moves > MAX_MOVES:
        raise APIError("Geçersiz hamle sayısı", 422)
    if not isinstance(duration_sec, int) or duration_sec < 1 or duration_sec > MAX_DURATION_SEC:
        raise APIError("Geçersiz süre", 422)
    if score < max_tile:
        raise APIError("Skor en yüksek karodan küçük olamaz", 422)
    if score > max_tile * max(moves, 1):
        raise APIError("Skor doğrulaması başarısız", 422)
    min_moves = max(1, max_tile.bit_length() - 1)
    if moves < min_moves:
        raise APIError("Hamle sayısı çok düşük", 422)


def _serialize_run(row: dict) -> dict:
    return {
        "id": row["id"],
        "week_key": row["week_key"],
        "score": row["score"],
        "max_tile": row["max_tile"],
        "moves": row["moves"],
        "duration_sec": row["duration_sec"],
        "status": row["status"],
        "started_at": row["started_at"],
        "finished_at": row.get("finished_at"),
    }


PROFILE_SELECT = "id, full_name, username, profile_photo_url, role"


def _run_rank_key(run: dict) -> tuple:
    return (
        -int(run.get("max_tile") or 0),
        -int(run.get("score") or 0),
        int(run.get("moves") or 0),
        run.get("finished_at") or "",
    )


def _role_label(role: str | None) -> str:
    if role == "superadmin":
        return "Öğretmen"
    return "Öğrenci"


def _count_weekly_runs(db, player_id: str, week_key: str) -> int:
    result = (
        db.table("game_2048_runs")
        .select("id", count="exact")
        .eq("student_id", player_id)
        .eq("week_key", week_key)
        .execute()
    )
    return result.count or 0


def _weekly_bests(db, week_key: str) -> dict[str, dict]:
    runs_res = (
        db.table("game_2048_runs")
        .select("student_id, score, max_tile, moves, finished_at")
        .eq("week_key", week_key)
        .eq("status", "finished")
        .execute()
    )
    best_by_player: dict[str, dict] = {}
    for row in runs_res.data or []:
        pid = row.get("student_id")
        if not pid:
            continue
        current = best_by_player.get(pid)
        if current is None or _run_rank_key(row) < _run_rank_key(current):
            best_by_player[pid] = row
    return best_by_player


def _profiles_for_players(db, player_ids: list[str], roles: list[str] | None = None) -> dict[str, dict]:
    if not player_ids:
        return {}
    query = db.table("profiles").select(PROFILE_SELECT).in_("id", player_ids)
    if roles:
        query = query.in_("role", roles)
    profiles_res = query.execute()
    return {p["id"]: p for p in (profiles_res.data or [])}


def _build_entries(ranked: list[dict], user_id: str, limit: int | None = 20) -> list[dict]:
    entries = []
    slice_end = len(ranked) if limit is None else limit
    for index, row in enumerate(ranked[:slice_end], start=1):
        profile = row["profile"]
        entries.append(
            {
                "rank": index,
                "player_id": profile["id"],
                "full_name": profile.get("full_name") or "Kullanıcı",
                "profile_photo_url": profile.get("profile_photo_url"),
                "role": profile.get("role"),
                "role_label": _role_label(profile.get("role")),
                "max_tile": row["max_tile"],
                "score": row["score"],
                "moves": row["moves"],
                "is_me": profile["id"] == user_id,
            }
        )
    return entries


def _rank_players(best_by_player: dict[str, dict], profiles: dict[str, dict]) -> list[dict]:
    return sorted(
        (
            {**best_by_player[pid], "profile": profiles[pid]}
            for pid in best_by_player
            if pid in profiles
        ),
        key=_run_rank_key,
    )


def get_quota(player_id: str, role: str) -> dict:
    _assert_player(role)
    settings = get_settings()
    db = get_supabase_admin()
    week_key = istanbul_week_key()
    used = _count_weekly_runs(db, player_id, week_key)
    limit = int(settings["weekly_play_limit"])
    enabled = bool(settings["enabled"])
    remaining = max(0, limit - used)
    return {
        "week_key": week_key,
        "enabled": enabled,
        "weekly_limit": limit,
        "games_used": used,
        "games_remaining": remaining,
        "can_start": enabled and remaining > 0,
    }


def get_weekly_leaderboard(user_id: str, role: str, limit: int = 20) -> dict:
    _assert_player(role)
    db = get_supabase_admin()
    week_key = istanbul_week_key()
    best_by_player = _weekly_bests(db, week_key)

    if not best_by_player:
        return {"week_key": week_key, "entries": []}

    profiles = _profiles_for_players(db, list(best_by_player.keys()), list(PLAYABLE_ROLES))
    ranked = _rank_players(best_by_player, profiles)
    return {"week_key": week_key, "entries": _build_entries(ranked, user_id, limit)}


def get_class_leaderboards(user_id: str, role: str, limit: int = 10) -> dict:
    _assert_player(role)
    db = get_supabase_admin()
    week_key = istanbul_week_key()
    best_by_player = _weekly_bests(db, week_key)

    if role == "superadmin":
        groups = list_groups(active_only=True)
    else:
        memberships = get_student_groups(user_id)
        groups = [m["student_groups"] for m in memberships if m.get("student_groups")]

    boards = []
    for group in groups:
        members = get_group_members(group["id"])
        member_ids = {m["student_id"] for m in members}
        filtered = {pid: run for pid, run in best_by_player.items() if pid in member_ids}
        if not filtered:
            boards.append(
                {
                    "group_id": group["id"],
                    "group_name": group.get("group_name") or "Sınıf",
                    "entries": [],
                }
            )
            continue

        profiles = _profiles_for_players(db, list(filtered.keys()), [STUDENT_ROLE])
        ranked = _rank_players(filtered, profiles)
        boards.append(
            {
                "group_id": group["id"],
                "group_name": group.get("group_name") or "Sınıf",
                "entries": _build_entries(ranked, user_id, limit),
            }
        )

    return {"week_key": week_key, "boards": boards}


def get_my_stats(student_id: str, role: str) -> dict:
    _assert_player(role)
    db = get_supabase_admin()
    week_key = istanbul_week_key()
    settings = get_settings()

    finished = (
        db.table("game_2048_runs")
        .select("score, max_tile, moves, finished_at")
        .eq("student_id", student_id)
        .eq("status", "finished")
        .order("max_tile", desc=True)
        .order("score", desc=True)
        .limit(1)
        .execute()
    )
    best_all_time = (finished.data or [None])[0]

    games_this_week = _count_weekly_runs(db, student_id, week_key)
    weekly_limit = int(settings["weekly_play_limit"])
    enabled = bool(settings["enabled"])

    active = (
        db.table("game_2048_runs")
        .select("*")
        .eq("student_id", student_id)
        .eq("status", "active")
        .order("started_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    active_run = get_data(active)

    recent = (
        db.table("game_2048_runs")
        .select("*")
        .eq("student_id", student_id)
        .in_("status", ["finished", "abandoned"])
        .order("finished_at", desc=True)
        .limit(10)
        .execute()
    )

    remaining = max(0, weekly_limit - games_this_week)
    return {
        "week_key": week_key,
        "games_this_week": games_this_week,
        "quota": {
            "enabled": enabled,
            "weekly_limit": weekly_limit,
            "games_used": games_this_week,
            "games_remaining": remaining,
            "can_start": enabled and remaining > 0 and not active_run,
        },
        "active_run": _serialize_run(active_run) if active_run else None,
        "best_all_time": best_all_time,
        "recent_runs": [_serialize_run(r) for r in (recent.data or [])],
    }


def start_run(student_id: str, role: str) -> dict:
    _assert_player(role)
    settings = get_settings()
    if not settings["enabled"]:
        raise APIError("2048 oyunu şu an kapalı", 422)

    db = get_supabase_admin()
    week_key = istanbul_week_key()
    used = _count_weekly_runs(db, student_id, week_key)
    limit = int(settings["weekly_play_limit"])
    if used >= limit:
        raise APIError(f"Bu hafta oyun hakkın doldu ({limit} oyun)", 429)

    active = (
        db.table("game_2048_runs")
        .select("id")
        .eq("student_id", student_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    if active.data:
        raise APIError("Zaten devam eden bir oyunun var. Önce onu bitir.", 409)

    result = (
        db.table("game_2048_runs")
        .insert({"student_id": student_id, "week_key": week_key, "status": "active"})
        .execute()
    )
    if not result.data:
        raise APIError("Oyun başlatılamadı", 500)
    return _serialize_run(result.data[0])


def finish_run(run_id: str, student_id: str, role: str, data: dict) -> dict:
    _assert_player(role)
    score = int(data.get("score", 0))
    max_tile = int(data.get("max_tile", 0))
    moves = int(data.get("moves", 0))
    duration_sec = int(data.get("duration_sec", 0))
    _validate_finish_payload(score, max_tile, moves, duration_sec)

    db = get_supabase_admin()
    row = (
        db.table("game_2048_runs")
        .select("*")
        .eq("id", run_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    run = get_data(row)
    if not run:
        raise APIError("Oyun bulunamadı", 404)
    if run["status"] != "active":
        raise APIError("Bu oyun zaten tamamlanmış", 409)

    finished_at = datetime.now(IST).isoformat()
    result = (
        db.table("game_2048_runs")
        .update(
            {
                "score": score,
                "max_tile": max_tile,
                "moves": moves,
                "duration_sec": duration_sec,
                "status": "finished",
                "finished_at": finished_at,
            }
        )
        .eq("id", run_id)
        .execute()
    )
    if not result.data:
        raise APIError("Skor kaydedilemedi", 500)
    return _serialize_run(result.data[0])


def abandon_run(run_id: str, student_id: str, role: str) -> dict:
    _assert_player(role)
    db = get_supabase_admin()
    row = (
        db.table("game_2048_runs")
        .select("*")
        .eq("id", run_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    run = get_data(row)
    if not run:
        raise APIError("Oyun bulunamadı", 404)
    if run["status"] != "active":
        raise APIError("Bu oyun zaten tamamlanmış", 409)

    finished_at = datetime.now(IST).isoformat()
    result = (
        db.table("game_2048_runs")
        .update({"status": "abandoned", "finished_at": finished_at})
        .eq("id", run_id)
        .execute()
    )
    if not result.data:
        raise APIError("Oyun iptal edilemedi", 500)
    return _serialize_run(result.data[0])


def _rank_zerdalyum(settings: dict, rank: int) -> int:
    if rank == 1:
        return int(settings["rank1_zerdalyum"])
    if rank == 2:
        return int(settings["rank2_zerdalyum"])
    if rank == 3:
        return int(settings["rank3_zerdalyum"])
    if 4 <= rank <= 10:
        return int(settings["rank4_10_zerdalyum"])
    return 0


def _reward_exists(db, week_key: str, player_id: str, reward_kind: str, rank: int | None = None) -> bool:
    query = (
        db.table("game_2048_weekly_rewards")
        .select("id")
        .eq("week_key", week_key)
        .eq("player_id", player_id)
        .eq("reward_kind", reward_kind)
    )
    if rank is not None:
        query = query.eq("rank", rank)
    result = query.limit(1).execute()
    return bool(result.data)


def _record_reward(db, week_key: str, player_id: str, reward_kind: str, rank: int | None, zerdalyum: int, meblah_type_id: str | None):
    db.table("game_2048_weekly_rewards").insert(
        {
            "week_key": week_key,
            "player_id": player_id,
            "reward_kind": reward_kind,
            "rank": rank,
            "zerdalyum": zerdalyum,
            "meblah_type_id": meblah_type_id,
        }
    ).execute()


def _notify_game_reward(student_id: str, title: str, message: str):
    from services.notification_service import notify_user

    notify_user(
        student_id,
        "GAME_2048_REWARD",
        title,
        message,
        data={"href": "/games/2048"},
    )


def distribute_weekly_rewards(week_key: str | None = None, force: bool = False) -> dict:
    settings = get_settings()
    if not settings["enabled"]:
        raise APIError("2048 oyunu kapalı — ödül dağıtılamaz", 422)

    week_key = week_key or istanbul_week_key()
    db = get_supabase_admin()

    if not force:
        existing = (
            db.table("game_2048_weekly_rewards")
            .select("id")
            .eq("week_key", week_key)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise APIError(f"{week_key} için ödüller zaten dağıtılmış", 409)

    from services.gamification_service import grant_meblah
    from services.point_service import grant_points

    best_by_player = _weekly_bests(db, week_key)
    student_profiles = _profiles_for_players(db, list(best_by_player.keys()), [STUDENT_ROLE])
    ranked_students = _rank_players(best_by_player, student_profiles)

    granted = []
    top_ten_ids: set[str] = set()

    for rank, row in enumerate(ranked_students[:10], start=1):
        student_id = row["profile"]["id"]
        top_ten_ids.add(student_id)
        if _reward_exists(db, week_key, student_id, "rank", rank):
            continue

        amount = _rank_zerdalyum(settings, rank)
        meblah_type_id = settings.get("rank1_meblah_type_id") if rank == 1 else None
        description = f"2048 haftalık sıralama #{rank} ({week_key})"

        if amount > 0:
            grant_points(student_id, amount, "GAME_2048", description)
        if meblah_type_id:
            grant_meblah(student_id, meblah_type_id)

        _record_reward(db, week_key, student_id, "rank", rank, amount, meblah_type_id)
        granted.append({"player_id": student_id, "reward_kind": "rank", "rank": rank, "zerdalyum": amount})
        _notify_game_reward(
            student_id,
            "2048 haftalık ödülü",
            f"{week_key} haftasında #{rank} oldun — +{amount} Zerdalyum",
        )

    participation_amount = int(settings["participation_zerdalyum"])
    min_tile = int(settings["participation_min_tile"])

    for student_id, run in best_by_player.items():
        if student_id not in student_profiles:
            continue
        if int(run.get("max_tile") or 0) < min_tile:
            continue
        if _reward_exists(db, week_key, student_id, "participation"):
            continue

        description = f"2048 katılım ödülü ({week_key}, ≥{min_tile} karo)"
        if participation_amount > 0:
            grant_points(student_id, participation_amount, "GAME_2048", description)

        _record_reward(db, week_key, student_id, "participation", None, participation_amount, None)
        granted.append(
            {
                "player_id": student_id,
                "reward_kind": "participation",
                "zerdalyum": participation_amount,
                "also_ranked": student_id in top_ten_ids,
            }
        )
        if student_id not in top_ten_ids:
            _notify_game_reward(
                student_id,
                "2048 katılım ödülü",
                f"{week_key} haftasında {min_tile}+ karo — +{participation_amount} Zerdalyum",
            )

    return {"week_key": week_key, "granted_count": len(granted), "grants": granted}


def list_weekly_rewards(week_key: str | None = None, limit: int = 100) -> dict:
    db = get_supabase_admin()
    week_key = week_key or istanbul_week_key()
    result = (
        db.table("game_2048_weekly_rewards")
        .select("*, profiles(full_name, username)")
        .eq("week_key", week_key)
        .order("granted_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"week_key": week_key, "rewards": result.data or []}
