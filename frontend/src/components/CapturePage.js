import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import './MobileCamera.css';

export default function CapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [steps, setSteps] = useState(0);
  const [currentCamera, setCurrentCamera] = useState('environment'); // 'user' for front, 'environment' for back
  const [showNextPhotoMessage, setShowNextPhotoMessage] = useState(false);
  const [settings, setSettings] = useState({
    eventName: '',
    template: null // Template image instead of background color
  });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Store captured photo data
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';



  // Initialize canvas with template background - 660×1800 pixels at 300 DPI (2.2×6 inch)
  const initializeCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const width = 660;   // 2.2 inches × 300 DPI - MATCHES PRINT CSS
      const height = 1800; // 6 inches × 300 DPI - CORRECT 2×6 inch strip

      // Set canvas dimensions consistently across environments
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // Force consistent pixel ratio scaling
      canvasRef.current.style.width = width + 'px';
      canvasRef.current.style.height = height + 'px';

      // Clear entire canvas
      ctx.clearRect(0, 0, width, height);

      // Ensure consistent rendering across environments
      ctx.imageSmoothingEnabled = false;
      ctx.textBaseline = 'top';

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
          // Fallback to transparent background (no white layer)
          ctx.clearRect(0, 0, width, height);
          // Add beautiful text even on fallback
          addBeautifulText(ctx);
        };
        templateImg.src = settings.template;
      } else {
        console.log('⚠️ No template found, using transparent background');
        // Fallback: transparent background if no template (no white layer)
        ctx.clearRect(0, 0, width, height);
        // Add beautiful text on transparent background
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

      console.log('✅ Backend settings loaded successfully');
      setSettings(backendSettings);

      // Template loaded silently - no notification shown
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

  // Photo boxes layout with optimized dimensions
  const addBeautifulText = (ctx) => {
    const canvasWidth = 660;   // Actual canvas width
    const photoWidth = 540;    // Slightly decreased width for better proportions
    const photoHeight = 390;   // Slightly decreased height for better proportions
    const photoX = (canvasWidth - photoWidth) / 2; // Center the photo boxes

    // Photo frame positions - first box moved up, better gaps between boxes
    const photoPositions = [40, 500, 960]; // First box higher, more gap between boxes

    // Add simple white borders around photo frames to match your image
    photoPositions.forEach((photoY) => {
      ctx.save();

      // Simple white border like in your image
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(photoX - 2, photoY - 2, photoWidth + 4, photoHeight + 4);

      ctx.restore();
    });

    // Custom stylish event name with user settings
    if (settings.eventName) {
      const textAreaY = 1420; // Start text area after photos (960 + 420 + margin)
      const textStyle = settings.textStyle || {
        fontSize: 60, // Bigger default size
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textColor: '#8B5CF6',
        textShadow: true,
        textGradient: true,
        decorativeLine: false // Remove decorative line
      };

      // Apply text styling

      // Main title with custom styling
      ctx.save();

      // Apply solid color for better visibility (no white background)
      ctx.fillStyle = textStyle.textColor;
      // Applied solid color

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

      // Smart font sizing applied

      // Add text stroke (outline) for better visibility against any background
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Dark outline
      ctx.lineWidth = Math.max(2, finalFontSize * 0.03); // Proportional outline width
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      // Text shadow based on user preference
      if (textStyle.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = Math.max(8, finalFontSize * 0.12);
        ctx.shadowOffsetX = Math.max(4, finalFontSize * 0.06);
        ctx.shadowOffsetY = Math.max(4, finalFontSize * 0.06);
        // Applied text shadow for visibility
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw text with outline first, then fill
      ctx.strokeText(settings.eventName, canvasWidth / 2, textAreaY + 60);
      ctx.fillText(settings.eventName, canvasWidth / 2, textAreaY + 60);
      // Main title drawn successfully
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

      // Position date at bottom of strip - adjusted for bigger photos
      const dateY = 2050; // Closer to bottom for bigger photos
      ctx.fillText(dateString, canvasWidth / 2, dateY);
      // Date drawn successfully
      ctx.restore();
    }
  };

  // Force landscape orientation on mobile devices
  useEffect(() => {
    const forceLandscape = () => {
      if (screen.orientation && screen.orientation.lock) {
        try {
          const lockPromise = screen.orientation.lock('landscape');
          if (lockPromise && typeof lockPromise.catch === 'function') {
            lockPromise.catch(err => {
              console.log('Screen orientation lock not supported or failed:', err);
            });
          }
        } catch (error) {
          console.log('Screen orientation lock not supported or failed:', error);
        }
      }
    };

    // Try to force landscape when component mounts
    forceLandscape();

    // Also try when orientation changes
    const handleOrientationChange = () => {
      setTimeout(forceLandscape, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      // Unlock orientation when leaving
      if (screen.orientation && screen.orientation.unlock) {
        try {
          const unlockPromise = screen.orientation.unlock();
          if (unlockPromise && typeof unlockPromise.catch === 'function') {
            unlockPromise.catch(() => {});
          }
        } catch (error) {
          // Ignore unlock errors
        }
      }
    };
  }, []);

  // Camera initialization with higher resolution and camera switching support
  const initializeCamera = useCallback(async (facingMode = currentCamera) => {
    try {
      // Stop existing stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      console.log(`📹 Initializing camera with facing mode: ${facingMode}`);

      // Maximum field of view for multiple people
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },  // High resolution
          height: { ideal: 1440, min: 960 },  // Taller for more people
          facingMode: { ideal: facingMode },
          frameRate: { ideal: 30, min: 15 }
          // No aspect ratio constraints - use camera's natural view
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Fallback: Try without exact aspect ratio if it fails
        console.warn("Exact aspect ratio failed, trying fallback constraints:", error);
        const fallbackConstraints = {
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1440, min: 960 },
            facingMode: { ideal: facingMode },
            frameRate: { ideal: 30, min: 15 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log(`✅ Camera initialized successfully with ${facingMode} camera`);

        // Wait for video to be fully ready before allowing captures
        await new Promise((resolve) => {
          const handleLoadedData = () => {
            videoRef.current.removeEventListener('loadeddata', handleLoadedData);
            resolve();
          };
          videoRef.current.addEventListener('loadeddata', handleLoadedData);
        });

        // Additional delay to ensure video is fully ready for capture
        await new Promise(resolve => setTimeout(resolve, 800));

        // Log actual video resolution and display size for debugging
        videoRef.current.onloadedmetadata = () => {
          const video = videoRef.current;
          const videoAspect = video.videoWidth / video.videoHeight;
          const isLandscape = videoAspect >= 1.3;
          console.log(`📹 Video loaded - Resolution: ${video.videoWidth}x${video.videoHeight}, Aspect: ${videoAspect.toFixed(2)}, ${isLandscape ? 'Landscape ✅' : 'Portrait ❌'}`);
        };
      }
    } catch (error) {
      console.warn("Camera access error:", error);
      setNotification({
        type: "error",
        message: `Camera access required. Please allow camera access and refresh the page. Error: ${error.message}`
      });
    }
  }, [currentCamera]);

  useEffect(() => {
    initializeCamera();

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [initializeCamera]);

  // Camera switching function
  const switchCamera = useCallback(() => {
    const newCamera = currentCamera === 'user' ? 'environment' : 'user';
    setCurrentCamera(newCamera);
    initializeCamera(newCamera);
    console.log(`🔄 Switching to ${newCamera === 'user' ? 'front' : 'back'} camera`);
  }, [currentCamera, initializeCamera]);

  // Refresh page function
  const refreshPage = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  // Pull-to-refresh functionality for mobile
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const threshold = 100; // Pull distance needed to trigger refresh

    const handleTouchStart = (e) => {
      if (window.scrollY === 0) { // Only at top of page
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (window.scrollY === 0 && startY > 0) {
        currentY = e.touches[0].clientY;
        pullDistance = currentY - startY;

        if (pullDistance > 0) {
          e.preventDefault(); // Prevent default scroll

          // Visual feedback for pull-to-refresh
          if (pullDistance > threshold) {
            document.body.style.transform = `translateY(${Math.min(pullDistance * 0.5, 50)}px)`;
            document.body.style.transition = 'transform 0.1s ease-out';
          }
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > threshold) {
        refreshPage();
      }

      // Reset visual feedback
      document.body.style.transform = '';
      document.body.style.transition = '';
      startY = 0;
      currentY = 0;
      pullDistance = 0;
    };

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.transform = '';
      document.body.style.transition = '';
    };
  }, [refreshPage]);

  // Check if video is ready for capture
  const isVideoReady = useCallback(() => {
    if (!videoRef.current) return false;

    const video = videoRef.current;
    const isReady = video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                   video.videoWidth > 0 &&
                   video.videoHeight > 0 &&
                   !video.paused &&
                   !video.ended;

    // Video ready check performed

    return isReady;
  }, []);

  const startCapture = () => {
    if (steps >= 3) return;

    // Check if video is ready before starting capture
    if (!isVideoReady()) {
      setNotification({
        type: "error",
        message: "Camera is not ready yet. Please wait a moment and try again."
      });
      return;
    }

    // Instant photo capture - no countdown timer
    console.log('📸 Taking photo instantly...');
    takePhoto();
  };

  const takePhoto = () => {
    console.log('📸 Starting photo capture process...');

    // Validate video and canvas are ready
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas not ready');
      setNotification({
        type: "error",
        message: "Camera not ready. Please wait and try again."
      });
      return;
    }

    // Extra check: Ensure video is fully loaded and has valid dimensions
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      console.error('❌ Video not fully loaded or switching cameras');
      setNotification({
        type: "error",
        message: "Camera is switching. Please wait a moment and try again."
      });
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      console.error('❌ Canvas context not available');
      return;
    }

    // Photo frames - MUST match addBeautifulText dimensions exactly
    const photoWidth = 540;    // Match white box width exactly
    const photoHeight = 390;   // Match white box height exactly
    const photoX = (660 - photoWidth) / 2; // Center the photo boxes

    // Y positions - first box moved up, better gaps between boxes
    const photoPositions = [
      40,   // First photo box Y position (moved higher)
      500,  // Second photo box Y position (more gap from first)
      960   // Third photo box Y position (more gap from second)
    ];

    const photoY = photoPositions[steps] || photoPositions[0];

    // Template background is preserved in all borders and gaps
    // Only the exact photo areas will be filled with captured photos

    // Capture current photo from video - fit exactly inside photo box
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoWidth;   // Use exact photo width (540px - matches white box)
    tempCanvas.height = photoHeight; // Use exact photo height (390px - matches white box)

    // Ensure consistent scaling across environments
    tempCanvas.style.width = photoWidth + 'px';
    tempCanvas.style.height = photoHeight + 'px';

    const tempCtx = tempCanvas.getContext('2d');

    // Disable image smoothing for consistent pixel-perfect rendering
    tempCtx.imageSmoothingEnabled = false;

    // Get video dimensions with validation
    const videoWidth = videoRef.current.videoWidth || videoRef.current.clientWidth;
    const videoHeight = videoRef.current.videoHeight || videoRef.current.clientHeight;

    // Validate video dimensions
    if (!videoWidth || !videoHeight || videoWidth < 100 || videoHeight < 100) {
      console.error('❌ Invalid video dimensions:', { videoWidth, videoHeight });
      setNotification({
        type: "error",
        message: "Camera not ready. Please wait for camera to load and try again."
      });
      return;
    }

    // Photo capture dimensions calculated

    // Strategy: Fit photos exactly inside the designated boxes
    // Photos will be contained within the box boundaries

    try {
      if (videoWidth && videoHeight) {
        // SMART CROP STRATEGY: Crop only bottom part to keep face visible
        // This ensures heads/faces are always visible while filling the box

        const videoAspect = videoWidth / videoHeight;
        const boxAspect = photoWidth / photoHeight;

        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;

        if (videoAspect > boxAspect) {
          // Video is wider - crop sides to fit box height
          sourceWidth = videoHeight * boxAspect;
          sourceX = (videoWidth - sourceWidth) / 2;
        } else {
          // Video is taller - crop ONLY BOTTOM to fit box width (keep top/face visible)
          sourceHeight = videoWidth / boxAspect;
          sourceY = 0; // Start from top (keep face visible)
          // sourceHeight will be less than videoHeight, cropping bottom only
        }

        // Draw cropped video to fill entire box without stretching
        tempCtx.drawImage(
          videoRef.current,
          sourceX, sourceY, sourceWidth, sourceHeight, // Source: Cropped portion (bottom cropped)
          0, 0, photoWidth, photoHeight // Destination: Fill entire box
        );

        console.log(`📸 Photo captured with smart crop (bottom only) - Video: ${videoWidth}x${videoHeight}, Cropped: ${sourceWidth}x${sourceHeight}, Box: ${photoWidth}x${photoHeight}`);
      } else {
        // Fallback: Direct stretch if dimensions not available
        tempCtx.drawImage(
          videoRef.current,
          0, 0, photoWidth, photoHeight
        );
        console.log('📸 Photo captured with fallback stretch mode');
      }
    } catch (error) {
      console.error('❌ Error capturing photo from video:', error);
      setNotification({
        type: "error",
        message: "Failed to capture photo. Please try again."
      });
      return;
    }

    // Store the captured photo data for redrawing with template
    let capturedPhotoData;
    try {
      capturedPhotoData = tempCanvas.toDataURL('image/jpeg', 0.9);
      if (!capturedPhotoData || capturedPhotoData.length < 1000) {
        throw new Error('Photo data too small or empty');
      }
    } catch (error) {
      console.error('❌ Error converting photo to data URL:', error);
      setNotification({
        type: "error",
        message: "Failed to process photo. Please try again."
      });
      return;
    }

    const newCapturedPhotos = [...capturedPhotos, { data: capturedPhotoData, x: photoX, y: photoY }];
    setCapturedPhotos(newCapturedPhotos);
    console.log(`✅ Photo ${steps + 1} captured successfully, data size: ${(capturedPhotoData.length / 1024).toFixed(1)}KB`);

    // Redraw everything: template background + all photos + beautiful text
    if (settings.template) {
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
      templateImg.onload = () => {
        // First: Draw template background to fill entire canvas (preserves gradient)
        ctx.drawImage(templateImg, 0, 0, 660, 1800);

        // Then: Draw all captured photos on top (preserves template in gaps)
        let photosLoaded = 0;
        newCapturedPhotos.forEach(photo => {
          const photoImg = new Image();
          photoImg.crossOrigin = 'anonymous'; // Enable CORS for photo data URLs
          photoImg.onload = () => {
            // Draw photo exactly within box boundaries
            ctx.drawImage(photoImg, 0, 0, photoWidth, photoHeight, photo.x, photo.y, photoWidth, photoHeight);
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

      templateImg.onerror = () => {
        console.error('❌ Failed to load template for photo placement');
        setNotification({
          type: "error",
          message: "Template failed to load. Using fallback."
        });
        // Fallback to no template
        try {
          ctx.clearRect(0, 0, 660, 1800);
          // Draw photo exactly within box boundaries
          ctx.drawImage(tempCanvas, 0, 0, photoWidth, photoHeight, photoX, photoY, photoWidth, photoHeight);
          addBeautifulText(ctx);
        } catch (error) {
          console.error('❌ Error in template fallback:', error);
        }
      };

      templateImg.src = settings.template;
    } else {
      // If no template, draw photo and add text on transparent background
      ctx.clearRect(0, 0, 660, 1800);
      // Draw photo exactly within box boundaries
      ctx.drawImage(tempCanvas, 0, 0, photoWidth, photoHeight, photoX, photoY, photoWidth, photoHeight);
      addBeautifulText(ctx);
    }

    // Photo placed in designated box

    // Show "Next Photo" message after capture (except for the last photo)
    if (steps < 2) {
      setShowNextPhotoMessage(true);
      setTimeout(() => {
        setShowNextPhotoMessage(false);
      }, 1500); // Show for 1.5 seconds
    }

    // No logo overlay - clean template with photos only

    setSteps(steps + 1);
  };

  const submit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setNotification(null);

      // Validate canvas has content before submitting
      if (!canvasRef.current) {
        throw new Error('Canvas not available');
      }

      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);

      // Validate the generated image data
      if (!dataUrl || dataUrl.length < 10000) {
        throw new Error('Generated image appears to be blank or too small');
      }

      console.log(`📤 Submitting photo strip, data size: ${(dataUrl.length / 1024).toFixed(1)}KB`);

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



      <div className="relative z-10 container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
        {/* Header - Compact on Mobile */}
        <div className="text-center mb-4 sm:mb-8 md:mb-12 lg:mb-16">
          <div className="inline-block p-4 sm:p-6 bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl mb-4 sm:mb-6 relative mobile-header">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              📸 Strip Photobooth
            </h1>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-2 sm:mb-4"></div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 font-medium">Create amazing photo strips instantly!</p>

            {/* Refresh Button */}
            <button
              onClick={refreshPage}
              disabled={isRefreshing}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl text-white transition-all duration-300 transform hover:scale-110 active:scale-95 border border-white/20 hover:border-white/30"
              title="Refresh Page"
            >
              <div className={`text-lg ${isRefreshing ? 'animate-spin' : ''}`}>
                🔄
              </div>
            </button>
          </div>

          {/* Mobile Pull-to-Refresh Hint */}
          <div className="block sm:hidden text-white/60 text-sm mb-4">
            💡 Pull down to refresh on mobile
          </div>
        </div>

        {/* Enhanced Camera Section - Full Screen on Mobile */}
        <div className="w-full max-w-none sm:max-w-lg md:max-w-xl mx-auto px-1 sm:px-4 md:px-0">
          <div className="bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-3xl p-2 sm:p-4 md:p-6 lg:p-8 border border-white/20 shadow-2xl relative overflow-hidden mobile-camera-container">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400"></div>

            <div className="text-center mb-3 sm:mb-4 md:mb-6">
              <div className="inline-flex items-center space-x-2 sm:space-x-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-lg rounded-lg sm:rounded-xl md:rounded-2xl px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-3 border border-white/30 shadow-lg">
                <span className="text-lg sm:text-xl md:text-2xl">📸</span>
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Group Photo Camera</h3>
              </div>
            </div>

            <div className="relative group flex justify-center items-start overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl border-2 sm:border-3 md:border-4 border-white/20 group-hover:border-white/30 transition-all duration-300 mobile-camera-video"
                style={{
                  objectFit: 'contain', // Keep proportions, no distortion
                  width: '100%',
                  height: 'auto'
                }}
              />

              {/* Frame overlay to help users stay in frame */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none"></div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

              {/* Next Photo Message */}
              {showNextPhotoMessage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl md:text-7xl font-black text-white drop-shadow-2xl mb-2 animate-pulse">
                      📸
                    </div>
                    <div className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-2">
                      Photo Captured!
                    </div>
                    <div className="text-white/80 text-base sm:text-lg font-medium">
                      Ready for next photo
                    </div>
                  </div>
                </div>
              )}


            </div>

            {/* Group Photo Instructions */}
            {steps < 3 && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center space-x-2 bg-blue-500/20 backdrop-blur-lg rounded-lg px-4 py-2 border border-blue-400/30">
                  <span className="text-lg">👥</span>
                  <span className="text-white text-sm font-medium">
                    Position everyone in the camera view - wider area now visible!
                  </span>
                </div>
              </div>
            )}

            {/* Enhanced Progress indicator */}
            <div className="mt-4 sm:mt-6 flex justify-center space-x-4 sm:space-x-3">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center space-y-2">
                    <div
                      className={`w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full border-2 transition-all duration-500 ${
                        steps >= step
                          ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-300 shadow-lg shadow-green-400/50'
                          : steps + 1 === step
                          ? 'bg-blue-400 border-blue-300 animate-pulse'
                          : 'bg-white/10 border-white/30'
                      }`}
                    />
                    <span className={`text-xs sm:text-xs font-medium transition-colors duration-300 ${
                      steps >= step ? 'text-green-300' : steps + 1 === step ? 'text-blue-300' : 'text-white/50'
                    }`}>
                      {step === 1 ? 'Top' : step === 2 ? 'Mid' : 'Bot'}
                    </span>
                  </div>
                ))}
            </div>

            {/* Enhanced Capture Button - Mobile Optimized */}
            <div className="mt-6 sm:mt-8 mobile-controls">
              <button
                onClick={startCapture}
                disabled={steps >= 3}
                className={`w-full py-5 sm:py-4 md:py-5 px-6 rounded-xl sm:rounded-2xl font-bold text-xl sm:text-lg md:text-xl transition-all duration-300 transform relative overflow-hidden mobile-button ${
                  steps >= 3
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed text-gray-200'
                    : 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-2xl hover:shadow-blue-500/25 hover:scale-105 active:scale-95 border border-white/30'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  <span className="text-2xl sm:text-2xl">{steps >= 3 ? '✅' : '📸'}</span>
                  <span className="text-lg sm:text-base md:text-lg">{steps >= 3 ? 'All Photos Captured!' : 'Capture Group Photo'}</span>
                </div>
                {steps < 3 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
              </button>
            </div>

            {/* Camera Switch Button - Mobile Optimized */}
            <div className="mt-3 sm:mt-4">
              <button
                onClick={switchCamera}
                className="w-full py-4 sm:py-3 px-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20 hover:border-white/30 mobile-camera-switch"
              >
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <span className="text-xl">🔄</span>
                  <span className="text-base sm:text-sm md:text-base">Switch to {currentCamera === 'user' ? 'Back' : 'Front'} Camera</span>
                  <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                    ({currentCamera === 'user' ? 'Front' : 'Back'} Active)
                  </span>
                </div>
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
            width="660"
            height="1800"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
