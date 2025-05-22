import type {
    FacingMode,
    CameraContextType as ActualCameraControlType,
} from "../camera/types";
import type {
    UseMicrophoneProps,
    MicrophoneContextType as ActualMicrophoneControlType,
} from "../microphone/types";
import type { UseCameraProps } from "../camera/useCamera";
import type { HandsContextType as ActualHandsControlType, UseHandsProps } from "../hands/types";

export interface MediaState {
    isAudioActive: boolean;
    isVideoActive: boolean;
    isMediaActive: boolean;
    audioStream: MediaStream | null;
    videoStream: MediaStream | null;
    videoFacingMode: FacingMode | undefined;
    audioError?: string | null;
    videoError?: string | null;
    mediaError?: string | null;
}

export interface MediaControls {
    startMedia: () => Promise<void>;
    stopMedia: () => void;
    toggleMedia: () => Promise<void>;
    // Individual controls might be better handled directly on cam/mic objects
}

export interface MediaContextType extends MediaState, MediaControls {
    cam: ActualCameraControlType | null;
    mic: ActualMicrophoneControlType | null;
    hands?: ActualHandsControlType | null;
}

export interface MediaProviderProps {
    children?: React.ReactNode;
    microphoneProps?: UseMicrophoneProps;
    cameraProps?: UseCameraProps;
    handsProps?: UseHandsProps;
    startBehavior?: "proceed" | "halt";
}
