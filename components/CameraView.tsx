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

interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  confidence: number;
}

const CornerGuide: React.FC<{ 
  x: number; 
  y: number; 
  type: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  detected?: boolean;
  confidence?: number;
}> = ({ x, y, type, detected = false, confidence = 0 }) => {
  const getPath = () => {
    switch (type) {
      case 'top-left': return 'M20 0 H0 V20';
      case 'top-right': return 'M-20 0 H0 V20';
      case 'bottom-left': return 'M20 0 H0 V-20';
      case 'bottom-right': return 'M-20 0 H0 V-20';
    }
  };
  
  const color = detected 
    ? `rgba(0, 255, 0, ${0.6 + confidence * 0.4})` 
    : 'rgba(255, 255, 0, 0.9)';
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d={getPath()}
        stroke={color}
        strokeWidth={detected ? "3" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {detected && (
        <circle
          cx="0"
          cy="0"
          r="4"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      )}
    </g>
  );
};

const CalibrationOverlay: React.FC<{
  detectedCorners: DetectedCorners | null;
  expectedHeight: number;
  viewWidth: number;
  viewHeight: number;
}> = ({ detectedCorners, expectedHeight, viewWidth, viewHeight }) => {
  if (!detectedCorners) return null;

  const { topLeft, topRight, bottomLeft, bottomRight, confidence } = detectedCorners;
  
  // Calculate detected dimensions
  const detectedWidth = Math.abs(topRight.x - topLeft.x);
  const detectedHeight = Math.abs(bottomLeft.y - topLeft.y);
  
  // Calculate center for measurement display
  const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
  const centerY = (topLeft.y + topRight.y + bottomLeft.y + bottomRight.y) / 4;
  
  return (
    <g>
      {/* Draw detected rectangle */}
      <path
        d={`M ${topLeft.x} ${topLeft.y} 
            L ${topRight.x} ${topRight.y} 
            L ${bottomRight.x} ${bottomRight.y} 
            L ${bottomLeft.x} ${bottomLeft.y} Z`}
        fill="none"
        stroke={`rgba(0, 255, 0, ${0.6 + confidence * 0.4})`}
        strokeWidth="2"
        strokeDasharray="5,5"
      />
      
      {/* Measurement labels */}
      <text
        x={centerX}
        y={centerY - 20}
        fill="white"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
        stroke="black"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Detected Height: {detectedHeight.toFixed(0)}px
      </text>
      
      <text
        x={centerX}
        y={centerY + 5}
        fill="white"
        fontSize="12"
        fontFamily="monospace"
        textAnchor="middle"
        stroke="black"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Expected Height: {expectedHeight.toFixed(0)}px
      </text>
      
      <text
        x={centerX}
        y={centerY + 25}
        fill={confidence > 0.7 ? "lightgreen" : confidence > 0.4 ? "yellow" : "orange"}
        fontSize="12"
        fontFamily="monospace"
        textAnchor="middle"
        fontWeight="bold"
        stroke="black"
        strokeWidth="3"
        paintOrder="stroke"
      >
        Confidence: {(confidence * 100).toFixed(0)}%
      </text>
    </g>
  );
};

// Edge detection function using Canvas API
const detectEdges = (canvas: HTMLCanvasElement, imageData: ImageData): ImageData => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);
  
  // Sobel edge detection
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          
          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outputIdx = (y * width + x) * 4;
      
      output.data[outputIdx] = magnitude;
      output.data[outputIdx + 1] = magnitude;
      output.data[outputIdx + 2] = magnitude;
      output.data[outputIdx + 3] = 255;
    }
  }
  
  return output;
};

