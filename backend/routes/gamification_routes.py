from flask import Blueprint, jsonify, request

from services import gamification_service, point_service
from utils.security import get_current_user, require_auth, require_role

gamification_bp = Blueprint("gamification", __name__)


# --- Student endpoints ---
@gamification_bp.route("/student/points", methods=["GET"])
@require_auth
def student_points():
    user = get_current_user()
    return jsonify(point_service.get_student_points(user["id"]))


@gamification_bp.route("/student/meblahs", methods=["GET"])
@require_auth
def student_meblahs():
    user = get_current_user()
    return jsonify(gamification_service.get_student_meblahs(user["id"]))


@gamification_bp.route("/student/level", methods=["GET"])
@require_auth
def student_level():
    user = get_current_user()
    return jsonify(gamification_service.get_student_level(user["id"]))


@gamification_bp.route("/student/achievements", methods=["GET"])
@require_auth
def student_achievements():
    user = get_current_user()
    return jsonify(gamification_service.get_student_achievements(user["id"]))


# --- Admin endpoints ---
@gamification_bp.route("/admin/points/grant", methods=["POST"])
@require_role("superadmin")
def admin_grant_points():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    amount = data.get("amount")
    description = data.get("description", "Admin bonus")
    if not student_id or amount is None:
        from utils.errors import APIError
        raise APIError("student_id and amount are required", 422)
    return jsonify(point_service.admin_grant_points(student_id, int(amount), description))


@gamification_bp.route("/admin/students/<student_id>/points", methods=["GET"])
@require_role("superadmin")
def admin_student_points(student_id):
    return jsonify(point_service.get_student_points(student_id))


@gamification_bp.route("/admin/meblah-types", methods=["GET"])
@require_role("superadmin")
def list_meblah_types():
    return jsonify(gamification_service.list_meblah_types())


@gamification_bp.route("/admin/meblah-types/<meblah_id>", methods=["PUT"])
@require_role("superadmin")
def update_meblah_type(meblah_id):
    data = request.get_json() or {}
    return jsonify(gamification_service.update_meblah_type(meblah_id, data))


@gamification_bp.route("/admin/students/<student_id>/meblahs", methods=["POST"])
@require_role("superadmin")
def grant_meblah(student_id):
    data = request.get_json() or {}
    meblah_type_id = data.get("meblah_type_id")
    if not meblah_type_id:
        from utils.errors import APIError
        raise APIError("meblah_type_id is required", 422)
    return jsonify(gamification_service.grant_meblah(student_id, meblah_type_id)), 201


@gamification_bp.route("/admin/levels", methods=["GET"])
@require_role("superadmin")
def list_levels():
    return jsonify(gamification_service.list_levels())


@gamification_bp.route("/admin/levels/<level_id>", methods=["PUT"])
@require_role("superadmin")
def update_level(level_id):
    data = request.get_json() or {}
    return jsonify(gamification_service.update_level(level_id, data))


@gamification_bp.route("/admin/achievements", methods=["GET"])
@require_role("superadmin")
def list_achievements():
    return jsonify(gamification_service.list_achievements())


@gamification_bp.route("/admin/achievements", methods=["POST"])
@require_role("superadmin")
def create_achievement():
    data = request.get_json() or {}
    return jsonify(gamification_service.create_achievement(data)), 201


@gamification_bp.route("/admin/students/<student_id>/achievements", methods=["POST"])
@require_role("superadmin")
def grant_achievement(student_id):
    data = request.get_json() or {}
    achievement_id = data.get("achievement_id")
    if not achievement_id:
        from utils.errors import APIError
        raise APIError("achievement_id is required", 422)
    return jsonify(gamification_service.grant_achievement(student_id, achievement_id)), 201
