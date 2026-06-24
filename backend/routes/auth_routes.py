from flask import Blueprint, jsonify, request

from services import auth_service
from utils.request_helpers import get_client_ip, get_user_agent
from utils.security import get_current_user, require_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    result = auth_service.register(
        email=data.get("email"),
        password=data.get("password"),
        full_name=data.get("full_name"),
        username=data.get("username"),
    )
    return jsonify(result), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    result = auth_service.login(
        email=data.get("email"),
        password=data.get("password"),
        ip_address=get_client_ip(),
        user_agent=get_user_agent(),
    )
    return jsonify(result)


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    return jsonify(auth_service.forgot_password(data.get("email")))


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user = get_current_user()
    auth_service.track_session(user["id"], get_client_ip(), get_user_agent())
    return jsonify(user)
