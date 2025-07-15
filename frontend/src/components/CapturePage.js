import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import axiosRetry from 'axios-retry';
import './MobileCamera.css';

// Configure axios retry with enhanced UX and smart retry logic
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount, error) => {
    // Log retry attempts for debugging
    console.warn(`🔄 Retry attempt ${retryCount}/3 due to:`, error.message);
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error) => {
    // Smart retry: Only retry on network errors and 5xx server errors
    // Don't retry on 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           (error.response && error.response.status >= 500);
  }
});

// Add timeout protection
axios.defaults.timeout = 10000; // 10 second timeout per request

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
  const [retryStatus, setRetryStatus] = useState(null); // For retry feedback
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Store captured photo data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Processing delay between captures
  const [cachedTemplate, setCachedTemplate] = useState(null); // Cache template for offline use
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false); // Track camera switching
  const [isCanvasReady, setIsCanvasReady] = useState(false); // Track canvas rendering state

  // Fallback API URL if environment variable is not set
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Monitor network status for offline handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('🌐 Network connection restored');
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.warn('📵 Network connection lost - using cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);



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
      if (settings.template || cachedTemplate) {
        const templateToUse = settings.template || cachedTemplate;
        console.log('🖼️ Loading template:', templateToUse.substring(0, 50) + '...');
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
          console.error('❌ Failed to load template image, trying fallback');
          // Try cached template if main template fails
          if (settings.template && cachedTemplate && settings.template !== cachedTemplate) {
            console.log('🔄 Trying cached template as fallback');
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
              console.log('✅ Cached template loaded as fallback');
              ctx.drawImage(fallbackImg, 0, 0, width, height);
              addBeautifulText(ctx);
            };
            fallbackImg.onerror = () => {
              console.error('❌ Cached template also failed, using default background');
              createDefaultBackground(ctx, width, height);
              addBeautifulText(ctx);
            };
            fallbackImg.src = cachedTemplate;
          } else {
            console.log('💡 Creating default background instead of blank canvas');
            createDefaultBackground(ctx, width, height);
            addBeautifulText(ctx);
          }
        };
        templateImg.src = templateToUse;
      } else {
        console.log('⚠️ No template found, creating default background');
        createDefaultBackground(ctx, width, height);
        addBeautifulText(ctx);
      }
    }
  }, [settings.template, cachedTemplate]);

  // Create a default background when no template is available
  const createDefaultBackground = useCallback((ctx, width, height) => {
    console.log('🎨 Creating default background to prevent blank strips');

    // Create a beautiful gradient background instead of blank canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#667eea');    // Purple-blue top
    gradient.addColorStop(0.5, '#764ba2');  // Purple middle
    gradient.addColorStop(1, '#f093fb');    // Pink bottom

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < width; i += 40) {
      for (let j = 0; j < height; j += 40) {
        if ((i + j) % 80 === 0) {
          ctx.fillRect(i, j, 20, 20);
        }
      }
    }

    console.log('✅ Default background created - no more blank strips!');
  }, []);

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

      // Cache template for offline use
      if (backendSettings.template) {
        setCachedTemplate(backendSettings.template);
        localStorage.setItem('cachedTemplate', backendSettings.template);
        console.log('💾 Template cached for offline use');
      }

      // Template loaded silently - no notification shown
    } catch (error) {
      console.error('❌ Error loading settings from backend:', error);

      // Fallback to localStorage if backend fails
      try {
        const savedSettings = localStorage.getItem('photoBoothSettings');
        const savedTemplate = localStorage.getItem('cachedTemplate');

        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          // Use cached template if available and current template is missing
          if (savedTemplate && !parsedSettings.template) {
            parsedSettings.template = savedTemplate;
            console.log('💾 Using cached template from offline storage');
          }
          console.log('⚠️ Using localStorage fallback:', parsedSettings);
          setSettings(parsedSettings);
          setCachedTemplate(savedTemplate);
        } else if (savedTemplate) {
          // Even if no settings, use cached template
          console.log('💾 Using cached template only');
          setSettings({
            eventName: '',
            template: savedTemplate
          });
          setCachedTemplate(savedTemplate);
        } else {
          console.log('⚠️ No fallback settings found, using defaults');
          setSettings({
            eventName: '',
            template: null
          });
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Try to use cached template even if parsing fails
        const savedTemplate = localStorage.getItem('cachedTemplate');
        setSettings({
          eventName: '',
          template: savedTemplate || null
        });
        setCachedTemplate(savedTemplate);
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
    const photoWidth = 520;    // Custom width for photo boxes
    const photoHeight = 350;   // Custom height for photo boxes
    const photoX = (canvasWidth - photoWidth) / 2; // Center the photo boxes

    // Photo frame positions - adjusted slightly down
    const photoPositions = [60, 520, 980]; // Moved down slightly for better positioning

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

  // Enhanced camera initialization with better switching support
  const initializeCamera = useCallback(async (facingMode = currentCamera) => {
    try {
      console.log(`📹 Starting camera initialization with facing mode: ${facingMode}`);

      // Stop existing stream properly
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });

        // Clear the video source
        videoRef.current.srcObject = null;

        // Wait for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`📹 Requesting camera access for: ${facingMode}`);

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
        console.log(`✅ Camera stream assigned to video element`);

        // Enhanced video readiness validation
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video loading timeout'));
          }, 10000); // 10 second timeout

          const handleLoadedData = () => {
            clearTimeout(timeout);
            videoRef.current.removeEventListener('loadeddata', handleLoadedData);
            videoRef.current.removeEventListener('error', handleError);
            console.log(`📹 Video data loaded for ${facingMode} camera`);
            resolve();
          };

          const handleError = (error) => {
            clearTimeout(timeout);
            videoRef.current.removeEventListener('loadeddata', handleLoadedData);
            videoRef.current.removeEventListener('error', handleError);
            reject(error);
          };

          videoRef.current.addEventListener('loadeddata', handleLoadedData);
          videoRef.current.addEventListener('error', handleError);
        });

        // Wait for video dimensions to be available
        await new Promise((resolve) => {
          const checkDimensions = () => {
            if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              const video = videoRef.current;
              const videoAspect = video.videoWidth / video.videoHeight;
              const isLandscape = videoAspect >= 1.3;
              console.log(`📹 Video ready - Resolution: ${video.videoWidth}x${video.videoHeight}, Aspect: ${videoAspect.toFixed(2)}, ${isLandscape ? 'Landscape ✅' : 'Portrait ❌'}`);
              resolve();
            } else {
              setTimeout(checkDimensions, 100);
            }
          };
          checkDimensions();
        });

        // Additional stabilization delay for camera switch
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log(`✅ Camera fully initialized and ready for ${facingMode}`);
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

  // Enhanced camera switching function with canvas preservation
  const switchCamera = useCallback(async () => {
    try {
      console.log('🔄 Starting camera switch...');

      // Prevent captures during camera switch
      setIsProcessing(true);
      setIsSwitchingCamera(true);

      // Store current canvas state before switching
      let canvasBackup = null;
      if (canvasRef.current) {
        canvasBackup = canvasRef.current.toDataURL('image/png');
        console.log('💾 Canvas state backed up before camera switch');
      }

      const newCamera = currentCamera === 'user' ? 'environment' : 'user';
      console.log(`🔄 Switching to ${newCamera === 'user' ? 'front' : 'back'} camera`);

      // Update camera state
      setCurrentCamera(newCamera);

      // Initialize new camera
      await initializeCamera(newCamera);

      // Wait additional time for camera to fully stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restore canvas state if it was lost
      if (canvasBackup && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current.getContext('2d');
          ctx.drawImage(img, 0, 0);
          console.log('✅ Canvas state restored after camera switch');
        };
        img.src = canvasBackup;
      } else {
        // Reinitialize canvas if no backup available
        console.log('🔄 Reinitializing canvas after camera switch');
        initializeCanvas();
      }

      console.log('✅ Camera switch completed successfully');

    } catch (error) {
      console.error('❌ Camera switch failed:', error);
      setNotification({
        type: "error",
        message: "Failed to switch camera. Please try again."
      });
    } finally {
      // Re-enable captures after switch is complete
      setTimeout(() => {
        setIsProcessing(false);
        setIsSwitchingCamera(false);
      }, 500);
    }
  }, [currentCamera, initializeCamera, initializeCanvas]);

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
    if (steps >= 3 || isProcessing) return;

    // Check if video is ready before starting capture
    if (!isVideoReady()) {
      setNotification({
        type: "error",
        message: "Camera is not ready yet. Please wait a moment and try again."
      });
      return;
    }

    // Start processing state
    setIsProcessing(true);
    console.log('📸 Taking photo with processing delay...');
    takePhoto();
  };

  const takePhoto = async () => {
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

    // Wait 500ms before drawing to canvas to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Double-check canvas is still ready after delay
    if (!canvasRef.current) {
      console.error('❌ Canvas not ready after delay');
      setNotification({
        type: "error",
        message: "Canvas not ready. Please try again."
      });
      return;
    }

    // Enhanced video readiness validation
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      console.error('❌ Video not fully loaded or switching cameras');
      setNotification({
        type: "error",
        message: "Camera is switching. Please wait a moment and try again."
      });
      setIsProcessing(false);
      return;
    }

    // Additional check for camera switch completion
    if (video.videoWidth < 100 || video.videoHeight < 100) {
      console.error('❌ Video dimensions too small, camera may still be switching');
      setNotification({
        type: "error",
        message: "Camera is still initializing. Please wait and try again."
      });
      setIsProcessing(false);
      return;
    }

    console.log(`📸 Video validated - ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      console.error('❌ Canvas context not available');
      return;
    }

    // Photo frames - MUST match addBeautifulText dimensions exactly
    const photoWidth = 520;    // Match white box width exactly
    const photoHeight = 350;   // Match white box height exactly
    const photoX = (660 - photoWidth) / 2; // Center the photo boxes

    // Y positions - adjusted slightly down for better positioning
    const photoPositions = [
      60,   // First photo box Y position (moved down slightly)
      520,  // Second photo box Y position (moved down slightly)
      980   // Third photo box Y position (moved down slightly)
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
        // Ensure canvas is still ready before drawing
        if (!canvasRef.current) return;

        // First: Draw template background to fill entire canvas (preserves gradient)
        ctx.drawImage(templateImg, 0, 0, 660, 1800);

        // Then: Draw all captured photos on top (preserves template in gaps)
        let photosLoaded = 0;
        let photosErrored = 0;

        if (newCapturedPhotos.length === 0) {
          console.warn('⚠️ No photos to draw on canvas');
          addBeautifulText(ctx);
          return;
        }

        newCapturedPhotos.forEach((photo, index) => {
          const photoImg = new Image();
          photoImg.crossOrigin = 'anonymous'; // Enable CORS for photo data URLs
          photoImg.onload = () => {
            // Ensure canvas is still ready before drawing
            if (!canvasRef.current) {
              console.error('❌ Canvas lost during photo loading');
              return;
            }

            // Draw photo exactly within box boundaries
            ctx.drawImage(photoImg, 0, 0, photoWidth, photoHeight, photo.x, photo.y, photoWidth, photoHeight);
            photosLoaded++;
            console.log(`✅ Photo ${index + 1}/${newCapturedPhotos.length} drawn to canvas`);

            // After all photos are loaded, add beautiful text
            if (photosLoaded + photosErrored === newCapturedPhotos.length) {
              addBeautifulText(ctx);
              setIsCanvasReady(true); // Mark canvas as ready
              console.log('✅ All photos processed, text added, canvas ready');
            }
          };

          photoImg.onerror = () => {
            console.error(`❌ Failed to load photo ${index + 1} for canvas`);
            photosErrored++;

            // Continue even if some photos fail
            if (photosLoaded + photosErrored === newCapturedPhotos.length) {
              addBeautifulText(ctx);
              setIsCanvasReady(true); // Mark canvas as ready
              console.log('✅ All photos processed (some failed), text added, canvas ready');
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
        console.error('❌ Failed to load template for photo placement, using default background');
        // Use default background instead of blank canvas
        try {
          createDefaultBackground(ctx, 660, 1800);
          // Draw photo exactly within box boundaries
          ctx.drawImage(tempCanvas, 0, 0, photoWidth, photoHeight, photoX, photoY, photoWidth, photoHeight);
          addBeautifulText(ctx);
          console.log('✅ Photo placed on default background - no blank strip!');
        } catch (error) {
          console.error('❌ Error in template fallback:', error);
        }
      };

      templateImg.src = settings.template;
    } else {
      // If no template, use default background instead of transparent
      console.log('📸 No template available, using default background for photo');
      createDefaultBackground(ctx, 660, 1800);
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

    // Add processing delay to ensure proper strip generation
    setTimeout(() => {
      setIsProcessing(false);
      console.log('✅ Processing complete, ready for next capture');
    }, 2000); // 2 second delay between captures
  };

  const submit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setNotification(null);
      setRetryStatus(null); // Clear any previous retry status

      // Validate canvas has content before submitting
      if (!canvasRef.current) {
        throw new Error('Canvas not available');
      }

      // Wait for canvas to be fully rendered (optimized timing)
      console.log('⏳ Waiting for canvas to be fully rendered...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second - balanced speed and reliability

      // Double-check canvas is still ready
      if (!canvasRef.current) {
        throw new Error('Canvas not ready after delay');
      }

      // Validate canvas has actual content (not just blank)
      const ctx = canvasRef.current.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const pixels = imageData.data;

      // Check if canvas has non-transparent pixels
      let hasContent = false;
      for (let i = 3; i < pixels.length; i += 4) { // Check alpha channel every 4th byte
        if (pixels[i] > 0) { // If alpha > 0, there's content
          hasContent = true;
          break;
        }
      }

      if (!hasContent) {
        throw new Error('Canvas appears to be blank - no photos detected');
      }

      console.log('✅ Canvas validation passed - content detected');

      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);

      // Validate the generated image data
      if (!dataUrl || dataUrl.length < 10000) {
        throw new Error('Generated image appears to be blank or too small');
      }

      console.log(`📤 Submitting photo strip, data size: ${(dataUrl.length / 1024).toFixed(1)}KB`);

      // Create a custom axios instance for this upload with retry status updates
      const uploadAxios = axios.create();

      // Configure retry with status updates for this specific request
      axiosRetry(uploadAxios, {
        retries: 3,
        retryDelay: (retryCount, error) => {
          console.warn(`🔄 Upload retry ${retryCount}/3 due to:`, error.message);
          setRetryStatus(`Retrying upload (${retryCount}/3)...`);
          return axiosRetry.exponentialDelay(retryCount);
        },
        retryCondition: (error) => {
          // Smart retry: Only retry on network errors and 5xx server errors
          return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                 (error.response && error.response.status >= 500);
        }
      });

      await uploadAxios.post(`${API_BASE_URL}/api/strips`, {
        image: dataUrl,
        eventName: settings.eventName,
        template: settings.template
      });

      setRetryStatus(null); // Clear retry status on success
      setNotification({
        type: "success",
        message: "✅ Thank you! Your photo strip has been sent for print."
      });

      setSteps(0);
      setCapturedPhotos([]); // Clear captured photos
      setIsCanvasReady(false); // Reset canvas ready state
      initializeCanvas(); // Clear and reinitialize with background
    } catch (error) {
      console.error("❌ Upload failed after retries:", {
        error: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.config?.data ? 'Photo data present' : 'No data'
      });

      setRetryStatus(null); // Clear retry status on final failure

      // Provide specific error messages based on error type
      let errorMessage = "❌ Upload failed. Please try again.";
      if (error.code === 'ECONNABORTED') {
        errorMessage = "❌ Upload timed out. Please check your connection and try again.";
      } else if (error.response?.status === 413) {
        errorMessage = "❌ Photo too large. Please try again.";
      } else if (error.response?.status >= 500) {
        errorMessage = "❌ Server error. Please try again in a moment.";
      } else if (!navigator.onLine) {
        errorMessage = "❌ No internet connection. Please check your network.";
      }

      setNotification({
        type: "error",
        message: errorMessage
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
        <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-10 desktop-header">
          <div className="inline-block p-4 sm:p-6 bg-white/10 backdrop-blur-lg rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl mb-4 sm:mb-6 relative mobile-header">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-2 sm:mb-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              📸 Strip Photobooth
            </h1>
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
        <div className="w-full max-w-none sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-2 sm:px-6 mobile-camera-section">
          <div className="relative">



            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg shadow-2xl border-2 border-white/20 mobile-camera-video"
              style={{
                width: '100%',
                height: '60vh', // Mobile: bigger height for multiple people
                minHeight: '400px', // Mobile: larger minimum height
                maxHeight: '60vh', // Mobile: larger maximum height
                objectFit: 'contain',
                transform: 'scale(1.1)',
                transformOrigin: 'top center'
              }}
            />

            {/* Frame overlay to help users stay in frame */}
            <div className="absolute inset-2 border-2 border-white/30 rounded-lg pointer-events-none"></div>



            {/* Camera Switching Indicator */}
            {isSwitchingCamera && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-lg font-semibold">Switching Camera...</p>
                  <p className="text-sm opacity-75">Please wait a moment</p>
                </div>
              </div>
            )}

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

            {/* Progress Indicators - Top/Mid/Bot above capture button */}
            <div className="mt-6 sm:mt-8 mb-4 sm:mb-6 flex justify-center space-x-6 sm:space-x-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center space-y-2">
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-500 ${
                        steps >= step
                          ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-300 shadow-lg shadow-green-400/50'
                          : steps + 1 === step
                          ? 'bg-blue-400 border-blue-300 animate-pulse'
                          : 'bg-white/10 border-white/30'
                      }`}
                    />
                    <span className={`text-sm sm:text-base font-medium transition-colors duration-300 ${
                      steps >= step ? 'text-green-300' : steps + 1 === step ? 'text-blue-300' : 'text-white/70'
                    }`}>
                      {step === 1 ? 'Top' : step === 2 ? 'Mid' : 'Bot'}
                    </span>
                  </div>
                ))}
            </div>

            {/* Enhanced Capture Button - Mobile Optimized */}
            <div className="mt-2 sm:mt-3 mobile-controls desktop-capture-spacing">
              <button
                onClick={startCapture}
                disabled={steps >= 3 || isProcessing}
                className={`w-full py-3 sm:py-3 md:py-3 px-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-base md:text-lg transition-all duration-300 transform relative overflow-hidden mobile-button ${
                  steps >= 3 || isProcessing
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed text-gray-200'
                    : 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-2xl hover:shadow-blue-500/25 hover:scale-105 active:scale-95 border border-white/30'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-lg sm:text-base md:text-lg">Processing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl sm:text-2xl">{steps >= 3 ? '✅' : '📸'}</span>
                      <span className="text-lg sm:text-base md:text-lg">{steps >= 3 ? 'All Photos Captured!' : 'Capture Photo'}</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Submit Strip Button */}
            <div className="mt-6 sm:mt-8 mobile-controls desktop-submit-spacing">
              <button
                onClick={submit}
                disabled={steps < 3 || isSubmitting}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform relative overflow-hidden mobile-button ${
                  steps >= 3 && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center space-x-3">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{retryStatus || "Creating Strip..."}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🚀</span>
                      <span>Submit Strip</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Camera Switch Button - Mobile Optimized */}
            <div className="mt-4 sm:mt-5 mobile-controls desktop-switch-spacing">
              <button
                onClick={switchCamera}
                disabled={isProcessing || isSwitchingCamera}
                className={`w-full py-4 sm:py-3 px-4 backdrop-blur-lg rounded-xl text-white font-medium transition-all duration-300 transform border mobile-camera-switch ${
                  isProcessing || isSwitchingCamera
                    ? 'bg-gray-500/20 cursor-not-allowed border-gray-500/30'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 border-white/20 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  {isSwitchingCamera ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-base sm:text-sm md:text-base">Switching Camera...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🔄</span>
                      <span className="text-base sm:text-sm md:text-base">Switch to {currentCamera === 'user' ? 'Back' : 'Front'} Camera</span>
                      <span className="text-xs sm:text-sm opacity-75 hidden sm:inline">
                        ({currentCamera === 'user' ? 'Front' : 'Back'} Active)
                      </span>
                    </>
                  )}
                </div>
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
