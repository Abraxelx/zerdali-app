from datetime import datetime, timedelta, timezone

from config import Config
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin
from services.group_service import get_student_groups
from utils.events import log_event


def create_assignment(data: dict, file=None) -> dict:
    required = ["lesson_id", "title"]
    for field in required:
        if field not in data or not data[field]:
            raise APIError(f"{field} is required", 422)

    file_url = None
    if file:
        from utils.file_upload import upload_file
        file_url = upload_file(file, Config.BUCKET_ASSIGNMENT_FILES, "assignments", Config.DOCUMENT_EXTENSIONS)

    # Süre verildiği andan itibaren otomatik (varsayılan 1 hafta).
    due_date = (datetime.now(timezone.utc) + timedelta(days=Config.HOMEWORK_DUE_DAYS)).isoformat()

    db = get_supabase_admin()
    result = db.table("assignments").insert(
        {
            "lesson_id": data["lesson_id"],
            "title": data["title"],
            "description": data.get("description"),
            "file_url": file_url,
            "due_date": due_date,
        }
    ).execute()
    assignment = result.data[0]

    lesson = db.table("lessons").select("group_id").eq("id", data["lesson_id"]).maybe_single().execute()
    lesson_data = get_data(lesson)
    if lesson_data:
        from services.notification_service import notify_group_students
        notify_group_students(
            lesson_data["group_id"],
            "ASSIGNMENT_CREATED",
            "Yeni ödev",
            f'"{data["title"]}" ödevi verildi. Teslim et!',
        )
    return assignment


def list_assignments(lesson_id: str | None = None) -> list:
    db = get_supabase_admin()
    query = db.table("assignments").select("*")
    if lesson_id:
        query = query.eq("lesson_id", lesson_id)
    result = query.order("due_date", desc=True).execute()
    return result.data or []


def get_assignment(assignment_id: str) -> dict:
    db = get_supabase_admin()
    result = db.table("assignments").select("*").eq("id", assignment_id).maybe_single().execute()
    assignment = get_data(result)
    if not assignment:
        raise APIError("Assignment not found", 404)
    return assignment


def get_student_assignments(student_id: str) -> list:
    groups = get_student_groups(student_id)
    group_ids = [g["group_id"] for g in groups]
    if not group_ids:
        return []

    db = get_supabase_admin()
    lessons = db.table("lessons").select("id").in_("group_id", group_ids).execute()
    lesson_ids = [l["id"] for l in (lessons.data or [])]
    if not lesson_ids:
        return []

    result = db.table("assignments").select("*").in_("lesson_id", lesson_ids).order("due_date", desc=True).execute()
    assignments = result.data or []
    if not assignments:
        return []

    # Öğrencinin bu ödevlere ait teslimlerini ekle (durum/puan göstermek için).
    assignment_ids = [a["id"] for a in assignments]
    subs = (
        db.table("assignment_submissions")
        .select("*")
        .eq("student_id", student_id)
        .in_("assignment_id", assignment_ids)
        .execute()
    )
    by_assignment = {s["assignment_id"]: s for s in (subs.data or [])}
    for a in assignments:
        a["submission"] = by_assignment.get(a["id"])
    return assignments


def _is_overdue(assignment: dict) -> bool:
    due = assignment.get("due_date")
    if not due:
        return False
    try:
        due_dt = datetime.fromisoformat(str(due).replace("Z", "+00:00"))
        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > due_dt
    except (ValueError, TypeError):
        return False


