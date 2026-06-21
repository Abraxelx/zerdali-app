from flask import Blueprint, jsonify, request

from services import assignment_service
from utils.request_helpers import parse_body_data
from utils.security import get_current_user, require_auth, require_role

assignment_bp = Blueprint("assignments", __name__)


@assignment_bp.route("/admin/assignments", methods=["POST"])
@require_role("superadmin")
def create_assignment():
    data = parse_body_data()
    file = request.files.get("file")
    return jsonify(assignment_service.create_assignment(data, file)), 201


@assignment_bp.route("/admin/assignments", methods=["GET"])
@require_role("superadmin")
def list_assignments():
    lesson_id = request.args.get("lesson_id")
    return jsonify(assignment_service.list_assignments(lesson_id))


@assignment_bp.route("/admin/assignments/<assignment_id>", methods=["GET"])
@require_role("superadmin")
def get_assignment(assignment_id):
    return jsonify(assignment_service.get_assignment(assignment_id))


@assignment_bp.route("/student/assignments", methods=["GET"])
@require_auth
def student_assignments():
    user = get_current_user()
    return jsonify(assignment_service.get_student_assignments(user["id"]))


@assignment_bp.route("/student/assignments/<assignment_id>", methods=["GET"])
@require_auth
def student_assignment_detail(assignment_id):
    return jsonify(assignment_service.get_assignment(assignment_id))


@assignment_bp.route("/student/assignments/<assignment_id>/submit", methods=["POST"])
@require_auth
def submit_assignment(assignment_id):
    user = get_current_user()
    data = parse_body_data()
    file = request.files.get("file")
    return jsonify(assignment_service.submit_assignment(assignment_id, user["id"], data, file)), 201


@assignment_bp.route("/admin/assignments/<assignment_id>/submissions", methods=["GET"])
@require_role("superadmin")
def get_submissions(assignment_id):
    return jsonify(assignment_service.get_submissions(assignment_id))


@assignment_bp.route("/admin/submissions/pending", methods=["GET"])
@require_role("superadmin")
def pending_submissions():
    return jsonify(assignment_service.get_pending_submissions())


@assignment_bp.route("/admin/submissions/<submission_id>/review", methods=["POST"])
@require_role("superadmin")
def review_submission(submission_id):
    data = request.get_json() or {}
    return jsonify(
        assignment_service.review_submission(
            submission_id,
            data.get("action"),
            data.get("score"),
            data.get("feedback"),
        )
    )
