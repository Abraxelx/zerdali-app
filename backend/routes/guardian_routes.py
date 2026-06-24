from flask import Blueprint, jsonify, request

from services import assignment_service, gamification_service, guardian_service, lesson_service, point_service
from utils.errors import APIError
from utils.security import get_current_user, require_auth, require_role

guardian_bp = Blueprint("guardian", __name__)


def _require_veli(user: dict) -> None:
    if user.get("role") != "veli":
        raise APIError("Only guardians can access this endpoint", 403)


def _guardian_student_access(guardian_id: str, student_id: str) -> None:
    guardian_service.assert_guardian_access(guardian_id, student_id)


@guardian_bp.route("/parent/children", methods=["GET"])
@require_auth
def parent_children():
    user = get_current_user()
    _require_veli(user)
    return jsonify(guardian_service.list_students_for_guardian(user["id"]))


@guardian_bp.route("/parent/students/<student_id>/overview", methods=["GET"])
@require_auth
def parent_student_overview(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(gamification_service.get_student_overview(student_id))


@guardian_bp.route("/parent/students/<student_id>/points", methods=["GET"])
@require_auth
def parent_student_points(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(point_service.get_student_points(student_id))


@guardian_bp.route("/parent/students/<student_id>/level", methods=["GET"])
@require_auth
def parent_student_level(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(gamification_service.get_student_level(student_id))


@guardian_bp.route("/parent/students/<student_id>/leaderboard", methods=["GET"])
@require_auth
def parent_student_leaderboard(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(gamification_service.get_student_class_leaderboards(student_id))


@guardian_bp.route("/parent/students/<student_id>/assignments", methods=["GET"])
@require_auth
def parent_student_assignments(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(assignment_service.get_student_assignments(student_id))


@guardian_bp.route("/parent/students/<student_id>/scores", methods=["GET"])
@require_auth
def parent_student_scores(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(lesson_service.get_student_scores(student_id))


@guardian_bp.route("/parent/students/<student_id>/attendance", methods=["GET"])
@require_auth
def parent_student_attendance(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(lesson_service.get_student_attendance(student_id))


@guardian_bp.route("/parent/students/<student_id>/lessons", methods=["GET"])
@require_auth
def parent_student_lessons(student_id):
    user = get_current_user()
    _require_veli(user)
    _guardian_student_access(user["id"], student_id)
    return jsonify(lesson_service.get_student_lessons(student_id))


@guardian_bp.route("/admin/students/<student_id>/guardians", methods=["GET"])
@require_role("superadmin")
def admin_list_guardians(student_id):
    return jsonify(guardian_service.list_guardians_for_student(student_id))


@guardian_bp.route("/admin/students/<student_id>/guardians", methods=["POST"])
@require_role("superadmin")
def admin_add_guardian(student_id):
    data = request.get_json() or {}
    guardian_id = data.get("guardian_id")
    if not guardian_id:
        raise APIError("guardian_id is required", 422)
    return jsonify(guardian_service.add_guardian(student_id, guardian_id)), 201


@guardian_bp.route("/admin/students/<student_id>/guardians/<guardian_id>", methods=["DELETE"])
@require_role("superadmin")
def admin_remove_guardian(student_id, guardian_id):
    return jsonify(guardian_service.remove_guardian(student_id, guardian_id))
