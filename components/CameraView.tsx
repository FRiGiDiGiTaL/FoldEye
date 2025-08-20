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
  autoAdvanceEnabled: boolean;
  onMarkNavigation: (action: 'next' | 'prev' | 'toggleAll') => void;
  onNextPage: () => void;
  onPrevPage: () => void;
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
  onCalibrate,
  autoAdvanceEnabled,
  onMarkNavigation,
  onNextPage,
  onPrevPage
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showTapFeedback, setShowTapFeedback] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const [pressType, setPressType] = useState<'next' | 'prev' | null>(null);

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-4), message]);
  };

  // Calculate video dimensions based on book dimensions
  const calculateVideoSize = () => {
    const { heightCm, widthCm } = pageData;
    
    if (heightCm <= 0) {
      return { width: 300, height: 400 };
    }

    const aspectRatio = widthCm > 0 ? widthCm / heightCm : 0.75;
    const isMobile = window.innerWidth < 768;
    const maxHeight = isMobile ? Math.min(window.innerHeight * 0.6, 400) : 500;
    const maxWidth = isMobile ? Math.min(window.innerWidth * 0.8, 300) : 400;
    
    let videoHeight = maxHeight;
    let videoWidth = videoHeight * aspectRatio;
    
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

  // Handle long press for navigation
  const handleLongPressStart = useCallback((action: 'next' | 'prev', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPressType(action);
    setPressProgress(0);
    
    const LONG_PRESS_DURATION = 2000; // 2 seconds
    let startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / LONG_PRESS_DURATION) * 100;
      
      if (progress >= 100) {
        // Long press completed
        clearInterval(timer);
        setPressProgress(0);
        setPressType(null);
        setLongPressTimer(null);
        
        if (action === 'next') {
          onNextPage();
          setStatusMessage("Long press - advanced to next page");
        } else {
          onPrevPage();
          setStatusMessage("Long press - returned to previous page");
        }
        
        // Visual feedback
        setShowTapFeedback(true);
        setTimeout(() => setShowTapFeedback(false), 300);
      } else {
        setPressProgress(progress);
      }
    }, 50);
    
    setLongPressTimer(timer);
  }, [pageData, onNextPage, setStatusMessage]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearInterval(longPressTimer);
      setLongPressTimer(null);
    }
    setPressProgress(0);
    setPressType(null);
  }, [longPressTimer]);

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
              setStatusMessage("Camera ready!");
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

  // Check if current mark is the last one on the page
  const isLastMark = !markNavigation.showAllMarks && 
                     markNavigation.currentMarkIndex === marksCm.length - 1;

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
        {autoAdvanceEnabled && (
          <div className="text-purple-300">📖 Auto-advance: ON</div>
        )}
        <div className="text-blue-300">👆 Tap-to-advance: ON</div>
        {videoError && <div className="text-red-300">Error: {videoError}</div>}
        <div className="mt-1 space-y-1">
          {debugLogs.map((log, i) => (
            <div key={i} className="text-green-300">{log}</div>
          ))}
        </div>
      </div>

      {isCameraActive ? (
        <div className="relative">
          {/* Video sized exactly to match container */}
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
          
          {/* Corner guides */}
          {videoReady && pageData.heightCm > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
                <div className="absolute top-0 left-8 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                  Top Corner
                </div>
              </div>

              <div className="absolute -bottom-2 -right-2">
                <div className="w-6 h-6 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
                <div className="absolute bottom-0 left-8 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                  Bottom Corner
                </div>
              </div>

              <div className="absolute top-0 bottom-0 -right-0.5 w-1 bg-yellow-400 opacity-60"></div>
              
              <div className="absolute top-1/2 -right-12 transform -translate-y-1/2">
                <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                  {pageData.heightCm}cm
                </div>
                <div className="text-xs text-white mt-1">
                  {videoSize.height}px
                </div>
              </div>

              {/* Calibration status */}
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

          {/* Navigation arrows near spine (left side) - Long Press zones */}
          {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
            <>
              {/* Previous Page Arrow - Top Left */}
              <div 
                className="absolute left-2 top-8 w-12 h-12 bg-black/70 rounded-full flex items-center justify-center cursor-pointer select-none z-20 border-2 border-gray-400 hover:border-white transition-colors"
                onMouseDown={(e) => handleLongPressStart('prev', e)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={(e) => handleLongPressStart('prev', e)}
                onTouchEnd={handleLongPressEnd}
                title="Long press (2s) for previous page"
              >
                <div className="text-white text-xl">←</div>
                {pressType === 'prev' && (
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-500"
                    style={{
                      background: `conic-gradient(from 0deg, #3b82f6 ${pressProgress * 3.6}deg, transparent ${pressProgress * 3.6}deg)`
                    }}
                  />
                )}
              </div>
              
              {/* Next Page Arrow - Bottom Left */}
              <div 
                className="absolute left-2 bottom-8 w-12 h-12 bg-black/70 rounded-full flex items-center justify-center cursor-pointer select-none z-20 border-2 border-gray-400 hover:border-white transition-colors"
                onMouseDown={(e) => handleLongPressStart('next', e)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={(e) => handleLongPressStart('next', e)}
                onTouchEnd={handleLongPressEnd}
                title="Long press (2s) for next page"
              >
                <div className="text-white text-xl">→</div>
                {pressType === 'next' && (
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-green-500"
                    style={{
                      background: `conic-gradient(from 0deg, #10b981 ${pressProgress * 3.6}deg, transparent ${pressProgress * 3.6}deg)`
                    }}
                  />
                )}
              </div>
              
              {/* Instructions for navigation arrows */}
              <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-xs pointer-events-none z-10">
                <div className="text-center">
                  <div className="text-gray-300">Page Navigation</div>
                  <div className="text-blue-300">← Prev (hold 2s)</div>
                  <div className="text-green-300">→ Next (hold 2s)</div>
                </div>
              </div>

              {/* Mark navigation instruction */}
              <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-10">
                <div className="flex items-center space-x-2">
                  <div className="text-yellow-300">📏</div>
                  <div>
                    {markNavigation.showAllMarks ? 
                      "All marks visible" : 
                      `Mark ${markNavigation.currentMarkIndex + 1}/${marksCm.length}`
                    }
                  </div>
                </div>
                {!markNavigation.showAllMarks && (
                  <div className="text-xs text-gray-300 mt-1">Use controls to change marks</div>
                )}
              </div>

              {/* Visual feedback for successful navigation */}
              {showTapFeedback && (
                <div className="absolute inset-0 bg-green-400/20 animate-pulse rounded pointer-events-none z-5"></div>
              )}
            </>
          )}

          {/* Cut marks */}
          {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
            <div className="absolute inset-0 pointer-events-none z-5">
              {marksCm.map((markCm, index) => {
                if (markCm < pageData.paddingTopCm || markCm > (pageData.heightCm - pageData.paddingBottomCm)) {
                  return null;
                }

                const relativePosition = markCm / pageData.heightCm;
                const yPosition = relativePosition * videoSize.height;
                
                const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
                if (!shouldRenderMark) return null;
                
                const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
                const isLastMarkOnPage = index === marksCm.length - 1;
                
                let markColor = "#ff007f"; // Default pink
                if (isActiveMark) {
                  markColor = autoAdvanceEnabled && isLastMarkOnPage ? "#9333ea" : "#ffff00";
                }
                
                return (
                  <div key={index} className="absolute right-0" style={{ top: `${yPosition}px` }}>
                    <div 
                      className={`w-8 h-0.5 -translate-y-0.5 ${autoAdvanceEnabled && isActiveMark && isLastMarkOnPage ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: markColor }}
                    ></div>
                    {isActiveMark && (
                      <div 
                        className="absolute right-10 top-0 transform -translate-y-1/2 text-xs font-mono px-1 py-0.5 rounded z-10"
                        style={{ color: markColor, backgroundColor: 'rgba(0,0,0,0.7)' }}
                      >
                        {markCm.toFixed(1)}cm
                        {autoAdvanceEnabled && isLastMarkOnPage && (
                          <div className="text-xs text-purple-300">→ Next Page</div>
                        )}
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