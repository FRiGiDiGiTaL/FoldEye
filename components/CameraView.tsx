import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PageData, CalibrationData, Transform, MarkNavigation } from '../types';

interface CameraViewProps {
  isCameraActive: boolean;
  calibrationData: CalibrationData;
  setCalibrationData: React.Dispatch<React.SetStateAction<CalibrationData>>;
  pageData: PageData;
  marksCm: number[];
  markNavigation: MarkNavigation;
  transform: Transform;
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  setStatusMessage: (message: string) => void;
  onCalibrate: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  isCameraActive,
  calibrationData,
  setCalibrationData,
  pageData,
  marksCm,
  markNavigation,
  transform,
  setTransform,
  setStatusMessage,
  onCalibrate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-4), message]); // Keep last 5 logs
  };

  // Set up camera
  useEffect(() => {
    if (isCameraActive) {
      setVideoError(null);
      setVideoReady(false);
      
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then(stream => {
          addDebugLog('✓ Camera stream obtained');
          addDebugLog(`✓ Stream tracks: ${stream.getTracks().length}`);
          if (videoRef.current) {
            addDebugLog('✓ Setting stream to video element');
            videoRef.current.srcObject = stream;
            addDebugLog('✓ Stream assigned to video');
            videoRef.current.onloadedmetadata = () => {
              addDebugLog('✓ Video metadata loaded');
              addDebugLog(`Video: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
              addDebugLog(`Element: ${videoRef.current?.offsetWidth}x${videoRef.current?.offsetHeight}`);
              setVideoReady(true);
              setStatusMessage("Camera ready! Enter book dimensions and calibrate.");
            };
            videoRef.current.onerror = (e) => {
              console.error('Video error:', e);
              setVideoError('Video playback error');
            };
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          addDebugLog(`❌ Camera error: ${err.message}`);
          setVideoError(`Camera error: ${err.message}`);
          setStatusMessage("Camera error. Please check permissions.");
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setVideoReady(false);
      setVideoError(null);
    }
  }, [isCameraActive, setStatusMessage]);

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      console.log('Container size:', rect.width, 'x', rect.height);
      setContainerSize({ width: rect.width, height: rect.height });
    };
    
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    updateSize(); // Initial update
    
    return () => resizeObserver.disconnect();
  }, []);

  // Handle calibration
  const handleCalibrate = useCallback(() => {
    if (pageData.heightCm > 0 && videoRef.current) {
      const videoHeight = videoRef.current.offsetHeight;
      console.log('Calibrating with video height:', videoHeight, 'for book height:', pageData.heightCm);
      
      if (videoHeight > 0) {
        const newPixelsPerCm = videoHeight / pageData.heightCm;
        setCalibrationData({ pixelsPerCm: newPixelsPerCm });
        setStatusMessage(`Calibrated! 1cm = ${newPixelsPerCm.toFixed(2)} pixels.`);
        onCalibrate();
      } else {
        setStatusMessage("Error: Could not determine video dimensions for calibration.");
      }
    } else {
      setStatusMessage("Please enter book height before calibrating.");
    }
  }, [pageData.heightCm, setCalibrationData, setStatusMessage, onCalibrate]);

  // Calculate simple video dimensions
  const getVideoStyle = () => {
    const isMobile = containerSize.width < 768;
    const padding = isMobile ? 20 : 40;
    
    const maxWidth = containerSize.width - padding;
    const maxHeight = containerSize.height - padding;
    
    // Simple calculation - just fit within container
    let width = Math.min(maxWidth, isMobile ? 300 : 500);
    let height = Math.min(maxHeight, isMobile ? 400 : 600);
    
    // Maintain aspect ratio if needed
    const aspectRatio = 4/3; // Standard video aspect ratio
    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
    
    console.log('Video style:', { width, height });
    
    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      transformOrigin: 'center center'
    };
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gray-800 overflow-hidden"
      style={{ 
        height: '100%',        // Use full parent height
        minHeight: '400px',    // Mobile minimum
        width: '100%'          // Explicit width
      }}
    >
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black/90 text-white text-xs p-2 rounded z-50 max-w-xs">
        <div>Container: {containerSize.width}x{containerSize.height}</div>
        <div>Camera: {isCameraActive ? 'ON' : 'OFF'}</div>
        <div>Video Ready: {videoReady ? 'YES' : 'NO'}</div>
        {videoError && <div className="text-red-300">Error: {videoError}</div>}
        <div className="mt-2 space-y-1">
          {debugLogs.map((log, i) => (
            <div key={i} className="text-green-300">{log}</div>
          ))}
        </div>
      </div>

      {/* Simple centered video */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {isCameraActive ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="bg-gray-700 rounded-lg border-2 border-gray-500"
              style={getVideoStyle()}
            />
            
            {/* Loading overlay */}
            {!videoReady && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-600/90 rounded-lg">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
            
            {/* Error overlay */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-600/90 rounded-lg">
                <div className="text-white text-center p-4">
                  <p className="font-bold mb-2">Camera Error</p>
                  <p className="text-sm">{videoError}</p>
                </div>
              </div>
            )}
            
            {/* Simple calibration guides */}
            {videoReady && !calibrationData.pixelsPerCm && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Corner markers */}
                <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full -translate-y-2 translate-x-2"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-400 rounded-full translate-y-2 translate-x-2"></div>
                
                {/* Right edge line */}
                <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-yellow-400 opacity-60"></div>
                
                {/* Instructions */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-400 text-sm font-bold whitespace-nowrap">
                  Align book's right edge
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p>Camera is off</p>
            <p className="text-xs mt-1">Click "Start Camera" to begin</p>
          </div>
        )}
      </div>

      {/* Simple calibrate button */}
      {isCameraActive && videoReady && !calibrationData.pixelsPerCm && (
        <button
          onClick={handleCalibrate}
          disabled={pageData.heightCm <= 0}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg shadow-lg z-10"
        >
          {pageData.heightCm > 0 ? 'Calibrate Camera' : 'Enter Height First'}
        </button>
      )}

      {/* Simple cut marks - only after calibration */}
      {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
        <div className="absolute inset-0 pointer-events-none">
          {marksCm.map((markCm, index) => {
            // Simple mark rendering
            const shouldShow = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
            if (!shouldShow) return null;
            
            const isActive = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
            const color = isActive ? '#ffff00' : '#ff007f';
            
            // Simple positioning - relative to the video area
            const relativeY = (markCm - pageData.paddingTopCm) / (pageData.heightCm - pageData.paddingTopCm - pageData.paddingBottomCm);
            const topPercent = Math.max(0, Math.min(100, relativeY * 100));
            
            return (
              <div
                key={index}
                className="absolute right-4"
                style={{ top: `${topPercent}%` }}
              >
                <div
                  className="w-8 h-0.5"
                  style={{ backgroundColor: color }}
                ></div>
                {isActive && (
                  <div 
                    className="text-xs font-mono mt-1"
                    style={{ color }}
                  >
                    {markCm.toFixed(1)}cm
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};