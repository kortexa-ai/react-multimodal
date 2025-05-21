import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';

import { MicrophoneProvider } from '../audio/MicrophoneProvider';
import { useMicrophoneControl } from '../audio/hooks/useMicrophoneControl';

import { CameraProvider } from '../video/CameraProvider';
import { useCameraControl } from '../video/hooks/useCameraControl';

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
        setCurrentAudioError(null);
        setCurrentVideoError(null);

        let micOk = isAudioActive;
        let camOk = isVideoActive;

        if (!isAudioActive) {
            await mic.start();
            micOk = mic.isRecording() && !currentAudioError;
        }

        if (!isVideoActive) {
            await cam.startCamera();
            camOk = cam.isOn && !currentVideoError;
        }

        if (startBehavior === 'halt') {
            if (!micOk || !camOk) {
                const micErrMsg = currentAudioError || (micOk ? '' : 'Failed to start');
                const camErrMsg = currentVideoError || (camOk ? '' : 'Failed to start');
                setMediaOrchestrationError(
                    `Media start halted: Mic ${micOk ? 'OK' : `FAIL (${micErrMsg})`}. Cam ${camOk ? 'OK' : `FAIL (${camErrMsg})`}.`
                );
                if (mic.isRecording()) mic.stop();
                if (cam.isOn) cam.stopCamera();
                setIsStarting(false);
                return;
            }
        } else {
            if (!micOk && !camOk) {
                setMediaOrchestrationError(`Both microphone and camera failed to start. Mic: ${currentAudioError || 'Unknown'}. Cam: ${currentVideoError || 'Unknown'}`);
            } else if (!micOk && isVideoActive) {
                setMediaOrchestrationError(`Microphone failed to start: ${currentAudioError || 'Unknown'}. Camera proceeded.`);
            } else if (!camOk && isAudioActive) {
                setMediaOrchestrationError(`Camera failed to start: ${currentVideoError || 'Unknown'}. Microphone proceeded.`);
            } else if (!micOk && !isVideoActive && camOk) {
                 setMediaOrchestrationError(`Microphone failed to start: ${currentAudioError || 'Unknown'}. Camera started.`);
            } else if (!camOk && !isAudioActive && micOk) {
                 setMediaOrchestrationError(`Camera failed to start: ${currentVideoError || 'Unknown'}. Microphone started.`);
            }
        }

        setIsStarting(false);
    }, [isStarting, isAudioActive, isVideoActive, mic, cam, startBehavior, currentAudioError, currentVideoError]);

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
    }), [
        isAudioActive, isVideoActive, isMediaActive,
        audioStream, videoStream, videoFacingMode,
        currentAudioError, currentVideoError, mediaOrchestrationError,
        startMedia, stopMedia, toggleMedia
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
    startBehavior = DEFAULT_START_BEHAVIOR,
}: MediaProviderProps) {
    return (
        <MicrophoneProvider {...microphoneProps}>
            <CameraProvider {...cameraProps}>
                <InternalMediaOrchestrator startBehavior={startBehavior}>
                    {children}
                </InternalMediaOrchestrator>
            </CameraProvider>
        </MicrophoneProvider>
    );
}
