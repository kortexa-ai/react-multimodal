import { useContext } from "react";
import { CameraContext } from "../context";
import type { CameraControl } from "../types";

export const useCamera = (): CameraControl => {
    const context = useContext(CameraContext);
    if (!context) throw new Error("useCamera must be used within a CameraProvider");
    return context;
};
