import React from 'react';
import type { PageData, CalibrationData, Transform, MarkNavigation } from '../types';
import { CameraIcon, RulerIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon } from './Icons';

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
}> = ({ value, onChange, unit }) => (
  <div className="flex items-center">
    <input
      type="number"
      value={value}
      onChange={onChange}
      className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      step="0.1"
      min="0.1"
    />
    <span className="ml-2 text-gray-400">{unit}</span>
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
}) => {
  const handlePageDataChange = (field: keyof PageData, value: number) => {
    setPageData(prev => ({ ...prev, [field]: value }));
    if (calibrationData.pixelsPerCm) {
      setCalibrationData({ pixelsPerCm: null });
      setStatusMessage("Page dimensions changed. Please re-calibrate.");
    }
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInstructionsTextChange(e.target.value);
  };
  
  const handleNextPage = () => {
    setPageData(prev => {
      for (let i = prev.currentPage + 1; i < prev.parsedInstructions.length; i++) {
        if (prev.parsedInstructions[i]) {
          setStatusMessage(`Viewing Page ${i + 1}`);
          return { ...prev, currentPage: i };
        }
      }
      setStatusMessage(`Already on the last page with marks (${prev.currentPage + 1})`);
      return prev;
    });
  };

  const handlePrevPage = () => {
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
  };
  
  const resetCalibration = () => {
    setCalibrationData({ pixelsPerCm: null });
    setStatusMessage("Calibration reset. Position book and calibrate again.");
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
    <aside className="w-full md:w-96 bg-gray-800 p-4 overflow-y-auto flex-shrink-0 shadow-lg h-1/2 md:h-full">
      <div className="flex items-center mb-4">
        <RulerIcon className="w-8 h-8 mr-3 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">AR Book Folding</h1>
      </div>
      
      {/* Status display */}
      <div className="bg-blue-900/50 text-blue-100 p-3 rounded-md mb-4 text-sm font-mono text-center">
        {statusMessage}
      </div>

      <div className="space-y-6">
        {/* Book Dimensions - moved to top */}
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2 flex items-center">
            <RulerIcon className="w-5 h-5 mr-2"/>
            Book Dimensions
          </h2>

          <InputGroup label="Page Height">
            <NumberInput 
              value={pageData.heightCm} 
              onChange={(e) => handlePageDataChange('heightCm', parseFloat(e.target.value) || 0)} 
              unit="cm" 
            />
          </InputGroup>
          <InputGroup label="Page Width">
            <NumberInput 
              value={pageData.widthCm} 
              onChange={(e) => handlePageDataChange('widthCm', parseFloat(e.target.value) || 0)} 
              unit="cm" 
            />
          </InputGroup>
          <InputGroup label="Top Padding">
            <NumberInput 
              value={pageData.paddingTopCm} 
              onChange={(e) => handlePageDataChange('paddingTopCm', parseFloat(e.target.value) || 0)} 
              unit="cm" 
            />
          </InputGroup>
          <InputGroup label="Bottom Padding">
            <NumberInput 
              value={pageData.paddingBottomCm} 
              onChange={(e) => handlePageDataChange('paddingBottomCm', parseFloat(e.target.value) || 0)} 
              unit="cm" 
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

        {/* Camera Controls */}
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2 flex items-center">
            <CameraIcon className="w-5 h-5 mr-2"/>
            Camera & Calibration
          </h2>
          
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white mb-3 ${
              isCameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors`}
          >
            <CameraIcon className="w-5 h-5 mr-2" />
            {isCameraActive ? 'Stop Camera' : 'Start Camera'}
          </button>

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

        {/* Page Navigation */}
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
            Page Navigation
          </h2>
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

        {/* Mark Navigation */}
        {calibrationData.pixelsPerCm && currentMarksCm.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
              Mark Navigation
            </h2>
            
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

        {/* Marking Instructions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
            Marking Instructions
          </h2>
          <InputGroup label="Enter marks (e.g., '17-18  7.1, 9.5')">
            <textarea
              value={pageData.instructionsText}
              onChange={handleInstructionsChange}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder={`# Page numbers can be single or a range, e.g.,
17-18  7.1, 9.5, 12.3
19     7.4, 9.8, 12.7
...`}
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