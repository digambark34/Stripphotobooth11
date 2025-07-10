const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for monitoring
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    
    // Get uptime
    const uptime = process.uptime();
    
    // Format uptime
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Return health status
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "strip-photobooth-api",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        name: mongoose.connection.name || "unknown"
      },
      uptime: formattedUptime,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      }
    });
  } catch (error) {
    console.error("❌ Health check error:", error);
    res.status(500).json({
      status: "error",
      message: "Health check failed",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error"
    });
  }
});

module.exports = router;
