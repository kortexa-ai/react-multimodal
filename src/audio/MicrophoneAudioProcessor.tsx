import { useEffect, useRef } from "react";
import type { MicrophoneDataHandler, MicrophoneErrorHandler } from "./types";
import { useMicrophoneControl } from "./hooks/useMicrophoneControl";

export interface MicrophoneAudioProcessorProps {
    onAudioData: MicrophoneDataHandler;
    onError?: MicrophoneErrorHandler;
}

export function MicrophoneAudioProcessor({ 
    onAudioData, 
    onError
}: MicrophoneAudioProcessorProps) {
    // Keep track of our listener IDs
    const audioListenerId = useRef<string | undefined>(undefined);
    const errorListenerId = useRef<string | undefined>(undefined);

    const { 
        addAudioDataListener, 
        removeAudioDataListener, 
        addErrorListener, 
        removeErrorListener 
    } = useMicrophoneControl();

    useEffect(() => {
        // Only register if we haven't already
        if (!audioListenerId.current) {
            audioListenerId.current = addAudioDataListener(onAudioData);
        }
        if (onError && !errorListenerId.current) {
            errorListenerId.current = addErrorListener(onError);
        }

        return () => {
            if (audioListenerId.current) {
                removeAudioDataListener(audioListenerId.current);
                audioListenerId.current = undefined;
            }
            if (errorListenerId.current) {
                removeErrorListener(errorListenerId.current);
                errorListenerId.current = undefined;
            }
        };
    }, [
        addAudioDataListener,
        removeAudioDataListener,
        onAudioData,
        addErrorListener,
        removeErrorListener,
        onError
    ]);

    return null;
}