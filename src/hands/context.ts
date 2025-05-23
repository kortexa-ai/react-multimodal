import { createContext } from "react";
import type { HandsContextType } from "./types";

export const HandsContext = createContext<HandsContextType>(
    {} as HandsContextType
);
