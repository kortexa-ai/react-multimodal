import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import type {
    DetectedHand,
    HandLandmark,
    HandsData,
    MediaPipeHandsOptions,
    MediaPipeHandsResults,
    HandsTrackingDeviceProps,
    HandsTrackingControl,
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
    handsVersion = "0.4.1675469240",
    onInitialLoad,
    onHandsData,
    onError,
    onTrackingStarted,
    onTrackingStopped,
    onResults,
}: HandsTrackingDeviceProps = {}): HandsTrackingControl {
    const handsRef = useRef<Hands | null>(null);
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

    // Listeners for direct event subscription
    const handsDataListenersRef = useRef<
        Map<string, (data: HandsData) => void>
    >(new Map());
    const errorListenersRef = useRef<Map<string, (error: string) => void>>(
        new Map()
    );
    const startListenersRef = useRef<Map<string, () => void>>(new Map());
    const stopListenersRef = useRef<Map<string, () => void>>(new Map());

    const processResultsFromMediaPipe = useCallback(
        (results: MediaPipeHandsResults) => {
            const newDetectedHands: DetectedHand[] = [];
            if (results.multiHandLandmarks && results.multiHandedness) {
                results.multiHandLandmarks.forEach(
                    (landmarks: HandLandmark[], index: number) => {
                        const handednessEntry = results.multiHandedness[index];
                        if (landmarks && handednessEntry) {
                            newDetectedHands.push({
                                landmarks,
                                worldLandmarks:
                                    results.multiHandWorldLandmarks?.[index],
                                handedness: [handednessEntry],
                            });
                        }
                    }
                );
            }

            const newHandsData: HandsData = {
                detectedHands: newDetectedHands,
                imageDimensions: results.image
                    ? {
                          width: results.image.width,
                          height: results.image.height,
                      }
                    : undefined,
            };

            setHandsData(newHandsData);
            if (onHandsDataRef.current) onHandsDataRef.current(newHandsData);
            handsDataListenersRef.current.forEach(
                (listener: (data: HandsData) => void, _key: string) =>
                    listener(newHandsData)
            );

            if (onResultsRef.current) {
                try {
                    onResultsRef.current(newDetectedHands, results.image);
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

            if (
                !initialLoadCompleteRef.current &&
                newDetectedHands.length > 0
            ) {
                initialLoadCompleteRef.current = true;
                if (onInitialLoadRef.current) onInitialLoadRef.current();
            }
        },
        [
            setHandsData,
            setCurrentError,
            onHandsDataRef,
            onResultsRef,
            onInitialLoadRef,
            onErrorRef,
            handsDataListenersRef,
            initialLoadCompleteRef,
        ]
    );

    useEffect(() => {
        const handsInstance = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${handsVersion}/${file}`,
        });

        handsInstance.setOptions(options);
        handsInstance.onResults(processResultsFromMediaPipe);

        handsRef.current = handsInstance;

        return () => {
            if (handsRef.current) {
                handsRef.current.close().catch((err) => {
                    setCurrentError(
                        err instanceof Error ? err.message : String(err)
                    );
                });
                handsRef.current = null;
            }
        };
    }, [options, handsVersion, processResultsFromMediaPipe]);

    const sendFrame = useCallback(async () => {
        if (!videoElementRef.current || !handsRef.current) {
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

        try {
            await handsRef.current.send({ image: videoElementRef.current });
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
        handsRef,
        videoElementRef,
        setCurrentError,
        onErrorRef,
        errorListenersRef,
    ]);

    const startTracking = useCallback(
        async (videoElement: HTMLVideoElement) => {
            if (!handsRef.current) {
                setCurrentError("Hands instance not initialized.");
                if (onErrorRef.current)
                    onErrorRef.current("Hands instance not initialized.");
                errorListenersRef.current.forEach(
                    (listener: (error: string) => void, _key: string) =>
                        listener("Hands instance not initialized.")
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
        getHandsInstance: () => handsRef.current,
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
