import { createContext } from "react";

// Retained tabs stay mounted, but only the visible tab refreshes on return/resume.
export const ScreenActive = createContext(true);
