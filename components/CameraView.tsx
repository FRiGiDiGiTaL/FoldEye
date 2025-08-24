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
  onMarkNavigation,
  onNextPage,
  onPrevPage
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
      setStatusMessage(`Calibrated! Video height (${videoSize.height}px) = ${pageData.heightCm}cm. Ready for marking.`);
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
              setStatusMessage("Camera ready! Voice control and long-press navigation available.");
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
      className="w-full h-full relative bg-gray-800 overflow-hidden flex items-center justify-center"
    >
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-black/90 text-white text-xs p-2 rounded z-50 max-w-xs">
        <div>Book: {pageData.heightCm}cm × {pageData.widthCm}cm</div>
        <div>Video: {videoSize.width}×{videoSize.height}px</div>
        <div>Camera: {isCameraActive ? 'ON' : 'OFF'}</div>
        <div>Permission: {permissionStatus.toUpperCase()}</div>
        <div>Ready: {videoReady ? 'YES' : 'NO'}</div>
        {calibrationData.pixelsPerCm && (
          <div className="text-green-300">Cal: {calibrationData.pixelsPerCm.toFixed(2)} px/cm</div>
        )}
        <div className="text-blue-300">👆 Touch navigation removed</div>
        <div className="text-green-300">🎤 Voice control: Available</div>
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
          {(!videoReady && !videoError) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-600/90 rounded">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>
                  {permissionStatus === 'checking' ? 'Requesting camera permission...' :
                   permissionStatus === 'prompt' ? 'Click to request camera access' :
                   'Starting camera...'}
                </p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-600/90 rounded">
              <div className="text-white text-center p-4">
                <p className="font-bold mb-2">Camera Error</p>
                <p className="text-sm">{videoError}</p>
                {permissionStatus === 'denied' && (
                  <div className="mt-3">
                    <p className="text-xs mb-2">To fix this:</p>
                    <ul className="text-xs text-left space-y-1">
                      <li>• Click the camera icon in your address bar</li>
                      <li>• Select "Allow" for camera access</li>
                      <li>• Refresh the page and try again</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Corner guides - simplified without circular markers */}
          {videoReady && pageData.heightCm > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Right edge reference line */}
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
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-bold">
                    Align Book's Right Edge with Yellow Line
                  </div>
                </div>
              ) : (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">
                  ✓ Calibrated - Ready for Marking
                </div>
              )}
            </div>
          )}

          {/* Mark navigation instruction - only show when in single mark mode */}
          {!markNavigation.showAllMarks && (
            <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-10">
              <div className="flex items-center space-x-2">
                <div className="text-yellow-300">📏</div>
                <div>
                  Mark {markNavigation.currentMarkIndex + 1}/{marksCm.length}
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-1">Use controls to change marks</div>
            </div>
          )}

          {/* Current Page Number Display */}
          {videoReady && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
              <div className="bg-black/80 text-white px-4 py-2 rounded-lg border-2 border-blue-400 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">
                    Page {pageData.currentPage + 1}
                  </div>
                  {pageData.parsedInstructions[pageData.currentPage] && (
                    <div className="text-xs text-gray-300 mt-1">
                      {marksCm.length} mark{marksCm.length !== 1 ? 's' : ''} on this page
                    </div>
                  )}
                  {!pageData.parsedInstructions[pageData.currentPage] && (
                    <div className="text-xs text-orange-300 mt-1">
                      No marks defined for this page
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cut marks */}
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
                
                let markColor = "#ff007f"; // Default pink
                if (isActiveMark) {
                  markColor = "#ffff00"; // Yellow for active mark
                }
                
                return (
                  <div key={index} className="absolute right-0" style={{ top: `${yPosition}px` }}>
                    <div 
                      className="w-8 h-0.5 -translate-y-0.5"
                      style={{ backgroundColor: markColor }}
                    ></div>
                    {isActiveMark && (
                      <div 
                        className="absolute right-10 top-0 transform -translate-y-1/2 text-xs font-mono px-1 py-0.5 rounded z-10"
                        style={{ color: markColor, backgroundColor: 'rgba(0,0,0,0.7)' }}
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
          {permissionStatus === 'denied' && (
            <div className="mt-3 text-center">
              <p className="text-xs text-red-300 mb-2">Camera permission was denied</p>
              <p className="text-xs text-gray-400">Please allow camera access in your browser settings</p>
            </div>
          )}
          <p className="text-xs mt-2 text-green-300">🎤 Voice control available</p>
        </div>
      )}
    </div>
  );
};