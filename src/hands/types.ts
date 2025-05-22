import type { Hands } from '@mediapipe/hands';

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number; // Optional, as visibility might not always be present or used
}

export interface Handedness {
    score: number;
    index: number; // Typically 0 for Left, 1 for Right if two hands, but depends on MediaPipe output
    label: 'Left' | 'Right' | string; // string for flexibility if more labels are possible
}

export interface DetectedHand {
    landmarks: HandLandmark[];
    worldLandmarks?: HandLandmark[]; // Optional, if requested and available
    handedness: Handedness[]; // MediaPipe returns an array, usually with one item
}

// This will be the structure of the results from MediaPipe's onResults callback
export interface MediaPipeHandsResults {
    multiHandLandmarks: HandLandmark[][];
    multiHandWorldLandmarks: HandLandmark[][];
    multiHandedness: Handedness[];
    image?: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement; // The image source processed
}

// Our processed and stored hands data
export interface HandsData {
    detectedHands: DetectedHand[];
    imageDimensions?: { width: number; height: number };
}

export interface MediaPipeHandsOptions {
    staticImageMode?: boolean;
    maxNumHands?: number;
    modelComplexity?: 0 | 1;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
    selfieMode?: boolean; // For flipping the handedness if the input video is flipped
    locateFile?: (file: string, scriptPath?: string) => string;
}

export interface UseHandsProps {
    options?: MediaPipeHandsOptions;
    onHandsData?: (data: HandsData) => void;
    onError?: (error: string) => void;
    onTrackingStarted?: () => void;
    onTrackingStopped?: () => void;
}

export interface HandsControl {
    isTracking: boolean;
    handsData: HandsData | null;
    error: string | null;
    startTracking: (videoElement: HTMLVideoElement) => Promise<void>;
    stopTracking: () => void;
    getHandsInstance: () => Hands | null; // To get the raw MediaPipe Hands instance if needed
    // Event listener methods
    addHandsDataListener: (listener: (data: HandsData) => void) => string;
    removeHandsDataListener: (listenerId: string) => void;
    addErrorListener: (listener: (error: string) => void) => string;
    removeErrorListener: (listenerId: string) => void;
    addStartListener: (listener: () => void) => string;
    removeStartListener: (listenerId: string) => void;
    addStopListener: (listener: () => void) => string;
    removeStopListener: (listenerId: string) => void;
}

// Context will provide the control object
export type HandsContextType = HandsControl | null;
