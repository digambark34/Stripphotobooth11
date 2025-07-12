import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import PrintStrip from "./PrintStrip";

export default function AdminDashboard() {
  const [auth, setAuth] = useState(true); // Always authenticated - bypass login
  const [strips, setStrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [printingStrip, setPrintingStrip] = useState(null);
  const [notification, setNotification] = useState(null);
  const [settings, setSettings] = useState({
    eventName: '',
    template: null, // Template image instead of background color
    // Text styling options
    textStyle: {
      fontSize: 60, // Bigger default size
      fontFamily: 'Arial',
      fontWeight: 'bold',
      textColor: '#8B5CF6',
      textShadow: true,
      textGradient: true,
      decorativeLine: false // Remove decorative line by default
    }
  });
  const [showSettings, setShowSettings] = useState(false);

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Login bypassed - direct admin access

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextStyleChange = (styleField, value) => {
    setSettings(prev => ({
      ...prev,
      textStyle: {
        ...prev.textStyle,
        [styleField]: value
      }
    }));
  };



  const handleTemplateUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Upload template to backend (MongoDB + Cloudinary)
            const response = await axios.put(`${API_BASE_URL}/api/settings`, {
              template: e.target.result // Send as data URL to backend
            });
            console.log('✅ Template upload response:', response.data);

            // Reload settings from backend to ensure sync
            await loadSettings();
          } catch (error) {
            console.error('Template upload failed:', error);
            setNotification({
              type: 'error',
              message: `❌ Failed to upload template: ${error.response?.data?.message || error.message}`
            });
            setTimeout(() => setNotification(null), 3000);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setLoading(false);
        setNotification({
          type: 'error',
          message: '❌ Failed to read template file.'
        });
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  const deleteTemplate = async () => {
    if (window.confirm('Are you sure you want to delete the template? This will also delete it from Cloudinary. This action cannot be undone.')) {
      try {
        setLoading(true);

        // Delete template from backend (MongoDB + Cloudinary)
        const response = await axios.delete(`${API_BASE_URL}/api/settings/template`);
        console.log('✅ Template deletion response:', response.data);

        // Reload settings from backend to ensure sync
        await loadSettings();

        // Clear the file input
        const fileInput = document.getElementById('templateUpload');
        if (fileInput) {
          fileInput.value = '';
        }

        // Show success notification
        setNotification({
          type: 'success',
          message: '🗑️ Template deleted from MongoDB and Cloudinary successfully!'
        });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('Template deletion failed:', error);
        setNotification({
          type: 'error',
          message: `❌ Failed to delete template: ${error.response?.data?.message || error.message}`
        });
        setTimeout(() => setNotification(null), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);

      // Save settings to backend (MongoDB + Cloudinary if template included)
      const response = await axios.put(`${API_BASE_URL}/api/settings`, {
        eventName: settings.eventName,
        template: settings.template,
        textStyle: settings.textStyle
      });
      console.log('✅ Settings save response:', response.data);

      // Reload settings from backend to ensure sync
      await loadSettings();

      setNotification({
        type: 'success',
        message: '⚙️ Settings saved to MongoDB and Cloudinary successfully!'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Settings save failed:', error);
      setNotification({
        type: 'error',
        message: `❌ Failed to save settings: ${error.response?.data?.message || error.message}`
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings`);
      setSettings({
        eventName: response.data.eventName || '',
        template: response.data.templateUrl || null,
        textStyle: response.data.textStyle || {
          fontSize: 60, // Bigger default size
          fontFamily: 'Arial',
          fontWeight: 'bold',
          textColor: '#8B5CF6',
          textShadow: true,
          textGradient: true,
          decorativeLine: false // Remove decorative line
        }
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Keep default settings if loading fails
    }
  }, [API_BASE_URL]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create axios instance with optimized timeout for admin operations
      const adminAxios = axios.create({
        timeout: 30000, // 30 seconds for loading strips
      });

      const res = await adminAxios.get(`${API_BASE_URL}/api/strips`);
      setStrips(res.data);
      setNotification({ type: 'success', message: `✅ Loaded ${res.data.length} strips` });
    } catch (error) {
      let errorMessage = `Failed to load strips: ${error.response?.data?.message || error.message}`;
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Failed to load strips: Connection timeout. Please check your internet connection.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const mark = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/strips/${id}/mark-printed`);
      setNotification({ type: 'success', message: '✅ Strip marked as printed' });
      load();
    } catch (error) {
      setError(`Failed to mark strip: ${error.response?.data?.message || error.message}`);
    }
  };

  const downloadAsPDF = async (strip) => {
    try {
      setLoading(true);

      // Fetch the image as blob to ensure proper download
      const response = await fetch(strip.imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-strip-${strip.eventName || 'untitled'}-${new Date(strip.timestamp).toLocaleDateString().replace(/\//g, '-')}.jpg`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: '📥 Photo strip downloaded successfully to your Downloads folder!'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setNotification({
        type: 'error',
        message: '❌ Failed to download photo strip. Please try again.'
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Are you sure you want to delete this strip?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/strips/${id}`);
      setNotification({ type: 'success', message: '✅ Strip deleted successfully' });
      load();
    } catch (error) {
      setError(`Failed to delete strip: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteAllStrips = async () => {
    if (strips.length === 0) {
      setNotification({ type: 'info', message: 'ℹ️ No strips to delete' });
      return;
    }

    const confirmMessage = `⚠️ Are you sure you want to delete ALL ${strips.length} strips?\n\nThis action cannot be undone and will permanently delete all photo strips and their images from Cloudinary.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/api/strips/all`);
      setNotification({ type: 'success', message: `✅ Successfully deleted all ${strips.length} strips` });
      setStrips([]); // Clear the strips array immediately
      load(); // Reload to confirm
    } catch (error) {
      setError(`Failed to delete all strips: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/strips`);
      const data = await response.json();
      setNotification({
        type: 'success',
        message: `✅ API test successful: Found ${data.length} strips`
      });
    } catch (error) {
      setError(`API test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    if(auth) load();
  }, [auth, load]);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('photoBoothSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Test API connection on component mount
  useEffect(() => {
    // Test basic connectivity silently
    fetch(`${API_BASE_URL}/api/strips`)
      .then(response => response.json())
      .then(() => {
        // Silent success - no notification needed for background check
      })
      .catch(error => {
        // Only show error if it's a real connectivity issue
        if (error.name !== 'AbortError') {
          setError('API connection failed. Please check if the server is running.');
        }
      });
  }, [API_BASE_URL]);

  // Load settings when authenticated
  useEffect(() => {
    if (auth) {
      loadSettings();
    }
  }, [auth, loadSettings]);

  // Direct admin access - no login required

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center text-center sm:text-left">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 sm:mr-4">
              <span className="text-lg sm:text-xl">🛠️</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-300">Manage your photo strips</p>
            </div>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setAuth(false)}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Enhanced Settings Section */}
        {showSettings && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 mb-8 shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-2xl mr-4 shadow-xl">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                      Settings
                    </h2>
                    <p className="text-white/60 text-sm mt-1">Configure your photobooth experience</p>
                  </div>
                </div>
                <div className="w-20 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              </div>

              <div className="grid gap-8">
                {/* Enhanced Event Name */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <label className="flex items-center text-white font-bold mb-4 text-lg">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-3 rounded-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl">🎉</span>
                    </div>
                    <div>
                      <span>Event Name</span>
                      <span className="text-white/60 text-sm font-normal block">Optional - appears on photo strips</span>
                    </div>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={settings.eventName}
                      onChange={(e) => handleSettingsChange('eventName', e.target.value)}
                      placeholder="e.g., Wedding Reception, Birthday Party..."
                      className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 text-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>

                {/* Text Styling Options */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <label className="flex items-center text-white font-bold mb-6 text-lg">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-3 rounded-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl">✨</span>
                    </div>
                    <div>
                      <span>Text Styling</span>
                      <span className="text-white/60 text-sm font-normal block">Customize event name appearance</span>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Font Size */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Font Size (Auto-fits to strip width)</label>
                      <input
                        type="range"
                        min="40"
                        max="120"
                        value={settings.textStyle.fontSize}
                        onChange={(e) => handleTextStyleChange('fontSize', parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-white/60 text-xs mt-1">{settings.textStyle.fontSize}px (Smart sizing ensures text fits perfectly)</div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Font Style</label>
                      <select
                        value={settings.textStyle.fontFamily}
                        onChange={(e) => handleTextStyleChange('fontFamily', e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      >
                        <option value="Arial">Arial (Modern & Clean)</option>
                        <option value="Georgia">Georgia (Elegant Serif)</option>
                        <option value="Times New Roman">Times New Roman (Classic)</option>
                        <option value="Helvetica">Helvetica (Professional)</option>
                        <option value="Verdana">Verdana (Bold & Clear)</option>
                        <option value="Trebuchet MS">Trebuchet MS (Stylish)</option>
                        <option value="Palatino">Palatino (Sophisticated)</option>
                        <option value="Garamond">Garamond (Traditional)</option>
                        <option value="Book Antiqua">Book Antiqua (Vintage)</option>
                        <option value="Lucida Grande">Lucida Grande (Friendly)</option>
                        <option value="Tahoma">Tahoma (Compact)</option>
                        <option value="Courier New">Courier New (Typewriter)</option>
                        <option value="Impact">Impact (Bold Statement)</option>
                        <option value="Comic Sans MS">Comic Sans MS (Playful)</option>
                        <option value="Brush Script MT">Brush Script MT (Handwritten)</option>
                        <option value="Lucida Handwriting">Lucida Handwriting (Script)</option>
                      </select>
                    </div>

                    {/* Font Weight */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Font Weight</label>
                      <select
                        value={settings.textStyle.fontWeight}
                        onChange={(e) => handleTextStyleChange('fontWeight', e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="bolder">Extra Bold</option>
                      </select>
                    </div>

                    {/* Text Color */}
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Text Color</label>
                      <input
                        type="color"
                        value={settings.textStyle.textColor}
                        onChange={(e) => handleTextStyleChange('textColor', e.target.value)}
                        className="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.textStyle.textShadow}
                        onChange={(e) => handleTextStyleChange('textShadow', e.target.checked)}
                        className="w-5 h-5 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                      />
                      <span className="text-white/80">Text Shadow</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.textStyle.textGradient}
                        onChange={(e) => handleTextStyleChange('textGradient', e.target.checked)}
                        className="w-5 h-5 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
                      />
                      <span className="text-white/80">Gradient Effect</span>
                    </label>
                  </div>

                  {/* Enhanced Preview */}
                  {settings.eventName && (
                    <div className="mt-6 p-6 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/80 text-sm font-medium mb-4">Live Preview:</p>
                      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 rounded-lg">
                        <div
                          className="text-center"
                          style={{
                            fontSize: `${Math.min(settings.textStyle.fontSize * 0.4, 28)}px`,
                            fontFamily: settings.textStyle.fontFamily,
                            fontWeight: settings.textStyle.fontWeight,
                            color: settings.textStyle.textGradient ? 'transparent' : settings.textStyle.textColor,
                            background: settings.textStyle.textGradient
                              ? `linear-gradient(45deg, ${settings.textStyle.textColor}, #EC4899, #F59E0B)`
                              : 'none',
                            WebkitBackgroundClip: settings.textStyle.textGradient ? 'text' : 'initial',
                            backgroundClip: settings.textStyle.textGradient ? 'text' : 'initial',
                            textShadow: settings.textStyle.textShadow ? '3px 3px 6px rgba(0,0,0,0.6)' : 'none',
                            marginBottom: '8px'
                          }}
                        >
                          {settings.eventName}
                        </div>


                        <div className="mt-6 pt-4 border-t border-white/20">
                          <div
                            className="text-center"
                            style={{
                              fontSize: '18px', // Fixed bigger size for preview
                              fontFamily: 'Arial, sans-serif',
                              fontStyle: 'normal',
                              color: settings.textStyle.textColor,
                              fontWeight: 'normal',
                              textShadow: settings.textStyle.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none'
                            }}
                          >
                            {new Date().toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-white/50 mt-1 text-center">
                            (Date appears at bottom of strip)
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-white/60 text-center">
                        Font: {settings.textStyle.fontFamily} • Size: {settings.textStyle.fontSize}px •
                        {settings.textStyle.textGradient ? ' Gradient' : ' Solid'} •
                        {settings.textStyle.textShadow ? ' Shadow' : ' No Shadow'}
                      </div>

                      <div className="mt-4 text-center">
                        <button
                          onClick={saveSettings}
                          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                        >
                          💾 Apply Text Styling
                        </button>

                        <div className="mt-3 text-xs text-white/60 text-center">
                          💡 Tip: Text styling applies to new photo strips. Capture page updates automatically.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Template Upload */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <label className="flex items-center text-white font-bold mb-4 text-lg">
                    <div className="bg-gradient-to-r from-pink-400 to-red-400 p-3 rounded-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl">🖼️</span>
                    </div>
                    <div>
                      <span>Strip Template</span>
                      <span className="text-white/60 text-sm font-normal block">Upload custom template background (JPEG, PNG, etc.)</span>
                    </div>
                  </label>

                  <div className="flex items-center space-x-4 flex-wrap gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTemplateUpload}
                      className="hidden"
                      id="templateUpload"
                    />
                    <label
                      htmlFor="templateUpload"
                      className="px-6 py-3 bg-gradient-to-r from-pink-500/20 to-red-500/20 border border-pink-400/30 rounded-xl text-white cursor-pointer hover:from-pink-500/30 hover:to-red-500/30 transition-all duration-300 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      📁 Choose Template
                    </label>

                    {settings.template && (
                      <button
                        onClick={deleteTemplate}
                        className="px-6 py-3 bg-gradient-to-r from-red-500/80 to-pink-500/80 hover:from-red-600/90 hover:to-pink-600/90 border border-red-400/50 rounded-xl text-white transition-all duration-300 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                        title="Delete template permanently"
                      >
                        🗑️ Delete Template
                      </button>
                    )}

                    <button
                      onClick={loadSettings}
                      disabled={loading}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl text-white hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 flex items-center space-x-2"
                      title="Refresh template and settings"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <span>🔄</span>
                          <span className="hidden sm:inline">Refresh</span>
                        </>
                      )}
                    </button>

                    <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
                      <span className="text-white/80 text-sm font-medium">
                        {settings.template ? '✅ Template uploaded' : '📄 No template chosen'}
                      </span>
                    </div>
                  </div>

                  {settings.template && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/80 text-sm font-medium mb-2">Template Preview:</p>
                      <div className="w-32 h-48 bg-white/10 rounded-lg overflow-hidden border border-white/20">
                        <img
                          src={settings.template}
                          alt="Template preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>



                {/* Enhanced Save Button */}
                <div className="flex justify-center pt-6">
                  <button
                    onClick={saveSettings}
                    className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-emerald-500/25 relative overflow-hidden group"
                  >
                    <div className="relative z-10 flex items-center space-x-3">
                      <span className="text-2xl">💾</span>
                      <span>Save Settings</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <span className="text-lg sm:text-2xl">📸</span>
              </div>
              <div>
                <p className="text-gray-300 text-xs sm:text-sm">Total Strips</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{strips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <span className="text-lg sm:text-2xl">✅</span>
              </div>
              <div>
                <p className="text-gray-300 text-xs sm:text-sm">Printed</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{strips.filter(s => s.printed).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <span className="text-lg sm:text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-gray-300 text-xs sm:text-sm">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{strips.filter(s => !s.printed).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg sm:rounded-xl">
            <div className="flex items-center">
              <span className="text-lg sm:text-xl mr-2">⚠️</span>
              <span className="text-sm sm:text-base"><strong>Error:</strong> {error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <button
            onClick={load}
            disabled={loading}
            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transform hover:scale-105 active:scale-95'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                <span className="hidden sm:inline">Loading...</span>
                <span className="sm:hidden">...</span>
              </div>
            ) : (
              <>
                <span className="hidden sm:inline">🔄 Refresh Strips</span>
                <span className="sm:hidden">🔄 Refresh</span>
              </>
            )}
          </button>

          <button
            onClick={testAPI}
            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <span className="hidden sm:inline">🧪 Test API</span>
            <span className="sm:hidden">🧪 Test</span>
          </button>

          <button
            onClick={() => window.open('/')}
            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <span className="hidden sm:inline">📷 Go to Camera</span>
            <span className="sm:hidden">📷 Camera</span>
          </button>

          {strips.length > 0 && (
            <button
              onClick={deleteAllStrips}
              disabled={loading}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="hidden sm:inline">🗑️ Delete All ({strips.length})</span>
              <span className="sm:hidden">🗑️ All</span>
            </button>
          )}
        </div>

        {/* Strips Grid */}
        {strips.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-8 sm:p-12 border border-white/20 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="text-2xl sm:text-3xl lg:text-4xl">📷</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No Strips Found</h3>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 px-4">Start capturing some amazing photo strips!</p>
            <button
              onClick={() => window.open('http://localhost:3000')}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              📸 Start Capturing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {strips.map(s=>(
              <div key={s._id} className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                {/* Image */}
                <div className="relative mb-3 sm:mb-4">
                  <img
                    src={s.imageUrl}
                    alt={s.eventName || 'Photo strip'}
                    className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-lg sm:rounded-xl shadow-lg"
                    onError={(e) => {
                      // Fallback to placeholder image
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                  <div className={`absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-semibold ${
                    s.printed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    <span className="hidden sm:inline">{s.printed ? '✅ Printed' : '⏳ Pending'}</span>
                    <span className="sm:hidden">{s.printed ? '✅' : '⏳'}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="mb-3 sm:mb-4">
                  <h4 className="text-white font-bold text-sm sm:text-base lg:text-lg mb-1 line-clamp-2">
                    {s.eventName || 'Untitled Event'}
                  </h4>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    📅 {new Date(s.timestamp).toLocaleDateString()}
                    <span className="hidden sm:inline"> {new Date(s.timestamp).toLocaleTimeString()}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={()=>mark(s._id)}
                    disabled={s.printed}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center min-h-[40px] ${
                      s.printed
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transform hover:scale-105 active:scale-95'
                    }`}
                    title={s.printed ? 'Already printed' : 'Mark as printed'}
                  >
                    <span className="flex items-center space-x-1">
                      <span>{s.printed ? '✅' : '🖨️'}</span>
                      <span className="hidden sm:inline">{s.printed ? 'Printed' : 'Mark'}</span>
                    </span>
                  </button>

                  <button
                    onClick={() => downloadAsPDF(s)}
                    disabled={loading}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center min-h-[40px] ${
                      loading
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:scale-105 active:scale-95'
                    } text-white`}
                    title="Download photo strip as image file"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <span>📥</span>
                        <span className="hidden sm:inline">Download</span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setPrintingStrip(s)}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center min-h-[40px]"
                    title="Print photo strip"
                  >
                    <span className="flex items-center space-x-1">
                      <span>🖨️</span>
                      <span className="hidden sm:inline">Print</span>
                    </span>
                  </button>

                  <button
                    onClick={()=>del(s._id)}
                    className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center min-h-[40px]"
                    title="Delete photo strip permanently"
                  >
                    <span className="flex items-center space-x-1">
                      <span>🗑️</span>
                      <span className="hidden sm:inline">Delete</span>
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print Component */}
        {printingStrip && (
          <PrintStrip
            strip={printingStrip}
            onClose={() => setPrintingStrip(null)}
          />
        )}
      </div>
    </div>
  );
}
