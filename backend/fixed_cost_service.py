"""
Service for managing fixed costs (subscriptions, rent, bills)
and bill payment tracking with confirmation & rollover.
"""

from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from backend.database import get_supabase_client
from backend.models import FixedCost, FixedCostCreate, BillPayment


def get_user_fixed_costs(user_id: UUID) -> List[FixedCost]:
    """Retrieve all fixed costs for a user."""
    client = get_supabase_client()
    res = client.table("fixed_costs").select("*").eq("user_id", str(user_id)).execute()
    return [FixedCost(**item) for item in res.data]


def create_fixed_cost(user_id: UUID, data: FixedCostCreate) -> FixedCost:
    """Create a new fixed cost."""
    client = get_supabase_client()
    payload = data.model_dump(exclude_none=True)
    payload["user_id"] = str(user_id)

    res = client.table("fixed_costs").insert(payload).execute()
    return FixedCost(**res.data[0])


def delete_fixed_cost(user_id: UUID, cost_id: UUID) -> bool:
    """Delete a fixed cost."""
    client = get_supabase_client()
    res = (
        client.table("fixed_costs")
        .delete()
        .eq("id", str(cost_id))
        .eq("user_id", str(user_id))
        .execute()
    )
    return len(res.data) > 0


def get_total_monthly_commitments(user_id: UUID) -> float:
    """Calculate total value of all monthly fixed costs."""
    costs = get_user_fixed_costs(user_id)
    return sum(cost.amount for cost in costs)


# ── Bill Payment Tracking ───────────────────────────────────


def _next_due_date(cost: FixedCost, after: date) -> date:
    """Calculate the next due date for a fixed cost on or after `after`."""
    import calendar

    if cost.frequency == "weekly":
        # due_day_of_week: 1=Mon..7=Sun → Python: 0=Mon..6=Sun
        target_wd = (cost.due_day_of_week or 1) - 1
        days_ahead = (target_wd - after.weekday()) % 7
        if days_ahead == 0:
            return after
        return after + timedelta(days=days_ahead)
    else:
        # Monthly
        days_in_month = calendar.monthrange(after.year, after.month)[1]
        due_day = min(cost.due_day_of_month, days_in_month)
        candidate = date(after.year, after.month, due_day)
        if candidate < after:
            # Move to next month
            if after.month == 12:
                nm, ny = 1, after.year + 1
            else:
                nm, ny = after.month + 1, after.year
            days_in_nm = calendar.monthrange(ny, nm)[1]
            candidate = date(ny, nm, min(cost.due_day_of_month, days_in_nm))
        return candidate


def ensure_pending_bills(user_id: UUID) -> None:
    """
    Auto-create pending bill_payments rows for any bills
    that are due within the next 7 days and don't have a
    record yet. This is called on dashboard load.
    """
    client = get_supabase_client()
    costs = get_user_fixed_costs(user_id)
    today = date.today()
    lookahead = today + timedelta(days=7)

    for cost in costs:
        due = _next_due_date(cost, today)
        if due > lookahead:
            continue

        # Check if a record already exists for this due date
        existing = (
            client.table("bill_payments")
            .select("id")
            .eq("fixed_cost_id", str(cost.id))
            .eq("due_date", due.isoformat())
            .execute()
        )
        if existing.data:
            continue

        # Create pending record
        client.table("bill_payments").insert({
            "user_id": str(user_id),
            "fixed_cost_id": str(cost.id),
            "due_date": due.isoformat(),
            "status": "pending",
        }).execute()


def get_pending_bills(user_id: UUID) -> List[dict]:
    """
    Return pending bills that need user confirmation.
    Includes the fixed cost name and amount for display.
    """
    ensure_pending_bills(user_id)

    client = get_supabase_client()
    res = (
        client.table("bill_payments")
        .select("*, fixed_costs(name, amount, frequency)")
        .eq("user_id", str(user_id))
        .eq("status", "pending")
        .order("due_date")
        .execute()
    )

    bills = []
    today = date.today()
    for row in res.data:
        fc = row.get("fixed_costs", {}) or {}
        due = datetime.strptime(row["due_date"], "%Y-%m-%d").date()
        bills.append({
            "id": row["id"],
            "fixed_cost_id": row["fixed_cost_id"],
            "name": fc.get("name", "Unknown"),
            "amount": fc.get("amount", 0),
            "frequency": fc.get("frequency", "monthly"),
            "due_date": row["due_date"],
            "days_until_due": max((due - today).days, 0),
            "is_overdue": due < today,
        })
    return bills


