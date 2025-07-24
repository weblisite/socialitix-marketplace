-- Migration: Create withdrawals table with multiple payment methods
-- This migration creates the withdrawals table and related functionality

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
            fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  payment_method VARCHAR(20) NOT NULL, -- 'mpesa', 'airtel_money', 'bank_transfer', 'paypal'
  payment_details JSONB NOT NULL, -- Store payment method specific details
  admin_notes TEXT, -- Admin notes for processing
  processed_by INTEGER REFERENCES users(id), -- Admin who processed the withdrawal
  processed_at TIMESTAMP WITH TIME ZONE,
  external_payment_id VARCHAR(255), -- External payment service ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_method ON withdrawals(payment_method);

-- Add comments for documentation
COMMENT ON TABLE withdrawals IS 'Stores provider withdrawal requests with multiple payment methods.';
COMMENT ON COLUMN withdrawals.provider_id IS 'The ID of the provider requesting withdrawal.';
COMMENT ON COLUMN withdrawals.amount IS 'The withdrawal amount requested.';
COMMENT ON COLUMN withdrawals.fee IS 'The transaction fee charged (3% of withdrawal amount).';
COMMENT ON COLUMN withdrawals.net_amount IS 'The amount after fees (amount - fee).';
COMMENT ON COLUMN withdrawals.status IS 'Withdrawal status: pending, processing, completed, failed, cancelled.';
COMMENT ON COLUMN withdrawals.payment_method IS 'Payment method: mpesa, airtel_money, bank_transfer, paypal.';
COMMENT ON COLUMN withdrawals.payment_details IS 'JSON object containing payment method specific details.';
COMMENT ON COLUMN withdrawals.admin_notes IS 'Admin notes for processing the withdrawal.';
COMMENT ON COLUMN withdrawals.processed_by IS 'The admin who processed the withdrawal.';
COMMENT ON COLUMN withdrawals.processed_at IS 'When the withdrawal was processed.';
COMMENT ON COLUMN withdrawals.external_payment_id IS 'External payment service transaction ID.';
COMMENT ON COLUMN withdrawals.created_at IS 'When the withdrawal request was created.';
COMMENT ON COLUMN withdrawals.updated_at IS 'When the withdrawal record was last updated.';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_withdrawals_updated_at 
    BEFORE UPDATE ON withdrawals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 