from utils.file_upload import storage_path_from_public_url


def test_storage_path_from_public_url():
    url = "https://abc.supabase.co/storage/v1/object/public/profile-images/profiles/abc123_photo.jpg"
    assert storage_path_from_public_url(url, "profile-images") == "profiles/abc123_photo.jpg"


def test_storage_path_from_public_url_with_query():
    url = "https://abc.supabase.co/storage/v1/object/public/profile-images/profiles/x.png?t=1"
    assert storage_path_from_public_url(url, "profile-images") == "profiles/x.png"


def test_storage_path_from_public_url_wrong_bucket():
    assert storage_path_from_public_url("https://x.com/other", "profile-images") is None
