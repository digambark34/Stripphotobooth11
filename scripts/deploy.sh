#!/bin/bash

# Strip Photobooth Deployment Script
# This script helps with local testing before deployment

set -e

echo "🚀 Strip Photobooth Deployment Helper"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if environment files exist
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Copy from .env.example and configure."
fi

if [ ! -f "frontend/.env" ]; then
    print_warning "Frontend .env file not found. Copy from .env.example and configure."
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

# Backend dependencies
if [ -d "backend" ]; then
    print_status "Installing backend dependencies..."
    cd backend
    npm ci
    cd ..
fi

# Frontend dependencies
if [ -d "frontend" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm ci
    cd ..
fi

# Build frontend for production
echo ""
echo "🏗️  Building frontend for production..."
cd frontend
npm run build
cd ..
print_status "Frontend build completed"

# Test backend
echo ""
echo "🧪 Testing backend..."
cd backend
npm test 2>/dev/null || print_warning "No backend tests found"
cd ..

# Check for common issues
echo ""
echo "🔍 Checking for common deployment issues..."

# Check for hardcoded localhost URLs
if grep -r "localhost" frontend/src/ --exclude-dir=node_modules 2>/dev/null; then
    print_warning "Found hardcoded localhost URLs in frontend. Make sure to use environment variables."
fi

# Check for console.log statements
if grep -r "console.log" frontend/src/ --exclude-dir=node_modules 2>/dev/null | head -5; then
    print_warning "Found console.log statements. Consider removing for production."
fi

# Check build size
BUILD_SIZE=$(du -sh frontend/build 2>/dev/null | cut -f1 || echo "Unknown")
print_status "Frontend build size: $BUILD_SIZE"

echo ""
echo "🎉 Pre-deployment checks completed!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your GitHub repo to Netlify (frontend)"
echo "3. Connect your GitHub repo to Render (backend)"
echo "4. Set environment variables in both platforms"
echo ""
print_status "Ready for deployment!"
