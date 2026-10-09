import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
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
  if (Platform.OS === "web") return (previewDevice ??= Crypto.randomUUID());
  const existing = await SecureStore.getItemAsync("oggaq.device");
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync("oggaq.device", id);
  return id;
}
