import type { 
    FaceLandmarker, 
    FaceLandmarkerResult as MPFaceLandmarkerResult,
    NormalizedLandmark,
    Classifications,
    Category,
    FaceDetector,
    Detection
} from "@mediapipe/tasks-vision";

// Use MediaPipe's types directly
export type FaceLandmark = NormalizedLandmark;
export type FaceLandmarkerResult = MPFaceLandmarkerResult;
export type FaceBlendshapes = Classifications;
export type FaceDetection = Detection;

export interface DetectedFace {
    landmarks: FaceLandmark[];
    blendshapes?: Category[]; // Face blendshapes for expressions
    transformationMatrix?: number[]; // 4x4 transformation matrix for face orientation
    boundingBox?: {
        xMin: number;
        yMin: number;
        width: number;
        height: number;
    };
}

// This will be the structure of the results from MediaPipe's onResults callback
export interface MediaPipeFaceResults {
    faceLandmarks: FaceLandmark[][];
    faceBlendshapes?: FaceBlendshapes[];
    facialTransformationMatrixes?: number[][]; // Array of 4x4 matrices
    image?:
        | HTMLImageElement
        | HTMLVideoElement
        | HTMLCanvasElement
        | ImageBitmap; // The image source processed
}

// Our processed and stored face data
export interface FaceData {
    detectedFaces: DetectedFace[];
    imageDimensions?: { width: number; height: number };
}

export interface MediaPipeFaceOptions {
    staticImageMode?: boolean;
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
    selfieMode?: boolean; // For flipping if the input video is flipped
    locateFile?: (file: string, scriptPath?: string) => string;
}

export interface FaceTrackingDeviceProps {
    options?: MediaPipeFaceOptions;
    faceVersion?: string;
    onInitialLoad?: () => void;
    onFaceData?: (data: FaceData) => void;
    onError?: (error: string) => void;
    onTrackingStarted?: () => void;
    onTrackingStopped?: () => void;
    onResults?: (
        detectedFaces: DetectedFace[],
        image?:
            | HTMLImageElement
            | HTMLVideoElement
            | HTMLCanvasElement
            | ImageBitmap
    ) => void;
}

export interface FaceTrackingDevice {
    isTracking: boolean;
    faceData: FaceData | null;
    error: string | null;
    startTracking: (videoElement: HTMLVideoElement) => Promise<void>;
    stopTracking: () => void;
    getFaceLandmarker?: () => FaceLandmarker | null; // For tasks-vision API
    getFaceDetector?: () => FaceDetector | null; // For face detection
}

export interface FaceTrackingControl extends FaceTrackingDevice {
    // Event listener methods
    addFaceDataListener: (listener: (data: FaceData) => void) => string;
    removeFaceDataListener: (listenerId: string) => void;
    addErrorListener: (listener: (error: string) => void) => string;
    removeErrorListener: (listenerId: string) => void;
    addStartListener: (listener: () => void) => string;
    removeStartListener: (listenerId: string) => void;
    addStopListener: (listener: () => void) => string;
    removeStopListener: (listenerId: string) => void;
}

export interface FaceProviderProps extends FaceTrackingDeviceProps {
    // Face-specific props
    outputFaceBlendshapes?: boolean; // Default: true
    outputTransformationMatrix?: boolean; // Default: false
    runningMode?: "IMAGE" | "VIDEO"; // Default: "VIDEO"
}