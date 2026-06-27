import os
from dotenv import load_dotenv

load_dotenv()

# PyCharm / `flask run` uses FLASK_RUN_PORT (default 5000), not app.py's app.run()
_default_port = os.getenv("PORT", "5001")
os.environ.setdefault("FLASK_RUN_PORT", _default_port)
os.environ.setdefault("FLASK_APP", "app")


def _normalize_cors_origin(origin: str) -> str:
    return origin.strip().strip('"').strip("'").rstrip("/")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    PORT = int(os.getenv("PORT", "5001"))

    DEFAULT_CORS_ORIGINS = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "https://zerdali-app.vercel.app"
    )

    CORS_ORIGINS = list(
        dict.fromkeys(
            _normalize_cors_origin(origin)
            for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
            if _normalize_cors_origin(origin)
        )
    )

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

    PASSWORD_RESET_REDIRECT_URL = os.getenv(
        "PASSWORD_RESET_REDIRECT_URL",
        "http://localhost:3000/reset-password",
    )

    # Point rules
    POINTS_ATTENDANCE_PRESENT = 10
    POINTS_ATTENDANCE_LATE = 5
    POINTS_LESSON_SCORE_MULTIPLIER = 5
    POINTS_HOMEWORK_SUBMIT = 20
    POINTS_HOMEWORK_SCORE_MULTIPLIER = 10

    # Homework rules
    HOMEWORK_DUE_DAYS = 7  # Ödev verildiği andan itibaren otomatik süre

    # Storage buckets
    BUCKET_PROFILE_IMAGES = "profile-images"
    BUCKET_ASSIGNMENT_FILES = "assignment-files"
    BUCKET_SUBMISSION_FILES = "submission-files"
    BUCKET_ICONS = "icons"

    # İzin verilen dosya türleri
    IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "svg", "webp", "gif"}
    DOCUMENT_EXTENSIONS = IMAGE_EXTENSIONS | {
        "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
        "txt", "csv", "zip", "rar", "odt", "odp", "ods",
    }
    # Geriye dönük uyumluluk için varsayılan (geniş) küme
    ALLOWED_EXTENSIONS = DOCUMENT_EXTENSIONS

    # Maksimum yükleme boyutu (25 MB)
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024
