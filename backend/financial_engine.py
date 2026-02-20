"""
CEIS Financial Engine — Pure calculation logic.

ARCHITECTURAL RULE: This module must NEVER import database,
Supabase, or any I/O modules. It receives data, computes, returns.
"""

from datetime import date, timedelta
from typing import List

from backend.models import TransactionRecord


def calculate_burn_rate(
    transactions: List[TransactionRecord],
    days: int = 30,
) -> float:
    """
    Calculate the average daily expense (burn rate) over a period.

    Args:
        transactions: List of transaction records within the period.
        days: Number of days to average over (default 30).

    Returns:
        Average daily spend as a positive float. Returns 0.0 if
        no expenses exist.
    """
    if days <= 0:
        return 0.0

    total_expenses = sum(
        t.amount for t in transactions
        if t.transaction_type == "expense"
    )
    return round(abs(total_expenses) / days, 2)


def calculate_runway(balance: float, burn_rate: float) -> float:
    """
    Calculate runway: days until balance reaches zero.

    Formula: Runway = Current Balance / Daily Burn Rate

    Args:
        balance: Current available balance.
        burn_rate: Average daily expense.

    Returns:
        Number of days until broke. Returns float('inf') if
        burn_rate is zero (no spending).
    """
    if burn_rate <= 0:
        return float("inf")
    return round(balance / burn_rate, 1)


def categorize_runway(runway_days: float) -> str:
    """
    Classify the user's financial health based on runway.

    Returns:
        'critical'  — less than 7 days
        'warning'   — 7 to 14 days
        'stable'    — 14 to 30 days
        'healthy'   — more than 30 days
    """
    if runway_days < 7:
        return "critical"
    if runway_days < 14:
        return "warning"
    if runway_days < 30:
        return "stable"
    return "healthy"


def get_period_boundaries(
    days: int = 30,
    end_date: date | None = None,
) -> tuple[date, date]:
    """
    Return the (start_date, end_date) for a look-back period.

    Args:
        days: Number of days to look back.
        end_date: End of the period (defaults to today).

    Returns:
        Tuple of (start_date, end_date).
    """
    if end_date is None:
        end_date = date.today()
    start_date = end_date - timedelta(days=days)
    start_date = end_date - timedelta(days=days)
    return start_date, end_date


def calculate_free_to_spend(balance: float, monthly_commitments: float) -> float:
    """
    Calculate 'Free to Spend' (True Disposable Income).

    Formula: Current Balance - Total Monthly Fixed Costs

    Args:
        balance: Current wallet balance.
        monthly_commitments: Sum of all fixed costs (rent, subs).

    Returns:
        Float amount. Can be negative if user is over-committed.
    """
    return balance - monthly_commitments
