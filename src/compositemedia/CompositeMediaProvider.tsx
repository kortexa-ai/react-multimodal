/*
MEDIA PROVIDER ORCHESTRATION RULES:

1.  **Provider Scope:**
    *   The MediaProvider is designed to be instantiated outside the React tree of components that consume camera and hands tracking data. This allows it to manage media state independently of the consuming components' lifecycles.

2.  **Hands Tracking Dependencies & Initialization:**
    *   Hands tracking requires an HTMLVideoElement as its input.
    *   This HTMLVideoElement is provided by the CameraView component, which triggers a callback upon the element's creation.
    *   The CameraView also receives the camera media stream and uses Three.js for visualization.
    *   Hands tracking data (landmarks) is passed to CameraView for overlay rendering.

3.  **Independent Control & Dependencies (Camera & Hands):**
    *   Camera and Hands tracking are intended to be controllable independently, with a key dependency: Hands tracking relies on the Camera's video stream.
    *   **Camera Stop:** If the Camera provider is stopped while Hands tracking is active, Hands tracking must also be stopped. Once the camera is stopped, Hands tracking cannot be initiated.
    *   **Camera Start:** When the Camera provider is started, Hands tracking defaults to a stopped state but can be subsequently started by the user.
    *   **Hands Start/Stop (while Camera is running):** While the Camera is active, Hands tracking can be started and stopped multiple times. These actions should not disrupt the CameraView's visualization (e.g., cause state refreshes or redraws in the camera feed).

4.  **Global MediaProvider Controls (e.g., `startAll`, `stopAll` - actual names TBD):**
    *   **Global Start:** When the global start action is triggered:
        *   All configured media sources that are not currently active should be started.
        *   If both Camera and Hands tracking need to be started, the Camera must be started *before* Hands tracking to ensure the HTMLVideoElement dependency for Hands is met.
    *   **Global Stop:** When the global stop action is triggered, all currently active media sources should be stopped.
*/

import { useState, useCallback, useMemo, useEffect, useRef, type PropsWithChildren } from 'react';

import { MicrophoneProvider } from '../microphone/MicrophoneProvider';
import { useMicrophone } from '../microphone/hooks/useMicrophone';

import { CameraProvider } from '../camera/CameraProvider';
import { useCamera } from '../camera/hooks/useCamera';

import { HandsProvider } from '../hands/HandsProvider';
import { useHandsTracking } from '../hands/hooks/useHandsTracking';

import type { CompositeMediaProviderProps, CompositeMediaControl } from './types';
import { CompositeMediaContext } from './context';

const DEFAULT_START_BEHAVIOR: 'proceed' | 'halt' = 'proceed';

interface InternalMediaOrchestratorProps {
    startBehavior: 'proceed' | 'halt';
}

