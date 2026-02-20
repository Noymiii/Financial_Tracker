"""
CEIS Schedule Service — CRUD for student class schedules.
"""

from typing import List
from backend.database import get_supabase_client

ALL_DAYS = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]


def get_schedule(user_id: str) -> List[dict]:
    """Return the user's 7-day class schedule.

    If no rows exist yet, returns a default schedule
    (Mon-Fri = class, Sat-Sun = free).
    """
    client = get_supabase_client()
    result = (
        client.table("class_schedules")
        .select("day_of_week, has_class")
        .eq("user_id", user_id)
        .execute()
    )

    if result.data:
        existing = {r["day_of_week"]: r["has_class"] for r in result.data}
        return [
            {"day_of_week": d, "has_class": existing.get(d, d not in ("Saturday", "Sunday"))}
            for d in ALL_DAYS
        ]

    # Default: weekdays are class days
    return [
        {"day_of_week": d, "has_class": d not in ("Saturday", "Sunday")}
        for d in ALL_DAYS
    ]


def upsert_schedule(user_id: str, days: List[dict]) -> List[dict]:
    """Save the full 7-day schedule (upsert).

    Args:
        days: List of {"day_of_week": str, "has_class": bool}
    """
    client = get_supabase_client()

    rows = [
        {
            "user_id": user_id,
            "day_of_week": d["day_of_week"],
            "has_class": d["has_class"],
        }
        for d in days
        if d["day_of_week"] in ALL_DAYS
    ]

    result = (
        client.table("class_schedules")
        .upsert(rows, on_conflict="user_id,day_of_week")
        .execute()
    )
    return result.data


def get_school_days_in_range(
    user_id: str,
    start_date,
    end_date,
) -> dict:
    """Count school days and free days between two dates.

    Returns:
        {
            "school_days": int,
            "free_days": int,
            "is_today_school_day": bool,
        }
    """
    from datetime import date, timedelta

    schedule = get_schedule(user_id)
    schedule_map = {d["day_of_week"]: d["has_class"] for d in schedule}

    today = date.today()
    day_names = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday",
    ]

    school_days = 0
    free_days = 0
    current = start_date

    while current <= end_date:
        day_name = day_names[current.weekday()]
        if schedule_map.get(day_name, False):
            school_days += 1
        else:
            free_days += 1
        current += timedelta(days=1)

    today_day_name = day_names[today.weekday()]
    is_today_school_day = schedule_map.get(today_day_name, False)

    return {
        "school_days": school_days,
        "free_days": free_days,
        "is_today_school_day": is_today_school_day,
    }


def get_multiplier(user_id: str) -> float:
    """Get the user's school-day spending multiplier."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .select("school_day_multiplier")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return float(result.data.get("school_day_multiplier", 1.5) or 1.5)
