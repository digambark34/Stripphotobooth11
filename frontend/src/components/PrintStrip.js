import { useEffect, useState } from 'react';
import '../print.css';

const PrintStrip = ({ strip, onClose }) => {
  const [individualPhotos, setIndividualPhotos] = useState([]);

  useEffect(() => {
    // Extract individual photos from the combined image
    if (strip?.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Updated image dimensions: 600×1800 at 300 DPI (3 photos of 600×600 each)
        const photoWidth = 600;
        const photoHeight = 600;

        canvas.width = photoWidth;
        canvas.height = photoHeight;

        const photos = [];

        // Extract each photo section
        for (let i = 0; i < 3; i++) {
          // Clear canvas
          ctx.clearRect(0, 0, photoWidth, photoHeight);

          // Draw the specific photo section
          ctx.drawImage(
            img,
            0, i * photoHeight, photoWidth, photoHeight, // Source: x, y, width, height
            0, 0, photoWidth, photoHeight // Destination: x, y, width, height
          );

          // Convert to data URL
          photos.push(canvas.toDataURL('image/jpeg', 0.9));
        }

        setIndividualPhotos(photos);
      };
      img.src = strip.imageUrl;
    }
  }, [strip?.imageUrl]);

  useEffect(() => {
    // Auto-trigger print dialog when component mounts
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Listen for print events
    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [onClose]);

  if (!strip) return null;

  return (
    <div className="print-container">

      {/* Print Layout */}
      <div className="strip-print-layout">
        {/* Single Strip for 2x6 inch GSM paper */}
        <div className="photo-strip-container">
          <div className="single-photo-strip">
            {/* 3 different photos vertically - each showing different captured photo */}
            {Array.from({ length: 3 }, (_, index) => {
              return (
                <div
                  key={`photo-${index}`}
                  className="strip-photo-frame"
                  style={{
                    backgroundImage: individualPhotos[index] ? `url(${individualPhotos[index]})` : `url(${strip.imageUrl})`,
                    backgroundColor: strip.customBackground?.value || '#ff0000',
                    backgroundSize: individualPhotos[index] ? 'cover' : '100% 300%',
                    backgroundPosition: individualPhotos[index] ? 'center' : `center ${index * -100}%`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              );
            })}

            {/* Text section */}
            <div className="strip-text-section">
              <div className="strip-event-name">{strip.eventName || 'Event Name'}</div>
              <div className="strip-date">{new Date(strip.timestamp).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintStrip;
