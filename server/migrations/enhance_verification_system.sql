-- Migration: Enhance verification system with missing columns
-- This migration adds missing columns to action_assignments table for complete verification functionality

-- Add missing columns to action_assignments table
ALTER TABLE action_assignments 
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS proof_type VARCHAR(20), -- 'api', 'screenshot', 'manual'
ADD COLUMN IF NOT EXISTS verification_data JSONB,
ADD COLUMN IF NOT EXISTS ai_analysis TEXT, -- Detailed AI analysis from OpenAI
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_time INTEGER, -- in minutes
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50), -- 'followers', 'likes', 'views', 'comments', 'subscribers', 'reposts', 'shares'
ADD COLUMN IF NOT EXISTS platform VARCHAR(50), -- 'instagram', 'youtube', 'twitter', 'tiktok'
ADD COLUMN IF NOT EXISTS target_url TEXT,
ADD COLUMN IF NOT EXISTS comment_text TEXT;

-- Add missing columns to users table if not already present
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add missing columns to transactions table if not already present
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS comment_text TEXT,
ADD COLUMN IF NOT EXISTS target_url TEXT,
ADD COLUMN IF NOT EXISTS fulfilled_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_action_assignments_proof_url ON action_assignments(proof_url);
CREATE INDEX IF NOT EXISTS idx_action_assignments_action_type ON action_assignments(action_type);
CREATE INDEX IF NOT EXISTS idx_action_assignments_platform ON action_assignments(platform);
CREATE INDEX IF NOT EXISTS idx_action_assignments_verified_at ON action_assignments(verified_at);
CREATE INDEX IF NOT EXISTS idx_transactions_total_cost ON transactions(total_cost);
CREATE INDEX IF NOT EXISTS idx_transactions_fulfilled_quantity ON transactions(fulfilled_quantity);

-- Add comments for documentation
COMMENT ON COLUMN action_assignments.proof_url IS 'URL to the proof image or screenshot';
COMMENT ON COLUMN action_assignments.proof_type IS 'Type of proof: api, screenshot, manual';
COMMENT ON COLUMN action_assignments.verification_data IS 'Additional verification data in JSON format';
COMMENT ON COLUMN action_assignments.ai_analysis IS 'Detailed analysis from OpenAI GPT-4 Vision';
COMMENT ON COLUMN action_assignments.verified_at IS 'Timestamp when verification was completed';
COMMENT ON COLUMN action_assignments.completion_time IS 'Time taken to complete the action in minutes';
COMMENT ON COLUMN action_assignments.action_type IS 'Type of social media action performed';
COMMENT ON COLUMN action_assignments.platform IS 'Social media platform where action was performed';
COMMENT ON COLUMN action_assignments.target_url IS 'URL of the target post/account';
COMMENT ON COLUMN action_assignments.comment_text IS 'Comment text for comment actions';
COMMENT ON COLUMN users.balance IS 'User account balance';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN transactions.quantity IS 'Number of actions ordered';
COMMENT ON COLUMN transactions.total_cost IS 'Total cost of the transaction';
COMMENT ON COLUMN transactions.comment_text IS 'Comment text for comment actions';
COMMENT ON COLUMN transactions.target_url IS 'URL of the target post/account';
COMMENT ON COLUMN transactions.fulfilled_quantity IS 'Number of actions completed';
COMMENT ON COLUMN transactions.payment_id IS 'External payment reference';
COMMENT ON COLUMN transactions.completed_at IS 'Timestamp when transaction was completed'; 