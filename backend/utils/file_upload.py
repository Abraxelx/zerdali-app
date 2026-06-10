import uuid
from werkzeug.utils import secure_filename

from config import Config
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS


def upload_file(file, bucket: str, folder: str = "") -> str:
    if not file or not file.filename:
        raise APIError("No file provided", 400)
    if not allowed_file(file.filename):
        raise APIError(
            f"File type not allowed. Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}",
            422,
        )

    ext = file.filename.rsplit(".", 1)[1].lower()
    safe_name = secure_filename(file.filename.rsplit(".", 1)[0])
    path = f"{folder}/{uuid.uuid4().hex}_{safe_name}.{ext}" if folder else f"{uuid.uuid4().hex}_{safe_name}.{ext}"

    db = get_supabase_admin()
    content = file.read()
    db.storage.from_(bucket).upload(path, content, {"content-type": file.content_type or "application/octet-stream"})

    public_url = db.storage.from_(bucket).get_public_url(path)
    return public_url


def delete_file(bucket: str, path: str):
    db = get_supabase_admin()
    db.storage.from_(bucket).remove([path])
