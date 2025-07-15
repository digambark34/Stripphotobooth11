const Strip = require('../models/Strip');
const cloudinary = require('../config/cloudinary');

exports.uploadStrip = async (req, res) => {
  try {
    const { image, eventName, template } = req.body;

    // ✅ Enhanced Validation
    if (!image) {
      return res.status(400).json({ message: "❌ Image data is missing" });
    }

    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ message: "❌ Invalid image format" });
    }

    // ✅ Upload main image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: 'strip-photobooth',
      public_id: `strip_${Date.now()}`,
      resource_type: 'image'
    });

    console.log(`✅ Strip uploaded to Cloudinary: ${uploadResult.secure_url}`);



    // ✅ Save to MongoDB
    const newStrip = new Strip({
      imageUrl: uploadResult.secure_url,
      eventName,
      template: template
    });

    await newStrip.save();
    console.log(`✅ Strip saved to database with ID: ${newStrip._id}`);

    res.status(201).json({
      message: "✅ Upload successful",
      imageUrl: uploadResult.secure_url,
      stripId: newStrip._id,
    });

  } catch (error) {
    console.error("❌ Upload Error:", error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "❌ Validation error",
        error: error.message
      });
    }

    if (error.http_code) {
      // Cloudinary error
      return res.status(500).json({
        message: "❌ Image upload failed",
        error: "Failed to upload image to cloud storage"
      });
    }

    // Generic server error
    res.status(500).json({
      message: "❌ Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    });
  }
};

exports.getStrips = async (_req, res) => {
  try {
    const strips = await Strip.find().sort({ timestamp: -1 });
    res.json(strips);
  } catch (error) {
    console.error("❌ Error fetching strips:", error);
    res.status(500).json({
      message: "❌ Error fetching strips",
      error: process.env.NODE_ENV === 'development' ? error.message : "Database error"
    });
  }
};

exports.deleteStrip = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the strip to get Cloudinary URLs before deletion
    const strip = await Strip.findById(id);
    if (!strip) {
      return res.status(404).json({ message: "❌ Strip not found" });
    }

    // Delete images from Cloudinary
    if (strip.imageUrl) {
      // Extract public_id from Cloudinary URL
      const publicId = strip.imageUrl.split('/').pop().split('.')[0];
      const fullPublicId = `strip-photobooth/${publicId}`;
      await cloudinary.uploader.destroy(fullPublicId);
      console.log(`✅ Deleted image from Cloudinary: ${fullPublicId}`);
    }



    // Delete from database
    await Strip.findByIdAndDelete(id);
    console.log(`✅ Deleted strip from database with ID: ${id}`);

    res.json({ message: `✅ Deleted strip with id: ${id}` });
  } catch (error) {
    console.error("❌ Error deleting strip:", error);

    if (error.name === 'CastError') {
      return res.status(400).json({ message: "❌ Invalid strip ID" });
    }

    res.status(500).json({
      message: "❌ Error deleting strip",
      error: process.env.NODE_ENV === 'development' ? error.message : "Server error"
    });
  }
};

exports.deleteAllStrips = async (req, res) => {
  try {
    // Get all strips to delete their Cloudinary images
    const strips = await Strip.find({});

    if (strips.length === 0) {
      return res.json({ message: "ℹ️ No strips found to delete" });
    }

    console.log(`🗑️ Starting deletion of ${strips.length} strips...`);

    // Delete all images from Cloudinary
    let deletedImages = 0;

    for (const strip of strips) {
      // Delete main image from Cloudinary
      if (strip.imageUrl) {
        try {
          const publicId = strip.imageUrl.split('/').pop().split('.')[0];
          const fullPublicId = `strip-photobooth/${publicId}`;
          await cloudinary.uploader.destroy(fullPublicId);
          deletedImages++;
          console.log(`✅ Deleted image from Cloudinary: ${fullPublicId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete image from Cloudinary: ${error.message}`);
        }
      }
    }

    // Delete all strips from database
    const deleteResult = await Strip.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} strips from database`);

    res.json({
      message: `✅ Successfully deleted all ${deleteResult.deletedCount} strips`,
      details: {
        stripsDeleted: deleteResult.deletedCount,
        imagesDeleted: deletedImages
      }
    });
  } catch (error) {
    console.error("❌ Error deleting all strips:", error);

    res.status(500).json({
      message: "❌ Error deleting all strips",
      error: process.env.NODE_ENV === 'development' ? error.message : "Server error"
    });
  }
};

exports.markPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedStrip = await Strip.findByIdAndUpdate(
      id,
      { printed: true },
      { new: true }
    );

    if (!updatedStrip) {
      return res.status(404).json({ message: "❌ Strip not found" });
    }

    console.log(`✅ Marked strip as printed with ID: ${id}`);
    res.json({ message: `✅ Marked strip as printed with id: ${id}`, strip: updatedStrip });
  } catch (error) {
    console.error("❌ Error marking printed:", error);

    if (error.name === 'CastError') {
      return res.status(400).json({ message: "❌ Invalid strip ID" });
    }

    res.status(500).json({
      message: "❌ Error marking printed",
      error: process.env.NODE_ENV === 'development' ? error.message : "Server error"
    });
  }
};
