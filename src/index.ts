// Media - Combined Provider & Hook
export type {
    CompositeMediaDevice,
    CompositeMediaControl,
    CompositeMediaProviderProps,
} from "./compositemedia/types";
export { useCompositeMedia } from "./compositemedia/hooks/useCompositeMedia";
export { CompositeMediaProvider } from "./compositemedia/CompositeMediaProvider";

// Audio - Provider, Hook & Core Types
export type {
    MicrophoneDeviceProps,
    MicrophoneDevice,
    MicrophoneControl,
    MicrophoneProviderProps,
} from "./microphone/types";
export { useMicrophoneDevice } from "./microphone/hooks/useMicrophoneDevice";
export { useMicrophone } from "./microphone/hooks/useMicrophone";
export { MicrophoneProvider } from "./microphone/MicrophoneProvider";

// Video - Provider, Hook & Core Types
export type {
    CameraFacingMode,
    CameraDeviceProps,
    CameraDevice,
    CameraControl,
    CameraProviderProps,
} from "./camera/types";
export { useCameraDevice } from "./camera/hooks/useCameraDevice";
export { useCamera } from "./camera/hooks/useCamera";
export { CameraProvider } from "./camera/CameraProvider";

// Hands - Provider, Hook & Core Types
export type {
    HandsTrackingDeviceProps,
    HandsTrackingDevice,
    HandsTrackingControl,
    HandsData,
    DetectedHand,
    HandLandmark,
    Handedness,
    MediaPipeHandsOptions,
    MediaPipeHandsResults,
    HandsProviderProps,
} from "./hands/types";
export { useHandsTracking as useHands } from "./hands/hooks/useHandsTracking";
export { useHandsTrackingDevice as useHandsControl } from "./hands/hooks/useHandsTrackingDevice";
export { HandsProvider } from "./hands/HandsProvider";

// Body - Provider, Hook & Core Types
export type {
    BodyTrackingDeviceProps,
    BodyTrackingDevice,
    BodyTrackingControl,
    BodyData,
    DetectedBody,
    BodyLandmark,
    MediaPipeBodyOptions,
    MediaPipeBodyResults,
    BodyProviderProps,
} from "./body/types";
export { useBodyTrackingDevice as useBodyControl } from "./body/hooks/useBodyTrackingDevice";
export { BodyProvider } from "./body/BodyProvider";

// Face - Provider, Hook & Core Types
export type {
    FaceTrackingDeviceProps,
    FaceTrackingDevice,
    FaceTrackingControl,
    FaceData,
    DetectedFace,
    FaceLandmark,
    MediaPipeFaceOptions,
    MediaPipeFaceResults,
    FaceProviderProps,
} from "./face/types";
export { useFaceTrackingDevice as useFaceControl } from "./face/hooks/useFaceTrackingDevice";
export { FaceProvider } from "./face/FaceProvider";
