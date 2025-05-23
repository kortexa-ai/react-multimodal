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

import { useState, useCallback, useMemo, useEffect, type ReactNode, useRef } from 'react';

import { MicrophoneProvider } from '../microphone/MicrophoneProvider';
import { useMicrophoneControl } from '../microphone/hooks/useMicrophoneControl';

import { CameraProvider } from '../camera/CameraProvider';
import { useCameraControl } from '../camera/hooks/useCameraControl';

import { HandsProvider, useHands } from '../hands/HandsProvider';

import { MediaContext } from './mediaContext';
import type { MediaProviderProps, MediaContextType } from './mediaTypes';

const DEFAULT_START_BEHAVIOR: 'proceed' | 'halt' = 'proceed';

interface InternalMediaOrchestratorProps {
    children: ReactNode;
    startBehavior: 'proceed' | 'halt';
}

function InternalMediaOrchestrator({
    children,
    startBehavior,
}: InternalMediaOrchestratorProps) {
    const mic = useMicrophoneControl();
    const cam = useCameraControl();
    const hands = useHands();

    const videoElementForHandsInternalRef = useRef<HTMLVideoElement | null>(null);
    // Flag to track if we've already tried to start hands in the current "camera on" cycle.
    // This helps prevent repeated attempts if the video element becomes available later or conditions change.
    const [attemptedHandsStartInCycle, setAttemptedHandsStartInCycle] = useState(false);
    // Flag to track if the user has explicitly stopped hands, to prevent auto-restart by useEffect.
    const [userExplicitlyStoppedHands, setUserExplicitlyStoppedHands] = useState(false);

    const [mediaOrchestrationError, setMediaOrchestrationError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false); // True if startMedia is in progress
    const [currentAudioError, setCurrentAudioError] = useState<string | null | undefined>(null);
    const [currentVideoError, setCurrentVideoError] = useState<string | null | undefined>(null);
    const [currentHandsError, setCurrentHandsError] = useState<string | null | undefined>(null);
    // True if startHands or startHandsAsyncInternal is in progress for explicit hands start requests.
    const [isStartingHandsInternal, setIsStartingHandsInternal] = useState(false);

    // Effect to listen for microphone errors
    useEffect(() => {
        console.log('[MediaOrchestrator] Attaching mic error listener.');
        const errorListenerId = mic.addErrorListener((err) => {
            console.log('[MediaOrchestrator] Mic error received:', err);
            setCurrentAudioError(err);
        });
        return () => {
            console.log('[MediaOrchestrator] Removing mic error listener.');
            mic.removeErrorListener(errorListenerId);
        };
    }, [mic]);

    // Effect to listen for camera errors
    useEffect(() => {
        console.log('[MediaOrchestrator] Attaching cam error listener.');
        const errorListenerId = cam.addErrorListener((err) => {
            console.log('[MediaOrchestrator] Cam error received:', err);
            setCurrentVideoError(err);
        });
        return () => {
            console.log('[MediaOrchestrator] Removing cam error listener.');
            cam.removeErrorListener(errorListenerId);
        };
    }, [cam]);

    // Effect to listen for hands errors
    useEffect(() => {
        if (hands) {
            console.log('[MediaOrchestrator] Attaching hands error listener.');
            const errorListenerId = hands.addErrorListener((err) => {
                console.log('[MediaOrchestrator] Hands error received:', err);
                setCurrentHandsError(err);
                // If an error occurs, it implies hands are not starting or have stopped.
                setIsStartingHandsInternal(false);
            });
            return () => {
                console.log('[MediaOrchestrator] Removing hands error listener.');
                hands.removeErrorListener(errorListenerId);
            };
        }
        return () => {}; // No-op if hands is null
    }, [hands]);

    const isAudioActive = mic.isRecording();
    const isVideoActive = cam.isOn;
    // Use hands.isTracking directly from the hook for the most up-to-date status.
    const isHandTrackingActive = hands?.isTracking ?? false;
    const isMediaActive = isAudioActive && isVideoActive;
    const isVideoElementForHandsSet = !!videoElementForHandsInternalRef.current;

    // These are derived states, not primary input sources for the context, so can be null or actual streams.
    const audioStream = null; // MicrophoneProvider doesn't expose raw stream this way currently
    const videoStream = cam.stream;
    const videoFacingMode = cam.facingMode;
    const currentHandsData = hands?.handsData ?? null;

    // This log is very frequent due to re-renders. Keep it for now but be mindful.
    console.log('[MediaProvider] InternalOrchestrator render. States: isAudioActive:', isAudioActive, 'isVideoActive:', isVideoActive, 'isHandTrackingActive:', isHandTrackingActive, 'isStarting:', isStarting, 'isStartingHandsInternal:', isStartingHandsInternal, 'attemptedHandsStartInCycle:', attemptedHandsStartInCycle, 'isVideoElementSet:', isVideoElementForHandsSet);

    const setVideoElementForHands = useCallback((element: HTMLVideoElement | null) => {
        console.log('[MediaOrchestrator] setVideoElementForHands called with element:', element ? 'VideoElement' : 'null');
        videoElementForHandsInternalRef.current = element;
        if (!element) {
            // If video element is removed (e.g., CameraView unmounts or stream stops),
            // reset the flag so that if it's added again, we can attempt to start hands.
            console.log('[MediaOrchestrator] Video element removed, resetting attemptedHandsStartInCycle.');
            setAttemptedHandsStartInCycle(false);
        }
        // No automatic hands start here; that's handled by useEffect or startHands/startMedia.
    }, []);

    /**
     * Internal function to start hand tracking. This is the core logic for initiating MediaPipe Hands.
     * It checks pre-conditions and handles the asynchronous nature of MediaPipe initialization.
     */
    const startHandsAsyncInternal = useCallback(async () => {
        console.log(`[MediaOrchestrator] startHandsAsyncInternal: Entered. Pre-conditions: hands=${!!hands}, videoElement=${!!videoElementForHandsInternalRef.current}, cam.isOn=${cam?.isOn}, cam.stream=${!!cam?.stream}, !hands.isTracking=${!hands?.isTracking}`);
        if (!hands || !videoElementForHandsInternalRef.current || !cam?.isOn || !cam?.stream) {
            const errorMsg = "Pre-conditions not met for starting hand tracking (hands, videoElement, camera state).";
            console.warn('[MediaOrchestrator] startHandsAsyncInternal: Pre-conditions not met.', { hands: !!hands, videoElement: !!videoElementForHandsInternalRef.current, camIsOn: cam?.isOn, stream: !!cam?.stream });
            setCurrentHandsError(errorMsg);
            setAttemptedHandsStartInCycle(true); // Mark as attempted even if pre-conditions fail, to avoid rapid retries by useEffect.
            return Promise.reject(new Error(errorMsg));
        }
        if (hands.isTracking) {
            console.log('[MediaOrchestrator] startHandsAsyncInternal: Already tracking. Exiting.');
            return Promise.resolve();
        }

        const videoEl = videoElementForHandsInternalRef.current;
        console.log('[MediaOrchestrator] startHandsAsyncInternal: Setting attemptedHandsStartInCycle to true.');
        setAttemptedHandsStartInCycle(true);
        setCurrentHandsError(null); // Clear previous hands error

        try {
            console.log(`[MediaOrchestrator] startHandsAsyncInternal: Video element readyState: ${videoEl.readyState}. Waiting for HAVE_METADATA if necessary.`);
            if (videoEl.readyState < HTMLMediaElement.HAVE_METADATA) {
                await new Promise<void>((resolve, reject) => {
                    const onLoadedMetadata = () => {
                        console.log('[MediaOrchestrator] startHandsAsyncInternal: videoEl loadedmetadata event triggered.');
                        videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                        videoEl.removeEventListener('error', onError);
                        resolve();
                    };
                    const onError = (e: Event | string) => {
                        console.error('[MediaOrchestrator] startHandsAsyncInternal: videoEl error event triggered.', e);
                        videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                        videoEl.removeEventListener('error', onError);
                        reject(new Error('Video element error during metadata load for hand tracking.'));
                    };
                    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
                    videoEl.addEventListener('error', onError);
                });
            }
            console.log('[MediaOrchestrator] startHandsAsyncInternal: Video ready. Calling hands.startTracking().');
            await hands.startTracking(videoEl); // This should set hands.isTracking to true via its own internal logic and event listeners.
            console.log('[MediaOrchestrator] startHandsAsyncInternal: hands.startTracking() call completed.');
            // No need to setIsStartingHandsInternal(false) here, as this function is a utility.
            // The caller (startHands or startMedia via useEffect) manages that state.
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error('[MediaOrchestrator] startHandsAsyncInternal: Error during hand tracking start:', errorMsg);
            setCurrentHandsError(errorMsg);
            // If startTracking fails, ensure isTracking is false (though useHandsControl should handle this)
            if (hands?.isTracking) {
                 console.warn('[MediaOrchestrator] startHandsAsyncInternal: hands.isTracking is true after a startTracking error. This might be unexpected.');
            }
            throw err; // Re-throw for the caller to handle
        }
    }, [hands, cam, setCurrentHandsError, setAttemptedHandsStartInCycle]);

    /**
     * Orchestrates the start of all media: microphone, camera, and potentially hands.
     * Respects the 'startBehavior' prop (halt on error or proceed).
     */
    const startMedia = useCallback(async () => {
        console.log(`[MediaOrchestrator] startMedia: Entered. isStarting: ${isStarting}, isAudioActive: ${isAudioActive}, isVideoActive: ${isVideoActive}, hands.isTracking: ${hands?.isTracking}, videoElementSet: ${!!videoElementForHandsInternalRef.current}`);
        if (isStarting) {
            console.log('[MediaOrchestrator] startMedia: Already starting. Exiting.');
            return;
        }

        setIsStarting(true);
        console.log('[MediaOrchestrator] startMedia: Set isStarting to true.');
        setMediaOrchestrationError(null);
        setAttemptedHandsStartInCycle(false); // Reset for this new media start cycle
        setUserExplicitlyStoppedHands(false); // Reset for this new media start cycle
        console.log('[MediaOrchestrator] startMedia: Reset attemptedHandsStartInCycle and userExplicitlyStoppedHands to false.');
        setCurrentAudioError(null);
        setCurrentVideoError(null);
        setCurrentHandsError(null); // Clear all errors at the beginning of a full startMedia sequence

        let localMicAttemptOk = isAudioActive;
        let localCamAttemptOk = isVideoActive;

        if (mic && !isAudioActive) {
            console.log('[MediaOrchestrator] startMedia: Attempting to start Mic...');
            try {
                await mic.start();
                localMicAttemptOk = true;
                console.log('[MediaOrchestrator] startMedia: Mic start successful.');
            } catch {
                localMicAttemptOk = false;
                console.error('[MediaOrchestrator] startMedia: Mic start failed.');
                // Error state (currentAudioError) should be set by the mic's error listener
            }
        }

        if (cam && !isVideoActive) {
            console.log('[MediaOrchestrator] startMedia: Attempting to start Camera...');
            try {
                await cam.startCamera();
                localCamAttemptOk = true;
                console.log('[MediaOrchestrator] startMedia: Camera start successful.');
            } catch {
                localCamAttemptOk = false;
                console.error('[MediaOrchestrator] startMedia: Camera start failed.');
                // Error state (currentVideoError) should be set by the cam's error listener
            }
        }

        if (startBehavior === 'halt') {
            const shouldHalt = !localMicAttemptOk || !localCamAttemptOk;
            if (shouldHalt) {
                const micErrMsg = currentAudioError || (localMicAttemptOk ? '' : 'Failed to start');
                const camErrMsg = currentVideoError || (localCamAttemptOk ? '' : 'Failed to start');
                const errorMsg = `Media start halted: Mic ${localMicAttemptOk ? 'OK' : `FAIL (${micErrMsg})`}. Cam ${localCamAttemptOk ? 'OK' : `FAIL (${camErrMsg})`}.`;
                console.warn('[MediaOrchestrator] startMedia: Halting due to mic/cam failure.', { localMicAttemptOk, localCamAttemptOk, micErrMsg, camErrMsg });
                setMediaOrchestrationError(errorMsg);
                if (localMicAttemptOk && mic) mic.stop(); // Rollback successful mic start
                if (localCamAttemptOk && cam) cam.stopCamera(); // Rollback successful cam start
                setIsStarting(false);
                console.log('[MediaOrchestrator] startMedia: Set isStarting to false (halted).');
                return;
            }
        } else { // 'proceed' behavior
            const errorParts: string[] = [];
            if (!localMicAttemptOk) errorParts.push(`Mic: ${currentAudioError || 'Unknown'}`);
            if (!localCamAttemptOk) errorParts.push(`Cam: ${currentVideoError || 'Unknown'}`);
            if (errorParts.length > 0) {
                const errorMsg = `Failed to start: ${errorParts.join('; ')}. Others proceeded if successful.`;
                console.warn('[MediaOrchestrator] startMedia: Proceeding with errors.', { errorParts });
                setMediaOrchestrationError(errorMsg);
            }
        }

        // If camera started (or was already on) and other conditions are met, try starting hands.
        // This part is crucial. It relies on attemptedHandsStartInCycle being false initially for this startMedia call.
        if (localCamAttemptOk && cam?.isOn && cam.stream && hands && !hands.isTracking && videoElementForHandsInternalRef.current && !attemptedHandsStartInCycle) {
            console.log('[MediaOrchestrator] startMedia: Conditions met to attempt starting hands via startHandsAsyncInternal.');
            try {
                await startHandsAsyncInternal();
                console.log('[MediaOrchestrator] startMedia: startHandsAsyncInternal completed successfully.');
            } catch {
                console.error('[MediaOrchestrator] startMedia: startHandsAsyncInternal failed. Error should be in currentHandsError.');
                if (startBehavior === 'halt') {
                    // If hands fail and behavior is 'halt', this implies a severe issue or desire to stop all media.
                    // However, mic and cam might already be running. The definition of 'halt' for hands is tricky here.
                    // For now, we just log and the error is set. The user might expect media to stop if hands are critical.
                    // This part might need refinement based on desired UX for 'halt' with hands.
                    setMediaOrchestrationError(`Failed to start hand tracking. Halting media start. Error: ${currentHandsError || 'Unknown hands error'}`);
                     console.warn('[MediaOrchestrator] startMedia: Hand tracking failed with startBehavior=halt. Media (mic/cam) might still be running.');
                }
            }
        }

        setIsStarting(false);
        console.log('[MediaOrchestrator] startMedia: Set isStarting to false (completed). Exiting startMedia.');
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
        console.log(`[MediaOrchestrator] useEffect[cam.isOn, stream, hands, videoElement, !attemptedHandsStartInCycle, !userExplicitlyStoppedHands]: Evaluating conditions for auto-starting hands. cam.isOn=${cam?.isOn}, stream=${!!cam?.stream}, hands=${!!hands}, !hands.isTracking=${!hands?.isTracking}, videoElementSet=${!!videoElementForHandsInternalRef.current}, !attemptedHandsStartInCycle=${!attemptedHandsStartInCycle}, !userExplicitlyStoppedHands=${!userExplicitlyStoppedHands}`);
        if (cam?.isOn && cam.stream && hands && !hands.isTracking && videoElementForHandsInternalRef.current && !attemptedHandsStartInCycle && !userExplicitlyStoppedHands) {
            console.log('[MediaOrchestrator] useEffect[...]: Conditions met for auto-starting hands. Calling startHandsAsyncInternal.');
            startHandsAsyncInternal().catch(() => {
                console.error('[MediaOrchestrator] useEffect[...]: Error during automatic startHandsAsyncInternal. Error should be in currentHandsError.');
                // Error is handled within startHandsAsyncInternal by setting currentHandsError.
                // attemptedHandsStartInCycle is set to true by startHandsAsyncInternal regardless of outcome.
            });
        }
    }, [cam?.isOn, cam?.stream, hands, videoElementForHandsInternalRef, attemptedHandsStartInCycle, userExplicitlyStoppedHands, startHandsAsyncInternal]); // Ensure all dependencies are listed

    useEffect(() => {
        if (!cam?.isOn) {
            // If camera turns off, any "attempt" in the current "cycle" related to hands auto-start is void.
            // This ensures that if the camera turns back on, a new attempt to start hands can be made.
            // startMedia() also resets this, but this handles cases where startMedia() might not be the immediate trigger
            // or for general state cleanliness regarding this flag.
            console.log('[MediaOrchestrator] useEffect[cam.isOn]: Camera is off, resetting attemptedHandsStartInCycle to false.');
            setAttemptedHandsStartInCycle(false);
        }
    }, [cam?.isOn, setAttemptedHandsStartInCycle]);

    /**
     * Stops hand tracking. This is a direct command to stop hands.
     */
    const stopHands = useCallback(async () => {
        console.log(`[MediaOrchestrator] stopHands: Entered. hands.isTracking: ${hands?.isTracking}`);
        if (hands && hands.isTracking) {
            try {
                await hands.stopTracking();
                console.log('[MediaOrchestrator] stopHands: hands.stopTracking() call completed.');
                setUserExplicitlyStoppedHands(true); // Mark that user explicitly stopped hands
                // isTracking state should be updated by useHandsControl via its own internal logic and event listeners.
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error('[MediaOrchestrator] stopHands: Error during hand tracking stop:', errorMsg);
                setCurrentHandsError(errorMsg);
            }
        }
        // Reset flag because hands are now intentionally stopped. If camera is still on,
        // and user tries to start hands again (or if an auto-start condition re-evaluates),
        // we want it to be a fresh attempt.
        console.log('[MediaOrchestrator] stopHands: Resetting attemptedHandsStartInCycle to false.');
        setAttemptedHandsStartInCycle(false);
        setIsStartingHandsInternal(false); // Ensure this is reset if stop is called during a start attempt.
    }, [hands, setCurrentHandsError, setAttemptedHandsStartInCycle]);

    /**
     * Effect to automatically stop hand tracking if the camera is turned off.
     */
    useEffect(() => {
        console.log(`[MediaOrchestrator] useEffect[cam.isOn, hands, stopHands]: Evaluating conditions for auto-stopping hands. cam.isOn=${cam?.isOn}`);
        if (cam && !cam.isOn) {
            if (hands?.isTracking) {
                console.log('[MediaOrchestrator] useEffect[...]: Camera turned off. Calling stopHands.');
                stopHands();
            }
            // When camera turns off, reset the flag, so if it turns on again, hands can try to start.
            console.log('[MediaOrchestrator] useEffect[...]: Camera off, resetting attemptedHandsStartInCycle.');
            setAttemptedHandsStartInCycle(false);
        }
    }, [cam, cam?.isOn, hands, stopHands]); // cam.isOn is the primary trigger here

    /**
     * Stops all media: microphone, camera, and implicitly hands (due to camera stopping).
     */
    const stopMedia = useCallback(() => {
        console.log(`[MediaOrchestrator] stopMedia: Entered. mic.isRecording: ${mic?.isRecording()}, cam.isOn: ${cam?.isOn}`);
        if (mic?.isRecording()) {
            console.log('[MediaOrchestrator] stopMedia: Stopping Mic.');
            mic.stop();
        }
        if (cam?.isOn) {
            console.log('[MediaOrchestrator] stopMedia: Stopping Camera. This should trigger useEffect to stop hands.');
            cam.stopCamera();
        }
        setMediaOrchestrationError(null);
        setCurrentAudioError(null);
        setCurrentVideoError(null);
        setCurrentHandsError(null);
        setIsStarting(false); // Ensure isStarting is false if stopMedia is called during a start sequence.
        console.log('[MediaOrchestrator] stopMedia: Exiting.');
    }, [mic, cam, setMediaOrchestrationError, setCurrentAudioError, setCurrentVideoError, setCurrentHandsError, setIsStarting]);

    /**
     * Toggles all media on or off.
     */
    const toggleMedia = useCallback(async () => {
        console.log(`[MediaOrchestrator] toggleMedia: Entered. isAudioActive: ${isAudioActive}, isVideoActive: ${isVideoActive}`);
        if (isAudioActive && isVideoActive) {
            console.log('[MediaOrchestrator] toggleMedia: Media is active, calling stopMedia.');
            stopMedia();
        } else {
            console.log('[MediaOrchestrator] toggleMedia: Media is inactive, calling startMedia.');
            await startMedia();
        }
        console.log('[MediaOrchestrator] toggleMedia: Exiting.');
    }, [isAudioActive, isVideoActive, startMedia, stopMedia]);

    /**
     * Explicitly starts hand tracking. This is typically called by a user action.
     * Manages the 'isStartingHandsInternal' state.
     */
    const startHands = useCallback(async () => {
        console.log(`[MediaOrchestrator] startHands: Entered. isStartingHandsInternal: ${isStartingHandsInternal}, hands.isTracking: ${hands?.isTracking}`);
        if (isStartingHandsInternal || hands?.isTracking) {
            console.log('[MediaOrchestrator] startHands: Already starting or tracking. Exiting.');
            return;
        }

        setUserExplicitlyStoppedHands(false); // User is explicitly starting, so clear the flag.
        console.log('[MediaOrchestrator] startHands: Setting isStartingHandsInternal to true.');
        setIsStartingHandsInternal(true);
        setCurrentHandsError(null); // Clear previous error

        if (!hands) {
            const errorMsg = "Hand tracking service not available.";
            console.warn('[MediaOrchestrator] startHands:', errorMsg);
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            return;
        }
        if (!cam?.isOn) {
            const errorMsg = "Camera is not active. Cannot start hand tracking.";
            console.warn('[MediaOrchestrator] startHands:', errorMsg);
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            return;
        }
        if (!videoElementForHandsInternalRef.current) {
            const errorMsg = "Video element not set for hand tracking.";
            console.warn('[MediaOrchestrator] startHands:', errorMsg);
            setCurrentHandsError(errorMsg);
            setIsStartingHandsInternal(false);
            return;
        }

        try {
            console.log('[MediaOrchestrator] startHands: Calling startHandsAsyncInternal.');
            await startHandsAsyncInternal();
            console.log('[MediaOrchestrator] startHands: startHandsAsyncInternal completed successfully.');
            // isTracking state will be updated by useHandsControl. Successful call here means it *should* start.
        } catch {
            console.error('[MediaOrchestrator] startHands: startHandsAsyncInternal failed. Error should be in currentHandsError.');
            // Error is set by startHandsAsyncInternal
        } finally {
            console.log('[MediaOrchestrator] startHands: Setting isStartingHandsInternal to false (completed attempt).');
            setIsStartingHandsInternal(false);
        }
        console.log('[MediaOrchestrator] startHands: Exiting.');
    }, [hands, cam?.isOn, videoElementForHandsInternalRef, isStartingHandsInternal, startHandsAsyncInternal, setIsStartingHandsInternal, setCurrentHandsError]);

    // Context value provided to children
    const contextValue = useMemo<MediaContextType>(() => {
        // The console log here is removed as the one at the top of InternalOrchestrator is sufficient and less noisy.
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
            isStartingMedia: isStarting, // Renamed for clarity in context
            isStartingHands: isStartingHandsInternal, // Renamed for clarity in context
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
        <MediaContext.Provider value={contextValue}>
            {children}
        </MediaContext.Provider>
    );
}

export function MediaProvider({
    children,
    microphoneProps,
    cameraProps,
    handsProps,
    startBehavior = DEFAULT_START_BEHAVIOR,
}: MediaProviderProps) {
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
