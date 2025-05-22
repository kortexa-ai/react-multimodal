import { useState, useEffect, useCallback, useRef } from 'react';
import { Hands } from '@mediapipe/hands'; // Assuming @mediapipe/hands is installed
import type {
    HandsControl,
    HandsData,
    MediaPipeHandsOptions,
    MediaPipeHandsResults,
    UseHandsProps,
    DetectedHand,
    Handedness,
    HandLandmark
} from '../types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_MEDIAPIPE_HANDS_OPTIONS: MediaPipeHandsOptions = {
    // selfieMode: true, // Important if the video feed is flipped (e.g., webcam)
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    locateFile: (file: string) => {
        // Adjust this path based on how you serve MediaPipe assets
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    },
};

export function useHandsControl(props?: UseHandsProps): HandsControl {
    const { options, onHandsData, onError, onTrackingStarted, onTrackingStopped } = props || {};

    const handsRef = useRef<Hands | null>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [handsData, setHandsData] = useState<HandsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handsDataListenersRef = useRef<Map<string, (data: HandsData) => void>>(new Map());
    const errorListenersRef = useRef<Map<string, (error: string) => void>>(new Map());
    const startListenersRef = useRef<Map<string, () => void>>(new Map());
    const stopListenersRef = useRef<Map<string, () => void>>(new Map());

    const processResults = useCallback((results: MediaPipeHandsResults) => {
        const newDetectedHands: DetectedHand[] = [];
        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const worldLandmarks = results.multiHandWorldLandmarks?.[i];
                const handedness = results.multiHandedness[i]; // This is an array in MP, but usually one entry
                
                if (landmarks && handedness) {
                    newDetectedHands.push({
                        landmarks: landmarks as HandLandmark[], // Assuming direct compatibility or map if needed
                        worldLandmarks: worldLandmarks as HandLandmark[] | undefined,
                        handedness: [handedness] as Handedness[] // Ensure it's an array
                    });
                }
            }
        }
        const newHandsData: HandsData = {
            detectedHands: newDetectedHands,
            imageDimensions: results.image ? { width: results.image.width, height: results.image.height } : undefined,
        };
        setHandsData(newHandsData);
        handsDataListenersRef.current.forEach(listener => listener(newHandsData));
        if (onHandsData) onHandsData(newHandsData);
    }, [onHandsData]);

    useEffect(() => {
        const handsInstance = new Hands({
            locateFile: options?.locateFile || DEFAULT_MEDIAPIPE_HANDS_OPTIONS.locateFile,
        });

        const currentOptions = { ...DEFAULT_MEDIAPIPE_HANDS_OPTIONS, ...options };
        handsInstance.setOptions(currentOptions);
        handsInstance.onResults(processResults);
        handsRef.current = handsInstance;

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            handsInstance.close().catch(console.error);
            handsRef.current = null;
        };
    }, [options, processResults]);

    const sendFrame = useCallback(async () => {
        if (!videoElementRef.current || !handsRef.current || videoElementRef.current.paused || videoElementRef.current.ended) {
            if (isTracking) {
                animationFrameIdRef.current = requestAnimationFrame(sendFrame);
            }
            return;
        }
        try {
            if (videoElementRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                 await handsRef.current.send({ image: videoElementRef.current });
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e) || 'Failed to send frame to MediaPipe Hands';
            setError(errorMessage);
            errorListenersRef.current.forEach(listener => listener(errorMessage));
            if (onError) onError(errorMessage);
            // Optionally stop tracking on error, or let user decide
        }
        if (isTracking) { // Check isTracking again, as it might have been stopped
            animationFrameIdRef.current = requestAnimationFrame(sendFrame);
        }
    }, [isTracking, onError]);

    const startTracking = useCallback(async (videoElement: HTMLVideoElement) => {
        if (!handsRef.current) {
            const msg = 'MediaPipe Hands not initialized.';
            setError(msg);
            errorListenersRef.current.forEach(listener => listener(msg));
            if (onError) onError(msg);
            return Promise.reject(msg);
        }
        if (isTracking) return Promise.resolve();

        videoElementRef.current = videoElement;
        setError(null); // Clear previous errors

        try {
            // Ensure video is playing and ready
            if (videoElement.paused) {
                await videoElement.play().catch(e_play => {
                    throw new Error(`Video play failed: ${e_play instanceof Error ? e_play.message : String(e_play)}`);
                });
            }
            setIsTracking(true);
            animationFrameIdRef.current = requestAnimationFrame(sendFrame); // Start the loop
            startListenersRef.current.forEach(listener => listener());
            if (onTrackingStarted) onTrackingStarted();
            return Promise.resolve();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e) || 'Failed to start hand tracking.';
            setError(msg);
            errorListenersRef.current.forEach(listener => listener(msg));
            if (onError) onError(msg);
            setIsTracking(false);
            return Promise.reject(msg);
        }
    }, [isTracking, sendFrame, onError, onTrackingStarted]);

    const stopTracking = useCallback(() => {
        if (!isTracking) return;
        setIsTracking(false);
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        videoElementRef.current = null; // Clear video element ref
        // handsRef.current?.reset(); // MediaPipe Hands doesn't have a reset, close is handled in useEffect cleanup
        setHandsData(null); // Clear previous data
        stopListenersRef.current.forEach(listener => listener());
        if (onTrackingStopped) onTrackingStopped();
    }, [isTracking, onTrackingStopped]);

    const addListener = useCallback(<T>(listenersRef: React.MutableRefObject<Map<string, T>>, listener: T): string => {
        const id = uuidv4();
        listenersRef.current.set(id, listener);
        return id;
    }, []);

    const removeListener = useCallback(<T>(listenersRef: React.MutableRefObject<Map<string, T>>, id: string) => {
        listenersRef.current.delete(id);
    }, []);

    return {
        isTracking,
        handsData,
        error,
        startTracking,
        stopTracking,
        getHandsInstance: () => handsRef.current,
        addHandsDataListener: (listener) => addListener(handsDataListenersRef, listener),
        removeHandsDataListener: (id) => removeListener(handsDataListenersRef, id),
        addErrorListener: (listener) => addListener(errorListenersRef, listener),
        removeErrorListener: (id) => removeListener(errorListenersRef, id),
        addStartListener: (listener) => addListener(startListenersRef, listener),
        removeStartListener: (id) => removeListener(startListenersRef, id),
        addStopListener: (listener) => addListener(stopListenersRef, listener),
        removeStopListener: (id) => removeListener(stopListenersRef, id),
    };
}
