from config import Config
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin
from services.group_service import get_student_groups
from utils.events import log_event


def create_assignment(data: dict, file=None) -> dict:
    required = ["lesson_id", "title", "due_date"]
    for field in required:
        if field not in data:
            raise APIError(f"{field} is required", 422)

    file_url = None
    if file:
        from utils.file_upload import upload_file
        file_url = upload_file(file, Config.BUCKET_ASSIGNMENT_FILES, "assignments")

    db = get_supabase_admin()
    result = db.table("assignments").insert(
        {
            "lesson_id": data["lesson_id"],
            "title": data["title"],
            "description": data.get("description"),
            "file_url": file_url,
            "due_date": data["due_date"],
        }
    ).execute()
    return result.data[0]


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
    return result.data or []


def submit_assignment(assignment_id: str, student_id: str, data: dict, file=None) -> dict:
    get_assignment(assignment_id)
    submission_text = data.get("submission_text")

    if not submission_text and not file:
        raise APIError("submission_text or file required", 422)

    file_url = None
    if file:
        from utils.file_upload import upload_file
        file_url = upload_file(file, Config.BUCKET_SUBMISSION_FILES, "submissions")

    db = get_supabase_admin()
    existing = (
        db.table("assignment_submissions")
        .select("assignment_id")
        .eq("assignment_id", assignment_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )

    payload = {
        "assignment_id": assignment_id,
        "student_id": student_id,
        "submission_text": submission_text,
        "file_url": file_url,
    }

    if get_data(existing):
        update = {k: v for k, v in payload.items() if k not in ("assignment_id", "student_id") and v is not None}
        result = (
            db.table("assignment_submissions")
            .update(update)
            .eq("assignment_id", assignment_id)
            .eq("student_id", student_id)
            .execute()
        )
    else:
        result = db.table("assignment_submissions").insert(payload).execute()

    from services.point_service import grant_homework_submit_points
    grant_homework_submit_points(student_id, assignment_id)

    log_event("HOMEWORK_SUBMITTED", student_id, {"assignment_id": assignment_id})
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


def grade_submission(submission_id: str, score: int, feedback: str | None = None) -> dict:
    if score is None:
        raise APIError("score is required", 422)

    db = get_supabase_admin()
    result = (
        db.table("assignment_submissions")
        .update({"score": score, "feedback": feedback})
        .eq("id", submission_id)
        .execute()
    )
    if not result.data:
        raise APIError("Submission not found", 404)

    submission = result.data[0]
    from services.point_service import grant_homework_score_points
    grant_homework_score_points(submission["student_id"], submission["assignment_id"], int(score))

    return submission
