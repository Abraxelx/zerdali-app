import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.cors_helpers import is_origin_allowed


def test_is_origin_allowed_localhost():
    assert is_origin_allowed("http://localhost:3000") is True


def test_is_origin_allowed_production():
    assert is_origin_allowed("https://zerdali-app.vercel.app") is True


def test_is_origin_allowed_trailing_slash():
    assert is_origin_allowed("https://zerdali-app.vercel.app/") is True


def test_is_origin_allowed_vercel_preview():
    assert is_origin_allowed("https://zerdali-app-git-main.vercel.app") is True


def test_is_origin_allowed_unknown():
    assert is_origin_allowed("https://evil.example.com") is False
