import { useEffect } from 'react';
import '../print.css';

const PrintStrip = ({ strip, onClose }) => {
  useEffect(() => {
    // Simple approach - just print after a short delay
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
      {/* Simple approach - print exactly what you see */}
      <div className="print-content">
        <img
          src={strip.imageUrl}
          alt="Photo Strip"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: '2in',
            display: 'block',
            margin: '0 auto'
          }}
        />
      </div>
    </div>
  );
};

export default PrintStrip;
