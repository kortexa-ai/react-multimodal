import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HandLandmarker, GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";
import type {
    DetectedHand,
    HandLandmark,
    HandsData,
    MediaPipeHandsOptions,
    HandsProviderProps,
    HandsTrackingControl,
    HandLandmarkerResult,
    GestureRecognitionResult,
} from "../types";

// Default MediaPipe Hands options
const defaultHandsOptions: MediaPipeHandsOptions = {
    staticImageMode: false,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true, // Flip handedness for selfie view
};

export function useHandsTrackingDevice({
    options: userOptions,
    onInitialLoad,
    onHandsData,
    onError,
    onTrackingStarted,
    onTrackingStopped,
    onResults,
    enableGestures = true,
    gestureOptions,
    gestureModelPath,
    onGestureResults,
}: HandsProviderProps = {}): HandsTrackingControl {
    const handLandmarkerRef = useRef<HandLandmarker | null>(null);
    const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const isTrackingRef = useRef(false);
    const initialLoadCompleteRef = useRef(false);

    const [isTracking, setIsTracking] = useState(false);
    const [currentHandsData, setHandsData] = useState<HandsData | null>(null);
    const [currentError, setCurrentError] = useState<string | null>(null);

    const options = useMemo(
        () => ({ ...defaultHandsOptions, ...userOptions }),
        [userOptions]
    );

    // Refs for callbacks to avoid stale closures
    const onHandsDataRef = useRef(onHandsData);
    useEffect(() => {
        onHandsDataRef.current = onHandsData;
    }, [onHandsData]);
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
    const onGestureResultsRef = useRef(onGestureResults);
    useEffect(() => {
        onGestureResultsRef.current = onGestureResults;
    }, [onGestureResults]);

    // Listeners for direct event subscription
    const handsDataListenersRef = useRef<
        Map<string, (data: HandsData) => void>
    >(new Map());
    const errorListenersRef = useRef<Map<string, (error: string) => void>>(
        new Map()
    );
    const startListenersRef = useRef<Map<string, () => void>>(new Map());
    const stopListenersRef = useRef<Map<string, () => void>>(new Map());


    const processResults = useCallback((
        landmarkResults: HandLandmarkerResult,
        gestureResults?: GestureRecognitionResult | undefined
    ) => {
        const detectedHands: DetectedHand[] = [];

        if (landmarkResults.landmarks) {
            landmarkResults.landmarks.forEach((landmarks: HandLandmark[], index: number) => {
                const hand: DetectedHand = {
                    landmarks: landmarks,
                    worldLandmarks: landmarkResults.worldLandmarks?.[index] || [],
                    handedness: landmarkResults.handedness[index][0], // Take first handedness
                    gestures: gestureResults?.gestures[index] || [], // Add gesture results
                };
                detectedHands.push(hand);
            });
        }

        const handsData: HandsData = {
            detectedHands,
            imageDimensions: {
                width: videoElementRef.current?.videoWidth || 0,
                height: videoElementRef.current?.videoHeight || 0,
            },
        };

        setHandsData(handsData);
        onHandsDataRef.current?.(handsData);
        handsDataListenersRef.current.forEach(
            (listener: (data: HandsData) => void, _key: string) =>
                listener(handsData)
        );

        // Trigger gesture-specific callbacks
        if (gestureResults && onGestureResultsRef.current) {
            detectedHands.forEach((hand, index) => {
                if (hand.gestures.length > 0) {
                    onGestureResultsRef.current!(hand.gestures, index);
                }
            });
        }

        if (onResultsRef.current) {
            try {
                onResultsRef.current(detectedHands, videoElementRef.current || undefined);
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

        if (!initialLoadCompleteRef.current && detectedHands.length > 0) {
            initialLoadCompleteRef.current = true;
            if (onInitialLoadRef.current) onInitialLoadRef.current();
        }
    }, [
        setHandsData,
        setCurrentError,
        onHandsDataRef,
        onResultsRef,
        onInitialLoadRef,
        onErrorRef,
        onGestureResultsRef,
        handsDataListenersRef,
        errorListenersRef,
        initialLoadCompleteRef,
        videoElementRef,
    ]);

    useEffect(() => {
        const initializeModels = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                // Initialize hand landmarker
                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: options.maxNumHands || 2,
                    minHandDetectionConfidence: options.minDetectionConfidence || 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: options.minTrackingConfidence || 0.5,
                });

                // Initialize gesture recognizer (if enabled)
                let gestureRecognizer = null;
                if (enableGestures) {
                    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: gestureModelPath || `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
                            delegate: "GPU",
                        },
                        runningMode: "VIDEO",
                        numHands: gestureOptions?.numHands || 2,
                        minHandDetectionConfidence: gestureOptions?.minHandDetectionConfidence || 0.5,
                        minHandPresenceConfidence: gestureOptions?.minHandPresenceConfidence || 0.5,
                        minTrackingConfidence: gestureOptions?.minTrackingConfidence || 0.5,
                    });
                }

                handLandmarkerRef.current = handLandmarker;
                gestureRecognizerRef.current = gestureRecognizer;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setCurrentError(errorMessage);
                if (onErrorRef.current) onErrorRef.current(errorMessage);
            }
        };

        initializeModels();

        return () => {
            // Cleanup will be handled when models support close() method
            handLandmarkerRef.current = null;
            gestureRecognizerRef.current = null;
        };
    }, [options, enableGestures, gestureOptions, gestureModelPath, onErrorRef]);

    const sendFrame = useCallback(async () => {
        if (!videoElementRef.current || !handLandmarkerRef.current) {
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
            // Get hand landmarks
            const landmarkResults = handLandmarkerRef.current.detectForVideo(
                videoElementRef.current,
                timestamp
            );

            // Get gesture recognition (if enabled)
            let gestureResults: GestureRecognitionResult | undefined;
            if (gestureRecognizerRef.current) {
                gestureResults = gestureRecognizerRef.current.recognizeForVideo(
                    videoElementRef.current,
                    timestamp
                );
            }

            // Process combined results
            processResults(landmarkResults, gestureResults);
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
        handLandmarkerRef,
        gestureRecognizerRef,
        videoElementRef,
        setCurrentError,
        onErrorRef,
        errorListenersRef,
        processResults,
    ]);

    const startTracking = useCallback(
        async (videoElement: HTMLVideoElement) => {
            if (!handLandmarkerRef.current) {
                setCurrentError("HandLandmarker not initialized.");
                if (onErrorRef.current)
                    onErrorRef.current("HandLandmarker not initialized.");
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) =>
                        listener("HandLandmarker not initialized.")
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
        handsData: currentHandsData,
        error: currentError,
        startTracking,
        stopTracking,
        getHandLandmarker: () => handLandmarkerRef.current,
        getGestureRecognizer: () => gestureRecognizerRef.current,
        addHandsDataListener: (listener: (data: HandsData) => void) => {
            const id = Date.now().toString() + Math.random().toString();
            handsDataListenersRef.current.set(id, listener);
            return id;
        },
        removeHandsDataListener: (listenerId: string) => {
            handsDataListenersRef.current.delete(listenerId);
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
