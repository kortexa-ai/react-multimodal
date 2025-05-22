import { useContext } from 'react';
import { CameraContext } from '../context'; // Path adjusted for new location

export const useCameraControl = () => {
    const context = useContext(CameraContext);
    if (!context) {
        throw new Error('useCameraControl must be used within a CameraProvider');
    }
    return context;
};
