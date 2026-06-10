from flask import Blueprint, jsonify, request

from services import lesson_service
from utils.security import get_current_user, require_auth, require_role

lesson_bp = Blueprint("lessons", __name__)


@lesson_bp.route("/admin/lessons", methods=["POST"])
@require_role("superadmin")
def create_lesson():
    data = request.get_json() or {}
    return jsonify(lesson_service.create_lesson(data)), 201


@lesson_bp.route("/admin/lessons", methods=["GET"])
@require_role("superadmin")
def list_lessons():
    group_id = request.args.get("group_id")
    return jsonify(lesson_service.list_lessons(group_id))


@lesson_bp.route("/admin/lessons/<lesson_id>", methods=["GET"])
@require_role("superadmin")
def get_lesson(lesson_id):
    return jsonify(lesson_service.get_lesson(lesson_id))


@lesson_bp.route("/admin/lessons/<lesson_id>", methods=["PUT"])
@require_role("superadmin")
def update_lesson(lesson_id):
    data = request.get_json() or {}
    return jsonify(lesson_service.update_lesson(lesson_id, data))


@lesson_bp.route("/student/lessons", methods=["GET"])
@require_auth
def student_lessons():
    user = get_current_user()
    return jsonify(lesson_service.get_student_lessons(user["id"]))


@lesson_bp.route("/admin/lessons/<lesson_id>/attendance", methods=["POST"])
@require_role("superadmin")
def mark_attendance(lesson_id):
    data = request.get_json() or {}
    records = data.get("records", [])
    return jsonify(lesson_service.mark_attendance(lesson_id, records))


@lesson_bp.route("/admin/lessons/<lesson_id>/attendance", methods=["GET"])
@require_role("superadmin")
def get_attendance(lesson_id):
    return jsonify(lesson_service.get_lesson_attendance(lesson_id))


@lesson_bp.route("/student/attendance", methods=["GET"])
@require_auth
def student_attendance():
    user = get_current_user()
    return jsonify(lesson_service.get_student_attendance(user["id"]))


@lesson_bp.route("/admin/lessons/<lesson_id>/scores", methods=["POST"])
@require_role("superadmin")
def set_scores(lesson_id):
    data = request.get_json() or {}
    scores = data.get("scores", [])
    return jsonify(lesson_service.set_lesson_scores(lesson_id, scores))


@lesson_bp.route("/admin/lessons/<lesson_id>/scores", methods=["GET"])
@require_role("superadmin")
def get_scores(lesson_id):
    return jsonify(lesson_service.get_lesson_scores(lesson_id))


@lesson_bp.route("/student/scores", methods=["GET"])
@require_auth
def student_scores():
    user = get_current_user()
    return jsonify(lesson_service.get_student_scores(user["id"]))
