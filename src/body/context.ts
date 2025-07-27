import { createContext } from "react";
import type { BodyTrackingControl } from "./types";

export const BodyContext = createContext<BodyTrackingControl>(
    {} as BodyTrackingControl
);
BodyContext.displayName = "kortexa.ai:body-tracking";