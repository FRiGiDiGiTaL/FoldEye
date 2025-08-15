import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PageData, CalibrationData, Transform, MarkNavigation } from '../types';

interface CameraViewProps {
  isCameraActive: boolean;
  isCalibrating: boolean;
  setIsCalibrating: (calibrating: boolean) => void;
  calibrationData: CalibrationData;
  setCalibrationData: React.Dispatch<React.SetStateAction<CalibrationData>>;
  pageData: PageData;
  usableHeightCm: number;
  marksCm: number[];
  markNavigation: MarkNavigation;
  transform: Transform;
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  setStatusMessage: (message: string) => void;
  calibrationTrigger: number;
}

const CornerGuide: React.FC<{ x: number, y: number, type: 'top-right' | 'bottom-right' }> = ({ x, y, type }) => {
  const path = type === 'top-right'
    ? 'M-20 0 H0 V20'   // Top-right corner
    : 'M-20 0 H0 V-20'; // Bottom-right corner
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d={path}
        stroke="rgba(255, 255, 0, 0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
};

export const CameraView: React.FC<CameraViewProps> = ({
  isCameraActive,
  isCalibrating,
  setIsCalibrating,
  calibrationData,
  setCalibrationData,
  pageData,
  usableHeightCm,
  marksCm,
  markNavigation,
  transform,
  setTransform,
  setStatusMessage,
  calibrationTrigger,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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

  // --- Proportional Guide Logic ---
  const guideX = viewDimensions.width * 0.8;
  
  // Set a base scale: e.g., a 20cm page height takes up 70% of the view's height.
  const basePageHeightCm = 20;
  const basePixelHeight = viewDimensions.height * 0.7;
  const pixelsPerCmAtBaseScale = basePixelHeight / basePageHeightCm;
  
  // Calculate the current guide height in pixels based on user's page height input
  const guideHeightPx = (pageData.heightCm > 0 ? pageData.heightCm : basePageHeightCm) * pixelsPerCmAtBaseScale;

  const centerY = viewDimensions.height / 2;
  const guideTopY = centerY - guideHeightPx / 2;
  const guideBottomY = centerY + guideHeightPx / 2;
  // --- End Proportional Guide Logic ---

  useEffect(() => {
    if (calibrationTrigger > 0 && isCalibrating) {
      if (pageData.heightCm > 0 && guideHeightPx > 0) {
        // The user has aligned the book to the guides. The guides' on-screen distance `guideHeightPx` now
        // represents the physical `pageData.heightCm`. This gives us the final pixels-per-cm ratio.
        const newPixelsPerCm = guideHeightPx / pageData.heightCm;
        setCalibrationData({ pixelsPerCm: newPixelsPerCm });
        setStatusMessage(`Calibrated: 1cm ≈ ${newPixelsPerCm.toFixed(2)}px. View is now locked.`);
        setIsCalibrating(false);
      } else {
        setStatusMessage("Calibration failed. Check page height.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrationTrigger]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCalibrating) return; // Lock panning when not in calibration mode
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.style.setProperty('cursor', 'grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !isCalibrating) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    containerRef.current?.style.setProperty('cursor', isCalibrating ? 'grab' : 'default');
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    if (!isCalibrating) return; // Lock zoom when not in calibration mode
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform(t => {
      const newScale = t.scale * scaleFactor;
      const clampedScale = Math.max(0.2, Math.min(newScale, 5));
      return { ...t, scale: clampedScale };
    });
  };
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-800 touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isCalibrating ? 'grab' : 'default' }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <video ref={videoRef} autoPlay playsInline className="max-w-none max-h-none" />
      </div>

      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
        {isCameraActive && isCalibrating && viewDimensions.height > 0 && (
          <>
            <CornerGuide x={guideX} y={guideTopY} type="top-right" />
            <CornerGuide x={guideX} y={guideBottomY} type="bottom-right" />
          </>
        )}

        {calibrationData.pixelsPerCm && !isCalibrating && (
          <g>
            {/* Marking Ticks */}
            {marksCm.map((markCm, index) => {
              // Marks are measured from the absolute top of the page.
              if (markCm < 0 || markCm > pageData.heightCm) return null;
              
              // We need to calculate the mark's position relative to the usable area, which starts after the top padding.
              // First, check if the mark falls within the usable area.
              if (markCm < pageData.paddingTopCm || markCm > (pageData.heightCm - pageData.paddingBottomCm)) return null;

              // The y position starts at the top guide (which corresponds to paddingTopCm) and adds the distance for the mark.
              // The distance is calculated from the start of the usable area (markCm - paddingTopCm).
              const yPos = guideTopY + (markCm - pageData.paddingTopCm) * (calibrationData.pixelsPerCm || 0);
              
              // Determine if this mark should be rendered based on navigation mode
              const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
              
              if (!shouldRenderMark) return null;
              
              // Determine mark style based on whether it's active or not
              const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
              const markColor = isActiveMark ? "rgba(255, 255, 0, 1)" : "rgba(255, 0, 127, 1)";
              const markWidth = isActiveMark ? "3" : "1.5";
              const markLength = isActiveMark ? 25 : 15;
              
              return (
                <g key={index}>
                  {/* Main mark line */}
                  <line
                    x1={guideX - markLength}
                    y1={yPos}
                    x2={guideX + markLength}
                    y2={yPos}
                    stroke={markColor}
                    strokeWidth={markWidth}
                  />
                  {/* Mark label for active mark */}
                  {isActiveMark && (
                    <text
                      x={guideX + markLength + 10}
                      y={yPos + 5}
                      fill={markColor}
                      fontSize="14"
                      fontFamily="monospace"
                      fontWeight="bold"
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.55a2 2 0 01.35 3.39l-1.5 1.5-3.39-3.39-3.4 3.4-1.5-1.5a2 2 0 013.39-.35L15 10zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">Camera is off</p>
          <p className="text-gray-500 text-sm mt-1">Click "Start Camera" in the control panel</p>
        </div>
      )}
    </div>
  );
};