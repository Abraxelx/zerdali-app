import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.notification_service import resolve_notification_href


def test_forum_comment_href_with_topic():
    href = resolve_notification_href(
        "FORUM_COMMENT",
        {"topic_id": "abc-123"},
        "student",
    )
    assert href == "/forum/abc-123"


def test_forum_comment_href_without_topic():
    href = resolve_notification_href("FORUM_COMMENT", {}, "student")
    assert href == "/forum"


def test_forum_comment_href_parent():
    href = resolve_notification_href(
        "FORUM_COMMENT",
        {"topic_id": "abc-123"},
        "veli",
    )
    assert href == "/parent/forum/abc-123"
