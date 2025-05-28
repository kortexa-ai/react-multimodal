import { EventDispatcher } from "../utils/EventDispatcher";

// Generic audio events
export type AudioDataHandler = (data?: Float32Array) => void;
export type AudioErrorHandler = (error?: string) => void;
export type AudioLifeCycleHandler = () => void;

// Microphone specific events
export type MicophoneStartHandler = () => void | Promise<void>;
export type MicrophoneStopHandler = () => void;
export type MicrophoneLifeCycleHandler = AudioLifeCycleHandler;
export type MicrophoneDataHandler = AudioDataHandler;
export type MicrophoneErrorHandler = AudioErrorHandler;

export interface MicrophoneDevice {
    isRecording: boolean;
    start: () => Promise<void>;
    stop: () => void;
}

export interface MicrophoneEventMap extends Record<string, unknown> {
    data: Float32Array;
    start: void;
    stop: void;
    error: string;
}

export const microphoneDispatcher = new EventDispatcher<MicrophoneEventMap>();

export interface MicrophoneControl extends MicrophoneDevice {
    addDataListener: (listener: MicrophoneDataHandler) => string;
    removeDataListener: (id: string) => void;
    addStartListener: (listener: MicophoneStartHandler) => string;
    removeStartListener: (id: string) => void;
    addStopListener: (listener: MicrophoneStopHandler) => string;
    removeStopListener: (id: string) => void;
    addErrorListener: (listener: MicrophoneErrorHandler) => string;
    removeErrorListener: (id: string) => void;
}

export interface MicrophoneDeviceProps {
    sampleRate?: number;
    onData?: MicrophoneDataHandler;
    onError?: MicrophoneErrorHandler;
}

export type MicrophoneProviderProps = MicrophoneDeviceProps;
