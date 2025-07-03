const cron = require("node-cron");
const Strip = require("../models/Strip");
const cloudinary = require("../config/cloudinary");

module.exports = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("🧹 Running cleanup task...");
      const cutoff = new Date(Date.now() - 48*60*60*1000);
      const expired = await Strip.find({ timestamp: { $lt: cutoff } });

      console.log(`🗑️ Found ${expired.length} expired strips to clean up`);

      for (let s of expired) {
        try {
          // Clean up Cloudinary image
          if (s.imageUrl) {
            const pid = s.imageUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`strip-photobooth/${pid}`);
            console.log(`✅ Deleted image from Cloudinary: ${pid}`);
          }

          // Clean up logo if exists
          if (s.logo) {
            const logoPid = s.logo.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`strip-photobooth/logos/${logoPid}`);
            console.log(`✅ Deleted logo from Cloudinary: ${logoPid}`);
          }

          // Remove from database using deleteOne instead of deprecated remove()
          await Strip.deleteOne({ _id: s._id });
          console.log(`✅ Deleted strip from database: ${s._id}`);
        } catch (error) {
          console.error(`❌ Error cleaning up strip ${s._id}:`, error);
        }
      }

      console.log("✅ Cleanup task completed");
    } catch (error) {
      console.error("❌ Cleanup task failed:", error);
    }
  });
};
