from utils.errors import APIError

# PostgreSQL DOW: 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
DAY_NAMES: dict[str, int] = {
    "pazar": 0,
    "pazartesi": 1,
    "salı": 2,
    "sali": 2,
    "çarşamba": 3,
    "carsamba": 3,
    "perşembe": 4,
    "persembe": 4,
    "cuma": 5,
    "cumartesi": 6,
}

DAY_LABELS: dict[int, str] = {
    0: "Pazar",
    1: "Pazartesi",
    2: "Salı",
    3: "Çarşamba",
    4: "Perşembe",
    5: "Cuma",
    6: "Cumartesi",
}


def parse_lesson_day(value) -> int:
    if isinstance(value, bool):
        raise APIError("lesson_day must be a day number (0-6) or day name", 422)
    if isinstance(value, int):
        if 0 <= value <= 6:
            return value
        raise APIError("lesson_day must be between 0 and 6", 422)
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.isdigit():
            day = int(stripped)
            if 0 <= day <= 6:
                return day
        key = stripped.lower()
        if key in DAY_NAMES:
            return DAY_NAMES[key]
    raise APIError(
        "lesson_day must be 0-6 or a day name (Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar)",
        422,
    )


def parse_lesson_hour(value) -> str:
    """DB stores lesson_hour as PostgreSQL TIME — returns HH:MM:SS."""
    if isinstance(value, bool):
        raise APIError("lesson_hour must be a valid time (e.g. 14:00)", 422)

    if isinstance(value, int):
        if 0 <= value <= 23:
            return f"{value:02d}:00:00"
        raise APIError("lesson_hour must be between 0 and 23", 422)

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise APIError("lesson_hour is required", 422)

        # Already HH:MM:SS
        parts = stripped.split(":")
        if len(parts) == 3 and all(p.isdigit() for p in parts):
            hour, minute, second = int(parts[0]), int(parts[1]), int(parts[2])
            if 0 <= hour <= 23 and 0 <= minute <= 59 and 0 <= second <= 59:
                return f"{hour:02d}:{minute:02d}:{second:02d}"

        # HH:MM (from HTML time input)
        if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
            hour, minute = int(parts[0]), int(parts[1])
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}:00"

        # Plain hour number as string
        if stripped.isdigit():
            hour = int(stripped)
            if 0 <= hour <= 23:
                return f"{hour:02d}:00:00"

    raise APIError("lesson_hour must be HH:MM format (e.g. 14:00)", 422)


def format_lesson_hour(value) -> str:
    """Display time as HH:MM."""
    if isinstance(value, str) and ":" in value:
        parts = value.split(":")
        if len(parts) >= 2:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}"
    if isinstance(value, int):
        return f"{value:02d}:00"
    return str(value)


def format_lesson_day(value) -> str:
    if isinstance(value, int):
        return DAY_LABELS.get(value, str(value))
    return str(value)
