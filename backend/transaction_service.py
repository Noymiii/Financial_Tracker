"""
CEIS Transaction Service — CRUD operations for transactions.
Bridges the database layer with the financial engine.
"""

from datetime import date, datetime, timedelta
from typing import List

from backend.database import get_supabase_client
from backend.models import (
    TransactionCreate,
    TransactionResponse,
    TransactionRecord,
)
from backend.financial_engine import (
    calculate_burn_rate,
    calculate_runway,
    categorize_runway,
    get_period_boundaries,
    calculate_free_to_spend,
)
from backend import fixed_cost_service


def create_transaction(
    user_id: str,
    data: TransactionCreate,
) -> dict:
    """Insert a new transaction for the authenticated user."""
    client = get_supabase_client()
    print(f"DEBUG: Creating transaction for user {user_id}: {data}")
    try:
        result = (
            client.table("transactions")
            .insert({
                "user_id": user_id,
                "amount": data.amount,
                "category": data.category,
                "description": data.description,
                "transaction_type": data.transaction_type,
                "transaction_date": data.transaction_date.isoformat(),
            })
            .execute()
        )
        print("DEBUG: Transaction created successfully")
        
        # Check for Spending Spike
        # We do this asynchronously or just let it run here since it's simple logic
        try:
            check_spending_spike(user_id, data.amount)
        except Exception as spike_err:
             print(f"DEBUG: Spike check failed: {spike_err}")

        return result.data[0]
    except Exception as e:
        print(f"DEBUG: Transaction creation failed: {e}")
        # If foreign key violation, try to create user
        if 'foreign key constraint' in str(e).lower() or '23503' in str(e):
             print("DEBUG: Attempting to create missing user record...")
             try:
                 client.table("users").insert({"id": user_id}).execute()
                 print("DEBUG: Created missing user record. Retrying transaction...")
                 # Retry transaction
                 result = (
                    client.table("transactions")
                    .insert({
                        "user_id": user_id,
                        "amount": data.amount,
                        "category": data.category,
                        "description": data.description,
                        "transaction_type": data.transaction_type,
                        "transaction_date": data.transaction_date.isoformat(),
                    })
                    .execute()
                )
                 return result.data[0]
             except Exception as inner_e:
                 print(f"DEBUG: User creation failed: {inner_e}")
                 raise e
        raise e


