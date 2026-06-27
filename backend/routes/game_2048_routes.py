from flask import Blueprint, jsonify, request

from services import game_2048_service
from utils.security import get_current_user, require_auth

game_2048_bp = Blueprint("game_2048", __name__)


@game_2048_bp.route("/games/2048/stats", methods=["GET"])
@require_auth
def game_stats():
    user = get_current_user()
    return jsonify(game_2048_service.get_my_stats(user["id"], user.get("role", "student")))


@game_2048_bp.route("/games/2048/leaderboard", methods=["GET"])
@require_auth
def game_leaderboard():
    user = get_current_user()
    return jsonify(game_2048_service.get_weekly_leaderboard(user["id"], user.get("role", "student")))


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
