# 📸 Strip Photobooth

A modern, professional photo booth application that creates beautiful 2×6 inch photo strips with custom templates. Perfect for events, parties, and professional photo booth setups.

## ✨ Features

### 🎯 Core Functionality
- **Smart Photo Capture**: Captures all people in frame while completely filling photo boxes
- **Custom Templates**: Upload and use custom background templates
- **Professional Quality**: 600×1800px at 300 DPI for crisp 2×6 inch printing
- **3-Photo Strips**: Creates beautiful strips with 3 different photos
- **Real-time Preview**: See your strip as you capture photos

### 🖨️ Print & Export
- **Direct Printing**: Print exactly what you see in the preview
- **Download Support**: Download strips as high-quality images
- **Universal Printer Support**: Works with inkjet, laser, B&W, and all printer types
- **Perfect Sizing**: Optimized for 2×6 inch GSM paper

### 🎨 Admin Dashboard
- **Strip Management**: View, download, print, and delete photo strips
- **Template Upload**: Upload custom background templates
- **Bulk Operations**: Delete all strips at once
- **Event Settings**: Configure event names and settings
- **Responsive Design**: Works on desktop, tablet, and mobile

### 📱 Responsive Design
- **Multi-Device Support**: Works seamlessly on iPhone, iPad, Android, PC, laptop, and MacBook
- **Touch-Friendly**: Optimized for touch interfaces
- **Modern UI**: Beautiful gradient backgrounds and smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account (for image storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/strip-photobooth.git
   cd strip-photobooth
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your backend URL
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin
   - Backend API: http://localhost:5000

## ⚙️ Configuration

### Backend Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/photobooth

# Cloudinary (for image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security
JWT_SECRET=your_jwt_secret_key_here
```

### Frontend Environment Variables (.env)

```env
REACT_APP_API_BASE_URL=http://localhost:5000
```

## 🗄️ Database Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string

2. **Configure Database Access**
   - Add your IP address to the whitelist
   - Create a database user
   - Update MONGO_URI in backend/.env

## ☁️ Cloudinary Setup

1. **Create Cloudinary Account**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for a free account
   - Get your credentials from the dashboard

2. **Configure Cloudinary**
   - Update CLOUDINARY_* variables in backend/.env
   - Images will be automatically organized in folders

## 📁 Project Structure

```
strip-photobooth/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   ├── public/             # Static files
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js backend API
│   ├── controllers/        # API controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── config/            # Configuration files
│   ├── utils/             # Utility functions
│   └── server.js          # Server entry point
└── README.md              # This file
```

## 🎯 Usage

### For Users (Photo Capture)
1. Visit the main page
2. Allow camera access
3. Click "Capture Photo" to take 3 photos
4. Click "Submit Strip" to save your photo strip

### For Admins
1. Visit `/admin` page
2. Login with admin credentials (default: admin/secret)
3. Upload custom templates
4. Manage photo strips (view, print, download, delete)
5. Configure event settings

## 🖨️ Printing Guide

### Recommended Settings
- **Paper Size**: 2×6 inches
- **Paper Type**: GSM photo paper
- **Quality**: High/Best quality
- **Orientation**: Portrait
- **Margins**: Minimal (0.1 inch)

### Printer Compatibility
- ✅ Inkjet printers
- ✅ Laser printers  
- ✅ Black & white printers
- ✅ Professional photo printers

## 🎨 Template Guidelines

### Template Specifications
- **Dimensions**: 600×1800 pixels
- **Resolution**: 300 DPI
- **Format**: JPEG, PNG, or any image format
- **Photo Areas**: Leave space for 3 photos (480×480px each)

### Template Design Tips
- Use gradient backgrounds for best visual appeal
- Leave clear areas for photo placement
- Consider the 2×6 inch print format
- Test templates before events

## 🚀 Deployment

### Frontend Deployment (Netlify/Vercel)
1. Build the frontend: `npm run build`
2. Deploy the `build` folder
3. Update environment variables for production

### Backend Deployment (Heroku/Railway)
1. Push to your deployment platform
2. Set environment variables
3. Ensure MongoDB Atlas allows connections from your server

### Environment Variables for Production
- Update `REACT_APP_API_BASE_URL` to your backend URL
- Set `NODE_ENV=production` in backend
- Use secure values for `JWT_SECRET`

## 🛠️ Development

### Running in Development Mode
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)  
cd frontend
npm start
```

### API Endpoints
- `GET /api/strips` - Get all photo strips
- `POST /api/strips` - Create new photo strip
- `DELETE /api/strips/:id` - Delete specific strip
- `DELETE /api/strips/all` - Delete all strips
- `POST /api/auth/login` - Admin login

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/strip-photobooth/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🙏 Acknowledgments

- Built with React and Node.js
- Uses MongoDB for data storage
- Cloudinary for image management
- Tailwind CSS for styling

---

**Made with ❤️ for creating memorable moments**
