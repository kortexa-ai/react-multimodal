import { useMemo, useCallback, useEffect, type ReactNode } from 'react';
import { CameraContext } from './context';
import { useCamera, type UseCameraProps } from './useCamera'; // Adjusted path
import { cameraDispatcher } from '../utils/EventDispatcher';
import type {
    CameraContextType,
    CameraStreamHandler,
    CameraFacingModeHandler,
    CameraErrorHandler,
    CameraLifeCycleHandler,
    FacingMode // Added import for FacingMode type
} from './types';

export interface CameraProviderProps extends UseCameraProps {
    children?: ReactNode;
}

export function CameraProvider({ children, ...useCameraProps }: CameraProviderProps) {
    const {
        stream,
        isOn,
        facingMode,
        availableDevices,
        currentDeviceId,
        startCamera: camStart,
        stopCamera: camStop,
        flipCamera: camFlip,
        setDevice: camSetDevice,
        getCameraDevices
    } = useCamera({
        ...useCameraProps,
        onStreamChange: (newStream) => {
            useCameraProps.onStreamChange?.(newStream);
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
        cameraDispatcher.dispatch('facingModeChanged', facingMode);
    }, [facingMode]);

    // Listener management functions
    const addStreamChangedListener = useCallback((consumerListener: CameraStreamHandler) => {
        const id = `stream-${Date.now()}`;
        const dispatcherListener = (data?: MediaStream | null | undefined) => {
            consumerListener(data === undefined ? null : data);
        };
        cameraDispatcher.addListener('streamChanged', { id, listener: dispatcherListener });
        return id;
    }, []);
    const removeStreamChangedListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('streamChanged', id);
    }, []);

    const addStartedListener = useCallback((listener: CameraLifeCycleHandler) => {
        const id = `started-${Date.now()}`;
        cameraDispatcher.addListener('started', { id, listener });
        return id;
    }, []);
    const removeStartedListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('started', id);
    }, []);

    const addStoppedListener = useCallback((listener: CameraLifeCycleHandler) => {
        const id = `stopped-${Date.now()}`;
        cameraDispatcher.addListener('stopped', { id, listener });
        return id;
    }, []);
    const removeStoppedListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('stopped', id);
    }, []);

    const addFacingModeChangedListener = useCallback((consumerListener: CameraFacingModeHandler) => {
        const id = `facingMode-${Date.now()}`;
        const dispatcherListener = (data?: FacingMode | undefined) => {
            if (data !== undefined) {
                consumerListener(data);
            }
        };
        cameraDispatcher.addListener('facingModeChanged', { id, listener: dispatcherListener });
        return id;
    }, []);
    const removeFacingModeChangedListener = useCallback((id: string) => {
        cameraDispatcher.removeListener('facingModeChanged', id);
    }, []);

    const addErrorListener = useCallback((consumerListener: CameraErrorHandler) => {
        const id = `error-${Date.now()}`;
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

    const contextValue = useMemo<CameraContextType>(() => ({
        isOn,
        stream,
        facingMode,
        availableDevices,
        currentDeviceId,
        startCamera,
        stopCamera,
        toggleCamera: () => isOn ? stopCamera() : startCamera(), // Basic toggle
        flipCamera,
        setDevice,
        getCameraDevices,
        addStreamChangedListener,
        removeStreamChangedListener,
        addStartedListener,
        removeStartedListener,
        addStoppedListener,
        removeStoppedListener,
        addFacingModeChangedListener,
        removeFacingModeChangedListener,
        addErrorListener,
        removeErrorListener
    }), [
        isOn, stream, facingMode, availableDevices, currentDeviceId,
        startCamera, stopCamera, flipCamera, setDevice, getCameraDevices,
        addStreamChangedListener, removeStreamChangedListener,
        addStartedListener, removeStartedListener, addStoppedListener, removeStoppedListener,
        addFacingModeChangedListener, removeFacingModeChangedListener,
        addErrorListener, removeErrorListener
    ]);

    return (
        <CameraContext.Provider value={contextValue}>
            {children}
        </CameraContext.Provider>
    );
}
