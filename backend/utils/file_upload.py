import logging
import uuid
from urllib.parse import unquote

from werkzeug.utils import secure_filename

from config import Config
from utils.errors import APIError
from utils.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)


def allowed_file(filename: str, allowed: set | None = None) -> bool:
    allowed = allowed or Config.ALLOWED_EXTENSIONS
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed


def upload_file(file, bucket: str, folder: str = "", allowed: set | None = None) -> str:
    allowed = allowed or Config.ALLOWED_EXTENSIONS
    if not file or not file.filename:
        raise APIError("No file provided", 400)
    if not allowed_file(file.filename, allowed):
        raise APIError(
            f"Dosya türüne izin verilmiyor. İzinli türler: {', '.join(sorted(allowed))}",
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


def storage_path_from_public_url(url: str, bucket: str) -> str | None:
    """Supabase public URL'den bucket içi dosya yolunu çıkarır."""
    if not url:
        return None
    marker = f"/object/public/{bucket}/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return unquote(url[idx + len(marker) :].split("?")[0])


def delete_file(bucket: str, path: str) -> None:
    if not path:
        return
    db = get_supabase_admin()
    db.storage.from_(bucket).remove([path])


def delete_file_by_url(public_url: str, bucket: str) -> None:
    """Public URL ile storage dosyasını siler; hata olursa sessizce loglar."""
    path = storage_path_from_public_url(public_url, bucket)
    if not path:
        return
    try:
        delete_file(bucket, path)
    except Exception as e:
        logger.warning("Storage dosyası silinemedi bucket=%s path=%s: %s", bucket, path, e)
