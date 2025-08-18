import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CameraView } from './components/CameraView';
import type { PageData, CalibrationData, Transform, MarkNavigation } from './types';

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
        if (!isNaN(start) && start % 2 !== 0) {
          pageNumbers.push(start);
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum % 2 !== 0) {
          pageNumbers.push(pageNum);
        }
      }
    }

    for (const pageNum of pageNumbers) {
      const pageIndex = pageNum - 1;
      if (pageIndex >= 0) {
        instructionsMap.set(pageIndex, measurements);
        if (pageNum > maxPage) {
          maxPage = pageNum;
        }
      }
    }
  }

  if (maxPage === 0) return [];

  const newInstructionsArray: string[] = Array(maxPage).fill('');
  for (const [index, marks] of instructionsMap.entries()) {
    if (index < newInstructionsArray.length) {
      newInstructionsArray[index] = marks;
    }
  }
  return newInstructionsArray;
};

const App: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Enter book dimensions and start camera to begin.");
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);

  const initialInstructionsText = `PAGE        Measurements in CM
# Example pattern below
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

  const handleInstructionsTextChange = useCallback((text: string) => {
    const newParsedInstructions = parseInstructions(text);
    setPageData(prev => {
      let newCurrentPage = prev.currentPage;
      if (newCurrentPage >= newParsedInstructions.length || newParsedInstructions[newCurrentPage] === '') {
        const firstAvailablePage = newParsedInstructions.findIndex(p => p !== '');
        newCurrentPage = firstAvailablePage !== -1 ? firstAvailablePage : 0;
      }
      return {
        ...prev,
        instructionsText: text,
        parsedInstructions: newParsedInstructions,
        currentPage: newCurrentPage,
      };
    });
    setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 });
  }, []);

  const currentMarksCm = useMemo((): number[] => {
    if (pageData.currentPage >= pageData.parsedInstructions.length) return [];
    const instructionString = pageData.parsedInstructions[pageData.currentPage];
    if (!instructionString) return [];
    return instructionString.split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));
  }, [pageData.parsedInstructions, pageData.currentPage]);

  // Reset current mark index when page changes or when marks change
  useEffect(() => {
    setMarkNavigation(prev => ({
      ...prev,
      currentMarkIndex: Math.min(prev.currentMarkIndex, Math.max(0, currentMarksCm.length - 1))
    }));
  }, [currentMarksCm.length, pageData.currentPage]);

  const handleNextPage = useCallback(() => {
    setPageData(prev => {
      for (let i = prev.currentPage + 1; i < prev.parsedInstructions.length; i++) {
        if (prev.parsedInstructions[i]) {
          setStatusMessage(`Auto-advanced to Page ${i + 1}`);
          return { ...prev, currentPage: i };
        }
      }
      setStatusMessage(`Reached the last page with marks (${prev.currentPage + 1})`);
      return prev;
    });
    // Reset to show all marks when advancing to new page
    setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 });
  }, [setStatusMessage]);

  const handlePrevPage = useCallback(() => {
    setPageData(prev => {
      for (let i = prev.currentPage - 1; i >= 0; i--) {
        if (prev.parsedInstructions[i]) {
          setStatusMessage(`Viewing Page ${i + 1}`);
          return { ...prev, currentPage: i };
        }
      }
      setStatusMessage(`Already on the first page with marks (${prev.currentPage + 1})`);
      return prev;
    });
    setMarkNavigation({ showAllMarks: true, currentMarkIndex: 0 });
  }, [setStatusMessage]);

  const handleMarkNavigation = useCallback((action: 'next' | 'prev' | 'toggleAll') => {
    setMarkNavigation(prev => {
      if (action === 'toggleAll') {
        return { ...prev, showAllMarks: !prev.showAllMarks };
      }
      
      if (action === 'next') {
        const nextIndex = prev.currentMarkIndex + 1;
        
        // Check if we've reached the end of marks on current page
        if (nextIndex >= currentMarksCm.length) {
          // Auto-advance to next page if enabled and not showing all marks
          if (autoAdvanceEnabled && !prev.showAllMarks) {
            handleNextPage();
            return { showAllMarks: false, currentMarkIndex: 0 };
          }
          // Otherwise cycle back to first mark
          return { showAllMarks: false, currentMarkIndex: 0 };
        }
        
        return { showAllMarks: false, currentMarkIndex: nextIndex };
      }
      
      if (action === 'prev') {
        const prevIndex = prev.currentMarkIndex === 0 ? currentMarksCm.length - 1 : prev.currentMarkIndex - 1;
        return { showAllMarks: false, currentMarkIndex: prevIndex };
      }
      
      return prev;
    });
  }, [currentMarksCm.length, autoAdvanceEnabled, handleNextPage]);

  const handleCalibrate = useCallback(() => {
    setStatusMessage("Calibration complete! Position book and use cut marks.");
  }, []);
  
  return (
    <div 
      className="flex flex-col bg-gray-900 text-gray-100 md:flex-row" 
      style={{ 
        height: '100vh',           // Explicit viewport height
        minHeight: '100vh',        // Minimum fallback
        width: '100vw',            // Full viewport width
        overflow: 'hidden'         // Prevent scrollbars
      }}
    >
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
        autoAdvanceEnabled={autoAdvanceEnabled}
        setAutoAdvanceEnabled={setAutoAdvanceEnabled}
      />
      <main 
        className="flex-1 bg-black flex items-center justify-center relative"
        style={{
          height: '100%',           // Take full available height
          minHeight: '400px',       // Mobile fallback minimum
          overflow: 'hidden'        // Prevent internal scrolling
        }}
      >
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
          autoAdvanceEnabled={autoAdvanceEnabled}
          onMarkNavigation={handleMarkNavigation}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
        />
      </main>
    </div>
  );
};

export default App;