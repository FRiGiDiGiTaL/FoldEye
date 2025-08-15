export interface PageData {
  widthCm: number;
  heightCm: number;
  paddingTopCm: number;
  paddingBottomCm: number;
  instructionsText: string;
  parsedInstructions: string[];
  currentPage: number;
}

export interface CalibrationData {
  pixelsPerCm: number | null;
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