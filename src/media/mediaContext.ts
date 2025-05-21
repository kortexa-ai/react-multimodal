import { createContext } from 'react';
import type { MediaContextType } from './mediaTypes';

export const MediaContext = createContext<MediaContextType | undefined>(
    undefined
);
