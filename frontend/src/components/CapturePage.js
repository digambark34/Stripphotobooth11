import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function CapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [steps, setSteps] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [settings, setSettings] = useState({
    eventName: '',
    template: null // Template image instead of background color
  });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Store captured photo data

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';



  // Initialize canvas with template background - 600×1800 pixels at 300 DPI (2×6 inch)
  const initializeCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const width = 600;  // 2 inches × 300 DPI
      const height = 1800; // 6 inches × 300 DPI

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // Clear entire canvas
      ctx.clearRect(0, 0, width, height);

      // Apply template background if available (this is the colorful design)
      if (settings.template) {
        console.log('🖼️ Loading template:', settings.template.substring(0, 50) + '...');
        const templateImg = new Image();
        templateImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
        templateImg.onload = () => {
          console.log('✅ Template loaded successfully, drawing to canvas');
          // Draw template background to fill entire canvas
          ctx.drawImage(templateImg, 0, 0, width, height);
          // Add beautiful text overlay
          addBeautifulText(ctx);
        };
        templateImg.onerror = () => {
          console.error('❌ Failed to load template image');
          // Fallback to white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          // Add beautiful text even on fallback
          addBeautifulText(ctx);
        };
        templateImg.src = settings.template;
      } else {
        console.log('⚠️ No template found, using white background');
        // Fallback: white background if no template
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        // Add beautiful text on white background
        addBeautifulText(ctx);
      }
    }
  }, [settings.template]);

  // Load settings from backend API
  const loadSettings = useCallback(async () => {
    try {
      console.log('🔍 Loading settings from backend API...');
      const response = await axios.get(`${API_BASE_URL}/api/settings`);

      const backendSettings = {
        eventName: response.data.eventName || '',
        template: response.data.templateUrl || null, // Use templateUrl from backend
        textStyle: response.data.textStyle || {
          fontSize: 60, // Bigger default size
          fontFamily: 'Arial',
          fontWeight: 'bold',
          textColor: '#8B5CF6',
          textShadow: true,
          textGradient: true,
          decorativeLine: false // Remove decorative line
        }
      };

      console.log('✅ Backend settings loaded:', backendSettings);
      console.log('🖼️ Template status:', backendSettings.template ? 'Template found' : 'No template');
      console.log('🎨 Text style from backend:', backendSettings.textStyle);
      setSettings(backendSettings);

      // Show notification when template is loaded
      if (backendSettings.template) {
        setNotification({
          type: 'success',
          message: '🖼️ Template loaded successfully!'
        });
        setTimeout(() => setNotification(null), 2000);
      }
    } catch (error) {
      console.error('❌ Error loading settings from backend:', error);

      // Fallback to localStorage if backend fails
      try {
        const savedSettings = localStorage.getItem('photoBoothSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          console.log('⚠️ Using localStorage fallback:', parsedSettings);
          setSettings(parsedSettings);
        } else {
          console.log('⚠️ No fallback settings found, using defaults');
          setSettings({
            eventName: '',
            template: null
          });
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setSettings({
          eventName: '',
          template: null
        });
      }
    }
  }, [API_BASE_URL]);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-refresh settings every 10 seconds to catch admin changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadSettings();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [loadSettings]);

  // Initialize canvas when settings change
  useEffect(() => {
    if (canvasRef.current) {
      console.log('🔄 Settings changed, redrawing canvas...');
      initializeCanvas();
    }
  }, [settings.template, settings.textStyle, settings.eventName, initializeCanvas]);

  // Beautiful frames with borders and stylish event name
  const addBeautifulText = (ctx) => {
    const canvasWidth = 600;
    const photoWidth = 500;
    const photoHeight = 420;
    const photoX = 50;

    // Photo frame positions
    const photoPositions = [80, 580, 1080];

    // Add beautiful borders around photo frames (without covering photos)
    photoPositions.forEach((photoY) => {
      ctx.save();

      // Draw border as stroke outline instead of filled rectangles
      // Outer border - gradient stroke
      const borderGradient = ctx.createLinearGradient(photoX - 6, photoY - 6, photoX + photoWidth + 6, photoY + photoHeight + 6);
      borderGradient.addColorStop(0, '#8B5CF6'); // Purple
      borderGradient.addColorStop(0.5, '#EC4899'); // Pink
      borderGradient.addColorStop(1, '#F59E0B'); // Gold

      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 6;
      ctx.strokeRect(photoX - 3, photoY - 3, photoWidth + 6, photoHeight + 6);

      // Inner border - white stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2);

      ctx.restore();
    });

    // Custom stylish event name with user settings
    if (settings.eventName) {
      const textAreaY = 1520; // Start text area after last photo
      const textStyle = settings.textStyle || {
        fontSize: 60, // Bigger default size
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textColor: '#8B5CF6',
        textShadow: true,
        textGradient: true,
        decorativeLine: false // Remove decorative line
      };

      console.log('🎨 Applying text styling:', textStyle);
      console.log('📝 Event name:', settings.eventName);
      console.log('🔧 Current settings object:', settings);
      console.log('🎯 Font size from settings:', textStyle.fontSize);
      console.log('🎯 Font family from settings:', textStyle.fontFamily);
      console.log('🎯 Text color from settings:', textStyle.textColor);

      // Main title with custom styling
      ctx.save();

      // Apply gradient or solid color based on user preference
      if (textStyle.textGradient) {
        const textGradient = ctx.createLinearGradient(0, textAreaY, canvasWidth, textAreaY + 50);
        textGradient.addColorStop(0, textStyle.textColor);
        textGradient.addColorStop(0.5, '#EC4899'); // Pink middle
        textGradient.addColorStop(1, '#F59E0B'); // Gold end
        ctx.fillStyle = textGradient;
        console.log('✨ Applied gradient text effect');
      } else {
        ctx.fillStyle = textStyle.textColor;
        console.log('🎨 Applied solid color:', textStyle.textColor);
      }

      // Smart font sizing - automatically adjust to fit within strip width
      const fontFamily = textStyle.fontFamily || 'Arial';
      let fontSize = textStyle.fontSize || 60;
      const fontWeight = textStyle.fontWeight || 'bold';
      const maxWidth = canvasWidth - 40; // Leave 20px margin on each side

      // Start with desired font size and reduce if text doesn't fit
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let finalFontSize = fontSize;
      let textWidth = 0;

      // Test different font sizes to find the biggest that fits
      for (let testSize = fontSize; testSize >= 24; testSize -= 2) {
        ctx.font = `${fontWeight} ${testSize}px "${fontFamily}", Arial, sans-serif`;
        textWidth = ctx.measureText(settings.eventName).width;

        if (textWidth <= maxWidth) {
          finalFontSize = testSize;
          break;
        }
      }

      // Apply the final font size
      ctx.font = `${fontWeight} ${finalFontSize}px "${fontFamily}", Arial, sans-serif`;

      console.log(`📝 Smart sizing: ${finalFontSize}px (fits in ${maxWidth}px, actual width: ${textWidth.toFixed(0)}px)`);

      // Text shadow based on user preference
      if (textStyle.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.max(6, finalFontSize * 0.1);
        ctx.shadowOffsetX = Math.max(3, finalFontSize * 0.05);
        ctx.shadowOffsetY = Math.max(3, finalFontSize * 0.05);
        console.log('🌟 Applied proportional text shadow');
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw the text centered
      ctx.fillText(settings.eventName, canvasWidth / 2, textAreaY + 60);
      console.log(`✅ Drew main title: "${settings.eventName}" at ${finalFontSize}px`);
      ctx.restore();

      // No decorative line - cleaner design

      // Date at bottom of strip with more space and bigger size
      ctx.save();
      ctx.fillStyle = textStyle.textColor;
      const dateSize = 32; // Fixed bigger size for better visibility
      ctx.font = `normal ${dateSize}px "Arial", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Strong shadow for date text visibility
      if (textStyle.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Get current date
      const currentDate = new Date();
      const dateString = currentDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Position date at bottom of strip with good spacing from event name
      const dateY = 1750; // Fixed position near bottom of 1800px strip
      ctx.fillText(dateString, canvasWidth / 2, dateY);
      console.log(`📅 Drew date: ${dateString} at ${dateSize}px, positioned at bottom Y:${dateY}`);
      ctx.restore();
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
          aspectRatio: { ideal: 16/9 }
        }
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((error) => {
        console.warn("Camera access denied:", error);
        setNotification({
          type: "error",
          message: "Camera access required. Please allow webcam access and refresh the page."
        });
      });

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startCapture = () => {
    if (steps >= 3) return;

    // Start countdown from 3
    setCountdown(3);

    // Countdown sequence: 3 -> 2 -> 1 -> CAPTURE
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => {
      setCountdown("📸"); // Show camera icon briefly
      setTimeout(() => {
        takePhoto();
        setCountdown(null);
      }, 500); // Show camera icon for 0.5 seconds before capture
    }, 3000);
  };

  const takePhoto = () => {
    const ctx = canvasRef.current.getContext("2d");

    // BIGGER Photo frames with borders - elegant and spacious
    const photoWidth = 500;   // Bigger width for better presence
    const photoHeight = 420;  // Bigger height but still leaves space for event name
    const photoX = 50;        // Centered X position with border space

    // Y positions for bigger photo boxes with space for event name at bottom
    const photoPositions = [
      80,   // First photo box Y position (top)
      580,  // Second photo box Y position (middle)
      1080  // Third photo box Y position (bottom) - leaves 200px for event name
    ];

    const photoY = photoPositions[steps] || photoPositions[0];

    // Template background is preserved in all borders and gaps
    // Only the exact photo areas will be filled with captured photos

    // Capture current photo from video - SMART capture with gaps
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoWidth;   // Use actual photo width (580px)
    tempCanvas.height = photoHeight; // Use actual photo height (~588px)
    const tempCtx = tempCanvas.getContext('2d');

    // Get video dimensions
    const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
    const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;

    // Debug: Log dimensions to verify SMART FILL capture
    console.log('📸 SMART FILL capture at 300 DPI:', {
      videoWidth,
      videoHeight,
      photoWidth,
      photoHeight,
      photoX,
      photoY,
      step: steps + 1,
      physicalSize: '2×6 inches',
      captureMode: 'SMART FILL - Complete box fill with template gradient preserved'
    });

    // Strategy: SMART FILL - Capture ALL people while completely filling the box
    // This ensures EVERYONE is visible AND the entire box is filled with photo content

    if (videoWidth && videoHeight) {
      // SMART STRETCH FILL: Stretch video to fill entire box while keeping all people visible
      // This approach fills the box completely with photo content (no backgrounds)

      // Calculate aspect ratios
      const videoAspect = videoWidth / videoHeight;
      const boxAspect = photoWidth / photoHeight;

      let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;

      if (videoAspect > boxAspect) {
        // Video is wider than box - adjust width to fit all people
        // Keep full height, crop minimal width from sides
        const newWidth = videoHeight * boxAspect;
        sourceX = (videoWidth - newWidth) / 2; // Center crop
        sourceWidth = newWidth;
      } else {
        // Video is taller than box - adjust height to fit all people
        // Keep full width, crop minimal height from top/bottom
        const newHeight = videoWidth / boxAspect;
        sourceY = (videoHeight - newHeight) / 2; // Center crop
        sourceHeight = newHeight;
      }

      // Draw the intelligently cropped video to fill entire box
      tempCtx.drawImage(
        videoRef.current,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source: Smart crop to preserve people
        0, 0, photoWidth, photoHeight // Destination: Fill entire box completely
      );

      console.log(`📸 SMART STRETCH mode: Box filled completely with photo content - sourceArea: ${sourceWidth.toFixed(0)}×${sourceHeight.toFixed(0)} → ${photoWidth}×${photoHeight} box`);
    } else {
      // Fallback: Direct capture if dimensions not available
      tempCtx.drawImage(
        videoRef.current,
        0, 0, photoWidth, photoHeight
      );
    }

    // Store the captured photo data for redrawing with template
    const capturedPhotoData = tempCanvas.toDataURL();
    const newCapturedPhotos = [...capturedPhotos, { data: capturedPhotoData, x: photoX, y: photoY }];
    setCapturedPhotos(newCapturedPhotos);

    // Redraw everything: template background + all photos + beautiful text
    if (settings.template) {
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
      templateImg.onload = () => {
        // First: Draw template background to fill entire canvas (preserves gradient)
        ctx.drawImage(templateImg, 0, 0, 600, 1800);

        // Then: Draw all captured photos on top (preserves template in gaps)
        let photosLoaded = 0;
        newCapturedPhotos.forEach(photo => {
          const photoImg = new Image();
          photoImg.crossOrigin = 'anonymous'; // Enable CORS for photo data URLs
          photoImg.onload = () => {
            ctx.drawImage(photoImg, photo.x, photo.y);
            photosLoaded++;

            // After all photos are loaded, add beautiful text
            if (photosLoaded === newCapturedPhotos.length) {
              addBeautifulText(ctx);
            }
          };
          photoImg.src = photo.data;
        });

        // If no photos yet, still add text
        if (newCapturedPhotos.length === 0) {
          addBeautifulText(ctx);
        }
      };
      templateImg.src = settings.template;
    } else {
      // If no template, draw photo and add text on white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 1800);
      ctx.drawImage(tempCanvas, photoX, photoY);
      addBeautifulText(ctx);
    }

    const boxNames = ['FIRST BOX (TOP)', 'SECOND BOX (MIDDLE)', 'THIRD BOX (BOTTOM)'];
    console.log(`✅ Photo ${steps + 1} placed in ${boxNames[steps]} at position: X=${photoX}px, Y=${photoY}px`);

    // No logo overlay - clean template with photos only

    setSteps(steps + 1);
  };

  const submit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setNotification(null);

      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);

      await axios.post(`${API_BASE_URL}/api/strips`, {
        image: dataUrl,
        eventName: settings.eventName,
        template: settings.template
      });

      setNotification({
        type: "success",
        message: "✅ Thank you! Your photo strip has been sent for print."
      });

      setSteps(0);
      setCapturedPhotos([]); // Clear captured photos
      initializeCanvas(); // Clear and reinitialize with background
    } catch (error) {
      console.warn("Upload failed:", error);
      setNotification({
        type: "error",
        message: "❌ Failed to upload. Please check your connection and try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl backdrop-blur-lg border ${
          notification.type === 'success'
            ? 'bg-green-500/90 border-green-400/50'
            : 'bg-red-500/90 border-red-400/50'
        } text-white font-medium animate-slide-in`}>
          <div className="flex items-center space-x-3">
            <span className="text-lg">{notification.type === 'success' ? '✅' : '❌'}</span>
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Right Controls */}
      <div className="fixed top-6 right-6 z-40">
        {/* Admin Button */}
        <button
          onClick={() => window.location.href = '/admin'}
          className="px-4 py-2 bg-purple-500/80 hover:bg-purple-600/90 backdrop-blur-lg rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 border border-purple-400/50 shadow-lg"
          title="Go to Admin Dashboard"
        >
          ⚙️ Admin
        </button>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-block p-6 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl mb-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              📸 Strip Photobooth
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-4"></div>
            <p className="text-base sm:text-lg md:text-xl text-white/90 font-medium">Create amazing photo strips instantly!</p>
          </div>
        </div>

        {/* Enhanced Camera Section */}
        <div className="max-w-md sm:max-w-lg md:max-w-xl mx-auto px-4 sm:px-0">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400"></div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-3 border border-white/20">
                <span className="text-2xl">📹</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Camera</h3>
              </div>
            </div>

            <div className="relative group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-video rounded-2xl shadow-2xl border-4 border-white/20 group-hover:border-white/30 transition-all duration-300"
                style={{ objectFit: 'contain' }}
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

              {countdown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
                  <div className="text-center">
                    <div className={`text-4xl sm:text-6xl md:text-7xl font-black text-white drop-shadow-2xl mb-2 ${
                      countdown === "📸" ? "animate-pulse text-6xl sm:text-8xl md:text-9xl" : "animate-bounce"
                    }`}>
                      {countdown}
                    </div>
                    <div className="text-white/80 text-sm sm:text-base font-medium">
                      {countdown === "📸" ? "Capturing..." : countdown === 1 ? "Say Cheese!" : "Get ready!"}
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* Enhanced Progress indicator */}
            <div className="mt-6 flex justify-center space-x-3">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center space-y-2">
                    <div
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-500 ${
                        steps >= step
                          ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-300 shadow-lg shadow-green-400/50'
                          : steps + 1 === step
                          ? 'bg-blue-400 border-blue-300 animate-pulse'
                          : 'bg-white/10 border-white/30'
                      }`}
                    />
                    <span className={`text-xs font-medium transition-colors duration-300 ${
                      steps >= step ? 'text-green-300' : steps + 1 === step ? 'text-blue-300' : 'text-white/50'
                    }`}>
                      {step === 1 ? 'Top' : step === 2 ? 'Mid' : 'Bot'}
                    </span>
                  </div>
                ))}
            </div>

            {/* Enhanced Capture Button */}
            <div className="mt-8">
              <button
                onClick={startCapture}
                disabled={steps >= 3}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform relative overflow-hidden ${
                  steps >= 3
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed text-gray-200'
                    : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white shadow-2xl hover:shadow-pink-500/25 hover:scale-105 active:scale-95'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="text-2xl">{steps >= 3 ? '✅' : '📸'}</span>
                  <span>{steps >= 3 ? 'All Photos Captured!' : 'Capture Photo'}</span>
                </div>
                {steps < 3 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
              </button>
            </div>

            {/* Enhanced Submit Section */}
            <div className="mt-8 pt-6 border-t border-gradient-to-r from-transparent via-white/20 to-transparent">
              <div className="text-center mb-6">
                <div className="inline-block bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-3 border border-white/20">
                  <p className="text-white/90 text-sm sm:text-base font-medium">
                    {steps >= 3 ? '🎉 Ready to create your strip!' : `📷 ${3 - steps} more photo${3 - steps > 1 ? 's' : ''} needed`}
                  </p>
                  {settings.eventName && (
                    <p className="text-purple-300 text-xs sm:text-sm mt-2 font-medium">🎊 {settings.eventName}</p>
                  )}
                </div>
              </div>

              {/* Enhanced Submit Button */}
              <button
                onClick={submit}
                disabled={steps < 3 || isSubmitting}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform relative overflow-hidden ${
                  steps >= 3 && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Strip...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🚀</span>
                      <span>Submit Strip</span>
                    </>
                  )}
                </div>
                {steps >= 3 && !isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
              </button>
            </div>
          </div>

          {/* Preview Canvas (hidden) */}
          <canvas
            ref={canvasRef}
            width="600"
            height="1800"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
