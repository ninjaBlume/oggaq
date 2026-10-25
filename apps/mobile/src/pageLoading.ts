import { createContext, useContext } from "react";

const idle = () => () => {};
export const PageLoading = createContext<() => () => void>(idle);
export const usePageLoading = () => useContext(PageLoading);
