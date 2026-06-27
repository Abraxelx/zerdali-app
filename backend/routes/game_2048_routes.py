from flask import Blueprint, jsonify, request

from services import game_2048_service
from services.game_2048_settings import get_settings, update_settings
from utils.security import get_current_user, require_auth, require_role

game_2048_bp = Blueprint("game_2048", __name__)


@game_2048_bp.route("/games/2048/stats", methods=["GET"])
@require_auth
def game_stats():
    user = get_current_user()
    return jsonify(game_2048_service.get_my_stats(user["id"], user.get("role", "student")))


@game_2048_bp.route("/games/2048/quota", methods=["GET"])
@require_auth
def game_quota():
    user = get_current_user()
    return jsonify(game_2048_service.get_quota(user["id"], user.get("role", "student")))


@game_2048_bp.route("/games/2048/leaderboard", methods=["GET"])
@require_auth
def game_leaderboard():
    user = get_current_user()
    return jsonify(game_2048_service.get_weekly_leaderboard(user["id"], user.get("role", "student")))


@game_2048_bp.route("/games/2048/leaderboard/class", methods=["GET"])
@require_auth
def class_leaderboard():
    user = get_current_user()
    return jsonify(game_2048_service.get_class_leaderboards(user["id"], user.get("role", "student")))


@game_2048_bp.route("/games/2048/start", methods=["POST"])
@require_auth
def start_game():
    user = get_current_user()
    return jsonify(game_2048_service.start_run(user["id"], user.get("role", "student"))), 201


@game_2048_bp.route("/games/2048/runs/<run_id>/finish", methods=["POST"])
@require_auth
def finish_game(run_id):
    user = get_current_user()
    data = request.get_json() or {}
    return jsonify(game_2048_service.finish_run(run_id, user["id"], user.get("role", "student"), data))


@game_2048_bp.route("/games/2048/runs/<run_id>/abandon", methods=["POST"])
@require_auth
def abandon_game(run_id):
    user = get_current_user()
    return jsonify(game_2048_service.abandon_run(run_id, user["id"], user.get("role", "student")))


@game_2048_bp.route("/admin/games/2048/settings", methods=["GET"])
@require_role("superadmin")
def admin_get_settings():
    return jsonify(get_settings())


@game_2048_bp.route("/admin/games/2048/settings", methods=["PUT"])
@require_role("superadmin")
def admin_update_settings():
    data = request.get_json() or {}
    return jsonify(update_settings(data))


@game_2048_bp.route("/admin/games/2048/distribute", methods=["POST"])
@require_role("superadmin")
def admin_distribute_rewards():
    data = request.get_json() or {}
    week_key = data.get("week_key") or request.args.get("week_key")
    force = bool(data.get("force"))
    return jsonify(game_2048_service.distribute_weekly_rewards(week_key, force))


@game_2048_bp.route("/admin/games/2048/rewards", methods=["GET"])
@require_role("superadmin")
def admin_list_rewards():
    week_key = request.args.get("week_key")
    limit = request.args.get("limit", 100, type=int)
    return jsonify(game_2048_service.list_weekly_rewards(week_key, limit))
