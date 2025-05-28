import { createContext } from "react";
import type { CameraControl } from "./types";

export const CameraContext = createContext<CameraControl | undefined>(
    undefined
);
CameraContext.displayName = "kortexa.ai:camera";
