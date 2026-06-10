import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.errors import APIError
from utils.group_fields import parse_lesson_day, parse_lesson_hour


def test_parse_lesson_day_name():
    assert parse_lesson_day("Cumartesi") == 6
    assert parse_lesson_day("pazartesi") == 1


def test_parse_lesson_day_number():
    assert parse_lesson_day("6") == 6
    assert parse_lesson_day(3) == 3


def test_parse_lesson_hour():
    assert parse_lesson_hour("14:00") == "14:00:00"
    assert parse_lesson_hour("14:30") == "14:30:00"
    assert parse_lesson_hour(14) == "14:00:00"
    assert parse_lesson_hour("14:00:00") == "14:00:00"


def test_parse_lesson_day_invalid():
    with pytest.raises(APIError):
        parse_lesson_day("InvalidDay")
