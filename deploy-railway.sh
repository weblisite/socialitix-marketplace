#!/bin/bash

# 🚀 Railway Deployment Script for Social Media Engagement Marketplace

echo "🚀 Starting Railway deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is available
if ! command -v npx &> /dev/null; then
    print_error "npx is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking Railway CLI..."
RAILWAY_VERSION=$(npx @railway/cli --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_success "Railway CLI found: $RAILWAY_VERSION"
else
    print_error "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
print_status "Checking Railway login status..."
if npx @railway/cli whoami &>/dev/null; then
    print_success "Already logged in to Railway"
else
    print_warning "Not logged in to Railway. Please complete the login process."
    print_status "Running: npx @railway/cli login"
    npx @railway/cli login
    
    # Check if login was successful
    if ! npx @railway/cli whoami &>/dev/null; then
        print_error "Login failed. Please try again."
        exit 1
    fi
fi

# Initialize Railway project
print_status "Initializing Railway project..."
if [ ! -f ".railway" ]; then
    print_status "Creating new Railway project..."
    npx @railway/cli init --name "social-media-engagement-marketplace"
else
    print_success "Railway project already initialized"
fi

# Set environment variables
print_status "Setting environment variables..."

# Read from .env file
if [ -f ".env" ]; then
    print_status "Reading environment variables from .env file..."
    
    # Supabase variables
    SUPABASE_URL=$(grep "^SUPABASE_URL=" .env | cut -d'=' -f2)
    SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .env | cut -d'=' -f2)
    
    # IntaSend variables
    INTASEND_API_PUBLISHABLE_KEY=$(grep "^INTASEND_API_PUBLISHABLE_KEY=" .env | cut -d'=' -f2)
    INTASEND_API_SECRET_KEY=$(grep "^INTASEND_API_SECRET_KEY=" .env | cut -d'=' -f2)
    
    # Set variables in Railway
    if [ ! -z "$SUPABASE_URL" ]; then
        npx @railway/cli variables set SUPABASE_URL="$SUPABASE_URL"
        print_success "Set SUPABASE_URL"
    fi
    
    if [ ! -z "$SUPABASE_ANON_KEY" ]; then
        npx @railway/cli variables set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
        print_success "Set SUPABASE_ANON_KEY"
    fi
    
    if [ ! -z "$INTASEND_API_PUBLISHABLE_KEY" ]; then
        npx @railway/cli variables set INTASEND_API_PUBLISHABLE_KEY="$INTASEND_API_PUBLISHABLE_KEY"
        print_success "Set INTASEND_API_PUBLISHABLE_KEY"
    fi
    
    if [ ! -z "$INTASEND_API_SECRET_KEY" ]; then
        npx @railway/cli variables set INTASEND_API_SECRET_KEY="$INTASEND_API_SECRET_KEY"
        print_success "Set INTASEND_API_SECRET_KEY"
    fi
else
    print_warning ".env file not found. Please set environment variables manually."
fi

# Set production environment variables
npx @railway/cli variables set NODE_ENV=production
print_success "Set NODE_ENV=production"

# Get the project URL and set BASE_URL
print_status "Getting project URL..."
PROJECT_URL=$(npx @railway/cli domain 2>/dev/null | grep -o 'https://[^[:space:]]*')
if [ ! -z "$PROJECT_URL" ]; then
    npx @railway/cli variables set BASE_URL="$PROJECT_URL"
    npx @railway/cli variables set FRONTEND_URL="$PROJECT_URL"
    print_success "Set BASE_URL and FRONTEND_URL to: $PROJECT_URL"
else
    print_warning "Could not get project URL. Please set BASE_URL manually after deployment."
fi

# Deploy the application
print_status "Deploying application..."
npx @railway/cli up

if [ $? -eq 0 ]; then
    print_success "Deployment successful!"
    
    # Get the final URL
    FINAL_URL=$(npx @railway/cli domain 2>/dev/null | grep -o 'https://[^[:space:]]*')
    if [ ! -z "$FINAL_URL" ]; then
        print_success "Your application is live at: $FINAL_URL"
        echo ""
        print_status "Next steps:"
        echo "1. Visit $FINAL_URL to test your application"
        echo "2. Test user registration and login"
        echo "3. Test payment flow with IntaSend"
        echo "4. Test all dashboard features"
        echo ""
        print_status "To view logs: npx @railway/cli logs"
        print_status "To open dashboard: npx @railway/cli open"
    fi
else
    print_error "Deployment failed. Check the logs above for errors."
    exit 1
fi

print_success "Railway deployment completed! 🎉" 