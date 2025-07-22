#!/bin/bash

# 🚀 Render Deployment Script using curl
# Deploys Social Media Engagement Marketplace to Render

echo "🚀 Starting Render deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl first."
    exit 1
fi

print_status "Render deployment requires manual setup through the web interface."
echo ""
print_status "Please follow these steps:"
echo ""
print_status "1. Visit: https://render.com"
print_status "2. Sign up/Login with GitHub"
print_status "3. Click 'New +' → 'Web Service'"
print_status "4. Connect repository: weblisite/socialitix-marketplace"
print_status "5. Configure settings:"
echo "   - Name: socialitix-marketplace"
echo "   - Environment: Node"
echo "   - Build Command: npm ci && npm run build"
echo "   - Start Command: npm start"
print_status "6. Add environment variables:"
echo "   - NODE_ENV=production"
echo "   - SUPABASE_URL=https://xevnhgizberlburnxuzh.supabase.co"
echo "   - SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhldm5oZ2l6YmVybGJ1cm54dXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDY3NzQsImV4cCI6MjA2ODUyMjc3NH0.GjjC9I-__p0e4nez0Dar71p2zMFjd2sX2K2K_xBYRl4"
echo "   - INTASEND_API_PUBLISHABLE_KEY=ISPubKey_live_8e8857a5-54ad-4d06-8537-4557857db13b"
echo "   - INTASEND_API_SECRET_KEY=ISSecretKey_live_dc9cf272-1dfc-42da-a300-aca01256e0f5"
echo "   - BASE_URL=https://socialitix-marketplace.onrender.com"
echo "   - FRONTEND_URL=https://socialitix-marketplace.onrender.com"
print_status "7. Click 'Create Web Service'"
echo ""
print_success "Your app will be deployed to: https://socialitix-marketplace.onrender.com"
echo ""
print_status "Expected build time: 3-5 minutes"
print_status "Monitor progress in the Render dashboard" 