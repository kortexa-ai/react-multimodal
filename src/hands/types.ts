import type { 
    HandLandmarker, 
    GestureRecognizer, 
    Category, 
    GestureRecognizerResult,
    HandLandmarkerResult as MPHandLandmarkerResult,
    NormalizedLandmark,
    Landmark
} from "@mediapipe/tasks-vision";

// Use MediaPipe's types directly
export type HandLandmark = NormalizedLandmark;
export type Handedness = Category;
export type GestureResult = Category;
export type GestureRecognitionResult = GestureRecognizerResult;
export type HandLandmarkerResult = MPHandLandmarkerResult;

export interface DetectedHand {
    landmarks: HandLandmark[];
    worldLandmarks?: Landmark[]; // Use Landmark for world coordinates
    handedness: Handedness; // Single handedness value for each hand
    gestures: GestureResult[]; // Built-in gesture recognition
}

// This will be the structure of the results from MediaPipe's onResults callback
export interface MediaPipeHandsResults {
    multiHandLandmarks: HandLandmark[][];
    multiHandWorldLandmarks: HandLandmark[][];
    multiHandedness: Handedness[];
    image?:
        | HTMLImageElement
        | HTMLVideoElement
        | HTMLCanvasElement
        | ImageBitmap; // The image source processed
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

export interface HandsTrackingDeviceProps {
    options?: MediaPipeHandsOptions;
    handsVersion?: string;
    onInitialLoad?: () => void;
    onHandsData?: (data: HandsData) => void;
    onError?: (error: string) => void;
    onTrackingStarted?: () => void;
    onTrackingStopped?: () => void;
    onResults?: (
        detectedHands: DetectedHand[],
        image?:
            | HTMLImageElement
            | HTMLVideoElement
            | HTMLCanvasElement
            | ImageBitmap
    ) => void;
}
export interface HandsTrackingDevice {
    isTracking: boolean;
    handsData: HandsData | null;
    error: string | null;
    startTracking: (videoElement: HTMLVideoElement) => Promise<void>;
    stopTracking: () => void;
    getHandLandmarker?: () => HandLandmarker | null; // NEW: For tasks-vision API
    getGestureRecognizer?: () => GestureRecognizer | null; // NEW: For gesture recognition
}

export interface HandsTrackingControl extends HandsTrackingDevice {
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

export interface HandsProviderProps extends HandsTrackingDeviceProps {
    // New gesture-specific props
    enableGestures?: boolean; // Default: true
    gestureOptions?: {
        numHands?: number;
        minHandDetectionConfidence?: number;
        minHandPresenceConfidence?: number;
        minTrackingConfidence?: number;
    };
    gestureModelPath?: string; // Custom model path if needed
    onGestureResults?: (gestures: GestureResult[], handIndex: number) => void;
}
