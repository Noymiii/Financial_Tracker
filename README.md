# CEIS — Campus Expense Intelligence System

> A financial survival tool for students. Track expenses, calculate burn rate, and see your **runway** — the number of days until you're broke.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js UI  │────▶│  FastAPI API  │────▶│  Supabase (PG)   │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │ Telegram Bot  │
                    └──────────────┘
```

**Core Formula:**  
`Runway = Current Balance / Daily Burn Rate (30-day avg)`

## Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Backend   | FastAPI + Uvicorn       |
| Database  | Supabase PostgreSQL     |
| Auth      | Supabase Auth + JWT     |
| Frontend  | Next.js (Phase 2)       |
| Bot       | python-telegram-bot     |

## Project Structure

```
Financial AI/
├── schema.sql           # Supabase DB schema + RLS policies
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variable template
├── README.md
└── backend/
    ├── main.py              # FastAPI entry point
    ├── config.py            # Env settings (pydantic-settings)
    ├── database.py          # Supabase client singleton
    ├── auth_service.py      # JWT verification dependency
    ├── financial_engine.py  # Pure math — burn rate & runway
    ├── models.py            # Pydantic schemas
    ├── transaction_service.py  # DB CRUD operations
    └── telegram_bot.py      # Telegram webhook handler
```

## Setup

1. **Clone & install:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in your Supabase and Telegram credentials
   ```

3. **Run the schema** in Supabase SQL Editor:
   - Open `schema.sql` → paste into Supabase Dashboard → Run.

4. **Start the server:**
   ```bash
   uvicorn backend.main:app --reload
   ```

5. **Check health:**
   ```
   GET http://localhost:8000/health
   ```

## Security

- **RLS enabled** on all tables — users can only access their own data.
- **JWT verification** on every API endpoint via `auth_service.py`.
- **Frontend never writes** directly to transactions — always goes through FastAPI.
