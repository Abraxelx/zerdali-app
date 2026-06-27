from flask import Blueprint, jsonify, request

from services import forum_service
from utils.security import get_current_user, require_auth

forum_bp = Blueprint("forum", __name__)


@forum_bp.route("/forum/tags", methods=["GET"])
@require_auth
def list_tags():
    return jsonify(forum_service.list_tags())


@forum_bp.route("/forum/tags", methods=["POST"])
@require_auth
def create_tag():
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(forum_service.create_tag(user["id"], data)), 201


@forum_bp.route("/forum/tags/<tag_id>", methods=["PUT"])
@require_auth
def update_tag(tag_id):
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(forum_service.update_tag(tag_id, user["id"], user["role"], data))


@forum_bp.route("/forum/groups", methods=["GET"])
@require_auth
def list_forum_groups():
    user = get_current_user()
    return jsonify(forum_service.list_accessible_groups(user["id"], user["role"]))


@forum_bp.route("/forum/groups/<group_id>/topics", methods=["GET"])
@require_auth
def list_topics(group_id):
    user = get_current_user()
    return jsonify(forum_service.list_topics(group_id, user["id"], user["role"]))


@forum_bp.route("/forum/quota", methods=["GET"])
@require_auth
def topic_quota():
    user = get_current_user()
    return jsonify(forum_service.get_topic_quota(user["id"], user["role"]))


@forum_bp.route("/forum/topics/<topic_id>", methods=["GET"])
@require_auth
def get_topic(topic_id):
    user = get_current_user()
    return jsonify(forum_service.get_topic(topic_id, user["id"], user["role"]))


@forum_bp.route("/forum/topics/<topic_id>", methods=["PUT"])
@require_auth
def update_topic(topic_id):
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(forum_service.update_topic(topic_id, user["id"], user["role"], data))


@forum_bp.route("/forum/groups/<group_id>/topics", methods=["POST"])
@require_auth
def create_topic(group_id):
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(forum_service.create_topic(group_id, user["id"], user["role"], data)), 201


@forum_bp.route("/forum/topics/<topic_id>/comments", methods=["POST"])
@require_auth
def create_comment(topic_id):
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(forum_service.create_comment(topic_id, user["id"], user["role"], data)), 201


@forum_bp.route("/forum/reactions", methods=["POST"])
@require_auth
def set_reaction():
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(
        forum_service.set_reaction(
            data.get("target_type"),
            data.get("target_id"),
            user["id"],
            user["role"],
            data.get("reaction"),
        )
    )
