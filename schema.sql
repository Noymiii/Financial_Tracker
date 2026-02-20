-- ============================================================
-- CEIS: Campus Expense Intelligence System
-- Supabase PostgreSQL Schema with Row-Level Security
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    initial_balance NUMERIC(12, 2) DEFAULT 0.00,

    currency TEXT NOT NULL DEFAULT 'PHP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Extended user profiles linked to Supabase Auth.';

-- ============================================================
-- 2. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'uncategorized',
    description TEXT DEFAULT '',
    transaction_type TEXT NOT NULL DEFAULT 'expense'
        CHECK (transaction_type IN ('expense', 'income')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE transactions IS 'All user income and expense entries.';

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date DESC);

-- ============================================================
-- 3. FINANCIAL SNAPSHOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS financial_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    burn_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    runway_days NUMERIC(8, 1) NOT NULL DEFAULT 0.0,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, snapshot_date)
);

COMMENT ON TABLE financial_snapshots IS 'Daily snapshot of balance, burn rate, and runway.';

CREATE INDEX idx_snapshots_user_date ON financial_snapshots(user_id, snapshot_date DESC);

-- ============================================================
-- 4. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- ---- users ----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
    ON users FOR DELETE
    USING (auth.uid() = id);

-- ---- transactions ----
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ---- financial_snapshots ----
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
    ON financial_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
    ON financial_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
    ON financial_snapshots FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
    ON financial_snapshots FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================
-- 5. FIXED COSTS TABLE (Subscriptions & Bills)
-- ============================================================
CREATE TABLE IF NOT EXISTS fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_day_of_month INTEGER NOT NULL CHECK (due_day_of_month BETWEEN 1 AND 31),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fixed_costs IS 'Recurring monthly expenses like rent, subscriptions, internet.';

CREATE INDEX idx_fixed_costs_user ON fixed_costs(user_id);

-- ---- fixed_costs RLS ----
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed costs"
    ON fixed_costs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed costs"
    ON fixed_costs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed costs"
    ON fixed_costs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed costs"
    ON fixed_costs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 6. UPDATED_AT TRIGGER (for users table)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. HANDLE NEW USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

