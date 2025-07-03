import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import PrintStrip from "./PrintStrip";

export default function AdminDashboard() {
  const [auth, setAuth] = useState(false);
  const [strips, setStrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [printingStrip, setPrintingStrip] = useState(null);
  const [notification, setNotification] = useState(null);
  const [settings, setSettings] = useState({
    eventName: '',
    background: { type: 'color', value: '#ff0000' },
    logo: null
  });
  const [showSettings, setShowSettings] = useState(false);

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const login = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username: "admin",
        password: "secret"
      });

      if (res.data.success) {
        setAuth(true);
        setNotification({ type: 'success', message: '✅ Login successful' });
      } else {
        setError('Login failed: Invalid credentials');
      }
    } catch (error) {
      setError(`Login failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSettings(prev => ({
          ...prev,
          logo: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteLogo = () => {
    if (window.confirm('Are you sure you want to delete the logo? This action cannot be undone.')) {
      setSettings(prev => ({
        ...prev,
        logo: null
      }));
      // Clear the file input
      const fileInput = document.getElementById('logoUpload');
      if (fileInput) {
        fileInput.value = '';
      }
      // Show success notification
      setNotification({
        type: 'success',
        message: '🗑️ Logo deleted successfully!'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const saveSettings = () => {
    // Save settings to localStorage for now
    localStorage.setItem('photoBoothSettings', JSON.stringify(settings));
    setNotification({ type: 'success', message: '⚙️ Settings saved successfully!' });
    setTimeout(() => setNotification(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${API_BASE_URL}/api/strips`);
      setStrips(res.data);
      setNotification({ type: 'success', message: `✅ Loaded ${res.data.length} strips` });
    } catch (error) {
      setError(`Failed to load strips: ${error.response?.data?.message || error.message}`);
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

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 lg:py-16">
          <div className="max-w-sm sm:max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">🛠️</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-300">Secure access required</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/20 shadow-2xl">
              {error && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg sm:rounded-xl">
                  <div className="flex items-center">
                    <span className="text-lg sm:text-xl mr-2">⚠️</span>
                    <span className="text-sm sm:text-base">{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={login}
                disabled={loading}
                className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 ${
                  loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    <span className="text-sm sm:text-base">Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🔐</span>
                    <span className="text-sm sm:text-base">Admin Login</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

                {/* Enhanced Background Color */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <label className="flex items-center text-white font-bold mb-4 text-lg">
                    <div className="bg-gradient-to-r from-pink-400 to-red-400 p-3 rounded-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl">🎨</span>
                    </div>
                    <div>
                      <span>Strip Background Color</span>
                      <span className="text-white/60 text-sm font-normal block">Color behind photos in the strip</span>
                    </div>
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="relative group/color">
                      <div
                        className="w-24 h-16 rounded-2xl border-4 border-white/30 cursor-pointer shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: settings.background.value }}
                        onClick={() => document.getElementById('colorPicker').click()}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/color:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <input
                        id="colorPicker"
                        type="color"
                        value={settings.background.value}
                        onChange={(e) => handleSettingsChange('background', { type: 'color', value: e.target.value })}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white/10 backdrop-blur-lg rounded-xl px-6 py-4 border border-white/20">
                        <p className="text-white/80 text-sm font-medium mb-2">Current Color:</p>
                        <input
                          type="text"
                          value={settings.background.value}
                          onChange={(e) => handleSettingsChange('background', { type: 'color', value: e.target.value })}
                          className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Logo Upload */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
                  <label className="flex items-center text-white font-bold mb-4 text-lg">
                    <div className="bg-gradient-to-r from-blue-400 to-cyan-400 p-3 rounded-xl mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl">🖼️</span>
                    </div>
                    <div>
                      <span>Logo Upload</span>
                      <span className="text-white/60 text-sm font-normal block">Optional - appears on photo strips</span>
                    </div>
                  </label>

                  <div className="flex items-center space-x-4 flex-wrap gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logoUpload"
                    />
                    <label
                      htmlFor="logoUpload"
                      className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl text-white cursor-pointer hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      📁 Choose File
                    </label>

                    {settings.logo && (
                      <button
                        onClick={deleteLogo}
                        className="px-6 py-3 bg-gradient-to-r from-red-500/80 to-pink-500/80 hover:from-red-600/90 hover:to-pink-600/90 border border-red-400/50 rounded-xl text-white transition-all duration-300 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                        title="Delete logo permanently"
                      >
                        🗑️ Delete
                      </button>
                    )}

                    <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20">
                      <span className="text-white/80 text-sm font-medium">
                        {settings.logo ? '✅ Logo uploaded' : '📄 No file chosen'}
                      </span>
                    </div>
                  </div>

                  {settings.logo && (
                    <div className="mt-6 p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                      <p className="text-white text-sm mb-3 font-medium flex items-center">
                        <span className="mr-2">📷</span>
                        Logo Preview:
                      </p>
                      <img
                        src={settings.logo}
                        alt="Logo preview"
                        className="h-20 w-auto rounded-lg shadow-xl border-2 border-white/30 hover:scale-105 transition-transform duration-300"
                      />
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
            onClick={() => window.open('http://localhost:3000')}
            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <span className="hidden sm:inline">📷 Go to Camera</span>
            <span className="sm:hidden">📷 Camera</span>
          </button>
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
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    onClick={()=>mark(s._id)}
                    disabled={s.printed}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-semibold transition-all duration-300 ${
                      s.printed
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transform hover:scale-105 active:scale-95'
                    }`}
                  >
                    <span className="hidden sm:inline">{s.printed ? '✅ Printed' : '🖨️ Mark Printed'}</span>
                    <span className="sm:hidden">{s.printed ? '✅' : '🖨️'}</span>
                  </button>

                  <button
                    onClick={()=>window.open(s.imageUrl)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <span className="hidden sm:inline">📥 Download</span>
                    <span className="sm:hidden">📥</span>
                  </button>

                  <button
                    onClick={()=>del(s._id)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <span className="hidden sm:inline">🗑️ Delete</span>
                    <span className="sm:hidden">🗑️</span>
                  </button>

                  <button
                    onClick={() => setPrintingStrip(s)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <span className="hidden sm:inline">🖨️ Print</span>
                    <span className="sm:hidden">🖨️</span>
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
