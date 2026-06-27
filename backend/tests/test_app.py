import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["service"] == "zerdali-api"


def test_cors_preflight_notification_read(client):
    response = client.options(
        "/notifications/test-id/read",
        headers={
            "Origin": "https://zerdali-app.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") == "https://zerdali-app.vercel.app"
    assert "POST" in (response.headers.get("Access-Control-Allow-Methods") or "")


def test_cors_on_unauthorized(client):
    response = client.get(
        "/auth/me",
        headers={"Origin": "https://zerdali-app.vercel.app"},
    )
    assert response.status_code == 401
    assert response.headers.get("Access-Control-Allow-Origin") == "https://zerdali-app.vercel.app"


def test_register_missing_fields(client):
    response = client.post("/auth/register", json={"email": "test@test.com"})
    assert response.status_code == 422


def test_login_missing_fields(client):
    response = client.post("/auth/login", json={})
    assert response.status_code == 422


def test_me_unauthorized(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_admin_groups_unauthorized(client):
    response = client.get("/admin/groups")
    assert response.status_code == 401


def test_admin_login_logs_unauthorized(client):
    response = client.get("/admin/login-logs")
    assert response.status_code == 401


def test_student_leaderboard_unauthorized(client):
    response = client.get("/student/leaderboard")
    assert response.status_code == 401


def test_student_teachers_unauthorized(client):
    response = client.get("/student/teachers")
    assert response.status_code == 401


def test_parent_children_unauthorized(client):
    response = client.get("/parent/children")
    assert response.status_code == 401


def test_presence_online_unauthorized(client):
    response = client.get("/presence/online")
    assert response.status_code == 401


def test_presence_heartbeat_unauthorized(client):
    response = client.post("/presence/heartbeat")
    assert response.status_code == 401


def test_forum_unauthorized(client):
    response = client.get("/forum/groups")
    assert response.status_code == 401


def test_game_2048_unauthorized(client):
    response = client.get("/games/2048/stats")
    assert response.status_code == 401


def test_forgot_password_missing_email(client):
    response = client.post("/auth/forgot-password", json={})
    assert response.status_code == 422


def test_forgot_password_ok(client):
    response = client.post("/auth/forgot-password", json={"email": "test@example.com"})
    assert response.status_code == 200
    assert "message" in response.get_json()
