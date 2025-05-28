import { useContext } from "react";
import { CompositeMediaContext } from "../context";
import type { CompositeMediaControl } from "../types";

export const useCompositeMedia = (): CompositeMediaControl => {
    const context = useContext(CompositeMediaContext);
    if (!context)
        throw new Error(
            "useCompositeMedia must be used within a CompositeMediaProvider"
        );
    return context;
};
