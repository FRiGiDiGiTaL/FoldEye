import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GridLines } from './GridLines';
import { ParticleEffects } from './ParticleEffects';
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
  onMarkNavigation: (action: 'next' | 'prev' | 'toggleAll') => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  showGrid?: boolean;
  gridType?: 'rule-of-thirds' | 'quarters' | 'golden-ratio';
  gridOpacity?: number;
  triggerParticles?: boolean;
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
  onMarkNavigation,
  onNextPage,
  onPrevPage,
  showGrid = false,
  gridType = 'rule-of-thirds',
  gridOpacity = 0.3,
  triggerParticles = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoomVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [debugInfoCollapsed, setDebugInfoCollapsed] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('prompt');
  const [showZoomWindow, setShowZoomWindow] = useState(false);
  const [zoomWindowPosition, setZoomWindowPosition] = useState({ x: 0, y: 0 });

  // Calculate first and last marked page indices for navigation
  const firstMarkedPageIndex = pageData.parsedInstructions.findIndex(p => !!p);
  let lastMarkedPageIndex = -1;
  for (let i = pageData.parsedInstructions.length - 1; i >= 0; i--) {
    if (pageData.parsedInstructions[i]) {
      lastMarkedPageIndex = i;
      break;
    }
  }

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-4), message]);
  };

  // Check camera permission status
  const checkCameraPermission = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(permissionResult.state);
        
        // Listen for permission changes
        permissionResult.onchange = () => {
          setPermissionStatus(permissionResult.state);
        };
      }
    } catch (error) {
      addDebugLog('Permission API not supported');
    }
  }, []);

  // Request camera permission explicitly
  const requestCameraPermission = useCallback(async () => {
    setPermissionStatus('checking');
    setVideoError(null);
    
    try {
      addDebugLog('Requesting camera permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setPermissionStatus('granted');
      addDebugLog('✓ Camera permission granted');
      return stream;
      
    } catch (err: any) {
      setPermissionStatus('denied');
      
      let errorMessage = 'Camera access denied';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints could not be satisfied.';
      } else {
        errorMessage = `Camera error: ${err.message}`;
      }
      
      setVideoError(errorMessage);
      addDebugLog(`❌ ${errorMessage}`);
      setStatusMessage(errorMessage);
      
      throw err;
    }
  }, [setStatusMessage]);

  // Calculate video dimensions based on book dimensions with extra space for visibility
  const calculateVideoSize = useCallback(() => {
    const { heightCm, widthCm } = pageData;
    
    if (heightCm <= 0) {
      return { width: 300, height: 400, bookAreaHeight: 380 };
    }

    const aspectRatio = widthCm > 0 ? widthCm / heightCm : 0.75;
    const isMobile = window.innerWidth < 768;
    
    // Add 10% extra height for better visibility of book edges
    const extraHeightMultiplier = 1.1;
    
    if (isMobile) {
      // Mobile: Use safe area and ensure full visibility
      const safeWidth = Math.min(window.innerWidth - 32, 350); // 32px for padding
      const safeHeight = Math.min(window.innerHeight * 0.6, 450); // 60% of viewport
      
      let bookAreaHeight = safeHeight / extraHeightMultiplier;
      let videoHeight = safeHeight;
      let videoWidth = bookAreaHeight * aspectRatio * extraHeightMultiplier;
      
      // If too wide, constrain by width
      if (videoWidth > safeWidth) {
        videoWidth = safeWidth;
        bookAreaHeight = (videoWidth / aspectRatio) / extraHeightMultiplier;
        videoHeight = bookAreaHeight * extraHeightMultiplier;
      }
      
      return { 
        width: Math.round(videoWidth), 
        height: Math.round(videoHeight),
        bookAreaHeight: Math.round(bookAreaHeight)
      };
    } else {
      // Desktop sizing with extra space
      const maxHeight = 500;
      const maxWidth = 400;
      
      let bookAreaHeight = maxHeight / extraHeightMultiplier;
      let videoHeight = maxHeight;
      let videoWidth = bookAreaHeight * aspectRatio * extraHeightMultiplier;
      
      if (videoWidth > maxWidth) {
        videoWidth = maxWidth;
        bookAreaHeight = (videoWidth / aspectRatio) / extraHeightMultiplier;
        videoHeight = bookAreaHeight * extraHeightMultiplier;
      }
      
      return { 
        width: Math.round(videoWidth), 
        height: Math.round(videoHeight),
        bookAreaHeight: Math.round(bookAreaHeight)
      };
    }
  }, [pageData.heightCm, pageData.widthCm]);

  const videoSize = calculateVideoSize();

  // Calculate zoom window properties for single mark mode
  const calculateZoomWindow = useCallback(() => {
    if (!calibrationData.pixelsPerCm || marksCm.length === 0 || markNavigation.showAllMarks) {
      return null;
    }

    const currentMark = marksCm[markNavigation.currentMarkIndex];
    if (currentMark < pageData.paddingTopCm || currentMark > (pageData.heightCm - pageData.paddingBottomCm)) {
      return null;
    }

    // Calculate mark position
    const relativePosition = currentMark / pageData.heightCm;
    const bookAreaTop = (videoSize.height - videoSize.bookAreaHeight) / 2;
    const markYPosition = bookAreaTop + (relativePosition * videoSize.bookAreaHeight);

    // Zoom window dimensions (2x the size of a portion of the main video)
    const zoomFactor = 2.0;
    const baseZoomWidth = 120; // Base width of area to zoom
    const baseZoomHeight = 80; // Base height of area to zoom
    const zoomWidth = baseZoomWidth * zoomFactor;
    const zoomHeight = baseZoomHeight * zoomFactor;

    // Calculate source area in the main video (area we're zooming from)
    const sourceX = Math.max(0, videoSize.width - baseZoomWidth);
    const sourceY = Math.max(0, Math.min(videoSize.height - baseZoomHeight, markYPosition - baseZoomHeight / 2));
    const sourceWidth = baseZoomWidth;
    const sourceHeight = baseZoomHeight;

    // Position zoom window (top-left corner by default, but adjust if needed)
    let windowX = 20;
    let windowY = 20;
    
    // Avoid overlapping with the debug panel
    if (windowY < 200) {
      windowY = 220;
    }

    return {
      windowX,
      windowY,
      zoomWidth,
      zoomHeight,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      markYPosition,
      zoomFactor
    };
  }, [calibrationData.pixelsPerCm, marksCm, markNavigation, pageData, videoSize]);

  // Update zoom window visibility and position based on mark navigation
  useEffect(() => {
    const zoomData = calculateZoomWindow();
    if (zoomData && !markNavigation.showAllMarks && marksCm.length > 0) {
      setShowZoomWindow(true);
      setZoomWindowPosition({ x: zoomData.windowX, y: zoomData.windowY });
    } else {
      setShowZoomWindow(false);
    }
  }, [calculateZoomWindow, markNavigation.showAllMarks, marksCm.length]);

  // Check permissions on component mount
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Set up camera for both main video and zoom video
  useEffect(() => {
    if (isCameraActive) {
      setVideoError(null);
      setVideoReady(false);
      addDebugLog('Starting camera...');
      
      requestCameraPermission()
        .then(stream => {
          addDebugLog('✓ Camera stream obtained');
          
          // Set up main video
          if (videoRef.current) {
            addDebugLog('✓ Setting stream to main video element');
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              addDebugLog('✓ Main video metadata loaded');
              addDebugLog(`Video: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
              addDebugLog(`Display: ${videoSize.width}x${videoSize.height}`);
              addDebugLog(`Book Area: ${videoSize.width}x${videoSize.bookAreaHeight}`);
              setVideoReady(true);
              setStatusMessage("✨ Enhanced AR Camera ready! Voice control, visual effects, and zoom window active.");
            };
            videoRef.current.onerror = (e) => {
              console.error('Main video error:', e);
              setVideoError('Video playback error');
              addDebugLog('❌ Video playback error');
            };
          }

          // Set up zoom video with the same stream
          if (zoomVideoRef.current) {
            addDebugLog('✓ Setting stream to zoom video element');
            zoomVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          // Error handling is done in requestCameraPermission
        });
    } else {
      // Clean up both video streams
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (zoomVideoRef.current && zoomVideoRef.current.srcObject) {
        zoomVideoRef.current.srcObject = null;
      }
      setVideoReady(false);
      setVideoError(null);
      setDebugLogs([]);
      setPermissionStatus('prompt');
      setShowZoomWindow(false);
    }
  }, [isCameraActive, setStatusMessage, videoSize.width, videoSize.height, videoSize.bookAreaHeight, requestCameraPermission]);

  const zoomData = calculateZoomWindow();
// This continues from Part 1 - add this after the zoomData calculation

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gradient-to-br from-gray-800 via-gray-900 to-black overflow-visible flex items-center justify-center"
    >
      {/* Collapsible debug info with glassmorphism */}
      <div className="absolute top-2 left-2 z-50 max-w-xs">
        <div className="glass-card rounded-lg text-white text-xs border border-gray-500/30">
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg"
            onClick={() => setDebugInfoCollapsed(!debugInfoCollapsed)}
          >
            <div className="text-blue-300 font-semibold flex items-center">
              📊 AR Status
            </div>
            <div className="text-gray-400">
              {debugInfoCollapsed ? '▼' : '▲'}
            </div>
          </div>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            debugInfoCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}>
            <div className="px-3 pb-3 space-y-1 text-green-400 border-t border-gray-600/30 pt-2">
              <div>📖 Book: {pageData.heightCm}cm × {pageData.widthCm}cm</div>
              <div>📺 Video: {videoSize.width}×{videoSize.height}px</div>
              <div>📏 Book Area: {videoSize.width}×{videoSize.bookAreaHeight}px</div>
              <div className="flex items-center">
                📷 Camera: 
                <span className={`ml-1 font-semibold ${isCameraActive ? 'text-green-400' : 'text-red-400'}`}>
                  {isCameraActive ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center">
                🔐 Permission: 
                <span className={`ml-1 font-semibold ${
                  permissionStatus === 'granted' ? 'text-green-400' : 
                  permissionStatus === 'denied' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {permissionStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center">
                ✅ Ready: 
                <span className={`ml-1 font-semibold ${videoReady ? 'text-green-400' : 'text-gray-400'}`}>
                  {videoReady ? 'YES' : 'NO'}
                </span>
              </div>
              {calibrationData.pixelsPerCm && (
                <div className="text-cyan-400">🎯 Cal: {calibrationData.pixelsPerCm.toFixed(2)} px/cm</div>
              )}
              <div className="flex items-center">
                🔍 Zoom: 
                <span className={`ml-1 font-semibold ${showZoomWindow ? 'text-purple-400' : 'text-gray-400'}`}>
                  {showZoomWindow ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
              <div className="text-purple-400">✨ Effects: Active</div>
              <div className="text-green-400">🎤 Voice: Available</div>
              {videoError && <div className="text-red-300">❌ Error: {videoError}</div>}
            </div>
          </div>
        </div>
      </div>

      {isCameraActive ? (
        <div className="relative">
          {/* Main Video container with enhanced styling */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl border-2 border-blue-500/50">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="bg-gray-700 object-cover"
              style={{
                width: `${videoSize.width}px`,
                height: `${videoSize.height}px`,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: 'center center'
              }}
            />
            
            {/* Grid Lines Overlay */}
            {videoReady && showGrid && (
              <GridLines
                width={videoSize.width}
                height={videoSize.height}
                isVisible={showGrid}
                gridType={gridType}
                opacity={gridOpacity}
                color="#60a5fa"
              />
            )}

            {/* Particle Effects */}
            {videoReady && (
              <ParticleEffects
                triggerAlignment={triggerParticles}
                containerWidth={videoSize.width}
                containerHeight={videoSize.height}
                alignmentPoint={{ x: videoSize.width / 2, y: videoSize.height / 2 }}
              />
            )}
          </div>

          {/* Zoom Window - Only show in single mark mode */}
          {showZoomWindow && zoomData && videoReady && (
            <div 
              className="absolute z-40 pointer-events-none"
              style={{ 
                left: `${zoomData.windowX}px`, 
                top: `${zoomData.windowY}px`,
                width: `${zoomData.zoomWidth}px`,
                height: `${zoomData.zoomHeight}px`
              }}
            >
              <div className="glass-card rounded-xl overflow-hidden border-2 border-purple-500/70 shadow-2xl backdrop-blur-lg">
                <div className="glass-panel-dark px-3 py-2 border-b border-purple-400/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-purple-300 font-semibold">
                      <span className="animate-pulse mr-1">🔍</span>
                      Mark {markNavigation.currentMarkIndex + 1} Zoom (2x)
                    </div>
                    <div className="text-xs text-yellow-300 font-mono">
                      {marksCm[markNavigation.currentMarkIndex]?.toFixed(1)}cm
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <video
                    ref={zoomVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="bg-gray-700 object-cover"
                    style={{
                      width: `${zoomData.zoomWidth}px`,
                      height: `${zoomData.zoomHeight}px`,
                      objectPosition: `-${zoomData.sourceX * zoomData.zoomFactor}px -${zoomData.sourceY * zoomData.zoomFactor}px`,
                      transform: `scale(${zoomData.zoomFactor})`,
                      transformOrigin: 'top left'
                    }}
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      <div className="absolute w-full h-0.5 bg-yellow-400 shadow-lg animate-pulse"
                           style={{ 
                             left: `-${zoomData.zoomWidth/2}px`,
                             top: '0px',
                             width: `${zoomData.zoomWidth}px`
                           }}>
                      </div>
                      <div className="absolute w-0.5 bg-yellow-400 shadow-lg animate-pulse"
                           style={{ 
                             left: '0px',
                             top: `-${zoomData.zoomHeight/2}px`,
                             height: `${zoomData.zoomHeight}px`
                           }}>
                      </div>
                      <div className="absolute w-2 h-2 bg-yellow-400 rounded-full -translate-x-1 -translate-y-1 animate-pulse shadow-lg"></div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="glass-card px-2 py-1 rounded text-xs text-center text-purple-200 border border-purple-400/30">
                      <div className="flex items-center justify-center">
                        <span className="animate-bounce mr-1">📏</span>
                        Align book edge with crosshair
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(!videoReady && !videoError) && (
            <div className="absolute inset-0 flex items-center justify-center glass-panel rounded-lg">
              <div className="text-white text-center">
                <div className="relative mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mx-auto"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-400/20 animate-pulse"></div>
                </div>
                <p className="text-lg font-medium mb-2">
                  {permissionStatus === 'checking' ? '🔒 Requesting camera permission...' :
                   permissionStatus === 'prompt' ? '📷 Click to request camera access' :
                   '✨ Starting enhanced AR camera with zoom...'}
                </p>
                <div className="flex justify-center space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`w-2 h-2 bg-blue-400 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center glass-status-error rounded-lg">
              <div className="text-white text-center p-6">
                <div className="text-6xl mb-4">🚫</div>
                <p className="font-bold mb-2 text-xl">Camera Error</p>
                <p className="text-sm mb-4">{videoError}</p>
                {permissionStatus === 'denied' && (
                  <div className="glass-card p-4 rounded-lg">
                    <p className="text-xs mb-3 font-semibold">To fix this:</p>
                    <ul className="text-xs text-left space-y-2">
                      <li className="flex items-center">
                        <span className="text-blue-400 mr-2">1.</span>
                        Click the camera icon in your address bar
                      </li>
                      <li className="flex items-center">
                        <span className="text-blue-400 mr-2">2.</span>
                        Select "Allow" for camera access
                      </li>
                      <li className="flex items-center">
                        <span className="text-blue-400 mr-2">3.</span>
                        Refresh the page and try again
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {videoReady && pageData.heightCm > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 opacity-90 shadow-lg animate-pulse"
                style={{ 
                  top: `${(videoSize.height - videoSize.bookAreaHeight) / 2}px`
                }}
              ></div>
              
              <div className="absolute top-0 bottom-0 -right-0.5 w-1 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 opacity-80 shadow-lg animate-pulse"></div>
              
              {!calibrationData.pixelsPerCm && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="glass-status-warning px-4 py-2 rounded-lg text-sm font-bold shadow-xl animate-bounce">
                    <span className="animate-pulse">⚡</span> Align Book's Top with Yellow Line & Right Edge with Side Line
                  </div>
                </div>
              )}
            </div>
          )}

          {!markNavigation.showAllMarks && (
            <div className="absolute top-4 right-4 glass-card px-4 py-3 rounded-lg text-sm pointer-events-none z-10 border border-yellow-400/30">
              <div className="flex items-center space-x-2">
                <div className="text-yellow-400 animate-pulse">📏</div>
                <div className="text-white font-semibold">
                  Mark {markNavigation.currentMarkIndex + 1}/{marksCm.length}
                </div>
                {showZoomWindow && (
                  <div className="text-purple-400 animate-pulse">🔍</div>
                )}
              </div>
              <div className="text-xs text-gray-300 mt-1 flex items-center">
                <span className="animate-bounce mr-1">🎤</span>
                Use voice or controls to navigate
                {showZoomWindow && (
                  <span className="text-purple-300 ml-2">• Zoom window active</span>
                )}
              </div>
            </div>
          )}

          {videoReady && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <div className="glass-card glass-shimmer px-6 py-3 rounded-xl border-2 border-blue-400/50 shadow-2xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-300 flex items-center justify-center">
                    <span className="animate-pulse mr-2">📖</span>
                    Page {pageData.currentPage + 1}
                    {showZoomWindow && (
                      <span className="text-purple-400 animate-pulse ml-2">🔍</span>
                    )}
                  </div>
                  {pageData.parsedInstructions[pageData.currentPage] && (
                    <div className="text-xs text-green-400 mt-2 flex items-center justify-center">
                      <span className="animate-bounce mr-1">✨</span>
                      {marksCm.length} mark{marksCm.length !== 1 ? 's' : ''} on this page
                      {showZoomWindow && (
                        <span className="text-purple-300 ml-2">• Zoom 2x</span>
                      )}
                    </div>
                  )}
                  {!pageData.parsedInstructions[pageData.currentPage] && (
                    <div className="text-xs text-orange-300 mt-2 flex items-center justify-center">
                      <span className="mr-1">⚠️</span>
                      No marks defined for this page
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {videoReady && (
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 pointer-events-auto z-20 md:hidden">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 glass-card px-3 py-2 rounded-full border border-blue-400/30">
                  <button
                    onClick={onPrevPage}
                    disabled={pageData.currentPage <= firstMarkedPageIndex}
                    className="w-8 h-8 flex items-center justify-center rounded-full glass-button disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all duration-200 hover:scale-105"
                  >
                    ←
                  </button>
                  <span className="text-xs text-blue-300 font-medium px-1">PAGE</span>
                  <button
                    onClick={onNextPage}
                    disabled={pageData.currentPage >= lastMarkedPageIndex}
                    className="w-8 h-8 flex items-center justify-center rounded-full glass-button disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all duration-200 hover:scale-105"
                  >
                    →
                  </button>
                </div>

                {marksCm.length > 1 && (
                  <div className="flex items-center space-x-2 glass-card px-3 py-2 rounded-full border border-purple-400/30">
                    <button
                      onClick={() => onMarkNavigation('prev')}
                      className="w-8 h-8 flex items-center justify-center rounded-full glass-button text-xs font-bold transition-all duration-200 hover:scale-105"
                    >
                      ↑
                    </button>
                    <span className="text-xs text-purple-300 font-medium px-1">MARK</span>
                    <button
                      onClick={() => onMarkNavigation('next')}
                      className="w-8 h-8 flex items-center justify-center rounded-full glass-button text-xs font-bold transition-all duration-200 hover:scale-105"
                    >
                      ↓
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onMarkNavigation('toggleAll')}
                  className="w-10 h-10 flex items-center justify-center rounded-full glass-card border border-yellow-400/30 text-xs transition-all duration-200 hover:scale-105"
                  title={markNavigation.showAllMarks ? 'Switch to single mark view with zoom' : 'Show all marks (no zoom)'}
                >
                  {markNavigation.showAllMarks ? '🎯' : (showZoomWindow ? '🔍' : '✨')}
                </button>
              </div>
            </div>
          )}

          {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
            <div className="absolute inset-0 pointer-events-none z-5">
              {marksCm.map((markValue, index) => {
                if (markValue < pageData.paddingTopCm || markValue > (pageData.heightCm - pageData.paddingBottomCm)) {
                  return null;
                }

                const relativePosition = markValue / pageData.heightCm;
                const bookAreaTop = (videoSize.height - videoSize.bookAreaHeight) / 2;
                const yPosition = bookAreaTop + (relativePosition * videoSize.bookAreaHeight);
                
                const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
                if (!shouldRenderMark) return null;
                
                const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
                
                let markColor = "#ff007f"; // Default pink
                let markOpacity = markNavigation.showAllMarks ? 0.8 : 1.0;
                let markGlow = "";
                
                if (isActiveMark) {
                  markColor = "#ffff00"; // Yellow for active mark
                  markOpacity = 1.0;
                  if (showZoomWindow) {
                    markGlow = "shadow-lg shadow-yellow-400/50";
                  }
                }
                
                return (
                  <div key={index} className="absolute right-0" style={{ top: `${yPosition}px` }}>
                    <div 
                      className={`w-8 h-0.5 -translate-y-0.5 transition-all duration-200 ${markGlow} ${
                        isActiveMark && showZoomWindow ? 'animate-pulse' : ''
                      }`}
                      style={{ 
                        backgroundColor: markColor,
                        opacity: markOpacity,
                        boxShadow: showZoomWindow && isActiveMark ? `0 0 10px ${markColor}` : 'none'
                      }}
                    ></div>
                    
                    {isActiveMark && window.innerWidth >= 768 && (
                      <div 
                        className={`absolute right-10 top-0 transform -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs font-mono font-bold z-10 border border-gray-600 transition-all duration-200 ${
                          showZoomWindow ? 'scale-110 shadow-lg' : ''
                        }`}
                        style={{ 
                          color: markColor,
                          borderColor: showZoomWindow ? markColor : '#4b5563'
                        }}
                      >
                        {markValue.toFixed(1)}cm
                        {showZoomWindow && (
                          <span className="ml-2 text-purple-400 animate-pulse">🔍</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showZoomWindow && zoomData && videoReady && (
            <div className="absolute inset-0 pointer-events-none z-30">
              <svg 
                className="absolute inset-0 w-full h-full" 
                style={{ 
                  width: `${videoSize.width + zoomData.zoomWidth + 100}px`,
                  height: `${videoSize.height + 100}px`
                }}
              >
                <defs>
                  <linearGradient id="zoomLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffff00" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
                <line
                  x1={videoSize.width}
                  y1={zoomData.markYPosition}
                  x2={zoomData.windowX}
                  y2={zoomData.windowY + zoomData.zoomHeight / 2}
                  stroke="url(#zoomLine)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse opacity-70"
                />
              </svg>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <div className="glass-card p-8 rounded-xl text-center shadow-2xl">
            <div className="relative mb-6">
              <svg className="w-24 h-24 text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="absolute inset-0 rounded-full border-4 border-blue-400/20 animate-ping"></div>
            </div>
            
            <p className="text-xl font-semibold mb-2 text-blue-300">Enhanced AR Camera is off</p>
            <p className="text-sm mt-2 text-center mb-4">
              {pageData.heightCm > 0 
                ? `Ready to show ${pageData.heightCm}cm × ${pageData.widthCm || 'auto'}cm view with AR effects and zoom window`
                : 'Enter book dimensions first to enable AR features with zoom'
              }
            </p>
            
            {permissionStatus === 'denied' && (
              <div className="glass-status-error p-4 rounded-lg mb-4">
                <p className="text-sm text-red-300 mb-2 font-semibold">🚫 Camera permission was denied</p>
                <p className="text-xs text-gray-400">Please allow camera access in your browser settings</p>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-4 mt-4">
              <div className="flex items-center text-green-400">
                <span className="animate-bounce mr-2">🎤</span>
                <span className="text-sm">Voice Control Ready</span>
              </div>
              <div className="flex items-center text-purple-400">
                <span className="animate-spin mr-2">✨</span>
                <span className="text-sm">AR + Zoom Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};