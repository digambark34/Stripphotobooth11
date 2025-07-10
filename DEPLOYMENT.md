# 🚀 Strip Photobooth Deployment Guide

Complete guide for deploying Strip Photobooth to GitHub, Netlify (frontend), and Render (backend) with auto-deployment.

## 📋 Prerequisites

- GitHub account
- Netlify account (free tier available)
- Render account (free tier available)
- MongoDB Atlas account (free tier available)
- Cloudinary account (free tier available)

## 🔧 Pre-Deployment Setup

### 1. Environment Variables Setup

Run the setup script to create environment files:
```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

Or manually copy the example files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configure Environment Variables

#### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/strip_photobooth
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=https://your-app.netlify.app
JWT_SECRET=your_secure_random_string
ADMIN_PASSWORD=your_secure_password
```

#### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

### 3. Test Local Build

Run the deployment preparation script:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🐙 GitHub Setup

### 1. Create Repository

1. Go to GitHub and create a new repository
2. Name it `strip-photobooth` or your preferred name
3. Make it public or private (your choice)
4. Don't initialize with README (we have one)

### 2. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Strip Photobooth application"
git branch -M main
git remote add origin https://github.com/yourusername/strip-photobooth.git
git push -u origin main
```

## 🌐 Netlify Deployment (Frontend)

### 1. Connect Repository

1. Go to [Netlify](https://netlify.com)
2. Click "New site from Git"
3. Choose GitHub and authorize
4. Select your `strip-photobooth` repository

### 2. Build Settings

Netlify will auto-detect the settings from `netlify.toml`, but verify:

- **Build command**: `cd frontend && npm ci && npm run build`
- **Publish directory**: `frontend/build`
- **Base directory**: `.` (root)

### 3. Environment Variables

In Netlify dashboard → Site settings → Environment variables:

```
REACT_APP_API_URL = https://your-backend-name.onrender.com
```

### 4. Set Custom Site Name (Keep URL Constant)

**IMPORTANT**: To keep your URL constant across deployments:

1. In Netlify dashboard → Site settings → General
2. Click "Change site name"
3. Enter a custom name: `strip-photobooth-yourname` (must be unique)
4. Your URL will be: `https://strip-photobooth-yourname.netlify.app`
5. This URL will NEVER change, even with new deployments

### 5. Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Your constant URL: `https://strip-photobooth-yourname.netlify.app`

## ⚡ Render Deployment (Backend)

### 1. Connect Repository

1. Go to [Render](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your `strip-photobooth` repository

### 2. Service Configuration

Render will use `render.yaml`, but verify these settings:

- **Name**: `strip-photobooth-api`
- **Environment**: `Node`
- **Region**: `Oregon` (or closest to you)
- **Branch**: `main`
- **Build Command**: `cd backend && npm ci && npm run build`
- **Start Command**: `cd backend && npm start`

### 3. Environment Variables

In Render dashboard → Environment:

```
NODE_ENV = production
PORT = 10000
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/strip_photobooth
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret
CORS_ORIGIN = https://your-app.netlify.app
JWT_SECRET = your_secure_random_string_min_32_chars
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your_secure_password
```

### 4. Deploy

1. Click "Create Web Service"
2. Wait for build and deployment
3. Note your Render URL (e.g., `https://strip-photobooth-api.onrender.com`)

## 🔄 Update Frontend with Backend URL

1. Update Netlify environment variables with your Render URL:
   - Go to Netlify dashboard → Site settings → Environment variables
   - Update `REACT_APP_API_URL` with your Render URL
2. Trigger a new deployment in Netlify (your URL stays the same!)

## 🔗 Custom Domain (Optional)

For a completely custom URL:

1. Buy a domain (e.g., `yourphotobooth.com`)
2. In Netlify → Domain settings → Add custom domain
3. Follow DNS configuration instructions
4. Your app will be available at your custom domain
5. URL remains constant forever

## 🗄️ Database Setup (MongoDB Atlas)

### 1. Create Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Choose a cloud provider and region
4. Create cluster (takes 1-3 minutes)

### 2. Database Access

1. Go to Database Access
2. Add a new database user
3. Choose password authentication
4. Save username and password for MONGODB_URI

### 3. Network Access

1. Go to Network Access
2. Add IP Address
3. Choose "Allow access from anywhere" (0.0.0.0/0)
4. Or add your specific IPs

### 4. Get Connection String

1. Go to Clusters → Connect
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `strip_photobooth`

## 🖼️ Cloudinary Setup

### 1. Get Credentials

1. Go to [Cloudinary](https://cloudinary.com)
2. Sign up for free account
3. Go to Dashboard
4. Copy Cloud Name, API Key, and API Secret

### 2. Configure Upload Settings

1. Go to Settings → Upload
2. Enable "Auto-backup" (optional)
3. Set upload presets if needed

## ✅ Verification

### 1. Test Health Endpoints

Backend health check:
```
https://your-backend.onrender.com/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": { "status": "connected" },
  "uptime": "0d 0h 5m 23s"
}
```

### 2. Test Frontend

1. Visit your Netlify URL
2. Allow camera access
3. Take test photos
4. Verify admin panel works

### 3. Test Integration

1. Capture a photo strip
2. Check if it appears in admin panel
3. Test print functionality
4. Verify image uploads to Cloudinary

## 🔄 Auto-Deployment

Both platforms are configured for auto-deployment:

- **Netlify**: Deploys automatically on push to `main` branch
- **Render**: Deploys automatically on push to `main` branch

To deploy changes:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Verify CORS_ORIGIN matches your Netlify URL exactly
2. **Database Connection**: Check MongoDB Atlas IP whitelist and credentials
3. **Build Failures**: Check Node.js version compatibility (use Node 18+)
4. **Environment Variables**: Ensure all required variables are set in both platforms

### Debug Steps

1. Check Render logs for backend errors
2. Check Netlify deploy logs for frontend errors
3. Use browser dev tools to check network requests
4. Verify environment variables are set correctly

### Support

- Netlify: [docs.netlify.com](https://docs.netlify.com)
- Render: [render.com/docs](https://render.com/docs)
- MongoDB Atlas: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

## 🎉 Success!

Your Strip Photobooth is now deployed and ready for use! 

- **Frontend**: https://your-app.netlify.app
- **Backend**: https://your-backend.onrender.com
- **Admin**: https://your-app.netlify.app/admin
