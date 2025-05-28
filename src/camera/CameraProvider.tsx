import { useCallback, useEffect, useMemo, type PropsWithChildren } from 'react';
import { CameraContext } from './context';
import { useCameraDevice } from './hooks/useCameraDevice';
import { cameraDispatcher } from './types';
import type {
    CameraControl,
    CameraStreamHandler,
    CameraFacingModeHandler,
    CameraErrorHandler,
    CameraLifeCycleHandler,
    CameraFacingMode,
    CameraProviderProps
} from './types';

export function CameraProvider({ children, ...useCameraProps }: PropsWithChildren<CameraProviderProps>) {
    const {
        stream,
        isRecording,
        facingMode,
        availableDevices,
        currentDeviceId,
        start: camStart,
        stop: camStop,
        flip: camFlip,
        setDevice: camSetDevice,
        getDevices: getCameraDevices
    } = useCameraDevice({
        ...useCameraProps,
        onStream: (newStream) => {
            useCameraProps.onStream?.(newStream);
            cameraDispatcher.dispatch('streamChanged', newStream);
        },
        onError: (error) => {
            useCameraProps.onError?.(error);
            cameraDispatcher.dispatch('error', error);
        }
    });

    const startCamera = useCallback(async () => {
        try {
            await camStart();
            cameraDispatcher.dispatch('started');
        } catch (err) {
            let errorMessageText = 'Failed to start camera';
            if (err instanceof Error) {
                errorMessageText += ': ' + err.message;
            } else {
                errorMessageText += ': ' + String(err);
            }
            cameraDispatcher.dispatch('error', errorMessageText);
            throw err; // Re-throw the error
        }
    }, [camStart]);

    const stopCamera = useCallback(() => {
        try {
            camStop();
            cameraDispatcher.dispatch('stopped');
        } catch (err) {
            const errorMessage = `Failed to stop camera: ${(err as Error).message}`;
            cameraDispatcher.dispatch('error', errorMessage);
        }
    }, [camStop]);

    const flipCamera = useCallback(async () => {
        try {
            await camFlip();
            // useCamera's flipCamera already updates facingMode state
            // We need to get the new facingMode from the hook's state after camFlip resolves
            // However, camFlip itself doesn't return the new mode directly.
            // The facingMode state will update, and then an event can be dispatched.
            // This requires a useEffect in the provider listening to 'facingMode' from useCamera
        } catch (err) {
            const errorMessage = `Failed to flip camera: ${(err as Error).message}`;
            cameraDispatcher.dispatch('error', errorMessage);
        }
    }, [camFlip]); // Removed facingMode dependency

    const setDevice = useCallback(async (deviceId: string) => {
        try {
            await camSetDevice(deviceId);
            // Stream change will be handled by onStreamChange in useCamera
        } catch (err) {
            const errorMessage = `Failed to set device: ${(err as Error).message}`;
            cameraDispatcher.dispatch('error', errorMessage);
        }
    }, [camSetDevice]);

    // Effect to dispatch facingModeChanged when it changes in useCamera hook
    useEffect(() => {
        cameraDispatcher.dispatch('facingMode', facingMode);
    }, [facingMode]);

    // Listener management functions
    const addStreamListener = useCallback((consumerListener: CameraStreamHandler) => {
        const id = `kortexa-camera-stream-${Date.now()}`;
        const dispatcherListener = (data?: MediaStream | undefined) => {
            consumerListener(data);
        };
        cameraDispatcher.addListener('stream', { id, listener: dispatcherListener });
        return id;
    }, []);
    const removeStreamListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('stream', id);
    }, []);

    const addStartListener = useCallback((listener: CameraLifeCycleHandler) => {
        const id = `kortexa-camera-started-${Date.now()}`;
        cameraDispatcher.addListener('started', { id, listener });
        return id;
    }, []);
    const removeStartListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('started', id);
    }, []);

    const addStopListener = useCallback((listener: CameraLifeCycleHandler) => {
        const id = `kortexa-camera-stopped-${Date.now()}`;
        cameraDispatcher.addListener('stopped', { id, listener });
        return id;
    }, []);
    const removeStopListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('stopped', id);
    }, []);

    const addFacingModeListener = useCallback((consumerListener: CameraFacingModeHandler) => {
        const id = `kortexa-camera-facingMode-${Date.now()}`;
        const dispatcherListener = (data?: CameraFacingMode | undefined) => {
            if (data !== undefined) {
                consumerListener(data);
            }
        };
        cameraDispatcher.addListener('facingMode', { id, listener: dispatcherListener });
        return id;
    }, []);
    const removeFacingModeListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('facingMode', id);
    }, []);

    const addErrorListener = useCallback((consumerListener: CameraErrorHandler) => {
        const id = `kortexa-camera-error-${Date.now()}`;
        const dispatcherListener = (data?: string | undefined) => {
            if (data !== undefined) {
                consumerListener(data);
            }
        };
        cameraDispatcher.addListener('error', { id, listener: dispatcherListener });
        return id;
    }, []);
    const removeErrorListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('error', id);
    }, []);

    useEffect(() => {
        return () => {
            cameraDispatcher.clear(); // Clear all camera listeners on unmount
        };
    }, []);

    const contextValue = useMemo<CameraControl>(() => ({
        isRecording,
        stream,
        facingMode,
        availableDevices,
        currentDeviceId,
        start: startCamera,
        stop: stopCamera,
        toggle: () => isRecording ? stopCamera() : startCamera(),
        flip: flipCamera,
        setDevice,
        getDevices: getCameraDevices,
        addStreamListener,
        removeStreamListener,
        addStartListener,
        removeStartListener,
        addStopListener,
        removeStopListener,
        addFacingModeListener,
        removeFacingModeListener,
        addErrorListener,
        removeErrorListener
    }), [
        isRecording, stream, facingMode, availableDevices, currentDeviceId,
        startCamera, stopCamera, flipCamera, setDevice, getCameraDevices,
        addStreamListener, removeStreamListener,
        addStartListener, removeStartListener,
        addStopListener, removeStopListener,
        addFacingModeListener, removeFacingModeListener,
        addErrorListener, removeErrorListener
    ]);

    return (
        <CameraContext.Provider value={contextValue}>
            {children}
        </CameraContext.Provider>
    );
}
