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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-4), message]);
  };

  // Calculate video dimensions based on book dimensions
  const calculateVideoSize = () => {
    const { heightCm, widthCm } = pageData;
    
    // If no dimensions entered, use defaults
    if (heightCm <= 0) {
      return { width: 300, height: 400 };
    }

    // Calculate aspect ratio from book dimensions
    const aspectRatio = widthCm > 0 ? widthCm / heightCm : 0.75; // Default to 3:4 if width not set
    
    // Scale to fit screen while maintaining proportions
    const isMobile = window.innerWidth < 768;
    const maxHeight = isMobile ? Math.min(window.innerHeight * 0.6, 400) : 500;
    const maxWidth = isMobile ? Math.min(window.innerWidth * 0.8, 300) : 400;
    
    let videoHeight = maxHeight;
    let videoWidth = videoHeight * aspectRatio;
    
    // If width exceeds max, scale down maintaining aspect ratio
    if (videoWidth > maxWidth) {
      videoWidth = maxWidth;
      videoHeight = videoWidth / aspectRatio;
    }
    
    return { width: Math.round(videoWidth), height: Math.round(videoHeight) };
  };

  const videoSize = calculateVideoSize();

  // Manual calibration function
  const handleCalibrate = useCallback(() => {
    if (pageData.heightCm > 0 && videoSize.height > 0) {
      const pixelsPerCm = videoSize.height / pageData.heightCm;
      setCalibrationData({ pixelsPerCm });
      setStatusMessage(`Calibrated! Video height (${videoSize.height}px) = ${pageData.heightCm}cm. Ready for marking.`);
      addDebugLog(`✓ Manual calibration: ${pixelsPerCm.toFixed(2)} pixels/cm`);
      onCalibrate();
    } else {
      setStatusMessage("Please enter book height before calibrating.");
    }
  }, [pageData.heightCm, videoSize.height, setCalibrationData, setStatusMessage, onCalibrate]);

  // Set up camera
  useEffect(() => {
    if (isCameraActive) {
      setVideoError(null);
      setVideoReady(false);
      addDebugLog('Starting camera...');
      
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then(stream => {
          addDebugLog('✓ Camera stream obtained');
          if (videoRef.current) {
            addDebugLog('✓ Setting stream to video element');
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              addDebugLog('✓ Video metadata loaded');
              addDebugLog(`Video: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
              addDebugLog(`Display: ${videoSize.width}x${videoSize.height}`);
              setVideoReady(true);
              setStatusMessage("Camera ready! Align book with corner guides.");
            };
            videoRef.current.onerror = (e) => {
              console.error('Video error:', e);
              setVideoError('Video playback error');
              addDebugLog('❌ Video playback error');
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
      setDebugLogs([]);
    }
  }, [isCameraActive, setStatusMessage, videoSize.width, videoSize.height]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gray-800 overflow-hidden flex items-center justify-center"
    >
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black/90 text-white text-xs p-2 rounded z-50 max-w-xs">
        <div>Book: {pageData.heightCm}cm × {pageData.widthCm}cm</div>
        <div>Video: {videoSize.width}×{videoSize.height}px</div>
        <div>Camera: {isCameraActive ? 'ON' : 'OFF'}</div>
        <div>Ready: {videoReady ? 'YES' : 'NO'}</div>
        {calibrationData.pixelsPerCm && (
          <div className="text-green-300">Cal: {calibrationData.pixelsPerCm.toFixed(2)} px/cm</div>
        )}
        {videoError && <div className="text-red-300">Error: {videoError}</div>}
        <div className="mt-1 space-y-1">
          {debugLogs.map((log, i) => (
            <div key={i} className="text-green-300">{log}</div>
          ))}
        </div>
      </div>

      {isCameraActive ? (
        <div className="relative">
          {/* Video sized exactly to match container - no gap */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="bg-gray-700 rounded border-2 border-blue-400 object-cover"
            style={{
              width: `${videoSize.width}px`,
              height: `${videoSize.height}px`,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: 'center center'
            }}
          />
          
          {/* Loading overlay */}
          {!videoReady && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-600/90 rounded">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-600/90 rounded">
              <div className="text-white text-center p-4">
                <p className="font-bold mb-2">Camera Error</p>
                <p className="text-sm">{videoError}</p>
              </div>
            </div>
          )}
          
          {/* Corner guides positioned at actual video corners */}
          {videoReady && pageData.heightCm > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Right Corner Guide */}
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
                <div className="absolute top-0 left-8 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                  Top Corner
                </div>
              </div>

              {/* Bottom Right Corner Guide */}
              <div className="absolute -bottom-2 -right-2">
                <div className="w-6 h-6 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-8 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                  Bottom Corner
                </div>
              </div>

              {/* Right edge reference line */}
              <div className="absolute top-0 bottom-0 -right-0.5 w-1 bg-yellow-400 opacity-60"></div>
              
              {/* Height measurement indicator */}
              <div className="absolute top-1/2 -right-12 transform -translate-y-1/2">
                <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                  {pageData.heightCm}cm
                </div>
                <div className="text-xs text-white mt-1">
                  {videoSize.height}px
                </div>
              </div>

              {/* Calibration status and manual calibrate button */}
              {!calibrationData.pixelsPerCm ? (
                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-bold mb-2">
                    Align Book's Right Edge with Corner Guides
                  </div>
                  <button
                    onClick={handleCalibrate}
                    disabled={pageData.heightCm <= 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded shadow-lg"
                  >
                    {pageData.heightCm > 0 ? 'Calibrate' : 'Enter Height First'}
                  </button>
                  <div className="text-white text-xs mt-1">
                    Distance between guides = {pageData.heightCm}cm
                  </div>
                </div>
              ) : (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">
                  ✓ Calibrated - Ready for Marking
                </div>
              )}
            </div>
          )}

          {/* Cut marks - positioned relative to the calibrated video */}
          {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
            <div className="absolute inset-0 pointer-events-none">
              {marksCm.map((markCm, index) => {
                // Filter marks within page bounds
                if (markCm < pageData.paddingTopCm || markCm > (pageData.heightCm - pageData.paddingBottomCm)) {
                  return null;
                }

                // Calculate position relative to video height
                const relativePosition = markCm / pageData.heightCm;
                const yPosition = relativePosition * videoSize.height;
                
                // Mark visibility logic
                const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
                if (!shouldRenderMark) return null;
                
                const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
                const markColor = isActiveMark ? "#ffff00" : "#ff007f";
                
                return (
                  <div key={index} className="absolute right-0" style={{ top: `${yPosition}px` }}>
                    <div 
                      className="w-8 h-0.5 -translate-y-0.5"
                      style={{ backgroundColor: markColor }}
                    ></div>
                    {isActiveMark && (
                      <div 
                        className="absolute right-10 top-0 transform -translate-y-1/2 text-xs font-mono px-1 py-0.5 rounded"
                        style={{ color: markColor, backgroundColor: 'rgba(0,0,0,0.7)' }}
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
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>Camera is off</p>
          <p className="text-xs mt-1 text-center">
            {pageData.heightCm > 0 
              ? `Ready to show ${pageData.heightCm}cm × ${pageData.widthCm || 'auto'}cm view`
              : 'Enter book dimensions first'
            }
          </p>
        </div>
      )}
    </div>
  );
};