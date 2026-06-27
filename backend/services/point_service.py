from config import Config
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin
from utils.events import log_event


def _ensure_student_points(student_id: str):
    db = get_supabase_admin()
    existing = db.table("student_points").select("student_id").eq("student_id", student_id).maybe_single().execute()
    if not get_data(existing):
        db.table("student_points").insert({"student_id": student_id, "total_zerdalyum": 0}).execute()


def grant_points(student_id: str, amount: int, transaction_type: str, description: str, lesson_id: str | None = None) -> dict:
    if amount == 0:
        raise APIError("Amount cannot be zero", 422)

    _ensure_student_points(student_id)
    db = get_supabase_admin()

    tx = db.table("point_transactions").insert(
        {
            "student_id": student_id,
            "amount": amount,
            "transaction_type": transaction_type,
            "lesson_id": lesson_id,
            "description": description,
        }
    ).execute()

    current = db.table("student_points").select("total_zerdalyum").eq("student_id", student_id).maybe_single().execute()
    current_data = get_data(current)
    new_total = (current_data["total_zerdalyum"] if current_data else 0) + amount
    db.table("student_points").update({"total_zerdalyum": new_total}).eq("student_id", student_id).execute()

    log_event("POINT_GRANTED", student_id, {"amount": amount, "type": transaction_type, "description": description})

    if amount > 0 and transaction_type not in ("HOMEWORK_SCORE",):
        from services.notification_service import notify_user
        titles = {
            "ATTENDANCE": "Yoklama puanı",
            "LESSON_SCORE": "Ders notu puanı",
            "ADMIN_BONUS": "Bonus puan",
            "HOMEWORK": "Ödev puanı",
            "GAME_2048": "2048 ödülü",
        }
        notify_user(
            student_id,
            "POINTS",
            titles.get(transaction_type, "Puan kazandın!"),
            f"+{amount} Zerdalyum — {description}",
            data={"transaction_type": transaction_type},
        )

    from services.gamification_service import check_level_up
    check_level_up(student_id)

    return {"transaction": tx.data[0] if tx.data else None, "new_total": new_total}


def grant_attendance_points(student_id: str, lesson_id: str, status: str):
    if status == "present":
        amount = Config.POINTS_ATTENDANCE_PRESENT
    elif status == "late":
        amount = Config.POINTS_ATTENDANCE_LATE
    else:
        return None

    return grant_points(student_id, amount, "ATTENDANCE", f"Attendance: {status}", lesson_id)


def grant_lesson_score_points(student_id: str, lesson_id: str, score: int):
    amount = score * Config.POINTS_LESSON_SCORE_MULTIPLIER
    return grant_points(student_id, amount, "LESSON_SCORE", f"Lesson score: {score}", lesson_id)


def grant_homework_submit_points(student_id: str, assignment_id: str):
    return grant_points(student_id, Config.POINTS_HOMEWORK_SUBMIT, "HOMEWORK", f"Homework submitted: {assignment_id}")


def grant_homework_score_points(student_id: str, assignment_id: str, score: int):
    amount = score * Config.POINTS_HOMEWORK_SCORE_MULTIPLIER
    return grant_points(student_id, amount, "HOMEWORK_SCORE", f"Homework score: {score}")


def admin_grant_points(student_id: str, amount: int, description: str) -> dict:
    return grant_points(student_id, amount, "ADMIN_BONUS", description or "Admin bonus")


def get_student_points(student_id: str) -> dict:
    _ensure_student_points(student_id)
    db = get_supabase_admin()

    points = db.table("student_points").select("*").eq("student_id", student_id).maybe_single().execute()
    points_data = get_data(points)
    transactions = (
        db.table("point_transactions")
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    return {
        "total_zerdalyum": points_data["total_zerdalyum"] if points_data else 0,
        "recent_transactions": get_data(transactions) or [],
    }
