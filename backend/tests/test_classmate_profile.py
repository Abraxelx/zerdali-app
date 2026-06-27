import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.errors import APIError


@patch("services.group_service.get_student_groups")
def test_students_share_group(mock_groups):
    from services.gamification_service import students_share_group

    mock_groups.side_effect = [
        [{"group_id": "g1", "student_groups": {"id": "g1"}}],
        [{"group_id": "g1", "student_groups": {"id": "g1"}}],
    ]
    assert students_share_group("a", "b") is True

    mock_groups.side_effect = [
        [{"group_id": "g1", "student_groups": {"id": "g1"}}],
        [{"group_id": "g2", "student_groups": {"id": "g2"}}],
    ]
    assert students_share_group("a", "b") is False


@patch("services.gamification_service.students_share_group", return_value=False)
def test_get_classmate_public_profile_denies_stranger(_mock_share):
    from services.gamification_service import get_classmate_public_profile

    with pytest.raises(APIError) as exc:
        get_classmate_public_profile("viewer-1", "target-1")
    assert exc.value.status_code == 403
