import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import '../responsive.css';

export default function CapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [steps, setSteps] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [settings, setSettings] = useState({
    eventName: '',
    background: { type: 'color', value: '#ff0000' },
    logo: null
  });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Store captured photo data

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';



  // Initialize canvas with background - 600×1800 pixels at 300 DPI (2×6 inch)
  const initializeCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const width = 600;  // 2 inches × 300 DPI
      const height = 1800; // 6 inches × 300 DPI

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // Clear entire canvas
      ctx.clearRect(0, 0, width, height);

      // Apply background color to entire strip (will show in gaps/edges)
      const bgColor = settings.background?.value || '#ff0000';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Photo boxes will be drawn on top, covering most of the background
      // Background will only be visible at edges and any small gaps
    }
  }, [settings.background?.value]);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('photoBoothSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Reset to default settings if parsing fails
      setSettings({
        eventName: '',
        background: { type: 'color', value: '#ff0000' },
        logo: null
      });
    }
  }, []);

  // Initialize canvas when settings change
  useEffect(() => {
    if (canvasRef.current && settings.background?.value) {
      initializeCanvas();
    }
  }, [settings.background?.value, initializeCanvas]);

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
    const stripWidth = 600;   // 2 inches × 300 DPI
    const stripHeight = 1800; // 6 inches × 300 DPI

    // Create gaps between photos: 10px margin on all sides, 5px between photos
    const margin = 10;        // Margin from strip edges
    const gap = 5;           // Gap between photos
    const photoWidth = stripWidth - (2 * margin);  // 580px wide
    const photoHeight = (stripHeight - (2 * margin) - (2 * gap)) / 3; // ~588px tall each

    // Calculate Y position for current photo with gaps
    const photoY = margin + (steps * (photoHeight + gap));
    const photoX = margin;

    // Background color is already applied to entire strip
    // Photos will be drawn on top, leaving background visible in gaps

    // Capture current photo from video - SMART capture with gaps
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoWidth;   // Use actual photo width (580px)
    tempCanvas.height = photoHeight; // Use actual photo height (~588px)
    const tempCtx = tempCanvas.getContext('2d');

    // Get video dimensions
    const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
    const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;

    // Debug: Log dimensions to verify SMART capture with gaps
    console.log('📸 SMART capture with gaps at 300 DPI:', {
      videoWidth,
      videoHeight,
      photoWidth,
      photoHeight,
      photoX,
      photoY,
      margin,
      gap,
      step: steps + 1,
      physicalSize: '2×6 inches',
      smartMode: 'Everyone captured + background gaps visible'
    });

    // Strategy: Use "object-fit: cover" approach to capture ALL people
    // This maintains aspect ratio while ensuring the entire frame is captured

    if (videoWidth && videoHeight) {
      // Smart scaling: Try to capture everyone while filling the photo area
      const scaleX = photoWidth / videoWidth;
      const scaleY = photoHeight / videoHeight;

      // Use a balanced approach: prefer fitting everyone, but allow slight cropping if needed
      const fitScale = Math.min(scaleX, scaleY); // Fits everyone completely
      const fillScale = Math.max(scaleX, scaleY); // Fills photo area completely

      // Use fit scale if the difference isn't too large, otherwise use a compromise
      const scaleDifference = fillScale / fitScale;
      const scale = scaleDifference > 1.3 ? fitScale : fillScale; // Allow up to 30% difference

      // Calculate dimensions and centering
      const scaledWidth = videoWidth * scale;
      const scaledHeight = videoHeight * scale;
      const offsetX = (photoWidth - scaledWidth) / 2;
      const offsetY = (photoHeight - scaledHeight) / 2;

      // Draw the video frame with smart scaling
      tempCtx.drawImage(
        videoRef.current,
        0, 0, videoWidth, videoHeight, // Source: ENTIRE video frame
        offsetX, offsetY, scaledWidth, scaledHeight // Destination: Smart scaled
      );

      console.log(`📸 Smart scaling: fit=${fitScale.toFixed(3)}, fill=${fillScale.toFixed(3)}, used=${scale.toFixed(3)}, mode=${scale === fitScale ? 'FIT_ALL' : 'FILL_BOX'}`);
    } else {
      // Fallback: Direct capture if dimensions not available
      tempCtx.drawImage(
        videoRef.current,
        0, 0, photoWidth, photoHeight
      );
    }

    // Store the captured photo data
    const photoData = tempCanvas.toDataURL();
    setCapturedPhotos(prev => [...prev, photoData]);

    // Draw the captured photo from tempCanvas to the main canvas at correct position with gaps
    ctx.drawImage(tempCanvas, photoX, photoY);

    console.log(`✅ Photo ${steps + 1} placed in box ${steps + 1} at position: X=${photoX}px, Y=${photoY}px (with ${margin}px margins and ${gap}px gaps)`);

    // Optional logo overlay - positioned on current photo with gaps
    if (settings.logo) {
      const img = new Image();
      img.src = settings.logo; // settings.logo is already a base64 string
      img.onload = () => {
        // Place logo on the current photo being captured (with gap positioning)
        const logoX = photoX + 15; // 15px from photo left edge
        const logoY = photoY + 15; // 15px from photo top edge
        ctx.drawImage(img, logoX, logoY, 125, 62);
      };
    }

    // Optional event name text on last step - positioned at bottom of strip
    if (steps === 2 && settings.eventName) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "30px sans-serif"; // Larger font for higher resolution
      const textX = stripWidth / 2; // Center horizontally
      const textY = stripHeight - margin - 10; // 10px above bottom margin
      ctx.textAlign = "center";
      ctx.fillText(settings.eventName, textX, textY);
      ctx.textAlign = "left"; // Reset alignment
    }

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
        background: settings.background,
        logo: settings.logo,
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

              {/* Capture Instructions */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-white text-sm font-medium">
                  👥 <span className="text-green-300">Everyone captured + boxes filled!</span>
                </p>
                <p className="text-white/70 text-xs mt-1">
                  Smart capture • 600×1800px (300 DPI) • 2×6 inch strip
                </p>
              </div>
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
