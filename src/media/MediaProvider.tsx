import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';

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

    const [mediaOrchestrationError, setMediaOrchestrationError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [currentAudioError, setCurrentAudioError] = useState<string | null | undefined>(null);
    const [currentVideoError, setCurrentVideoError] = useState<string | null | undefined>(null);

    useEffect(() => {
        const errorListenerId = mic.addErrorListener(setCurrentAudioError);
        return () => mic.removeErrorListener(errorListenerId);
    }, [mic]);

    useEffect(() => {
        const errorListenerId = cam.addErrorListener(setCurrentVideoError);
        return () => cam.removeErrorListener(errorListenerId);
    }, [cam]);

    const isAudioActive = mic.isRecording();
    const isVideoActive = cam.isOn;
    const isMediaActive = isAudioActive && isVideoActive;

    const audioStream = null;
    const videoStream = cam.stream;
    const videoFacingMode = cam.facingMode;

    const startMedia = useCallback(async () => {
        if (isStarting || (isAudioActive && isVideoActive)) return;

        setIsStarting(true);
        setMediaOrchestrationError(null);
        // Keep currentAudioError and currentVideoError for persistent listener-based errors
        // but we'll rely on direct try-catch for startMedia's immediate error reporting.

        let micAttemptOk = isAudioActive;
        let camAttemptOk = isVideoActive;
        let micStartError: string | null = null;
        let camStartError: string | null = null;

        if (!isAudioActive) {
            try {
                await mic.start();
                micAttemptOk = true; // If no error, attempt was successful
            } catch (err) {
                micAttemptOk = false;
                micStartError = err instanceof Error ? err.message : String(err);
            }
        }

        if (!isVideoActive) {
            try {
                await cam.startCamera();
                camAttemptOk = true; // If no error, attempt was successful
            } catch (err) {
                camAttemptOk = false;
                camStartError = err instanceof Error ? err.message : String(err);
            }
        }

        // After attempts, check actual state for halt behavior if needed,
        // but use attemptOk for error messaging.
        const finalMicOk = mic.isRecording();
        const finalCamOk = cam.isOn;

        if (startBehavior === 'halt') {
            if (!micAttemptOk || !camAttemptOk) {
                // If halt and any attempt failed, stop everything that might have started.
                const micErrMsg = micStartError || (micAttemptOk ? '' : 'Failed to start');
                const camErrMsg = camStartError || (camAttemptOk ? '' : 'Failed to start');
                setMediaOrchestrationError(
                    `Media start halted: Mic ${micAttemptOk ? 'OK' : `FAIL (${micErrMsg})`}. Cam ${camAttemptOk ? 'OK' : `FAIL (${camErrMsg})`}.`
                );
                if (mic.isRecording()) mic.stop(); // Stop if it managed to start despite error or before halt
                if (cam.isOn) cam.stopCamera(); // Stop if it managed to start despite error or before halt
                setIsStarting(false);
                return;
            }
        } else { // 'proceed' behavior
            if (!micAttemptOk && !camAttemptOk) {
                setMediaOrchestrationError(`Both microphone and camera failed to start. Mic: ${micStartError || 'Unknown'}. Cam: ${camStartError || 'Unknown'}`);
            } else if (!micAttemptOk) {
                setMediaOrchestrationError(`Microphone failed to start: ${micStartError || 'Unknown'}. Camera ${finalCamOk ? 'proceeded' : 'status unknown'}.`);
            } else if (!camAttemptOk) {
                setMediaOrchestrationError(`Camera failed to start: ${camStartError || 'Unknown'}. Microphone ${finalMicOk ? 'proceeded' : 'status unknown'}.`);
            }
            // If both micAttemptOk and camAttemptOk are true, no error message is set.
        }

        setIsStarting(false);
    }, [isStarting, isAudioActive, isVideoActive, mic, cam, startBehavior]);

    const stopMedia = useCallback(() => {
        if (mic.isRecording()) {
            mic.stop();
        }
        if (cam.isOn) {
            cam.stopCamera();
        }
        setMediaOrchestrationError(null);
        setCurrentAudioError(null);
        setCurrentVideoError(null);
        setIsStarting(false);
    }, [mic, cam]);

    const toggleMedia = useCallback(async () => {
        if (isMediaActive) {
            stopMedia();
        } else {
            await startMedia();
        }
    }, [isMediaActive, startMedia, stopMedia]);

    const contextValue = useMemo<MediaContextType>(() => ({
        isAudioActive,
        isVideoActive,
        isMediaActive,
        audioStream,
        videoStream,
        videoFacingMode,
        audioError: currentAudioError,
        videoError: currentVideoError,
        mediaError: mediaOrchestrationError,
        startMedia,
        stopMedia,
        toggleMedia,
        cam,
        mic,
        hands,
    }), [
        isAudioActive, isVideoActive, isMediaActive,
        audioStream, videoStream, videoFacingMode,
        currentAudioError, currentVideoError, mediaOrchestrationError,
        startMedia, stopMedia, toggleMedia,
        cam, mic, hands
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
                    <InternalMediaOrchestrator startBehavior={startBehavior}>
                        {children}
                    </InternalMediaOrchestrator>
                </HandsProvider>
            </CameraProvider>
        </MicrophoneProvider>
    );
}
