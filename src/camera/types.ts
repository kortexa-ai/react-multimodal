export type FacingMode = 'user' | 'environment';

export interface CameraState {
    isOn: boolean;
    stream: MediaStream | null;
    facingMode: FacingMode;
    availableDevices: MediaDeviceInfo[];
    currentDeviceId: string | undefined;
}

export interface CameraControls {
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    toggleCamera: () => void;
    flipCamera: () => void;
    setDevice: (deviceId: string) => void;
}

export interface CameraContextType extends CameraState, CameraControls {
    addStreamChangedListener: (listener: (stream: MediaStream | null) => void) => string;
    removeStreamChangedListener: (id: string) => void;
    addStartedListener: (listener: () => void) => string;
    removeStartedListener: (id: string) => void;
    addStoppedListener: (listener: () => void) => string;
    removeStoppedListener: (id: string) => void;
    addFacingModeChangedListener: (listener: (mode: FacingMode) => void) => string;
    removeFacingModeChangedListener: (id: string) => void;
    addErrorListener: (listener: (error: string) => void) => string;
    removeErrorListener: (id: string) => void;
}

export type CameraStreamHandler = (stream: MediaStream | null) => void;
export type CameraFacingModeHandler = (mode: FacingMode) => void;
export type CameraErrorHandler = (error: string) => void;
export type CameraLifeCycleHandler = () => void;
