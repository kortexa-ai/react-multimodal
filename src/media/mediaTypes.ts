import type { FacingMode } from '../video/types';
import type { UseMicrophoneProps } from '../audio/types';
import type { UseCameraProps } from '../video/useCamera';

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
}

export interface MediaContextType extends MediaState, MediaControls {}

export interface MediaProviderProps {
    children?: React.ReactNode;
    microphoneProps?: UseMicrophoneProps;
    cameraProps?: UseCameraProps;
    startBehavior?: 'proceed' | 'halt';
}
