import { createContext } from "react";
import type { FaceTrackingControl } from "./types";

export const FaceContext = createContext<FaceTrackingControl>(
    {} as FaceTrackingControl
);
FaceContext.displayName = "kortexa.ai:face-tracking";