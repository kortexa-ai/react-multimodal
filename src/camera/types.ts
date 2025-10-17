// import type { Context, ReactNode } from "react";
import { EventDispatcher } from "../utils/EventDispatcher";

// Generic video events
export type VideoStreamHandler = (stream?: MediaStream) => void;
export type VideoErrorHandler = (error?: string) => void;
export type VideoLifeCycleHandler = () => void;

// Camera specific events
export type CameraFacingMode = "user" | "environment";

export type CameraStartHandler = () => void;
export type CameraStopHandler = () => void;
export type CameraLifeCycleHandler = VideoLifeCycleHandler;
export type CameraFacingModeHandler = (mode?: CameraFacingMode) => void;
export type CameraStreamHandler = VideoStreamHandler;
export type CameraErrorHandler = VideoErrorHandler;

export interface CameraDevice {
    isRecording: boolean;
    stream: MediaStream | null;
    facingMode: CameraFacingMode;
    availableDevices: MediaDeviceInfo[];
    currentDeviceId: string | undefined;
    start: (
        deviceId?: string,
        overrideFacingMode?: CameraFacingMode
    ) => Promise<boolean>;
    stop: () => void;
    toggle: () => void;
    flip: () => void;
    getDevices: () => Promise<void>;
    setDevice: (deviceId: string) => void;
}

export interface CameraEventMap extends Record<string, unknown> {
    stream: MediaStream;
    start: void;
    stop: void;
    facingMode: CameraFacingMode;
    error: string;
}

export const cameraDispatcher = new EventDispatcher<CameraEventMap>();

export interface CameraControl extends CameraDevice {
    addStreamListener: (listener: CameraStreamHandler) => string;
    removeStreamListener: (id: string) => void;
    addStartListener: (listener: CameraStartHandler) => string;
    removeStartListener: (id: string) => void;
    addStopListener: (listener: CameraStopHandler) => string;
    removeStopListener: (id: string) => void;
    addFacingModeListener: (listener: CameraFacingModeHandler) => string;
    removeFacingModeListener: (id: string) => void;
    addErrorListener: (listener: CameraErrorHandler) => string;
    removeErrorListener: (id: string) => void;
}

export interface CameraDeviceProps {
    defaultFacingMode?: CameraFacingMode;
    defaultDeviceId?: string;
    requestedWidth?: number;
    requestedHeight?: number;
    requestedAspectRatio?: number;
    onStream?: CameraStreamHandler;
    onError?: CameraErrorHandler;
}

export type CameraProviderProps = CameraDeviceProps;
