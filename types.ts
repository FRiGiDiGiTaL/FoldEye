export interface PageData {
  heightCm: number;
  paddingTopCm: number;
  paddingBottomCm: number;
  instructionsText: string;
  parsedInstructions: string[];
  currentPage: number;
}

export interface CalibrationData {
  pixelsPerCm: number | null;
  detectionMethod?: 'automatic' | 'manual';
  confidence?: number;
  detectionTimestamp?: number;
}

export interface Transform {
  scale: number;
  x: number;
  y: number;
}

export interface MarkNavigation {
  showAllMarks: boolean;
  currentMarkIndex: number;
}

export interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  confidence: number;
}

export interface CalibrationSettings {
  autoDetectionEnabled: boolean;
  detectionThreshold: number;
  detectionInterval: number;
  minConfidence: number;
}

export interface DetectionState {
  isDetecting: boolean;
  lastDetection: DetectedCorners | null;
  detectionHistory: DetectedCorners[];
  averageConfidence: number;
}