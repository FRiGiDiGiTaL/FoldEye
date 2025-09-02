import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CameraView } from './components/CameraView';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAStatusIndicator } from './components/PWAStatusIndicator';
import { TrialBanner } from './components/TrialBanner';
import { FeatureGuard } from './components/FeatureGuard';
import { SubscriptionProvider } from './hooks/useSubscription';
import { usePWA } from './hooks/usePWA';
import PaywallModal from './components/PaywallModal';
import EmailModal from './components/EmailModal';
import type { PageData, CalibrationData, Transform, MarkNavigation } from './types';
import './glassmorphism.css';

const parseInstructions = (text: string): string[] => {
  const lines = text.split('\n');
  const instructionsMap = new Map<number, string>();
  let maxPage = 0;
  const lineRegex = /^\s*(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\s+([0-9.,\s]+)/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('PAGE') || trimmedLine === '') continue;
    const match = trimmedLine.match(lineRegex);
    if (!match) continue;
    const pageSpec = match[1];
    const measurements = match[2].trim().replace(/,\s*$/, '');
    const pageNumbers: number[] = [];
    const parts = pageSpec.replace(/\s/g, '').split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr] = part.split('-');
        const start = parseInt(startStr, 10);
        if (!isNaN(start) && start % 2 !== 0) pageNumbers.push(start);
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum % 2 !== 0) pageNumbers.push(pageNum);
      }
    }
    for (const pageNum of pageNumbers) {
      const pageIndex = pageNum - 1;
      if (pageIndex >= 0) {
        instructionsMap.set(pageIndex, measurements);
        if (pageNum > maxPage) maxPage = pageNum;
      }
    }
  }
  if (maxPage === 0) return [];
  const newInstructionsArray: string[] = Array(maxPage).fill('');
  for (const [index, marks] of instructionsMap.entries()) {
    if (index < newInstructionsArray.length) newInstructionsArray[index] = marks;
  }
  return newInstructionsArray;
};

