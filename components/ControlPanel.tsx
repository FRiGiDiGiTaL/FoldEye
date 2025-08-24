import React, { useState, useCallback } from 'react';
import type { PageData, CalibrationData, Transform, MarkNavigation } from '../types';
import { CameraIcon, RulerIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon } from './Icons';
import { VoiceControl } from './VoiceControl';

interface ControlPanelProps {
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
  pageData: PageData;
  setPageData: React.Dispatch<React.SetStateAction<PageData>>;
  calibrationData: CalibrationData;
  setCalibrationData: React.Dispatch<React.SetStateAction<CalibrationData>>;
  handleInstructionsTextChange: (text: string) => void;
  statusMessage: string;
  setStatusMessage: (message: string) => void;
  transform: Transform;
  setTransform: React.Dispatch<React.SetStateAction<Transform>>;
  markNavigation: MarkNavigation;
  currentMarksCm: number[];
  handleMarkNavigation: (action: 'next' | 'prev' | 'toggleAll') => void;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  onCalibrate: () => void;
}

interface CollapsibleSectionProps {
  stepNumber: number;
  title: string;
  instruction: string;
  isExpanded: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  stepNumber,
  title,
  instruction,
  isExpanded,
  onToggle,
  isComplete = false,
  children
}) => (
  <div className="mb-3 border border-gray-600 rounded-lg overflow-hidden bg-gray-700/30">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex items-center justify-between text-left"
    >
      <div className="flex items-center">
        <RulerIcon className="w-5 h-5 mr-3 text-blue-400" />
        <div className="flex-1">
          <h2 className="text-lg font-bold text-yellow-300 flex items-center justify-between">
            <span>{title}</span>
            {isComplete && (
              <span className="ml-2 text-green-400 text-sm">✓</span>
            )}
          </h2>
          <p className="text-xs text-blue-300 mt-1">{instruction}</p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </button>
    
    <div className={`transition-all duration-300 ease-in-out ${
      isExpanded 
        ? 'max-h-[1000px] opacity-100' 
        : 'max-h-0 opacity-0'
    } overflow-hidden`}>
      <div className="p-4 pt-2">
        {children}
      </div>
    </div>
  </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode; centered?: boolean }> = ({ 
  label, 
  children,
  centered = false 
}) => (
  <div className="mb-4">
    <label className={`block text-sm font-medium text-gray-400 mb-1 ${centered ? 'text-center' : ''}`}>
      {label}
    </label>
    {children}
  </div>
);

const NumberInput: React.FC<{ 
  value: number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  unit: string;
  placeholder?: string;
}> = ({ value, onChange, unit, placeholder }) => (
  <div className="flex items-center">
    <input
      type="number"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      step="0.1"
      min="0.1"
    />
    <span className="ml-2 text-gray-400">{unit}</span>
  </div>
);

