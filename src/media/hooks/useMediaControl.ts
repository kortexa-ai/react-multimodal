import { useContext } from "react";
import { MediaContext } from "../context"; // Path adjusted for new location

export const useMediaControl = () => {
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error("useMediaControl must be used within a MediaProvider");
    }
    return context;
};
