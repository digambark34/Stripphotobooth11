#!/bin/bash

# Photo Booth Deployment Script
echo "🚀 Photo Booth Deployment Helper"
echo "================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Photo Booth Application"
    echo "✅ Git repository initialized"
else
    echo "📁 Git repository already exists"
fi

# Add and commit any changes
echo "📝 Adding and committing changes..."
git add .
git commit -m "Prepare for deployment - $(date)"

echo ""
echo "🎯 Next Steps:"
echo "1. Create GitHub repository: https://github.com/new"
echo "2. Add remote origin:"
echo "   git remote add origin https://github.com/yourusername/strip-photobooth.git"
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "4. Deploy Backend to Render:"
echo "   - Go to https://render.com"
echo "   - Create new Web Service"
echo "   - Connect GitHub repository"
echo "   - Set root directory: backend"
echo "   - Add environment variables from backend/.env.example"
echo ""
echo "5. Deploy Frontend to Netlify:"
echo "   - Go to https://netlify.com"
echo "   - Import from GitHub"
echo "   - Set base directory: frontend"
echo "   - Set build command: npm run build"
echo "   - Set publish directory: frontend/build"
echo "   - Add environment variable: REACT_APP_API_BASE_URL"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"
echo "✅ Ready for deployment!"
