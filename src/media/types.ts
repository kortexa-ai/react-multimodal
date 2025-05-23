import type {
    FacingMode,
    CameraContextType as ActualCameraControlType,
} from "../camera/types";
import type {
    MicrophoneContextType as ActualMicrophoneControlType,
    UseMicrophoneProps,
} from "../microphone/types";
import type { UseCameraProps } from "../camera/hooks/useCamera";
import type { HandsContextType as ActualHandsControlType, UseHandsProps, HandsData } from "../hands/types";

export interface MediaState {
    isAudioActive: boolean;
    isVideoActive: boolean;
    isHandTrackingActive?: boolean;
    isMediaActive: boolean;
    audioStream: MediaStream | null;
    videoStream: MediaStream | null;
    videoFacingMode: FacingMode | undefined;
    audioError?: string | null;
    videoError?: string | null;
    handsError?: string | null;
    mediaError?: string | null;
    currentHandsData?: HandsData | null;
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
    hands: ActualHandsControlType | null;
    setVideoElementForHands: (element: HTMLVideoElement | null) => void;
    // New properties for granular hand control
    startHands: () => Promise<void>;
    stopHands: () => void;
    isStartingHands: boolean;
    isVideoElementForHandsSet: boolean;
}

export interface MediaProviderProps {
    children?: React.ReactNode;
    microphoneProps?: UseMicrophoneProps;
    cameraProps?: UseCameraProps;
    handsProps?: UseHandsProps;
    startBehavior?: "proceed" | "halt";
}
