import { createContext } from 'react';
import type { MicrophoneContextType } from './types';

export const MicrophoneContext = createContext<MicrophoneContextType>({} as MicrophoneContextType);
MicrophoneContext.displayName = 'kortexa.ai:microphone';