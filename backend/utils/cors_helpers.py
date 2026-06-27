from config import Config

CORS_ALLOW_HEADERS = "Content-Type, Authorization"
CORS_ALLOW_METHODS = "GET, POST, PUT, DELETE, OPTIONS"


def normalize_origin(origin: str | None) -> str | None:
    if not origin:
        return None
    return origin.strip().rstrip("/")


def is_origin_allowed(origin: str | None) -> bool:
    normalized = normalize_origin(origin)
    if not normalized:
        return False

    allowed = {normalize_origin(o) for o in Config.CORS_ORIGINS if normalize_origin(o)}
    if normalized in allowed:
        return True

    # Vercel preview deploy'ları: production origin vercel.app ise hepsine izin ver
    if normalized.endswith(".vercel.app") and any(
        (o or "").endswith(".vercel.app") for o in allowed
    ):
        return True

    return False


def apply_cors_headers(response, origin: str | None):
    normalized = normalize_origin(origin)
    if not normalized or not is_origin_allowed(normalized):
        return response
    response.headers["Access-Control-Allow-Origin"] = normalized
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = CORS_ALLOW_HEADERS
    response.headers["Access-Control-Allow-Methods"] = CORS_ALLOW_METHODS
    response.headers["Vary"] = "Origin"
    return response
