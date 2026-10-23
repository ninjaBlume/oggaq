import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { newId } from "./ids";
import { SessionStore } from "./session";
// Expo web is a disposable preview. Tokens never enter browser localStorage.
let previewSession: string | null = null;
export const session = new SessionStore({
  read: () =>
    Platform.OS === "web"
      ? Promise.resolve(previewSession)
      : SecureStore.getItemAsync("oggaq.session"),
  write: async (value) => {
    if (Platform.OS === "web") previewSession = value;
    else
      await SecureStore.setItemAsync("oggaq.session", value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
  },
  remove: async () => {
    if (Platform.OS === "web") previewSession = null;
    else await SecureStore.deleteItemAsync("oggaq.session");
  },
});
let previewDevice: string | null = null;
export async function deviceId(): Promise<string> {
  if (Platform.OS === "web") return (previewDevice ??= newId());
  const existing = await SecureStore.getItemAsync("oggaq.device");
  if (existing) return existing;
  const id = newId();
  await SecureStore.setItemAsync("oggaq.device", id);
  return id;
}

// Preview-only native probe: verifies real encrypted storage on the simulator.
export async function verifyPreviewStorage(): Promise<void> {
  if (Platform.OS === "web" || process.env.EXPO_PUBLIC_LOCAL_PREVIEW !== "1")
    return;
  const key = "oggaq.preview-probe";
  const value = newId();
  try {
    await SecureStore.setItemAsync(key, value);
    if ((await SecureStore.getItemAsync(key)) !== value)
      throw new Error("Secure storage probe failed.");
  } finally {
    await SecureStore.deleteItemAsync(key);
  }
}

// The colour scheme choice is a small, non-secret preference. It is written only when the user changes it (never at
// startup); a store that cannot be read or written leaves the app on "Cihaz ayarı" instead of breaking it.
const themeKey = "oggaq.theme";
export const themeStore = {
  async read(): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(themeKey) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(themeKey);
  },
  async write(value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(themeKey, value);
      } catch {
        // Private mode or blocked storage: the choice still applies for this visit.
      }
      return;
    }
    await SecureStore.setItemAsync(themeKey, value);
  },
};
