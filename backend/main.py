"""
CEIS — Campus Expense Intelligence System
FastAPI application entry point.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from backend.auth_service import verify_jwt
from backend.models import (
    HealthResponse,
    TransactionCreate,
    TransactionResponse,
    RunwayResponse,
    SnapshotResponse,
    UserProfile,
    UserProfileUpdate,
    Asset,
    AssetCreate,
    FinancialRhythm,
    TransactionUpdate,
    LinkTokenResponse,
    UserProfileUpdate,
    FixedCost,
    FixedCostCreate,
    BillPaymentUpdate,
    ScheduleUpdate,
)
from backend.telegram_bot import router as telegram_router
from backend import (
    transaction_service,
    snapshot_service,
    user_service,
    asset_service,
    token_store,
    fixed_cost_service,
    ai_service,
    schedule_service,
)

# ── App Setup ────────────────────────────────────────────────

app = FastAPI(
    title="CEIS API",
    description=(
        "Campus Expense Intelligence System — "
        "Financial survival for students."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telegram_router)


# ── Health Check ─────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Public health check endpoint."""
    return HealthResponse(version="0.2.0")


# ── Transaction Endpoints ────────────────────────────────────


@app.post("/api/transactions")
async def create_transaction(
    data: TransactionCreate,
    user_id: str = Depends(verify_jwt),
):
    """Create a new transaction (auth required)."""
    result = transaction_service.create_transaction(user_id, data)
    return {"status": "created", "data": result}


@app.get("/api/transactions")
async def list_transactions(
    user_id: str = Depends(verify_jwt),
    limit: int = 50,
):
    """List recent transactions (auth required)."""
    data = transaction_service.get_transactions(user_id, limit)
    return {"data": data}


