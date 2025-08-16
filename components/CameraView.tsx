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

  // Calculate video dimensions based on page dimensions
  const videoDimensions = useMemo(() => {
    // Always provide reasonable dimensions regardless of page settings
    const safeWidth = Math.max(viewDimensions.width, 300);
    const safeHeight = Math.max(viewDimensions.height, 200);
    
    // Always use A4-like aspect ratio for consistency
    const aspectRatio = 21.0 / 29.7; // Standard A4 width/height ratio
    const maxHeight = safeHeight * 0.8;
    const maxWidth = safeWidth * 0.7;
    
    let videoHeight = maxHeight;
    let videoWidth = videoHeight * aspectRatio;
    
    if (videoWidth > maxWidth) {
      videoWidth = maxWidth;
      videoHeight = videoWidth / aspectRatio;
    }
    
    return { width: videoWidth, height: videoHeight };
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
    }
  }, [isCameraActive, setStatusMessage]);

  // Track container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setViewDimensions({ width, height });
    });
    
    resizeObserver.observe(container);
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
  }, [pageData.heightCm, pageData.widthCm, videoDimensions.height, setCalibrationData, setStatusMessage, onCalibrate]);

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
    >
      {/* Video with forced proportional scaling */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="bg-gray-700"
          style={{
            width: `${videoDimensions.width}px`,
            height: `${videoDimensions.height}px`,
            maxWidth: '95vw',
            maxHeight: '70vh',
            objectFit: 'cover',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Overlay SVG */}
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
                fontSize="14"
                fontWeight="bold"
                stroke="black"
                strokeWidth="3"
                paintOrder="stroke"
              >
                Top Right Corner
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
                y={videoLayout.bottomRightCorner.y + 25}
                fill="yellow"
                fontSize="14"
                fontWeight="bold"
                stroke="black"
                strokeWidth="3"
                paintOrder="stroke"
              >
                Bottom Right Corner
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

            {/* Instructions */}
            <text
              x={viewDimensions.width / 2}
              y={videoLayout.videoRect.top - 60}
              fill="yellow"
              fontSize="18"
              fontWeight="bold"
              textAnchor="middle"
              stroke="black"
              strokeWidth="3"
              paintOrder="stroke"
            >
              Align book's right edge with corner guides
            </text>
            
            <text
              x={viewDimensions.width / 2}
              y={videoLayout.videoRect.top - 40}
              fill="white"
              fontSize="14"
              textAnchor="middle"
              stroke="black"
              strokeWidth="3"
              paintOrder="stroke"
            >
              Page: {pageData.heightCm}cm height
            </text>
            
            <text
              x={viewDimensions.width / 2}
              y={videoLayout.videoRect.top - 20}
              fill="white"
              fontSize="12"
              textAnchor="middle"
              stroke="black"
              strokeWidth="3"
              paintOrder="stroke"
            >
              Distance between guides = {videoDimensions.height.toFixed(0)} pixels
            </text>

            {/* Calibrate button - positioned to the left of video */}
            <rect
              x={Math.max(10, videoLayout.videoRect.left - 130)}
              y={viewDimensions.height / 2 - 20}
              width="120"
              height="40"
              rx="8"
              fill="green"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={handleCalibrate}
            />
            
            <text
              x={Math.max(70, videoLayout.videoRect.left - 70)}
              y={viewDimensions.height / 2 + 5}
              fill="white"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              style={{ cursor: 'pointer', pointerEvents: 'none' }}
            >
              Calibrate
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
                      fontSize="14"
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