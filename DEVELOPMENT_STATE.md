# Development State & Context

> **Last Updated:** 2026-02-16
> **Purpose:** This document serves as a "save point" for the project context. Read this first when returning to the project to understand the current state, architecture, and recent changes.

## 1. Project Overview
**Lefstyle Student (formerly CEIS)** is a **Student Budget Tracker** tailored for daily survival. It focuses on "Days Until Broke" and tracking daily/weekly spending habits against a set limit.

### Core Metrics (Business Logic)
Defined in `backend/transaction_service.py` and `backend/financial_engine.py`.

*   **Current Balance**: User's actual money (`Income - Expenses`).
*   **Days Until Broke**: Replaces "Runway".
    *   *Formula*: `Current Balance / Average Daily Spending (Burn Rate)`
    *   *Edge Case*: "∞" if burn rate is 0.
*   **Spending Limit**: Visualized as a progress bar.
    *   *Logic*: Tracks total expenses against total income (or budget) for the selected period (Weekly/Monthly).
*   **Expenses by Category**: Breakdown of spending (e.g., Food, Transport).

## 2. Architecture & Stack

### Backend
*   **Framework**: FastAPI (Python)
*   **Entry Point**: `backend/main.py`
*   **Port**: `8000`
*   **Key Components**:
    *   `transaction_service.py`: CRUD for transactions + Aggregation logic (Rhythm, Expenses by Category).
    *   `asset_service.py`: CRUD for assets (currently less prominent in UI).
    *   `telegram_bot.py`: Webhook handler for the Telegram bot interface.
*   **Auth**: JWT validation via Supabase (`auth_service.py`).

### Frontend
*   **Framework**: Next.js 16 (React 19)
*   **Path**: `/frontend`
*   **Styling**: Tailwind CSS v4
*   **State**: Local React state + Supabase Client.
*   **Key Components**:
    *   `Sidebar`: Simplified navigation (Wishlist, School Needs).
    *   `Dashboard`: Student-focused widgets (Balance, Days Until Broke, Expense Categories).

### Database
*   **Provider**: Supabase (PostgreSQL)
*   **Auth**: Supabase Auth (RLS enabled on all tables).
*   **Tables**: `users`, `transactions`, `snapshots`, `assets`.

## 3. Recent Developments & Changes
*   **Refactor to "Lefstyle Student"**:
    *   Renamed app and updated branding.
    *   Changed primary currency to **₱ (PHP)**.
*   **UI Overhaul**:
    *   Removed "Estate Planning", "Portfolio", "AI Insights".
    *   Added "Wishlist" and "School Needs" placeholders in Sidebar.
*   **Logic Enhancements**:
    *   Implemented `get_expenses_by_category` endpoint.
    *   Updated `get_financial_rhythm` to support weekly/monthly toggles.
    *   Refined Balance and Runway calculations for accuracy.

## 4. Environment Variables
Required in `.env`:
```ini
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
```

## 5. Quick Start
**Backend:**
```bash
# Activate venv
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 6. Known Issues / Roadmap
*   **CORS**: Currently set to allow `*` in `backend/main.py`. Needs restriction for production.
*   **Bot Hosting**: The Telegram bot currently runs via webhook in the FastAPI app. Needs a public URL (e.g., ngrok) to receive updates during local dev.
*   **Database Migration**: `assets` table creation is manual via `assets_migration.sql`.
