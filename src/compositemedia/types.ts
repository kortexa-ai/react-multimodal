import type {
    MicrophoneControl,
    MicrophoneDeviceProps,
} from "../microphone/types";
import type {
    CameraFacingMode,
    CameraControl,
    CameraDeviceProps,
} from "../camera/types";
import type {
    HandsTrackingDeviceProps,
    HandsTrackingControl,
    HandsData,
} from "../hands/types";

export interface CompositeMediaDevice {
    isAudioActive: boolean;
    isVideoActive: boolean;
    isHandTrackingActive?: boolean;
    isMediaActive: boolean;
    audioStream: MediaStream | null;
    videoStream: MediaStream | null;
    videoFacingMode: CameraFacingMode | undefined;
    audioError?: string | null;
    videoError?: string | null;
    handsError?: string | null;
    mediaError?: string | null;
    currentHandsData?: HandsData | null;
    startMedia: () => Promise<void>;
    stopMedia: () => void;
    toggleMedia: () => Promise<void>;
    // Individual controls might be better handled directly on cam/mic objects
}

export interface CompositeMediaControl extends CompositeMediaDevice {
    cam: CameraControl | null;
    mic: MicrophoneControl | null;
    hands: HandsTrackingControl | null;
    setVideoElementForHands: (element: HTMLVideoElement | null) => void;
    // New properties for granular hand control
    startHands: () => Promise<void>;
    stopHands: () => void;
    isStartingHands: boolean;
    isVideoElementForHandsSet: boolean;
}

export interface CompositeMediaDeviceProps {
    microphoneProps?: MicrophoneDeviceProps;
    cameraProps?: CameraDeviceProps;
    handsProps?: HandsTrackingDeviceProps;
    startBehavior?: "proceed" | "halt";
}

export type CompositeMediaProviderProps = CompositeMediaDeviceProps;
