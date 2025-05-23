import type { PropsWithChildren } from 'react';
import { useHandsControl } from './hooks/useHandsControl';
import type { HandsProviderProps } from './types';
import { HandsContext } from './context';

export function HandsProvider({ children, ...hookProps }: PropsWithChildren<HandsProviderProps>) {
    const handsControl = useHandsControl(hookProps);

    return (
        <HandsContext.Provider value={handsControl}>
            {children}
        </HandsContext.Provider>
    );
};
