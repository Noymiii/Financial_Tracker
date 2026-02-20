-- ============================================================
-- Migration 002: Bill Payment Tracking
-- Adds frequency support to fixed_costs and bill_payments table
-- ============================================================

-- 1. Add frequency columns to fixed_costs
ALTER TABLE fixed_costs
    ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('monthly', 'weekly')),
    ADD COLUMN IF NOT EXISTS due_day_of_week INTEGER
        CHECK (due_day_of_week IS NULL OR due_day_of_week BETWEEN 1 AND 7);

COMMENT ON COLUMN fixed_costs.frequency IS 'monthly or weekly';
COMMENT ON COLUMN fixed_costs.due_day_of_week IS '1=Mon, 2=Tue, ..., 7=Sun. Used when frequency=weekly.';

-- 2. Create bill_payments table
CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fixed_cost_id UUID NOT NULL REFERENCES fixed_costs(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'skipped')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bill_payments IS 'Tracks individual bill payment cycles for confirmation and rollover.';

CREATE INDEX idx_bill_payments_user ON bill_payments(user_id);
CREATE INDEX idx_bill_payments_status ON bill_payments(user_id, status);
CREATE UNIQUE INDEX idx_bill_payments_unique ON bill_payments(fixed_cost_id, due_date);

-- 3. RLS for bill_payments
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bill payments"
    ON bill_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill payments"
    ON bill_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill payments"
    ON bill_payments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill payments"
    ON bill_payments FOR DELETE
    USING (auth.uid() = user_id);
