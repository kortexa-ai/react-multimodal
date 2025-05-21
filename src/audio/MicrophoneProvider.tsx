import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { MicrophoneContext } from './context';
import { useMicrophone } from './hooks/useMicrophone';
import { microphoneDispatcher } from '../utils/EventDispatcher';
import type { MicrophoneDataHandler } from './types';

export interface MicrophoneProviderProps {
    children?: ReactNode;
}

export function MicrophoneProvider({ children }: MicrophoneProviderProps) {
    const { 
        isRecording: micIsRecording,
        start: micStart,
        stop: micStop
    } = useMicrophone();

    const start = useCallback(async () => {
        try {
            if (!micIsRecording) {
                await micStart();
                await microphoneDispatcher.dispatch('start');
            }
        } catch (err) {
            const errorMessage = 'Failed to start microphone' + err;
            microphoneDispatcher.dispatch('error', errorMessage);
        }
    }, [micIsRecording, micStart]);

    const stop = useCallback(() => {
        try {
            if (micIsRecording) {
                microphoneDispatcher.dispatch('stop');
                micStop();
            }
        } catch {
            const errorMessage = 'Failed to stop microphone';
            microphoneDispatcher.dispatch('error', errorMessage);
        }
    }, [micIsRecording, micStop]);

    const isRecording = useCallback((): boolean => {
        return micIsRecording;
    }, [micIsRecording]);

    const addAudioDataListener = useCallback((listener: MicrophoneDataHandler) => {
        const id = `audio-${Date.now()}`;
        microphoneDispatcher.addListener('audioData', { id, listener });
        return id;
    }, []);

    const removeAudioDataListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('audioData', id);
    }, []);

    const addStartListener = useCallback((listener: () => void | Promise<void>) => {
        const id = `start-${Date.now()}`;
        microphoneDispatcher.addListener('start', { id, listener });
        return id;
    }, []);

    const removeStartListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('start', id);
    }, []);

    const addStopListener = useCallback((listener: () => void) => {
        const id = `stop-${Date.now()}`;
        microphoneDispatcher.addListener('stop', { id, listener });
        return id;
    }, []);

    const removeStopListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('stop', id);
    }, []);

    const addErrorListener = useCallback((listener: (error?: string) => void) => {
        const id = `error-${Date.now()}`;
        microphoneDispatcher.addListener('error', { id, listener });
        return id;
    }, []);

    const removeErrorListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('error', id);
    }, []);

    // Clean up all listeners when provider unmounts
    useEffect(() => {
        return () => {
            microphoneDispatcher.clear();
        };
    }, []);

    const value = useMemo(() => ({
        isRecording,
        start,
        stop,
        addAudioDataListener,
        removeAudioDataListener,
        addStartListener,
        removeStartListener,
        addStopListener,
        removeStopListener,
        addErrorListener,
        removeErrorListener
    }), [
        isRecording,
        start,
        stop,
        addAudioDataListener,
        removeAudioDataListener,
        addStartListener,
        removeStartListener,
        addStopListener,
        removeStopListener,
        addErrorListener,
        removeErrorListener
    ]);

    return (
        <MicrophoneContext.Provider value={value}>
            {children}
        </MicrophoneContext.Provider>
    );
}