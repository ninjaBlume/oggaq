import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Updates from "expo-updates";
import { supportsAppUpdates } from "./updateManager";

// SDK 58 may expose isEnabled in Expo Go and web; it alone does not mean OTA is supported.
export const appUpdatesEnabled = supportsAppUpdates({
  enabled: Updates.isEnabled,
  platform: Platform.OS,
  expoGo: isRunningInExpoGo(),
  development: __DEV__,
  localPreview: Constants.expoConfig?.extra?.localPreview === true,
});
