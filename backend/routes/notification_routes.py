from flask import Blueprint, jsonify, request

from services import notification_service
from utils.security import get_current_user, require_auth

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("/notifications", methods=["GET"])
@require_auth
def list_notifications():
    user = get_current_user()
    unread_only = request.args.get("unread") == "1"
    return jsonify(notification_service.get_notifications(user["id"], user.get("role", "student"), unread_only))


@notification_bp.route("/notifications/<notification_id>/read", methods=["POST"])
@require_auth
def read_notification(notification_id):
    user = get_current_user()
    return jsonify(notification_service.mark_read(notification_id, user["id"]))


@notification_bp.route("/notifications/read-all", methods=["POST"])
@require_auth
def read_all():
    user = get_current_user()
    return jsonify(notification_service.mark_all_read(user["id"]))
