from flask import Blueprint, jsonify, request

from services import group_service
from utils.security import get_current_user, require_auth, require_role

group_bp = Blueprint("groups", __name__)


@group_bp.route("/admin/groups", methods=["POST"])
@require_role("superadmin")
def create_group():
    data = request.get_json() or {}
    return jsonify(group_service.create_group(data)), 201


@group_bp.route("/admin/groups", methods=["GET"])
@require_role("superadmin")
def list_groups():
    active_only = request.args.get("active_only", "true").lower() == "true"
    return jsonify(group_service.list_groups(active_only=active_only))


@group_bp.route("/admin/groups/<group_id>", methods=["GET"])
@require_role("superadmin")
def get_group(group_id):
    return jsonify(group_service.get_group(group_id))


@group_bp.route("/admin/groups/<group_id>", methods=["PUT"])
@require_role("superadmin")
def update_group(group_id):
    data = request.get_json() or {}
    return jsonify(group_service.update_group(group_id, data))


@group_bp.route("/admin/groups/<group_id>", methods=["DELETE"])
@require_role("superadmin")
def delete_group(group_id):
    return jsonify(group_service.delete_group(group_id))


@group_bp.route("/admin/groups/<group_id>/members", methods=["POST"])
@require_role("superadmin")
def add_member(group_id):
    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        from utils.errors import APIError
        raise APIError("student_id is required", 422)
    return jsonify(group_service.add_member(group_id, student_id)), 201


@group_bp.route("/admin/groups/<group_id>/members/<student_id>", methods=["DELETE"])
@require_role("superadmin")
def remove_member(group_id, student_id):
    return jsonify(group_service.remove_member(group_id, student_id))


@group_bp.route("/admin/groups/<group_id>/members", methods=["GET"])
@require_role("superadmin")
def get_members(group_id):
    return jsonify(group_service.get_group_members(group_id))


@group_bp.route("/student/groups", methods=["GET"])
@require_auth
def student_groups():
    user = get_current_user()
    return jsonify(group_service.get_student_groups(user["id"]))
