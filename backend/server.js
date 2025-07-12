require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// ✅ Disable mongoose buffering for production (separate from connection options)
mongoose.set('bufferCommands', false);
const stripRoutes = require("./routes/stripRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const healthRoutes = require("./routes/healthRoutes");

// ✅ Fix: Set strictQuery AFTER mongoose import
mongoose.set('strictQuery', true);

// ✅ Check MONGODB_URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ Error: MONGODB_URI not set in .env file");
  process.exit(1);
}

console.log("🔍 Attempting to connect to MongoDB...");
console.log("🔗 Connection string:", mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

// ✅ MongoDB Atlas Connection - Optimized for 1000+ concurrent users
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 100,                     // Increased for 1000+ users
  minPoolSize: 10,                      // Maintain minimum connections
  serverSelectionTimeoutMS: 5000,       // Retry for 5 seconds if DB not available
  socketTimeoutMS: 45000,               // Timeout per operation
  connectTimeoutMS: 10000,              // Connection timeout if Mongo is down
  maxIdleTimeMS: 30000                  // Close connections after 30s idle
})
.then(() => {
  console.log("✅ MongoDB connected successfully");
  console.log(`✅ Database: ${mongoose.connection.name}`);
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);

  // Don't exit in development, but log the issue
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ Exiting in production mode");
    process.exit(1);
  } else {
    console.log("⚠️ Continuing in development mode...");
  }
});

// ✅ Initialize Express App
const app = express();

// ✅ Production Security Headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow Cloudinary embeds
  contentSecurityPolicy: false // Disable CSP for now (can be configured later)
}));

// ✅ Rate Limiting for Live Events (1000 users)
const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // 5 uploads per minute per IP
  message: {
    error: "Too many uploads. Please wait a moment before trying again."
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 requests per minute per IP
  message: {
    error: "Too many requests. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/strips', uploadLimiter); // Strict limit for uploads
app.use('/api/', generalLimiter); // General limit for other endpoints

// ✅ Local Development CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS check for origin:', origin);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }

    // Allow localhost and local development
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
      console.log('✅ CORS: Allowing local development origin:', origin);
      return callback(null, true);
    }

    // Allow Netlify deployment
    if (origin === 'https://stripphotobooth11.netlify.app' || origin.includes('netlify.app')) {
      console.log('✅ CORS: Allowing Netlify origin:', origin);
      return callback(null, true);
    }

    console.log('❌ CORS: Rejecting origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Optimized payload limits for photo strip uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ✅ Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ✅ API Routes
app.use("/api/health", healthRoutes);
app.use("/api/strips", stripRoutes);
app.use("/api/settings", settingsRoutes);

// ✅ 404 Handler
app.use('*', (_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Global Error Handler
app.use((error, _req, res, _next) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});



// ✅ Start Backend Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ✅ Set server timeout for large uploads
server.timeout = 60000; // 60 seconds timeout

// ✅ Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('✅ HTTP server closed');

    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ✅ Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
