const Settings = require('../models/Settings');
const cloudinary = require('../config/cloudinary');

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findById('photobooth-settings');

    // ✅ DEBUG: Log what we found in database
    console.log('🔍 DEBUG: Settings from database:', JSON.stringify(settings, null, 2));

    // If no settings exist, create default settings
    if (!settings) {
      settings = new Settings({
        eventName: '',
        templateUrl: null,
        textStyle: {
          fontSize: 60,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          textColor: '#8B5CF6',
          textShadow: true,
          textGradient: true,
          decorativeLine: false
        }
      });
      await settings.save();
      console.log('✅ Created default settings with text styling');
    }

    // ✅ DEBUG: Log what we're sending back
    console.log('📤 DEBUG: Sending settings to frontend:', JSON.stringify(settings, null, 2));

    res.json(settings);
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({
      message: '❌ Error fetching settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const { eventName, template, textStyle } = req.body;

    // ✅ DEBUG: Log what we received
    console.log('📥 DEBUG: Update request received:', JSON.stringify({ eventName, template: template ? 'template data present' : 'no template', textStyle }, null, 2));

    let settings = await Settings.findById('photobooth-settings');
    if (!settings) {
      settings = new Settings();
    }

    // ✅ DEBUG: Log current settings before update
    console.log('🔍 DEBUG: Current settings before update:', JSON.stringify(settings, null, 2));

    // Update event name
    if (eventName !== undefined) {
      console.log(`🏷️ DEBUG: Updating eventName from "${settings.eventName}" to "${eventName}"`);
      settings.eventName = eventName;
    }

    // Update text styling
    if (textStyle !== undefined) {
      console.log('🎨 Updating text style:', textStyle);
      settings.textStyle = {
        ...settings.textStyle,
        ...textStyle
      };
      console.log('✅ Text style updated to:', settings.textStyle);
    }

    // Handle template upload to Cloudinary
    if (template && template.startsWith('data:image/')) {
      // Delete old template from Cloudinary if exists
      if (settings.templatePublicId) {
        try {
          await cloudinary.uploader.destroy(settings.templatePublicId);
          console.log(`✅ Deleted old template from Cloudinary: ${settings.templatePublicId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to delete old template: ${error.message}`);
        }
      }

      // Upload new template to Cloudinary
      const templateUploadResult = await cloudinary.uploader.upload(template, {
        folder: 'strip-photobooth/templates',
        public_id: `template_${Date.now()}`,
        resource_type: 'image'
      });

      settings.templateUrl = templateUploadResult.secure_url;
      settings.templatePublicId = templateUploadResult.public_id;
      console.log(`✅ Template uploaded to Cloudinary: ${templateUploadResult.secure_url}`);
    }



    await settings.save();
    console.log('✅ Settings updated successfully');

    res.json({
      message: '✅ Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      message: '❌ Error updating settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const settings = await Settings.findById('photobooth-settings');
    if (!settings) {
      return res.status(404).json({ message: '❌ Settings not found' });
    }

    // Delete template from Cloudinary
    if (settings.templatePublicId) {
      try {
        await cloudinary.uploader.destroy(settings.templatePublicId);
        console.log(`✅ Deleted template from Cloudinary: ${settings.templatePublicId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete template from Cloudinary: ${error.message}`);
      }
    }

    // Clear template from settings
    settings.templateUrl = null;
    settings.templatePublicId = null;
    await settings.save();

    res.json({
      message: '✅ Template deleted successfully',
      settings
    });
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      message: '❌ Error deleting template',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};


