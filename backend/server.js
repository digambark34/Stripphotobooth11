require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
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
  maxPoolSize: 50,                      // Allow more concurrent users
  serverSelectionTimeoutMS: 5000,       // Retry for 5 seconds if DB not available
  socketTimeoutMS: 45000,               // Timeout per operation (default is 30s)
  connectTimeoutMS: 10000               // Connection timeout if Mongo is down
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// ✅ Initialize Express App
const app = express();

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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
