import { useContext } from "react";
import { MicrophoneContext } from "../context";
import type { MicrophoneControl } from "../types";

export function useMicrophone(): MicrophoneControl {
    const context = useContext(MicrophoneContext);
    if (!context) throw new Error("useMicrophone must be used within MicrophoneProvider");
    return context;
}
