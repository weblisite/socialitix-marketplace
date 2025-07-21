#!/bin/bash

# 🚀 Vercel Deployment Script for Social Media Engagement Marketplace

echo "🚀 Starting Vercel deployment..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
print_status "Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
print_status "Checking Vercel login status..."
if ! vercel whoami &>/dev/null; then
    print_warning "Not logged in to Vercel. Please complete the login process."
    print_status "Running: vercel login"
    vercel login
    
    # Check if login was successful
    if ! vercel whoami &>/dev/null; then
        print_error "Login failed. Please try again."
        exit 1
    fi
fi

# Build the application
print_status "Building application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Build successful!"
else
    print_error "Build failed! Please check the errors above."
    exit 1
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    print_success "Deployment successful!"
    echo ""
    print_status "Next steps:"
    echo "1. Set up environment variables in Vercel dashboard"
    echo "2. Test your application"
    echo "3. Configure custom domain (optional)"
    echo ""
    print_status "Environment variables to set:"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY"
    echo "- INTASEND_API_PUBLISHABLE_KEY"
    echo "- INTASEND_API_SECRET_KEY"
    echo "- NODE_ENV=production"
    echo "- BASE_URL"
    echo "- FRONTEND_URL"
    echo ""
    print_status "To set environment variables:"
    echo "vercel env add SUPABASE_URL"
    echo "vercel env add SUPABASE_ANON_KEY"
    echo "vercel env add INTASEND_API_PUBLISHABLE_KEY"
    echo "vercel env add INTASEND_API_SECRET_KEY"
    echo "vercel env add NODE_ENV"
    echo "vercel env add BASE_URL"
    echo "vercel env add FRONTEND_URL"
else
    print_error "Deployment failed! Check the errors above."
    exit 1
fi

print_success "Vercel deployment completed! 🎉" 