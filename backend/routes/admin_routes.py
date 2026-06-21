from flask import Blueprint, jsonify, request

from config import Config
from services import auth_service, gamification_service
from utils.file_upload import upload_file
from utils.security import get_current_user, require_auth, require_role

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin/users", methods=["GET"])
@require_role("superadmin")
def list_users():
    role = request.args.get("role")
    return jsonify(gamification_service.list_users(role))


@admin_bp.route("/admin/users/<user_id>/role", methods=["PUT"])
@require_role("superadmin")
def update_user_role(user_id):
    data = request.get_json() or {}
    role = data.get("role")
    if not role:
        from utils.errors import APIError
        raise APIError("role is required", 422)
    return jsonify(gamification_service.update_user_role(user_id, role))


@admin_bp.route("/admin/users/<user_id>", methods=["PUT"])
@require_role("superadmin")
def update_user(user_id):
    data = request.get_json() or {}
    return jsonify(gamification_service.update_user(user_id, data))


@admin_bp.route("/student/profile", methods=["PUT"])
@require_auth
def update_profile():
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(auth_service.update_profile(user["id"], data))


@admin_bp.route("/upload/profile", methods=["POST"])
@require_auth
def upload_profile():
    user = get_current_user()
    file = request.files.get("file")
    if not file:
        from utils.errors import APIError
        raise APIError("file is required", 422)
    url = upload_file(file, Config.BUCKET_PROFILE_IMAGES, "profiles", Config.IMAGE_EXTENSIONS)
    profile = auth_service.update_profile(user["id"], {"profile_photo_url": url})
    return jsonify({"url": url, "profile": profile})


@admin_bp.route("/upload/icon", methods=["POST"])
@require_role("superadmin")
def upload_icon():
    file = request.files.get("file")
    if not file:
        from utils.errors import APIError
        raise APIError("file is required", 422)
    url = upload_file(file, Config.BUCKET_ICONS, "icons", Config.IMAGE_EXTENSIONS)
    return jsonify({"url": url})