@app.delete("/api/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Delete a specific transaction (auth required)."""
    result = transaction_service.delete_transaction(
        user_id, transaction_id
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    return {"status": "deleted"}


@app.put("/api/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user_id: str = Depends(verify_jwt),
):
    """Update a specific transaction (auth required)."""
    result = transaction_service.update_transaction(
        user_id, transaction_id, data
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    return {"status": "updated", "data": result}


# ── Runway Endpoint ──────────────────────────────────────────


@app.get("/api/runway", response_model=RunwayResponse)
async def get_runway(
    days: int = 30,
    user_id: str = Depends(verify_jwt),
):
    """Get current runway calculation (auth required)."""
    summary = transaction_service.get_runway_summary(
        user_id, days
    )
    messages = {
        "critical": "🚨 Emergency! Less than a week of funds left.",
        "warning": "⚠️ Caution — budget is tightening.",
        "stable": "📊 On track, but keep monitoring.",
        "healthy": "✅ Looking good — runway is comfortable!",
    }
    return RunwayResponse(
        balance=summary["balance"],
        burn_rate=summary["burn_rate"],
        runway_days=summary["runway_days"],
        status=summary["status"],
        message=messages.get(summary["status"], ""),
        free_to_spend=summary.get("free_to_spend", 0),
        monthly_commitments=summary.get("monthly_commitments", 0),
        period_commitments=summary.get("period_commitments", 0),
    )


# ── User Profile Endpoints ───────────────────────────────────


@app.get("/api/profile")
async def get_profile(user_id: str = Depends(verify_jwt)):
    """Get the authenticated user's profile (auth required)."""
    from backend.database import get_supabase_client

    client = get_supabase_client()
    result = (
        client.table("users")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return {"data": result.data[0]}


@app.put("/api/profile")
async def update_profile(
    data: UserProfileUpdate,
    user_id: str = Depends(verify_jwt),
):
    """Update user profile fields (auth required)."""
    from backend.database import get_supabase_client

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )
    client = get_supabase_client()
    
    # helper to handle specific updates if needed, but simple update works
    # If week_start_day or month_start_day are in updates, they will be updated automatically
    
    result = (
        client.table("users")
        .update(updates)
        .eq("id", user_id)
        .execute()
    )
    return {"status": "updated", "data": result.data[0]}


@app.post("/api/telegram/link", response_model=LinkTokenResponse)
async def generate_telegram_link(
    user_id: str = Depends(verify_jwt),
):
    """Generate a temporary token to link Telegram account."""
    token = token_store.generate_token(user_id)
    return {"token": token, "expires_in": 600}


@app.post("/api/settings/alerts")
async def update_alert_settings(
    thresholds: dict,
    user_id: str = Depends(verify_jwt),
):
    """Update alert thresholds."""
    result = user_service.update_alert_settings(user_id, thresholds)
    return {"status": "updated", "data": result}


@app.put("/api/balance")
async def update_balance(
    balance: float,
    user_id: str = Depends(verify_jwt),
):
    """Update user initial balance (auth required)."""
    result = user_service.update_balance(user_id, balance)
    return {"status": "updated", "data": result}


# ── Snapshot Endpoints ───────────────────────────────────────


@app.get("/api/snapshots")
async def list_snapshots(
    user_id: str = Depends(verify_jwt),
    days: int = 30,
):
    """Get snapshot history for trending (auth required)."""
    data = snapshot_service.get_snapshot_history(user_id, days)
    return {"data": data}


# ── Financial Rhythm Endpoints ───────────────────────────────


@app.get("/api/financial-rhythm")
async def get_financial_rhythm(
    period: str = "monthly",
    user_id: str = Depends(verify_jwt),
):
    """Get financial rhythm for period (monthly/weekly)."""
    data = transaction_service.get_financial_rhythm(user_id, period)
    return {"data": data}


@app.get("/api/expenses-by-category")
async def get_expenses_by_category(
    user_id: str = Depends(verify_jwt),
):
    """Get expense breakdown by category."""
    data = transaction_service.get_expenses_by_category(user_id)
    return {"data": data}


# ── Asset Endpoints ──────────────────────────────────────────


@app.get("/api/assets")
async def list_assets(
    user_id: str = Depends(verify_jwt),
):
    """List user assets (auth required)."""
    from backend import asset_service
    data = asset_service.get_assets(user_id)
    return {"data": data}


@app.post("/api/assets")
async def create_asset(
    data: AssetCreate,
    user_id: str = Depends(verify_jwt),
):
    """Create a new asset (auth required)."""
    from backend import asset_service
    result = asset_service.create_asset(user_id, data)
    return {"status": "created", "data": result}


@app.delete("/api/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Delete an asset (auth required)."""
    from backend import asset_service
    result = asset_service.delete_asset(user_id, asset_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found.",
        )
    return {"status": "deleted"}
    return {"status": "deleted"}


# ── Fixed Cost Endpoints ─────────────────────────────────────


@app.get("/api/fixed-costs")
async def list_fixed_costs(
    user_id: str = Depends(verify_jwt),
):
    """List fixed costs (auth required)."""
    data = fixed_cost_service.get_user_fixed_costs(user_id)
    return {"data": data}


@app.post("/api/fixed-costs")
async def create_fixed_cost(
    data: FixedCostCreate,
    user_id: str = Depends(verify_jwt),
):
    """Create a new fixed cost (auth required)."""
    result = fixed_cost_service.create_fixed_cost(user_id, data)
    return {"status": "created", "data": result}


@app.delete("/api/fixed-costs/{cost_id}")
async def delete_fixed_cost(
    cost_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Delete a fixed cost (auth required)."""
    result = fixed_cost_service.delete_fixed_cost(user_id, cost_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fixed cost not found.",
        )
    return {"status": "deleted"}


# ── Bill Payment Endpoints ───────────────────────────────────


@app.get("/api/pending-bills")
async def list_pending_bills(
    user_id: str = Depends(verify_jwt),
):
    """Get bills that are due and need confirmation."""
    bills = fixed_cost_service.get_pending_bills(user_id)
    return {"data": bills}


@app.post("/api/bills/{bill_payment_id}/confirm")
async def confirm_bill(
    bill_payment_id: str,
    data: BillPaymentUpdate,
    user_id: str = Depends(verify_jwt),
):
    """Mark a bill as paid or skipped."""
    result = fixed_cost_service.confirm_bill_payment(
        user_id, bill_payment_id, data.status
    )
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )
    return {"status": data.status, "data": result}


# ── Schedule Endpoints ───────────────────────────────────────


@app.get("/api/schedule")
async def get_schedule(
    user_id: str = Depends(verify_jwt),
):
    """Get the user's weekly class schedule."""
    data = schedule_service.get_schedule(user_id)
    multiplier = schedule_service.get_multiplier(user_id)
    return {"data": data, "multiplier": multiplier}


@app.put("/api/schedule")
async def update_schedule(
    data: ScheduleUpdate,
    user_id: str = Depends(verify_jwt),
):
    """Save the user's weekly class schedule."""
    days = [d.model_dump() for d in data.days]
    result = schedule_service.upsert_schedule(user_id, days)
    return {"status": "updated", "data": result}


# ── AI Coach Endpoints ───────────────────────────────────────


@app.get("/api/ai/advice")
async def get_ai_advice(
    user_id: str = Depends(verify_jwt),
):
    """Get AI financial advice (auth required)."""
    # Gather financial data
    runway_data = transaction_service.get_runway_summary(user_id, days=30)
    
    advice = ai_service.get_financial_advice(
        user_profile={"id": user_id},
        financial_data=runway_data
    )
    return {"advice": advice}