def submit_assignment(assignment_id: str, student_id: str, data: dict, file=None) -> dict:
    assignment = get_assignment(assignment_id)
    submission_text = data.get("submission_text")

    db = get_supabase_admin()
    existing = (
        db.table("assignment_submissions")
        .select("id, status")
        .eq("assignment_id", assignment_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    # Tek hak: daha önce teslim edildiyse tekrar gönderilemez.
    if get_data(existing):
        raise APIError("Bu ödevi zaten teslim ettin, tekrar gönderemezsin.", 409)

    if not submission_text and not file:
        raise APIError("Teslim metni veya dosya gerekli", 422)

    file_url = None
    if file:
        from utils.file_upload import upload_file
        file_url = upload_file(file, Config.BUCKET_SUBMISSION_FILES, "submissions", Config.DOCUMENT_EXTENSIONS)

    payload = {
        "assignment_id": assignment_id,
        "student_id": student_id,
        "submission_text": submission_text,
        "file_url": file_url,
        "status": "pending",
        "is_late": _is_overdue(assignment),
    }
    result = db.table("assignment_submissions").insert(payload).execute()

    log_event("HOMEWORK_SUBMITTED", student_id, {"assignment_id": assignment_id})

    profile = db.table("profiles").select("full_name").eq("id", student_id).maybe_single().execute()
    name = get_data(profile).get("full_name", "Öğrenci") if get_data(profile) else "Öğrenci"
    from services.notification_service import notify_superadmins
    notify_superadmins(
        "HOMEWORK_SUBMITTED",
        "Yeni ödev teslimi",
        f'{name} "{assignment["title"]}" ödevini teslim etti.',
    )
    return result.data[0] if result.data else payload


def get_submissions(assignment_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("assignment_submissions")
        .select("*, profiles(id, full_name, username)")
        .eq("assignment_id", assignment_id)
        .execute()
    )
    return result.data or []


def get_pending_submissions() -> list:
    """Onay bekleyen tüm teslimleri öğrenci + ödev bilgisiyle döner."""
    db = get_supabase_admin()
    result = (
        db.table("assignment_submissions")
        .select("*, profiles(id, full_name, username), assignments(id, title, due_date)")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []


def review_submission(submission_id: str, action: str, score: int | None = None, feedback: str | None = None) -> dict:
    if action not in ("approve", "reject"):
        raise APIError("action must be 'approve' or 'reject'", 422)

    db = get_supabase_admin()
    current = (
        db.table("assignment_submissions")
        .select("*")
        .eq("id", submission_id)
        .maybe_single()
        .execute()
    )
    submission = get_data(current)
    if not submission:
        raise APIError("Submission not found", 404)
    if submission.get("status") != "pending":
        raise APIError("Bu teslim zaten değerlendirilmiş.", 409)

    if action == "approve":
        if score is None:
            raise APIError("Onay için puan (score) gerekli", 422)
        score = int(score)

    update = {
        "status": "approved" if action == "approve" else "rejected",
        "score": score if action == "approve" else None,
        "feedback": feedback,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    result = (
        db.table("assignment_submissions")
        .update(update)
        .eq("id", submission_id)
        .execute()
    )
    reviewed = result.data[0] if result.data else {**submission, **update}

    if action == "approve":
        from services.point_service import grant_homework_score_points
        grant_homework_score_points(submission["student_id"], submission["assignment_id"], score)
        log_event("HOMEWORK_APPROVED", submission["student_id"], {"assignment_id": submission["assignment_id"], "score": score})
        assignment = get_assignment(submission["assignment_id"])
        from services.notification_service import notify_user
        notify_user(
            submission["student_id"],
            "HOMEWORK_APPROVED",
            "Ödevin onaylandı!",
            f'"{assignment["title"]}" — not: {score} (+{score * Config.POINTS_HOMEWORK_SCORE_MULTIPLIER} Zerdalyum)',
        )
    else:
        log_event("HOMEWORK_REJECTED", submission["student_id"], {"assignment_id": submission["assignment_id"]})
        assignment = get_assignment(submission["assignment_id"])
        from services.notification_service import notify_user
        msg = f'"{assignment["title"]}" ödevin reddedildi.'
        if feedback:
            msg += f" Geri bildirim: {feedback}"
        notify_user(submission["student_id"], "HOMEWORK_REJECTED", "Ödev reddedildi", msg)

    return reviewed
