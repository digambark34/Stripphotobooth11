# 🚀 Deployment Guide

This guide covers deploying Strip Photobooth to various platforms.

## 📋 Pre-Deployment Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Cloudinary account set up with API credentials
- [ ] Environment variables configured
- [ ] Application tested locally
- [ ] Build process verified

## ☁️ Backend Deployment

### Option 1: Railway (Recommended)

1. **Create Railway Account**
   - Go to [Railway](https://railway.app/)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   cd backend
   railway init
   railway up
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set MONGO_URI="your_mongodb_connection_string"
   railway variables set CLOUDINARY_CLOUD_NAME="your_cloud_name"
   railway variables set CLOUDINARY_API_KEY="your_api_key"
   railway variables set CLOUDINARY_API_SECRET="your_api_secret"
   railway variables set NODE_ENV="production"
   railway variables set PORT="5000"
   ```

### Option 2: Heroku

1. **Create Heroku App**
   ```bash
   # Install Heroku CLI
   npm install -g heroku
   
   # Login and create app
   heroku login
   cd backend
   heroku create your-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set MONGO_URI="your_mongodb_connection_string"
   heroku config:set CLOUDINARY_CLOUD_NAME="your_cloud_name"
   heroku config:set CLOUDINARY_API_KEY="your_api_key"
   heroku config:set CLOUDINARY_API_SECRET="your_api_secret"
   heroku config:set NODE_ENV="production"
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository
   - Select the backend folder

2. **Configure Build Settings**
   - Build Command: `npm install`
   - Run Command: `npm start`
   - Environment: Node.js

3. **Set Environment Variables**
   - Add all required environment variables in the dashboard

## 🌐 Frontend Deployment

### Option 1: Netlify (Recommended)

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Drag and drop the `build` folder
   - Or connect GitHub repository

3. **Set Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add: `REACT_APP_API_BASE_URL=https://your-backend-url.com`

4. **Configure Redirects**
   Create `frontend/public/_redirects`:
   ```
   /*    /index.html   200
   ```

### Option 2: Vercel

1. **Deploy with Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   cd frontend
   vercel
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add REACT_APP_API_BASE_URL
   # Enter your backend URL when prompted
   ```

### Option 3: GitHub Pages

1. **Install gh-pages**
   ```bash
   cd frontend
   npm install --save-dev gh-pages
   ```

2. **Update package.json**
   ```json
   {
     "homepage": "https://yourusername.github.io/strip-photobooth",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d build"
     }
   }
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## 🗄️ Database Setup (MongoDB Atlas)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Choose a region close to your users

2. **Configure Network Access**
   - Add IP addresses: `0.0.0.0/0` (allow all) for production
   - Or add specific server IPs for better security

3. **Create Database User**
   - Create a user with read/write permissions
   - Use a strong password

4. **Get Connection String**
   - Click "Connect" > "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your user password

## ☁️ Cloudinary Setup

1. **Create Account**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for free account

2. **Get Credentials**
   - Go to Dashboard
   - Copy Cloud Name, API Key, and API Secret

3. **Configure Upload Presets (Optional)**
   - Go to Settings > Upload
   - Create upload presets for better organization

## 🔧 Environment Variables

### Backend (.env)
```env
# Production Backend Environment Variables
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/photobooth
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env)
```env
# Production Frontend Environment Variables
REACT_APP_API_BASE_URL=https://your-backend-domain.com
```

## 🔒 Security Considerations

### Backend Security
- Use strong JWT secrets
- Enable CORS only for your frontend domain
- Use HTTPS in production
- Keep dependencies updated
- Use environment variables for all secrets

### Frontend Security
- Don't expose sensitive data in client-side code
- Use HTTPS
- Implement proper error handling
- Validate all user inputs

## 📊 Monitoring and Logging

### Backend Monitoring
- Use Railway/Heroku logs for debugging
- Implement error logging (Winston, etc.)
- Monitor API response times
- Set up health checks

### Frontend Monitoring
- Use browser developer tools
- Implement error boundaries
- Monitor Core Web Vitals
- Set up analytics (optional)

## 🚀 Performance Optimization

### Backend
- Enable gzip compression
- Use CDN for static assets
- Optimize database queries
- Implement caching where appropriate

### Frontend
- Optimize images and assets
- Use code splitting
- Enable service workers
- Minimize bundle size

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          # Add Railway deployment commands
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Netlify
        run: |
          # Add Netlify deployment commands
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check FRONTEND_URL in backend environment
   - Verify API URL in frontend environment

2. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check network access settings
   - Ensure user has proper permissions

3. **Image Upload Issues**
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper CORS settings

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Getting Help
- Check deployment platform logs
- Review environment variable settings
- Test API endpoints manually
- Verify database connectivity

## ✅ Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Database connection works
- [ ] Image upload/storage works
- [ ] Print functionality works
- [ ] Admin dashboard accessible
- [ ] Mobile responsiveness verified
- [ ] HTTPS enabled
- [ ] Error monitoring set up
- [ ] Backup strategy implemented

---

**Your Strip Photobooth is now live! 🎉**
