from functools import wraps

import jwt
from flask import g, request

from config import Config
from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin, get_supabase_anon


def _decode_jwt_legacy(token: str) -> dict:
    """Legacy HS256 verification using SUPABASE_JWT_SECRET."""
    if not Config.SUPABASE_JWT_SECRET:
        raise APIError("JWT secret not configured", 500)
    try:
        return jwt.decode(
            token,
            Config.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise APIError("Token expired", 401)
    except jwt.InvalidTokenError:
        raise APIError("Invalid token", 401)


def decode_jwt(token: str) -> dict:
    """
    Verify Supabase access token.
    Primary: Supabase Auth API (works with new JWT signing keys + legacy).
    Fallback: local HS256 with JWT secret.
    """
    try:
        anon = get_supabase_anon()
        response = anon.auth.get_user(token)
        if response and response.user:
            return {"sub": response.user.id}
    except APIError:
        raise
    except Exception:
        pass

    return _decode_jwt_legacy(token)


def get_bearer_token() -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def get_current_user():
    if hasattr(g, "current_user"):
        return g.current_user
    return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == "OPTIONS":
            return f(*args, **kwargs)
        token = get_bearer_token()
        if not token:
            raise APIError("Authorization required", 401)

        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            raise APIError("Invalid token payload", 401)

        db = get_supabase_admin()
        result = db.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        profile = get_data(result)
        if not profile:
            raise APIError("Profile not found", 404)

        g.current_user = profile
        g.token = token
        return f(*args, **kwargs)

    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user = get_current_user()
            if user.get("role") not in roles:
                raise APIError("Forbidden", 403)
            return f(*args, **kwargs)

        return decorated

    return decorator
