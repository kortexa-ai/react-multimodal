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
import type {
    BodyTrackingDeviceProps,
    BodyTrackingControl,
    BodyData,
} from "../body/types";
import type {
    FaceTrackingDeviceProps,
    FaceTrackingControl,
    FaceData,
} from "../face/types";

export interface CompositeMediaDevice {
    isAudioActive: boolean;
    isVideoActive: boolean;
    isHandTrackingActive?: boolean;
    isBodyTrackingActive?: boolean;
    isFaceTrackingActive?: boolean;
    isMediaActive: boolean;
    audioStream?: MediaStream;
    videoStream?: MediaStream;
    videoFacingMode?: CameraFacingMode;
    audioError?: string;
    videoError?: string;
    handsError?: string;
    bodyError?: string;
    faceError?: string;
    mediaError?: string;
    currentHandsData?: HandsData;
    currentBodyData?: BodyData;
    currentFaceData?: FaceData;
    startMedia: () => Promise<void>;
    stopMedia: () => void;
    toggleMedia: () => Promise<void>;
    // Individual controls might be better handled directly on cam/mic objects
}

export interface CompositeMediaControl extends CompositeMediaDevice {
    cam: CameraControl;
    mic: MicrophoneControl;
    hands: HandsTrackingControl;
    body: BodyTrackingControl;
    face: FaceTrackingControl;
    setVideoElementForHands: (element: HTMLVideoElement | null) => void;
    setVideoElementForBody: (element: HTMLVideoElement | null) => void;
    setVideoElementForFace: (element: HTMLVideoElement | null) => void;
    // New properties for granular control
    startHands: () => Promise<void>;
    stopHands: () => void;
    startBody: () => Promise<void>;
    stopBody: () => void;
    startFace: () => Promise<void>;
    stopFace: () => void;
    isStartingHands: boolean;
    isStartingBody: boolean;
    isStartingFace: boolean;
    isVideoElementForHandsSet: boolean;
    isVideoElementForBodySet: boolean;
    isVideoElementForFaceSet: boolean;
}

export interface CompositeMediaDeviceProps {
    microphoneProps?: MicrophoneDeviceProps;
    cameraProps?: CameraDeviceProps;
    handsProps?: HandsTrackingDeviceProps;
    bodyProps?: BodyTrackingDeviceProps;
    faceProps?: FaceTrackingDeviceProps;
    startBehavior?: "proceed" | "halt";
}

export type CompositeMediaProviderProps = CompositeMediaDeviceProps;
