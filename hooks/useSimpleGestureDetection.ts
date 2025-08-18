import { useRef, useCallback, useEffect, useState } from 'react';

interface GestureState {
  isActive: boolean;
  hoveredButton: string | null;
  dwellProgress: number;
  fingertipPosition: { x: number; y: number } | null;
  error: string | null;
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
  dwellTimeMs: number = 300
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

  // Initialize gesture detection
  const initializeGestureDetection = useCallback(() => {
    if (!videoElement) {
      setGestureState(prev => ({ ...prev, error: 'Video element not available' }));
      return;
    }

    // Create offscreen canvas for processing
    const canvas = document.createElement('canvas');
    canvas.width = 320; // Lower resolution for performance
    canvas.height = 240;
    canvasRef.current = canvas;

    setGestureState(prev => ({ ...prev, isActive: true, error: null }));
    startProcessing();
  }, [videoElement]);

  // Simple color-based finger detection
  const detectFingertip = useCallback((imageData: ImageData): { x: number; y: number } | null => {
    const { data, width, height } = imageData;
    
    let bestCandidate: { x: number; y: number; score: number } | null = null;
    
    // Look for skin-colored pixels (simplified approach)
    for (let y = 0; y < height; y += 4) { // Skip pixels for performance
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simple skin color detection
        if (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            Math.abs(r - g) > 15) {
          
          const score = r + g + b;
          if (!bestCandidate || score > bestCandidate.score) {
            bestCandidate = { x, y, score };
          }
        }
      }
    }
    
    if (bestCandidate) {
      // Scale back to video dimensions
      const scaleX = videoElement!.videoWidth / width;
      const scaleY = videoElement!.videoHeight / height;
      
      return {
        x: bestCandidate.x * scaleX,
        y: bestCandidate.y * scaleY
      };
    }
    
    return null;
  }, [videoElement]);

  // Process video frame
  const processFrame = useCallback(() => {
    if (!videoElement || !canvasRef.current || processingRef.current) return;
    
    processingRef.current = true;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || videoElement.readyState < 2) {
        processingRef.current = false;
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Detect fingertip
      const fingertip = detectFingertip(imageData);
      
      if (fingertip) {
        // Convert to screen coordinates relative to video display
        const videoRect = videoElement.getBoundingClientRect();
        const scaleX = videoRect.width / videoElement.videoWidth;
        const scaleY = videoRect.height / videoElement.videoHeight;
        
        const screenX = fingertip.x * scaleX;
        const screenY = fingertip.y * scaleY;
        
        const fingertipPosition = { x: screenX, y: screenY };
        
        // Find hovered button
        const hoveredButton = buttonRegions.find(button => 
          screenX >= button.x && screenX <= button.x + button.width &&
          screenY >= button.y && screenY <= button.y + button.height
        );
        
        setGestureState(prev => ({
          ...prev,
          fingertipPosition,
          hoveredButton: hoveredButton?.id || null,
        }));
        
        // Handle dwell logic
        handleDwellLogic(hoveredButton);
      } else {
        setGestureState(prev => ({
          ...prev,
          fingertipPosition: null,
          hoveredButton: null,
          dwellProgress: 0,
        }));
        clearDwellTimer();
      }
    } catch (error) {
      console.error('Frame processing error:', error);
    }
    
    processingRef.current = false;
  }, [videoElement, buttonRegions, detectFingertip]);

  // Handle dwell-to-click logic
  const handleDwellLogic = useCallback((hoveredButton: ButtonRegion | null) => {
    if (!hoveredButton) {
      clearDwellTimer();
      return;
    }

    if (!dwellStartTimeRef.current) {
      dwellStartTimeRef.current = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - dwellStartTimeRef.current!;
        const progress = Math.min(elapsed / dwellTimeMs, 1) * 100;
        
        setGestureState(prev => ({
          ...prev,
          dwellProgress: progress,
        }));

        if (progress >= 100) {
          // Trigger button action
          hoveredButton.action();
          clearDwellTimer();
          
          // Brief cooldown
          setTimeout(() => {
            setGestureState(prev => ({ ...prev, dwellProgress: 0 }));
          }, 500);
        } else {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      
      updateProgress();
    }
  }, [dwellTimeMs]);

  // Clear dwell timer
  const clearDwellTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    dwellStartTimeRef.current = null;
  }, []);

  // Start processing loop
  const startProcessing = useCallback(() => {
    const processLoop = () => {
      if (gestureState.isActive) {
        processFrame();
        setTimeout(() => {
          if (gestureState.isActive) {
            requestAnimationFrame(processLoop);
          }
        }, 100); // Process at ~10fps to reduce CPU load
      }
    };
    
    processLoop();
  }, [gestureState.isActive, processFrame]);

  // Stop gesture detection
  const stopGestureDetection = useCallback(() => {
    setGestureState(prev => ({ ...prev, isActive: false }));
    clearDwellTimer();
    
    if (canvasRef.current) {
      canvasRef.current = null;
    }
  }, [clearDwellTimer]);

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