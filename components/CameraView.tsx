import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [videoReady, setVideoReady] = useState(false);

  // Calculate video dimensions based on page dimensions
  const videoDimensions = useMemo(() => {
    // Ensure we have valid view dimensions
    if (viewDimensions.width === 0 || viewDimensions.height === 0) {
      return { width: 320, height: 240 }; // Fallback dimensions
    }

    // Handle mobile vs desktop differently
    const isMobile = viewDimensions.width < 768;
    const safeWidth = Math.max(320, viewDimensions.width);
    const safeHeight = Math.max(240, viewDimensions.height);
    
    // Always use A4-like aspect ratio for consistency
    const aspectRatio = 21.0 / 29.7; // Standard A4 width/height ratio
    
    if (isMobile) {
      // Mobile: be more conservative with sizing and add more padding
      const maxHeight = safeHeight * 0.7; // Reduced from 0.95
      const maxWidth = safeWidth * 0.85; // Reduced from 0.95
      
      let videoHeight = maxHeight;
      let videoWidth = videoHeight * aspectRatio;
      
      if (videoWidth > maxWidth) {
        videoWidth = maxWidth;
        videoHeight = videoWidth / aspectRatio;
      }
      
      // Ensure minimum viable size on mobile
      videoWidth = Math.max(280, videoWidth);
      videoHeight = Math.max(200, videoHeight);
      
      return { width: videoWidth, height: videoHeight };
    } else {
      // Desktop: original sizing
      const maxHeight = safeHeight * 0.8;
      const maxWidth = safeWidth * 0.7;
      
      let videoHeight = maxHeight;
      let videoWidth = videoHeight * aspectRatio;
      
      if (videoWidth > maxWidth) {
        videoWidth = maxWidth;
        videoHeight = videoWidth / aspectRatio;
      }
      
      return { width: videoWidth, height: videoHeight };
    }
  }, [viewDimensions]);

  // Set up camera
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              setVideoReady(true);
            };
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          setStatusMessage("Camera error. Please check permissions.");
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setVideoReady(false);
    }
  }, [isCameraActive, setStatusMessage]);

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setViewDimensions({ width: rect.width, height: rect.height });
    };
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    
    // Initial dimension update
    updateDimensions();
    
    return () => resizeObserver.disconnect();
  }, []);

  // Handle calibration - calculate pixels per cm based on guide positions
  const handleCalibrate = useCallback(() => {
    if (pageData.heightCm > 0 && videoDimensions.height > 0) {
      const newPixelsPerCm = videoDimensions.height / pageData.heightCm;
      setCalibrationData({ pixelsPerCm: newPixelsPerCm });
      setStatusMessage(`Calibrated! 1cm = ${newPixelsPerCm.toFixed(2)} pixels. Video represents ${pageData.heightCm}cm height.`);
    }
    onCalibrate();
  }, [pageData.heightCm, videoDimensions.height, setCalibrationData, setStatusMessage, onCalibrate]);

  // Calculate video position and corner guide positions
  const videoLayout = useMemo(() => {
    const centerX = viewDimensions.width / 2;
    const centerY = viewDimensions.height / 2;
    
    const videoRect = {
      left: centerX - videoDimensions.width / 2,
      top: centerY - videoDimensions.height / 2,
      width: videoDimensions.width,
      height: videoDimensions.height
    };
    
    // Corner guides at right edge of video
    const topRightCorner = {
      x: videoRect.left + videoRect.width,
      y: videoRect.top
    };
    
    const bottomRightCorner = {
      x: videoRect.left + videoRect.width,
      y: videoRect.top + videoRect.height
    };
    
    return { videoRect, topRightCorner, bottomRightCorner };
  }, [viewDimensions, videoDimensions]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-800"
      style={{ minHeight: '400px' }} // Increased minimum height
    >
      {/* Debug info for mobile development (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-50">
          View: {viewDimensions.width}x{viewDimensions.height}<br/>
          Video: {videoDimensions.width}x{videoDimensions.height}<br/>
          Ready: {videoReady ? 'Yes' : 'No'}
        </div>
      )}

      {/* Video container with better mobile positioning */}
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div 
          className="relative bg-gray-700 rounded-lg overflow-hidden"
          style={{
            width: `${videoDimensions.width}px`,
            height: `${videoDimensions.height}px`,
            minWidth: '280px',
            minHeight: '200px',
          }}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-cover"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: 'center center'
            }}
          />
          
          {/* Loading indicator when camera is starting */}
          {isCameraActive && !videoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-600">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay SVG - only show when video is ready */}
      {videoReady && (
        <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          {/* Calibration guides - only show corner guides when not calibrated */}
          {isCameraActive && !calibrationData.pixelsPerCm && (
            <g>
              {/* Video boundary rectangle for reference */}
              <rect
                x={videoLayout.videoRect.left}
                y={videoLayout.videoRect.top}
                width={videoLayout.videoRect.width}
                height={videoLayout.videoRect.height}
                fill="none"
                stroke="blue"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
              
              {/* Top Right Corner Guide */}
              <g>
                <circle
                  cx={videoLayout.topRightCorner.x}
                  cy={videoLayout.topRightCorner.y}
                  r="12"
                  fill="yellow"
                  stroke="black"
                  strokeWidth="3"
                />
                <text
                  x={videoLayout.topRightCorner.x + 20}
                  y={videoLayout.topRightCorner.y - 10}
                  fill="yellow"
                  fontSize="12" // Smaller text for mobile
                  fontWeight="bold"
                  stroke="black"
                  strokeWidth="2"
                  paintOrder="stroke"
                >
                  Top Right
                </text>
                {/* Crosshair */}
                <line
                  x1={videoLayout.topRightCorner.x - 8}
                  y1={videoLayout.topRightCorner.y}
                  x2={videoLayout.topRightCorner.x + 8}
                  y2={videoLayout.topRightCorner.y}
                  stroke="black"
                  strokeWidth="2"
                />
                <line
                  x1={videoLayout.topRightCorner.x}
                  y1={videoLayout.topRightCorner.y - 8}
                  x2={videoLayout.topRightCorner.x}
                  y2={videoLayout.topRightCorner.y + 8}
                  stroke="black"
                  strokeWidth="2"
                />
              </g>

              {/* Bottom Right Corner Guide */}
              <g>
                <circle
                  cx={videoLayout.bottomRightCorner.x}
                  cy={videoLayout.bottomRightCorner.y}
                  r="12"
                  fill="yellow"
                  stroke="black"
                  strokeWidth="3"
                />
                <text
                  x={videoLayout.bottomRightCorner.x + 20}
                  y={videoLayout.bottomRightCorner.y + 20}
                  fill="yellow"
                  fontSize="12" // Smaller text for mobile
                  fontWeight="bold"
                  stroke="black"
                  strokeWidth="2"
                  paintOrder="stroke"
                >
                  Bottom Right
                </text>
                {/* Crosshair */}
                <line
                  x1={videoLayout.bottomRightCorner.x - 8}
                  y1={videoLayout.bottomRightCorner.y}
                  x2={videoLayout.bottomRightCorner.x + 8}
                  y2={videoLayout.bottomRightCorner.y}
                  stroke="black"
                  strokeWidth="2"
                />
                <line
                  x1={videoLayout.bottomRightCorner.x}
                  y1={videoLayout.bottomRightCorner.y - 8}
                  x2={videoLayout.bottomRightCorner.x}
                  y2={videoLayout.bottomRightCorner.y + 8}
                  stroke="black"
                  strokeWidth="2"
                />
              </g>

              {/* Measurement line between corners */}
              <line
                x1={videoLayout.topRightCorner.x}
                y1={videoLayout.topRightCorner.y}
                x2={videoLayout.bottomRightCorner.x}
                y2={videoLayout.bottomRightCorner.y}
                stroke="yellow"
                strokeWidth="3"
                opacity="0.8"
              />

              {/* Instructions - positioned better for mobile */}
              <text
                x={viewDimensions.width / 2}
                y={Math.max(30, videoLayout.videoRect.top - 60)}
                fill="yellow"
                fontSize={viewDimensions.width < 768 ? "14" : "18"}
                fontWeight="bold"
                textAnchor="middle"
                stroke="black"
                strokeWidth="3"
                paintOrder="stroke"
              >
                Align book's right edge with guides
              </text>
              
              <text
                x={viewDimensions.width / 2}
                y={Math.max(50, videoLayout.videoRect.top - 40)}
                fill="white"
                fontSize={viewDimensions.width < 768 ? "12" : "14"}
                textAnchor="middle"
                stroke="black"
                strokeWidth="2"
                paintOrder="stroke"
              >
                Page: {pageData.heightCm}cm height
              </text>


            </g>
          )}

          {/* Cut marks */}
          {calibrationData.pixelsPerCm && marksCm.length > 0 && (
            <g>
              {marksCm.map((markCm, index) => {
                // Filter marks within page bounds
                if (markCm < pageData.paddingTopCm || markCm > (pageData.heightCm - pageData.paddingBottomCm)) {
                  return null;
                }

                // Calculate position relative to video layout
                const usableHeight = pageData.heightCm - pageData.paddingTopCm - pageData.paddingBottomCm;
                const relativePosition = (markCm - pageData.paddingTopCm) / usableHeight;
                const yPos = videoLayout.videoRect.top + (relativePosition * videoLayout.videoRect.height);
                
                // Mark visibility logic
                const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
                if (!shouldRenderMark) return null;
                
                const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
                const markColor = isActiveMark ? "#ffff00" : "#ff007f";
                const markWidth = isActiveMark ? "3" : "2";
                const markLength = isActiveMark ? 30 : 20;
                
                // Position marks on the right side of the video boundary
                const markX = videoLayout.videoRect.left + videoLayout.videoRect.width + 15;
                
                return (
                  <g key={index}>
                    <line
                      x1={markX - markLength}
                      y1={yPos}
                      x2={markX + markLength}
                      y2={yPos}
                      stroke={markColor}
                      strokeWidth={markWidth}
                    />
                    {isActiveMark && (
                      <text
                        x={markX - markLength - 10}
                        y={yPos + 5}
                        fill={markColor}
                        fontSize="12" // Smaller for mobile
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        {markCm.toFixed(1)}cm
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      )}

      {/* Calibrate button as proper HTML button - positioned outside SVG */}
      {isCameraActive && !calibrationData.pixelsPerCm && videoReady && (
        <button
          onClick={handleCalibrate}
          className="absolute bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg border-2 border-white shadow-lg transition-colors z-10"
          style={{
            left: `${Math.max(10, viewDimensions.width / 2 - 60)}px`,
            top: `${Math.min(viewDimensions.height - 60, videoLayout.videoRect.top + videoLayout.videoRect.height + 20)}px`,
          }}
        >
          Calibrate
        </button>
      )}
       
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <svg className="w-24 h-24 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-400">Camera is off</p>
        </div>
      )}
    </div>
  );
};