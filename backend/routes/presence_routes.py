from flask import Blueprint, jsonify

from services import presence_service
from utils.security import get_current_user, require_auth

presence_bp = Blueprint("presence", __name__)


@presence_bp.route("/presence/heartbeat", methods=["POST"])
@require_auth
def heartbeat():
    user = get_current_user()
    presence_service.touch_presence(user["id"])
    return jsonify({"ok": True})


@presence_bp.route("/presence/online", methods=["GET"])
@require_auth
def online_users():
    return jsonify(presence_service.list_online_users())
