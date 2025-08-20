import React, { useState } from 'react';
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
  autoAdvanceEnabled: boolean;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
}

const InputGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
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

const StepTitle: React.FC<{ stepNumber: number; title: string; instruction: string }> = ({ stepNumber, title, instruction }) => (
  <div className="mb-3">
    <h2 className="text-xl font-bold text-yellow-300 mb-2 border-b border-gray-700 pb-2 flex items-center">
      <RulerIcon className="w-5 h-5 mr-2"/>
      {title} - <span className="text-orange-400 ml-1">STEP {stepNumber}</span>
    </h2>
    <p className="text-sm text-blue-300 italic bg-gray-700/30 p-2 rounded-md">
      {instruction}
    </p>
  </div>
);

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
  autoAdvanceEnabled,
  setAutoAdvanceEnabled,
}) => {
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

  return (
    <aside className="w-full bg-gray-800 p-4 overflow-y-auto flex-shrink-0 shadow-lg md:w-96 md:h-full">
      <div className="flex items-center mb-4">
        <RulerIcon className="w-8 h-8 mr-3 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">BookfoldAR</h1>
      </div>
      
      {/* Status display */}
      <div className="bg-blue-900/50 text-blue-100 p-3 rounded-md mb-4 text-sm font-mono text-center">
        {statusMessage}
      </div>

      <div className="space-y-6">
        {/* Book Dimensions - STEP 1 */}
        <div>
          <StepTitle 
            stepNumber={1} 
            title="Book Dimensions" 
            instruction="Enter your book's physical measurements to set up the camera view proportions."
          />

          <InputGroup label="Page Height">
            <NumberInput 
              value={pageData.heightCm} 
              onChange={(e) => handlePageDataChange('heightCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="Enter height"
            />
          </InputGroup>
          <InputGroup label="Top Padding">
            <NumberInput 
              value={pageData.paddingTopCm} 
              onChange={(e) => handlePageDataChange('paddingTopCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="Enter top padding"
            />
          </InputGroup>
          <InputGroup label="Bottom Padding">
            <NumberInput 
              value={pageData.paddingBottomCm} 
              onChange={(e) => handlePageDataChange('paddingBottomCm', parseFloat(e.target.value) || 0)} 
              unit="cm"
              placeholder="Enter bottom padding"
            />
          </InputGroup>
          
          {calibrationData.pixelsPerCm && (
            <div className="mt-3 p-2 bg-green-900/30 border border-green-700 rounded-md">
              <p className="text-xs text-green-300">
                <strong>Calibrated:</strong> 1cm = {calibrationData.pixelsPerCm.toFixed(2)} pixels
              </p>
            </div>
          )}
        </div>

        {/* Camera Controls - STEP 2 */}
        <div>
          <StepTitle 
            stepNumber={2} 
            title="Camera & Calibration" 
            instruction="Start the camera, align your book with the corner guides, then calibrate the system."
          />
          
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
              title={pageData.heightCm <= 0 ? "Please enter book height first" : "Click to calibrate the camera"}
            >
              {pageData.heightCm <= 0 ? 'Enter Height to Calibrate' : 'Manual Calibrate'}
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
        </div>

        {/* Voice Control - STEP 3 */}
        <div>
          <StepTitle 
            stepNumber={3} 
            title="Voice Control" 
            instruction="Use voice commands to navigate hands-free while folding your book."
          />
          
          <VoiceControl
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            onToggleMarks={() => handleMarkNavigation('toggleAll')}
            onStatusMessage={setStatusMessage}
          />
        </div>

        {/* Page Navigation - STEP 4 */}
        <div>
          <StepTitle 
            stepNumber={4} 
            title="Page Navigation" 
            instruction="Navigate between pages that have fold marks defined in your instructions."
          />
          
          {/* Auto-advance toggle */}
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-700 rounded-md">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvanceEnabled}
                onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
                className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <div>
                <div className="text-sm font-medium text-purple-300">Auto Page Advance</div>
                <div className="text-xs text-gray-400">
                  Automatically advance to next page when reaching the last mark
                </div>
              </div>
            </label>
          </div>
          
          <InputGroup label={`Page ${pageData.currentPage + 1} of ${pageData.parsedInstructions.length}`}>
            <div className="flex space-x-2">
              <button 
                onClick={handlePrevPage} 
                disabled={pageData.currentPage <= firstMarkedPageIndex} 
                className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5"/>
              </button>
              <button 
                onClick={handleNextPage} 
                disabled={pageData.currentPage >= lastMarkedPageIndex} 
                className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5"/>
              </button>
            </div>
          </InputGroup>
        </div>

        {/* Mark Navigation - STEP 5 */}
        {calibrationData.pixelsPerCm && currentMarksCm.length > 0 && (
          <div>
            <StepTitle 
              stepNumber={5} 
              title="Mark Navigation" 
              instruction="Navigate through individual fold marks on the current page."
            />
            
            <button
              onClick={() => handleMarkNavigation('toggleAll')}
              className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors mb-3 ${
                markNavigation.showAllMarks 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <EyeIcon className="w-5 h-5 mr-2" />
              {markNavigation.showAllMarks ? 'View All Marks' : 'Single Mark Mode'}
            </button>

            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <div className="text-sm text-gray-300">
                <div className="flex justify-between items-center">
                  <span>Total marks: {currentMarksCm.length}</span>
                  {!markNavigation.showAllMarks && (
                    <span className="text-pink-300 font-mono">
                      {currentMarksCm[markNavigation.currentMarkIndex]?.toFixed(1)}cm
                    </span>
                  )}
                </div>
                {!markNavigation.showAllMarks && (
                  <div className="text-center mt-2 text-gray-400">
                    Mark {markNavigation.currentMarkIndex + 1} of {currentMarksCm.length}
                    {autoAdvanceEnabled && (
                      <div className="text-xs text-purple-300 mt-1">
                        📖 Auto-advance enabled
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {currentMarksCm.length > 1 && (
              <InputGroup label="Navigate Marks">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleMarkNavigation('prev')} 
                    className="flex-1 p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex items-center justify-center"
                    title="Previous Mark"
                  >
                    <ChevronUpIcon className="w-5 h-5 mr-1"/>
                    Up
                  </button>
                  <button 
                    onClick={() => handleMarkNavigation('next')} 
                    className="flex-1 p-2 bg-gray-700 rounded-md hover:bg-gray-600 flex items-center justify-center"
                    title="Next Mark"
                  >
                    <ChevronDownIcon className="w-5 h-5 mr-1"/>
                    Down
                  </button>
                </div>
              </InputGroup>
            )}
          </div>
        )}

        {/* Marking Instructions - STEP 6 */}
        <div>
          <StepTitle 
            stepNumber={6} 
            title="Marking Instructions" 
            instruction="Define which pages have fold marks and specify the measurements for each mark."
          />
          <InputGroup label="Enter Marks (e.g., 1-2  0.1, 0.5, 1.0, 10.0)">
            <textarea
              value={pageData.instructionsText}
              onChange={handleInstructionsChange}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </InputGroup>
          
          {pageData.parsedInstructions.length > 0 && (
            <div className="mt-2 p-2 bg-gray-700/30 rounded-md">
              <p className="text-xs text-gray-400">
                Parsed {pageData.parsedInstructions.filter(p => p).length} pages with marks
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};