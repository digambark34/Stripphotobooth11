# 🌐 Netlify URL Consistency Guide

## 🎯 Goal: Keep Your URL Constant

Your Netlify URL should NEVER change, even after multiple deployments and updates.

## 📋 Step-by-Step Instructions

### 1. Initial Deployment
1. Connect your GitHub repo to Netlify
2. Let it deploy with the auto-generated URL first
3. Note the random URL (e.g., `https://amazing-app-123456.netlify.app`)

### 2. Set Custom Site Name
1. Go to Netlify Dashboard
2. Click on your site
3. Go to **Site settings** → **General**
4. Under "Site details", click **"Change site name"**
5. Enter your preferred name: `strip-photobooth-yourname`
   - Must be unique across all Netlify sites
   - Use lowercase letters, numbers, and hyphens only
   - Examples: `strip-photobooth-john`, `my-photobooth-app`, `wedding-photobooth-2024`

### 3. Confirm New URL
- Your new URL: `https://strip-photobooth-yourname.netlify.app`
- This URL is now **PERMANENT** and will never change
- All future deployments will use this same URL

### 4. Update Backend CORS
1. Update your Render backend environment variables
2. Set `CORS_ORIGIN=https://strip-photobooth-yourname.netlify.app`
3. Redeploy backend if needed

## ✅ Benefits of Custom Site Name

- **Constant URL**: Never changes, even with 100+ deployments
- **Professional**: Looks better than random generated names
- **Memorable**: Easy to share and remember
- **Reliable**: Links never break due to URL changes

## 🔄 Auto-Deployment Process

Once set up:
1. Make changes to your code
2. Push to GitHub: `git push origin main`
3. Netlify automatically deploys
4. **URL stays exactly the same**: `https://strip-photobooth-yourname.netlify.app`
5. Changes are live in 1-3 minutes

## 🚨 Important Notes

- **Set custom name EARLY**: Do this right after first deployment
- **Choose wisely**: Site name cannot be changed easily later
- **Keep it simple**: Use descriptive, professional names
- **Test immediately**: Verify the new URL works before sharing

## 🎉 Result

Your Strip Photobooth will have a permanent, professional URL that never changes:
- ✅ `https://strip-photobooth-yourname.netlify.app`
- ✅ Works forever, through all updates
- ✅ Professional and memorable
- ✅ Perfect for sharing with clients

## 🆘 Troubleshooting

**"Site name already taken"**
- Try variations: `strip-photobooth-yourname-2024`
- Add your location: `strip-photobooth-chicago`
- Use your business name: `photobooth-mybusiness`

**URL not updating**
- Wait 5-10 minutes for DNS propagation
- Clear browser cache
- Try incognito/private browsing mode
