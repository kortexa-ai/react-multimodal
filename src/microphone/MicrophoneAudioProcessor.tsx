import { useEffect, useRef } from "react";
import type { MicrophoneDataHandler, MicrophoneErrorHandler } from "./types";
import { useMicrophone } from "./hooks/useMicrophone";

export interface MicrophoneAudioProcessorProps {
    onData: MicrophoneDataHandler;
    onError?: MicrophoneErrorHandler;
}

export function MicrophoneAudioProcessor({
    onData,
    onError
}: MicrophoneAudioProcessorProps) {
    // Keep track of our listener IDs
    const audioListenerId = useRef<string | undefined>(undefined);
    const errorListenerId = useRef<string | undefined>(undefined);

    const {
        addDataListener,
        removeDataListener,
        addErrorListener,
        removeErrorListener
    } = useMicrophone();

    useEffect(() => {
        // Only register if we haven't already
        if (!audioListenerId.current) {
            audioListenerId.current = addDataListener(onData);
        }
        if (onError && !errorListenerId.current) {
            errorListenerId.current = addErrorListener(onError);
        }

        return () => {
            if (audioListenerId.current) {
                removeDataListener(audioListenerId.current);
                audioListenerId.current = undefined;
            }
            if (errorListenerId.current) {
                removeErrorListener(errorListenerId.current);
                errorListenerId.current = undefined;
            }
        };
    }, [
        onData,
        onError,
        addDataListener,
        removeDataListener,
        addErrorListener,
        removeErrorListener,
    ]);

    return null;
}