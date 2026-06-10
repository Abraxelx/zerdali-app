from functools import lru_cache

from supabase import Client, create_client

from config import Config


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Service role client — bypasses RLS for server-side operations."""
    if not Config.SUPABASE_URL or not Config.SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)


@lru_cache(maxsize=1)
def get_supabase_anon() -> Client:
    """Anon client — used for auth sign-in/sign-up."""
    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)