def confirm_bill_payment(
    user_id: UUID, bill_payment_id: UUID, status: str
) -> dict:
    """
    Mark a bill payment as 'paid' or 'skipped'.
    If skipped, create a new pending entry for the next cycle.
    """
    client = get_supabase_client()

    # Update the record
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.utcnow().isoformat()

    res = (
        client.table("bill_payments")
        .update(update_data)
        .eq("id", str(bill_payment_id))
        .eq("user_id", str(user_id))
        .execute()
    )

    if not res.data:
        return {"error": "Bill payment not found"}

    row = res.data[0]

    # If skipped, create a rollover entry for the next cycle
    if status == "skipped":
        _create_rollover(user_id, row)

    return row


def _create_rollover(user_id: UUID, bill_row: dict) -> None:
    """Create a new pending bill for the next cycle after a skip."""
    client = get_supabase_client()
    fixed_cost_id = bill_row["fixed_cost_id"]

    # Fetch the fixed cost to determine frequency
    fc_res = (
        client.table("fixed_costs")
        .select("*")
        .eq("id", fixed_cost_id)
        .single()
        .execute()
    )
    if not fc_res.data:
        return

    cost = FixedCost(**fc_res.data)
    current_due = datetime.strptime(
        bill_row["due_date"], "%Y-%m-%d"
    ).date()

    # Next due date is after the current one
    next_due = _next_due_date(cost, current_due + timedelta(days=1))

    # Create the rollover pending entry
    try:
        client.table("bill_payments").insert({
            "user_id": str(user_id),
            "fixed_cost_id": fixed_cost_id,
            "due_date": next_due.isoformat(),
            "status": "pending",
        }).execute()
    except Exception as e:
        # Unique constraint violation = already exists, that's fine
        print(f"DEBUG: Rollover entry already exists or error: {e}")


# ── Period Reserve (updated for weekly frequency) ───────────


def get_period_reserve(user_id: UUID, period_start, period_end) -> dict:
    """Calculate bill reserve for a specific budget period.

    Uses actual days-in-month for accurate proration.
    Supports both monthly and weekly bill frequencies.

    Returns:
        {
            "total_reserve": float,
            "monthly_total": float,
            "bills": [
                {
                    "name": str,
                    "amount": float,
                    "reserve": float,
                    "due_day": int,
                    "frequency": str,
                    "is_due_this_period": bool,
                    "days_until_due": int,
                }
            ],
        }
    """
    import calendar

    costs = get_user_fixed_costs(user_id)
    today = date.today()

    days_in_month = calendar.monthrange(today.year, today.month)[1]
    period_days = (period_end - period_start).days + 1

    total_reserve = 0.0
    monthly_total = 0.0
    bills = []

    for cost in costs:
        if cost.frequency == "weekly":
            # Weekly bill: amount per week → daily = amount / 7
            daily_rate = cost.amount / 7
            reserve = round(daily_rate * period_days, 2)
            monthly_equivalent = cost.amount * 4.33  # ~4.33 weeks/month
            monthly_total += monthly_equivalent
        else:
            # Monthly bill
            daily_rate = cost.amount / days_in_month
            reserve = round(daily_rate * period_days, 2)
            monthly_total += cost.amount

        total_reserve += reserve

        # Calculate next due date
        due_date = _next_due_date(cost, today)
        is_due = period_start <= due_date <= period_end
        days_until = (due_date - today).days

        bills.append({
            "name": cost.name,
            "amount": cost.amount,
            "reserve": reserve,
            "due_day": cost.due_day_of_month,
            "frequency": cost.frequency,
            "is_due_this_period": is_due,
            "days_until_due": max(days_until, 0),
        })

    return {
        "total_reserve": round(total_reserve, 2),
        "monthly_total": round(monthly_total, 2),
        "bills": bills,
    }
