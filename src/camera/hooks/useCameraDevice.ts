// Controls camera device
import { useCallback, useEffect, useState } from "react";
import type {
    CameraFacingMode,
    CameraDevice,
    CameraDeviceProps,
} from "../types";

export const useCameraDevice = ({
    defaultFacingMode = "user",
    defaultDeviceId,
    requestedWidth,
    requestedHeight,
    requestedAspectRatio,
    onStream,
    onError,
}: CameraDeviceProps = {}): CameraDevice => {
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] =
        useState<CameraFacingMode>(defaultFacingMode);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>(
        []
    );
    const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(
        defaultDeviceId
    );

    const getDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(
                (device) => device.kind === "videoinput"
            );
            setAvailableDevices(videoDevices);
            if (videoDevices.length > 0 && !currentDeviceId) {
                // Try to set a default device based on facing mode if no specific ID is given
                const preferredDevice = videoDevices.find((device) => {
                    const deviceFacingMode = device.label
                        .toLowerCase()
                        .includes("front")
                        ? "user"
                        : device.label.toLowerCase().includes("back")
                        ? "environment"
                        : null;
                    return deviceFacingMode === facingMode;
                });
                setCurrentDeviceId(
                    preferredDevice?.deviceId || videoDevices[0].deviceId
                );
            }
        } catch (err) {
            console.error("Error enumerating camera devices:", err);
            onError?.("Error enumerating camera devices.");
        }
    }, [currentDeviceId, facingMode, onError]);

    useEffect(() => {
        getDevices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Call only on mount

    // Effect for mobile default facing mode (can be kept or removed based on preference)
    useEffect(() => {
        if (typeof window !== "undefined" && "ontouchstart" in window) {
            // Only set to environment if it's the initial default and no specific device is set
            if (defaultFacingMode === "user" && !defaultDeviceId) {
                setFacingMode("environment");
            }
        }
    }, [defaultFacingMode, defaultDeviceId]);

    const start = useCallback(
        async (deviceId?: string) => {
            const targetDeviceId = deviceId || currentDeviceId;
            if (!targetDeviceId && availableDevices.length === 0) {
                await getDevices(); // Try to get devices if none are listed
                // If still no devices, or no targetDeviceId, then error
                if (availableDevices.length === 0 || !targetDeviceId) {
                    console.error("No camera devices available or selected.");
                    onError?.("No camera devices available or selected.");
                    return;
                }
            }

            try {
                const videoConstraints: MediaTrackConstraints = {
                    deviceId: targetDeviceId
                        ? { exact: targetDeviceId }
                        : undefined,
                    facingMode: !targetDeviceId ? facingMode : undefined, // Only use facingMode if no specific deviceId
                };

                if (requestedWidth) {
                    videoConstraints.width = { ideal: requestedWidth };
                }
                if (requestedHeight) {
                    videoConstraints.height = { ideal: requestedHeight };
                }
                if (requestedAspectRatio) {
                    videoConstraints.aspectRatio = {
                        ideal: requestedAspectRatio,
                    };
                }

                const constraints: MediaStreamConstraints = {
                    video:
                        Object.keys(videoConstraints).length > 0
                            ? videoConstraints
                            : true,
                };

                const mediaStream = await navigator.mediaDevices.getUserMedia(
                    constraints
                );
                setStream(mediaStream);
                setIsRecording(true);
                onStream?.(mediaStream);
                if (targetDeviceId) setCurrentDeviceId(targetDeviceId);
            } catch (err) {
                console.error("Error accessing camera:", err);
                onError?.(`Error accessing camera: ${(err as Error).message}`);
                // Attempt to start with a different device if the current one fails and others are available
                if (targetDeviceId && availableDevices.length > 1) {
                    const otherDevice = availableDevices.find(
                        (d: MediaDeviceInfo) => d.deviceId !== targetDeviceId
                    );
                    if (otherDevice) {
                        console.log(
                            `Attempting to start with device: ${
                                otherDevice.label || otherDevice.deviceId
                            }`
                        );
                        await start(otherDevice.deviceId);
                    }
                }
            }
        },
        [
            currentDeviceId,
            facingMode,
            onStream,
            onError,
            availableDevices,
            getDevices,
            requestedWidth,
            requestedHeight,
            requestedAspectRatio,
        ]
    );

    const stop = useCallback(() => {
        if (stream) {
            stream
                .getTracks()
                .forEach((track: MediaStreamTrack) => track.stop());
            setStream(null);
            setIsRecording(false);
            onStream?.();
        }
    }, [stream, onStream]);

    const toggle = useCallback(() => {
        if (isRecording) {
            stop();
        } else {
            start();
        }
    }, [isRecording, stop, start]);

    const flip = useCallback(async () => {
        if (!isRecording) return; // Don't flip if camera is off

        const newFacingMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newFacingMode);
        stop(); // Stop current stream

        // Find a device that matches the new facing mode
        const newDevice = availableDevices.find((device: MediaDeviceInfo) => {
            const deviceLabel = device.label.toLowerCase();
            if (newFacingMode === "user")
                return (
                    deviceLabel.includes("front") ||
                    !deviceLabel.includes("back")
                );
            if (newFacingMode === "environment")
                return deviceLabel.includes("back");
            return false;
        });

        if (newDevice) {
            setCurrentDeviceId(newDevice.deviceId);
            await start(newDevice.deviceId);
        } else if (availableDevices.length > 0) {
            // Fallback: if no specific device matches, try starting with the first available that's not the current one
            // Or, if only one device, it might support both modes (though less common for built-in)
            // For simplicity, we'll just try to restart with the new facingMode constraint if no specific device found
            // This relies on the browser picking a suitable camera for the facingMode
            setCurrentDeviceId(undefined); // Let the browser choose based on facingMode
            await start();
        } else {
            onError?.("No alternative camera found for flipping.");
        }
    }, [isRecording, facingMode, stop, start, availableDevices, onError]);

    const setDevice = useCallback(
        async (deviceId: string) => {
            if (deviceId === currentDeviceId && isRecording) return;
            stop();
            setCurrentDeviceId(deviceId);
            await start(deviceId);
        },
        [currentDeviceId, isRecording, stop, start]
    );

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (stream) {
                stream
                    .getTracks()
                    .forEach((track: MediaStreamTrack) => track.stop());
            }
        };
    }, [stream]);

    return {
        stream,
        isRecording,
        facingMode,
        availableDevices,
        currentDeviceId,
        start,
        stop,
        toggle,
        flip,
        setDevice,
        getDevices,
    };
};
