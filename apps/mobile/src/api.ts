import Constants from "expo-constants";
import { ApiClient } from "@oggaq/api-client";
import { session } from "./storage";
import { validateApiUrl } from "./session";
export const apiUrl = validateApiUrl(
  process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl ??
    "http://127.0.0.1:8000",
  __DEV__ || process.env.EXPO_PUBLIC_LOCAL_PREVIEW === "1",
);
export const frontendUrl: string =
  process.env.EXPO_PUBLIC_WEB_URL ??
  Constants.expoConfig?.extra?.frontendUrl ??
  "http://127.0.0.1:5173";
let onExpired: (() => void) | undefined;
export function sessionExpiredHandler(handler: () => void) {
  onExpired = handler;
  return () => {
    onExpired = undefined;
  };
}
export const api = new ApiClient(apiUrl, {
  auth: "bearer",
  accessToken: () => session.token,
  onSessionExpired: () => onExpired?.(),
});
