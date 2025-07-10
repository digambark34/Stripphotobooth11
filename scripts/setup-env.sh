#!/bin/bash

# Environment Setup Script for Strip Photobooth
# This script helps set up environment variables for deployment

set -e

echo "🔧 Strip Photobooth Environment Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Create backend .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    print_info "Creating backend .env file..."
    cp backend/.env.example backend/.env
    print_status "Backend .env created from example"
    print_warning "Please edit backend/.env with your actual values"
else
    print_status "Backend .env already exists"
fi

# Create frontend .env if it doesn't exist
if [ ! -f "frontend/.env" ]; then
    print_info "Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
    print_status "Frontend .env created from example"
    print_warning "Please edit frontend/.env with your actual values"
else
    print_status "Frontend .env already exists"
fi

echo ""
echo "📋 Environment Variables Checklist:"
echo ""
echo "Backend (.env):"
echo "  ✓ MONGODB_URI - Your MongoDB connection string"
echo "  ✓ CLOUDINARY_CLOUD_NAME - Your Cloudinary cloud name"
echo "  ✓ CLOUDINARY_API_KEY - Your Cloudinary API key"
echo "  ✓ CLOUDINARY_API_SECRET - Your Cloudinary API secret"
echo "  ✓ CORS_ORIGIN - Your frontend URL (Netlify URL for production)"
echo "  ✓ JWT_SECRET - A secure random string"
echo "  ✓ ADMIN_PASSWORD - A secure admin password"
echo ""
echo "Frontend (.env):"
echo "  ✓ REACT_APP_API_URL - Your backend URL (Render URL for production)"
echo ""
echo "🌐 For Deployment:"
echo ""
echo "Netlify Environment Variables:"
echo "  - REACT_APP_API_URL=https://your-backend.onrender.com"
echo ""
echo "Render Environment Variables:"
echo "  - MONGODB_URI=mongodb+srv://..."
echo "  - CLOUDINARY_CLOUD_NAME=your_cloud_name"
echo "  - CLOUDINARY_API_KEY=your_api_key"
echo "  - CLOUDINARY_API_SECRET=your_api_secret"
echo "  - CORS_ORIGIN=https://your-app.netlify.app"
echo "  - JWT_SECRET=your_secure_random_string"
echo "  - ADMIN_PASSWORD=your_secure_password"
echo ""
print_status "Environment setup completed!"
print_info "Don't forget to update the values in your .env files!"
