import type { PropsWithChildren } from 'react';
import { useBodyTrackingDevice } from './hooks/useBodyTrackingDevice';
import type { BodyProviderProps } from './types';
import { BodyContext } from './context';

export function BodyProvider({ children, ...hookProps }: PropsWithChildren<BodyProviderProps>) {
    const bodyControl = useBodyTrackingDevice(hookProps);

    return (
        <BodyContext.Provider value={bodyControl}>
            {children}
        </BodyContext.Provider>
    );
};