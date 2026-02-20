"""
CEIS Pydantic Models — request/response schemas and internal records.
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Internal Record (used by financial_engine) ──────────────


class TransactionRecord(BaseModel):
    """Lightweight transaction record for engine calculations."""
    amount: float
    transaction_type: str  # "expense" | "income"
    transaction_date: date


# ── API Request Schemas ─────────────────────────────────────


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""
    amount: float = Field(..., gt=0, description="Positive amount")
    category: str = Field(default="uncategorized", max_length=50)
    description: str = Field(default="", max_length=200)
    transaction_type: str = Field(
        default="expense",
        pattern="^(expense|income)$",
    )
    transaction_date: date = Field(default_factory=date.today)


class TransactionUpdate(BaseModel):
    """Schema for updating an existing transaction."""
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    transaction_type: Optional[str] = Field(
        None,
        pattern="^(expense|income)$",
    )
    transaction_date: Optional[date] = None


# ── API Response Schemas ────────────────────────────────────


class TransactionResponse(BaseModel):
    """Full transaction as returned by the API."""
    id: UUID
    user_id: UUID
    amount: float
    category: str
    description: str
    transaction_type: str
    transaction_date: date
    created_at: datetime


class FinancialSnapshot(BaseModel):
    """Daily financial snapshot response."""
    balance: float
    burn_rate: float
    runway_days: float
    runway_status: str  # critical | warning | stable | healthy
    snapshot_date: date


class RunwayResponse(BaseModel):
    """Quick runway check response."""
    balance: float
    burn_rate: float
    runway_days: float
    status: str
    message: str
    free_to_spend: float = 0.0
    monthly_commitments: float = 0.0
    period_commitments: float = 0.0


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "0.1.0"


# ── User Schemas ────────────────────────────────────────────


class UserProfile(BaseModel):
    """User profile response."""
    id: UUID
    telegram_id: Optional[int] = None
    display_name: str
    initial_balance: float
    currency: str
    week_start_day: Optional[str] = "Monday"
    month_start_day: Optional[int] = 1
    school_day_multiplier: Optional[float] = 1.5
    alert_thresholds: Optional[dict] = None
    created_at: datetime


class Asset(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    type: str  # Real Estate, Stock, Crypto, etc.
    value: float
    allocation_percent: float = 0
    created_at: datetime


class AssetCreate(BaseModel):
    name: str
    type: str
    value: float
    allocation_percent: Optional[float] = 0


class FinancialRhythm(BaseModel):
    income: float
    expense: float
    saving: float
    income_growth: float
    expense_growth: float
    saving_growth: float


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile fields."""
    display_name: Optional[str] = Field(None, max_length=100)
    initial_balance: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=10)
    week_start_day: Optional[str] = None
    month_start_day: Optional[int] = None
    school_day_multiplier: Optional[float] = Field(None, ge=1.0, le=3.0)
    alert_thresholds: Optional[dict] = None


class LinkTokenResponse(BaseModel):
    """Response for a generated Telegram link token."""
    token: str
    expires_in: int


# ── Snapshot Schemas ────────────────────────────────────────


class SnapshotCreate(BaseModel):
    """Schema for saving a financial snapshot."""
    balance: float
    burn_rate: float
    runway_days: float
    snapshot_date: date = Field(default_factory=date.today)


class SnapshotResponse(BaseModel):
    """Full snapshot as returned by the API."""
    id: UUID
    user_id: UUID
    balance: float
    burn_rate: float
    runway_days: float
    snapshot_date: date
    created_at: datetime


# ── Fixed Cost Schemas ──────────────────────────────────────


class FixedCostCreate(BaseModel):
    """Schema for creating a fixed cost."""
    name: str = Field(..., max_length=100)
    amount: float = Field(..., gt=0)
    due_day_of_month: int = Field(1, ge=1, le=31)
    frequency: str = Field(default="monthly", pattern="^(monthly|weekly)$")
    due_day_of_week: Optional[int] = Field(None, ge=1, le=7)


class FixedCost(BaseModel):
    """Fixed cost response."""
    id: UUID
    user_id: UUID
    name: str
    amount: float
    due_day_of_month: int
    frequency: str = "monthly"
    due_day_of_week: Optional[int] = None
    created_at: datetime


class BillPayment(BaseModel):
    """Bill payment tracking record."""
    id: UUID
    user_id: UUID
    fixed_cost_id: UUID
    due_date: date
    status: str  # pending | paid | skipped
    paid_at: Optional[datetime] = None
    created_at: datetime


class BillPaymentUpdate(BaseModel):
    """Schema for confirming a bill payment."""
    status: str = Field(..., pattern="^(paid|skipped)$")


# ── Schedule Schemas ────────────────────────────────────────


class ScheduleDay(BaseModel):
    """Single day in the weekly class schedule."""
    day_of_week: str
    has_class: bool


class ScheduleUpdate(BaseModel):
    """Request to save the full weekly schedule."""
    days: List[ScheduleDay]
