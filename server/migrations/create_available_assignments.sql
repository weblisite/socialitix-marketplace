-- Migration: Create available assignments system
-- This migration creates the available_assignments table and related functionality

-- Create available_assignments table
CREATE TABLE IF NOT EXISTS available_assignments (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  service_id VARCHAR(50) NOT NULL, -- References the service type (e.g., 'instagram-followers')
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'youtube', 'twitter', 'tiktok'
  action_type VARCHAR(50) NOT NULL, -- 'followers', 'likes', 'comments', 'views', 'subscribers', 'shares'
  target_url TEXT,
  comment_text TEXT,
  buyer_price DECIMAL(10,2) NOT NULL,
  provider_earnings DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'claimed', 'expired'
  claimed_by INTEGER REFERENCES users(id),
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_available_assignments_service_id ON available_assignments(service_id);
CREATE INDEX IF NOT EXISTS idx_available_assignments_status ON available_assignments(status);
CREATE INDEX IF NOT EXISTS idx_available_assignments_expires_at ON available_assignments(expires_at);
CREATE INDEX IF NOT EXISTS idx_available_assignments_claimed_by ON available_assignments(claimed_by);
CREATE INDEX IF NOT EXISTS idx_available_assignments_platform_action ON available_assignments(platform, action_type);

-- Create provider_services table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_services (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id VARCHAR(50) NOT NULL, -- References the service type (e.g., 'instagram-followers')
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, service_id)
);

-- Create indexes for provider_services
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_status ON provider_services(status);

-- Add comments for documentation
COMMENT ON TABLE available_assignments IS 'Available assignments that providers can claim';
COMMENT ON COLUMN available_assignments.service_id IS 'Service type identifier (e.g., instagram-followers)';
COMMENT ON COLUMN available_assignments.platform IS 'Social media platform';
COMMENT ON COLUMN available_assignments.action_type IS 'Type of action to perform';
COMMENT ON COLUMN available_assignments.buyer_price IS 'Price paid by buyer';
COMMENT ON COLUMN available_assignments.provider_earnings IS 'Amount provider earns';
COMMENT ON COLUMN available_assignments.status IS 'Assignment status: available, claimed, expired';
COMMENT ON COLUMN available_assignments.claimed_by IS 'Provider who claimed the assignment';
COMMENT ON COLUMN available_assignments.expires_at IS 'When the assignment expires';

COMMENT ON TABLE provider_services IS 'Services that providers have selected to offer';
COMMENT ON COLUMN provider_services.service_id IS 'Service type identifier';
COMMENT ON COLUMN provider_services.status IS 'Service status: active, inactive'; 