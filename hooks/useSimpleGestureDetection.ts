import { useRef, useCallback, useEffect, useState } from 'react';

interface GestureState {
  isActive: boolean;
  hoveredButton: string | null;
  dwellProgress: number;
  fingertipPosition: { x: number; y: number } | null;
  error: string | null;
  debugInfo?: string;
}

interface ButtonRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: () => void;
}

export const useSimpleGestureDetection = (
  videoElement: HTMLVideoElement | null,
  buttonRegions: ButtonRegion[],
  dwellTimeMs: number = 800 // Increased for better reliability
) => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    hoveredButton: null,
    dwellProgress: 0,
    fingertipPosition: null,
    error: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dwellStartTimeRef = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);
  const lastHoveredButtonRef = useRef<string | null>(null);
  const frameCountRef = useRef<number>(0);

  // Initialize gesture detection
  const initializeGestureDetection = useCallback(() => {
    if (!videoElement) {
      setGestureState(prev => ({ ...prev, error: 'Video element not available' }));
      return;
    }

    // Wait for video to be ready
    if (videoElement.readyState < 2) {
      setTimeout(() => initializeGestureDetection(), 500);
      return;
    }

    // Create offscreen canvas for processing
    const canvas = document.createElement('canvas');
    canvas.width = 160; // Even lower resolution for better performance
    canvas.height = 120;
    canvasRef.current = canvas;

    setGestureState(prev => ({ 
      ...prev, 
      isActive: true, 
      error: null,
      debugInfo: 'Gesture detection starting...'
    }));
    
    // Start processing after a short delay
    setTimeout(() => {
      startProcessing();
    }, 1000);
  }, [videoElement]);

  // Improved motion-based detection
  const detectMovement = useCallback((currentFrame: ImageData, previousFrame: ImageData): { x: number; y: number } | null => {
    const { width, height } = currentFrame;
    const currentData = currentFrame.data;
    const previousData = previousFrame.data;
    
    let maxDiff = 0;
    let maxDiffX = 0;
    let maxDiffY = 0;
    let totalMovement = 0;
    
    // Compare frames to find movement
    for (let y = 10; y < height - 10; y += 8) { // Skip edges and subsample
      for (let x = 10; x < width - 10; x += 8) {
        const i = (y * width + x) * 4;
        
        // Calculate brightness difference
        const currentBrightness = (currentData[i] + currentData[i + 1] + currentData[i + 2]) / 3;
        const previousBrightness = (previousData[i] + previousData[i + 1] + previousData[i + 2]) / 3;
        const diff = Math.abs(currentBrightness - previousBrightness);
        
        totalMovement += diff;
        
        if (diff > maxDiff && diff > 15) { // Threshold for significant movement
          maxDiff = diff;
          maxDiffX = x;
          maxDiffY = y;
        }
      }
    }
    
    // Require minimum total movement and significant peak movement
    if (totalMovement > 1000 && maxDiff > 25) {
      return { x: maxDiffX, y: maxDiffY };
    }
    
    return null;
  }, []);

  // Store previous frame for motion detection
  const previousFrameRef = useRef<ImageData | null>(null);

  // Process video frame
  const processFrame = useCallback(() => {
    if (!videoElement || !canvasRef.current || processingRef.current || !gestureState.isActive) {
      return;
    }
    
    processingRef.current = true;
    frameCountRef.current++;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || videoElement.readyState < 2) {
        processingRef.current = false;
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get current frame data
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let detectedPoint: { x: number; y: number } | null = null;
      
      // Use motion detection if we have a previous frame
      if (previousFrameRef.current) {
        detectedPoint = detectMovement(currentFrame, previousFrameRef.current);
      }
      
      // Store current frame for next comparison
      previousFrameRef.current = currentFrame;
      
      if (detectedPoint) {
        // Convert canvas coordinates to video display coordinates
        const videoRect = videoElement.getBoundingClientRect();
        const canvasToVideoScaleX = videoElement.videoWidth / canvas.width;
        const canvasToVideoScaleY = videoElement.videoHeight / canvas.height;
        const videoToDisplayScaleX = videoRect.width / videoElement.videoWidth;
        const videoToDisplayScaleY = videoRect.height / videoElement.videoHeight;
        
        const screenX = detectedPoint.x * canvasToVideoScaleX * videoToDisplayScaleX;
        const screenY = detectedPoint.y * canvasToVideoScaleY * videoToDisplayScaleY;
        
        const fingertipPosition = { x: screenX, y: screenY };
        
        // Find hovered button with some tolerance
        const tolerance = 20; // pixels
        const hoveredButton = buttonRegions.find(button => 
          screenX >= (button.x - tolerance) && screenX <= (button.x + button.width + tolerance) &&
          screenY >= (button.y - tolerance) && screenY <= (button.y + button.height + tolerance)
        );
        
        setGestureState(prev => ({
          ...prev,
          fingertipPosition,
          hoveredButton: hoveredButton?.id || null,
          debugInfo: `Movement detected at (${screenX.toFixed(0)}, ${screenY.toFixed(0)}) - Frame ${frameCountRef.current}`,
        }));
        
        // Handle dwell logic
        handleDwellLogic(hoveredButton);
      } else {
        // No movement detected - only clear if we haven't had movement for a while
        if (frameCountRef.current % 30 === 0) { // Every ~3 seconds at 10fps
          setGestureState(prev => ({
            ...prev,
            fingertipPosition: null,
            hoveredButton: null,
            dwellProgress: 0,
            debugInfo: `No movement - Frame ${frameCountRef.current}`,
          }));
          clearDwellTimer();
        }
      }
    } catch (error) {
      console.error('Frame processing error:', error);
      setGestureState(prev => ({
        ...prev,
        error: `Processing error: ${error.message}`,
      }));
    }
    
    processingRef.current = false;
  }, [videoElement, buttonRegions, detectMovement, gestureState.isActive]);

  // Handle dwell-to-click logic
  const handleDwellLogic = useCallback((hoveredButton: ButtonRegion | null) => {
    const currentButtonId = hoveredButton?.id || null;
    
    // If button changed, reset dwell timer
    if (lastHoveredButtonRef.current !== currentButtonId) {
      clearDwellTimer();
      lastHoveredButtonRef.current = currentButtonId;
    }
    
    if (!hoveredButton) {
      return;
    }

    if (!dwellStartTimeRef.current) {
      dwellStartTimeRef.current = Date.now();
      
      const updateProgress = () => {
        if (!dwellStartTimeRef.current) return;
        
        const elapsed = Date.now() - dwellStartTimeRef.current;
        const progress = Math.min(elapsed / dwellTimeMs, 1) * 100;
        
        setGestureState(prev => ({
          ...prev,
          dwellProgress: progress,
        }));

        if (progress >= 100) {
          // Trigger button action
          console.log(`Gesture activated: ${hoveredButton.id}`);
          hoveredButton.action();
          clearDwellTimer();
          
          // Brief cooldown
          setTimeout(() => {
            setGestureState(prev => ({ ...prev, dwellProgress: 0 }));
          }, 1000);
        } else if (gestureState.isActive && lastHoveredButtonRef.current === hoveredButton.id) {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      
      updateProgress();
    }
  }, [dwellTimeMs, gestureState.isActive]);

  // Clear dwell timer
  const clearDwellTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    dwellStartTimeRef.current = null;
    setGestureState(prev => ({ ...prev, dwellProgress: 0 }));
  }, []);

  // Start processing loop
  const startProcessing = useCallback(() => {
    const processLoop = () => {
      if (gestureState.isActive) {
        processFrame();
        // Process at ~10fps to reduce CPU load
        setTimeout(() => {
          if (gestureState.isActive) {
            requestAnimationFrame(processLoop);
          }
        }, 100);
      }
    };
    
    // Reset frame counter
    frameCountRef.current = 0;
    processLoop();
  }, [gestureState.isActive, processFrame]);

  // Stop gesture detection
  const stopGestureDetection = useCallback(() => {
    setGestureState(prev => ({ 
      ...prev, 
      isActive: false, 
      debugInfo: 'Gesture detection stopped' 
    }));
    clearDwellTimer();
    
    if (canvasRef.current) {
      canvasRef.current = null;
    }
    
    previousFrameRef.current = null;
    lastHoveredButtonRef.current = null;
    frameCountRef.current = 0;
  }, [clearDwellTimer]);

  // Auto-restart if video changes
  useEffect(() => {
    if (gestureState.isActive && videoElement && videoElement.readyState >= 2) {
      // Reinitialize if video element changed
      setTimeout(() => {
        if (gestureState.isActive) {
          startProcessing();
        }
      }, 1000);
    }
  }, [videoElement, startProcessing]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopGestureDetection();
    };
  }, [stopGestureDetection]);

  return {
    gestureState,
    initializeGestureDetection,
    stopGestureDetection,
    isReady: gestureState.isActive && !gestureState.error,
  };
};