import { createContext } from "react";
import type { MicrophoneControl } from "./types";

export const MicrophoneContext = createContext<MicrophoneControl | undefined>(
    undefined
);
MicrophoneContext.displayName = "kortexa.ai:microphone";