const AppContent: React.FC = () => {
  // --- Trial / Subscription State ---
  const [trialStarted, setTrialStarted] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    const trialStartStr = localStorage.getItem('trialStart');
    if (trialStartStr) {
      const trialStart = new Date(trialStartStr);
      const now = new Date();
      const diff = now.getTime() - trialStart.getTime();
      if (diff >= 7 * 24 * 60 * 60 * 1000) setTrialExpired(true);
      else setTrialStarted(true);
    }
  }, []);

  const handleTrialStarted = () => {
    localStorage.setItem('trialStart', new Date().toISOString());
    setTrialStarted(true);
    setTrialExpired(false);
  };

  const handleSubscribed = () => {
    localStorage.setItem('trialStart', new Date().toISOString());
    setTrialExpired(false);
    setTrialStarted(true);
  };

  // --- Camera / AR State ---
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    '✨ Enter book dimensions and start camera for enhanced AR experience'
  );

  const {
    isInstallable,
    isInstalled,
    isOffline,
    updateAvailable,
    installApp,
    updateApp,
    dismissInstallPrompt
  } = usePWA();

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const initialInstructionsText = `PAGE        Measurements in CM
# Example pattern
17-18        0.5, 7.9, 8.0, 9.6, 9.8, 10.0, 10.1, 20.5
19-20        0.5, 20.5
21-22        0.5, 8.4, 8.5, 10.7, 10.9, 20.5`;

  const [pageData, setPageData] = useState<PageData>({
    heightCm: 0,
    widthCm: 0,
    paddingTopCm: 0,
    paddingBottomCm: 0,
    instructionsText: initialInstructionsText,
    parsedInstructions: parseInstructions(initialInstructionsText),
    currentPage: 16,
  });

  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    pixelsPerCm: null,
  });

  const [markNavigation, setMarkNavigation] = useState<MarkNavigation>({
    showAllMarks: true,
    currentMarkIndex: 0,
  });

  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });

  // Grid / Particles
  const [showGrid, setShowGrid] = useState(true);
  const [gridType, setGridType] = useState<'rule-of-thirds' | 'quarters' | 'golden-ratio'>('rule-of-thirds');
  const [gridOpacity, setGridOpacity] = useState(0.4);
  const [triggerParticles, setTriggerParticles] = useState(false);

  // --- PWA Effects ---
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  // --- Camera shortcuts ---
  useEffect(() => {
    const handlePWAShortcuts = () => {
      if (sessionStorage.getItem('pwa-auto-camera') === 'true') {
        setIsCameraActive(true);
        setStatusMessage('📱 PWA: Camera shortcut activated!');
        sessionStorage.removeItem('pwa-auto-camera');
      }
      if (sessionStorage.getItem('pwa-auto-voice') === 'true') {
        setStatusMessage('🎤 PWA: Voice control shortcut activated!');
        sessionStorage.removeItem('pwa-auto-voice');
      }
    };
    handlePWAShortcuts();

    const handleCameraShortcut = () => { setIsCameraActive(true); setStatusMessage('📱 Camera activated via shortcut!'); };
    const handleVoiceShortcut = () => { setStatusMessage('🎤 Voice control activated via shortcut!'); };

    window.addEventListener('pwa-camera-shortcut', handleCameraShortcut);
    window.addEventListener('pwa-voice-shortcut', handleVoiceShortcut);
    return () => {
      window.removeEventListener('pwa-camera-shortcut', handleCameraShortcut);
      window.removeEventListener('pwa-voice-shortcut', handleVoiceShortcut);
    };
  }, []);

  const handleInstallPWA = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        setShowInstallPrompt(false);
        setStatusMessage('🎉 BookfoldAR installed successfully! Check your home screen.');
      } else setStatusMessage('❌ Installation cancelled or failed.');
    } catch (err) { console.error(err); setStatusMessage('❌ Installation error'); }
    finally { setIsInstalling(false); }
  };

  const handleUpdatePWA = async () => {
    try { await updateApp(); setStatusMessage('🔄 App updated! Refresh to apply changes.'); }
    catch (err) { console.error(err); setStatusMessage('❌ Update failed'); }
  };

  // --- Instruction parsing ---
  const handleInstructionsTextChange = useCallback((text: string) => {
    const newParsed = parseInstructions(text);
    setPageData(prev => {
      let newCurrent = prev.currentPage;
      if (newCurrent >= newParsed.length || newParsed[newCurrent] === '') {
        const firstAvailable = newParsed.findIndex(p => p !== '');
        newCurrent = firstAvailable !== -1 ? firstAvailable : 0;
      }
      return { ...prev, instructionsText: text, parsedInstructions: newParsed, currentPage: newCurrent };
    });
    setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 });
  }, []);

  const currentMarksCm = useMemo((): number[] => {
    if (pageData.currentPage >= pageData.parsedInstructions.length) return [];
    const s = pageData.parsedInstructions[pageData.currentPage];
    if (!s) return [];
    return s.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  }, [pageData.parsedInstructions, pageData.currentPage]);

  useEffect(() => {
    setMarkNavigation(prev => ({
      ...prev,
      currentMarkIndex: Math.min(prev.currentMarkIndex, Math.max(0, currentMarksCm.length - 1))
    }));
  }, [currentMarksCm.length, pageData.currentPage]);

  const handleNextPage = useCallback(() => { setPageData(prev => {
    for (let i = prev.currentPage + 1; i < prev.parsedInstructions.length; i++) {
      if (prev.parsedInstructions[i]) { setStatusMessage(`✨ Advanced to Page ${i + 1}`); setTriggerParticles(true); setTimeout(() => setTriggerParticles(false), 100); return { ...prev, currentPage: i }; }
    }
    setStatusMessage(`Reached last page (${prev.currentPage + 1})`); return prev;
  }); setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 }); }, []);

  const handlePrevPage = useCallback(() => { setPageData(prev => {
    for (let i = prev.currentPage - 1; i >= 0; i--) {
      if (prev.parsedInstructions[i]) { setStatusMessage(`✨ Viewing Page ${i + 1}`); setTriggerParticles(true); setTimeout(() => setTriggerParticles(false), 100); return { ...prev, currentPage: i }; }
    }
    setStatusMessage(`Already on first page (${prev.currentPage + 1})`); return prev;
  }); setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 }); }, []);

  const handleMarkNavigation = useCallback((action: 'next' | 'prev' | 'toggleAll') => {
    setMarkNavigation(prev => {
      if (action === 'toggleAll') { const newShowAll = !prev.showAllMarks; setStatusMessage(newShowAll ? '✨ Showing all marks' : '🎯 Single mark mode'); setTriggerParticles(true); setTimeout(() => setTriggerParticles(false), 100); return { ...prev, showAllMarks: newShowAll }; }
      if (action === 'next') { const next = prev.currentMarkIndex + 1; if (next >= currentMarksCm.length) { setStatusMessage('🔄 Cycling to first mark'); return { showAllMarks: false, currentMarkIndex: 0 }; } setStatusMessage(`📏 Mark ${next + 1}/${currentMarksCm.length}: ${currentMarksCm[next]?.toFixed(1)}cm`); return { showAllMarks: false, currentMarkIndex: next }; }
      if (action === 'prev') { const prevIndex = prev.currentMarkIndex === 0 ? currentMarksCm.length - 1 : prev.currentMarkIndex - 1; setStatusMessage(`📏 Mark ${prevIndex + 1}/${currentMarksCm.length}: ${currentMarksCm[prevIndex]?.toFixed(1)}cm`); 
        return { showAllMarks: false, currentMarkIndex: prevIndex }; 
      }
      return prev;
    });
  }, [currentMarksCm]);

  const handleCalibrate = useCallback(() => { 
    setStatusMessage('✨ Calibration complete!'); 
    setTriggerParticles(true); 
    setTimeout(() => setTriggerParticles(false), 100); 
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-gray-100 md:h-screen md:flex md:flex-row">
      {/* Show email modal if trial not started */}
      {!trialStarted && <EmailModal onTrialStarted={handleTrialStarted} />}

      {/* Show paywall if trial expired */}
      {trialExpired && <PaywallModal />}

      {/* Trial banner */}
      <TrialBanner />

      {/* PWA Status */}
      <PWAStatusIndicator 
        isOffline={isOffline} 
        updateAvailable={updateAvailable} 
        onUpdate={handleUpdatePWA} 
      />

      {/* Control Panel */}
      <ControlPanel
        isCameraActive={isCameraActive}
        setIsCameraActive={setIsCameraActive}
        pageData={pageData}
        setPageData={setPageData}
        calibrationData={calibrationData}
        setCalibrationData={setCalibrationData}
        handleInstructionsTextChange={handleInstructionsTextChange}
        statusMessage={statusMessage}
        setStatusMessage={setStatusMessage}
        transform={transform}
        setTransform={setTransform}
        markNavigation={markNavigation}
        currentMarksCm={currentMarksCm}
        handleMarkNavigation={handleMarkNavigation}
        handleNextPage={handleNextPage}
        handlePrevPage={handlePrevPage}
        onCalibrate={handleCalibrate}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        gridType={gridType}
        setGridType={setGridType}
        gridOpacity={gridOpacity}
        setGridOpacity={setGridOpacity}
        trialExpired={trialExpired} // pass to show Subscribe button inside
        onSubscribed={handleSubscribed} // callback when user subscribes
      />

      {/* CameraView */}
      <div className="flex-1 bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center relative particle-container p-4 md:h-screen md:overflow-hidden">
        <CameraView
          isCameraActive={isCameraActive}
          calibrationData={calibrationData}
          setCalibrationData={setCalibrationData}
          pageData={pageData}
          marksCm={currentMarksCm}
          markNavigation={markNavigation}
          transform={transform}
          setTransform={setTransform}
          setStatusMessage={setStatusMessage}
          onCalibrate={handleCalibrate}
          onMarkNavigation={handleMarkNavigation}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          showGrid={showGrid}
          gridType={gridType}
          gridOpacity={gridOpacity}
          triggerParticles={triggerParticles}
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SubscriptionProvider>
      <AppContent />
    </SubscriptionProvider>
  );
};

export default App;

