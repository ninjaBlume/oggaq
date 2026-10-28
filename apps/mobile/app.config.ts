import { darkPalette, lightPalette } from "@oggaq/design-tokens";
import brand from "../../config/brand.json";
import type { ExpoConfig } from "expo/config";
const localPreview = process.env.EXPO_PUBLIC_LOCAL_PREVIEW === "1";
// Shared Android/iOS identity. Profile overrides are for deliberately separate test apps.
// A store upload binds that app record to its identifier (docs/STORE_RELEASE.md).
const bundleId = process.env.OGGAQ_BUNDLE_ID ?? brand.bundleIdentifier;
const config: ExpoConfig = {
  name: localPreview ? `${brand.displayName} Önizleme` : brand.displayName,
  slug: "oggaq",
  owner: "ninjablume",
  version: "1.0.0",
  // Native dependency/config changes produce a different OTA compatibility key.
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    enabled: !localPreview,
    url: "https://u.expo.dev/edf67d8f-aa02-429b-99f7-68f1e1bf6e9d",
    checkAutomatically: "ON_LOAD",
    // Launch the cached/embedded app immediately; download for the next cold start.
    fallbackToCacheTimeout: 0,
    useEmbeddedUpdate: true,
  },
  scheme: ["oggsor", "oggaq"],
  orientation: "default",
  userInterfaceStyle: "automatic",
  // Platform sizes are derived from the approved Ogg Sor artwork.
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    buildNumber: "1", // EAS production profile raises it automatically (autoIncrement)
    // Only HTTPS and the system keychain are used; there is no encryption of our own (docs/STORE_RELEASE.md).
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: bundleId,
    versionCode: 1, // EAS production profile raises it automatically (autoIncrement)
    // The Expo template adds these by default; the app reads no files and draws no overlays (verified with expo prebuild).
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: lightPalette.navy },
  },
  web: { favicon: "./assets/favicon.png" },
  // Tokens are stored without biometric protection (no requireAuthentication), so no Face ID usage string is declared.
  plugins: [
    ["expo-secure-store", { faceIDPermission: false }],
    "expo-status-bar",
    ["expo-splash-screen", {
      image: "./assets/splash-icon.png",
      imageWidth: 200,
      backgroundColor: lightPalette.navy,
      dark: { backgroundColor: darkPalette.paper },
    }],
    "./plugins/local-preview.cjs",
  ],
  extra: {
    eas: { projectId: "edf67d8f-aa02-429b-99f7-68f1e1bf6e9d" },
    localPreview,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
    frontendUrl: process.env.EXPO_PUBLIC_WEB_URL ?? "http://127.0.0.1:5173",
  },
};
export default config;
