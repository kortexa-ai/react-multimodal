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

import { BodyProvider } from '../body/BodyProvider';
import { useBodyTrackingDevice } from '../body/hooks/useBodyTrackingDevice';

import { FaceProvider } from '../face/FaceProvider';
import { useFaceTrackingDevice } from '../face/hooks/useFaceTrackingDevice';

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
    const body = useBodyTrackingDevice();
    const face = useFaceTrackingDevice();

    const videoElementForHandsInternalRef = useRef<HTMLVideoElement | null>(null);
    const videoElementForBodyInternalRef = useRef<HTMLVideoElement | null>(null);
    const videoElementForFaceInternalRef = useRef<HTMLVideoElement | null>(null);
    
    // Flags to track if we've already tried to start tracking in the current "camera on" cycle.
    const [attemptedHandsStartInCycle, setAttemptedHandsStartInCycle] = useState(false);
    const [attemptedBodyStartInCycle, setAttemptedBodyStartInCycle] = useState(false);
    const [attemptedFaceStartInCycle, setAttemptedFaceStartInCycle] = useState(false);
    
    // Flags to track if the user has explicitly stopped tracking, to prevent auto-restart by useEffect.
    const [userExplicitlyStoppedHands, setUserExplicitlyStoppedHands] = useState(false);
    const [userExplicitlyStoppedBody, setUserExplicitlyStoppedBody] = useState(false);
    const [userExplicitlyStoppedFace, setUserExplicitlyStoppedFace] = useState(false);

    const [mediaOrchestrationError, setMediaOrchestrationError] = useState<string | undefined>(undefined);
    const [isStarting, setIsStarting] = useState(false); // True if startMedia is in progress
    const [currentAudioError, setCurrentAudioError] = useState<string | undefined>(undefined);
    const [currentVideoError, setCurrentVideoError] = useState<string | undefined>(undefined);
    const [currentHandsError, setCurrentHandsError] = useState<string | undefined>(undefined);
    const [currentBodyError, setCurrentBodyError] = useState<string | undefined>(undefined);
    const [currentFaceError, setCurrentFaceError] = useState<string | undefined>(undefined);
    
    // True if explicit start requests are in progress
    const [isStartingHandsInternal, setIsStartingHandsInternal] = useState(false);
    const [isStartingBodyInternal, setIsStartingBodyInternal] = useState(false);
    const [isStartingFaceInternal, setIsStartingFaceInternal] = useState(false);
    
    const [isVideoElementForHandsSet, setIsVideoElementForHandsSet] = useState(false);
    const [isVideoElementForBodySet, setIsVideoElementForBodySet] = useState(false);
    const [isVideoElementForFaceSet, setIsVideoElementForFaceSet] = useState(false);

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

    // Effect to listen for body errors
    useEffect(() => {
        if (body) {
            const errorListenerId = body.addErrorListener((err) => {
                setCurrentBodyError(err);
                setIsStartingBodyInternal(false);
            });
            return () => {
                body.removeErrorListener(errorListenerId);
            };
        }
        return () => { }; // No-op if body is null
    }, [body]);

    // Effect to listen for face errors
    useEffect(() => {
        if (face) {
            const errorListenerId = face.addErrorListener((err) => {
                setCurrentFaceError(err);
                setIsStartingFaceInternal(false);
            });
            return () => {
                face.removeErrorListener(errorListenerId);
            };
        }
        return () => { }; // No-op if face is null
    }, [face]);

    const isAudioActive = useMemo(() => mic.isRecording, [mic]);
    const isVideoActive = useMemo(() => cam.isRecording, [cam]);
    // Use direct tracking states from the hooks for the most up-to-date status.
    const isHandTrackingActive = useMemo(() => hands?.isTracking ?? false, [hands]);
    const isBodyTrackingActive = useMemo(() => body?.isTracking ?? false, [body]);
    const isFaceTrackingActive = useMemo(() => face?.isTracking ?? false, [face]);
    const isMediaActive = useMemo(() => isAudioActive && isVideoActive, [isAudioActive, isVideoActive]);

    // These are derived states, not primary input sources for the context, so can be null or actual streams.
    const audioStream = useMemo(() => undefined, []); // MicrophoneProvider doesn't expose raw stream this way currently
    const videoStream = useMemo(() => cam.stream ?? undefined, [cam]);
    const videoFacingMode = useMemo(() => cam.facingMode, [cam]);
    const currentHandsData = useMemo(() => hands?.handsData ?? undefined, [hands]);
    const currentBodyData = useMemo(() => body?.bodyData ?? undefined, [body]);
    const currentFaceData = useMemo(() => face?.faceData ?? undefined, [face]);

    const setVideoElementForHands = useCallback((element: HTMLVideoElement | null) => {
        videoElementForHandsInternalRef.current = element;
        if (!element) {
            setAttemptedHandsStartInCycle(false);
            setIsVideoElementForHandsSet(false);
        } else {
            setIsVideoElementForHandsSet(true);
        }
    }, []);

    const setVideoElementForBody = useCallback((element: HTMLVideoElement | null) => {
        videoElementForBodyInternalRef.current = element;
        if (!element) {
            setAttemptedBodyStartInCycle(false);
            setIsVideoElementForBodySet(false);
        } else {
            setIsVideoElementForBodySet(true);
        }
    }, []);

    const setVideoElementForFace = useCallback((element: HTMLVideoElement | null) => {
        videoElementForFaceInternalRef.current = element;
        if (!element) {
            setAttemptedFaceStartInCycle(false);
            setIsVideoElementForFaceSet(false);
        } else {
            setIsVideoElementForFaceSet(true);
        }
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
     * Internal function to start body tracking.
     */
    const startBodyAsyncInternal = useCallback(async () => {
        if (!body || !videoElementForBodyInternalRef.current || !cam?.isRecording || !cam?.stream) {
            const errorMsg = "Pre-conditions not met for starting body tracking (body, videoElement, camera state).";
            setCurrentBodyError(errorMsg);
            setAttemptedBodyStartInCycle(true);
            return Promise.reject(new Error(errorMsg));
        }
        if (body.isTracking) {
            return Promise.resolve();
        }

        const videoEl = videoElementForBodyInternalRef.current;
        setAttemptedBodyStartInCycle(true);
        setCurrentBodyError(undefined);

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
                        reject(new Error('Video element error during metadata load for body tracking.'));
                    };
                    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
                    videoEl.addEventListener('error', onError);
                });
            }
            await body.startTracking(videoEl);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setCurrentBodyError(errorMsg);
            throw err;
        }
    }, [body, cam, setCurrentBodyError, setAttemptedBodyStartInCycle]);

    /**
     * Internal function to start face tracking.
     */
    const startFaceAsyncInternal = useCallback(async () => {
        if (!face || !videoElementForFaceInternalRef.current || !cam?.isRecording || !cam?.stream) {
            const errorMsg = "Pre-conditions not met for starting face tracking (face, videoElement, camera state).";
            setCurrentFaceError(errorMsg);
            setAttemptedFaceStartInCycle(true);
            return Promise.reject(new Error(errorMsg));
        }
        if (face.isTracking) {
            return Promise.resolve();
        }

        const videoEl = videoElementForFaceInternalRef.current;
        setAttemptedFaceStartInCycle(true);
        setCurrentFaceError(undefined);

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
                        reject(new Error('Video element error during metadata load for face tracking.'));
                    };
                    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
                    videoEl.addEventListener('error', onError);
                });
            }
            await face.startTracking(videoEl);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setCurrentFaceError(errorMsg);
            throw err;
        }
    }, [face, cam, setCurrentFaceError, setAttemptedFaceStartInCycle]);

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

        // If camera started (or was already on) and other conditions are met, try starting tracking.
        if (localCamAttemptOk && cam?.isRecording && cam.stream) {
            // Try starting hands
            if (hands && !hands.isTracking && videoElementForHandsInternalRef.current && !attemptedHandsStartInCycle) {
                try {
                    await startHandsAsyncInternal();
                } catch {
                    if (startBehavior === 'halt') {
                        setMediaOrchestrationError(`Failed to start hand tracking. Halting media start. Error: ${currentHandsError || 'Unknown hands error'}`);
                    }
                }
            }
            
            // Try starting body
            if (body && !body.isTracking && videoElementForBodyInternalRef.current && !attemptedBodyStartInCycle) {
                try {
                    await startBodyAsyncInternal();
                } catch {
                    if (startBehavior === 'halt') {
                        setMediaOrchestrationError(`Failed to start body tracking. Halting media start. Error: ${currentBodyError || 'Unknown body error'}`);
                    }
                }
            }
            
            // Try starting face
            if (face && !face.isTracking && videoElementForFaceInternalRef.current && !attemptedFaceStartInCycle) {
                try {
                    await startFaceAsyncInternal();
                } catch {
                    if (startBehavior === 'halt') {
                        setMediaOrchestrationError(`Failed to start face tracking. Halting media start. Error: ${currentFaceError || 'Unknown face error'}`);
                    }
                }
            }
        }

        setIsStarting(false);
    }, [
        mic, cam, hands, body, face, startBehavior, isAudioActive, isVideoActive, isStarting,
        videoElementForHandsInternalRef, videoElementForBodyInternalRef, videoElementForFaceInternalRef,
        attemptedHandsStartInCycle, attemptedBodyStartInCycle, attemptedFaceStartInCycle,
        startHandsAsyncInternal, startBodyAsyncInternal, startFaceAsyncInternal,
        currentAudioError, currentVideoError, currentHandsError, currentBodyError, currentFaceError,
        setCurrentAudioError, setCurrentVideoError, setCurrentHandsError, setCurrentBodyError, setCurrentFaceError,
        setMediaOrchestrationError, setIsStarting, 
        setAttemptedHandsStartInCycle, setAttemptedBodyStartInCycle, setAttemptedFaceStartInCycle,
        setUserExplicitlyStoppedHands, setUserExplicitlyStoppedBody, setUserExplicitlyStoppedFace
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
    }, [cam?.isRecording, cam?.stream, hands, videoElementForHandsInternalRef, attemptedHandsStartInCycle, userExplicitlyStoppedHands, startHandsAsyncInternal]);

    // Auto-start body tracking when dependencies are ready
    useEffect(() => {
        if (cam?.isRecording && cam.stream && body && !body.isTracking && videoElementForBodyInternalRef.current && !attemptedBodyStartInCycle && !userExplicitlyStoppedBody) {
            startBodyAsyncInternal().catch(() => {
                // Error handled within startBodyAsyncInternal
            });
        }
    }, [cam?.isRecording, cam?.stream, body, videoElementForBodyInternalRef, attemptedBodyStartInCycle, userExplicitlyStoppedBody, startBodyAsyncInternal]);

    // Auto-start face tracking when dependencies are ready
    useEffect(() => {
        if (cam?.isRecording && cam.stream && face && !face.isTracking && videoElementForFaceInternalRef.current && !attemptedFaceStartInCycle && !userExplicitlyStoppedFace) {
            startFaceAsyncInternal().catch(() => {
                // Error handled within startFaceAsyncInternal
            });
        }
    }, [cam?.isRecording, cam?.stream, face, videoElementForFaceInternalRef, attemptedFaceStartInCycle, userExplicitlyStoppedFace, startFaceAsyncInternal]);

    useEffect(() => {
        if (!cam?.isRecording) {
            // Reset all attempt flags when camera turns off
            setAttemptedHandsStartInCycle(false);
            setAttemptedBodyStartInCycle(false);
            setAttemptedFaceStartInCycle(false);
        }
    }, [cam?.isRecording, setAttemptedHandsStartInCycle, setAttemptedBodyStartInCycle, setAttemptedFaceStartInCycle]);

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
     * Stops body tracking.
     */
    const stopBody = useCallback(async () => {
        if (body && body.isTracking) {
            try {
                await body.stopTracking();
                setUserExplicitlyStoppedBody(true);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setCurrentBodyError(errorMsg);
            }
        }
        setAttemptedBodyStartInCycle(false);
        setIsStartingBodyInternal(false);
    }, [body, setCurrentBodyError, setAttemptedBodyStartInCycle]);

    /**
     * Stops face tracking.
     */
    const stopFace = useCallback(async () => {
        if (face && face.isTracking) {
            try {
                await face.stopTracking();
                setUserExplicitlyStoppedFace(true);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setCurrentFaceError(errorMsg);
            }
        }
        setAttemptedFaceStartInCycle(false);
        setIsStartingFaceInternal(false);
    }, [face, setCurrentFaceError, setAttemptedFaceStartInCycle]);

    /**
     * Effect to automatically stop all tracking if the camera is turned off.
     */
    useEffect(() => {
        if (cam && !cam.isRecording) {
            if (hands?.isTracking) {
                stopHands();
            }
            if (body?.isTracking) {
                stopBody();
            }
            if (face?.isTracking) {
                stopFace();
            }
            // When camera turns off, reset all flags
            setAttemptedHandsStartInCycle(false);
            setAttemptedBodyStartInCycle(false);
            setAttemptedFaceStartInCycle(false);
        }
    }, [cam, cam?.isRecording, hands, body, face, stopHands, stopBody, stopFace]);

    /**
     * Stops all media: microphone, camera, and implicitly all tracking (due to camera stopping).
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
        setCurrentBodyError(undefined);
        setCurrentFaceError(undefined);
        setIsStarting(false);
    }, [mic, cam, setMediaOrchestrationError, setCurrentAudioError, setCurrentVideoError, setCurrentHandsError, setCurrentBodyError, setCurrentFaceError, setIsStarting]);

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

    /**
     * Explicitly starts body tracking.
     */
    const startBody = useCallback(async () => {
        if (isStartingBodyInternal || body?.isTracking) {
            return;
        }

        setUserExplicitlyStoppedBody(false);
        setIsStartingBodyInternal(true);
        setCurrentBodyError(undefined);

        if (!body) {
            const errorMsg = "Body tracking service not available.";
            setCurrentBodyError(errorMsg);
            setIsStartingBodyInternal(false);
            return;
        }
        if (!cam?.isRecording) {
            const errorMsg = "Camera is not active. Cannot start body tracking.";
            setCurrentBodyError(errorMsg);
            setIsStartingBodyInternal(false);
            return;
        }
        if (!videoElementForBodyInternalRef.current) {
            const errorMsg = "Video element not set for body tracking.";
            setCurrentBodyError(errorMsg);
            setIsStartingBodyInternal(false);
            setIsVideoElementForBodySet(false);
            return;
        }

        try {
            await startBodyAsyncInternal();
        } catch {
            // Error is set by startBodyAsyncInternal
        } finally {
            setIsStartingBodyInternal(false);
        }
    }, [body, cam?.isRecording, videoElementForBodyInternalRef, isStartingBodyInternal, startBodyAsyncInternal, setIsStartingBodyInternal, setCurrentBodyError]);

    /**
     * Explicitly starts face tracking.
     */
    const startFace = useCallback(async () => {
        if (isStartingFaceInternal || face?.isTracking) {
            return;
        }

        setUserExplicitlyStoppedFace(false);
        setIsStartingFaceInternal(true);
        setCurrentFaceError(undefined);

        if (!face) {
            const errorMsg = "Face tracking service not available.";
            setCurrentFaceError(errorMsg);
            setIsStartingFaceInternal(false);
            return;
        }
        if (!cam?.isRecording) {
            const errorMsg = "Camera is not active. Cannot start face tracking.";
            setCurrentFaceError(errorMsg);
            setIsStartingFaceInternal(false);
            return;
        }
        if (!videoElementForFaceInternalRef.current) {
            const errorMsg = "Video element not set for face tracking.";
            setCurrentFaceError(errorMsg);
            setIsStartingFaceInternal(false);
            setIsVideoElementForFaceSet(false);
            return;
        }

        try {
            await startFaceAsyncInternal();
        } catch {
            // Error is set by startFaceAsyncInternal
        } finally {
            setIsStartingFaceInternal(false);
        }
    }, [face, cam?.isRecording, videoElementForFaceInternalRef, isStartingFaceInternal, startFaceAsyncInternal, setIsStartingFaceInternal, setCurrentFaceError]);

    // Context value provided to children
    const contextValue = useMemo<CompositeMediaControl>(() => {
        return {
            isAudioActive,
            isVideoActive,
            isHandTrackingActive,
            isBodyTrackingActive,
            isFaceTrackingActive,
            isMediaActive,
            audioStream,
            videoStream,
            videoFacingMode,
            currentHandsData,
            currentBodyData,
            currentFaceData,
            audioError: currentAudioError,
            videoError: currentVideoError,
            handsError: currentHandsError,
            bodyError: currentBodyError,
            faceError: currentFaceError,
            mediaError: mediaOrchestrationError,
            startMedia,
            stopMedia,
            toggleMedia,
            cam,
            mic,
            hands,
            body,
            face,
            setVideoElementForHands,
            setVideoElementForBody,
            setVideoElementForFace,
            startHands,
            stopHands,
            startBody,
            stopBody,
            startFace,
            stopFace,
            isStartingMedia: isStarting,
            isStartingHands: isStartingHandsInternal,
            isStartingBody: isStartingBodyInternal,
            isStartingFace: isStartingFaceInternal,
            isVideoElementForHandsSet,
            isVideoElementForBodySet,
            isVideoElementForFaceSet,
        }
    }, [
        isAudioActive, isVideoActive, isHandTrackingActive, isBodyTrackingActive, isFaceTrackingActive, isMediaActive,
        audioStream, videoStream, videoFacingMode, currentHandsData, currentBodyData, currentFaceData,
        currentAudioError, currentVideoError, currentHandsError, currentBodyError, currentFaceError, mediaOrchestrationError,
        startMedia, stopMedia, toggleMedia,
        cam, mic, hands, body, face,
        setVideoElementForHands, setVideoElementForBody, setVideoElementForFace,
        startHands, stopHands, startBody, stopBody, startFace, stopFace,
        isStarting, isStartingHandsInternal, isStartingBodyInternal, isStartingFaceInternal,
        isVideoElementForHandsSet, isVideoElementForBodySet, isVideoElementForFaceSet
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
    bodyProps,
    faceProps,
    startBehavior = DEFAULT_START_BEHAVIOR,
}: PropsWithChildren<CompositeMediaProviderProps>) {
    return (
        <MicrophoneProvider {...microphoneProps}>
            <CameraProvider {...cameraProps}>
                <HandsProvider {...handsProps}>
                    <BodyProvider {...bodyProps}>
                        <FaceProvider {...faceProps}>
                            <InternalMediaOrchestrator
                                startBehavior={startBehavior}
                            >
                                {children}
                            </InternalMediaOrchestrator>
                        </FaceProvider>
                    </BodyProvider>
                </HandsProvider>
            </CameraProvider>
        </MicrophoneProvider>
    );
}
