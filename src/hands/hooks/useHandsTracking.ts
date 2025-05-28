import { useContext } from "react";
import { HandsContext } from "../context";
import type { HandsTrackingControl } from "../types";

export const useHandsTracking = (): HandsTrackingControl => {
    const context = useContext(HandsContext);
    if (context === null) throw new Error("useHands must be used within a HandsProvider");
    return context;
};
