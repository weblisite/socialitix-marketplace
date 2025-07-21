#!/bin/bash

# 🚀 Render Deployment Script for Social Media Engagement Marketplace

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Render deployment steps:"
echo ""
print_status "1. Visit: https://render.com"
print_status "2. Sign up/Login with GitHub"
print_status "3. Click 'New Web Service'"
print_status "4. Connect repository: weblisite/socialitix-marketplace"
print_status "5. Configure settings:"
echo "   - Name: socialitix-marketplace"
echo "   - Environment: Node"
echo "   - Build Command: npm ci && npm run build"
echo "   - Start Command: npm start"
print_status "6. Add environment variables:"
echo "   - NODE_ENV=production"
echo "   - SUPABASE_URL=https://xevnhgizberlburnxuzh.supabase.co"
echo "   - SUPABASE_ANON_KEY=your_key"
echo "   - INTASEND_API_PUBLISHABLE_KEY=your_key"
echo "   - INTASEND_API_SECRET_KEY=your_key"
echo "   - BASE_URL=https://your-app.onrender.com"
echo "   - FRONTEND_URL=https://your-app.onrender.com"
print_status "7. Click 'Create Web Service'"
echo ""
print_success "Your app will be deployed to: https://your-app.onrender.com"
echo ""
print_status "Alternative: Use render.yaml configuration file"
print_status "Render will automatically detect and use the render.yaml file" 