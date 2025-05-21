// Media - Combined Provider & Hook
export { MediaProvider } from './media/MediaProvider';
export { useMediaControl } from './media/hooks/useMediaControl';
export type {
    MediaState,
    MediaControls,
    MediaContextType,
    MediaProviderProps
} from './media/mediaTypes';

// Audio - Provider, Hook & Core Types
export { MicrophoneProvider } from './audio/MicrophoneProvider';
export { useMicrophoneControl } from './audio/hooks/useMicrophoneControl';
export { useMicrophone } from './audio/hooks/useMicrophone';
export type {
    MicrophoneProviderProps,
    UseMicrophoneProps,
    MicrophoneContextType as AudioContextType,
    MicrophoneMethods
} from './audio/types';

// Video - Provider, Hook & Core Types
export { CameraProvider } from './video/CameraProvider';
export { useCameraControl } from './video/hooks/useCameraControl';
export { useCamera } from './video/useCamera';
export type { CameraProviderProps } from './video/CameraProvider'; 
export type {
    CameraState,
    CameraControls,
    CameraContextType,
    FacingMode
} from './video/types';
export type { UseCameraProps } from './video/useCamera';