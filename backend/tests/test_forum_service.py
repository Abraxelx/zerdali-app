import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.errors import APIError


def test_istanbul_day_bounds():
    from services.forum_service import istanbul_day_bounds

    start, end = istanbul_day_bounds()
    assert start < end
    assert "+03:00" in start or start.endswith("00:00:00")


@patch("services.forum_service.get_supabase_admin")
def test_student_topics_today_count(mock_supabase):
    from services.forum_service import student_topics_today_count

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    chain = mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.lt.return_value
    chain.execute.return_value = MagicMock(count=1)

    assert student_topics_today_count("student-1") == 1


@patch("services.forum_service.assert_group_access")
@patch("services.forum_service.student_topics_today_count", return_value=1)
def test_create_topic_student_daily_limit(mock_count, mock_access):
    from services.forum_service import create_topic

    with pytest.raises(APIError) as exc:
        create_topic("group-1", "student-1", "student", {"title": "Test", "body": "Body"})
    assert exc.value.status_code == 429


@patch("services.forum_service.get_group")
@patch("services.forum_service.get_supabase_admin")
@patch("services.forum_service.assert_group_access")
@patch("services.forum_service.student_topics_today_count", return_value=0)
@patch("services.forum_service._resolve_topic_tag", return_value="tag-1")
def test_create_topic_admin_unlimited(mock_tag, mock_count, mock_access, mock_supabase, mock_get_group):
    from services.forum_service import create_topic

    mock_get_group.return_value = {"id": "group-1", "group_name": "A Sınıfı"}
    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "t1", "group_id": "group-1", "author_id": "admin-1", "title": "T", "body": "B", "tag_id": "tag-1"}]
    )
    mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[{"id": "admin-1", "full_name": "Admin", "username": "admin", "role": "superadmin"}]
    )

    result = create_topic(
        "group-1",
        "admin-1",
        "superadmin",
        {"title": "Konu", "body": "Metin", "tag_label": "Genel"},
    )
    assert result["id"] == "t1"
    mock_count.assert_not_called()


@patch("services.forum_service.get_student_groups")
def test_assert_group_access_student_denied(mock_groups):
    from services.forum_service import assert_group_access

    mock_groups.return_value = [{"group_id": "other-group"}]
    with pytest.raises(APIError) as exc:
        assert_group_access("student-1", "student", "group-1")
    assert exc.value.status_code == 403


@patch("services.forum_service.get_student_groups")
def test_assert_group_access_student_int_group_id(mock_groups):
    from services.forum_service import assert_group_access

    mock_groups.return_value = [{"group_id": 42}]
    assert_group_access("student-1", "student", "42")


@patch("services.forum_service.get_group")
@patch("services.forum_service.get_student_groups")
def test_list_accessible_groups_fallback_without_embed(mock_groups, mock_get_group):
    from services.forum_service import list_accessible_groups

    mock_groups.return_value = [{"group_id": 7, "student_groups": None}]
    mock_get_group.return_value = {"id": 7, "group_name": "Zerdali"}
    groups = list_accessible_groups("student-1", "student")
    assert len(groups) == 1
    assert groups[0]["group_name"] == "Zerdali"
    mock_get_group.assert_called_once_with(7)


@patch("services.forum_service.get_group")
def test_assert_group_access_admin(mock_get_group):
    from services.forum_service import assert_group_access

    mock_get_group.return_value = {"id": "group-1"}
    assert_group_access("admin-1", "superadmin", "group-1")
    mock_get_group.assert_called_once_with("group-1")


def test_get_topic_quota_student():
    from services.forum_service import get_topic_quota

    with patch("services.forum_service.student_topics_today_count", return_value=0):
        q = get_topic_quota("s1", "student")
        assert q["can_create"] is True
        assert q["remaining_today"] == 1

    with patch("services.forum_service.student_topics_today_count", return_value=1):
        q = get_topic_quota("s1", "student")
        assert q["can_create"] is False
        assert q["remaining_today"] == 0


def test_get_topic_quota_admin():
    from services.forum_service import get_topic_quota

    q = get_topic_quota("a1", "superadmin")
    assert q["can_create"] is True
    assert q["remaining_today"] is None


def test_can_edit_topic():
    from services.forum_service import _can_edit_topic

    assert _can_edit_topic({"author_id": "u1"}, "u1", "student") is True
    assert _can_edit_topic({"author_id": "u1"}, "u2", "student") is False
    assert _can_edit_topic({"author_id": "u1"}, "u2", "superadmin") is True


@patch("services.forum_service.get_supabase_admin")
def test_get_or_create_tag_reuses_existing(mock_supabase):
    from services.forum_service import get_or_create_tag

    mock_db = MagicMock()
    mock_supabase.return_value = mock_db
    mock_db.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=[{"id": "tag-1", "label": "Genel", "created_by": None}]
    )

    tag = get_or_create_tag("genel", "user-1")
    assert tag["id"] == "tag-1"
    mock_db.table.return_value.insert.assert_not_called()


@patch("services.notification_service.notify_user")
def test_notify_forum_comment_notifies_author(mock_notify):
    from services.forum_service import _notify_forum_comment

    topic = {"id": "topic-1", "author_id": "author-1", "title": "Test konusu"}
    _notify_forum_comment(topic, "commenter-1", set(), {"full_name": "Ali"})
    mock_notify.assert_called_once_with(
        "author-1",
        "FORUM_COMMENT",
        "Forum yorumu",
        'Ali "Test konusu" konusuna yorum yaptı.',
        data={"topic_id": "topic-1"},
    )


@patch("services.notification_service.notify_user")
def test_notify_forum_comment_skips_self(mock_notify):
    from services.forum_service import _notify_forum_comment

    topic = {"id": "topic-1", "author_id": "user-1", "title": "Test"}
    _notify_forum_comment(topic, "user-1", {"user-2"}, {"full_name": "Ayşe"})
    mock_notify.assert_called_once_with(
        "user-2",
        "FORUM_COMMENT",
        "Forum yorumu",
        'Ayşe "Test" konusuna yorum yaptı.',
        data={"topic_id": "topic-1"},
    )


@patch("services.notification_service.notify_user")
def test_notify_forum_reaction_like(mock_notify):
    from services.forum_service import _notify_forum_reaction

    _notify_forum_reaction("owner-1", {"full_name": "Ali"}, "like", "topic", "topic-1", "Test konusu")
    mock_notify.assert_called_once_with(
        "owner-1",
        "FORUM_LIKE",
        "Forum beğenisi",
        'Ali "Test konusu" konusunu beğendi.',
        data={"topic_id": "topic-1", "reaction": "like"},
    )


@patch("services.notification_service.notify_user")
def test_notify_forum_reaction_dislike_comment(mock_notify):
    from services.forum_service import _notify_forum_reaction

    _notify_forum_reaction("owner-1", {"full_name": "Ayşe"}, "dislike", "comment", "topic-2", "Başlık")
    mock_notify.assert_called_once_with(
        "owner-1",
        "FORUM_DISLIKE",
        "Forum beğenmemesi",
        'Ayşe "Başlık" yorumunu beğenmedi.',
        data={"topic_id": "topic-2", "reaction": "dislike"},
    )
