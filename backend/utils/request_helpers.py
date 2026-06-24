from flask import request


def get_client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.remote_addr


def get_user_agent() -> str | None:
    return request.headers.get("User-Agent")


def parse_body_data() -> dict:
    """multipart (dosya) veya JSON/form gövdesini güvenli okur."""
    if request.files:
        return request.form.to_dict()
    if request.is_json:
        return request.get_json(silent=True) or {}
    if request.form:
        return request.form.to_dict()
    return {}
