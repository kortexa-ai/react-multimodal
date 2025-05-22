// types.ts
import type { Context, ReactNode } from 'react';

export type AudioDataHandler = (data?: Float32Array) => void;
export type AudioErrorHandler = (error?: string) => void;

export type MicrophoneMethods = {
    isRecording: boolean;
    start: () => void;
    stop: () => void;
    addListener: (listener: MicrophoneDataHandler) => string;
    removeListener: (id: string) => void;
};

export interface MicrophoneProviderProps {
    children: ReactNode;
    sampleRate?: number;
}

// Types for the handlers
export type MicrophoneDataHandler = AudioDataHandler;
export type MicophoneStartHandler = () => void | Promise<void>;
export type MicrophoneStopHandler = () => void;
export type MicrophoneErrorHandler = AudioErrorHandler;

export interface MicrophoneContextType {
    // Basic controls
    start: () => Promise<void>;
    stop: () => void;
    isRecording: () => boolean;

    // Listeners registration
    addAudioDataListener: (listener: MicrophoneDataHandler) => string;  // returns listener id
    removeAudioDataListener: (id: string) => void;
    addStartListener: (listener: MicophoneStartHandler) => string;
    removeStartListener: (id: string) => void;
    addStopListener: (listener: MicrophoneStopHandler) => string;
    removeStopListener: (id: string) => void;
    addErrorListener: (listener: MicrophoneErrorHandler) => string;
    removeErrorListener: (id: string) => void;
}

export type MicrophoneContext = Context<MicrophoneContextType>;

export interface UseMicrophoneProps {
    sampleRate?: number;
    // Optional: direct callbacks if not relying solely on dispatcher
    onStarted?: () => void; 
    onStopped?: () => void;
    onError?: (error: string) => void;
}
