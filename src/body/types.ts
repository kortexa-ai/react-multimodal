import type { 
    PoseLandmarker, 
    PoseLandmarkerResult as MPPoseLandmarkerResult,
    NormalizedLandmark,
    Landmark
} from "@mediapipe/tasks-vision";

// Use MediaPipe's types directly
export type BodyLandmark = NormalizedLandmark;
export type BodyWorldLandmark = Landmark;
export type PoseLandmarkerResult = MPPoseLandmarkerResult;

export interface DetectedBody {
    landmarks: BodyLandmark[];
    worldLandmarks?: BodyWorldLandmark[];
    segmentationMasks?: ImageData[]; // Optional segmentation mask
}

// This will be the structure of the results from MediaPipe's onResults callback
export interface MediaPipeBodyResults {
    poseLandmarks: BodyLandmark[];
    poseWorldLandmarks: BodyWorldLandmark[];
    segmentationMask?: ImageBitmap;
    image?:
        | HTMLImageElement
        | HTMLVideoElement
        | HTMLCanvasElement
        | ImageBitmap; // The image source processed
}

// Our processed and stored body data
export interface BodyData {
    detectedBodies: DetectedBody[];
    imageDimensions?: { width: number; height: number };
}

export interface MediaPipeBodyOptions {
    staticImageMode?: boolean;
    modelComplexity?: 0 | 1 | 2;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    smoothSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
    selfieMode?: boolean; // For flipping if the input video is flipped
    locateFile?: (file: string, scriptPath?: string) => string;
}

export interface BodyTrackingDeviceProps {
    options?: MediaPipeBodyOptions;
    bodyVersion?: string;
    onInitialLoad?: () => void;
    onBodyData?: (data: BodyData) => void;
    onError?: (error: string) => void;
    onTrackingStarted?: () => void;
    onTrackingStopped?: () => void;
    onResults?: (
        detectedBodies: DetectedBody[],
        image?:
            | HTMLImageElement
            | HTMLVideoElement
            | HTMLCanvasElement
            | ImageBitmap
    ) => void;
}

export interface BodyTrackingDevice {
    isTracking: boolean;
    bodyData: BodyData | null;
    error: string | null;
    startTracking: (videoElement: HTMLVideoElement) => Promise<void>;
    stopTracking: () => void;
    getPoseLandmarker?: () => PoseLandmarker | null; // For tasks-vision API
}

export interface BodyTrackingControl extends BodyTrackingDevice {
    // Event listener methods
    addBodyDataListener: (listener: (data: BodyData) => void) => string;
    removeBodyDataListener: (listenerId: string) => void;
    addErrorListener: (listener: (error: string) => void) => string;
    removeErrorListener: (listenerId: string) => void;
    addStartListener: (listener: () => void) => string;
    removeStartListener: (listenerId: string) => void;
    addStopListener: (listener: () => void) => string;
    removeStopListener: (listenerId: string) => void;
}

export interface BodyProviderProps extends BodyTrackingDeviceProps {
    // Body-specific props
    enableSegmentation?: boolean; // Default: false
    outputSegmentationMasks?: boolean; // Default: false
}