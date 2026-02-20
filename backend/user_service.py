"""
CEIS User Service — Telegram user management.
Handles user creation and lookup for Telegram bot users.
"""

from typing import Optional

from backend.database import get_supabase_client


def get_or_create_telegram_user(
    telegram_id: int,
    display_name: str,
) -> dict:
    """
    Find or create a user by Telegram ID.

    For Telegram users, we create a record in the users table
    with a generated UUID (not linked to Supabase Auth).
    """
    client = get_supabase_client()

    # Check if user already exists
    existing = (
        client.table("users")
        .select("*")
        .eq("telegram_id", telegram_id)
        .execute()
    )

    if existing.data:
        return existing.data[0]

    # Create new user
    result = (
        client.table("users")
        .insert({
            "telegram_id": telegram_id,
            "display_name": display_name,
            "initial_balance": 0.00,
        })
        .execute()
    )
    return result.data[0]


def get_user_by_telegram_id(
    telegram_id: int,
) -> Optional[dict]:
    """Lookup a user by their Telegram ID."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .select("*")
        .eq("telegram_id", telegram_id)
        .execute()
    )
    return result.data[0] if result.data else None


def update_balance(
    user_id: str,
    balance: float,
) -> dict:
    """Update the user's initial balance."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .update({"initial_balance": balance})
        .eq("id", user_id)
        .execute()
    )
    return result.data[0]


def get_user_balance(user_id: str) -> float:
    """Get the user's initial balance."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .select("initial_balance")
        .eq("id", user_id)
        .execute()
    )
    if result.data:
        return float(result.data[0]["initial_balance"])
    if result.data:
        return float(result.data[0]["initial_balance"])
    return 0.0


def get_user_alert_settings(user_id: str) -> dict:
    """Get the user's alert thresholds."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .select("alert_thresholds")
        .eq("id", user_id)
        .execute()
    )
    if result.data and result.data[0].get("alert_thresholds"):
        return result.data[0]["alert_thresholds"]
    return {"spending_spike_percent": 200, "low_runway_days": 7}


def update_alert_settings(user_id: str, settings: dict) -> dict:
    """Update the user's alert thresholds."""
    client = get_supabase_client()
    
    # Merge with existing
    current = get_user_alert_settings(user_id)
    current.update(settings)
    
    result = (
        client.table("users")
        .update({"alert_thresholds": current})
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}
    
    
def update_cycle_settings(user_id: str, week_start: str, month_start: int) -> dict:
    """Update the user's budget cycle preferences."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .update({
            "week_start_day": week_start,
            "month_start_day": month_start
        })
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def link_telegram_account(user_id: str, telegram_id: int) -> bool:
    """Link a Telegram ID to a User ID."""
    client = get_supabase_client()
    result = (
        client.table("users")
        .update({"telegram_id": telegram_id})
        .eq("id", user_id)
        .execute()
    )
    return len(result.data) > 0
