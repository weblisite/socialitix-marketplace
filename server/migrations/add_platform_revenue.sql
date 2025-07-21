-- Migration: Add platform_revenue table for tracking platform earnings
-- This migration adds a table to track all platform revenue from service fees

-- Create platform_revenue table
CREATE TABLE IF NOT EXISTS platform_revenue (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    revenue_type TEXT NOT NULL, -- 'service_fee', 'withdrawal_fee', etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_revenue_transaction ON platform_revenue(transaction_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type ON platform_revenue(revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON platform_revenue(created_at);

-- Add comments for documentation
COMMENT ON TABLE platform_revenue IS 'Track all platform revenue from various sources';
COMMENT ON COLUMN platform_revenue.amount IS 'Amount of revenue in KES';
COMMENT ON COLUMN platform_revenue.revenue_type IS 'Type of revenue (service_fee, withdrawal_fee, etc.)';
COMMENT ON COLUMN platform_revenue.description IS 'Description of the revenue source'; 