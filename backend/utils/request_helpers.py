from flask import request


def parse_body_data() -> dict:
    """multipart (dosya) veya JSON/form gövdesini güvenli okur."""
    if request.files:
        return request.form.to_dict()
    if request.is_json:
        return request.get_json(silent=True) or {}
    if request.form:
        return request.form.to_dict()
    return {}
