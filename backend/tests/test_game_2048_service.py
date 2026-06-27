import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.errors import APIError


def test_istanbul_week_key_format():
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from services.game_2048_service import istanbul_week_key

    key = istanbul_week_key(datetime(2026, 6, 27, 12, 0, tzinfo=ZoneInfo("Europe/Istanbul")))
    assert key.startswith("2026-W")


def test_validate_finish_payload_rejects_bad_tile():
    from services.game_2048_service import _validate_finish_payload

    with pytest.raises(APIError) as exc:
        _validate_finish_payload(score=100, max_tile=1000, moves=50, duration_sec=120)
    assert exc.value.status_code == 422


def test_validate_finish_payload_accepts_valid():
    from services.game_2048_service import _validate_finish_payload

    _validate_finish_payload(score=5000, max_tile=1024, moves=200, duration_sec=300)


def test_start_run_requires_student():
    from services.game_2048_service import start_run

    with pytest.raises(APIError) as exc:
        start_run("user-1", "veli")
    assert exc.value.status_code == 403


@patch("services.game_2048_service.get_supabase_admin")
def test_start_run_allows_admin(mock_supabase):
    from services.game_2048_service import start_run

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[]
    )
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "run-1",
                "student_id": "admin-1",
                "week_key": "2026-W26",
                "score": 0,
                "max_tile": 0,
                "moves": 0,
                "duration_sec": 0,
                "status": "active",
                "started_at": "2026-06-27T10:00:00+03:00",
                "finished_at": None,
            }
        ]
    )

    result = start_run("admin-1", "superadmin")
    assert result["id"] == "run-1"


@patch("services.game_2048_service.get_supabase_admin")
def test_finish_run_updates_row(mock_supabase):
    from services.game_2048_service import finish_run

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data={
            "id": "run-1",
            "student_id": "s1",
            "week_key": "2026-W26",
            "status": "active",
            "score": 0,
            "max_tile": 0,
            "moves": 0,
            "duration_sec": 0,
            "started_at": "2026-06-27T10:00:00+03:00",
        }
    )
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "run-1",
                "student_id": "s1",
                "week_key": "2026-W26",
                "status": "finished",
                "score": 2048,
                "max_tile": 512,
                "moves": 120,
                "duration_sec": 90,
                "started_at": "2026-06-27T10:00:00+03:00",
                "finished_at": "2026-06-27T10:02:00+03:00",
            }
        ]
    )

    result = finish_run(
        "run-1",
        "s1",
        "student",
        {"score": 2048, "max_tile": 512, "moves": 120, "duration_sec": 90},
    )
    assert result["status"] == "finished"
    assert result["max_tile"] == 512
