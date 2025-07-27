import type { PropsWithChildren } from 'react';
import { useFaceTrackingDevice } from './hooks/useFaceTrackingDevice';
import type { FaceProviderProps } from './types';
import { FaceContext } from './context';

export function FaceProvider({ children, ...hookProps }: PropsWithChildren<FaceProviderProps>) {
    const faceControl = useFaceTrackingDevice(hookProps);

    return (
        <FaceContext.Provider value={faceControl}>
            {children}
        </FaceContext.Provider>
    );
};