def get_transactions(
    user_id: str,
    limit: int = 50,
) -> List[dict]:
    """Fetch recent transactions for a user, newest first."""
    client = get_supabase_client()
    result = (
        client.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("transaction_date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


def delete_transaction(
    user_id: str,
    transaction_id: str,
) -> bool:
    """Delete a transaction by ID, scoped to the user."""
    client = get_supabase_client()
    result = (
        client.table("transactions")
        .delete()
        .eq("id", transaction_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0


def update_transaction(
    user_id: str,
    transaction_id: str,
    data: "TransactionUpdate",
) -> dict | None:
    """Update a transaction by ID."""
    client = get_supabase_client()
    updates = data.model_dump(exclude_none=True)
    if not updates:
        return None

    # Fix date serialization
    if "transaction_date" in updates:
        updates["transaction_date"] = updates["transaction_date"].isoformat()

    result = (
        client.table("transactions")
        .update(updates)
        .eq("id", transaction_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else None


def check_spending_spike(user_id: str, amount: float):
    """
    Check if the transaction amount is significantly higher than the daily burn rate.
    If so, trigger an alert (currently just logs/print, but could send Telegram msg).
    """
    from backend.user_service import get_user_alert_settings
    from backend.telegram_bot import send_telegram_alert # We will need to implement this
    
    settings = get_user_alert_settings(user_id)
    spike_percent = settings.get("spending_spike_percent", 200)
    
    # Calculate burn rate (last 30 days)
    # We can reuse get_runway_summary logic but maybe simplified
    runway_data = get_runway_summary(user_id, days=30)
    burn_rate = runway_data.get("burn_rate", 0)
    
    if burn_rate > 0:
        percent_of_burn = (amount / burn_rate) * 100
        if percent_of_burn >= spike_percent:
            print(f"ALERT: Spending Spike Detected! {percent_of_burn:.1f}% of daily burn rate.")
            send_telegram_alert(
                user_id, 
                f"⚠️ **Spending Spike Detected!**\n"
                f"You just spent ₱{amount:,.2f}, which is {percent_of_burn:.0f}% of your daily average (₱{burn_rate:,.2f})."
            )


def get_runway_summary(
    user_id: str,
    days: int = 30,
) -> dict:
    """
    Compute the user's current runway and burn rate.

    Formula:
    - Current Balance = Initial Balance - Total Expenses
    - Runway = Current Balance / Burn Rate
    """
    from backend.user_service import get_user_balance
    
    # 1. Get Initial Balance
    initial_balance = get_user_balance(user_id)

    client = get_supabase_client()

    # 2. Get All Transactions (All time)
    transactions_result = (
        client.table("transactions")
        .select("amount, transaction_type")
        .eq("user_id", user_id)
        .execute()
    )
    
    total_spent = 0.0
    total_income = 0.0
    
    for item in transactions_result.data:
        if item["transaction_type"] == "expense":
            total_spent += item["amount"]
        elif item["transaction_type"] == "income":
            total_income += item["amount"]

    # 3. Calculate Current Balance
    # Formula: Initial + Income - Expenses
    current_balance = initial_balance + total_income - total_spent

    # 4. Get Recent Transactions for Burn Rate
    start_date, end_date = get_period_boundaries(days)
    result = (
        client.table("transactions")
        .select("amount, transaction_type, transaction_date")
        .eq("user_id", user_id)
        .gte("transaction_date", start_date.isoformat())
        .lte("transaction_date", end_date.isoformat())
        .execute()
    )

    records = [
        TransactionRecord(
            amount=row["amount"],
            transaction_type=row["transaction_type"],
            transaction_date=row["transaction_date"],
        )
        for row in result.data
    ]

    # Calculate actual active days instead of fixed 30.
    # Find the earliest expense date in the period and count
    # days from that date to today (minimum 1, capped at `days`).
    expense_dates = [
        datetime.strptime(row["transaction_date"], "%Y-%m-%d").date()
        for row in result.data
        if row["transaction_type"] == "expense"
    ]
    if expense_dates:
        earliest_expense = min(expense_dates)
        active_days = max((date.today() - earliest_expense).days + 1, 1)
        actual_days = min(active_days, days)  # cap at period window
    else:
        actual_days = days  # no expenses → burn rate will be 0 anyway

    burn_rate = calculate_burn_rate(records, actual_days)
    runway = calculate_runway(current_balance, burn_rate)
    status = categorize_runway(runway)

    # Calculate Free to Spend — smart proration using days-in-month
    from datetime import timedelta
    reserve_start = date.today()
    reserve_end = reserve_start + timedelta(days=days)
    bill_reserve = fixed_cost_service.get_period_reserve(user_id, reserve_start, reserve_end)
    period_commitments = bill_reserve["total_reserve"]
    monthly_commitments = bill_reserve["monthly_total"]
    free_to_spend = calculate_free_to_spend(current_balance, period_commitments)

    return {
        "balance": current_balance,
        "burn_rate": burn_rate,
        "runway_days": runway,
        "status": status,
        "free_to_spend": free_to_spend,
        "monthly_commitments": monthly_commitments,
        "period_commitments": period_commitments,
    }


# ── Financial Rhythm ─────────────────────────────────────────

def get_financial_rhythm(user_id: str, period: str = "monthly") -> dict:
    """
    Calculate financial rhythm (income, expense, saving) and growth
    based on the specified period ("monthly" or "weekly").
    """
    client = get_supabase_client()
    today = datetime.now().date()
    
    # Fetch user's initial balance to include in "budget"
    from backend.user_service import get_user_balance
    initial_balance = get_user_balance(user_id)
    
    # Fetch user settings
    # Fetch user settings 
    # Wait, get_user_by_telegram_id takes int. I need get_user_by_id or just query supabase directly here to avoid circular imports or issues.
    # actually user_service.get_user_by_telegram_id is for telegram.
    # Let's just fetch the user row directly here or add get_user to user_service.
    # Since I'm already in transaction_service and reusing client, let's just fetch the columns.
    
    user_settings = client.table("users").select("week_start_day, month_start_day").eq("id", user_id).single().execute()
    week_start_day = user_settings.data.get("week_start_day", "Monday")
    month_start_day = user_settings.data.get("month_start_day", 1)
    
    # Map day names to weekday integers (0=Monday, 6=Sunday)
    days_map = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6
    }
    target_weekday = days_map.get(week_start_day, 0)
    
    if period == "weekly":
        # Calculate start of current week based on user's preferred start day
        current_weekday = today.weekday()
        # Calculate days to subtract to get to the last 'target_weekday'
        # Example: Today is Wed (2), Target is Mon (0). Diff = 2. Start = Today - 2.
        # Example: Today is Mon (0), Target is Wed (2). Diff = -2 -> (0-2)%7 = 5. Start = Today - 5.
        days_diff = (current_weekday - target_weekday) % 7
        current_period_start = today - timedelta(days=days_diff)
        
        last_period_start = current_period_start - timedelta(weeks=1)
        
        # End date is 6 days after start
        end_date = current_period_start + timedelta(days=6)
        
    else:
        # Custom Monthly Start Day
        # If today is >= user's start day, then start day is in this month.
        # If today < user's start day, then start day was last month.
        
        target_day = month_start_day
        
        # Handle invalid days (e.g. 31st in Feb) - Python date will raise error, so we need safe creation
        def safe_date(year, month, day):
            # If day is too large for month, replace with last day of that month
            import calendar
            last_day_of_month = calendar.monthrange(year, month)[1]
            return date(year, month, min(day, last_day_of_month))

        if today.day >= target_day:
            current_period_start = safe_date(today.year, today.month, target_day)
        else:
            # Go back to previous month
            if today.month == 1:
                current_period_start = safe_date(today.year - 1, 12, target_day)
            else:
                current_period_start = safe_date(today.year, today.month - 1, target_day)
                
        # Last period start (month before current period)
        if current_period_start.month == 1:
            last_period_start = safe_date(current_period_start.year - 1, 12, target_day)
        else:
            last_period_start = safe_date(current_period_start.year, current_period_start.month - 1, target_day)

        # End date: One day before the NEXT cycle starts
        # Next cycle start:
        if current_period_start.month == 12:
            next_start = safe_date(current_period_start.year + 1, 1, target_day)
        else:
            next_start = safe_date(current_period_start.year, current_period_start.month + 1, target_day)
            
        end_date = next_start - timedelta(days=1)

        
    # Fetch transactions for both periods
    res = client.table("transactions")\
        .select("amount, transaction_type, transaction_date")\
        .eq("user_id", user_id)\
        .gte("transaction_date", last_period_start.isoformat())\
        .execute()
        
    txns = res.data
    
    current_income = 0.0
    current_expense = 0.0
    last_income = 0.0
    last_expense = 0.0
    
    for t in txns:
        t_date = datetime.strptime(t["transaction_date"], "%Y-%m-%d").date()
        amt = float(t["amount"])
        is_current = t_date >= current_period_start
        
        if t["transaction_type"] == "income":
            if is_current:
                current_income += amt
            else:
                last_income += amt
        elif t["transaction_type"] == "expense":
            if is_current:
                current_expense += amt
            else:
                last_expense += amt
                
    current_saving = current_income - current_expense
    last_saving = last_income - last_expense
    
    def calc_growth(current, last):
        if last == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - last) / last) * 100

    today_date = date.today()


    # Calculate Remaining Days (inclusive of today)
    days_remaining = (end_date - today_date).days + 1
    if days_remaining < 1:
        days_remaining = 1

    # Budget Logic
    # 1. Net Budget = (Income + Initial Balance) - Expense - Prorated Fixed Costs
    # We treat Initial Balance as "starting budget" for the rhythm period
    total_budget_resources = current_income + initial_balance

    # Smart bill proration using actual days-in-month and due dates
    bill_reserve = fixed_cost_service.get_period_reserve(user_id, today_date, end_date)
    period_commitments = bill_reserve["total_reserve"]

    net_budget = total_budget_resources - current_expense - period_commitments
    
    # 2. Determine Safe Spend with Schedule-Aware Weighting
    budget_status = "stable"
    daily_safe_spend = 0.0
    school_day_budget = 0.0
    free_day_budget = 0.0
    is_school_day_today = False

    # Get schedule data for weighted budget
    try:
        from backend import schedule_service
        schedule_info = schedule_service.get_school_days_in_range(
            user_id, today_date, end_date
        )
        multiplier = schedule_service.get_multiplier(user_id)
        remaining_school = schedule_info["school_days"]
        remaining_free = schedule_info["free_days"]
        is_school_day_today = schedule_info["is_today_school_day"]
    except Exception:
        remaining_school = 0
        remaining_free = days_remaining
        multiplier = 1.5

    # If we have any positive resources (Income OR Initial Balance)
    if total_budget_resources > 0:
        if net_budget < 0:
            budget_status = "deficit"
            daily_safe_spend = 0.0
        else:
            budget_status = "surplus"
            # Weighted budget split
            weighted_total = (remaining_school * multiplier) + (remaining_free * 1.0)
            if weighted_total > 0:
                free_day_budget = round(net_budget / weighted_total, 2)
                school_day_budget = round(free_day_budget * multiplier, 2)
                # Set daily_safe_spend to today's budget
                daily_safe_spend = school_day_budget if is_school_day_today else free_day_budget
            else:
                daily_safe_spend = round(net_budget / max(days_remaining, 1), 2)
                school_day_budget = daily_safe_spend
                free_day_budget = daily_safe_spend
    else:
        budget_status = "no_budget"
        daily_safe_spend = 0.0

    return {
        "income": total_budget_resources,
        "expense": current_expense,
        "saving": current_saving,
        "income_growth": calc_growth(current_income, last_income),
        "expense_growth": calc_growth(current_expense, last_expense),
        "saving_growth": calc_growth(current_saving, last_saving),
        "period": period,
        "days_remaining": days_remaining,
        "daily_safe_spend": round(daily_safe_spend, 2),
        "budget_status": budget_status,
        "school_day_budget": school_day_budget,
        "free_day_budget": free_day_budget,
        "is_school_day_today": is_school_day_today,
        "period_commitments": period_commitments,
        "bill_reserve": bill_reserve,
    }

def get_expenses_by_category(user_id: str) -> List[dict]:
    """
    Aggregate expenses by category for the authenticated user
    for the current month's budget cycle.
    Returns a list of dicts: {"category": str, "value": float, "percent": float}
    """
    client = get_supabase_client()
    
    # 1. Fetch user's month_start_day
    user_settings = client.table("users").select("month_start_day").eq("id", user_id).execute()
    month_start_day = getattr(user_settings, 'data', [{}])[0].get("month_start_day", 1) if getattr(user_settings, 'data', None) else 1
    
    # 2. Calculate the start date of the current cycle
    today = datetime.now().date()
    target_day = month_start_day
    
    def safe_date(year, month, day):
        import calendar
        last_day_of_month = calendar.monthrange(year, month)[1]
        return date(year, month, min(day, last_day_of_month))

    if today.day >= target_day:
        start_date = safe_date(today.year, today.month, target_day)
    else:
        if today.month == 1:
            start_date = safe_date(today.year - 1, 12, target_day)
        else:
            start_date = safe_date(today.year, today.month - 1, target_day)
    
    # 3. Fetch all expense transactions for the current cycle
    res = client.table("transactions")\
        .select("amount, category")\
        .eq("user_id", user_id)\
        .eq("transaction_type", "expense")\
        .gte("transaction_date", start_date.isoformat())\
        .execute()
        
    if not res.data:
        return []
        
    category_totals = {}
    total_expense = 0.0
    
    for t in res.data:
        cat = t["category"] or "Uncategorized"
        amt = float(t["amount"])
        category_totals[cat] = category_totals.get(cat, 0.0) + amt
        total_expense += amt
        
    output = []
    for cat, amount in category_totals.items():
        percent = (amount / total_expense * 100) if total_expense > 0 else 0
        output.append({
            "category": cat,
            "value": amount,
            "percent": round(percent, 1)
        })
        
    return sorted(output, key=lambda x: x["value"], reverse=True)
