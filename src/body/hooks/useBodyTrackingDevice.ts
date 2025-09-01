import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type {
    DetectedBody,
    BodyLandmark,
    BodyData,
    MediaPipeBodyOptions,
    BodyProviderProps,
    BodyTrackingControl,
    PoseLandmarkerResult,
} from "../types";

// Default MediaPipe Body options
const defaultBodyOptions: MediaPipeBodyOptions = {
    staticImageMode: false,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true, // Flip for selfie view
};

export function useBodyTrackingDevice({
    options: userOptions,
    onInitialLoad,
    onBodyData,
    onError,
    onTrackingStarted,
    onTrackingStopped,
    onResults,
    enableSegmentation = false,
    outputSegmentationMasks = false,
}: BodyProviderProps = {}): BodyTrackingControl {
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const isTrackingRef = useRef(false);
    const initialLoadCompleteRef = useRef(false);

    const [isTracking, setIsTracking] = useState(false);
    const [currentBodyData, setBodyData] = useState<BodyData | null>(null);
    const [currentError, setCurrentError] = useState<string | null>(null);

    const options = useMemo(
        () => ({ ...defaultBodyOptions, ...userOptions, enableSegmentation }),
        [userOptions, enableSegmentation]
    );

    // Refs for callbacks to avoid stale closures
    const onBodyDataRef = useRef(onBodyData);
    useEffect(() => {
        onBodyDataRef.current = onBodyData;
    }, [onBodyData]);
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
    const bodyDataListenersRef = useRef<
        Map<string, (data: BodyData) => void>
    >(new Map());
    const errorListenersRef = useRef<Map<string, (error: string) => void>>(
        new Map()
    );
    const startListenersRef = useRef<Map<string, () => void>>(new Map());
    const stopListenersRef = useRef<Map<string, () => void>>(new Map());

    const processResults = useCallback((
        landmarkResults: PoseLandmarkerResult
    ) => {
        const detectedBodies: DetectedBody[] = [];

        if (landmarkResults.landmarks && landmarkResults.landmarks.length > 0) {
            landmarkResults.landmarks.forEach((landmarks: BodyLandmark[], index: number) => {
                const body: DetectedBody = {
                    landmarks: landmarks,
                    worldLandmarks: landmarkResults.worldLandmarks?.[index] || [],
                };

                if (outputSegmentationMasks && landmarkResults.segmentationMasks) {
                    // Convert segmentation mask to ImageData if needed
                    // Note: Implementation depends on the actual format returned by MediaPipe
                    body.segmentationMasks = []; // Placeholder for segmentation mask conversion
                }

                detectedBodies.push(body);
            });
        }

        const bodyData: BodyData = {
            detectedBodies,
            imageDimensions: {
                width: videoElementRef.current?.videoWidth || 0,
                height: videoElementRef.current?.videoHeight || 0,
            },
        };

        setBodyData(bodyData);
        onBodyDataRef.current?.(bodyData);
        bodyDataListenersRef.current.forEach(
            (listener: (data: BodyData) => void, _key: string) => {
                listener(bodyData);
            }
        );

        if (onResultsRef.current) {
            try {
                onResultsRef.current(detectedBodies, videoElementRef.current || undefined);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                setCurrentError(errorMessage);
                if (onErrorRef.current) onErrorRef.current(errorMessage);
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) => {
                        listener(errorMessage);
                    }
                );
            }
        }

        if (!initialLoadCompleteRef.current && detectedBodies.length > 0) {
            initialLoadCompleteRef.current = true;
            if (onInitialLoadRef.current) onInitialLoadRef.current();
        }
    }, [
        setBodyData,
        setCurrentError,
        onBodyDataRef,
        onResultsRef,
        onInitialLoadRef,
        onErrorRef,
        bodyDataListenersRef,
        errorListenersRef,
        initialLoadCompleteRef,
        videoElementRef,
        outputSegmentationMasks,
    ]);

    useEffect(() => {
        const initializeModels = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                // Initialize pose landmarker
                const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1, // Single pose detection
                    minPoseDetectionConfidence: options.minDetectionConfidence || 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: options.minTrackingConfidence || 0.5,
                    outputSegmentationMasks: options.enableSegmentation || false,
                });

                poseLandmarkerRef.current = poseLandmarker;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setCurrentError(errorMessage);
                if (onErrorRef.current) onErrorRef.current(errorMessage);
            }
        };

        initializeModels();

        return () => {
            // Cleanup will be handled when models support close() method
            poseLandmarkerRef.current = null;
        };
    }, [options, onErrorRef]);

    const sendFrame = useCallback(async () => {
        if (!videoElementRef.current || !poseLandmarkerRef.current) {
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
            // Get pose landmarks
            const landmarkResults = poseLandmarkerRef.current.detectForVideo(
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
                (listener: (error: string) => void, _key: string) => {
                    listener(errorMessage);
                }
            );
        }

        if (isTrackingRef.current) {
            animationFrameIdRef.current = requestAnimationFrame(sendFrame);
        }
    }, [
        poseLandmarkerRef,
        videoElementRef,
        setCurrentError,
        onErrorRef,
        errorListenersRef,
        processResults,
    ]);

    const startTracking = useCallback(
        async (videoElement: HTMLVideoElement) => {
            if (!poseLandmarkerRef.current) {
                setCurrentError("PoseLandmarker not initialized.");
                if (onErrorRef.current)
                    onErrorRef.current("PoseLandmarker not initialized.");
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) => {
                        listener("PoseLandmarker not initialized.");
                    }
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
                (listener: () => void, _key: string) => {
                    listener();
                }
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
        stopListenersRef.current.forEach(
            (listener: () => void, _key: string) => {
                listener();
            }
        );
    }, [isTracking, onTrackingStoppedRef, stopListenersRef]);

    return {
        isTracking,
        bodyData: currentBodyData,
        error: currentError,
        startTracking,
        stopTracking,
        getPoseLandmarker: () => poseLandmarkerRef.current,
        addBodyDataListener: (listener: (data: BodyData) => void) => {
            const id = `kortexa-body-data-${uuidv4()}`;
            bodyDataListenersRef.current.set(id, listener);
            return id;
        },
        removeBodyDataListener: (listenerId: string) => {
            bodyDataListenersRef.current.delete(listenerId);
        },
        addErrorListener: (listener: (error: string) => void) => {
            const id = `kortexa-body-error-${uuidv4()}`;
            errorListenersRef.current.set(id, listener);
            return id;
        },
        removeErrorListener: (listenerId: string) => {
            errorListenersRef.current.delete(listenerId);
        },
        addStartListener: (listener: () => void) => {
            const id = `kortexa-body-start-${uuidv4()}`;
            startListenersRef.current.set(id, listener);
            return id;
        },
        removeStartListener: (listenerId: string) => {
            startListenersRef.current.delete(listenerId);
        },
        addStopListener: (listener: () => void) => {
            const id = `kortexa-body-stop-${uuidv4()}`;
            stopListenersRef.current.set(id, listener);
            return id;
        },
        removeStopListener: (listenerId: string) => {
            stopListenersRef.current.delete(listenerId);
        },
    };
}
