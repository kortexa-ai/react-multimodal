import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { HandsContextType, UseHandsProps } from './types';
import { useHandsControl } from './hooks/useHandsControl';

export const HandsContext = createContext<HandsContextType>(null);

export interface HandsProviderProps extends UseHandsProps {
    children: ReactNode;
}

export const HandsProvider: React.FC<HandsProviderProps> = ({ children, ...hookProps }) => {
    const handsControl = useHandsControl(hookProps);

    return (
        <HandsContext.Provider value={handsControl}>
            {children}
        </HandsContext.Provider>
    );
};

export const useHands = (): HandsContextType => {
    const context = useContext(HandsContext);
    if (context === undefined) {
        // In a real app, you might not want to return null but throw an error
        // if used outside a provider, but for flexibility in examples, null is fine.
        console.warn('useHands must be used within a HandsProvider');
        return null;
    }
    return context;
};
