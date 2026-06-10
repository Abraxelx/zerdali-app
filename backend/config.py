import os
from dotenv import load_dotenv

load_dotenv()

# PyCharm / `flask run` uses FLASK_RUN_PORT (default 5000), not app.py's app.run()
_default_port = os.getenv("PORT", "5001")
os.environ.setdefault("FLASK_RUN_PORT", _default_port)
os.environ.setdefault("FLASK_APP", "app")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    PORT = int(os.getenv("PORT", "5001"))

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]

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

    # Storage buckets
    BUCKET_PROFILE_IMAGES = "profile-images"
    BUCKET_ASSIGNMENT_FILES = "assignment-files"
    BUCKET_SUBMISSION_FILES = "submission-files"
    BUCKET_ICONS = "icons"

    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "svg", "txt"}
