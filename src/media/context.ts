import { createContext } from "react";
import type { MediaContextType } from "./types";

export const MediaContext = createContext<MediaContextType | undefined>(
    undefined
);
