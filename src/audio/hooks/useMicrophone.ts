// Provides microphone access and audio data distribution
import { useCallback, useEffect, useRef } from 'react';
import { microphoneDispatcher} from '../../utils/EventDispatcher';
import { useAudioWorklet } from './useAudioWorklet';
import type { MicrophoneDataHandler, MicrophoneMethods } from '../types';
import { SAMPLE_RATE } from '../AudioWorklet';

// IMPORTANT: Move counter into the module scope but make it private
let _listenerIdCounter = 0;
const generateListenerId = () => `microphone-${_listenerIdCounter++}`;

export function useMicrophone(
    sampleRate: number = SAMPLE_RATE
): MicrophoneMethods {
    // IMPORTANT: These refs store callback props and IDs to prevent recreation
    // of functions and ensure proper cleanup
    const baseListenerId = useRef(generateListenerId());
    const activeListeners = useRef(new Set<string>());

    const handleAudioData = useCallback((data?: Float32Array) => {
        if (data) microphoneDispatcher.dispatch("audioData", data);
    }, []);

    const handleAudioError = useCallback((err?: string) => {
        if (err) microphoneDispatcher.dispatch('error', err);
    }, []);

    const { 
        isActive,
        start,
        stop
    } = useAudioWorklet(
        handleAudioData,
        handleAudioError,
        sampleRate
    );

    const addListener = useCallback((onAudioData: MicrophoneDataHandler) => {
        const id = `${baseListenerId.current}-${Date.now()}`;
        const listener = { id, listener: onAudioData };
        
        microphoneDispatcher.addListener("audioData", listener);
        activeListeners.current.add(id);
        
        return id;
    }, []); // No dependencies needed as it uses refs

    const removeListener = useCallback((id: string) => {
        microphoneDispatcher.removeListener("audioData", id);
        activeListeners.current.delete(id);
    }, []); // No dependencies needed

    // IMPORTANT: Capture activeListeners.current in effect scope to avoid stale ref in cleanup.
    // This is a React-specific pattern - the cleanup function could run much later and
    // the ref value might have changed, so we need to use the value from when the effect ran.
    useEffect(() => {
        const listeners = activeListeners.current;
        
        return () => {
            stop();
            listeners.forEach(id => {
                microphoneDispatcher.removeListener("audioData", id);
            });
            listeners.clear();
        };
    }, [stop]);

    return {
        isRecording: isActive,
        start,
        stop,
        addListener,
        removeListener
    };
}