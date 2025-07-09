import { useEffect, useState } from 'react';

const PrintStrip = ({ strip, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    if (!strip?.imageUrl) {
      console.error('No image URL provided for printing');
      onClose();
      return;
    }

    console.log('🖨️ Loading image for printing:', strip.imageUrl);

    // Preload the image to ensure it's ready for printing
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS for Cloudinary images

    img.onload = () => {
      console.log('✅ Image loaded successfully for printing');
      setImageLoaded(true);
      // Don't auto-print, wait for user to click print after seeing instructions
    };

    img.onerror = (error) => {
      console.error('❌ Failed to load image for printing:', error);
      console.error('Image URL:', strip.imageUrl);
      alert('Failed to load image for printing. Please try downloading instead.');
      onClose();
    };

    img.src = strip.imageUrl;
  }, [strip, onClose]);

  useEffect(() => {
    // Listen for print events
    const handleAfterPrint = () => {
      onClose();
    };

    const handleBeforePrint = () => {
      console.log('Print dialog opened');
    };

    window.addEventListener('afterprint', handleAfterPrint);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [onClose]);

  const handlePrint = () => {
    setShowInstructions(false);
    setTimeout(() => {
      console.log('🖨️ Opening print dialog...');
      window.print();
    }, 100);
  };

  if (!strip || !imageLoaded) return null;

  return (
    <>
      {/* Print Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🖨️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">EPSON L3560 Print Setup</h2>
              <p className="text-gray-600">Critical settings for full coverage:</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-semibold text-gray-800">Enable "Borderless Printing"</p>
                  <p className="text-sm text-gray-600">EPSON Settings → Borderless: ON</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-semibold text-gray-800">Set Margins to "None"</p>
                  <p className="text-sm text-gray-600">Browser: More Settings → Margins: None</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-semibold text-gray-800">Paper: 4×6 inch (North America)</p>
                  <p className="text-sm text-gray-600">Will print 2×6 strip on 4×6 paper</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="font-semibold text-gray-800">Quality: High/Best</p>
                  <p className="text-sm text-gray-600">For professional photo booth quality</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
              >
                Print Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL BLEED Print styles - NO MARGINS */}
      <style jsx>{`
        @media print {
          @page {
            size: 2in 6in;
            margin: 0 !important;
            padding: 0 !important;
          }

          * {
            visibility: hidden !important;
          }

          .print-strip-container,
          .print-strip-container *,
          .print-strip-image {
            visibility: visible !important;
          }

          .print-strip-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 2in !important;
            height: 6in !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: hidden !important;
          }

          .print-strip-image {
            /* EPSON L3560: Slightly larger to ensure full coverage */
            width: 2.1in !important;
            height: 6.1in !important;
            min-width: 2.1in !important;
            min-height: 6.1in !important;
            max-width: 2.1in !important;
            max-height: 6.1in !important;

            /* CRITICAL: Cover entire area with slight overflow */
            object-fit: cover !important;
            object-position: center !important;
            display: block !important;
            position: absolute !important;
            top: -0.05in !important;
            left: -0.05in !important;

            /* Remove ALL spacing */
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;

            /* EPSON print quality */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;

            /* Force visibility */
            z-index: 999 !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          /* Ensure no extra pages and full coverage */
          html, body {
            width: 2in !important;
            height: 6in !important;
            max-width: 2in !important;
            max-height: 6in !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
        }

        @media screen {
          .print-strip-container {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      <div className="print-strip-container">
        <img
          className="print-strip-image"
          src={strip.imageUrl}
          alt="Photo Strip"
          crossOrigin="anonymous"
          onLoad={() => console.log('✅ Print image rendered successfully')}
          onError={(e) => {
            console.error('❌ Print image render failed:', e);
            console.error('Image URL:', strip.imageUrl);
          }}
        />
      </div>
    </>
  );
};

export default PrintStrip;
