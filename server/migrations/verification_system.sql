-- Migration: Add verification system tables and columns
-- This migration adds support for proof submission, AI verification, and fraud detection

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS banned_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Add new columns to action_assignments table
ALTER TABLE action_assignments 
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS verification_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Update action_assignments status enum
-- Note: This might need to be done differently depending on your database setup
-- For now, we'll use text field and handle enum validation in application code

-- Create image_hashes table for fraud detection
CREATE TABLE IF NOT EXISTS image_hashes (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(64) NOT NULL,
    assignment_id INTEGER NOT NULL REFERENCES action_assignments(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    flagged_count INTEGER DEFAULT 0,
    UNIQUE(hash, provider_id)
);

-- Create verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES action_assignments(id) ON DELETE CASCADE,
    verifier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verification_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason TEXT,
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_hashes_hash ON image_hashes(hash);
CREATE INDEX IF NOT EXISTS idx_image_hashes_provider ON image_hashes(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_assignment ON verification_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verifier ON verification_logs(verifier_id);
CREATE INDEX IF NOT EXISTS idx_action_assignments_status ON action_assignments(status);
CREATE INDEX IF NOT EXISTS idx_action_assignments_provider ON action_assignments(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Add comments for documentation
COMMENT ON TABLE image_hashes IS 'Stores SHA256 hashes of proof images to detect reuse and prevent fraud';
COMMENT ON TABLE verification_logs IS 'Audit trail of all verification actions (manual and AI)';
COMMENT ON COLUMN users.status IS 'User account status: active, suspended, banned';
COMMENT ON COLUMN users.banned_reason IS 'Reason for account ban if status is banned';
COMMENT ON COLUMN users.banned_at IS 'Timestamp when account was banned';
COMMENT ON COLUMN action_assignments.verification_method IS 'Method used for verification: manual, ai, flagged';
COMMENT ON COLUMN action_assignments.verification_reason IS 'Reason for verification result';
COMMENT ON COLUMN action_assignments.ai_confidence IS 'AI confidence score (0.00-1.00) for AI verification';
COMMENT ON COLUMN action_assignments.submitted_at IS 'Timestamp when proof was submitted';
COMMENT ON COLUMN image_hashes.flagged_count IS 'Number of times this image hash has been flagged for reuse'; 