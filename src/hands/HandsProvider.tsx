import type { PropsWithChildren } from 'react';
import { useHandsTrackingDevice } from './hooks/useHandsTrackingDevice';
import type { HandsProviderProps } from './types';
import { HandsContext } from './context';

export function HandsProvider({ children, ...hookProps }: PropsWithChildren<HandsProviderProps>) {
    const handsControl = useHandsTrackingDevice(hookProps);

    return (
        <HandsContext.Provider value={handsControl}>
            {children}
        </HandsContext.Provider>
    );
};
