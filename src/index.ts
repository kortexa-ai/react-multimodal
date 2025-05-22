// Media - Combined Provider & Hook
export { MediaProvider } from "./media/MediaProvider";
export { useMediaControl } from "./media/hooks/useMediaControl";
export type {
    MediaState,
    MediaControls,
    MediaContextType,
    MediaProviderProps,
} from "./media/mediaTypes";

// Audio - Provider, Hook & Core Types
export { MicrophoneProvider } from "./microphone/MicrophoneProvider";
export { useMicrophoneControl } from "./microphone/hooks/useMicrophoneControl";
export { useMicrophone } from "./microphone/hooks/useMicrophone";
export type {
    MicrophoneProviderProps,
    UseMicrophoneProps,
    MicrophoneContextType as AudioContextType,
    MicrophoneMethods,
} from "./microphone/types";

// Video - Provider, Hook & Core Types
export { CameraProvider } from "./camera/CameraProvider";
export { useCameraControl } from "./camera/hooks/useCameraControl";
export { useCamera } from "./camera/useCamera";
export type { CameraProviderProps } from "./camera/CameraProvider";
export type {
    CameraState,
    CameraControls,
    CameraContextType,
    FacingMode,
} from "./camera/types";
export type { UseCameraProps } from "./camera/useCamera";

// Hands - Provider, Hook & Core Types
export { HandsProvider } from "./hands/HandsProvider";
export type { HandsProviderProps } from "./hands/HandsProvider";
export { useHandsControl } from "./hands/hooks/useHandsControl";
export { useHands } from "./hands/HandsProvider"; // Consumer hook
export type {
    UseHandsProps,
    HandsContextType,
    HandsData,
    DetectedHand,
    HandLandmark,
    Handedness,
    MediaPipeHandsOptions,
    MediaPipeHandsResults
} from "./hands/types";
