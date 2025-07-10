import { useEffect, useState } from 'react';

const PrintStrip = ({ strip, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    if (!strip?.imageUrl) {
      onClose();
      return;
    }

    // Preload the image to ensure it's ready for printing
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImageLoaded(true);
    };

    img.onerror = () => {
      alert('Failed to load image for printing. Please try downloading instead.');
      onClose();
    };

    img.src = strip.imageUrl;
  }, [strip, onClose]);

  useEffect(() => {
    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  const handlePrint = () => {
    setShowInstructions(false);
    setTimeout(() => {
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
                  <p className="text-sm text-gray-600">More Settings → Margins: None (eliminates white borders)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-semibold text-gray-800">Use "Actual Size"</p>
                  <p className="text-sm text-gray-600">Scale: 100% (prevents white space around strip)</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-semibold text-gray-800">Check "Fit to Page"</p>
                  <p className="text-sm text-gray-600">If available, ensure strip fills entire page</p>
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

      <div className="print-container">
        <img
          className="strip-image"
          src={strip.imageUrl}
          alt="Photo Strip"
          crossOrigin="anonymous"
        />
      </div>
    </>
  );
};

export default PrintStrip;
