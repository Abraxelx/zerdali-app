import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.errors import APIError


@patch("services.point_service.get_supabase_admin")
@patch("services.point_service.log_event")
@patch("services.gamification_service.check_level_up")
@patch("services.notification_service.notify_user")
def test_grant_points_uses_transaction_type_column(mock_notify, mock_level_up, mock_log, mock_supabase):
    from services.point_service import grant_points

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db

    points_table = MagicMock()
    tx_table = MagicMock()
    mock_db.table.side_effect = lambda name: (
        points_table if name == "student_points" else tx_table if name == "point_transactions" else MagicMock()
    )

    points_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
        data={"student_id": "student-id", "total_zerdalyum": 5}
    )
    tx_table.insert.return_value.execute.return_value = MagicMock(data=[{"id": "tx-1"}])
    points_table.update.return_value.eq.return_value.execute.return_value = MagicMock()

    grant_points("student-id", 10, "ATTENDANCE", "Attendance: present", "lesson-1")

    insert_call = tx_table.insert.call_args[0][0]
    assert insert_call["transaction_type"] == "ATTENDANCE"
    assert "type" not in insert_call


def test_grant_points_zero_amount():
    from services.point_service import grant_points

    with pytest.raises(APIError) as exc:
        grant_points("student-id", 0, "TEST", "test")
    assert exc.value.status_code == 422


@patch("services.gamification_service.get_supabase_admin")
def test_effective_multiplier_no_meblahs(mock_supabase):
    from services.gamification_service import get_effective_multiplier

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    result = get_effective_multiplier("student-id")
    assert result == 1.0


@patch("services.point_service.get_supabase_admin")
def test_ensure_student_points_when_maybe_single_returns_none(mock_supabase):
    from services.point_service import get_student_points

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db

    points_table = MagicMock()
    tx_table = MagicMock()

    def table(name):
        if name == "student_points":
            return points_table
        if name == "point_transactions":
            return tx_table
        return MagicMock()

    mock_db.table.side_effect = table

    # maybe_single returns None when row is missing (Supabase SDK quirk)
    points_table.select.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = [
        None,
        MagicMock(data={"student_id": "student-id", "total_zerdalyum": 0}),
    ]
    points_table.insert.return_value.execute.return_value = MagicMock(data=[{"student_id": "student-id"}])
    tx_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[]
    )

    result = get_student_points("student-id")
    assert result["total_zerdalyum"] == 0
    assert result["recent_transactions"] == []
    points_table.insert.assert_called_once()


@patch("services.gamification_service.get_supabase_admin")
def test_effective_multiplier_highest(mock_supabase):
    from services.gamification_service import get_effective_multiplier

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {"meblah_types": {"zerdalyum_multiplier": 1.0}},
            {"meblah_types": {"zerdalyum_multiplier": 2.5}},
            {"meblah_types": {"zerdalyum_multiplier": 1.5}},
        ]
    )

    result = get_effective_multiplier("student-id")
    assert result == 2.5
