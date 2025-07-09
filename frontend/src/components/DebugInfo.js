import { useState, useEffect } from 'react';

const DebugInfo = () => {
  const [debugData, setDebugData] = useState({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const collectDebugInfo = () => {
      const canvas = document.querySelector('canvas');
      const printContainer = document.querySelector('.print-container');
      
      setDebugData({
        // Environment
        hostname: window.location.hostname,
        userAgent: navigator.userAgent,
        nodeEnv: process.env.NODE_ENV,
        apiUrl: process.env.REACT_APP_API_BASE_URL,
        
        // Canvas info
        canvasWidth: canvas?.width || 'Not found',
        canvasHeight: canvas?.height || 'Not found',
        canvasStyle: canvas ? getComputedStyle(canvas) : 'Not found',
        
        // Print container info
        printContainerExists: !!printContainer,
        printContainerStyle: printContainer ? getComputedStyle(printContainer) : 'Not found',
        
        // Browser info
        devicePixelRatio: window.devicePixelRatio,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        
        // CSS info
        printCssLoaded: !!document.querySelector('style[data-styled], link[href*="print.css"]'),
        
        // Timestamp
        timestamp: new Date().toISOString()
      });
    };

    collectDebugInfo();
    
    // Update debug info every 5 seconds
    const interval = setInterval(collectDebugInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded text-xs z-50"
        style={{ fontSize: '10px' }}
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/90 text-white p-4 z-50 overflow-auto text-xs">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Debug Information</h2>
        <button
          onClick={() => setShowDebug(false)}
          className="bg-red-500 px-3 py-1 rounded"
        >
          Close
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-yellow-400">Environment</h3>
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify({
              hostname: debugData.hostname,
              nodeEnv: debugData.nodeEnv,
              apiUrl: debugData.apiUrl,
              userAgent: debugData.userAgent?.substring(0, 100) + '...'
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold text-yellow-400">Canvas</h3>
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify({
              width: debugData.canvasWidth,
              height: debugData.canvasHeight,
              exists: debugData.canvasWidth !== 'Not found'
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold text-yellow-400">Print Container</h3>
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify({
              exists: debugData.printContainerExists,
              hasStyle: debugData.printContainerStyle !== 'Not found'
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold text-yellow-400">Browser</h3>
          <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto">
            {JSON.stringify({
              devicePixelRatio: debugData.devicePixelRatio,
              screenWidth: debugData.screenWidth,
              screenHeight: debugData.screenHeight,
              printCssLoaded: debugData.printCssLoaded
            }, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold text-yellow-400">Timestamp</h3>
          <p className="bg-gray-800 p-2 rounded text-xs">
            {debugData.timestamp}
          </p>
        </div>
        
        <button
          onClick={() => {
            const dataStr = JSON.stringify(debugData, null, 2);
            navigator.clipboard.writeText(dataStr);
            alert('Debug data copied to clipboard!');
          }}
          className="bg-blue-500 px-4 py-2 rounded"
        >
          Copy Debug Data
        </button>
      </div>
    </div>
  );
};

export default DebugInfo;
