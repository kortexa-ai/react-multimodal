import { useContext } from "react";
import { MicrophoneContext } from "../context";

export function useMicrophoneControl() {
    const context = useContext(MicrophoneContext);
    if (!context) throw new Error('Must be used within MicrophoneProvider');
    return context;
}