function InternalMediaOrchestrator({
    children,
    startBehavior,
}: PropsWithChildren<InternalMediaOrchestratorProps>) {
    const mic = useMicrophone();
    const cam = useCamera();
    const hands = useHandsTracking();

    const videoElementForHandsInternalRef = useRef<HTMLVideoElement | null>(null);
    // Flag to track if we've already tried to start hands in the current "camera on" cycle.
    // This helps prevent repeated attempts if the video element becomes available later or conditions change.
    const [attemptedHandsStartInCycle, setAttemptedHandsStartInCycle] = useState(false);
    // Flag to track if the user has explicitly stopped hands, to prevent auto-restart by useEffect.
    const [userExplicitlyStoppedHands, setUserExplicitlyStoppedHands] = useState(false);

    const [mediaOrchestrationError, setMediaOrchestrationError] = useState<string | undefined>(undefined);
    const [isStarting, setIsStarting] = useState(false); // True if startMedia is in progress
    const [currentAudioError, setCurrentAudioError] = useState<string | undefined>(undefined);
    const [currentVideoError, setCurrentVideoError] = useState<string | undefined>(undefined);
    const [currentHandsError, setCurrentHandsError] = useState<string | undefined>(undefined);
    // True if startHands or startHandsAsyncInternal is in progress for explicit hands start requests.
    const [isStartingHandsInternal, setIsStartingHandsInternal] = useState(false);
    const [isVideoElementForHandsSet, setIsVideoElementForHandsSet] = useState(false);

    // Effect to listen for microphone errors
    useEffect(() => {
        const errorListenerId = mic.addErrorListener((err) => {
            setCurrentAudioError(err);
        });
        return () => {
            mic.removeErrorListener(errorListenerId);
        };
    }, [mic]);

    // Effect to listen for camera errors
    useEffect(() => {
        const errorListenerId = cam.addErrorListener((err) => {
            setCurrentVideoError(err);
        });
        return () => {
            cam.removeErrorListener(errorListenerId);
        };
    }, [cam]);

    // Effect to listen for hands errors
    useEffect(() => {
        if (hands) {
            const errorListenerId = hands.addErrorListener((err) => {
                setCurrentHandsError(err);
                // If an error occurs, it implies hands are not starting or have stopped.
                setIsStartingHandsInternal(false);
            });
            return () => {
                hands.removeErrorListener(errorListenerId);
            };
        }
        return () => { }; // No-op if hands is null
    }, [hands]);

    const isAudioActive = useMemo(() => mic.isRecording, [mic]);
    const isVideoActive = useMemo(() => cam.isRecording, [cam]);
    // Use hands.isTracking directly from the hook for the most up-to-date status.
    const isHandTrackingActive = useMemo(() => hands?.isTracking ?? false, [hands]);
    const isMediaActive = useMemo(() => isAudioActive && isVideoActive, [isAudioActive, isVideoActive]);

    // These are derived states, not primary input sources for the context, so can be null or actual streams.
    const audioStream = useMemo(() => undefined, []); // MicrophoneProvider doesn't expose raw stream this way currently
    const videoStream = useMemo(() => cam.stream ?? undefined, [cam]);
    const videoFacingMode = useMemo(() => cam.facingMode, [cam]);
    const currentHandsData = useMemo(() => hands?.handsData ?? undefined, [hands]);

    const setVideoElementForHands = useCallback((element: HTMLVideoElement | null) => {
        videoElementForHandsInternalRef.current = element;
        if (!element) {
            // If video element is removed (e.g., CameraView unmounts or stream stops),
            // reset the flag so that if it's added again, we can attempt to start hands.
            setAttemptedHandsStartInCycle(false);
            setIsVideoElementForHandsSet(false);
        } else {
            setIsVideoElementForHandsSet(true);
        }
        // No automatic hands start here; that's handled by useEffect or startHands/startMedia.
    }, []);

    /**
     * Internal function to start hand tracking. This is the core logic for initiating MediaPipe Hands.
     * It checks pre-conditions and handles the asynchronous nature of MediaPipe initialization.
     */
    const startHandsAsyncInternal = useCallback(async () => {
        if (!hands || !videoElementForHandsInternalRef.current || !cam?.isRecording || !cam?.stream) {
            const errorMsg = "Pre-conditions not met for starting hand tracking (hands, videoElement, camera state).";
            setCurrentHandsError(errorMsg);
            setAttemptedHandsStartInCycle(true); // Mark as attempted even if pre-conditions fail, to avoid rapid retries by useEffect.
            return Promise.reject(new Error(errorMsg));
        }
        if (hands.isTracking) {
            return Promise.resolve();
        }

        const videoEl = videoElementForHandsInternalRef.current;
        setAttemptedHandsStartInCycle(true);
        setCurrentHandsError(undefined); // Clear previous hands error

        try {
            if (videoEl.readyState < HTMLMediaElement.HAVE_METADATA) {
                await new Promise<void>((resolve, reject) => {
                    const onLoadedMetadata = () => {
                        videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                        videoEl.removeEventListener('error', onError);
                        resolve();
                    };
                    const onError = (_e: Event | string) => {
                        videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                        videoEl.removeEventListener('error', onError);
                        reject(new Error('Video element error during metadata load for hand tracking.'));
                    };
                    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
                    videoEl.addEventListener('error', onError);
                });
            }
            await hands.startTracking(videoEl); // This should set hands.isTracking to true via its own internal logic and event listeners.
            // No need to setIsStartingHandsInternal(false) here, as this function is a utility.
            // The caller (startHands or startMedia via useEffect) manages that state.
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setCurrentHandsError(errorMsg);
            throw err;
        }
    }, [hands, cam, setCurrentHandsError, setAttemptedHandsStartInCycle]);

    /**
     * Orchestrates the start of all media: microphone, camera, and potentially hands.
     * Respects the 'startBehavior' prop (halt on error or proceed).
     */
    const startMedia = useCallback(async () => {
        if (isStarting) {
            return;
        }

        setIsStarting(true);
        setMediaOrchestrationError(undefined);
        setAttemptedHandsStartInCycle(false); // Reset for this new media start cycle
        setUserExplicitlyStoppedHands(false); // Reset for this new media start cycle
        setCurrentAudioError(undefined);
        setCurrentVideoError(undefined);
        setCurrentHandsError(undefined); // Clear all errors at the beginning of a full startMedia sequence

        let localMicAttemptOk = isAudioActive;
        let localCamAttemptOk = isVideoActive;

        if (mic && !isAudioActive) {
            try {
                await mic.start();
                localMicAttemptOk = true;
            } catch {
                localMicAttemptOk = false;
                // Error state (currentAudioError) should be set by the mic's error listener
            }
        }

        if (cam && !isVideoActive) {
            try {
                await cam.start();
                localCamAttemptOk = true;
            } catch {
                localCamAttemptOk = false;
                // Error state (currentVideoError) should be set by the cam's error listener
            }
        }

        if (startBehavior === 'halt') {
            const shouldHalt = !localMicAttemptOk || !localCamAttemptOk;
            if (shouldHalt) {
                const micErrMsg = currentAudioError || (localMicAttemptOk ? '' : 'Failed to start');
                const camErrMsg = currentVideoError || (localCamAttemptOk ? '' : 'Failed to start');
                const errorMsg = `Media start halted: Mic ${localMicAttemptOk ? 'OK' : `FAIL (${micErrMsg})`}. Cam ${localCamAttemptOk ? 'OK' : `FAIL (${camErrMsg})`}.`;
                setMediaOrchestrationError(errorMsg);
                if (localMicAttemptOk && mic) mic.stop(); // Rollback successful mic start
                if (localCamAttemptOk && cam) cam.stop(); // Rollback successful cam start
                setIsStarting(false);
                return;
            }
        } else { // 'proceed' behavior
            const errorParts: string[] = [];
            if (!localMicAttemptOk) errorParts.push(`Mic: ${currentAudioError || 'Unknown'}`);
            if (!localCamAttemptOk) errorParts.push(`Cam: ${currentVideoError || 'Unknown'}`);
            if (errorParts.length > 0) {
                const errorMsg = `Failed to start: ${errorParts.join('; ')}. Others proceeded if successful.`;
                setMediaOrchestrationError(errorMsg);
            }
        }

        // If camera started (or was already on) and other conditions are met, try starting hands.
        // This part is crucial. It relies on attemptedHandsStartInCycle being false initially for this startMedia call.
        if (localCamAttemptOk && cam?.isRecording && cam.stream && hands && !hands.isTracking && videoElementForHandsInternalRef.current && !attemptedHandsStartInCycle) {
            try {
                await startHandsAsyncInternal();
            } catch {
                if (startBehavior === 'halt') {
                    // If hands fail and behavior is 'halt', this implies a severe issue or desire to stop all media.
                    // However, mic and cam might already be running. The definition of 'halt' for hands is tricky here.
                    // For now, we just log and the error is set. The user might expect media to stop if hands are critical.
                    // This part might need refinement based on desired UX for 'halt' with hands.
                    setMediaOrchestrationError(`Failed to start hand tracking. Halting media start. Error: ${currentHandsError || 'Unknown hands error'}`);
                }
            }
        }

        setIsStarting(false);
    }, [
        mic, cam, hands, startBehavior, isAudioActive, isVideoActive, isStarting,
        videoElementForHandsInternalRef, attemptedHandsStartInCycle, startHandsAsyncInternal,
        currentAudioError, currentVideoError, currentHandsError,
        setCurrentAudioError, setCurrentVideoError, setCurrentHandsError, setMediaOrchestrationError, setIsStarting, setAttemptedHandsStartInCycle, setUserExplicitlyStoppedHands // Added setters for completeness though some might be stable
    ]);

    /**
     * This effect is key for starting hands when all dependencies are ready, e.g., after startMedia successfully starts the camera.
     * It also respects if the user has explicitly stopped hands.
     */
    useEffect(() => {
        if (cam?.isRecording && cam.stream && hands && !hands.isTracking && videoElementForHandsInternalRef.current && !attemptedHandsStartInCycle && !userExplicitlyStoppedHands) {
            startHandsAsyncInternal().catch(() => {
                // Error is handled within startHandsAsyncInternal by setting currentHandsError.
                // attemptedHandsStartInCycle is set to true by startHandsAsyncInternal regardless of outcome.
            });
        }
    }, [cam?.isRecording, cam?.stream, hands, videoElementForHandsInternalRef, attemptedHandsStartInCycle, userExplicitlyStoppedHands, startHandsAsyncInternal]); // Ensure all dependencies are listed

    useEffect(() => {
        if (!cam?.isRecording) {
            // If camera turns off, any "attempt" in the current "cycle" related to hands auto-start is void.
            // This ensures that if the camera turns back on, a new attempt to start hands can be made.
            // startMedia() also resets this, but this handles cases where startMedia() might not be the immediate trigger
            // or for general state cleanliness regarding this flag.
            setAttemptedHandsStartInCycle(false);
        }
    }, [cam?.isRecording, setAttemptedHandsStartInCycle]);

    /**
     * Stops hand tracking. This is a direct command to stop hands.
     */
    const stopHands = useCallback(async () => {
        if (hands && hands.isTracking) {
            try {
                await hands.stopTracking();
                setUserExplicitlyStoppedHands(true); // Mark that user explicitly stopped hands
                // isTracking state should be updated by useHandsControl via its own internal logic and event listeners.
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setCurrentHandsError(errorMsg);
            }
        }
        // Reset flag because hands are now intentionally stopped. If camera is still on,
        // and user tries to start hands again (or if an auto-start condition re-evaluates),
        // we want it to be a fresh attempt.
        setAttemptedHandsStartInCycle(false);
        setIsStartingHandsInternal(false); // Ensure this is reset if stop is called during a start attempt.
    }, [hands, setCurrentHandsError, setAttemptedHandsStartInCycle]);

    /**
     * Effect to automatically stop hand tracking if the camera is turned off.
     */
    useEffect(() => {
        if (cam && !cam.isRecording) {
            if (hands?.isTracking) {
                stopHands();
            }
            // When camera turns off, reset the flag, so if it turns on again, hands can try to start.
            setAttemptedHandsStartInCycle(false);
        }
    }, [cam, cam?.isRecording, hands, stopHands]); // cam.isOn is the primary trigger here

    /**
     * Stops all media: microphone, camera, and implicitly hands (due to camera stopping).
     */
    const stopMedia = useCallback(() => {
        if (mic?.isRecording) {
            mic.stop();
        }
        if (cam?.isRecording) {
            cam.stop();
        }
        setMediaOrchestrationError(undefined);
        setCurrentAudioError(undefined);
        setCurrentVideoError(undefined);
        setCurrentHandsError(undefined);
        setIsStarting(false); // Ensure isStarting is false if stopMedia is called during a start sequence.
    }, [mic, cam, setMediaOrchestrationError, setCurrentAudioError, setCurrentVideoError, setCurrentHandsError, setIsStarting]);

    /**
     * Toggles all media on or off.
     */
    const toggleMedia = useCallback(async () => {
        if (isAudioActive && isVideoActive) {
            stopMedia();
        } else {
            await startMedia();
        }
    }, [isAudioActive, isVideoActive, startMedia, stopMedia]);

    /**
     * Explicitly starts hand tracking. This is typically called by a user action.
     * Manages the 'isStartingHandsInternal' state.
     */
    const startHands = useCallback(async () => {
        if (isStartingHandsInternal || hands?.isTracking) {
            return;
        }

        setUserExplicitlyStoppedHands(false); // User is explicitly starting, so clear the flag.
        setIsStartingHandsInternal(true);
        setCurrentHandsError(undefined);

        if (!hands) {
            const errorMsg = "Hand tracking service not available.";
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            return;
        }
        if (!cam?.isRecording) {
            const errorMsg = "Camera is not active. Cannot start hand tracking.";
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            return;
        }
        if (!videoElementForHandsInternalRef.current) {
            const errorMsg = "Video element not set for hand tracking.";
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            setIsVideoElementForHandsSet(false);
            return;
        }

        try {
            await startHandsAsyncInternal();
            // isTracking state will be updated by useHandsControl. Successful call here means it *should* start.
        } catch {
            // Error is set by startHandsAsyncInternal
        } finally {
            setIsStartingHandsInternal(false);
        }
    }, [hands, cam?.isRecording, videoElementForHandsInternalRef, isStartingHandsInternal, startHandsAsyncInternal, setIsStartingHandsInternal, setCurrentHandsError]);

    // Context value provided to children
    const contextValue = useMemo<CompositeMediaControl>(() => {
        return {
            isAudioActive,
            isVideoActive,
            isHandTrackingActive,
            isMediaActive,
            audioStream,
            videoStream,
            videoFacingMode,
            currentHandsData,
            audioError: currentAudioError,
            videoError: currentVideoError,
            handsError: currentHandsError,
            mediaError: mediaOrchestrationError,
            startMedia,
            stopMedia,
            toggleMedia,
            cam,
            mic,
            hands,
            setVideoElementForHands,
            startHands,
            stopHands,
            isStartingMedia: isStarting,
            isStartingHands: isStartingHandsInternal,
            isVideoElementForHandsSet,
        }
    }, [
        isAudioActive, isVideoActive, isHandTrackingActive, isMediaActive,
        audioStream, videoStream, videoFacingMode, currentHandsData,
        currentAudioError, currentVideoError, currentHandsError, mediaOrchestrationError,
        startMedia, stopMedia, toggleMedia,
        cam, mic, hands, setVideoElementForHands,
        startHands, stopHands, isStarting, isStartingHandsInternal, isVideoElementForHandsSet
    ]);

    return (
        <CompositeMediaContext.Provider value={contextValue}>
            {children}
        </CompositeMediaContext.Provider>
    );
}

export function CompositeMediaProvider({
    children,
    microphoneProps,
    cameraProps,
    handsProps,
    startBehavior = DEFAULT_START_BEHAVIOR,
}: PropsWithChildren<CompositeMediaProviderProps>) {
    return (
        <MicrophoneProvider {...microphoneProps}>
            <CameraProvider {...cameraProps}>
                <HandsProvider {...handsProps}>
                    <InternalMediaOrchestrator
                        startBehavior={startBehavior}
                    >
                        {children}
                    </InternalMediaOrchestrator>
                </HandsProvider>
            </CameraProvider>
        </MicrophoneProvider>
    );
}
