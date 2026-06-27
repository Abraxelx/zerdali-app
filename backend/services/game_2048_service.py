from datetime import datetime
from zoneinfo import ZoneInfo

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


def get_my_stats(student_id: str, role: str) -> dict:
    _assert_player(role)
    db = get_supabase_admin()
    week_key = istanbul_week_key()

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

    week_runs = (
        db.table("game_2048_runs")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .eq("week_key", week_key)
        .execute()
    )

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

    return {
        "week_key": week_key,
        "games_this_week": week_runs.count or 0,
        "active_run": _serialize_run(active_run) if active_run else None,
        "best_all_time": best_all_time,
        "recent_runs": [_serialize_run(r) for r in (recent.data or [])],
    }


def start_run(student_id: str, role: str) -> dict:
    _assert_player(role)
    db = get_supabase_admin()

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

    week_key = istanbul_week_key()
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
