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

// Remove global timeout - let requests take time they need
// Only critical uploads will have specific timeouts

export default function CapturePage() {
  const canvasRef = useRef(null);
  const [steps, setSteps] = useState(0);
  const [showNextPhotoMessage, setShowNextPhotoMessage] = useState(false);
  const useMobileCamera = true; // Always use mobile camera now
  const [settings, setSettings] = useState({
    template: null // Template image instead of background color
  });
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState(null); // For retry feedback
  const [capturedPhotos, setCapturedPhotos] = useState([]); // Store captured photo data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Processing delay between captures
  const [cachedTemplate, setCachedTemplate] = useState(null); // Cache template for offline use
  const [isCanvasReady, setIsCanvasReady] = useState(false); // Track canvas rendering state
  const [isCanvasProtected, setIsCanvasProtected] = useState(false); // Prevent canvas clearing during submission
  const [isOffline, setIsOffline] = useState(false); // Track network status

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
    // CRITICAL: Don't clear canvas if it's protected during submission
    if (isCanvasProtected) {
      console.log('🛡️ Canvas protected - skipping initialization to prevent blank strips');
      return;
    }

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
  }, [settings.template, cachedTemplate, isCanvasProtected]);

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
        template: response.data.templateUrl || null // Use templateUrl from backend
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
            template: savedTemplate
          });
          setCachedTemplate(savedTemplate);
        } else {
          console.log('⚠️ No fallback settings found, using defaults');
          setSettings({
            template: null
          });
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Try to use cached template even if parsing fails
        const savedTemplate = localStorage.getItem('cachedTemplate');
        setSettings({
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

  // Initialize canvas when settings change (CRITICAL FIX: Don't clear during capture)
  useEffect(() => {
    if (canvasRef.current && capturedPhotos.length === 0 && steps === 0) {
      // Only reinitialize if no photos are captured and not in progress
      console.log('🔄 Settings changed, redrawing canvas (no photos captured)...');
      initializeCanvas();
    } else if (capturedPhotos.length > 0 || steps > 0) {
      console.log('⚠️ Settings changed but photos captured - NOT clearing canvas to prevent blank strips');
    }
  }, [settings.template, initializeCanvas, capturedPhotos.length, steps]);

  // Photo boxes layout with optimized dimensions
  const addBeautifulText = (ctx) => {
    console.log('🎨 Adding beautiful text and BLACK BORDERS to canvas');
    const canvasWidth = 660;   // Actual canvas width
    const photoWidth = 520;    // Custom width for photo boxes
    const photoHeight = 385;   // Custom height for photo boxes (increased even more)
    const photoX = (canvasWidth - photoWidth) / 2; // Center the photo boxes

    // Photo frame positions - increased gaps further
    const photoPositions = [90, 515, 940]; // Increased gaps further between all boxes

    // Add prominent black borders around photo frames
    photoPositions.forEach((photoY, index) => {
      ctx.save();

      // Prominent black border for better contrast and visibility
      ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)'; // Full opacity black
      ctx.lineWidth = 4; // Thicker border for better visibility
      ctx.strokeRect(photoX - 3, photoY - 3, photoWidth + 6, photoHeight + 6);
      console.log(`🖤 Drew BLACK BORDER for photo box ${index + 1} at position y:${photoY}`);

      // Add inner shadow effect for more definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(photoX - 1, photoY - 1, photoWidth + 2, photoHeight + 2);

      ctx.restore();
    });

    // Event name removed - no text added to strips anymore
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

  // Live camera removed - mobile camera only

  // Camera initialization removed

  // Camera switching removed

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

  // Live camera functions removed

  // Mobile camera capture function - SAME WORKFLOW AS LIVE CAMERA
  const handleMobileCameraCapture = async (e) => {
    console.log('📱 Mobile camera capture triggered', e);
    const file = e.target.files[0];
    console.log('📱 Selected file:', file);

    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    if (steps >= 3 || isProcessing) {
      console.log('❌ Cannot capture - steps:', steps, 'isProcessing:', isProcessing);
      return;
    }

    setIsProcessing(true);
    console.log('📱 Mobile camera capture started...');

    try {
      // Create image from file
      const imageURL = URL.createObjectURL(file);
      const img = new Image();

      img.onload = async () => {
        try {
          // Process mobile image exactly like live camera
          await processMobileCapturedImage(img);

          // Clean up object URL
          URL.revokeObjectURL(imageURL);

          // Clear the file input to allow new captures
          const input = document.getElementById('mobileCameraInput');
          if (input) {
            input.value = '';
          }

        } catch (error) {
          console.error('❌ Error processing mobile captured image:', error);
          setNotification({
            type: "error",
            message: "Failed to process photo. Please try again."
          });
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        console.error('❌ Failed to load mobile captured image');
        setNotification({
          type: "error",
          message: "Failed to load photo. Please try again."
        });
        setIsProcessing(false);
        URL.revokeObjectURL(imageURL);
      };

      img.src = imageURL;

    } catch (error) {
      console.error('❌ Mobile camera capture error:', error);
      setNotification({
        type: "error",
        message: "Failed to capture photo. Please try again."
      });
      setIsProcessing(false);
    }
  };

  // Process mobile captured image - EXACT SAME WORKFLOW AS LIVE CAMERA
  const processMobileCapturedImage = async (img) => {
    console.log('📱 Starting mobile photo processing...');

    // Validate canvas is ready
    if (!canvasRef.current) {
      throw new Error('Canvas not ready');
    }

    // Wait 500ms before processing to ensure everything is ready (same as live camera)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Double-check canvas is still ready after delay
    if (!canvasRef.current) {
      throw new Error('Canvas not ready after delay');
    }

    // Photo frames - MUST match live camera dimensions exactly
    const photoWidth = 520;    // Match white box width exactly
    const photoHeight = 385;   // Match white box height exactly
    const photoX = (660 - photoWidth) / 2; // Center the photo boxes

    // Y positions - same as live camera
    const photoPositions = [
      90,   // First photo box Y position
      515,  // Second photo box Y position
      940   // Third photo box Y position
    ];

    const photoY = photoPositions[steps] || photoPositions[0];

    // Create temporary canvas for processing (same as live camera)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = photoWidth;
    tempCanvas.height = photoHeight;

    // Ensure consistent scaling across environments
    tempCanvas.style.width = photoWidth + 'px';
    tempCanvas.style.height = photoHeight + 'px';

    const tempCtx = tempCanvas.getContext('2d');

    // Disable image smoothing for consistent pixel-perfect rendering
    tempCtx.imageSmoothingEnabled = false;

    try {
      // Get mobile image dimensions
      const imgWidth = img.width || img.naturalWidth;
      const imgHeight = img.height || img.naturalHeight;

      // Validate image dimensions
      if (!imgWidth || !imgHeight || imgWidth < 100 || imgHeight < 100) {
        throw new Error('Invalid mobile image dimensions');
      }

      // Smart cropping logic (same as live camera)
      const imgAspect = imgWidth / imgHeight;
      const boxAspect = photoWidth / photoHeight;

      let sourceX = 0, sourceY = 0, sourceWidth = imgWidth, sourceHeight = imgHeight;

      if (imgAspect > boxAspect) {
        // Image is wider than box - crop sides
        sourceWidth = imgHeight * boxAspect;
        sourceX = (imgWidth - sourceWidth) / 2;
      } else {
        // Image is taller than box - crop bottom only (same as live camera)
        sourceHeight = imgWidth / boxAspect;
        sourceY = 0; // Keep top, crop bottom
      }

      // Draw cropped mobile image to fill entire box without stretching
      tempCtx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source: Cropped portion
        0, 0, photoWidth, photoHeight // Destination: Fill entire box
      );

      console.log(`📱 Mobile photo processed with smart crop - Image: ${imgWidth}x${imgHeight}, Cropped: ${sourceWidth}x${sourceHeight}, Box: ${photoWidth}x${photoHeight}`);
    } catch (error) {
      console.error('❌ Error processing mobile image:', error);
      throw new Error('Failed to process mobile image');
    }

    // Store the captured photo data for redrawing with template
    let capturedPhotoData;
    try {
      // Convert to WebP format for faster loading (same as live camera)
      capturedPhotoData = tempCanvas.toDataURL('image/webp', 0.8);
      if (!capturedPhotoData || capturedPhotoData.length < 1000) {
        throw new Error('Mobile photo data too small or empty');
      }
    } catch (error) {
      console.error('❌ Error converting mobile photo to data URL:', error);
      throw new Error('Failed to process mobile photo');
    }

    // Store in same format as live camera
    const newCapturedPhotos = [...capturedPhotos, {
      data: capturedPhotoData,
      x: photoX,
      y: photoY
    }];
    setCapturedPhotos(newCapturedPhotos);
    console.log(`✅ Mobile photo ${steps + 1} captured successfully, data size: ${(capturedPhotoData.length / 1024).toFixed(1)}KB`);

    // Redraw everything: template background + all photos + beautiful text (SAME AS LIVE CAMERA)
    const ctx = canvasRef.current.getContext('2d');

    if (settings.template) {
      const templateImg = new Image();
      templateImg.crossOrigin = 'anonymous'; // Enable CORS for Cloudinary images
      templateImg.onload = async () => {
        // Ensure canvas is still ready before drawing
        if (!canvasRef.current) return;

        // First: Draw template background to fill entire canvas (preserves gradient)
        ctx.drawImage(templateImg, 0, 0, 660, 1800);

        // Then: Draw all captured photos on top (preserves template in gaps)
        if (newCapturedPhotos.length === 0) {
          console.warn('⚠️ No mobile photos to draw on canvas');
          addBeautifulText(ctx);
          return;
        }

        // CRITICAL FIX: Use Promise.all to ensure ALL photos load before proceeding
        const photoPromises = newCapturedPhotos.map((photo, index) => {
          return new Promise((resolve, reject) => {
            const photoImg = new Image();
            photoImg.crossOrigin = 'anonymous'; // Enable CORS for mobile photos

            photoImg.onload = () => {
              // Ensure canvas is still ready before drawing
              if (!canvasRef.current) {
                reject(new Error('Canvas not ready'));
                return;
              }

              // Draw photo exactly within box boundaries
              ctx.drawImage(photoImg, 0, 0, photoWidth, photoHeight, photo.x, photo.y, photoWidth, photoHeight);
              console.log(`✅ Mobile photo ${index + 1}/${newCapturedPhotos.length} drawn to canvas`);
              resolve();
            };

            photoImg.onerror = () => {
              console.error(`❌ Failed to load mobile photo ${index + 1} for canvas`);
              reject(new Error(`Failed to load photo ${index + 1}`));
            };

            photoImg.src = photo.data;
          });
        });

        // Wait for ALL photos to load before adding text
        try {
          await Promise.all(photoPromises);
          console.log('✅ ALL mobile photos loaded successfully');

          // Add text only after all photos are confirmed loaded
          addBeautifulText(ctx);
          setIsCanvasReady(true);
          console.log('✅ All mobile photos processed, text added, canvas ready');
        } catch (error) {
          console.error('❌ Some mobile photos failed to load:', error);
          // Still add text even if some photos failed
          addBeautifulText(ctx);
          setIsCanvasReady(true);
          console.log('✅ Mobile photos processed (some failed), text added, canvas ready');
        }

        // If no photos yet, still add text
        if (newCapturedPhotos.length === 0) {
          addBeautifulText(ctx);
        }
      };

      templateImg.onerror = () => {
        console.error('❌ Failed to load template for mobile photo');
        // Fallback to default background
        createDefaultBackground(ctx, 660, 1800);
        ctx.drawImage(tempCanvas, 0, 0, photoWidth, photoHeight, photoX, photoY, photoWidth, photoHeight);
        addBeautifulText(ctx);
      };

      templateImg.src = settings.template;
    } else {
      // If no template, use default background instead of transparent
      console.log('📱 No template available, using default background for mobile photo');
      createDefaultBackground(ctx, 660, 1800);
      // Draw photo exactly within box boundaries
      ctx.drawImage(tempCanvas, 0, 0, photoWidth, photoHeight, photoX, photoY, photoWidth, photoHeight);
      addBeautifulText(ctx);
    }

    // Move to next step (same as live camera)
    setSteps(prev => prev + 1);

    // Show "Next Photo" message after capture (except for the last photo)
    if (steps < 2) {
      setShowNextPhotoMessage(true);
      setTimeout(() => {
        setShowNextPhotoMessage(false);
      }, 1500); // Show for 1.5 seconds
    }

    // Processing delay between captures (same as live camera)
    setTimeout(() => {
      setIsProcessing(false);
      console.log('✅ Mobile photo processing complete, ready for next capture');
    }, 2000); // 2 second delay between captures

    console.log(`📱 Mobile photo processed and placed in box ${steps + 1}`);
  };

  // CRITICAL: Force canvas redraw with all photos to prevent blank strips
  const forceCanvasRedrawWithPhotos = async () => {
    if (!canvasRef.current || capturedPhotos.length === 0) {
      console.log('⚠️ Cannot force redraw - no canvas or no photos');
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    console.log(`🔄 Force redrawing canvas with ${capturedPhotos.length} photos...`);

    try {
      if (settings.template) {
        // Redraw with template
        const templateImg = new Image();
        templateImg.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          templateImg.onload = async () => {
            try {
              // Clear and draw template
              ctx.clearRect(0, 0, 660, 1800);
              ctx.drawImage(templateImg, 0, 0, 660, 1800);
              console.log('✅ Template redrawn for force redraw');

              // Draw all photos synchronously
              const photoPromises = capturedPhotos.map((photo, index) => {
                return new Promise((photoResolve) => {
                  const photoImg = new Image();
                  photoImg.crossOrigin = 'anonymous';
                  photoImg.onload = () => {
                    ctx.drawImage(photoImg, 0, 0, 520, 385, photo.x, photo.y, 520, 385);
                    console.log(`✅ Force redraw: Photo ${index + 1} drawn at x:${photo.x}, y:${photo.y}`);
                    photoResolve();
                  };
                  photoImg.onerror = () => {
                    console.error(`❌ Force redraw: Failed to load photo ${index + 1}`);
                    photoResolve(); // Continue even if photo fails
                  };
                  photoImg.src = photo.data;
                });
              });

              await Promise.all(photoPromises);
              addBeautifulText(ctx);
              console.log('✅ Force redraw with template completed');
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          templateImg.onerror = () => reject(new Error('Template load failed in force redraw'));
          templateImg.src = settings.template;
        });
      } else {
        // Redraw with default background
        createDefaultBackground(ctx, 660, 1800);
        console.log('✅ Default background redrawn for force redraw');

        // Draw all photos synchronously
        const photoPromises = capturedPhotos.map((photo, index) => {
          return new Promise((photoResolve) => {
            const photoImg = new Image();
            photoImg.onload = () => {
              ctx.drawImage(photoImg, 0, 0, 520, 385, photo.x, photo.y, 520, 385);
              console.log(`✅ Force redraw: Photo ${index + 1} drawn (no template) at x:${photo.x}, y:${photo.y}`);
              photoResolve();
            };
            photoImg.onerror = () => {
              console.error(`❌ Force redraw: Failed to load photo ${index + 1}`);
              photoResolve(); // Continue even if photo fails
            };
            photoImg.src = photo.data;
          });
        });

        await Promise.all(photoPromises);
        addBeautifulText(ctx);
        console.log('✅ Force redraw without template completed');
      }

      // Wait a bit more to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Force canvas redraw completed successfully');

    } catch (error) {
      console.error('❌ Force canvas redraw failed:', error);
      throw new Error('Failed to redraw canvas with photos');
    }
  };

  // Live camera capture removed

  // takePhoto function removed

  // Live camera capture functions removed

  const submit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setNotification(null);
      console.log('🚀 SIMPLE SUBMIT: Starting upload...');

      // Basic validation only
      if (!canvasRef.current || capturedPhotos.length === 0) {
        throw new Error('No photos captured');
      }

      // Get canvas data immediately - no complex validation
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
      console.log('� Canvas data size:', (dataUrl.length / 1024).toFixed(1), 'KB');

      // Simple upload with timeout
      const response = await axios.post(`${API_BASE_URL}/api/strips`, {
        image: dataUrl,
        template: settings.template
      }, {
        timeout: 60000 // 60 second timeout
      });

      console.log('✅ Upload successful!');
      setNotification({
        type: "success",
        message: "✅ Thank you! Your photo strip has been sent for print."
      });

      // Reset everything immediately
      setSteps(0);
      setCapturedPhotos([]);
      setIsCanvasReady(false);
      initializeCanvas();

      return;
    } catch (error) {
      console.error('❌ Simple submit error:', error.message);
      setNotification({
        type: "error",
        message: "❌ Upload failed. Please try again."
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



            {/* Mobile camera info section removed */}



            {/* Camera switching indicator removed */}

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

            {/* Live camera capture button removed */}

            {/* Mobile Camera Input - Now Default */}
              <div className="mt-4 sm:mt-6 mobile-controls">
                <button
                  onClick={() => {
                    console.log('📱 Mobile camera button clicked');
                    const input = document.getElementById('mobileCameraInput');
                    console.log('📱 Input element found:', input);
                    if (input) {
                      input.click();
                      console.log('📱 Input clicked');
                    } else {
                      console.error('❌ Mobile camera input not found');
                    }
                  }}
                  disabled={steps >= 3 || isProcessing}
                  className={`w-full py-3 sm:py-3 md:py-3 px-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-base md:text-lg transition-all duration-300 transform relative overflow-hidden mobile-button ${
                    steps >= 3 || isProcessing
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed text-gray-200'
                      : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white shadow-2xl hover:shadow-red-500/25 hover:scale-105 active:scale-95 border border-white/30'
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
                        <span className="text-2xl sm:text-2xl">{steps >= 3 ? '✅' : '📱'}</span>
                        <span className="text-lg sm:text-base md:text-lg">{steps >= 3 ? 'All Photos Captured!' : 'Open Mobile Camera'}</span>
                      </>
                    )}
                  </div>
                </button>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="mobileCameraInput"
                  onChange={handleMobileCameraCapture}
                  disabled={steps >= 3 || isProcessing}
                  style={{ display: "none" }}
                />
              </div>

            {/* Submit Strip Button */}
            <div className="mt-6 sm:mt-8 mobile-controls desktop-submit-spacing">
              <button
                onClick={submit}
                disabled={steps < 3 || isSubmitting || capturedPhotos.length === 0}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform relative overflow-hidden mobile-button ${
                  steps >= 3 && !isSubmitting && capturedPhotos.length > 0
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

            {/* Camera switch button removed */}


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
