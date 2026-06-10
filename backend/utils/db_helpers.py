def get_data(response):
    """Safely read .data from Supabase execute() — maybe_single() may return None."""
    if response is None:
        return None
    return getattr(response, "data", None)


def maybe_single_row(query):
    """Run maybe_single().execute() and return the row dict, or None if missing."""
    return get_data(query.maybe_single().execute())
