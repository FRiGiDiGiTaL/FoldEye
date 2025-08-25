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
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('prompt');

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

  // Calculate video dimensions based on book dimensions
  const calculateVideoSize = useCallback(() => {
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
  }, [pageData.heightCm, pageData.widthCm]);

  const videoSize = calculateVideoSize();

  // Manual calibration function
  const handleCalibrate = useCallback(() => {
    if (pageData.heightCm > 0 && videoSize.height > 0) {
      const pixelsPerCm = videoSize.height / pageData.heightCm;
      setCalibrationData({ pixelsPerCm });
      setStatusMessage(`✨ AR Calibrated! Video height (${videoSize.height}px) = ${pageData.heightCm}cm. Enhanced features active.`);
      addDebugLog(`✓ Manual calibration: ${pixelsPerCm.toFixed(2)} pixels/cm`);
      onCalibrate();
    } else {
      setStatusMessage("Please enter book height before calibrating.");
    }
  }, [pageData.heightCm, videoSize.height, setCalibrationData, setStatusMessage, onCalibrate]);

  // Check permissions on component mount
  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  // Set up camera
  useEffect(() => {
    if (isCameraActive) {
      setVideoError(null);
      setVideoReady(false);
      addDebugLog('Starting camera...');
      
      requestCameraPermission()
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
              setStatusMessage("✨ Enhanced AR Camera ready! Voice control and visual effects active.");
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
          // Error handling is done in requestCameraPermission
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setVideoReady(false);
      setVideoError(null);
      setDebugLogs([]);
      setPermissionStatus('prompt');
    }
  }, [isCameraActive, setStatusMessage, videoSize.width, videoSize.height, requestCameraPermission]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gradient-to-br from-gray-800 via-gray-900 to-black overflow-hidden flex items-center justify-center"
    >
      {/* Enhanced debug info with glassmorphism */}
      <div className="absolute top-2 left-2 glass-card rounded-lg text-white text-xs p-3 z-50 max-w-xs">
        <div className="space-y-1 text-green-400">
          <div className="text-blue-300 font-semibold mb-2">📊 AR Status</div>
          <div>📖 Book: {pageData.heightCm}cm × {pageData.widthCm}cm</div>
          <div>📺 Video: {videoSize.width}×{videoSize.height}px</div>
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
          <div className="text-purple-400">✨ Effects: Active</div>
          <div className="text-green-400">🎤 Voice: Available</div>
          {videoError && <div className="text-red-300">❌ Error: {videoError}</div>}
        </div>
        
        {debugLogs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-gray-400 font-semibold mb-1">Recent Logs:</div>
            {debugLogs.map((log, i) => (
              <div key={i} className="text-xs text-green-300">{log}</div>
            ))}
          </div>
        )}
      </div>

      {isCameraActive ? (
        <div className="relative">
          {/* Video container with enhanced styling */}
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
          
          {/* Loading overlay with glassmorphism */}
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
                   '✨ Starting enhanced AR camera...'}
                </p>
                <div className="flex justify-center space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`w-2 h-2 bg-blue-400 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Error overlay with glassmorphism */}
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
          
          {/* Enhanced corner guides */}
          {videoReady && pageData.heightCm > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Animated right edge reference line */}
              <div className="absolute top-0 bottom-0 -right-0.5 w-1 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 opacity-80 shadow-lg animate-pulse"></div>
              
              {/* Enhanced measurement display */}
              <div className="absolute top-1/2 -right-16 transform -translate-y-1/2">
                <div className="glass-card px-3 py-2 rounded-lg border border-blue-400/50 shadow-xl">
                  <div className="text-blue-300 text-sm font-bold">
                    📏 {pageData.heightCm}cm
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {videoSize.height}px
                  </div>
                </div>
              </div>

              {/* Calibration status with enhanced styling */}
              {!calibrationData.pixelsPerCm ? (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="glass-status-warning px-4 py-2 rounded-lg text-sm font-bold shadow-xl animate-bounce">
                    <span className="animate-pulse">⚡</span> Align Book's Right Edge with Yellow Line
                  </div>
                </div>
              ) : (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                  <div className="glass-status-success px-4 py-2 rounded-lg text-sm font-bold shadow-xl flex items-center">
                    <span className="animate-spin mr-2">✨</span>
                    AR Calibrated - Enhanced Features Active
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced mark navigation instruction */}
          {!markNavigation.showAllMarks && (
            <div className="absolute top-4 right-4 glass-card px-4 py-3 rounded-lg text-sm pointer-events-none z-10 border border-yellow-400/30">
              <div className="flex items-center space-x-2">
                <div className="text-yellow-400 animate-pulse">📏</div>
                <div className="text-white font-semibold">
                  Mark {markNavigation.currentMarkIndex + 1}/{marksCm.length}
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-1 flex items-center">
                <span className="animate-bounce mr-1">🎤</span>
                Use voice or controls to navigate
              </div>
            </div>
          )}

          {/* Enhanced Current Page Display */}
          {videoReady && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <div className="glass-card glass-shimmer px-6 py-3 rounded-xl border-2 border-blue-400/50 shadow-2xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-300 flex items-center justify-center">
                    <span className="animate-pulse mr-2">📖</span>
                    Page {pageData.currentPage + 1}
                  </div>
                  {pageData.parsedInstructions[pageData.currentPage] && (
                    <div className="text-xs text-green-400 mt-2 flex items-center justify-center">
                      <span className="animate-bounce mr-1">✨</span>
                      {marksCm.length} mark{marksCm.length !== 1 ? 's' : ''} on this page
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

          {/* Clean Cut marks with opacity-based visibility */}
          {calibrationData.pixelsPerCm && marksCm.length > 0 && videoReady && (
            <div className="absolute inset-0 pointer-events-none z-5">
              {marksCm.map((markValue, index) => {
                if (markValue < pageData.paddingTopCm || markValue > (pageData.heightCm - pageData.paddingBottomCm)) {
                  return null;
                }

                const relativePosition = markValue / pageData.heightCm;
                const yPosition = relativePosition * videoSize.height;
                
                const shouldRenderMark = markNavigation.showAllMarks || index === markNavigation.currentMarkIndex;
                if (!shouldRenderMark) return null;
                
                const isActiveMark = !markNavigation.showAllMarks && index === markNavigation.currentMarkIndex;
                
                // Clean color scheme without glow
                let markColor = "#ff007f"; // Default pink
                let markOpacity = markNavigation.showAllMarks ? 0.8 : 1.0; // Slightly faded when showing all
                
                if (isActiveMark) {
                  markColor = "#ffff00"; // Yellow for active mark
                  markOpacity = 1.0; // Full opacity for active mark
                }
                
                return (
                  <div key={index} className="absolute right-0" style={{ top: `${yPosition}px` }}>
                    {/* Clean, precise mark line */}
                    <div 
                      className="w-8 h-0.5 -translate-y-0.5 transition-opacity duration-200"
                      style={{ 
                        backgroundColor: markColor,
                        opacity: markOpacity
                      }}
                    ></div>
                    
                    {/* Clean mark label without glow */}
                    {isActiveMark && (
                      <div 
                        className="absolute right-10 top-0 transform -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs font-mono font-bold z-10 border border-gray-600"
                        style={{ 
                          color: markColor
                        }}
                      >
                        {markValue.toFixed(1)}cm
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
          <div className="glass-card p-8 rounded-xl text-center shadow-2xl">
            {/* Enhanced camera off state */}
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
                ? `Ready to show ${pageData.heightCm}cm × ${pageData.widthCm || 'auto'}cm view with AR effects`
                : 'Enter book dimensions first to enable AR features'
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
                <span className="text-sm">AR Effects Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};