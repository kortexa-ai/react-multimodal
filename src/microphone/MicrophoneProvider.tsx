import { useCallback, useEffect, useMemo, type PropsWithChildren } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MicrophoneContext } from './context';
import { useMicrophoneDevice } from './hooks/useMicrophoneDevice';
import { microphoneDispatcher } from './types';
import type {
    MicrophoneControl,
    MicrophoneDataHandler,
    MicrophoneDeviceProps
} from './types';

export function MicrophoneProvider({ children, ...useMicrophoneProps }: PropsWithChildren<MicrophoneDeviceProps>) {
    const {
        isRecording,
        start: micStart,
        stop: micStop
    } = useMicrophoneDevice({
        ...useMicrophoneProps,
        onData: (data) => {
            useMicrophoneProps.onData?.(data);
            microphoneDispatcher.dispatch('data', data);
        },
        onError: (error) => {
            useMicrophoneProps.onError?.(error);
            microphoneDispatcher.dispatch('error', error);
        }
    });

    const start = useCallback(async () => {
        try {
            if (!isRecording) {
                await micStart();
                await microphoneDispatcher.dispatch('start');
            }
        } catch (e) {
            let errorMessageText = 'Failed to start microphone';
            if (e instanceof Error) {
                errorMessageText += ': ' + e.message;
            } else {
                errorMessageText += ': ' + String(e);
            }
            microphoneDispatcher.dispatch('error', errorMessageText);
            throw e;
        }
    }, [isRecording, micStart]);

    const stop = useCallback(() => {
        try {
            if (isRecording) {
                microphoneDispatcher.dispatch('stop');
                micStop();
            }
        } catch {
            const errorMessage = 'Failed to stop microphone';
            microphoneDispatcher.dispatch('error', errorMessage);
        }
    }, [isRecording, micStop]);

    const addDataListener = useCallback((listener: MicrophoneDataHandler) => {
        const id = `kortexa-microphone-data-${uuidv4()}`;
        microphoneDispatcher.addListener('data', { id, listener });
        return id;
    }, []);

    const removeDataListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('data', id);
    }, []);

    const addStartListener = useCallback((listener: () => void | Promise<void>) => {
        const id = `kortexa-microphone-start-${uuidv4()}`;
        microphoneDispatcher.addListener('start', { id, listener });
        return id;
    }, []);

    const removeStartListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('start', id);
    }, []);

    const addStopListener = useCallback((listener: () => void) => {
        const id = `kortexa-microphone-stop-${uuidv4()}`;
        microphoneDispatcher.addListener('stop', { id, listener });
        return id;
    }, []);

    const removeStopListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener('stop', id);
    }, []);

    const addErrorListener = useCallback((listener: (error?: string) => void) => {
        const id = `kortexa-microphone-error-${uuidv4()}`;
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

    const value = useMemo<MicrophoneControl>(() => ({
        isRecording,
        start,
        stop,
        addDataListener,
        removeDataListener,
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
        addDataListener,
        removeDataListener,
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
