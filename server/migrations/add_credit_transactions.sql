-- Migration: Add credit_transactions table for wallet audit trail
-- This migration adds a table to track all credit transactions for providers

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER NOT NULL REFERENCES action_assignments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_provider ON credit_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_assignment ON credit_transactions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Add comments for documentation
COMMENT ON TABLE credit_transactions IS 'Audit trail of all credit transactions for provider wallets';
COMMENT ON COLUMN credit_transactions.amount IS 'Amount credited to provider wallet';
COMMENT ON COLUMN credit_transactions.balance_before IS 'Provider balance before credit';
COMMENT ON COLUMN credit_transactions.balance_after IS 'Provider balance after credit';
COMMENT ON COLUMN credit_transactions.reason IS 'Reason for credit (e.g., "Buyer approved proof", "AI verification successful")'; 