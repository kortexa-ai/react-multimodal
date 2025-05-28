import { createContext } from "react";
import type { HandsContextControl } from "./types";

export const HandsContext = createContext<HandsContextControl>(
    {} as HandsContextControl
);
