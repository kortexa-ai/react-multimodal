import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type {
    DetectedFace,
    FaceLandmark,
    FaceData,
    MediaPipeFaceOptions,
    FaceProviderProps,
    FaceTrackingControl,
    FaceLandmarkerResult,
} from "../types";

// Default MediaPipe Face options
const defaultFaceOptions: MediaPipeFaceOptions = {
    staticImageMode: false,
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true, // Flip for selfie view
};

export function useFaceTrackingDevice({
    options: userOptions,
    onInitialLoad,
    onFaceData,
    onError,
    onTrackingStarted,
    onTrackingStopped,
    onResults,
    outputFaceBlendshapes = true,
    outputTransformationMatrix = false,
    runningMode = "VIDEO",
}: FaceProviderProps = {}): FaceTrackingControl {
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const isTrackingRef = useRef(false);
    const initialLoadCompleteRef = useRef(false);

    const [isTracking, setIsTracking] = useState(false);
    const [currentFaceData, setFaceData] = useState<FaceData | null>(null);
    const [currentError, setCurrentError] = useState<string | null>(null);

    const options = useMemo(
        () => ({ ...defaultFaceOptions, ...userOptions }),
        [userOptions]
    );

    // Refs for callbacks to avoid stale closures
    const onFaceDataRef = useRef(onFaceData);
    useEffect(() => {
        onFaceDataRef.current = onFaceData;
    }, [onFaceData]);
    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);
    const onTrackingStartedRef = useRef(onTrackingStarted);
    useEffect(() => {
        onTrackingStartedRef.current = onTrackingStarted;
    }, [onTrackingStarted]);
    const onTrackingStoppedRef = useRef(onTrackingStopped);
    useEffect(() => {
        onTrackingStoppedRef.current = onTrackingStopped;
    }, [onTrackingStopped]);
    const onResultsRef = useRef(onResults);
    useEffect(() => {
        onResultsRef.current = onResults;
    }, [onResults]);
    const onInitialLoadRef = useRef(onInitialLoad);
    useEffect(() => {
        onInitialLoadRef.current = onInitialLoad;
    }, [onInitialLoad]);

    // Listeners for direct event subscription
    const faceDataListenersRef = useRef<
        Map<string, (data: FaceData) => void>
    >(new Map());
    const errorListenersRef = useRef<Map<string, (error: string) => void>>(
        new Map()
    );
    const startListenersRef = useRef<Map<string, () => void>>(new Map());
    const stopListenersRef = useRef<Map<string, () => void>>(new Map());

    const processResults = useCallback((
        landmarkResults: FaceLandmarkerResult
    ) => {
        const detectedFaces: DetectedFace[] = [];

        if (landmarkResults.faceLandmarks && landmarkResults.faceLandmarks.length > 0) {
            landmarkResults.faceLandmarks.forEach((landmarks: FaceLandmark[], index: number) => {
                const face: DetectedFace = {
                    landmarks: landmarks,
                };
                
                // Add blendshapes if available and requested
                if (outputFaceBlendshapes && landmarkResults.faceBlendshapes && landmarkResults.faceBlendshapes[index]) {
                    face.blendshapes = landmarkResults.faceBlendshapes[index].categories;
                }
                
                // Add transformation matrix if available and requested
                if (outputTransformationMatrix && landmarkResults.facialTransformationMatrixes && landmarkResults.facialTransformationMatrixes[index]) {
                    // Convert Matrix to number array - MediaPipe Matrix has data property
                    const matrix = landmarkResults.facialTransformationMatrixes[index];
                    face.transformationMatrix = matrix.data ? Array.from(matrix.data) : [];
                }
                
                // Calculate bounding box from landmarks
                if (landmarks.length > 0) {
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    landmarks.forEach(landmark => {
                        minX = Math.min(minX, landmark.x);
                        minY = Math.min(minY, landmark.y);
                        maxX = Math.max(maxX, landmark.x);
                        maxY = Math.max(maxY, landmark.y);
                    });
                    face.boundingBox = {
                        xMin: minX,
                        yMin: minY,
                        width: maxX - minX,
                        height: maxY - minY
                    };
                }
                
                detectedFaces.push(face);
            });
        }

        const faceData: FaceData = {
            detectedFaces,
            imageDimensions: {
                width: videoElementRef.current?.videoWidth || 0,
                height: videoElementRef.current?.videoHeight || 0,
            },
        };

        setFaceData(faceData);
        onFaceDataRef.current?.(faceData);
        faceDataListenersRef.current.forEach(
            (listener: (data: FaceData) => void, _key: string) =>
                listener(faceData)
        );

        if (onResultsRef.current) {
            try {
                onResultsRef.current(detectedFaces, videoElementRef.current || undefined);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                setCurrentError(errorMessage);
                if (onErrorRef.current) onErrorRef.current(errorMessage);
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) =>
                        listener(errorMessage)
                );
            }
        }

        if (!initialLoadCompleteRef.current && detectedFaces.length > 0) {
            initialLoadCompleteRef.current = true;
            if (onInitialLoadRef.current) onInitialLoadRef.current();
        }
    }, [
        setFaceData,
        setCurrentError,
        onFaceDataRef,
        onResultsRef,
        onInitialLoadRef,
        onErrorRef,
        faceDataListenersRef,
        errorListenersRef,
        initialLoadCompleteRef,
        videoElementRef,
        outputFaceBlendshapes,
        outputTransformationMatrix,
    ]);

    useEffect(() => {
        const initializeModels = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                // Initialize face landmarker
                const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU",
                    },
                    runningMode: runningMode,
                    numFaces: options.maxNumFaces || 1,
                    minFaceDetectionConfidence: options.minDetectionConfidence || 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: options.minTrackingConfidence || 0.5,
                    outputFaceBlendshapes: outputFaceBlendshapes,
                    outputFacialTransformationMatrixes: outputTransformationMatrix,
                });

                faceLandmarkerRef.current = faceLandmarker;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setCurrentError(errorMessage);
                if (onErrorRef.current) onErrorRef.current(errorMessage);
            }
        };

        initializeModels();

        return () => {
            // Cleanup will be handled when models support close() method
            faceLandmarkerRef.current = null;
        };
    }, [options, runningMode, outputFaceBlendshapes, outputTransformationMatrix, onErrorRef]);

    const sendFrame = useCallback(async () => {
        if (!videoElementRef.current || !faceLandmarkerRef.current) {
            return;
        }

        if (
            videoElementRef.current.paused ||
            videoElementRef.current.ended ||
            videoElementRef.current.readyState < HTMLMediaElement.HAVE_METADATA
        ) {
            if (isTrackingRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(sendFrame);
            }
            return;
        }

        const timestamp = performance.now();

        try {
            // Get face landmarks
            const landmarkResults = faceLandmarkerRef.current.detectForVideo(
                videoElementRef.current,
                timestamp
            );

            // Process results
            processResults(landmarkResults);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            setCurrentError(errorMessage);
            if (onErrorRef.current) onErrorRef.current(errorMessage);
            errorListenersRef.current.forEach(
                (listener: (error: string) => void, _key: string) =>
                    listener(errorMessage)
            );
        }

        if (isTrackingRef.current) {
            animationFrameIdRef.current = requestAnimationFrame(sendFrame);
        }
    }, [
        faceLandmarkerRef,
        videoElementRef,
        setCurrentError,
        onErrorRef,
        errorListenersRef,
        processResults,
    ]);

    const startTracking = useCallback(
        async (videoElement: HTMLVideoElement) => {
            if (!faceLandmarkerRef.current) {
                setCurrentError("FaceLandmarker not initialized.");
                if (onErrorRef.current)
                    onErrorRef.current("FaceLandmarker not initialized.");
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) =>
                        listener("FaceLandmarker not initialized.")
                );
                return;
            }
            if (isTrackingRef.current) return;

            videoElementRef.current = videoElement;
            initialLoadCompleteRef.current = false; // Reset for new tracking session

            isTrackingRef.current = true;
            setIsTracking(true);

            if (animationFrameIdRef.current)
                cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = requestAnimationFrame(sendFrame);

            if (onTrackingStartedRef.current) onTrackingStartedRef.current();
            startListenersRef.current.forEach(
                (listener: () => void, _key: string) => listener()
            );
            setCurrentError(null);
        },
        [
            sendFrame,
            onTrackingStartedRef,
            startListenersRef,
            onErrorRef,
            errorListenersRef,
            setCurrentError,
        ]
    );

    const stopTracking = useCallback(() => {
        if (!isTrackingRef.current && !isTracking) return;

        isTrackingRef.current = false;
        setIsTracking(false);

        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }

        if (onTrackingStoppedRef.current) onTrackingStoppedRef.current();
        stopListenersRef.current.forEach((listener: () => void, _key: string) =>
            listener()
        );
    }, [isTracking, onTrackingStoppedRef, stopListenersRef]);

    return {
        isTracking,
        faceData: currentFaceData,
        error: currentError,
        startTracking,
        stopTracking,
        getFaceLandmarker: () => faceLandmarkerRef.current,
        getFaceDetector: () => null, // Not implemented in this version
        addFaceDataListener: (listener: (data: FaceData) => void) => {
            const id = Date.now().toString() + Math.random().toString();
            faceDataListenersRef.current.set(id, listener);
            return id;
        },
        removeFaceDataListener: (listenerId: string) => {
            faceDataListenersRef.current.delete(listenerId);
        },
        addErrorListener: (listener: (error: string) => void) => {
            const id = Date.now().toString() + Math.random().toString();
            errorListenersRef.current.set(id, listener);
            return id;
        },
        removeErrorListener: (listenerId: string) => {
            errorListenersRef.current.delete(listenerId);
        },
        addStartListener: (listener: () => void) => {
            const id = Date.now().toString() + Math.random().toString();
            startListenersRef.current.set(id, listener);
            return id;
        },
        removeStartListener: (listenerId: string) => {
            startListenersRef.current.delete(listenerId);
        },
        addStopListener: (listener: () => void) => {
            const id = Date.now().toString() + Math.random().toString();
            stopListenersRef.current.set(id, listener);
            return id;
        },
        removeStopListener: (listenerId: string) => {
            stopListenersRef.current.delete(listenerId);
        },
    };
}