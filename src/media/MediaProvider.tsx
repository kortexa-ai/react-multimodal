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
    const [attemptedHandsStartInCycle, setAttemptedHandsStartInCycle] = useState(false);

    const [mediaOrchestrationError, setMediaOrchestrationError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [currentAudioError, setCurrentAudioError] = useState<string | null | undefined>(null);
    const [currentVideoError, setCurrentVideoError] = useState<string | null | undefined>(null);
    const [currentHandsError, setCurrentHandsError] = useState<string | null | undefined>(null);

    useEffect(() => {
        const errorListenerId = mic.addErrorListener(setCurrentAudioError);
        return () => mic.removeErrorListener(errorListenerId);
    }, [mic]);

    useEffect(() => {
        const errorListenerId = cam.addErrorListener(setCurrentVideoError);
        return () => cam.removeErrorListener(errorListenerId);
    }, [cam]);

    useEffect(() => {
        if (hands) {
            const errorListenerId = hands.addErrorListener(setCurrentHandsError);
            return () => hands.removeErrorListener(errorListenerId);
        }
        return () => { }; // No-op if hands is null
    }, [hands]);

    const isAudioActive = mic.isRecording();
    const isVideoActive = cam.isOn;
    const isHandTrackingActive = hands?.isTracking ?? false;
    const isMediaActive = isAudioActive && isVideoActive;

    const audioStream = null;
    const videoStream = cam.stream;
    const videoFacingMode = cam.facingMode;
    const currentHandsData = hands?.handsData ?? null;

    const setVideoElementForHands = useCallback((element: HTMLVideoElement | null) => {
        videoElementForHandsInternalRef.current = element;
        if (!element) {
            setAttemptedHandsStartInCycle(false);
        }
    }, []);

    const startMedia = useCallback(async () => {
        if (isStarting || (isAudioActive && isVideoActive && (!videoElementForHandsInternalRef.current || hands?.isTracking))) return;

        setIsStarting(true);
        setMediaOrchestrationError(null);
        setAttemptedHandsStartInCycle(false);

        let localMicAttemptOk = isAudioActive;
        let localCamAttemptOk = isVideoActive;

        let micStartError: string | null = null;
        let camStartError: string | null = null;

        if (mic && !isAudioActive) {
            try {
                await mic.start();
                localMicAttemptOk = true;
            } catch (err) {
                localMicAttemptOk = false;
                micStartError = err instanceof Error ? err.message : String(err);
            }
        }

        if (cam && !isVideoActive) {
            try {
                await cam.startCamera();
                localCamAttemptOk = true;
            } catch (err) {
                localCamAttemptOk = false;
                camStartError = err instanceof Error ? err.message : String(err);
            }
        }

        if (startBehavior === 'halt') {
            const shouldHalt = !localMicAttemptOk || !localCamAttemptOk;
            if (shouldHalt) {
                const micErrMsg = micStartError || (localMicAttemptOk ? '' : 'Failed to start');
                const camErrMsg = camStartError || (localCamAttemptOk ? '' : 'Failed to start');
                const errorMsg = `Media start halted: Mic ${localMicAttemptOk ? 'OK' : `FAIL (${micErrMsg})`}. Cam ${localCamAttemptOk ? 'OK' : `FAIL (${camErrMsg})`}.`;
                setMediaOrchestrationError(errorMsg);

                if (localMicAttemptOk && mic?.isRecording() && !isAudioActive) mic.stop();
                if (localCamAttemptOk && cam?.isOn && !isVideoActive) cam.stopCamera();
                setIsStarting(false);
                return;
            }
        } else {
            const errorParts: string[] = [];
            if (!localMicAttemptOk) errorParts.push(`Mic: ${micStartError || 'Unknown'}`);
            if (!localCamAttemptOk) errorParts.push(`Cam: ${camStartError || 'Unknown'}`);
            if (errorParts.length > 0) {
                setMediaOrchestrationError(`Failed to start: ${errorParts.join('; ')}. Others proceeded if successful.`);
            }
        }
        setIsStarting(false);
    }, [
        isStarting, isAudioActive, isVideoActive, videoElementForHandsInternalRef, hands,
        mic, cam, startBehavior
    ]);

    useEffect(() => {
        const videoEl = videoElementForHandsInternalRef.current;

        if (cam?.isOn && cam.stream && videoEl && hands && !hands.isTracking && !attemptedHandsStartInCycle) {
            setAttemptedHandsStartInCycle(true);

            const startHandsAsync = async () => {
                try {
                    if (videoEl.srcObject !== cam.stream) {
                        videoEl.srcObject = cam.stream;
                    }

                    if (videoEl.readyState < HTMLMediaElement.HAVE_METADATA) {
                        await new Promise<void>((resolve, reject) => {
                            const onLoadedMetadata = () => {
                                videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                                videoEl.removeEventListener('error', onError);
                                resolve();
                            };
                            const onError = (e: Event) => {
                                videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                                videoEl.removeEventListener('error', onError);
                                console.error("[MediaProvider HandsEffect] Video element error while waiting for loadedmetadata:", e);
                                reject(new Error("Video element error before hand tracking."));
                            };
                            videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
                            videoEl.addEventListener('error', onError);

                            const timeoutId = setTimeout(() => {
                                videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
                                videoEl.removeEventListener('error', onError);
                                console.error("[MediaProvider HandsEffect] Timeout waiting for video loadedmetadata.");
                                reject(new Error("Timeout waiting for video loadedmetadata for hand tracking."));
                            }, 3000);

                            if (videoEl.readyState >= HTMLMediaElement.HAVE_METADATA) {
                                clearTimeout(timeoutId);
                                onLoadedMetadata();
                            }
                        });
                    }

                    await hands.startTracking(videoEl);
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    console.error("MediaProvider: Error starting hand tracking (async):", errorMsg);
                    setMediaOrchestrationError(prev => {
                        const handsErrorPart = `Hands: ${errorMsg}`;
                        if (prev && prev.includes("Hands:")) return prev.replace(/Hands: [^.]+(\.)?/, handsErrorPart + '.');
                        if (prev && !prev.endsWith('.')) return `${prev}. ${handsErrorPart}`;
                        if (prev) return `${prev} ${handsErrorPart}`;
                        return `Failed to start: ${handsErrorPart}`;
                    });
                }
            };
            startHandsAsync();
        }
    }, [cam?.isOn, cam?.stream, hands, hands?.isTracking, attemptedHandsStartInCycle, videoElementForHandsInternalRef]);

    useEffect(() => {
        if (cam && !cam.isOn) {
            setAttemptedHandsStartInCycle(false);
        }
    }, [cam, cam?.isOn]);

    const stopMedia = useCallback(() => {
        if (mic?.isRecording()) mic.stop();
        if (cam?.isOn) cam.stopCamera();
        if (hands?.isTracking) hands.stopTracking();
        setMediaOrchestrationError(null);
        setCurrentAudioError(null);
        setCurrentVideoError(null);
        setCurrentHandsError(null);
        setIsStarting(false);
    }, [mic, cam, hands]);

    const toggleMedia = useCallback(async () => {
        if (isAudioActive && isVideoActive) {
            stopMedia();
        } else {
            await startMedia();
        }
    }, [isAudioActive, isVideoActive, startMedia, stopMedia]);

    const contextValue = useMemo<MediaContextType>(() => {
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
        }
    }, [
        isAudioActive, isVideoActive, isHandTrackingActive, isMediaActive,
        audioStream, videoStream, videoFacingMode, currentHandsData,
        currentAudioError, currentVideoError, currentHandsError, mediaOrchestrationError,
        startMedia, stopMedia, toggleMedia,
        cam, mic, hands, setVideoElementForHands
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
