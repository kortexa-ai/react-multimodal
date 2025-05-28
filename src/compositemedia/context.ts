import { createContext } from "react";
import type { CompositeMediaControl } from "./types";

export const CompositeMediaContext = createContext<CompositeMediaControl | undefined>(
    undefined
);
CompositeMediaContext.displayName = "kortexa.ai:composite-media";
