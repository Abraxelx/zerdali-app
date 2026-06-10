from utils.db_helpers import get_data


def test_get_data_none():
    assert get_data(None) is None


def test_get_data_with_data():
    class Response:
        data = {"id": "1"}

    assert get_data(Response()) == {"id": "1"}


def test_get_data_empty():
    class Response:
        data = None

    assert get_data(Response()) is None
