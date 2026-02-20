"""
CEIS Snapshot Service — CRUD for financial_snapshots table.
Stores daily balance, burn rate, and runway calculations.
"""

from datetime import date
from typing import List, Optional

from backend.database import get_supabase_client


def save_snapshot(
    user_id: str,
    balance: float,
    burn_rate: float,
    runway_days: float,
) -> dict:
    """
    Upsert a daily financial snapshot.

    Uses the UNIQUE(user_id, snapshot_date) constraint to
    update if a snapshot already exists for today.
    """
    client = get_supabase_client()
    today = date.today().isoformat()

    result = (
        client.table("financial_snapshots")
        .upsert(
            {
                "user_id": user_id,
                "balance": balance,
                "burn_rate": burn_rate,
                "runway_days": runway_days,
                "snapshot_date": today,
            },
            on_conflict="user_id,snapshot_date",
        )
        .execute()
    )
    return result.data[0]


def get_latest_snapshot(
    user_id: str,
) -> Optional[dict]:
    """Retrieve the most recent snapshot for a user."""
    client = get_supabase_client()
    result = (
        client.table("financial_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("snapshot_date", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_snapshot_history(
    user_id: str,
    days: int = 30,
) -> List[dict]:
    """
    Retrieve snapshot history for trending.

    Returns snapshots ordered by date ascending
    so they can be plotted chronologically.
    """
    client = get_supabase_client()
    from datetime import timedelta

    start_date = (date.today() - timedelta(days=days)).isoformat()

    result = (
        client.table("financial_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .gte("snapshot_date", start_date)
        .order("snapshot_date", desc=False)
        .execute()
    )
    return result.data
