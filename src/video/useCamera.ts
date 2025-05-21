// This hook will contain the core camera logic
import { useState, useEffect, useCallback } from 'react';
import type { FacingMode } from './types';

export interface UseCameraProps {
    defaultFacingMode?: FacingMode;
    defaultDeviceId?: string;
    onStreamChange?: (stream: MediaStream | null) => void;
    onError?: (error: string) => void;
}

export const useCamera = ({
    defaultFacingMode = 'user',
    defaultDeviceId,
    onStreamChange,
    onError,
}: UseCameraProps = {}) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isOn, setIsOn] = useState(false);
    const [facingMode, setFacingMode] = useState<FacingMode>(defaultFacingMode);
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(defaultDeviceId);

    const getCameraDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setAvailableDevices(videoDevices);
            if (videoDevices.length > 0 && !currentDeviceId) {
                // Try to set a default device based on facing mode if no specific ID is given
                const preferredDevice = videoDevices.find(device => {
                    const deviceFacingMode = device.label.toLowerCase().includes('front') ? 'user' : 
                                             device.label.toLowerCase().includes('back') ? 'environment' : null;
                    return deviceFacingMode === facingMode;
                });
                setCurrentDeviceId(preferredDevice?.deviceId || videoDevices[0].deviceId);
            }
        } catch (err) {
            console.error('Error enumerating camera devices:', err);
            onError?.('Error enumerating camera devices.');
        }
    }, [currentDeviceId, facingMode, onError]);

    useEffect(() => {
        getCameraDevices();
    }, [getCameraDevices]);

    // Effect for mobile default facing mode (can be kept or removed based on preference)
    useEffect(() => {
        if (typeof window !== 'undefined' && 'ontouchstart' in window) {
            // Only set to environment if it's the initial default and no specific device is set
            if (defaultFacingMode === 'user' && !defaultDeviceId) { 
                setFacingMode('environment');
            }
        }
    }, [defaultFacingMode, defaultDeviceId]);

    const startCamera = useCallback(async (deviceId?: string) => {
        const targetDeviceId = deviceId || currentDeviceId;
        if (!targetDeviceId && availableDevices.length === 0) {
            await getCameraDevices(); // Try to get devices if none are listed
            // If still no devices, or no targetDeviceId, then error
            if (availableDevices.length === 0 || !targetDeviceId) {
                 console.error('No camera devices available or selected.');
                 onError?.('No camera devices available or selected.');
                 return;
            }
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
                    facingMode: !targetDeviceId ? facingMode : undefined, // Only use facingMode if no specific deviceId
                    width: { ideal: 1024 },
                    height: { ideal: 1024 },
                },
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setIsOn(true);
            onStreamChange?.(mediaStream);
            // Update currentDeviceId if a new stream started successfully with a deviceId
            if (targetDeviceId) setCurrentDeviceId(targetDeviceId);

        } catch (err) {
            console.error('Error accessing camera:', err);
            onError?.(`Error accessing camera: ${(err as Error).message}`);
            // Attempt to start with a different device if the current one fails and others are available
            if (targetDeviceId && availableDevices.length > 1) {
                const otherDevice = availableDevices.find((d: MediaDeviceInfo) => d.deviceId !== targetDeviceId);
                if (otherDevice) {
                    console.log(`Attempting to start with device: ${otherDevice.label || otherDevice.deviceId}`);
                    await startCamera(otherDevice.deviceId); // Recursive call with a different device
                }
            }
        }
    }, [currentDeviceId, facingMode, onStreamChange, onError, availableDevices, getCameraDevices]);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            setStream(null);
            setIsOn(false);
            onStreamChange?.(null);
        }
    }, [stream, onStreamChange]);

    const flipCamera = useCallback(async () => {
        if (!isOn) return; // Don't flip if camera is off

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);
        stopCamera(); // Stop current stream

        // Find a device that matches the new facing mode
        const newDevice = availableDevices.find((device: MediaDeviceInfo) => {
            const deviceLabel = device.label.toLowerCase();
            if (newFacingMode === 'user') return deviceLabel.includes('front') || !deviceLabel.includes('back');
            if (newFacingMode === 'environment') return deviceLabel.includes('back');
            return false;
        });

        if (newDevice) {
            setCurrentDeviceId(newDevice.deviceId);
            await startCamera(newDevice.deviceId);
        } else if (availableDevices.length > 0) {
            // Fallback: if no specific device matches, try starting with the first available that's not the current one
            // Or, if only one device, it might support both modes (though less common for built-in)
            // For simplicity, we'll just try to restart with the new facingMode constraint if no specific device found
            // This relies on the browser picking a suitable camera for the facingMode
            setCurrentDeviceId(undefined); // Let the browser choose based on facingMode
            await startCamera(); 
        } else {
            onError?.('No alternative camera found for flipping.');
        }
    }, [isOn, facingMode, stopCamera, startCamera, availableDevices, onError]);

    const setDevice = useCallback(async (deviceId: string) => {
        if (deviceId === currentDeviceId && isOn) return;
        stopCamera();
        setCurrentDeviceId(deviceId);
        await startCamera(deviceId);
    }, [currentDeviceId, isOn, stopCamera, startCamera]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (stream) {
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
        };
    }, [stream]);

    return {
        stream,
        isOn,
        facingMode,
        availableDevices,
        currentDeviceId,
        startCamera: () => startCamera(), // Call without deviceId to use current/default
        stopCamera,
        flipCamera,
        setDevice,
        getCameraDevices // Expose to allow manual refresh of devices if needed
    };
};
