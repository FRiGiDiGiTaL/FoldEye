import React, { useState, useMemo, useCallback } from 'react';
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
        // Per book folding convention, only mark the first page of a leaf, which must be odd.
        if (!isNaN(start) && start % 2 !== 0) {
          pageNumbers.push(start);
        }
      } else {
        const pageNum = parseInt(part, 10);
        // Ignore even-numbered pages.
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

const formatInstructionsText = (text: string): string => {
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('#') || trimmedLine.startsWith('PAGE') || trimmedLine === '') {
      formattedLines.push(line);
      continue;
    }
    
    const lineRegex = /^\s*(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\s+([0-9.,\s]+)/;
    const match = trimmedLine.match(lineRegex);
    
    if (!match) {
      formattedLines.push(line);
      continue;
    }
    
    const pageSpec = match[1];
    const measurements = match[2].trim().replace(/,\s*$/, '');
    
    // Split measurements and format them
    const measurementParts = measurements.split(',').map(m => m.trim());
    
    // Calculate the indent for measurements (page spec + some spaces)
    const measurementIndent = ' '.repeat(12);
    
    // If line would be too long, format with proper indentation
    const baseLine = `${pageSpec.padEnd(11)} ${measurementParts.join(', ')}`;
    if (baseLine.length > 80 && measurementParts.length > 1) {
      // Take first few measurements on the first line
      const firstLineCount = Math.max(1, Math.floor(measurementParts.length * 0.7));
      const firstLineMeasurements = measurementParts.slice(0, firstLineCount);
      const remainingMeasurements = measurementParts.slice(firstLineCount);
      
      const firstLine = `${pageSpec.padEnd(11)} ${firstLineMeasurements.join(', ')},`;
      const secondLine = `${measurementIndent}${remainingMeasurements.join(', ')}`;
      
      formattedLines.push(firstLine);
      formattedLines.push(secondLine);
    } else {
      formattedLines.push(`${pageSpec.padEnd(11)} ${measurementParts.join(', ')}`);
    }
  }
  
  return formattedLines.join('\n');
};

const App: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Start the camera to begin.");

  const initialInstructionsText = `PAGE        Measurements in CM
# Example pattern below
17-18        0.5, 7.9, 8.0, 9.6, 9.8, 10.0, 10.1, 20.5
19-20        0.5, 20.5
21-22        0.5, 8.4, 8.5, 10.7, 10.9, 20.5`;
  
  const [pageData, setPageData] = useState<PageData>({
  heightCm: 29.7,
  paddingTopCm: 2,
  paddingBottomCm: 2,
  instructionsText: initialInstructionsText,
  parsedInstructions: parseInstructions(initialInstructionsText),
  currentPage: 16, // Start on page 17 (index 16)
});

  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    pixelsPerCm: null,
  });

  const [markNavigation, setMarkNavigation] = useState<MarkNavigation>({
    showAllMarks: true,
    currentMarkIndex: 0,
  });

  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [calibrationTrigger, setCalibrationTrigger] = useState(0);

  const usableHeightCm = useMemo(() => {
    const height = pageData.heightCm - (pageData.paddingTopCm + pageData.paddingBottomCm);
    return height > 0 ? height : 0;
  }, [pageData.heightCm, pageData.paddingTopCm, pageData.paddingBottomCm]);

  const handleCalibrate = useCallback(() => {
    if (pageData.heightCm <= 0) {
      setStatusMessage("Error: Page height must be a positive number.");
      return;
    }
    // This just triggers the calculation inside CameraView
    setCalibrationTrigger(c => c + 1);
  }, [pageData.heightCm]);

  const handleInstructionsTextChange = useCallback((text: string) => {
    const formattedText = formatInstructionsText(text);
    const newParsedInstructions = parseInstructions(formattedText);
    setPageData(prev => {
      let newCurrentPage = prev.currentPage;
      if (newCurrentPage >= newParsedInstructions.length || newParsedInstructions[newCurrentPage] === '') {
          const firstAvailablePage = newParsedInstructions.findIndex(p => p !== '');
          newCurrentPage = firstAvailablePage !== -1 ? firstAvailablePage : 0;
      }
      return {
        ...prev,
        instructionsText: formattedText,
        parsedInstructions: newParsedInstructions,
        currentPage: newCurrentPage,
      };
    });
    // Reset mark navigation when instructions change
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
  React.useEffect(() => {
    setMarkNavigation(prev => ({
      ...prev,
      currentMarkIndex: Math.min(prev.currentMarkIndex, Math.max(0, currentMarksCm.length - 1))
    }));
  }, [currentMarksCm.length, pageData.currentPage]);

  const handleMarkNavigation = useCallback((action: 'next' | 'prev' | 'toggleAll') => {
    setMarkNavigation(prev => {
      if (action === 'toggleAll') {
        return { ...prev, showAllMarks: !prev.showAllMarks };
      }
      
      if (action === 'next') {
        const nextIndex = (prev.currentMarkIndex + 1) % currentMarksCm.length;
        return { showAllMarks: false, currentMarkIndex: nextIndex };
      }
      
      if (action === 'prev') {
        const prevIndex = prev.currentMarkIndex === 0 ? currentMarksCm.length - 1 : prev.currentMarkIndex - 1;
        return { showAllMarks: false, currentMarkIndex: prevIndex };
      }
      
      return prev;
    });
  }, [currentMarksCm.length]);
  
  return (
      <div className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-100">
        <ControlPanel
          isCameraActive={isCameraActive}
          setIsCameraActive={setIsCameraActive}
          isCalibrating={isCalibrating}
          setIsCalibrating={setIsCalibrating}
          pageData={pageData}
          setPageData={setPageData}
          calibrationData={calibrationData}
          setCalibrationData={setCalibrationData}
          handleCalibrate={handleCalibrate}
          handleInstructionsTextChange={handleInstructionsTextChange}
          statusMessage={statusMessage}
          setStatusMessage={setStatusMessage}
          transform={transform}
          setTransform={setTransform}
          markNavigation={markNavigation}
          currentMarksCm={currentMarksCm}
          handleMarkNavigation={handleMarkNavigation}
        />
        <main className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          <CameraView
            isCameraActive={isCameraActive}
            isCalibrating={isCalibrating}
            setIsCalibrating={setIsCalibrating}
            calibrationData={calibrationData}
            setCalibrationData={setCalibrationData}
            pageData={pageData}
            usableHeightCm={usableHeightCm}
            marksCm={currentMarksCm}
            markNavigation={markNavigation}
            transform={transform}
            setTransform={setTransform}
            setStatusMessage={setStatusMessage}
            calibrationTrigger={calibrationTrigger}
          />
        </main>
      </div>
  );
};

export default App;