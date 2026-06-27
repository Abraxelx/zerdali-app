from utils.db_helpers import get_data
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

DEFAULT_SETTINGS = {
    "enabled": True,
    "weekly_play_limit": 5,
    "participation_min_tile": 512,
    "participation_zerdalyum": 5,
    "rank1_zerdalyum": 50,
    "rank2_zerdalyum": 30,
    "rank3_zerdalyum": 20,
    "rank4_10_zerdalyum": 10,
    "rank1_meblah_type_id": None,
}

SETTINGS_FIELDS = frozenset(DEFAULT_SETTINGS.keys())


def serialize_settings(row: dict | None) -> dict:
    base = dict(DEFAULT_SETTINGS)
    if not row:
        return base
    for key in SETTINGS_FIELDS:
        if key in row and row[key] is not None:
            base[key] = row[key]
    return base


def get_settings() -> dict:
    db = get_supabase_admin()
    try:
        row = db.table("game_2048_settings").select("*").eq("id", 1).maybe_single().execute()
        return serialize_settings(get_data(row))
    except Exception:
        return dict(DEFAULT_SETTINGS)


def update_settings(data: dict) -> dict:
    payload = {}
    for key in SETTINGS_FIELDS:
        if key not in data:
            continue
        value = data[key]
        if key == "enabled":
            payload[key] = bool(value)
        elif key == "rank1_meblah_type_id":
            payload[key] = value or None
        elif key in SETTINGS_FIELDS:
            amount = int(value)
            if amount < 0:
                raise APIError(f"{key} negatif olamaz", 422)
            payload[key] = amount

    if not payload:
        raise APIError("Güncellenecek alan yok", 422)

    db = get_supabase_admin()
    try:
        result = db.table("game_2048_settings").update(payload).eq("id", 1).execute()
        if result.data:
            return serialize_settings(result.data[0])
    except Exception as exc:
        raise APIError(f"Ayarlar güncellenemedi: {exc}", 500) from exc

    insert_row = {"id": 1, **DEFAULT_SETTINGS, **payload}
    result = db.table("game_2048_settings").upsert(insert_row).execute()
    if not result.data:
        raise APIError("Ayarlar kaydedilemedi", 500)
    return serialize_settings(result.data[0])
