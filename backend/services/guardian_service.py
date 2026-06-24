from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

PROFILE_SELECT = "id, email, full_name, username, role, profile_photo_url, bio"


def _get_profile(user_id: str) -> dict | None:
    db = get_supabase_admin()
    result = db.table("profiles").select(PROFILE_SELECT).eq("id", user_id).maybe_single().execute()
    return get_data(result)


def assert_guardian_access(guardian_id: str, student_id: str) -> None:
    db = get_supabase_admin()
    row = (
        db.table("student_guardians")
        .select("guardian_id")
        .eq("guardian_id", guardian_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    if not get_data(row):
        raise APIError("Bu öğrenciye erişim yetkin yok", 403)


def list_students_for_guardian(guardian_id: str) -> list:
    db = get_supabase_admin()
    links = (
        db.table("student_guardians")
        .select("student_id, created_at")
        .eq("guardian_id", guardian_id)
        .execute()
    )
    rows = links.data or []
    if not rows:
        return []

    student_ids = [r["student_id"] for r in rows]
    profiles = db.table("profiles").select(PROFILE_SELECT).in_("id", student_ids).execute()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    return [
        {
            "student_id": r["student_id"],
            "linked_at": r.get("created_at"),
            "profile": profile_map.get(r["student_id"]),
        }
        for r in rows
        if profile_map.get(r["student_id"])
    ]


def list_guardians_for_student(student_id: str) -> list:
    db = get_supabase_admin()
    links = (
        db.table("student_guardians")
        .select("guardian_id, created_at")
        .eq("student_id", student_id)
        .execute()
    )
    rows = links.data or []
    if not rows:
        return []

    guardian_ids = [r["guardian_id"] for r in rows]
    profiles = db.table("profiles").select(PROFILE_SELECT).in_("id", guardian_ids).execute()
    profile_map = {p["id"]: p for p in (profiles.data or [])}

    return [
        {
            "guardian_id": r["guardian_id"],
            "linked_at": r.get("created_at"),
            "profile": profile_map.get(r["guardian_id"]),
        }
        for r in rows
        if profile_map.get(r["guardian_id"])
    ]


def guardian_student_ids(guardian_id: str) -> list[str]:
    db = get_supabase_admin()
    result = db.table("student_guardians").select("student_id").eq("guardian_id", guardian_id).execute()
    return [r["student_id"] for r in (result.data or [])]


def add_guardian(student_id: str, guardian_id: str) -> dict:
    student = _get_profile(student_id)
    guardian = _get_profile(guardian_id)
    if not student or not guardian:
        raise APIError("Kullanıcı bulunamadı", 404)
    if student.get("role") != "student":
        raise APIError("Hedef kullanıcı öğrenci olmalı", 422)
    if guardian.get("role") != "veli":
        raise APIError("Veli olarak atanacak kullanıcının rolü veli olmalı", 422)
    if student_id == guardian_id:
        raise APIError("Öğrenci ve veli aynı kişi olamaz", 422)

    db = get_supabase_admin()
    existing = (
        db.table("student_guardians")
        .select("guardian_id")
        .eq("guardian_id", guardian_id)
        .eq("student_id", student_id)
        .maybe_single()
        .execute()
    )
    if get_data(existing):
        raise APIError("Bu veli zaten atanmış", 409)

    db.table("student_guardians").insert({"guardian_id": guardian_id, "student_id": student_id}).execute()
    return {"message": "Veli atandı", "guardian_id": guardian_id, "student_id": student_id}


def remove_guardian(student_id: str, guardian_id: str) -> dict:
    db = get_supabase_admin()
    result = (
        db.table("student_guardians")
        .delete()
        .eq("guardian_id", guardian_id)
        .eq("student_id", student_id)
        .execute()
    )
    if not result.data:
        raise APIError("Veli bağlantısı bulunamadı", 404)
    return {"message": "Veli bağlantısı kaldırıldı"}
