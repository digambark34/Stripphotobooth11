import { useEffect, useState } from 'react';

const PrintStrip = ({ strip, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

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
      // Print after image is loaded with longer delay
      setTimeout(() => {
        console.log('🖨️ Opening print dialog...');
        window.print();
      }, 500);
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

  if (!strip || !imageLoaded) return null;

  return (
    <>
      {/* Print styles */}
      <style jsx>{`
        @media print {
          @page {
            size: 2in 6in;
            margin: 0.1in;
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
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            padding-top: 0.1in !important;
            background: white !important;
          }

          .print-strip-image {
            width: 1.8in !important;
            height: 5.8in !important;
            max-width: 1.8in !important;
            max-height: 5.8in !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }

          /* Ensure no extra pages */
          html, body {
            height: 6in !important;
            max-height: 6in !important;
            overflow: hidden !important;
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
