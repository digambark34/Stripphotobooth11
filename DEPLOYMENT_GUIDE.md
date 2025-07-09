# 🚀 Photo Booth Deployment Guide

## Overview
This guide will help you deploy your photo booth application:
- **Backend**: Render (Node.js/Express server)
- **Frontend**: Netlify (React application)
- **Database**: MongoDB Atlas (already configured)
- **Storage**: Cloudinary (already configured)

## 📋 Prerequisites
- GitHub account
- Netlify account (free)
- Render account (free)
- Your MongoDB and Cloudinary credentials (already have)

---

## 🔧 Step 1: Prepare Your Code for Deployment

### 1.1 Create a GitHub Repository
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your code
git commit -m "Initial commit - Photo Booth Application"

# Create repository on GitHub and push
git remote add origin https://github.com/yourusername/strip-photobooth.git
git branch -M main
git push -u origin main
```

---

## 🖥️ Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your GitHub repository

### 2.2 Deploy Backend Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `strip-photobooth-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2.3 Set Environment Variables
Add these environment variables in Render dashboard:
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://digambarkothawale05:digambar@cluster0.cyhpvwv.mongodb.net/
CLOUDINARY_CLOUD_NAME=dfhelz5am
CLOUDINARY_API_KEY=685936334853159
CLOUDINARY_API_SECRET=ifOyel7-dC_ZmK9S-rRPKsH7ZnU
FRONTEND_URL=https://your-netlify-app.netlify.app
JWT_SECRET=your_secure_jwt_secret_change_this
```

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://your-app-name.onrender.com`

---

## 🌐 Step 3: Deploy Frontend to Netlify

### 3.1 Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub account

### 3.2 Deploy Frontend
1. Click "Add new site" → "Import an existing project"
2. Choose GitHub and select your repository
3. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`

### 3.3 Set Environment Variables
In Netlify dashboard → Site settings → Environment variables:
```
REACT_APP_API_BASE_URL=https://your-render-backend.onrender.com
```

### 3.4 Deploy
1. Click "Deploy site"
2. Wait for deployment (3-5 minutes)
3. Note your frontend URL: `https://your-app-name.netlify.app`

---

## 🔄 Step 4: Update CORS Configuration

### 4.1 Update Backend Environment
1. Go to Render dashboard
2. Update `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-actual-netlify-url.netlify.app
   ```
3. Redeploy the service

---

## ✅ Step 5: Test Your Deployment

### 5.1 Test Frontend
1. Visit your Netlify URL
2. Check if the photo booth loads
3. Test camera access
4. Try capturing photos

### 5.2 Test Backend
1. Visit `https://your-render-backend.onrender.com/api/settings`
2. Should return JSON with settings

### 5.3 Test Full Flow
1. Capture 3 photos
2. Submit strip
3. Go to admin dashboard
4. Check if strips appear
5. Test download and print

---

## 🛠️ Troubleshooting

### Common Issues:

**1. CORS Errors**
- Update `FRONTEND_URL` in Render environment variables
- Redeploy backend service

**2. API Connection Failed**
- Check `REACT_APP_API_BASE_URL` in Netlify
- Ensure backend is running on Render

**3. Camera Not Working**
- Ensure HTTPS is enabled (automatic on Netlify)
- Check browser permissions

**4. Images Not Loading**
- Verify Cloudinary credentials
- Check network connectivity

---

## 📱 Production URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.netlify.app`
- **Backend**: `https://your-backend.onrender.com`
- **Admin**: `https://your-app.netlify.app/admin`

---

## 🔒 Security Notes

1. **Change JWT Secret**: Use a secure random string
2. **Environment Variables**: Never commit `.env` files
3. **HTTPS**: Both platforms provide HTTPS automatically
4. **Database**: MongoDB Atlas has built-in security

---

## 💡 Tips for Success

1. **Free Tier Limits**:
   - Render: 750 hours/month (enough for most use)
   - Netlify: 100GB bandwidth/month
   - MongoDB Atlas: 512MB storage

2. **Performance**:
   - Render services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds
   - Consider upgrading for production events

3. **Monitoring**:
   - Check Render logs for backend issues
   - Use Netlify analytics for frontend metrics
   - Monitor MongoDB Atlas for database performance

---

## 🎉 You're Ready!

Your photo booth is now deployed and ready for production use!
