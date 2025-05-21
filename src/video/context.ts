import { createContext, useContext } from 'react';
import type { CameraContextType } from './types';

export const CameraContext = createContext<CameraContextType | undefined>(
    undefined
);

export const useCameraContext = () => {
    const context = useContext(CameraContext);
    if (!context) {
        throw new Error('useCameraContext must be used within a CameraProvider');
    }
    return context;
};
