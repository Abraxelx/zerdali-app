import logging

from config import Config
from services import activity_service, presence_service
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin, get_supabase_anon

logger = logging.getLogger(__name__)


def register(email: str, password: str, full_name: str, username: str) -> dict:
    if not all([email, password, full_name, username]):
        raise APIError("email, password, full_name and username are required", 422)

    anon = get_supabase_anon()
    try:
        auth_res = anon.auth.sign_up(
            {"email": email, "password": password, "options": {"data": {"full_name": full_name, "username": username}}}
        )
    except Exception as e:
        raise APIError(str(e), 400)

    if not auth_res.user:
        raise APIError("Registration failed", 400)

    user_id = auth_res.user.id
    db = get_supabase_admin()

    existing = db.table("profiles").select("id").eq("id", user_id).maybe_single().execute()
    if not get_data(existing):
        db.table("profiles").insert(
            {"id": user_id, "email": email, "full_name": full_name, "username": username, "role": "student"}
        ).execute()

    if auth_res.session:
        activity_service.record_login(user_id)
        presence_service.touch_presence(user_id)

    return {
        "user_id": user_id,
        "email": email,
        "access_token": auth_res.session.access_token if auth_res.session else None,
        "refresh_token": auth_res.session.refresh_token if auth_res.session else None,
    }


def login(
    email: str,
    password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict:
    if not email or not password:
        raise APIError("email and password are required", 422)

    anon = get_supabase_anon()
    try:
        auth_res = anon.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as e:
        raise APIError(str(e), 401)

    if not auth_res.session:
        raise APIError("Login failed", 401)

    activity_service.record_login(auth_res.user.id, ip_address, user_agent)
    presence_service.touch_presence(auth_res.user.id)

    return {
        "access_token": auth_res.session.access_token,
        "refresh_token": auth_res.session.refresh_token,
        "user_id": auth_res.user.id,
    }


def track_session(user_id: str, ip_address: str | None = None, user_agent: str | None = None) -> None:
    activity_service.record_session_if_needed(user_id, ip_address, user_agent)


def forgot_password(email: str) -> dict:
    if not email:
        raise APIError("email is required", 422)

    anon = get_supabase_anon()
    redirect_to = Config.PASSWORD_RESET_REDIRECT_URL

    try:
        anon.auth.reset_password_for_email(email, {"redirect_to": redirect_to})
    except Exception as e:
        err = str(e).lower()
        logger.warning("forgot_password failed for %s: %s", email, e)

        if "rate limit" in err:
            raise APIError(
                "E-posta gönderim limiti aşıldı (Supabase saatlik kotası). "
                "Yaklaşık 1 saat bekleyip tekrar dene veya Supabase panelinden "
                "Authentication → Users → kullanıcı → Send password recovery kullan.",
                429,
            )
        if "redirect" in err or "invalid" in err and "url" in err:
            raise APIError(
                f"Yönlendirme URL'si Supabase'de tanımlı değil. "
                f"Redirect URLs listesine şunu ekle: {redirect_to}",
                400,
            )
        # Kayıtlı olmayan e-posta için bilgi sızdırma — genel mesaj

    return {
        "message": "Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Gelen kutusu ve spam klasörünü kontrol et.",
    }


def get_profile(user_id: str) -> dict:
    db = get_supabase_admin()
    result = db.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    profile = get_data(result)
    if not profile:
        raise APIError("Profile not found", 404)
    return profile


def update_profile(user_id: str, data: dict) -> dict:
    allowed = {"full_name", "username", "bio", "profile_photo_url"}
    update_data = {k: v for k, v in data.items() if k in allowed and v is not None}
    if not update_data:
        raise APIError("No valid fields to update", 422)

    db = get_supabase_admin()
    result = db.table("profiles").update(update_data).eq("id", user_id).execute()
    if not result.data:
        raise APIError("Profile not found", 404)
    return result.data[0]


def get_public_teachers() -> list:
    db = get_supabase_admin()
    result = (
        db.table("profiles")
        .select("id, full_name, username, bio, profile_photo_url, role")
        .eq("role", "superadmin")
        .order("full_name")
        .execute()
    )
    return result.data or []