// Custom button component with press effect
const PressButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}> = ({ onClick, children, className = '', disabled = false, title }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      title={title}
      className={`transition-colors duration-150 ${
        isPressed && !disabled
          ? 'bg-white text-gray-900' // Inverted colors when pressed
          : className
      }`}
    >
      {children}
    </button>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isCameraActive,
  setIsCameraActive,
  pageData,
  setPageData,
  calibrationData,
  setCalibrationData,
  handleInstructionsTextChange,
  statusMessage,
  setStatusMessage,
  transform,
  setTransform,
  markNavigation,
  currentMarksCm,
  handleMarkNavigation,
  handleNextPage,
  handlePrevPage,
  onCalibrate,
}) => {
  // State for raw input and formatted output
  const [rawInput, setRawInput] = useState('');
  const [formattedOutput, setFormattedOutput] = useState('');

  // Function to clean and format book folding input
  const cleanBookFoldingInput = useCallback((raw: string): string => {
    if (!raw || !raw.trim()) return '';
    
    const lines = raw.trim().split("\n");
    let result: string[] = [];
    let autoPage = 1;
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Skip comment lines
      if (line.startsWith('#')) {
        result.push(line);
        continue;
      }
      
      // Remove common prefixes
      line = line.replace(/^(Page|Pg|P)\.?\s*/i, "");
      line = line.replace(/[:]/g, " "); // Replace colons with spaces
      
      // Try to extract explicit page number
      const pageMatch = line.match(/^(\d+)\s+(.*)$/);
      let measurements: string;
      let pageNumbers: string;
      
      if (pageMatch) {
        // Explicit page number found
        const pageNo = parseInt(pageMatch[1]);
        measurements = pageMatch[2];
        pageNumbers = pageNo + "-" + (pageNo + 1);
      } else {
        // No explicit page number, use auto-incrementing
        measurements = line;
        pageNumbers = autoPage + "-" + (autoPage + 1);
        autoPage += 2;
      }
      
      // Clean up measurements: normalize separators
      measurements = measurements
        .replace(/[|;]/g, ",")           // Replace pipes and semicolons with commas
        .replace(/\s+/g, " ")           // Multiple spaces to single space
        .replace(/,\s*,/g, ",")         // Remove double commas
        .replace(/,\s+/g, ", ")         // Normalize comma spacing
        .replace(/\s*,/g, ",")          // Remove space before comma
        .replace(/,/g, ", ")             // Add space after comma
        .replace(/,\s*$/, "")           // Remove trailing comma
        .trim();
      
      // Only add if we have actual measurements
      if (measurements && measurements.match(/\d/)) {
        result.push(pageNumbers + "    " + measurements);
      }
    }
    
    return result.join("\n");
  }, []);

  // Handle raw input changes
  const handleRawInputChange = useCallback((value: string) => {
    setRawInput(value);
    const cleaned = cleanBookFoldingInput(value);
    setFormattedOutput(cleaned);
  }, [cleanBookFoldingInput]);

  // Apply formatted output to main instructions
  const applyFormattedOutput = useCallback(() => {
    if (formattedOutput.trim()) {
      handleInstructionsTextChange(formattedOutput);
      // Clear the input boxes after applying
      setRawInput('');
      setFormattedOutput('');
    }
  }, [formattedOutput, handleInstructionsTextChange]);
  // Collapsible panel state - Step 1 starts expanded, updated step numbers
  const [expandedPanels, setExpandedPanels] = useState<Record<number, boolean>>({
    1: true, // Book Dimensions starts expanded
    2: false,
    3: false,
    4: false, // Combined Page & Mark Navigation
    5: false  // Marking Instructions (was step 6)
  });

  const togglePanel = (stepNumber: number) => {
    setExpandedPanels(prev => ({
      ...prev,
      [stepNumber]: !prev[stepNumber]
    }));
  };

  const handlePageDataChange = (field: keyof PageData, value: number) => {
    setPageData(prev => ({ ...prev, [field]: value }));
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInstructionsTextChange(e.target.value);
  };
  
  const resetCalibration = () => {
    setCalibrationData({ pixelsPerCm: null });
    setStatusMessage("Calibration reset. Position book and calibrate again.");
  };

  const handleCalibrate = () => {
    console.log('Calibrate button clicked!');
    if (pageData.heightCm > 0) {
      const pixelsPerCm = 100;
      setCalibrationData({ pixelsPerCm });
      setStatusMessage("Calibration complete! Position book and use cut marks.");
      // Auto-expand next step when calibration is complete
      setExpandedPanels(prev => ({ ...prev, 2: false, 3: true }));
    } else {
      setStatusMessage("Please enter book height before calibrating.");
    }
    onCalibrate();
  };

  const firstMarkedPageIndex = pageData.parsedInstructions.findIndex(p => !!p);
  let lastMarkedPageIndex = -1;
  for (let i = pageData.parsedInstructions.length - 1; i >= 0; i--) {
    if (pageData.parsedInstructions[i]) {
      lastMarkedPageIndex = i;
      break;
    }
  }

  // Determine completion status for each step
  const stepCompletion = {
    1: pageData.heightCm > 0,
    2: calibrationData.pixelsPerCm !== null,
    3: true, // Voice control is always "ready"
    4: pageData.parsedInstructions.some(p => p !== '') && currentMarksCm.length > 0, // Combined step
    5: pageData.parsedInstructions.filter(p => p).length > 0 // Marking Instructions
  };

  return (
    <aside className="w-full bg-gray-800 p-4 overflow-y-auto flex-shrink-0 shadow-lg md:w-96 md:h-full">
      <div className="flex items-center mb-6">
        <RulerIcon className="w-8 h-8 mr-3 text-blue-400" />
        <h1 className="text-2xl font-bold relative">
          <span 
            className="animated-gradient-text"
            style={{
              fontFamily: "'Orbitron', monospace",
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4, #10b981, #3b82f6)',
              backgroundSize: '300% 300%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              animation: 'gradientShift 3s ease-in-out infinite, textGlow 2s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
            }}
          >
            BookfoldAR
          </span>
        </h1>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          
          @keyframes gradientShift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          
          @keyframes textGlow {
            0% {
              filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3)) drop-shadow(0 0 16px rgba(139, 92, 246, 0.2));
            }
            100% {
              filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 24px rgba(139, 92, 246, 0.4));
            }
          }
        `
      }} />



      <div className="space-y-3">
        {/* Book Dimensions */}
        <CollapsibleSection
          stepNumber={1}
          title="Book Dimensions"
          instruction="Enter your book's physical measurements to set up the camera view proportions."
          isExpanded={expandedPanels[1]}
          onToggle={() => togglePanel(1)}
          isComplete={stepCompletion[1]}
        >
          <InputGroup label="Page Height">
            <NumberInput 
              value={pageData.heightCm} 
              onChange={(e) => handlePageDataChange('heightCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="From top to bottom"
            />
          </InputGroup>
          <InputGroup label="Top Padding">
            <NumberInput 
              value={pageData.paddingTopCm} 
              onChange={(e) => handlePageDataChange('paddingTopCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="Blank space on top"
            />
          </InputGroup>
          <InputGroup label="Bottom Padding">
            <NumberInput 
              value={pageData.paddingBottomCm} 
              onChange={(e) => handlePageDataChange('paddingBottomCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="Blank space on bottom"
            />
          </InputGroup>
        </CollapsibleSection>

        {/* Camera & Overlay */}
        <CollapsibleSection
          stepNumber={2}
          title="Camera & Overlay"
          instruction="Start the camera, align your book with the corner guides, then calibrate the system."
          isExpanded={expandedPanels[2]}
          onToggle={() => togglePanel(2)}
          isComplete={stepCompletion[2]}
        >
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white mb-3 ${
              isCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors`}
          >
            <CameraIcon className="w-5 h-5 mr-2" />
            {isCameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          {/* Manual Calibrate button */}
          {isCameraActive && !calibrationData.pixelsPerCm && (
            <button
              onClick={handleCalibrate}
              disabled={pageData.heightCm <= 0}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors mb-3"
              title={pageData.heightCm <= 0 ? "Please enter book height first" : "Click to start the overlay system"}
            >
              {pageData.heightCm <= 0 ? 'Enter Height First' : 'Start Overlay'}
            </button>
          )}

          {/* Manual zoom control */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">
              Video Scale: {transform.scale.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={transform.scale}
              onChange={(e) => setTransform(t => ({ ...t, scale: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {calibrationData.pixelsPerCm && (
            <button
              onClick={resetCalibration}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Reset Calibration
            </button>
          )}
        </CollapsibleSection>

        {/* Voice Control */}
        <CollapsibleSection
          stepNumber={3}
          title="Voice Control"
          instruction="Use voice commands to navigate hands-free while folding your book."
          isExpanded={expandedPanels[3]}
          onToggle={() => togglePanel(3)}
          isComplete={stepCompletion[3]}
        >
          <VoiceControl
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            onToggleMarks={() => handleMarkNavigation('toggleAll')}
            onStatusMessage={setStatusMessage}
          />
        </CollapsibleSection>

        {/* Combined Page & Mark Navigation */}
        <CollapsibleSection
          stepNumber={4}
          title="Page & Mark Navigation"
          instruction="Navigate between pages and individual fold marks while working on your book."
          isExpanded={expandedPanels[4]}
          onToggle={() => togglePanel(4)}
          isComplete={stepCompletion[4]}
        >
          {/* Page Navigation Section */}
          <div className="text-center mb-6">
            <InputGroup 
              label={`Page ${pageData.currentPage + 1} of ${pageData.parsedInstructions.length}`}
              centered={true}
            >
              <div className="flex justify-center space-x-4">
                <PressButton
                  onClick={handlePrevPage}
                  disabled={pageData.currentPage <= firstMarkedPageIndex}
                  className="px-6 py-3 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  <ChevronLeftIcon className="w-6 h-6"/>
                </PressButton>
                <PressButton
                  onClick={handleNextPage}
                  disabled={pageData.currentPage >= lastMarkedPageIndex}
                  className="px-6 py-3 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  <ChevronRightIcon className="w-6 h-6"/>
                </PressButton>
              </div>
            </InputGroup>
          </div>

          {/* Mark Display Section */}
          <div className="text-center mb-6">
            <div className="p-3 bg-gray-700/50 rounded-lg min-h-[80px] flex flex-col justify-center">
              {currentMarksCm.length > 0 ? (
                <div className="text-lg text-gray-300 font-medium">
                  <div className="flex justify-center items-center">
                    <span>Total marks: {currentMarksCm.length}</span>
                    {!markNavigation.showAllMarks && (
                      <span className="text-pink-300 font-mono ml-4">
                        {currentMarksCm[markNavigation.currentMarkIndex]?.toFixed(1)}cm
                      </span>
                    )}
                  </div>
                  {!markNavigation.showAllMarks && (
                    <div className="text-center mt-2 text-gray-400">
                      Mark {markNavigation.currentMarkIndex + 1} of {currentMarksCm.length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-gray-400">
                  No marks available for current page
                </div>
              )}
            </div>
          </div>

          {/* Mark Mode Toggle Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => handleMarkNavigation('toggleAll')}
              className={`flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors ${
                markNavigation.showAllMarks 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              All Marks
            </button>
            <button
              onClick={() => handleMarkNavigation('toggleAll')}
              className={`flex-1 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors ${
                !markNavigation.showAllMarks 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              Single Mark
            </button>
          </div>

          {/* Mark Navigation Buttons */}
          {currentMarksCm.length > 1 && (
            <div className="text-center">
              <InputGroup label="Navigate Marks" centered={true}>
                <div className="flex justify-center space-x-4">
                  <PressButton
                    onClick={() => handleMarkNavigation('prev')}
                    className="px-6 py-3 bg-gray-700 rounded-md hover:bg-gray-600 text-lg font-medium flex items-center"
                    title="Previous Mark"
                  >
                    <ChevronUpIcon className="w-6 h-6 mr-2"/>
                    Up
                  </PressButton>
                  <PressButton
                    onClick={() => handleMarkNavigation('next')}
                    className="px-6 py-3 bg-gray-700 rounded-md hover:bg-gray-600 text-lg font-medium flex items-center"
                    title="Next Mark"
                  >
                    <ChevronDownIcon className="w-6 h-6 mr-2"/>
                    Down
                  </PressButton>
                </div>
              </InputGroup>
            </div>
          )}
        </CollapsibleSection>

        {/* Marking Instructions */}
        <CollapsibleSection
          stepNumber={5}
          title="Marking Instructions"
          instruction="Define which pages have fold marks and specify the measurements for each mark."
          isExpanded={expandedPanels[5]}
          onToggle={() => togglePanel(5)}
          isComplete={stepCompletion[5]}
        >
          <div className="space-y-4">
            {/* Raw Input Area */}
            <InputGroup label="Paste Your Measurements (any format)">
              <textarea
                value={rawInput}
                onChange={(e) => handleRawInputChange(e.target.value)}
                placeholder="Paste measurements here... (e.g., Page 1 2.2 5.5 7.7, 8.1, 8.9 | 9.3, 10.0 | 11.0)"
                rows={4}
                className="w-full bg-gray-600 border border-gray-500 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm placeholder-gray-400"
              />
            </InputGroup>

            {/* Auto-formatted Output */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-blue-400">Auto-Formatted Output:</label>
                <button
                  onClick={applyFormattedOutput}
                  disabled={!formattedOutput.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                >
                  Apply ✓
                </button>
              </div>
              <pre className="bg-gray-800/50 p-2 rounded text-green-400 font-mono text-xs whitespace-pre-wrap min-h-[60px] border border-gray-600">
                {formattedOutput || 'Cleaned output will appear here...'}
              </pre>
            </div>

            {/* Manual Entry Area */}
            <InputGroup label="Manual Entry / Final Instructions">
              <textarea
                value={pageData.instructionsText}
                onChange={handleInstructionsChange}
                rows={6}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="1-2    0.1, 0.5, 1.0, 10.0&#10;3-4    0.2, 0.8, 9.5&#10;5-6    0.3, 1.2, 2.1, 8.8"
              />
            </InputGroup>

            {/* Format Help */}
            <div className="bg-gray-700/30 rounded-lg p-3 text-xs text-gray-400">
              <h4 className="text-white font-semibold mb-2">📝 Supported Input Formats:</h4>
              <div className="grid grid-cols-1 gap-2">
                <div>• <span className="text-green-400">Page 1 2.2 5.5 7.7, 8.1</span> → Auto-converts to proper format</div>
                <div>• <span className="text-green-400">1 2.2, 5.5 | 7.7 | 8.1</span> → Handles pipes and commas</div>
                <div>• <span className="text-green-400">Page 5: 1.1, 2.2, 3.3</span> → Removes extra text</div>
                <div>• <span className="text-yellow-400">Final:</span> <span className="text-blue-400">1-2    2.2, 5.5, 7.7, 8.1</span></div>
              </div>
            </div>
          </div>
          
          {pageData.parsedInstructions.length > 0 && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded-md">
              <p className="text-sm text-green-400 font-medium">
                ✓ Parsed {pageData.parsedInstructions.filter(p => p).length} pages with marks successfully
              </p>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </aside>
  );
};