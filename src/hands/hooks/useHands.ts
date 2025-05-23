import { useContext } from "react";
import type { HandsContextType } from "../types";
import { HandsContext } from "../context";

export const useHands = (): HandsContextType => {
    const context = useContext(HandsContext);
    if (context === undefined) {
        // In a real app, you might not want to return null but throw an error
        // if used outside a provider, but for flexibility in examples, null is fine.
        console.warn("useHands must be used within a HandsProvider");
        return {} as HandsContextType;
    }
    return context;
};
