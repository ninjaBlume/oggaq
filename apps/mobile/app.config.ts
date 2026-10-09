import brand from "./brand.json";
import type { ExpoConfig } from "expo/config";
const localPreview = process.env.EXPO_PUBLIC_LOCAL_PREVIEW === "1";
const config: ExpoConfig = {
  name: localPreview ? `${brand.name} Önizleme` : brand.name,
  slug: "oggaq",
  version: "0.1.0",
  scheme: "oggaq",
  orientation: "default",
  userInterfaceStyle: "light",
  ios: { supportsTablet: true, bundleIdentifier: "net.harunaltay.oggaq" },
  android: { package: "net.harunaltay.oggaq" },
  plugins: ["expo-secure-store", "./plugins/local-preview.cjs"],
  extra: {
    localPreview,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
    frontendUrl: process.env.EXPO_PUBLIC_WEB_URL ?? "http://127.0.0.1:5173",
  },
};
export default config;
