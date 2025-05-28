import { createContext } from "react";
import type { HandsTrackingControl } from "./types";

export const HandsContext = createContext<HandsTrackingControl>(
    {} as HandsTrackingControl
);
HandsContext.displayName = "kortexa.ai:hands-tracking";
