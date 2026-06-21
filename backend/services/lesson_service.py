from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin
from services.group_service import get_student_groups, get_group_members


def _lesson_group_student_ids(lesson_id: str) -> set[str]:
    lesson = get_lesson(lesson_id)
    members = get_group_members(lesson["group_id"])
    return {m["student_id"] for m in members}


def create_lesson(data: dict) -> dict:
    required = ["group_id", "lesson_title", "lesson_date"]
    for field in required:
        if field not in data:
            raise APIError(f"{field} is required", 422)

    db = get_supabase_admin()
    payload = {
        "group_id": data["group_id"],
        "lesson_title": data["lesson_title"],
        "lesson_date": data["lesson_date"],
        "notes": data.get("notes"),
    }
    if data.get("lesson_time"):
        payload["lesson_time"] = data["lesson_time"]

    result = db.table("lessons").insert(payload).execute()
    lesson = result.data[0]

    time_label = f" saat {data['lesson_time']}" if data.get("lesson_time") else ""
    from services.notification_service import notify_group_students
    notify_group_students(
        data["group_id"],
        "LESSON_CREATED",
        "Yeni ders",
        f'"{data["lesson_title"]}" dersi eklendi{time_label}.',
    )
    return lesson


def list_lessons(group_id: str | None = None) -> list:
    db = get_supabase_admin()
    query = db.table("lessons").select("*")
    if group_id:
        query = query.eq("group_id", group_id)
    result = query.order("lesson_date", desc=True).execute()
    return result.data or []


def get_lesson(lesson_id: str) -> dict:
    db = get_supabase_admin()
    result = db.table("lessons").select("*").eq("id", lesson_id).maybe_single().execute()
    lesson = get_data(result)
    if not lesson:
        raise APIError("Lesson not found", 404)
    return lesson


def update_lesson(lesson_id: str, data: dict) -> dict:
    allowed = {"lesson_title", "lesson_date", "lesson_time", "notes", "group_id"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    db = get_supabase_admin()
    result = db.table("lessons").update(update_data).eq("id", lesson_id).execute()
    if not result.data:
        raise APIError("Lesson not found", 404)
    return result.data[0]


def get_student_lessons(student_id: str) -> list:
    groups = get_student_groups(student_id)
    group_ids = [g["group_id"] for g in groups]
    if not group_ids:
        return []

    db = get_supabase_admin()
    result = db.table("lessons").select("*").in_("group_id", group_ids).order("lesson_date", desc=True).execute()
    return result.data or []


def mark_attendance(lesson_id: str, records: list) -> list:
    get_lesson(lesson_id)
    if not records:
        raise APIError("Attendance records required", 422)

    valid_statuses = {"present", "absent", "late", "excused"}
    allowed_students = _lesson_group_student_ids(lesson_id)
    db = get_supabase_admin()
    results = []

    for record in records:
        student_id = record.get("student_id")
        status = record.get("status")
        if not student_id or status not in valid_statuses:
            raise APIError("Each record needs student_id and valid status", 422)
        if student_id not in allowed_students:
            raise APIError("Öğrenci bu dersin grubunda değil", 422)

        existing = (
            db.table("attendance")
            .select("lesson_id")
            .eq("lesson_id", lesson_id)
            .eq("student_id", student_id)
            .maybe_single()
            .execute()
        )

        if get_data(existing):
            res = (
                db.table("attendance")
                .update({"status": status})
                .eq("lesson_id", lesson_id)
                .eq("student_id", student_id)
                .execute()
            )
        else:
            res = db.table("attendance").insert(
                {"lesson_id": lesson_id, "student_id": student_id, "status": status}
            ).execute()

        if res.data:
            results.append(res.data[0])

        from services.point_service import grant_attendance_points
        grant_attendance_points(student_id, lesson_id, status)

    from utils.events import log_event
    for record in records:
        log_event("ATTENDANCE_MARKED", record["student_id"], {"lesson_id": lesson_id, "status": record["status"]})

    return results


def get_lesson_attendance(lesson_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("attendance")
        .select("*, profiles(id, full_name, username)")
        .eq("lesson_id", lesson_id)
        .execute()
    )
    return result.data or []


def get_student_attendance(student_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("attendance")
        .select("*, lessons(id, lesson_title, lesson_date, lesson_time)")
        .eq("student_id", student_id)
        .order("lesson_id")
        .execute()
    )
    return result.data or []


def set_lesson_scores(lesson_id: str, scores: list) -> list:
    get_lesson(lesson_id)
    if not scores:
        raise APIError("Scores required", 422)

    db = get_supabase_admin()
    results = []
    allowed_students = _lesson_group_student_ids(lesson_id)

    for entry in scores:
        student_id = entry.get("student_id")
        score = entry.get("score")
        note = entry.get("note")

        if not student_id or score is None:
            raise APIError("Each entry needs student_id and score", 422)
        if student_id not in allowed_students:
            raise APIError("Öğrenci bu dersin grubunda değil", 422)
        if not (1 <= int(score) <= 12):
            raise APIError("Score must be between 1 and 12", 422)

        existing = (
            db.table("lesson_scores")
            .select("lesson_id")
            .eq("lesson_id", lesson_id)
            .eq("student_id", student_id)
            .maybe_single()
            .execute()
        )

        payload = {"lesson_id": lesson_id, "student_id": student_id, "score": score, "note": note}
        if get_data(existing):
            res = (
                db.table("lesson_scores")
                .update({"score": score, "note": note})
                .eq("lesson_id", lesson_id)
                .eq("student_id", student_id)
                .execute()
            )
        else:
            res = db.table("lesson_scores").insert(payload).execute()

        if res.data:
            results.append(res.data[0])

        from services.point_service import grant_lesson_score_points
        grant_lesson_score_points(student_id, lesson_id, int(score))

    return results


def get_lesson_scores(lesson_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("lesson_scores")
        .select("*, profiles(id, full_name, username)")
        .eq("lesson_id", lesson_id)
        .execute()
    )
    return result.data or []


def get_student_scores(student_id: str) -> list:
    db = get_supabase_admin()
    result = (
        db.table("lesson_scores")
        .select("*, lessons(id, lesson_title, lesson_date, lesson_time)")
        .eq("student_id", student_id)
        .execute()
    )
    return result.data or []
