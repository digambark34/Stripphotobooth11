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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Print Instructions</h2>
              <p className="text-gray-600">For best results:</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-semibold text-gray-800">Set Margins to "None"</p>
                  <p className="text-sm text-gray-600">In print dialog: More Settings → Margins: None</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-semibold text-gray-800">Use "Actual Size"</p>
                  <p className="text-sm text-gray-600">Scale: 100% (Actual Size)</p>
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

      {/* Simple Print - Same as Download */}
      <style jsx>{`
        @media print {
          @page {
            size: 2in 6in;
            margin: 0;
          }

          * {
            visibility: hidden !important;
          }

          .print-strip-container,
          .print-strip-image {
            visibility: visible !important;
          }

          .print-strip-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 2in !important;
            height: 6in !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-strip-image {
            width: 2in !important;
            height: 6in !important;
            object-fit: cover !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
        }

        @media screen {
          .print-strip-container {
            display: none !important;
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
