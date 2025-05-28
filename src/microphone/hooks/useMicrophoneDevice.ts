// Manages audio context and worklet lifecycle
import { useState, useRef, useCallback, useEffect } from "react";
import { createWorkletUrl, PROCESSOR_NAME, SAMPLE_RATE } from "../AudioWorklet";
import type { MicrophoneDevice, MicrophoneDeviceProps } from "../types";

export function useMicrophoneDevice({
    sampleRate = SAMPLE_RATE,
    onData,
    onError,
}: MicrophoneDeviceProps): MicrophoneDevice {
    const [isRecording, setIsRecording] = useState(false);
    const cleanupInProgress = useRef(false);

    // IMPORTANT: These refs store mutable references to DOM/Web APIs
    // They persist across renders and are cleaned up manually
    const audioContext = useRef<AudioContext>(undefined);
    const stream = useRef<MediaStream>(undefined);
    const workletNode = useRef<AudioWorkletNode>(undefined);
    const sourceNode = useRef<MediaStreamAudioSourceNode>(undefined);

    // IMPORTANT: These refs store the callback props to prevent recreation of cleanup/start
    // functions when the callbacks change. This is crucial because:
    // 1. Prevents unnecessary recreation of the cleanup function
    // 2. Prevents cleanup function from being reinstalled in useEffect
    // 3. Breaks the dependency chain that could cause start() to be recreated
    const onDataRef = useRef(onData);
    const onErrorRef = useRef(onError);

    // Update callback refs when props change
    useEffect(() => {
        onDataRef.current = onData;
        onErrorRef.current = onError;
    }, [onData, onError]);

    const stop = useCallback(() => {
        if (cleanupInProgress.current) return;
        cleanupInProgress.current = true;

        try {
            // Stop all media tracks
            if (stream.current) {
                const tracks = stream.current.getTracks();
                tracks.forEach((track) => track.stop());
                stream.current = undefined;
            }

            // Disconnect and cleanup source node
            if (sourceNode.current) {
                sourceNode.current.disconnect();
                sourceNode.current = undefined;
            }

            // Remove message handler and disconnect worklet
            if (workletNode.current) {
                workletNode.current.port.onmessage = null;
                workletNode.current.disconnect();
                workletNode.current = undefined;
            }

            // Close audio context
            if (audioContext.current?.state !== "closed") {
                audioContext.current?.close();
                audioContext.current = undefined;
            }
        } catch (err) {
            console.error("Error closing audio context:", err);
            onErrorRef.current?.("Failed to close audio context");
        } finally {
            setIsRecording(false);
            cleanupInProgress.current = false;
        }
    }, []); // No dependencies needed since we use refs

    const start = useCallback(async () => {
        // Ensure clean slate before starting
        if (isRecording) {
            stop();
        }

        try {
            if (
                !audioContext.current ||
                audioContext.current.state === "closed"
            ) {
                audioContext.current = new AudioContext({ sampleRate });
            }

            if (audioContext.current.state === "suspended") {
                await audioContext.current.resume();
            }

            // Load worklet directly from the code string
            await audioContext.current.audioWorklet.addModule(
                // `data:application/javascript;base64,${btoa(WORKLET_CODE)}`
                createWorkletUrl()
            );

            stream.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            sourceNode.current = audioContext.current.createMediaStreamSource(
                stream.current
            );
            workletNode.current = new AudioWorkletNode(
                audioContext.current,
                PROCESSOR_NAME
            );

            // IMPORTANT: Use the ref for onAudioData to ensure we always have the latest callback
            // without causing the entire chain to recreate when the callback changes
            workletNode.current.port.onmessage = (event) => {
                onDataRef.current?.(new Float32Array(event.data));
            };

            sourceNode.current.connect(workletNode.current);
            workletNode.current.connect(audioContext.current.destination);
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting audio:", err);
            onErrorRef.current?.("Failed to access microphone");
            stop();
        }
    }, [sampleRate, stop, isRecording]);

    // Cleanup only when hook unmounts, not on every callback change
    useEffect(() => {
        return stop;
    }, [stop]);

    return {
        isRecording,
        start,
        stop,
    };
}