// Corner detection using Harris corner detection approximation
const detectCorners = (imageData: ImageData, threshold: number = 50): {x: number, y: number, strength: number}[] => {
  const { data, width, height } = imageData;
  const corners: {x: number, y: number, strength: number}[] = [];
  
  // Simple corner detection based on edge intersections
  for (let y = 10; y < height - 10; y += 5) {
    for (let x = 10; x < width - 10; x += 5) {
      const idx = (y * width + x) * 4;
      const intensity = data[idx];
      
      if (intensity > threshold) {
        // Check if this is a local maximum
        let isMaximum = true;
        let maxIntensity = intensity;
        
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
            if (data[neighborIdx] > intensity) {
              isMaximum = false;
              break;
            }
            maxIntensity = Math.max(maxIntensity, data[neighborIdx]);
          }
          if (!isMaximum) break;
        }
        
        if (isMaximum && intensity > threshold) {
          corners.push({ x, y, strength: intensity });
        }
      }
    }
  }
  
  return corners.sort((a, b) => b.strength - a.strength).slice(0, 20);
};

// Find rectangle corners from detected corners
const findRectangleCorners = (
  corners: {x: number, y: number, strength: number}[], 
  imageWidth: number, 
  imageHeight: number
): DetectedCorners | null => {
  if (corners.length < 4) return null;
  
  // Divide image into quadrants and find strongest corner in each
  const centerX = imageWidth / 2;
  const centerY = imageHeight / 2;
  
  const quadrants = {
    topLeft: corners.filter(c => c.x < centerX && c.y < centerY),
    topRight: corners.filter(c => c.x >= centerX && c.y < centerY),
    bottomLeft: corners.filter(c => c.x < centerX && c.y >= centerY),
    bottomRight: corners.filter(c => c.x >= centerX && c.y >= centerY)
  };
  
  const getStrongestCorner = (quadrantCorners: {x: number, y: number, strength: number}[]) => {
    return quadrantCorners.length > 0 ? quadrantCorners[0] : null;
  };
  
  const topLeft = getStrongestCorner(quadrants.topLeft);
  const topRight = getStrongestCorner(quadrants.topRight);
  const bottomLeft = getStrongestCorner(quadrants.bottomLeft);
  const bottomRight = getStrongestCorner(quadrants.bottomRight);
  
  if (!topLeft || !topRight || !bottomLeft || !bottomRight) return null;
  
  // Calculate confidence based on corner strengths and rectangle regularity
  const avgStrength = (topLeft.strength + topRight.strength + bottomLeft.strength + bottomRight.strength) / 4;
  const strengthConfidence = Math.min(avgStrength / 255, 1);
  
  // Check if corners form a reasonable rectangle
  const width1 = Math.abs(topRight.x - topLeft.x);
  const width2 = Math.abs(bottomRight.x - bottomLeft.x);
  const height1 = Math.abs(bottomLeft.y - topLeft.y);
  const height2 = Math.abs(bottomRight.y - topRight.y);
  
  const widthSimilarity = 1 - Math.abs(width1 - width2) / Math.max(width1, width2);
  const heightSimilarity = 1 - Math.abs(height1 - height2) / Math.max(height1, height2);
  const rectangularityConfidence = (widthSimilarity + heightSimilarity) / 2;
  
  const confidence = (strengthConfidence * 0.6 + rectangularityConfidence * 0.4);
  
  return {
    topLeft: { x: topLeft.x, y: topLeft.y },
    topRight: { x: topRight.x, y: topRight.y },
    bottomLeft: { x: bottomLeft.x, y: bottomLeft.y },
    bottomRight: { x: bottomRight.x, y: bottomRight.y },
    confidence: Math.max(0, Math.min(1, confidence))
  };
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const detectionIntervalRef = useRef<number | null>(null);
  
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  const [detectedCorners, setDetectedCorners] = useState<DetectedCorners | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
          setStatusMessage("Camera error. Please check permissions and try again.");
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      // Clear detection when camera is off
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setDetectedCorners(null);
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

  // Start corner detection when calibrating
  useEffect(() => {
    if (isCalibrating && isCameraActive && videoRef.current) {
      setStatusMessage("Starting automatic corner detection...");
      
      const startDetection = () => {
        detectionIntervalRef.current = window.setInterval(() => {
          if (videoRef.current && canvasRef.current && !isProcessing) {
            performCornerDetection();
          }
        }, 500); // Detect every 500ms
      };
      
      // Wait for video to be ready
      if (videoRef.current.readyState >= 2) {
        startDetection();
      } else {
        videoRef.current.addEventListener('loadeddata', startDetection, { once: true });
      }
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setDetectedCorners(null);
      if (!isCalibrating) {
        setStatusMessage(isCameraActive ? "Camera ready. Enable calibration to start detection." : "Start camera to begin.");
      }
    }
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isCalibrating, isCameraActive, isProcessing, setStatusMessage]);

  const performCornerDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        setIsProcessing(false);
        return;
      }
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Detect edges
      const edges = detectEdges(canvas, imageData);
      
      // Find corners
      const corners = detectCorners(edges, 80);
      
      // Find rectangle corners
      const rectangleCorners = findRectangleCorners(corners, canvas.width, canvas.height);
      
      if (rectangleCorners && viewDimensions.width > 0 && viewDimensions.height > 0) {
        // Scale corners to match view dimensions
        const scaleX = viewDimensions.width / canvas.width;
        const scaleY = viewDimensions.height / canvas.height;
        
        const scaledCorners: DetectedCorners = {
          topLeft: { 
            x: rectangleCorners.topLeft.x * scaleX, 
            y: rectangleCorners.topLeft.y * scaleY 
          },
          topRight: { 
            x: rectangleCorners.topRight.x * scaleX, 
            y: rectangleCorners.topRight.y * scaleY 
          },
          bottomLeft: { 
            x: rectangleCorners.bottomLeft.x * scaleX, 
            y: rectangleCorners.bottomLeft.y * scaleY 
          },
          bottomRight: { 
            x: rectangleCorners.bottomRight.x * scaleX, 
            y: rectangleCorners.bottomRight.y * scaleY 
          },
          confidence: rectangleCorners.confidence
        };
        
        setDetectedCorners(scaledCorners);
        
        if (scaledCorners.confidence > 0.4) {
          setStatusMessage(`Book detected! Confidence: ${(scaledCorners.confidence * 100).toFixed(0)}%. Click "Confirm Detection" to calibrate.`);
        } else if (scaledCorners.confidence > 0.2) {
          setStatusMessage(`Weak detection. Try better lighting or clearer book edges. Confidence: ${(scaledCorners.confidence * 100).toFixed(0)}%`);
        } else {
          setStatusMessage("Detecting... Place book with clear edges in view.");
        }
      } else {
        setDetectedCorners(null);
        setStatusMessage("No book detected. Ensure book has clear, straight edges and good lighting.");
      }
    } catch (error) {
      console.error('Corner detection error:', error);
      setStatusMessage("Detection error. Try restarting calibration.");
      setDetectedCorners(null);
    } finally {
      setIsProcessing(false);
    }
  }, [viewDimensions, isProcessing, setStatusMessage]);

  // Calculate expected dimensions for overlay (width is not used for calibration)
  const basePageHeightCm = 20;
  const basePixelHeight = viewDimensions.height * 0.7;
  const pixelsPerCmAtBaseScale = basePixelHeight / basePageHeightCm;
  const expectedHeight = (pageData.heightCm > 0 ? pageData.heightCm : basePageHeightCm) * pixelsPerCmAtBaseScale;

  // Auto-calibrate based on detected height only
  useEffect(() => {
    if (calibrationTrigger > 0) {
      if (detectedCorners && detectedCorners.confidence > 0.4) {
        // Use detected corners for calibration
        const { topLeft, bottomLeft } = detectedCorners;
        const detectedHeightPx = Math.abs(bottomLeft.y - topLeft.y);
        
        if (pageData.heightCm > 0 && detectedHeightPx > 0) {
          const newPixelsPerCm = detectedHeightPx / pageData.heightCm;
          setCalibrationData({ pixelsPerCm: newPixelsPerCm });
          setStatusMessage(`Auto-calibrated! 1cm ≈ ${newPixelsPerCm.toFixed(2)}px. Confidence: ${(detectedCorners.confidence * 100).toFixed(0)}%`);
          setIsCalibrating(false);
          setDetectedCorners(null);
        } else {
          setStatusMessage("Calibration failed. Check page height setting.");
        }
      } else {
        // Fallback to manual calibration using expected height
        if (pageData.heightCm > 0 && expectedHeight > 0) {
          const newPixelsPerCm = expectedHeight / pageData.heightCm;
          setCalibrationData({ pixelsPerCm: newPixelsPerCm });
          setStatusMessage(`Manual calibration set: 1cm ≈ ${newPixelsPerCm.toFixed(2)}px`);
          setIsCalibrating(false);
        } else {
          setStatusMessage("Calibration failed. Check page height setting.");
        }
      }
    }
  }, [calibrationTrigger, detectedCorners, pageData.heightCm, expectedHeight, setCalibrationData, setIsCalibrating, setStatusMessage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCalibrating) return;
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
    if (!isCalibrating) return;
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
      {/* Hidden canvas for image processing */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }} 
      />
      
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
        {/* Manual guides for fallback */}
        {isCameraActive && isCalibrating && !detectedCorners && viewDimensions.height > 0 && (
          <>
            <CornerGuide x={viewDimensions.width * 0.25} y={viewDimensions.height * 0.25} type="top-left" />
            <CornerGuide x={viewDimensions.width * 0.75} y={viewDimensions.height * 0.25} type="top-right" />
            <CornerGuide x={viewDimensions.width * 0.25} y={viewDimensions.height * 0.75} type="bottom-left" />
            <CornerGuide x={viewDimensions.width * 0.75} y={viewDimensions.height * 0.75} type="bottom-right" />
            
            {/* Guide measurements */}
            <text
              x={viewDimensions.width / 2}
              y={viewDimensions.height * 0.15}
              fill="yellow"
              fontSize="14"
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight="bold"
            >
              Expected Height: {expectedHeight.toFixed(0)} pixels
            </text>
          </>
        )}

        {/* Detected corners and overlay */}
        {detectedCorners && (
          <>
            <CornerGuide 
              x={detectedCorners.topLeft.x} 
              y={detectedCorners.topLeft.y} 
              type="top-left" 
              detected={true}
              confidence={detectedCorners.confidence}
            />
            <CornerGuide 
              x={detectedCorners.topRight.x} 
              y={detectedCorners.topRight.y} 
              type="top-right" 
              detected={true}
              confidence={detectedCorners.confidence}
            />
            <CornerGuide 
              x={detectedCorners.bottomLeft.x} 
              y={detectedCorners.bottomLeft.y} 
              type="bottom-left" 
              detected={true}
              confidence={detectedCorners.confidence}
            />
            <CornerGuide 
              x={detectedCorners.bottomRight.x} 
              y={detectedCorners.bottomRight.y} 
              type="bottom-right" 
              detected={true}
              confidence={detectedCorners.confidence}
            />
            
            <CalibrationOverlay 
              detectedCorners={detectedCorners}
              expectedHeight={expectedHeight}
              viewWidth={viewDimensions.width}
              viewHeight={viewDimensions.height}
            />
          </>
        )}

        {/* Marks rendering (only when calibrated) */}
        {calibrationData.pixelsPerCm && !isCalibrating && (
          <g>
            {marksCm.map((markCm, index) => {
              if (markCm < 0 || markCm > pageData.heightCm) return null;
              if (markCm < pageData.paddingTopCm || markCm > (pageData.heightCm - pageData.paddingBottomCm)) return null;

              const guideTopY = viewDimensions.height * 0.25;
              const yPos = guideTopY + (markCm - pageData.paddingTopCm) * (calibrationData.pixelsPerCm || 0);
              const guideX = viewDimensions.width * 0.8;
              
              const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
              if (!shouldRenderMark) return null;
              
              const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
              const markColor = isActiveMark ? "rgba(255, 255, 0, 1)" : "rgba(255, 0, 127, 1)";
              const markWidth = isActiveMark ? "2" : "1";
              const markLength = isActiveMark ? 25 : 15;
              
              return (
                <g key={index}>
                  <line
                    x1={guideX - markLength}
                    y1={yPos}
                    x2={guideX + markLength}
                    y2={yPos}
                    stroke={markColor}
                    strokeWidth={markWidth}
                  />
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